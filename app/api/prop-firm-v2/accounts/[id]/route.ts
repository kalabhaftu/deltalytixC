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
    const phases = await prisma.propFirmPhase?.findMany({
      where: { accountId },
      orderBy: { createdAt: 'asc' },
      include: {
        trades: {
          orderBy: { entryTime: 'desc' },
          take: 10 // Latest 10 trades for preview
        },
        dailySnapshots: {
          orderBy: { date: 'desc' },
          take: 30 // Last 30 days
        },
        breaches: {
          where: { isActive: true },
          orderBy: { breachedAt: 'desc' }
        }
      }
    }) || []
    
    // Get current active phase
    const currentPhase = phases.find(p => p.status === 'active') || phases[phases.length - 1]
    
    // Get all trades for this account
    const allTrades = await prisma.trade.findMany({
      where: { accountId },
      orderBy: { entryTime: 'desc' },
      take: 100 // More trades for analysis
    })
    
    // Get payout history
    const payouts = await prisma.payoutRequest?.findMany({
      where: { accountId },
      orderBy: { requestedAt: 'desc' }
    }) || []
    
    // Calculate comprehensive metrics if we have a current phase
    let drawdownData = null
    let progressData = null
    let payoutEligibility = null
    let riskMetrics = null
    let tradingStats = null
    
    if (currentPhase) {
      // Get latest daily snapshot for drawdown calculation
      const latestSnapshot = currentPhase.dailySnapshots?.[0]
      const dailyStartBalance = latestSnapshot?.openingBalance || currentPhase.startingBalance
      
      // Calculate drawdown
      drawdownData = PropFirmEngine.calculateDrawdown(
        currentPhase as any,
        currentPhase.currentEquity,
        dailyStartBalance,
        account.trailingDrawdownEnabled
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
        startingBalance: currentPhase.startingBalance,
        currentProfit: currentPhase.currentEquity - currentPhase.startingBalance,
        profitPercent: ((currentPhase.currentEquity - currentPhase.startingBalance) / currentPhase.startingBalance) * 100,
        daysTraded: currentPhase.daysTraded,
        winRate: riskMetrics.winRate,
        profitFactor: riskMetrics.profitFactor,
      }
    }
    
    // Prepare response
    const response = {
      // Account details
      account: {
        id: account.id,
        name: account.name,
        firmType: account.firmType,
        accountSize: account.accountSize,
        currency: account.currency || 'USD',
        leverage: account.leverage || 100,
        status: account.status,
        isDemo: account.isDemo,
        
        // Phase account IDs
        phase1AccountId: account.phase1AccountId,
        phase2AccountId: account.phase2AccountId,
        fundedAccountId: account.fundedAccountId,
        
        // Phase credentials (masked for security)
        phase1Login: account.phase1Login,
        phase2Login: account.phase2Login,
        fundedLogin: account.fundedLogin,
        // Passwords are intentionally excluded for security
        
        // Phase servers
        phase1Server: account.phase1Server,
        phase2Server: account.phase2Server,
        fundedServer: account.fundedServer,
        
        // Configuration
        phase1ProfitTarget: account.phase1ProfitTarget,
        phase2ProfitTarget: account.phase2ProfitTarget,
        phase1MaxDrawdown: account.phase1MaxDrawdown,
        phase2MaxDrawdown: account.phase2MaxDrawdown,
        fundedMaxDrawdown: account.fundedMaxDrawdown,
        phase1DailyDrawdown: account.phase1DailyDrawdown,
        phase2DailyDrawdown: account.phase2DailyDrawdown,
        fundedDailyDrawdown: account.fundedDailyDrawdown,
        trailingDrawdownEnabled: account.trailingDrawdownEnabled,
        
        // Trading rules
        minTradingDaysPhase1: account.minTradingDaysPhase1,
        minTradingDaysPhase2: account.minTradingDaysPhase2,
        maxTradingDaysPhase1: account.maxTradingDaysPhase1,
        maxTradingDaysPhase2: account.maxTradingDaysPhase2,
        consistencyRule: account.consistencyRule,
        newsTradinAllowed: account.newsTradinAllowed,
        weekendHoldingAllowed: account.weekendHoldingAllowed,
        hedgingAllowed: account.hedgingAllowed,
        eaAllowed: account.eaAllowed,
        maxPositions: account.maxPositions,
        
        // Payout configuration
        initialProfitSplit: account.initialProfitSplit,
        maxProfitSplit: account.maxProfitSplit,
        profitSplitIncrementPerPayout: account.profitSplitIncrementPerPayout,
        minPayoutAmount: account.minPayoutAmount,
        maxPayoutAmount: account.maxPayoutAmount,
        payoutFrequencyDays: account.payoutFrequencyDays,
        minDaysBeforeFirstPayout: account.minDaysBeforeFirstPayout,
        
        // Dates
        createdAt: account.createdAt,
        purchaseDate: account.purchaseDate,
        challengeStartDate: account.challengeStartDate,
        challengeEndDate: account.challengeEndDate,
        fundedDate: account.fundedDate,
        
        // Metadata
        tradingPlatform: account.tradingPlatform,
        notes: account.notes,
        syncEnabled: account.syncEnabled,
        lastSyncAt: account.lastSyncAt,
        
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
        currentPhaseStatus: currentPhase?.status,
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
      data: {
        ...validatedData,
        updatedAt: new Date(),
      },
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
