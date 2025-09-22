/**
 * Individual Prop Firm Account API - Rebuilt System
 * GET /api/prop-firm-v2/accounts/[id] - Get single account with full details
 * PATCH /api/prop-firm-v2/accounts/[id] - Update account
 * DELETE /api/prop-firm-v2/accounts/[id] - Delete account
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

// Update validation schema
const UpdateAccountSchema = z.object({
  name: z.string().optional(),
  
  // Phase account IDs
  phase1AccountId: z.string().optional(),
  phase2AccountId: z.string().optional(),
  fundedAccountId: z.string().optional(),
  
  // Phase credentials
  phase1Login: z.string().optional(),
  phase2Login: z.string().optional(),
  fundedLogin: z.string().optional(),
  phase1Password: z.string().optional(),
  phase2Password: z.string().optional(),
  fundedPassword: z.string().optional(),
  
  // Phase servers
  phase1Server: z.string().optional(),
  phase2Server: z.string().optional(),
  fundedServer: z.string().optional(),
  
  // Trading rules
  newsTradinAllowed: z.boolean().optional(),
  weekendHoldingAllowed: z.boolean().optional(),
  hedgingAllowed: z.boolean().optional(),
  eaAllowed: z.boolean().optional(),
  maxPositions: z.number().optional(),
  
  // Metadata
  notes: z.string().optional(),
  syncEnabled: z.boolean().optional(),
  
  // Status updates
  status: z.enum(['active', 'failed', 'passed', 'funded']).optional(),
})

// GET /api/prop-firm-v2/accounts/[id]
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = await getUserId()
    const accountId = params.id
    
    // Get account with all related data
    const account = await prisma.account.findFirst({
      where: {
        id: accountId,
        userId,
      },
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true }
        }
      }
    })
    
    if (!account) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      )
    }
    
    // Get all phases for this account
    const phases = await prisma.accountPhase?.findMany({
      where: { accountId },
      orderBy: { createdAt: 'asc' },
      include: {
        trades: {
          orderBy: { entryTime: 'desc' },
          take: 10 // Latest 10 trades for preview
        },
        equitySnapshots: {
          orderBy: { timestamp: 'desc' },
          take: 30 // Last 30 days
        },
        breaches: {
          orderBy: { breachTime: 'desc' }
        }
      }
    }) || []
    
    // Get current active phase
    const currentPhase = phases.find(p => p.phaseStatus === 'active') || phases[phases.length - 1]
    
    // Get all trades for this account
    const allTrades = await prisma.trade.findMany({
      where: { accountId },
      orderBy: { entryTime: 'desc' },
      take: 100 // More trades for analysis
    })
    
    // Get payout history
    const payouts = await prisma.payout?.findMany({
      where: { accountId },
      orderBy: { date: 'desc' }
    }) || []
    
    // Calculate comprehensive metrics if we have a current phase
    let drawdownData = null
    let progressData = null
    let payoutEligibility = null
    let riskMetrics = null
    let tradingStats = null
    
    if (currentPhase) {
      // Get latest equity snapshot for drawdown calculation
      const latestSnapshot = currentPhase.equitySnapshots?.[0]
      const dailyStartBalance = latestSnapshot?.balance || currentPhase.currentBalance
      
      // Calculate drawdown
      drawdownData = PropFirmEngine.calculateDrawdown(
        currentPhase as any,
        currentPhase.currentEquity,
        dailyStartBalance,
        account.trailingDrawdown
      )
      
      // Calculate phase progress
      progressData = PropFirmEngine.calculatePhaseProgress(
        account as any,
        currentPhase as any,
        allTrades as any
      )
      
      // Calculate payout eligibility (only for funded phases)
      if (currentPhase.phaseType === 'funded') {
        payoutEligibility = PropFirmEngine.calculatePayoutEligibility(
          account as any,
          currentPhase as any,
          payouts
        )
      }
      
      // Calculate risk metrics
      riskMetrics = PropFirmEngine.calculateRiskMetrics(allTrades as any)
      
      // Calculate trading statistics
      tradingStats = {
        totalTrades: allTrades.length,
        totalPnL: allTrades.reduce((sum, t) => sum + (t.realizedPnl || t.pnl || 0), 0),
        totalCommission: allTrades.reduce((sum, t) => sum + (t.commission || t.fees || 0), 0),
        currentEquity: currentPhase.currentEquity,
        startingBalance: currentPhase.currentBalance,
        currentProfit: currentPhase.currentEquity - currentPhase.currentBalance,
        profitPercent: ((currentPhase.currentEquity - currentPhase.currentBalance) / currentPhase.currentBalance) * 100,
        daysTraded: 0, // Not available in current schema
        winRate: riskMetrics.winRate,
        profitFactor: riskMetrics.profitFactor,
      }
    }
    
    // Prepare response
    const response = {
      // Account details - using current schema fields
      account: {
        id: account.id,
        name: account.name,
        propfirm: account.propfirm, // Use propfirm instead of firmType
        status: account.status,
        startingBalance: account.startingBalance,
        profitTarget: account.profitTarget,
        dailyDrawdownAmount: account.dailyDrawdownAmount,
        maxDrawdownAmount: account.maxDrawdownAmount,
        trailingDrawdown: account.trailingDrawdown,
        profitSplitPercent: account.profitSplitPercent,
        payoutCycleDays: account.payoutCycleDays,
        minDaysToFirstPayout: account.minDaysToFirstPayout,
        maxFundedAccounts: account.maxFundedAccounts,
        tradingNewsAllowed: account.tradingNewsAllowed,
        createdAt: account.createdAt,

        // User info
        owner: account.user,
      },
      
      // Current state
      phases,
      currentPhase,
      drawdown: drawdownData,
      progress: progressData,
      payoutEligibility,
      riskMetrics,
      statistics: tradingStats,
      
      // Recent data
      recentTrades: allTrades.slice(0, 20),
      payoutHistory: payouts,
      
      // Summary
      summary: {
        totalPhases: phases.length,
        currentPhaseType: currentPhase?.phaseType,
        currentPhaseStatus: currentPhase?.phaseStatus,
        totalTrades: allTrades.length,
        totalPayouts: payouts.length,
        isBreached: drawdownData?.isBreached || false,
        nextAction: progressData?.readyToAdvance ? 'ready_to_advance' : 
                   drawdownData?.isBreached ? 'breached' : 'continue_trading',
      }
    }
    
    return NextResponse.json(response)
    
  } catch (error) {
    console.error('Error fetching prop firm account:', error)
    return NextResponse.json(
      { error: 'Failed to fetch account', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

// PATCH /api/prop-firm-v2/accounts/[id]
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = await getUserId()
    const accountId = params.id
    const body = await request.json()
    
    // Validate request data
    const validatedData = UpdateAccountSchema.parse(body)
    
    // Check if account exists and belongs to user
    const existingAccount = await prisma.account.findFirst({
      where: { id: accountId, userId }
    })
    
    if (!existingAccount) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      )
    }
    
    // Update account
    const updatedAccount = await prisma.account.update({
      where: { id: accountId },
      data: validatedData,
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true }
        }
      }
    })
    
    return NextResponse.json({
      success: true,
      account: updatedAccount,
      message: 'Account updated successfully'
    })
    
  } catch (error) {
    console.error('Error updating prop firm account:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to update account', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

// DELETE /api/prop-firm-v2/accounts/[id]
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = await getUserId()
    const accountId = params.id
    
    // Check if account exists and belongs to user
    const existingAccount = await prisma.account.findFirst({
      where: { id: accountId, userId }
    })
    
    if (!existingAccount) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      )
    }
    
    // Delete account and all related data (cascading deletes handled by schema)
    await prisma.account.delete({
      where: { id: accountId }
    })
    
    return NextResponse.json({
      success: true,
      message: 'Account deleted successfully'
    })
    
  } catch (error) {
    console.error('Error deleting prop firm account:', error)
    return NextResponse.json(
      { error: 'Failed to delete account', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}
