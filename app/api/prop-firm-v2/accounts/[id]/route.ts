/**
 * Individual Master Account API - Rebuilt System
 * GET /api/prop-firm-v2/accounts/[id] - Get single master account with full details
 * PATCH /api/prop-firm-v2/accounts/[id] - Update master account
 * DELETE /api/prop-firm-v2/accounts/[id] - Delete master account
 */

import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getUserId } from '@/server/auth-utils'
import { z } from 'zod'

const prisma = new PrismaClient()

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

    // Get master account with all related data
    const masterAccount = await prisma.masterAccount.findFirst({
      where: {
        id: masterAccountId,
        userId
      },
      include: {
        phases: {
          include: {
            trades: {
              orderBy: { entryTime: 'desc' },
              take: 50 // Limit for performance
            }
          },
          orderBy: { phaseNumber: 'asc' }
        },
        user: {
          select: {
            id: true,
            email: true
          }
        }
      }
    })
    
    if (!masterAccount) {
      return NextResponse.json(
        { success: false, error: 'Master account not found' },
        { status: 404 }
      )
    }
    
    // Get the current active phase
    const currentPhase = masterAccount.phases.find(phase => 
      phase.phaseNumber === masterAccount.currentPhase
    )

    // Calculate basic statistics
    const allTrades = masterAccount.phases.flatMap(phase => phase.trades)
    const totalTrades = allTrades.length
    const totalPnL = allTrades.reduce((sum, trade) => sum + trade.pnl, 0)
    const winningTrades = allTrades.filter(trade => trade.pnl > 0).length
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0

    // Calculate current phase statistics
    const currentPhaseTrades = currentPhase?.trades || []
    const currentPhasePnL = currentPhaseTrades.reduce((sum, trade) => sum + trade.pnl, 0)
    
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

    // Calculate current balance and equity from trades
    const currentBalance = masterAccount.accountSize + totalPnL
    const currentEquity = currentBalance

    // Calculate drawdown based on current phase rules
    if (currentPhase) {
      // Calculate highest equity (peak balance)
      const tradesPnL = allTrades.reduce((sum, trade) => sum + trade.pnl, 0)
      drawdownData.highestEquity = Math.max(masterAccount.accountSize + tradesPnL, masterAccount.accountSize)
      drawdownData.currentEquity = currentEquity

      // Daily drawdown calculation (simplified - would need daily balance tracking)
      const dailyDrawdownLimit = currentPhase.dailyDrawdownPercent > 0
        ? (masterAccount.accountSize * currentPhase.dailyDrawdownPercent) / 100
        : 0
      drawdownData.dailyDrawdownRemaining = dailyDrawdownLimit > 0 ? dailyDrawdownLimit : 0
      drawdownData.dailyStartBalance = masterAccount.accountSize

      // Max drawdown calculation
      const maxDrawdownLimit = currentPhase.maxDrawdownPercent > 0
        ? (masterAccount.accountSize * currentPhase.maxDrawdownPercent) / 100
        : 0
      drawdownData.maxDrawdownRemaining = maxDrawdownLimit > 0 ? maxDrawdownLimit : 0

      // Check for breaches
      const dailyDrawdownUsed = drawdownData.highestEquity - currentEquity
      const maxDrawdownUsed = masterAccount.accountSize - currentEquity

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
      phases: masterAccount.phases.map(phase => ({
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
        endDate: phase.endDate?.toISOString() || null
      })),
      currentPnL: totalPnL,
      currentBalance: currentBalance,
      currentEquity: currentEquity,
      dailyDrawdownRemaining: drawdownData.dailyDrawdownRemaining,
      maxDrawdownRemaining: drawdownData.maxDrawdownRemaining,
      profitTargetProgress: currentPhase && currentPhase.profitTargetPercent > 0
        ? Math.min((totalPnL / (masterAccount.accountSize * currentPhase.profitTargetPercent / 100)) * 100, 100)
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
        owner: masterAccount.user
      },
      phases: masterAccount.phases.map(phase => ({
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
        tradeCount: phase.trades.length,
        totalPnL: phase.trades.reduce((sum, trade) => sum + trade.pnl, 0)
      })),
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
        currentPhaseTrades: currentPhaseTrades.length,
        currentPhasePnL
      },
      recentTrades: allTrades.slice(0, 20),
      summary: {
        totalPhases: masterAccount.phases.length,
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

    // Verify ownership and delete
    const deletedAccount = await prisma.masterAccount.deleteMany({
      where: {
        id: masterAccountId,
        userId
      }
    })

    if (deletedAccount.count === 0) {
      return NextResponse.json(
        { success: false, error: 'Master account not found or unauthorized' },
        { status: 404 }
      )
    }

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