/**
 * Individual Master Account API - Rebuilt System
 * GET /api/prop-firm-v2/accounts/[id] - Get single master account with full details
 * PATCH /api/prop-firm-v2/accounts/[id] - Update master account
 * DELETE /api/prop-firm-v2/accounts/[id] - Delete master account
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUserId } from '@/server/auth-utils'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

interface RouteParams {
  params: Promise<{ id: string }>
}

// Update validation schema (simplified for now)
const UpdateMasterAccountSchema = z.object({
  accountName: z.string().min(1, 'Account name is required').optional(),
  isActive: z.boolean().optional()
})

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = await getUserId()
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id: masterAccountId } = await params
    // ID is pure masterAccountId (UUID), not composite
    
    // PERFORMANCE OPTIMIZATION: Use parallel queries and database aggregations
    const [masterAccount, phases, tradeStats] = await Promise.all([
      // 1. Get master account basic info (no nested relations)
      prisma.masterAccount.findFirst({
        where: {
          id: masterAccountId,
          userId
        },
        select: {
          id: true,
          accountName: true,
          propFirmName: true,
          accountSize: true,
          evaluationType: true,
          currentPhase: true,
          isActive: true,
          createdAt: true,
          userId: true
        }
      }),

      // 2. Get phases with minimal data (no trades)
      prisma.phaseAccount.findMany({
        where: {
          masterAccountId
        },
        orderBy: { phaseNumber: 'asc' }
      }),

      // 3. Get trade statistics using database aggregation (MUCH FASTER)
      prisma.trade.groupBy({
        by: ['phaseAccountId'],
        where: {
          phaseAccount: {
            masterAccountId
          }
        },
        _count: {
          id: true
        },
        _sum: {
          pnl: true,
          commission: true
        }
      })
    ])
    
    if (!masterAccount) {
      return NextResponse.json(
        { success: false, error: 'Master account not found' },
        { status: 404 }
      )
    }
    
    // Get the current active phase
    const currentPhase = phases.find(phase => 
      phase.phaseNumber === masterAccount.currentPhase
    )

    // CRITICAL: Auto-evaluate phase when account is viewed
    // This ensures status is always up-to-date, catching historical breaches
    if (currentPhase && currentPhase.status === 'active') {
      try {
        const { PhaseEvaluationEngine } = await import('@/lib/prop-firm/phase-evaluation-engine')
        
        const evaluation = await PhaseEvaluationEngine.evaluatePhase(
          masterAccount.id,
          currentPhase.id
        )

        if (evaluation.isFailed && currentPhase.status !== 'failed') {
          console.log(`[ACCOUNT_GET] Auto-evaluation detected failure - updating status`)
          
          await prisma.$transaction(async (tx) => {
            await tx.phaseAccount.update({
              where: { id: currentPhase.id },
              data: { status: 'failed', endDate: new Date() }
            })
            await tx.masterAccount.update({
              where: { id: masterAccount.id },
              data: { isActive: false }
            })
          })
          
          // Update local reference
          currentPhase.status = 'failed'
          masterAccount.isActive = false
          
          // Invalidate cache
          const { revalidateTag } = await import('next/cache')
          revalidateTag(`accounts-${userId}`)
        }
      } catch (evalError) {
        console.error('[ACCOUNT_GET] Error during auto-evaluation:', evalError)
      }
    }

    // Calculate statistics from aggregated data (FAST - no array operations)
    const totalTrades = tradeStats.reduce((sum, stat) => sum + stat._count.id, 0)
    const totalPnL = tradeStats.reduce((sum, stat) => {
      const pnl = stat._sum.pnl || 0
      const commission = stat._sum.commission || 0
      return sum + (pnl - commission)
    }, 0)

    // FIXED: Get trades ONLY for the current active phase (not all phases)
    const currentPhaseTradesMinimal = currentPhase ? await prisma.trade.findMany({
      where: {
        phaseAccountId: currentPhase.id  // ✅ Only current phase trades
      },
      select: {
        pnl: true,
        commission: true
      },
      orderBy: {
        exitTime: 'asc'  // Ordered for proper high-water mark calculation
      }
    }) : []

    // Get ALL trades for overall statistics
    const allTradesMinimal = await prisma.trade.findMany({
      where: {
        phaseAccount: {
          masterAccountId
        }
      },
      select: {
        pnl: true,
        commission: true
      }
    })

    const winningTrades = allTradesMinimal.filter(trade => {
      const netPnL = trade.pnl - (trade.commission || 0)
      return netPnL > 0
    }).length
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0

    // Calculate current phase statistics - PHASE SPECIFIC!
    const currentPhaseStat = tradeStats.find(stat => stat.phaseAccountId === currentPhase?.id)
    const currentPhasePnL = currentPhaseStat 
      ? (currentPhaseStat._sum.pnl || 0) - (currentPhaseStat._sum.commission || 0)
      : 0
    
    // Determine next action based on phase status
    let nextAction = 'continue_trading'
    if (!currentPhase?.phaseId) {
      nextAction = 'set_phase_id'
    } else if (currentPhase.status === 'passed') {
      nextAction = 'ready_to_advance'
    } else if (currentPhase.status === 'failed') {
      nextAction = 'failed'
    }

    // Calculate drawdown data for the hook
    const drawdownData = {
      dailyDrawdownRemaining: 0,
      maxDrawdownRemaining: 0,
      dailyStartBalance: 0,
      highestEquity: 0,
      currentEquity: 0,
      isBreached: false,
      breachType: undefined as 'daily_drawdown' | 'max_drawdown' | undefined
    }

    // FIXED: Calculate current balance and equity from CURRENT PHASE trades only
    const currentBalance = masterAccount.accountSize + currentPhasePnL
    const currentEquity = currentBalance

    // Calculate drawdown based on current phase rules
    if (currentPhase) {
      // Calculate highest equity (high-water mark) - track peak balance
      // IMPORTANT: Use only CURRENT PHASE trades, not all phases!
      let highWaterMark = masterAccount.accountSize
      let runningBalance = masterAccount.accountSize
      
      // Calculate high-water mark from CURRENT PHASE trades in order
      for (const trade of currentPhaseTradesMinimal) {
        runningBalance += (trade.pnl - (trade.commission || 0))
        highWaterMark = Math.max(highWaterMark, runningBalance)
      }
      
      drawdownData.highestEquity = highWaterMark
      drawdownData.currentEquity = currentEquity

      // Get daily start balance from daily anchor (fallback to account size)
      const todayAnchor = await prisma.dailyAnchor.findFirst({
        where: {
          phaseAccountId: currentPhase.id,
          date: {
            gte: new Date(new Date().setHours(0, 0, 0, 0))
          }
        },
        orderBy: { date: 'desc' }
      })
      
      const dailyStartBalance = todayAnchor?.anchorEquity || masterAccount.accountSize
      drawdownData.dailyStartBalance = dailyStartBalance

      // Daily drawdown calculation (from daily start balance)
      const dailyDrawdownLimit = currentPhase.dailyDrawdownPercent > 0
        ? (masterAccount.accountSize * currentPhase.dailyDrawdownPercent) / 100
        : 0
      const dailyDrawdownUsed = Math.max(0, dailyStartBalance - currentEquity)
      drawdownData.dailyDrawdownRemaining = Math.max(0, dailyDrawdownLimit - dailyDrawdownUsed)

      // Max drawdown calculation (static vs trailing)
      let maxDrawdownBase: number
      let maxDrawdownLimit: number
      
      if (currentPhase.maxDrawdownType === 'trailing') {
        // Trailing: Base on high-water mark
        maxDrawdownBase = highWaterMark
        maxDrawdownLimit = highWaterMark * (currentPhase.maxDrawdownPercent / 100)
      } else {
        // Static: Base on starting balance
        maxDrawdownBase = masterAccount.accountSize
        maxDrawdownLimit = masterAccount.accountSize * (currentPhase.maxDrawdownPercent / 100)
      }
      
      const maxDrawdownUsed = Math.max(0, maxDrawdownBase - currentEquity)
      drawdownData.maxDrawdownRemaining = Math.max(0, maxDrawdownLimit - maxDrawdownUsed)

      // FAILURE-FIRST: Check breaches (daily first, then max)
      if (dailyDrawdownUsed > dailyDrawdownLimit) {
        drawdownData.isBreached = true
        drawdownData.breachType = 'daily_drawdown'
      } else if (maxDrawdownUsed > maxDrawdownLimit) {
        drawdownData.isBreached = true
        drawdownData.breachType = 'max_drawdown'
      }
    }

    // Format account data as expected by the hook
    const accountData = {
      id: masterAccount.id,
      accountName: masterAccount.accountName,
      propFirmName: masterAccount.propFirmName,
      accountSize: masterAccount.accountSize,
      evaluationType: masterAccount.evaluationType,
      currentPhase: currentPhase || null,
      isActive: masterAccount.isActive,
      status: currentPhase?.status === 'failed' ? 'failed' : currentPhase?.status === 'passed' ? 'passed' : 'active',
      phases: await Promise.all(phases.map(async (phase) => {
        // Fetch trades for each phase for the accordion view
        const phaseTrades = await prisma.trade.findMany({
          where: { phaseAccountId: phase.id },
          select: {
            id: true,
            instrument: true,
            symbol: true,
            pnl: true,
            exitTime: true,
            entryTime: true
          },
          orderBy: { exitTime: 'desc' },
          take: 10 // Limit to 10 most recent trades per phase
        })

        return {
          id: phase.id,
          phaseNumber: phase.phaseNumber,
          phaseId: phase.phaseId,
          status: phase.status,
          profitTargetPercent: phase.profitTargetPercent,
          dailyDrawdownPercent: phase.dailyDrawdownPercent,
          maxDrawdownPercent: phase.maxDrawdownPercent,
          maxDrawdownType: phase.maxDrawdownType,
          minTradingDays: phase.minTradingDays,
          timeLimitDays: phase.timeLimitDays,
          consistencyRulePercent: phase.consistencyRulePercent,
          profitSplitPercent: phase.profitSplitPercent,
          payoutCycleDays: phase.payoutCycleDays,
          startDate: phase.startDate.toISOString(),
          endDate: phase.endDate?.toISOString() || null,
          trades: phaseTrades
        }
      })),
      currentPnL: currentPhasePnL,  // ✅ FIXED: Use current phase PnL, not total across all phases
      currentBalance: currentBalance,
      currentEquity: currentEquity,
      dailyDrawdownRemaining: drawdownData.dailyDrawdownRemaining,
      maxDrawdownRemaining: drawdownData.maxDrawdownRemaining,
      profitTargetProgress: currentPhase && currentPhase.profitTargetPercent > 0
        ? Math.min(Math.round((currentPhasePnL / (masterAccount.accountSize * currentPhase.profitTargetPercent / 100)) * 1000) / 10, 100)  // ✅ FIXED: Use current phase PnL
        : 0,
      lastUpdated: new Date().toISOString()
    }

    // Return the format expected by the hook
    const response = {
      account: accountData,
      drawdown: drawdownData,
      // Keep the full data for backward compatibility
      masterAccount: {
        id: masterAccount.id,
        accountName: masterAccount.accountName,
        propFirmName: masterAccount.propFirmName,
        accountSize: masterAccount.accountSize,
        evaluationType: masterAccount.evaluationType,
        currentPhase: masterAccount.currentPhase,
        isActive: masterAccount.isActive,
        createdAt: masterAccount.createdAt,
        owner: { id: masterAccount.userId, email: '' }
      },
      phases: phases.map(phase => {
        const phaseStat = tradeStats.find(stat => stat.phaseAccountId === phase.id)
        return {
          id: phase.id,
          phaseNumber: phase.phaseNumber,
          phaseId: phase.phaseId,
          status: phase.status,
          profitTargetPercent: phase.profitTargetPercent,
          dailyDrawdownPercent: phase.dailyDrawdownPercent,
          maxDrawdownPercent: phase.maxDrawdownPercent,
          minTradingDays: phase.minTradingDays,
          timeLimitDays: phase.timeLimitDays,
          consistencyRulePercent: phase.consistencyRulePercent,
          profitSplitPercent: phase.profitSplitPercent,
          payoutCycleDays: phase.payoutCycleDays,
          startDate: phase.startDate,
          endDate: phase.endDate,
          tradeCount: phaseStat?._count.id || 0,
          totalPnL: phaseStat ? (phaseStat._sum.pnl || 0) - (phaseStat._sum.commission || 0) : 0
        }
      }),
      currentPhase: currentPhase ? {
        id: currentPhase.id,
        phaseNumber: currentPhase.phaseNumber,
        phaseId: currentPhase.phaseId,
        status: currentPhase.status,
        rules: {
          profitTargetPercent: currentPhase.profitTargetPercent,
          dailyDrawdownPercent: currentPhase.dailyDrawdownPercent,
          maxDrawdownPercent: currentPhase.maxDrawdownPercent,
          minTradingDays: currentPhase.minTradingDays,
          timeLimitDays: currentPhase.timeLimitDays,
          consistencyRulePercent: currentPhase.consistencyRulePercent
        },
        payout: currentPhase.phaseNumber >= 3 ? {
          profitSplitPercent: currentPhase.profitSplitPercent,
          payoutCycleDays: currentPhase.payoutCycleDays
        } : null
      } : null,
      statistics: {
        totalTrades,
        totalPnL,
        winningTrades,
        losingTrades: totalTrades - winningTrades,
        winRate,
        currentPhaseTrades: currentPhaseStat?._count.id || 0,
        currentPhasePnL
      },
      recentTrades: currentPhaseTradesMinimal.slice(-20).reverse().map(trade => ({  // ✅ FIXED: Show recent trades from CURRENT PHASE only
        pnl: trade.pnl,
        commission: trade.commission,
        netPnL: trade.pnl - (trade.commission || 0)
      })),
      summary: {
        totalPhases: phases.length,
        currentPhaseNumber: masterAccount.currentPhase,
        currentPhaseStatus: currentPhase?.status,
        nextAction,
        needsPhaseId: !currentPhase?.phaseId && currentPhase?.status === 'active'
      }
    }

    return NextResponse.json({
      success: true,
      data: response
    })
    
  } catch (error) {
    console.error('Error fetching master account:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch account',
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = await getUserId()
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id: masterAccountId } = await params
    // ID is pure masterAccountId (UUID), not composite
    const body = await request.json()
    const updateData = UpdateMasterAccountSchema.parse(body)

    // Verify ownership
    const existingAccount = await prisma.masterAccount.findFirst({
      where: {
        id: masterAccountId,
        userId
      }
    })
    
    if (!existingAccount) {
      return NextResponse.json(
        { success: false, error: 'Master account not found or unauthorized' },
        { status: 404 }
      )
    }
    
    // Update the account
    const updatedAccount = await prisma.masterAccount.update({
      where: { id: masterAccountId },
      data: updateData
    })
    
    return NextResponse.json({
      success: true,
      data: updatedAccount
    })
    
  } catch (error) {
    console.error('Error updating master account:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Validation failed',
          details: error.errors
        },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update account' 
      },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = await getUserId()
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id: masterAccountId } = await params
    // ID is pure masterAccountId (UUID), not composite

    // Verify ownership first
    const existingAccount = await prisma.masterAccount.findFirst({
      where: {
        id: masterAccountId,
        userId
      },
      include: {
        phases: {
          select: { id: true, phaseId: true }
        }
      }
    })

    if (!existingAccount) {
      return NextResponse.json(
        { success: false, error: 'Master account not found or unauthorized' },
        { status: 404 }
      )
    }

    // Delete all associated data in a transaction
    await prisma.$transaction(async (tx) => {
      // Get all phase IDs for this master account
      const phaseIds = existingAccount.phases.map(phase => phase.id)
      const phaseAccountNumbers = existingAccount.phases.map(phase => phase.phaseId).filter(Boolean) as string[]

      // Delete all trades associated with this master account
      // This covers both phaseAccountId and accountNumber links
      await tx.trade.deleteMany({
        where: {
          OR: [
            { phaseAccountId: { in: phaseIds } },
            { accountNumber: { in: phaseAccountNumbers } },
            // Also delete any trades that might be linked by master account name
            { accountNumber: existingAccount.accountName }
          ]
        }
      })

      // Delete all phase accounts
      if (phaseIds.length > 0) {
        await tx.phaseAccount.deleteMany({
          where: {
            masterAccountId
          }
        })
      }

      // Delete daily anchors
      await tx.dailyAnchor.deleteMany({
        where: {
          phaseAccount: {
            masterAccountId
          }
        }
      })

      // Finally delete the master account
      await tx.masterAccount.delete({
        where: {
          id: masterAccountId
        }
      })
    })

    // Invalidate all cache tags to ensure fresh data
    const { invalidateUserCaches } = await import('@/server/accounts')
    await invalidateUserCaches(userId)

    return NextResponse.json({
      success: true,
      message: 'Master account deleted successfully'
    })
    
  } catch (error) {
    console.error('Error deleting master account:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to delete account' 
      },
      { status: 500 }
    )
  }
}