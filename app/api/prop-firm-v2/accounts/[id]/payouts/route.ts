/**
 * Prop Firm Payout Management API
 * GET /api/prop-firm-v2/accounts/[id]/payouts - Get payout history
 * POST /api/prop-firm-v2/accounts/[id]/payouts - Request new payout
 */

import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getUserId } from '@/server/auth-utils'
import { PropFirmEngine } from '@/lib/prop-firm/prop-firm-engine'
import { z } from 'zod'

const prisma = new PrismaClient()

interface RouteParams {
  params: { id: string }
}

// Payout request schema
const CreatePayoutSchema = z.object({
  requestedAmount: z.number().positive(),
  paymentMethod: z.string().optional(),
  notes: z.string().optional(),
})

const PayoutFilterSchema = z.object({
  status: z.array(z.enum(['pending', 'approved', 'paid', 'rejected', 'cancelled'])).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  page: z.number().default(1),
  limit: z.number().default(20),
  sortBy: z.string().default('requestedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

// GET /api/prop-firm-v2/accounts/[id]/payouts
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = await getUserId()
    const accountId = params.id
    const { searchParams } = new URL(request.url)
    
    // Verify account ownership
    const account = await prisma.account.findFirst({
      where: { id: accountId, userId }
    })
    
    if (!account) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      )
    }
    
    // Parse filters
    const filterData = {
      status: searchParams.getAll('status') as any[],
      dateFrom: searchParams.get('dateFrom') || undefined,
      dateTo: searchParams.get('dateTo') || undefined,
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20'),
      sortBy: searchParams.get('sortBy') || 'requestedAt',
      sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc',
    }
    
    const filters = PayoutFilterSchema.parse(filterData)
    const offset = (filters.page - 1) * filters.limit
    
    // Build where clause
    const where: any = { accountId }
    
    if (filters.status && filters.status.length > 0) {
      where.status = { in: filters.status }
    }
    
    if (filters.dateFrom || filters.dateTo) {
      where.requestedAt = {}
      if (filters.dateFrom) {
        where.requestedAt.gte = new Date(filters.dateFrom)
      }
      if (filters.dateTo) {
        where.requestedAt.lte = new Date(filters.dateTo)
      }
    }
    
    // Get total count
    const total = await prisma.payoutRequest?.count({ where }) || 0
    
    // Get payouts
    const payouts = await prisma.payoutRequest?.findMany({
      where,
      skip: offset,
      take: filters.limit,
      orderBy: { [filters.sortBy]: filters.sortOrder },
      include: {
        phase: {
          select: {
            id: true,
            phaseType: true,
            status: true,
          }
        }
      }
    }) || []
    
    // Get current funded phase for eligibility check
    const fundedPhase = await prisma.propFirmPhase?.findFirst({
      where: {
        accountId,
        phaseType: 'funded',
        status: 'active'
      }
    })
    
    // Calculate current payout eligibility
    let payoutEligibility = null
    if (fundedPhase) {
      payoutEligibility = PropFirmEngine.calculatePayoutEligibility(
        account as any,
        fundedPhase as any,
        payouts
      )
    }
    
    // Calculate summary statistics
    const totalRequested = payouts.reduce((sum, p) => sum + p.requestedAmount, 0)
    const totalPaid = payouts.filter(p => p.status === 'paid').reduce((sum, p) => sum + (p.traderShare || 0), 0)
    const totalPending = payouts.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.requestedAmount, 0)
    
    return NextResponse.json({
      payouts: payouts.map(payout => ({
        id: payout.id,
        requestedAmount: payout.requestedAmount,
        eligibleAmount: payout.eligibleAmount,
        profitSplitPercent: payout.profitSplitPercent,
        traderShare: payout.traderShare,
        firmShare: payout.firmShare,
        status: payout.status,
        requestedAt: payout.requestedAt,
        processedAt: payout.processedAt,
        paidAt: payout.paidAt,
        rejectedAt: payout.rejectedAt,
        rejectionReason: payout.rejectionReason,
        paymentMethod: payout.paymentMethod,
        notes: payout.notes,
        phase: payout.phase,
      })),
      
      pagination: {
        total,
        page: filters.page,
        limit: filters.limit,
        totalPages: Math.ceil(total / filters.limit),
        hasNext: offset + filters.limit < total,
        hasPrev: filters.page > 1,
      },
      
      eligibility: payoutEligibility,
      
      summary: {
        totalPayouts: payouts.length,
        totalRequested,
        totalPaid,
        totalPending,
        pendingPayouts: payouts.filter(p => p.status === 'pending').length,
        successfulPayouts: payouts.filter(p => p.status === 'paid').length,
        rejectedPayouts: payouts.filter(p => p.status === 'rejected').length,
        averagePayoutAmount: payouts.length > 0 ? totalPaid / payouts.filter(p => p.status === 'paid').length : 0,
        nextEligibleDate: payoutEligibility?.nextPayoutDate,
        daysUntilNextPayout: payoutEligibility?.daysUntilNextPayout,
      }
    })
    
  } catch (error) {
    console.error('Error fetching payouts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch payouts', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

// POST /api/prop-firm-v2/accounts/[id]/payouts
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = await getUserId()
    const accountId = params.id
    const body = await request.json()
    
    // Validate request data
    const validatedData = CreatePayoutSchema.parse(body)
    
    // Verify account ownership
    const account = await prisma.account.findFirst({
      where: { id: accountId, userId }
    })
    
    if (!account) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      )
    }
    
    // Get current funded phase
    const fundedPhase = await prisma.propFirmPhase?.findFirst({
      where: {
        accountId,
        phaseType: 'funded',
        status: 'active'
      }
    })
    
    if (!fundedPhase) {
      return NextResponse.json(
        { error: 'No active funded phase found' },
        { status: 400 }
      )
    }
    
    // Get existing payouts
    const existingPayouts = await prisma.payoutRequest?.findMany({
      where: { accountId },
      orderBy: { requestedAt: 'desc' }
    }) || []
    
    // Calculate payout eligibility
    const eligibility = PropFirmEngine.calculatePayoutEligibility(
      account as any,
      fundedPhase as any,
      existingPayouts
    )
    
    if (!eligibility.isEligible) {
      return NextResponse.json(
        { 
          error: 'Payout not eligible', 
          reasons: eligibility.reasons,
          nextEligibleDate: eligibility.nextPayoutDate,
          daysUntilNextPayout: eligibility.daysUntilNextPayout,
        },
        { status: 400 }
      )
    }
    
    // Validate requested amount
    if (validatedData.requestedAmount > eligibility.eligibleAmount) {
      return NextResponse.json(
        { 
          error: 'Requested amount exceeds eligible amount', 
          maxEligible: eligibility.eligibleAmount,
          requested: validatedData.requestedAmount,
        },
        { status: 400 }
      )
    }
    
    // Check for pending payouts
    const pendingPayouts = existingPayouts.filter(p => p.status === 'pending')
    if (pendingPayouts.length > 0) {
      return NextResponse.json(
        { 
          error: 'Cannot request payout while another payout is pending',
          pendingPayouts: pendingPayouts.map(p => ({
            id: p.id,
            amount: p.requestedAmount,
            requestedAt: p.requestedAt,
          }))
        },
        { status: 400 }
      )
    }
    
    // Create payout request in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create payout request
      const payout = await tx.payoutRequest?.create({
        data: {
          phaseId: fundedPhase.id,
          accountId,
          userId,
          requestedAmount: validatedData.requestedAmount,
          eligibleAmount: eligibility.eligibleAmount,
          profitSplitPercent: eligibility.profitSplitPercent,
          traderShare: eligibility.traderShare,
          firmShare: eligibility.firmShare,
          status: 'pending',
          requestedAt: new Date(),
          paymentMethod: validatedData.paymentMethod,
          notes: validatedData.notes,
        }
      })
      
      // Optionally reduce balance immediately or wait for approval
      // This depends on the prop firm's policy
      if (account.reduceBalanceByPayout) {
        await tx.propFirmPhase?.update({
          where: { id: fundedPhase.id },
          data: {
            currentEquity: { decrement: validatedData.requestedAmount },
            currentBalance: { decrement: validatedData.requestedAmount },
          }
        })
      }
      
      // Update payout count
      await tx.account.update({
        where: { id: accountId },
        data: {
          payoutCount: { increment: 1 }
        }
      })
      
      return payout
    })
    
    return NextResponse.json({
      success: true,
      payout: result,
      message: 'Payout request submitted successfully',
      estimatedProcessingTime: '3-5 business days',
      nextSteps: [
        'Payout request is being reviewed',
        'You will receive an email confirmation',
        'Processing typically takes 3-5 business days',
        account.reduceBalanceByPayout ? 'Balance has been reduced immediately' : 'Balance will be reduced upon approval'
      ]
    })
    
  } catch (error) {
    console.error('Error creating payout request:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to create payout request', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}
