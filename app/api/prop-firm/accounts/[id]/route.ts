/**
 * Individual Prop Firm Account API
 * Handles operations for a specific account by ID
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserId } from '@/server/auth'
import { PropFirmSchemas } from '@/lib/validation/prop-firm-schemas'
import { PropFirmBusinessRules } from '@/lib/prop-firm/business-rules'
// Removed heavy validation import - using Zod directly

interface RouteParams {
  params: {
    id: string
  }
}

// GET /api/prop-firm/accounts/[id] - Get single account with detailed info
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = await getUserId()
    const { id: accountId } = await params

    // Get account with all related data
    const account = await prisma.account.findFirst({
      where: {
        id: accountId,
        userId,
      },
      select: {
        id: true,
        number: true,
        name: true,
        propfirm: true,
        status: true,
        startingBalance: true,
        profitTarget: true,
        drawdownThreshold: true,
        trailingDrawdown: true,
        createdAt: true,
        dailyDrawdownAmount: true,
        dailyDrawdownType: true,
        maxDrawdownAmount: true,
        maxDrawdownType: true,
        drawdownModeMax: true,
        evaluationType: true,
        timezone: true,
        dailyResetTime: true,
        ddIncludeOpenPnl: true,
        progressionIncludeOpenPnl: true,
        allowManualPhaseOverride: true,
        profitSplitPercent: true,
        payoutCycleDays: true,
        minDaysToFirstPayout: true,
        payoutEligibilityMinProfit: true,
        resetOnPayout: true,
        reduceBalanceByPayout: true,
        fundedResetBalance: true,
        phases: {
          orderBy: { createdAt: 'desc' },
        },
        trades: {
          where: { accountId },
          orderBy: { entryTime: 'desc' },
          take: 10, // Latest 10 trades for overview
        },
        breaches: {
          orderBy: { breachTime: 'desc' },
          take: 5, // Latest 5 breaches
        },
        payouts: {
          orderBy: { createdAt: 'desc' },
        },
        dailyAnchors: {
          orderBy: { date: 'desc' },
          take: 30, // Last 30 days
        },
        equitySnapshots: {
          orderBy: { timestamp: 'desc' },
          take: 100, // For equity chart
        },
        transitions: {
          orderBy: { transitionTime: 'desc' },
          take: 10,
        }
      }
    })

    if (!account) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      )
    }

    // Get current active phase
    const currentPhase = account.phases.find(p => p.phaseStatus === 'active')
    if (!currentPhase) {
      return NextResponse.json(
        { error: 'Account has no active phase' },
        { status: 400 }
      )
    }

    // Calculate current equity and metrics with safe defaults
    const latestSnapshot = account.equitySnapshots[0]
    const currentEquity = Math.max(0, latestSnapshot?.equity || account.startingBalance)
    const currentBalance = Math.max(0, latestSnapshot?.balance || account.startingBalance)
    const openPnl = latestSnapshot?.openPnl || 0

    // Get latest daily anchor for drawdown calculation
    const latestAnchor = account.dailyAnchors[0]
    const dailyStartBalance = Math.max(0, latestAnchor?.anchorEquity || account.startingBalance)

    // Calculate drawdown status
    const drawdown = PropFirmBusinessRules.calculateDrawdown(
      account as any,
      currentPhase as any,
      currentEquity,
      dailyStartBalance,
      currentPhase.highestEquitySincePhaseStart || account.startingBalance
    )

    // Calculate phase progress
    const progress = PropFirmBusinessRules.calculatePhaseProgress(
      account as any,
      currentPhase as any,
      currentPhase.netProfitSincePhaseStart
    )

    // Calculate payout eligibility if funded
    let payoutEligibility = null
    if (currentPhase.phaseType === 'funded') {
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

      const hasActiveBreaches = account.breaches.some(
        b => b.breachTime >= new Date(Date.now() - 24 * 60 * 60 * 1000)
      )

      payoutEligibility = PropFirmBusinessRules.calculatePayoutEligibility(
        account as any,
        currentPhase as any,
        daysSinceFunded,
        daysSinceLastPayout,
        netProfitSinceLastPayout,
        hasActiveBreaches
      )
    }

    // Calculate risk metrics
    const riskMetrics = PropFirmBusinessRules.calculateRiskMetrics(
      account as any,
      account.trades as any,
      currentEquity
    )

    return NextResponse.json({
      success: true,
      data: {
        account: {
          ...account,
          currentEquity,
          currentBalance,
          openPnl,
        },
        currentPhase,
        drawdown,
        progress,
        payoutEligibility,
        riskMetrics,
        recentActivity: {
          trades: account.trades.slice(0, 5),
          breaches: account.breaches,
          transitions: account.transitions,
        },
        charts: {
          equity: account.equitySnapshots,
          dailyAnchors: account.dailyAnchors,
        }
      }
    })

  } catch (error) {
    console.error('Error fetching account details:', error)
    return NextResponse.json(
      { error: 'Failed to fetch account details' },
      { status: 500 }
    )
  }
}

// PATCH /api/prop-firm/accounts/[id] - Update account
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = await getUserId()
    const { id: accountId } = await params
    const body = await request.json()

    // Validate input
    const parseResult = PropFirmSchemas.UpdateAccount.safeParse(body)
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid update data', details: parseResult.error.errors },
        { status: 400 }
      )
    }

    const updateData = parseResult.data

    // Check account exists and belongs to user
    const existingAccount = await prisma.account.findFirst({
      where: { id: accountId, userId },
      select: {
        id: true,
        number: true,
        name: true,
        propfirm: true,
        status: true,
        startingBalance: true,
        profitTarget: true,
        drawdownThreshold: true,
        trailingDrawdown: true,
        createdAt: true,
        dailyDrawdownAmount: true,
        dailyDrawdownType: true,
        maxDrawdownAmount: true,
        maxDrawdownType: true,
        drawdownModeMax: true,
        evaluationType: true,
        timezone: true,
        dailyResetTime: true,
        ddIncludeOpenPnl: true,
        progressionIncludeOpenPnl: true,
        allowManualPhaseOverride: true,
        profitSplitPercent: true,
        payoutCycleDays: true,
        minDaysToFirstPayout: true,
        payoutEligibilityMinProfit: true,
        resetOnPayout: true,
        reduceBalanceByPayout: true,
        fundedResetBalance: true,
      }
    })

    if (!existingAccount) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      )
    }

    // Validate business rules if configuration is being updated
    if (updateData.dailyDrawdownAmount || updateData.maxDrawdownAmount) {
      const configValidation = PropFirmBusinessRules.validateAccountConfiguration({
        ...existingAccount,
        ...updateData,
        name: updateData.name || existingAccount.name || ''
      } as any)
      
      if (!configValidation.valid) {
        return NextResponse.json(
          { error: 'Invalid configuration', details: configValidation.errors },
          { status: 400 }
        )
      }
    }

    // Update account in transaction
    const result = await prisma.$transaction(async (tx) => {
      const updatedAccount = await tx.account.update({
        where: { id: accountId },
        data: updateData,
      })

      // Log the update
      await tx.auditLog.create({
        data: {
          userId,
          accountId,
          action: 'ACCOUNT_UPDATED',
          entity: 'account',
          entityId: accountId,
          oldValues: existingAccount,
          newValues: updateData,
        }
      })

      return updatedAccount
    })

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Account updated successfully'
    })

  } catch (error) {
    console.error('Error updating account:', error)
    return NextResponse.json(
      { error: 'Failed to update account' },
      { status: 500 }
    )
  }
}

// DELETE /api/prop-firm/accounts/[id] - Delete account (soft delete)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = await getUserId()
    const { id: accountId } = await params

    // Check account exists and belongs to user
    const account = await prisma.account.findFirst({
      where: { id: accountId, userId },
      select: {
        id: true,
        number: true,
        name: true,
        propfirm: true,
        status: true,
        startingBalance: true,
        createdAt: true,
        trades: { take: 1 },
        payouts: { take: 1 },
        phases: { take: 1 }
      }
    })

    if (!account) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      )
    }

    // Prevent deletion if account has activity
    if (account.trades.length > 0 || account.payouts.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete account with existing trades or payouts' },
        { status: 400 }
      )
    }

    // Delete account and related data in transaction
    await prisma.$transaction(async (tx) => {
      // Delete related data first
      await tx.equitySnapshot.deleteMany({ where: { accountId } })
      await tx.dailyAnchor.deleteMany({ where: { accountId } })
      await tx.accountTransition.deleteMany({ where: { accountId } })
      await tx.breach.deleteMany({ where: { accountId } })
      await tx.accountPhase.deleteMany({ where: { accountId } })
      
      // Delete the account
      await tx.account.delete({ where: { id: accountId } })

      // Log the deletion
      await tx.auditLog.create({
        data: {
          userId,
          action: 'ACCOUNT_DELETED',
          entity: 'account',
          entityId: accountId,
          oldValues: account,
          metadata: { deletedAt: new Date() }
        }
      })
    })

    return NextResponse.json({
      success: true,
      message: 'Account deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting account:', error)
    return NextResponse.json(
      { error: 'Failed to delete account' },
      { status: 500 }
    )
  }
}
