/**
 * Clean Prop Firm System - Simplified and Working
 * No complex transactions, no missing fields, just what works
 */

import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { getActiveAccountsWhereClause } from '@/lib/utils/account-filters'

export interface CleanAccountStatus {
  accountId: string
  status: 'active' | 'failed' | 'funded' | 'needs_phase2_account'
  reason?: string
  currentBalance: number
  netProfit: number
  profitTarget?: number
  phaseType: 'phase_1' | 'phase_2' | 'funded'
}

/**
 * Simple account evaluation that works with existing DB schema
 */
export async function evaluateAccount(accountId: string): Promise<CleanAccountStatus> {
  // Get account with current active phase and trades
  const account = await prisma.account.findFirst({
    where: { id: accountId },
    include: {
      phases: {
        where: { phaseStatus: 'active' },
        orderBy: { createdAt: 'desc' },
        take: 1
      },
      trades: {
        where: { accountId },
        orderBy: { createdAt: 'asc' }
      }
    }
  })

  if (!account) throw new Error(`Account ${accountId} not found`)
  
  const currentPhase = account.phases[0]
  if (!currentPhase) throw new Error(`No active phase for account ${accountId}`)

  // Calculate metrics from trades
  const netProfit = account.trades.reduce((sum, trade) => sum + (trade.pnl || 0), 0)
  const currentBalance = account.startingBalance + netProfit

  // Check for failure - both max drawdown and daily drawdown
  const maxDDLimit = account.startingBalance * (account.maxDrawdownAmount || 10) / 100
  const dailyDDLimit = account.startingBalance * (account.dailyDrawdownAmount || 4) / 100
  const totalLoss = Math.max(0, account.startingBalance - currentBalance)
  
  // Check max drawdown
  if (totalLoss > maxDDLimit) {
    await prisma.account.update({
      where: { id: accountId },
      data: { status: 'failed' }
    })
    
    await prisma.accountPhase.update({
      where: { id: currentPhase.id },
      data: { phaseStatus: 'failed', phaseEndAt: new Date() }
    })

    return {
      accountId,
      status: 'failed',
      reason: `Max drawdown exceeded: $${totalLoss.toFixed(2)} > $${maxDDLimit.toFixed(2)}`,
      currentBalance,
      netProfit,
      phaseType: currentPhase.phaseType as any
    }
  }
  
  // Check daily drawdown (simplified - check if any single day exceeded limit)
  const tradesByDate: Record<string, number> = {}
  account.trades.forEach(trade => {
    const date = trade.createdAt.toISOString().split('T')[0]
    if (!tradesByDate[date]) tradesByDate[date] = 0
    tradesByDate[date] += trade.pnl || 0
  })
  
  for (const [date, dailyPnL] of Object.entries(tradesByDate)) {
    const dailyLoss = Math.max(0, -(dailyPnL as number))
    if (dailyLoss > dailyDDLimit) {
      await prisma.account.update({
        where: { id: accountId },
        data: { status: 'failed' }
      })
      
      await prisma.accountPhase.update({
        where: { id: currentPhase.id },
        data: { phaseStatus: 'failed', phaseEndAt: new Date() }
      })

      return {
        accountId,
        status: 'failed',
        reason: `Daily drawdown exceeded on ${date}: $${dailyLoss.toFixed(2)} > $${dailyDDLimit.toFixed(2)}`,
        currentBalance,
        netProfit,
        phaseType: currentPhase.phaseType as any
      }
    }
  }

  // Check for profit target achievement
  if (currentPhase.profitTarget && netProfit >= currentPhase.profitTarget) {
    if (account.evaluationType === 'one_step' || currentPhase.phaseType === 'phase_2') {
      // Mark as funded
      await prisma.account.update({
        where: { id: accountId },
        data: { status: 'funded' }
      })
      
      await prisma.accountPhase.update({
        where: { id: currentPhase.id },
        data: { phaseStatus: 'passed', phaseEndAt: new Date() }
      })

      return {
        accountId,
        status: 'funded',
        reason: 'Profit target achieved - Account funded',
        currentBalance,
        netProfit,
        phaseType: 'funded'
      }
    } else if (currentPhase.phaseType === 'phase_1') {
      // Mark Phase 1 as passed, need Phase 2 account
      await prisma.account.update({
        where: { id: accountId },
        data: { status: 'passed' }
      })
      
      await prisma.accountPhase.update({
        where: { id: currentPhase.id },
        data: { phaseStatus: 'passed', phaseEndAt: new Date() }
      })

      return {
        accountId,
        status: 'needs_phase2_account',
        reason: 'Phase 1 completed - Please provide Phase 2 account number',
        currentBalance,
        netProfit,
        phaseType: currentPhase.phaseType as any
      }
    }
  }

  // Update phase metrics
  await prisma.accountPhase.update({
    where: { id: currentPhase.id },
    data: {
      currentBalance,
      currentEquity: currentBalance,
      netProfitSincePhaseStart: netProfit,
      highestEquitySincePhaseStart: Math.max(currentBalance, currentPhase.highestEquitySincePhaseStart)
    }
  })

  return {
    accountId,
    status: 'active',
    currentBalance,
    netProfit,
    profitTarget: currentPhase.profitTarget || undefined,
    phaseType: currentPhase.phaseType as any
  }
}

/**
 * Create Phase 2 account after Phase 1 completion
 */
export async function createPhase2Account(
  phase1AccountId: string,
  phase2AccountNumber: string
): Promise<{ newAccountId: string; phaseId: string }> {
  
  const phase1Account = await prisma.account.findFirst({
    where: { id: phase1AccountId, status: 'passed' },
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

  // Create new account for Phase 2
  const phase2Account = await prisma.account.create({
    data: {
      number: phase2AccountNumber,
      name: `${phase1Account.name || phase1Account.number} - Phase 2`,
      propfirm: phase1Account.propfirm,
      userId: phase1Account.userId,
      startingBalance: phase1.currentBalance,
      status: 'active',
      
      // Copy settings from Phase 1
      dailyDrawdownAmount: phase1Account.dailyDrawdownAmount,
      dailyDrawdownType: phase1Account.dailyDrawdownType,
      maxDrawdownAmount: phase1Account.maxDrawdownAmount,
      maxDrawdownType: phase1Account.maxDrawdownType,
      drawdownModeMax: phase1Account.drawdownModeMax,
      evaluationType: phase1Account.evaluationType,
      timezone: phase1Account.timezone,
      dailyResetTime: phase1Account.dailyResetTime,
      allowManualPhaseOverride: phase1Account.allowManualPhaseOverride,
      profitSplitPercent: phase1Account.profitSplitPercent,
      payoutCycleDays: phase1Account.payoutCycleDays,
      minDaysToFirstPayout: phase1Account.minDaysToFirstPayout,
      resetOnPayout: phase1Account.resetOnPayout,
      reduceBalanceByPayout: phase1Account.reduceBalanceByPayout,
    }
  })

  // Create Phase 2 with 5% profit target
  const phase2ProfitTarget = phase1Account.startingBalance * 0.05
  const phase2 = await prisma.accountPhase.create({
    data: {
      accountId: phase2Account.id,
      phaseType: 'phase_2',
      phaseStatus: 'active',
      profitTarget: phase2ProfitTarget,
      currentBalance: phase1.currentBalance,
      currentEquity: phase1.currentBalance,
      netProfitSincePhaseStart: 0,
      highestEquitySincePhaseStart: phase1.currentBalance
    }
  })

  return {
    newAccountId: phase2Account.id,
    phaseId: phase2.id
  }
}

/**
 * Link trades to accounts and evaluate
 */
export async function linkTradesAndEvaluate(trades: any[], userId: string) {
  const results = []
  const errors = []

  // Get prop firm accounts for this user (automatically excludes failed accounts)
  const accounts = await prisma.account.findMany({
    where: getActiveAccountsWhereClause({
      userId,
      propfirm: { not: '' }
    })
  })

  // Process each trade
  for (const trade of trades) {
    try {
      // Find matching account by number (with fallback matching)
      const matchingAccount = accounts.find(acc => 
        acc.number === trade.accountNumber ||
        acc.number.replace(/[-\s]/g, '') === trade.accountNumber.replace(/[-\s]/g, '')
      )

      if (matchingAccount) {
        // Get current active phase for the account
        const currentPhase = await prisma.accountPhase.findFirst({
          where: { 
            accountId: matchingAccount.id,
            phaseStatus: 'active'
          },
          orderBy: { createdAt: 'desc' }
        })

        // Update trade with account and phase linking
        await prisma.trade.update({
          where: { id: trade.id },
          data: {
            accountId: matchingAccount.id,
            phaseId: currentPhase?.id || null,
            symbol: trade.instrument,
            realizedPnl: trade.pnl,
            fees: trade.commission || 0
          }
        })

        // Evaluate account immediately after linking
        const status = await evaluateAccount(matchingAccount.id)
        results.push(status)
        
        // Log evaluation result for debugging
        console.log(`Evaluated account ${matchingAccount.number}: ${status.status} (${status.reason || 'no reason'})`)
        
        if (status.status === 'failed') {
          console.log(`🚨 Account ${matchingAccount.number} marked as FAILED: ${status.reason}`)
        }
      } else {
        errors.push(`No account found for ${trade.accountNumber}`)
      }
    } catch (error) {
      errors.push(`Error processing trade ${trade.id}: ${error}`)
    }
  }

  return { results, errors }
}
