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

    // Step 1: Get basic account info first (lightweight query)
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
      }
    })

    if (!account) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      )
    }

    // Step 2: Get related data with separate, efficient queries
    const [phases, trades, breaches, dailyAnchors] = await Promise.all([
      // Get phases (lightweight)
      prisma.accountPhase.findMany({
        where: { accountId },
          orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          phaseType: true,
          phaseStatus: true,
          phaseStartAt: true,
          phaseEndAt: true,
          profitTarget: true,
          currentEquity: true,
          currentBalance: true,
          netProfitSincePhaseStart: true,
          highestEquitySincePhaseStart: true,
          createdAt: true
        }
      }),
      
      // Get trades - BOTH linked trades AND trades by account number
      Promise.all([
        // Get trades directly linked by accountId
        prisma.trade.findMany({
          where: { accountId },
          orderBy: { exitTime: 'desc' },
          take: 100,
          select: {
            id: true,
            symbol: true,
            side: true,
            quantity: true,
            entryPrice: true,
            closePrice: true,
            realizedPnl: true,
            pnl: true,
            fees: true,
            commission: true,
            entryTime: true,
            exitTime: true,
            createdAt: true,
            phaseId: true,
            instrument: true
          }
        }),
        // Get trades by account number (for failed accounts or unlinked trades)
        prisma.trade.findMany({
          where: { 
            accountNumber: account.number,
            userId 
          },
          orderBy: { exitTime: 'desc' },
          take: 100,
          select: {
            id: true,
            symbol: true,
            side: true,
            quantity: true,
            entryPrice: true,
            closePrice: true,
            realizedPnl: true,
            pnl: true,
            fees: true,
            commission: true,
            entryTime: true,
            exitTime: true,
            createdAt: true,
            phaseId: true,
            instrument: true
          }
        })
      ]).then(([linkedTrades, unlinkedTrades]) => {
        // Merge and deduplicate trades
        const allTrades = [...linkedTrades]
        const linkedIds = new Set(linkedTrades.map(t => t.id))
        
        for (const trade of unlinkedTrades) {
          if (!linkedIds.has(trade.id)) {
            allTrades.push(trade)
          }
        }
        
        return allTrades.sort((a, b) => {
          const timeA = a.exitTime || a.createdAt
          const timeB = b.exitTime || b.createdAt
          return new Date(timeB).getTime() - new Date(timeA).getTime()
        })
      }),
      
      // Get recent breaches only
      prisma.breach.findMany({
        where: { accountId },
        orderBy: { breachTime: 'desc' },
        take: 5,
        select: {
          id: true,
          breachType: true,
          breachAmount: true,
          breachThreshold: true,
          breachTime: true,
          description: true,
          equity: true
        }
      }),
      
      // Get recent daily anchors only
      prisma.dailyAnchor.findMany({
        where: { accountId },
        orderBy: { date: 'desc' },
        take: 7, // Last week only
        select: {
          id: true,
          date: true,
          anchorEquity: true,
          computedAt: true
        }
      })
    ])

    // Calculate metrics efficiently
    const currentPhase = phases.find(p => p.phaseStatus === 'active') || phases[0]
    const totalPnl = trades.reduce((sum, trade) => sum + (trade.pnl || trade.realizedPnl || 0), 0)
    const currentBalance = account.startingBalance + totalPnl
    const currentEquity = currentPhase?.currentEquity || currentBalance
    
    // Simple drawdown calculation
    const latestAnchor = dailyAnchors[0]
    const dailyStartBalance = latestAnchor?.anchorEquity || account.startingBalance
    const highWaterMark = Math.max(
      currentPhase?.highestEquitySincePhaseStart || account.startingBalance,
      currentEquity
    )

    const dailyDrawdownAmount = Math.max(0, dailyStartBalance - currentEquity)
    const maxDrawdownAmount = Math.max(0, highWaterMark - currentEquity)
    
    const dailyDrawdownLimit = account.dailyDrawdownType === 'percent' 
      ? (account.dailyDrawdownAmount / 100) * account.startingBalance
      : account.dailyDrawdownAmount
      
    const maxDrawdownLimit = account.maxDrawdownType === 'percent'
      ? (account.maxDrawdownAmount / 100) * (account.drawdownModeMax === 'static' ? account.startingBalance : highWaterMark)
      : account.maxDrawdownAmount

    const dailyDrawdownRemaining = Math.max(0, dailyDrawdownLimit - dailyDrawdownAmount)
    const maxDrawdownRemaining = Math.max(0, maxDrawdownLimit - maxDrawdownAmount)
    
    const isBreached = dailyDrawdownAmount > dailyDrawdownLimit || maxDrawdownAmount > maxDrawdownLimit
    const breachType = dailyDrawdownAmount > dailyDrawdownLimit ? 'daily_drawdown' : 'max_drawdown'

    return NextResponse.json({
      success: true,
      data: {
        account: {
          ...account,
          currentBalance,
          currentEquity,
          netProfit: totalPnl,
          phases: phases.map(p => p.phaseType).join(' → '),
          currentPhase: currentPhase?.phaseType || 'evaluation'
        },
        drawdown: {
          dailyDrawdownRemaining,
          maxDrawdownRemaining,
          dailyStartBalance,
          highestEquity: highWaterMark,
          isBreached,
          breachType: isBreached ? breachType : null,
          breachAmount: isBreached ? (breachType === 'daily_drawdown' ? dailyDrawdownAmount : maxDrawdownAmount) : null
        },
        phases,
        trades,
        breaches,
        dailyAnchors,
        // Instrument performance
        instrumentStats: (() => {
          const stats = new Map()
          for (const trade of trades) {
            const symbol = trade.symbol || trade.instrument || 'Unknown'
            if (!stats.has(symbol)) {
              stats.set(symbol, { trades: 0, pnl: 0, wins: 0 })
            }
            const stat = stats.get(symbol)
            stat.trades++
            stat.pnl += (trade.pnl || trade.realizedPnl || 0)
            if ((trade.pnl || trade.realizedPnl || 0) > 0) stat.wins++
          }
          return Array.from(stats.entries()).map(([symbol, data]) => ({
            symbol,
            ...data,
            winRate: data.trades > 0 ? (data.wins / data.trades * 100) : 0
          }))
        })()
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

    // Simple delete - let cascade handle related data
    await prisma.account.delete({ 
      where: { id: accountId } 
    })

    // Quick audit log (no transaction)
    try {
      await prisma.auditLog.create({
        data: {
          userId,
          action: 'ACCOUNT_DELETED',
          entity: 'account',
          entityId: accountId,
          metadata: { deletedAt: new Date(), accountNumber: account.number }
        }
      })
    } catch (error) {
      // Don't fail delete if audit log fails
      console.warn('Failed to create audit log for deletion:', error)
    }

    return NextResponse.json({
      success: true,
      message: 'Account and all associated trades deleted successfully'
    }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    })

  } catch (error) {
    console.error('Error deleting account:', error)
    return NextResponse.json(
      { error: 'Failed to delete account' },
      { status: 500 }
    )
  }
}
