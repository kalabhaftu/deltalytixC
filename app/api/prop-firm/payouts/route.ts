/**
 * Payout Management API
 * Handles payout requests and processing for funded accounts
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserId } from '@/server/auth'
import { PropFirmSchemas } from '@/lib/validation/prop-firm-schemas'
import { PropFirmBusinessRules } from '@/lib/prop-firm/business-rules'

// GET /api/prop-firm/payouts - List payouts
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId()
    const { searchParams } = new URL(request.url)

    // Parse filter parameters
    const filterData = {
      accountId: searchParams.get('accountId') || undefined,
      status: searchParams.getAll('status'),
      dateRange: searchParams.get('dateFrom') && searchParams.get('dateTo') ? {
        start: new Date(searchParams.get('dateFrom')!),
        end: new Date(searchParams.get('dateTo')!)
      } : undefined,
      page: Math.max(1, parseInt(searchParams.get('page') || '1') || 1),
      limit: Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50') || 50)),
    }

    // Validate filters
    const parseResult = PropFirmSchemas.PayoutFilter.safeParse(filterData)
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid filter parameters', details: parseResult.error.errors },
        { status: 400 }
      )
    }

    const filters = parseResult.data

    // Build where clause
    const where: any = {
      account: { userId }
    }

    if (filters.accountId) {
      where.accountId = filters.accountId
    }

    if (filters.status && filters.status.length > 0) {
      where.status = { in: filters.status }
    }

    if (filters.dateRange) {
      where.requestedAt = {
        gte: filters.dateRange.start,
        lte: filters.dateRange.end
      }
    }

    // Calculate pagination
    const offset = (filters.page - 1) * filters.limit

    // Get payouts with pagination
    const [payouts, total] = await Promise.all([
      prisma.payout.findMany({
        where,
        orderBy: { requestedAt: 'desc' },
        skip: offset,
        take: filters.limit,
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
      }),
      prisma.payout.count({ where })
    ])

    // Transform payouts to ensure consistent data structure
    const transformedPayouts = payouts.map(payout => ({
      id: payout.id,
      accountId: payout.accountId,
      accountNumber: payout.accountNumber,
      amountRequested: payout.amountRequested || payout.amount || 0,
      amountPaid: payout.amountPaid || 0,
      status: payout.status,
      requestedAt: payout.requestedAt?.toISOString() || payout.date?.toISOString() || '',
      paidAt: payout.paidAt?.toISOString() || '',
      notes: payout.notes || '',
      account: payout.account ? {
        id: payout.account.id,
        number: payout.account.number,
        name: payout.account.name,
        propfirm: payout.account.propfirm
      } : null,
      createdAt: payout.createdAt.toISOString()
    }))

    return NextResponse.json({
      success: true,
      data: transformedPayouts,
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: Math.ceil(total / filters.limit),
        hasNext: offset + filters.limit < total,
        hasPrevious: filters.page > 1,
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
      select: {
        id: true,
        number: true,
        name: true,
        propfirm: true,
        status: true,
        startingBalance: true,
        profitSplitPercent: true,
        payoutCycleDays: true,
        minDaysToFirstPayout: true,
        payoutEligibilityMinProfit: true,
        resetOnPayout: true,
        reduceBalanceByPayout: true,
        fundedResetBalance: true,
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

    // Only funded accounts can request payouts
    if (currentPhase.phaseType !== 'funded') {
      return NextResponse.json(
        { error: 'Only funded accounts can request payouts' },
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
      ? Math.max(0, currentPhase.netProfitSincePhaseStart - (lastPayout.amountPaid || lastPayout.amount || 0))
      : Math.max(0, currentPhase.netProfitSincePhaseStart || 0)

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
    const profitSplitPercent = Math.min(100, Math.max(0, account.profitSplitPercent || 80))
    const maxPayoutAmount = Math.min(
      eligibility.maxPayoutAmount || 0,
      netProfitSinceLastPayout * (profitSplitPercent / 100)
    )
    
    if (payoutData.amountRequested > maxPayoutAmount) {
      return NextResponse.json(
        { 
          error: `Payout amount exceeds maximum allowed (${maxPayoutAmount.toFixed(2)})`,
          maxAmount: maxPayoutAmount,
          availableProfit: netProfitSinceLastPayout,
          profitSplitPercent: account.profitSplitPercent || 80
        },
        { status: 400 }
      )
    }

    // Ensure payout amount is positive
    if (payoutData.amountRequested <= 0) {
      return NextResponse.json(
        { error: 'Payout amount must be greater than 0' },
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
        action: 'PAYOUT_REQUESTED',
        resource: 'payout',
        resourceId: payout.id,
        entity: 'payout',
        entityId: payout.id,
        details: {
          accountId: account.id,
          accountNumber: account.number,
          amountRequested: payoutData.amountRequested,
          eligibility: {
            isEligible: eligibility.isEligible,
            blockers: eligibility.blockers,
            maxPayoutAmount: eligibility.maxPayoutAmount,
            profitSplitAmount: eligibility.profitSplitAmount
          },
          netProfitSinceLastPayout,
          daysSinceFunded,
          daysSinceLastPayout
        },
        metadata: {
          payoutId: payout.id,
          accountId: account.id,
          amount: payoutData.amountRequested
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        id: payout.id,
        accountId: payout.accountId,
        accountNumber: payout.accountNumber,
        amountRequested: payout.amountRequested,
        status: payout.status,
        requestedAt: payout.requestedAt?.toISOString() || '',
        notes: payout.notes || '',
        account: payout.account ? {
          id: payout.account.id,
          number: payout.account.number,
          name: payout.account.name,
          propfirm: payout.account.propfirm
        } : null,
        createdAt: payout.createdAt.toISOString()
      }
    })

  } catch (error) {
    console.error('Error creating payout:', error)
    return NextResponse.json(
      { error: 'Failed to create payout' },
      { status: 500 }
    )
  }
}
