/**
 * Payouts API
 * Handles payout requests and management for funded accounts
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserId } from '@/server/auth'
import { PropFirmSchemas } from '@/lib/validation/prop-firm-schemas'
import { PropFirmBusinessRules } from '@/lib/prop-firm/business-rules'
// Removed heavy validation import - using Zod directly

// GET /api/prop-firm/payouts - List payouts with filtering
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId()
    const { searchParams } = new URL(request.url)
    
    const accountId = searchParams.get('accountId')
    const status = searchParams.getAll('status')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    // Build where clause
    const where: any = {
      account: { userId }
    }

    if (accountId) {
      where.accountId = accountId
    }

    if (status.length > 0) {
      where.status = { in: status }
    }

    const offset = (page - 1) * limit

    // Get payouts with account info
    const [payouts, total] = await Promise.all([
      prisma.payout.findMany({
        where,
        include: {
          account: {
            select: {
              id: true,
              number: true,
              name: true,
              propfirm: true,
              status: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      prisma.payout.count({ where })
    ])

    return NextResponse.json({
      success: true,
      data: payouts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: offset + limit < total,
        hasPrevious: page > 1,
      },
    })

  } catch (error) {
    console.error('Error fetching payouts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch payouts' },
      { status: 500 }
    )
  }
}

// POST /api/prop-firm/payouts - Request new payout
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId()
    const body = await request.json()

    // Validate input
    const parseResult = PropFirmSchemas.RequestPayout.safeParse(body)
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid payout request', details: parseResult.error.errors },
        { status: 400 }
      )
    }

    const payoutData = parseResult.data

    // Get account with current phase and payout history
    const account = await prisma.account.findFirst({
      where: { id: payoutData.accountId, userId },
      include: {
        phases: {
          where: { phaseStatus: 'active' },
          orderBy: { createdAt: 'desc' },
          take: 1
        },
        payouts: {
          orderBy: { createdAt: 'desc' },
          take: 1
        },
        breaches: {
          where: { breachTime: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
          take: 1
        }
      }
    })

    if (!account) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      )
    }

    const currentPhase = account.phases[0]
    if (!currentPhase) {
      return NextResponse.json(
        { error: 'Account has no active phase' },
        { status: 400 }
      )
    }

    // Calculate payout eligibility
    const fundedPhaseStart = account.phases.find(p => p.phaseType === 'funded')?.phaseStartAt
    const daysSinceFunded = fundedPhaseStart 
      ? Math.floor((new Date().getTime() - fundedPhaseStart.getTime()) / (1000 * 60 * 60 * 24))
      : 0

    const lastPayout = account.payouts[0]
    const daysSinceLastPayout = lastPayout
      ? Math.floor((new Date().getTime() - lastPayout.createdAt.getTime()) / (1000 * 60 * 60 * 24))
      : daysSinceFunded

    const netProfitSinceLastPayout = lastPayout
      ? currentPhase.netProfitSincePhaseStart - (lastPayout.amountPaid || lastPayout.amount)
      : currentPhase.netProfitSincePhaseStart

    const hasActiveBreaches = account.breaches.length > 0

    const eligibility = PropFirmBusinessRules.calculatePayoutEligibility(
      account as any,
      currentPhase as any,
      daysSinceFunded,
      daysSinceLastPayout,
      netProfitSinceLastPayout,
      hasActiveBreaches
    )

    if (!eligibility.isEligible) {
      return NextResponse.json(
        { 
          error: 'Payout request not eligible', 
          details: eligibility.blockers,
          eligibility 
        },
        { status: 400 }
      )
    }

    // Validate payout amount doesn't exceed available profit
    const maxPayoutAmount = netProfitSinceLastPayout * ((account.profitSplitPercent || 80) / 100)
    if (payoutData.amountRequested > maxPayoutAmount) {
      return NextResponse.json(
        { 
          error: `Payout amount exceeds maximum allowed (${maxPayoutAmount.toFixed(2)})`,
          maxAmount: maxPayoutAmount
        },
        { status: 400 }
      )
    }

    // Create payout request
    const payout = await prisma.payout.create({
      data: {
        accountId: payoutData.accountId,
        accountNumber: account.number,
        amountRequested: payoutData.amountRequested,
        requestedAt: new Date(),
        notes: payoutData.notes,
        status: 'PENDING',
        // Legacy fields for compatibility
        amount: payoutData.amountRequested,
        date: new Date(),
      },
      include: {
        account: {
          select: {
            id: true,
            number: true,
            name: true,
            propfirm: true
          }
        }
      }
    })

    // Log payout request
    await prisma.auditLog.create({
      data: {
        userId,
        accountId: payoutData.accountId,
        action: 'PAYOUT_REQUESTED',
        entity: 'payout',
        entityId: payout.id,
        newValues: payout,
        metadata: {
          eligibility,
          maxPayoutAmount,
          netProfitSinceLastPayout
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: payout,
      message: 'Payout request submitted successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating payout request:', error)
    return NextResponse.json(
      { error: 'Failed to create payout request' },
      { status: 500 }
    )
  }
}
