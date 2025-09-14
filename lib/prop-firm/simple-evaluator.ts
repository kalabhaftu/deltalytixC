/**
 * Simplified Prop Firm Account Evaluator
 * Single function approach - no complex multi-class structure
 */

import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export interface SimpleAccountStatus {
  accountId: string
  status: 'active' | 'failed' | 'funded' | 'needs_phase2_account'
  reason?: string
  breachType?: 'daily_dd' | 'max_dd'
  breachAmount?: number
  currentBalance: number
  highestBalance: number
  nextPhase?: 'phase_2' | 'funded'
  requiresNewAccountId?: boolean
}

/**
 * Single function to handle all account evaluation
 * No daily anchors, no open PnL, no complex business rules
 */
export async function updateAccountStatus(accountId: string): Promise<SimpleAccountStatus> {
  // Get account with all closed trades only
  const account = await prisma.account.findFirst({
    where: { id: accountId },
    include: {
      phases: {
        where: { phaseStatus: 'active' },
        orderBy: { createdAt: 'desc' },
        take: 1
      },
      trades: {
        where: { 
          accountId,
          // Only trades with PnL (closed trades from CSV)
          pnl: { not: null }
        },
        orderBy: { createdAt: 'asc' }
      }
    }
  })

  if (!account) throw new Error(`Account ${accountId} not found`)
  
  const currentPhase = account.phases[0]
  if (!currentPhase) throw new Error(`No active phase for account ${accountId}`)

  // Calculate running balance chronologically
  let runningBalance = account.startingBalance
  let highestBalance = account.startingBalance
  
  for (const trade of account.trades) {
    runningBalance += (trade.pnl || 0)
    highestBalance = Math.max(highestBalance, runningBalance)
  }

  // Check failures - simple approach
  const dailyDDLimit = account.startingBalance * (account.dailyDrawdownAmount || 0) / 100
  const maxDDLimit = account.startingBalance * (account.maxDrawdownAmount || 0) / 100
  
  // Check max drawdown breach
  const totalLoss = account.startingBalance - runningBalance
  if (totalLoss > maxDDLimit) {
    await markAccountFailed(account.id, currentPhase.id, 'max_dd', totalLoss, maxDDLimit)
    return {
      accountId,
      status: 'failed',
      reason: 'Max drawdown exceeded',
      breachType: 'max_dd',
      breachAmount: totalLoss,
      currentBalance: runningBalance,
      highestBalance
    }
  }

  // Check profit target progression
  const netProfit = runningBalance - account.startingBalance
  if (currentPhase.profitTarget && netProfit >= currentPhase.profitTarget) {
    
    // Determine next phase based on evaluation type
    if (account.evaluationType === 'one_step') {
      // One step: Phase 1 -> Funded
      await markAccountFunded(account.id, currentPhase.id)
      return {
        accountId,
        status: 'funded',
        reason: 'Phase 1 complete - Account funded',
        currentBalance: runningBalance,
        highestBalance
      }
    } else {
      // Two step: Phase 1 -> Phase 2 -> Funded
      if (currentPhase.phaseType === 'phase_1') {
        await markPhase1Passed(account.id, currentPhase.id, runningBalance, highestBalance)
        return {
          accountId,
          status: 'needs_phase2_account',
          reason: 'Phase 1 completed - Please provide Phase 2 account ID',
          currentBalance: runningBalance,
          highestBalance,
          nextPhase: 'phase_2',
          requiresNewAccountId: true
        }
      } else if (currentPhase.phaseType === 'phase_2') {
        await markAccountFunded(account.id, currentPhase.id)
        return {
          accountId,
          status: 'funded',
          reason: 'Phase 2 complete - Account funded',
          currentBalance: runningBalance,
          highestBalance
        }
      }
    }
  }

  // Update phase metrics
  await prisma.accountPhase.update({
    where: { id: currentPhase.id },
    data: {
      currentBalance: runningBalance,
      currentEquity: runningBalance,
      netProfitSincePhaseStart: netProfit,
      highestEquitySincePhaseStart: highestBalance
    }
  })

  return {
    accountId,
    status: 'active',
    currentBalance: runningBalance,
    highestBalance
  }
}

async function markAccountFailed(accountId: string, phaseId: string, reason: string, amount: number, threshold: number) {
  await prisma.$transaction(async (tx) => {
    await tx.account.update({
      where: { id: accountId },
      data: { status: 'failed' }
    })
    
    await tx.accountPhase.update({
      where: { id: phaseId },
      data: {
        phaseStatus: 'failed',
        phaseEndAt: new Date(),
        failureReason: reason,
        failedAt: new Date(),
        breachAmount: amount,
        breachThreshold: threshold
      }
    })
  })
}

async function markPhase1Passed(accountId: string, phase1Id: string, currentBalance: number, highestBalance: number) {
  await prisma.$transaction(async (tx) => {
    // Mark Phase 1 as passed but don't create Phase 2 yet
    await tx.accountPhase.update({
      where: { id: phase1Id },
      data: {
        phaseStatus: 'passed',
        phaseEndAt: new Date(),
        currentBalance,
        currentEquity: currentBalance,
        netProfitSincePhaseStart: currentBalance - (await tx.account.findUnique({ where: { id: accountId } }))!.startingBalance,
        highestEquitySincePhaseStart: highestBalance
      }
    })
    
    // Update account status to indicate Phase 2 account ID needed
    await tx.account.update({
      where: { id: accountId },
      data: { status: 'passed' } // Temporary status until Phase 2 account provided
    })
  })
}

/**
 * Creates Phase 2 with new account number
 * Call this after user provides Phase 2 account details
 */
export async function createPhase2WithNewAccount(
  phase1AccountId: string, 
  newAccountNumber: string,
  newAccountName?: string
): Promise<{ newAccountId: string; phase2Id: string }> {
  return await prisma.$transaction(async (tx) => {
    // Get Phase 1 account details
    const phase1Account = await tx.account.findUnique({ 
      where: { id: phase1AccountId },
      include: { 
        phases: { 
          where: { phaseType: 'phase_1', phaseStatus: 'passed' },
          orderBy: { createdAt: 'desc' },
          take: 1 
        }
      }
    })
    
    if (!phase1Account || !phase1Account.phases[0]) {
      throw new Error('Phase 1 account not found or not passed')
    }
    
    const phase1 = phase1Account.phases[0]
    
    // Create new account for Phase 2 (inherits settings from Phase 1)
    const phase2Account = await tx.account.create({
      data: {
        number: newAccountNumber,
        name: newAccountName || `${phase1Account.name || phase1Account.number} - Phase 2`,
        propfirm: phase1Account.propfirm,
        userId: phase1Account.userId,
        startingBalance: phase1.currentBalance, // Start Phase 2 with Phase 1 ending balance
        status: 'active',
        
        // Copy evaluation settings
        dailyDrawdownAmount: phase1Account.dailyDrawdownAmount,
        dailyDrawdownType: phase1Account.dailyDrawdownType,
        maxDrawdownAmount: phase1Account.maxDrawdownAmount,
        maxDrawdownType: phase1Account.maxDrawdownType,
        drawdownModeMax: phase1Account.drawdownModeMax,
        evaluationType: phase1Account.evaluationType,
        timezone: phase1Account.timezone,
        dailyResetTime: phase1Account.dailyResetTime,
        
        // Copy payout settings
        profitSplitPercent: phase1Account.profitSplitPercent,
        payoutCycleDays: phase1Account.payoutCycleDays,
        minDaysToFirstPayout: phase1Account.minDaysToFirstPayout,
        resetOnPayout: phase1Account.resetOnPayout,
        reduceBalanceByPayout: phase1Account.reduceBalanceByPayout,
        fundedResetBalance: phase1Account.fundedResetBalance
      }
    })
    
    // Create Phase 2 
    const phase2ProfitTarget = phase1Account.startingBalance * 0.05 // 5% of original starting balance
    const phase2 = await tx.accountPhase.create({
      data: {
        accountId: phase2Account.id,
        phaseType: 'phase_2',
        phaseStatus: 'active',
        profitTarget: phase2ProfitTarget,
        currentBalance: phase1.currentBalance,
        currentEquity: phase1.currentBalance,
        netProfitSincePhaseStart: 0, // Reset for new phase
        highestEquitySincePhaseStart: phase1.currentBalance
      }
    })
    
    return { newAccountId: phase2Account.id, phase2Id: phase2.id }
  })
}

async function markAccountFunded(accountId: string, phaseId: string) {
  await prisma.$transaction(async (tx) => {
    await tx.account.update({
      where: { id: accountId },
      data: { status: 'funded' }
    })
    
    await tx.accountPhase.update({
      where: { id: phaseId },
      data: {
        phaseStatus: 'passed',
        phaseEndAt: new Date()
      }
    })
  })
}
