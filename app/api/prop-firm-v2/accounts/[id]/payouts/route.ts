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
  sortBy: z.string().default('createdAt'),
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
      sortBy: searchParams.get('sortBy') || 'date',
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
      where.date = {}
      if (filters.dateFrom) {
        where.date.gte = new Date(filters.dateFrom)
      }
      if (filters.dateTo) {
        where.date.lte = new Date(filters.dateTo)
      }
    }
    
    // Get total count
    const total = await prisma.payout?.count({ where }) || 0

    // Get payouts
    const payouts = await prisma.payout?.findMany({
      where,
      skip: offset,
      take: filters.limit,
      orderBy: { [filters.sortBy]: filters.sortOrder },
      include: {
        account: {
          select: {
            id: true,
            name: true,
            number: true,
            propfirm: true,
          }
        }
      }
    }) || []
    
    // Get current funded phase for eligibility check
    const fundedPhase = await prisma.accountPhase?.findFirst({
      where: {
        accountId,
        phaseType: 'funded',
        phaseStatus: 'active'
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
    const totalRequested = payouts.reduce((sum, p) => sum + (p.amountRequested || p.amount), 0)
    const totalPaid = payouts.filter(p => p.status === 'paid').reduce((sum, p) => sum + (p.amountPaid || 0), 0)
    const totalPending = payouts.filter(p => p.status === 'pending').reduce((sum, p) => sum + (p.amountRequested || p.amount), 0)
    
    return NextResponse.json({
      payouts: payouts.map(payout => ({
        id: payout.id,
        requestedAmount: payout.amountRequested || payout.amount,
        eligibleAmount: payout.amount, // Same as requested amount for now
        profitSplitPercent: 50, // Default 50% split
        traderShare: payout.amountPaid || 0,
        firmShare: payout.amountRequested ? payout.amount - payout.amountRequested : 0,
        status: payout.status,
        requestedAt: payout.date,
        processedAt: payout.date,
        paidAt: payout.paidAt,
        rejectedAt: null, // Not available in Payout model
        rejectionReason: null, // Not available in Payout model
        paymentMethod: 'bank_transfer', // Default payment method
        notes: payout.notes,
        phase: null, // Phase relationship not available in Payout model
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
    const fundedPhase = await prisma.accountPhase?.findFirst({
      where: {
        accountId,
        phaseType: 'funded',
        phaseStatus: 'active'
      }
    })
    
    if (!fundedPhase) {
      return NextResponse.json(
        { error: 'No active funded phase found' },
        { status: 400 }
      )
    }
    
    // Get existing payouts
    const existingPayouts = await prisma.payout?.findMany({
      where: { accountId },
      orderBy: { date: 'desc' }
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
            amount: p.amountRequested || p.amount,
            requestedAt: p.date,
          }))
        },
        { status: 400 }
      )
    }
    
    // Create payout request in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create payout request
      const payout = await tx.payout?.create({
        data: {
          accountId,
          accountNumber: account.number, // Use account number from the account record
          amount: validatedData.requestedAmount,
          amountRequested: eligibility.traderShare,
          amountPaid: 0,
          status: 'pending',
          date: new Date(),
          requestedAt: new Date(),
          notes: validatedData.notes,
        }
      })
      
      // Optionally reduce balance immediately or wait for approval
      // This depends on the prop firm's policy
      if (account.reduceBalanceByPayout) {
        await tx.accountPhase?.update({
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
