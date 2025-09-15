/**
 * Comprehensive Prop Firm Trading Engine
 * Handles all aspects of prop firm account management, drawdown calculations,
 * phase progressions, and payout eligibility
 */

import { Decimal } from '@prisma/client/runtime/library'

// Types
export interface PropFirmAccount {
  id: string
  userId: string
  firmType: string
  accountSize: number
  currency: string
  leverage: number
  
  // Phase account IDs
  phase1AccountId?: string
  phase2AccountId?: string
  fundedAccountId?: string
  
  // Phase credentials
  phase1Login?: string
  phase2Login?: string
  fundedLogin?: string
  
  // Drawdown configuration
  phase1MaxDrawdown: number
  phase2MaxDrawdown: number
  fundedMaxDrawdown: number
  phase1DailyDrawdown: number
  phase2DailyDrawdown: number
  fundedDailyDrawdown: number
  trailingDrawdownEnabled: boolean
  
  // Profit targets
  phase1ProfitTarget: number
  phase2ProfitTarget: number
  
  // Trading rules
  minTradingDaysPhase1: number
  minTradingDaysPhase2: number
  maxTradingDaysPhase1?: number
  maxTradingDaysPhase2?: number
  consistencyRule: number
  
  // Payout configuration
  initialProfitSplit: number
  maxProfitSplit: number
  profitSplitIncrementPerPayout: number
  minPayoutAmount: number
  maxPayoutAmount?: number
  payoutFrequencyDays: number
  minDaysBeforeFirstPayout: number
  
  // Current state
  status: 'active' | 'failed' | 'passed' | 'funded'
  createdAt: Date
  purchaseDate?: Date
  challengeStartDate?: Date
  challengeEndDate?: Date
  fundedDate?: Date
}

export interface PropFirmPhase {
  id: string
  accountId: string
  phaseType: 'phase_1' | 'phase_2' | 'funded'
  status: 'active' | 'passed' | 'failed' | 'pending'
  
  // Account details
  brokerAccountId: string
  brokerLogin?: string
  brokerPassword?: string
  brokerServer?: string
  startingBalance: number
  currentBalance: number
  currentEquity: number
  highWaterMark: number
  
  // Targets and limits
  profitTarget: number
  profitTargetPercent: number
  maxDrawdownAmount: number
  maxDrawdownPercent: number
  dailyDrawdownAmount: number
  dailyDrawdownPercent: number
  
  // Progress tracking
  startedAt?: Date
  completedAt?: Date
  failedAt?: Date
  daysTraded: number
  minTradingDays: number
  maxTradingDays?: number
  
  // Statistics
  totalTrades: number
  winningTrades: number
  losingTrades: number
  totalVolume: number
  totalCommission: number
  totalSwap: number
  bestTrade: number
  worstTrade: number
  currentStreak: number
  bestStreak: number
  worstStreak: number
  
  // Risk metrics
  maxDrawdownEncountered: number
  maxDailyLoss: number
  avgTradeSize: number
  profitFactor: number
  winRate: number
  riskRewardRatio: number
}

export interface PropFirmTrade {
  id: string
  phaseId: string
  accountId: string
  symbol: string
  side: 'long' | 'short'
  quantity: number
  entryPrice: number
  exitPrice?: number
  entryTime: Date
  exitTime?: Date
  commission: number
  swap: number
  fees: number
  realizedPnl?: number
  equityAtOpen: number
  equityAtClose?: number
  comment?: string
  strategy?: string
}

export interface DrawdownCalculation {
  currentEquity: number
  dailyStartBalance: number
  highWaterMark: number
  
  // Daily drawdown
  dailyDrawdownUsed: number
  dailyDrawdownLimit: number
  dailyDrawdownRemaining: number
  dailyDrawdownPercent: number
  
  // Max drawdown
  maxDrawdownUsed: number
  maxDrawdownLimit: number
  maxDrawdownRemaining: number
  maxDrawdownPercent: number
  
  // Breach status
  isBreached: boolean
  breachType?: 'daily_drawdown' | 'max_drawdown'
  breachAmount?: number
  breachTime?: Date
}

export interface PhaseProgress {
  currentPhase: PropFirmPhase
  profitProgress: number
  profitProgressPercent: number
  daysRemaining?: number
  tradingDaysComplete: number
  minTradingDaysMet: boolean
  consistencyMet: boolean
  readyToAdvance: boolean
  failureReasons: string[]
}

export interface PayoutEligibility {
  isEligible: boolean
  eligibleAmount: number
  profitSplitPercent: number
  traderShare: number
  firmShare: number
  nextPayoutDate?: Date
  daysUntilNextPayout?: number
  reasons: string[]
}

/**
 * Main Prop Firm Engine Class
 */
export class PropFirmEngine {
  
  /**
   * Calculate comprehensive drawdown status
   */
  static calculateDrawdown(
    phase: PropFirmPhase,
    currentEquity: number,
    dailyStartBalance: number,
    trailingEnabled: boolean = true
  ): DrawdownCalculation {
    
    // Ensure valid numbers
    const safeEquity = this.ensureNumber(currentEquity, phase.startingBalance)
    const safeDailyStart = this.ensureNumber(dailyStartBalance, phase.startingBalance)
    const safeHighWaterMark = this.ensureNumber(phase.highWaterMark, phase.startingBalance)
    
    // Calculate daily drawdown
    const dailyDrawdownUsed = Math.max(0, safeDailyStart - safeEquity)
    const dailyDrawdownLimit = phase.dailyDrawdownAmount
    const dailyDrawdownRemaining = Math.max(0, dailyDrawdownLimit - dailyDrawdownUsed)
    const dailyDrawdownPercent = safeDailyStart > 0 ? (dailyDrawdownUsed / safeDailyStart) * 100 : 0
    
    // Calculate max drawdown (trailing or static)
    const maxDrawdownBase = trailingEnabled ? safeHighWaterMark : phase.startingBalance
    const maxDrawdownUsed = Math.max(0, maxDrawdownBase - safeEquity)
    const maxDrawdownLimit = phase.maxDrawdownAmount
    const maxDrawdownRemaining = Math.max(0, maxDrawdownLimit - maxDrawdownUsed)
    const maxDrawdownPercent = maxDrawdownBase > 0 ? (maxDrawdownUsed / maxDrawdownBase) * 100 : 0
    
    // Check for breaches
    let isBreached = false
    let breachType: 'daily_drawdown' | 'max_drawdown' | undefined
    let breachAmount: number | undefined
    
    if (dailyDrawdownUsed > dailyDrawdownLimit) {
      isBreached = true
      breachType = 'daily_drawdown'
      breachAmount = dailyDrawdownUsed - dailyDrawdownLimit
    } else if (maxDrawdownUsed > maxDrawdownLimit) {
      isBreached = true
      breachType = 'max_drawdown'
      breachAmount = maxDrawdownUsed - maxDrawdownLimit
    }
    
    return {
      currentEquity: safeEquity,
      dailyStartBalance: safeDailyStart,
      highWaterMark: safeHighWaterMark,
      dailyDrawdownUsed,
      dailyDrawdownLimit,
      dailyDrawdownRemaining,
      dailyDrawdownPercent,
      maxDrawdownUsed,
      maxDrawdownLimit,
      maxDrawdownRemaining,
      maxDrawdownPercent,
      isBreached,
      breachType,
      breachAmount,
      breachTime: isBreached ? new Date() : undefined
    }
  }
  
  /**
   * Calculate phase progress and advancement eligibility
   */
  static calculatePhaseProgress(
    account: PropFirmAccount,
    phase: PropFirmPhase,
    trades: PropFirmTrade[]
  ): PhaseProgress {
    
    const currentProfit = phase.currentEquity - phase.startingBalance
    const profitProgress = Math.max(0, currentProfit)
    const profitProgressPercent = phase.profitTarget > 0 ? (profitProgress / phase.profitTarget) * 100 : 0
    
    // Calculate trading days
    const tradingDays = this.calculateTradingDays(trades)
    const minTradingDaysMet = tradingDays >= phase.minTradingDays
    
    // Calculate consistency (largest daily profit should not exceed X% of total profit)
    const consistencyMet = this.checkConsistency(trades, currentProfit, account.consistencyRule)
    
    // Check if ready to advance
    const profitTargetMet = profitProgress >= phase.profitTarget
    const readyToAdvance = profitTargetMet && minTradingDaysMet && consistencyMet
    
    // Calculate failure reasons
    const failureReasons: string[] = []
    if (!profitTargetMet) {
      failureReasons.push(`Profit target not met (${profitProgressPercent.toFixed(1)}% of ${phase.profitTarget})`)
    }
    if (!minTradingDaysMet) {
      failureReasons.push(`Minimum trading days not met (${tradingDays}/${phase.minTradingDays})`)
    }
    if (!consistencyMet) {
      failureReasons.push(`Consistency rule violated (max ${account.consistencyRule}% in single day)`)
    }
    
    // Calculate days remaining
    let daysRemaining: number | undefined
    if (phase.maxTradingDays && phase.startedAt) {
      const maxDate = new Date(phase.startedAt)
      maxDate.setDate(maxDate.getDate() + phase.maxTradingDays)
      const now = new Date()
      daysRemaining = Math.max(0, Math.ceil((maxDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    }
    
    return {
      currentPhase: phase,
      profitProgress,
      profitProgressPercent,
      daysRemaining,
      tradingDaysComplete: tradingDays,
      minTradingDaysMet,
      consistencyMet,
      readyToAdvance,
      failureReasons
    }
  }
  
  /**
   * Calculate payout eligibility and amounts
   */
  static calculatePayoutEligibility(
    account: PropFirmAccount,
    phase: PropFirmPhase,
    payoutHistory: any[]
  ): PayoutEligibility {
    
    // Only funded accounts are eligible for payouts
    if (phase.phaseType !== 'funded') {
      return {
        isEligible: false,
        eligibleAmount: 0,
        profitSplitPercent: 0,
        traderShare: 0,
        firmShare: 0,
        reasons: ['Only funded accounts are eligible for payouts']
      }
    }
    
    const currentProfit = Math.max(0, phase.currentEquity - phase.startingBalance)
    const reasons: string[] = []
    
    // Check minimum payout amount
    if (currentProfit < account.minPayoutAmount) {
      reasons.push(`Minimum payout amount not reached ($${currentProfit} < $${account.minPayoutAmount})`)
    }
    
    // Check if minimum days have passed since funding
    const daysSinceFunding = account.fundedDate ? 
      Math.floor((Date.now() - account.fundedDate.getTime()) / (1000 * 60 * 60 * 24)) : 0
    
    if (daysSinceFunding < account.minDaysBeforeFirstPayout) {
      reasons.push(`Minimum days before first payout not met (${daysSinceFunding}/${account.minDaysBeforeFirstPayout})`)
    }
    
    // Check payout frequency
    const lastPayout = payoutHistory[0] // Assuming sorted by date desc
    if (lastPayout) {
      const daysSinceLastPayout = Math.floor((Date.now() - new Date(lastPayout.date).getTime()) / (1000 * 60 * 60 * 24))
      if (daysSinceLastPayout < account.payoutFrequencyDays) {
        reasons.push(`Payout frequency not met (${daysSinceLastPayout}/${account.payoutFrequencyDays} days)`)
      }
    }
    
    // Calculate profit split (increases with each payout)
    const profitSplitPercent = Math.min(
      account.maxProfitSplit,
      account.initialProfitSplit + (payoutHistory.length * account.profitSplitIncrementPerPayout)
    )
    
    // Calculate amounts
    const eligibleAmount = Math.min(
      currentProfit,
      account.maxPayoutAmount || currentProfit
    )
    
    const traderShare = eligibleAmount * (profitSplitPercent / 100)
    const firmShare = eligibleAmount - traderShare
    
    // Calculate next payout date
    let nextPayoutDate: Date | undefined
    let daysUntilNextPayout: number | undefined
    
    if (lastPayout) {
      nextPayoutDate = new Date(lastPayout.date)
      nextPayoutDate.setDate(nextPayoutDate.getDate() + account.payoutFrequencyDays)
      daysUntilNextPayout = Math.max(0, Math.ceil((nextPayoutDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    } else if (account.fundedDate) {
      nextPayoutDate = new Date(account.fundedDate)
      nextPayoutDate.setDate(nextPayoutDate.getDate() + account.minDaysBeforeFirstPayout)
      daysUntilNextPayout = Math.max(0, Math.ceil((nextPayoutDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    }
    
    const isEligible = reasons.length === 0 && eligibleAmount >= account.minPayoutAmount
    
    return {
      isEligible,
      eligibleAmount,
      profitSplitPercent,
      traderShare,
      firmShare,
      nextPayoutDate,
      daysUntilNextPayout,
      reasons
    }
  }
  
  /**
   * Check if account should advance to next phase or fail
   */
  static evaluatePhaseTransition(
    account: PropFirmAccount,
    phase: PropFirmPhase,
    drawdown: DrawdownCalculation,
    progress: PhaseProgress
  ): 'advance' | 'fail' | 'continue' {
    
    // Check for drawdown breach (immediate failure)
    if (drawdown.isBreached) {
      return 'fail'
    }
    
    // Check for time limit breach
    if (phase.maxTradingDays && progress.daysRemaining !== undefined && progress.daysRemaining <= 0) {
      if (!progress.readyToAdvance) {
        return 'fail'
      }
    }
    
    // Check if ready to advance
    if (progress.readyToAdvance) {
      return 'advance'
    }
    
    return 'continue'
  }
  
  /**
   * Filter accounts based on status (exclude failed from equity calculations)
   */
  static filterActiveAccounts(accounts: PropFirmAccount[]): PropFirmAccount[] {
    return accounts.filter(account => account.status !== 'failed')
  }
  
  /**
   * Calculate total equity across all active accounts
   */
  static calculateTotalEquity(accounts: PropFirmAccount[], phases: PropFirmPhase[]): number {
    const activeAccounts = this.filterActiveAccounts(accounts)
    
    return activeAccounts.reduce((total, account) => {
      const activePhase = phases.find(p => p.accountId === account.id && p.status === 'active')
      return total + (activePhase?.currentEquity || 0)
    }, 0)
  }
  
  /**
   * Calculate trading days from trades array
   */
  private static calculateTradingDays(trades: PropFirmTrade[]): number {
    const tradingDays = new Set<string>()
    
    trades.forEach(trade => {
      const date = trade.entryTime.toISOString().split('T')[0]
      tradingDays.add(date)
    })
    
    return tradingDays.size
  }
  
  /**
   * Check consistency rule (largest daily profit should not exceed X% of total profit)
   */
  private static checkConsistency(trades: PropFirmTrade[], totalProfit: number, maxPercent: number): boolean {
    if (totalProfit <= 0) return true
    
    const dailyProfits = new Map<string, number>()
    
    trades.forEach(trade => {
      if (trade.realizedPnl && trade.exitTime) {
        const date = trade.exitTime.toISOString().split('T')[0]
        const current = dailyProfits.get(date) || 0
        dailyProfits.set(date, current + trade.realizedPnl)
      }
    })
    
    const maxDailyProfit = Math.max(...Array.from(dailyProfits.values()).filter(p => p > 0))
    const percentageOfTotal = (maxDailyProfit / totalProfit) * 100
    
    return percentageOfTotal <= maxPercent
  }
  
  /**
   * Ensure a number is valid
   */
  private static ensureNumber(value: number | null | undefined, defaultValue: number): number {
    if (typeof value === 'number' && !isNaN(value) && isFinite(value)) {
      return value
    }
    return defaultValue
  }
  
  /**
   * Calculate risk metrics for a phase
   */
  static calculateRiskMetrics(trades: PropFirmTrade[]): {
    totalTrades: number
    winRate: number
    avgWin: number
    avgLoss: number
    profitFactor: number
    currentStreak: number
    bestStreak: number
    worstStreak: number
    riskRewardRatio: number
  } {
    
    const closedTrades = trades.filter(t => t.realizedPnl !== null && t.realizedPnl !== undefined)
    const winners = closedTrades.filter(t => t.realizedPnl! > 0)
    const losers = closedTrades.filter(t => t.realizedPnl! < 0)
    
    const totalWins = winners.reduce((sum, t) => sum + t.realizedPnl!, 0)
    const totalLosses = Math.abs(losers.reduce((sum, t) => sum + t.realizedPnl!, 0))
    
    const winRate = closedTrades.length > 0 ? (winners.length / closedTrades.length) * 100 : 0
    const avgWin = winners.length > 0 ? totalWins / winners.length : 0
    const avgLoss = losers.length > 0 ? totalLosses / losers.length : 0
    const profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? Infinity : 0
    const riskRewardRatio = avgLoss > 0 ? avgWin / avgLoss : 0
    
    // Calculate streaks
    let currentStreak = 0
    let bestStreak = 0
    let worstStreak = 0
    let tempStreak = 0
    let lastWasWin = false
    
    closedTrades.forEach((trade, index) => {
      const isWin = trade.realizedPnl! > 0
      
      if (index === 0) {
        tempStreak = isWin ? 1 : -1
        lastWasWin = isWin
      } else {
        if (isWin === lastWasWin) {
          tempStreak = isWin ? tempStreak + 1 : tempStreak - 1
        } else {
          if (lastWasWin) {
            bestStreak = Math.max(bestStreak, tempStreak)
          } else {
            worstStreak = Math.min(worstStreak, tempStreak)
          }
          tempStreak = isWin ? 1 : -1
          lastWasWin = isWin
        }
      }
      
      if (index === closedTrades.length - 1) {
        currentStreak = tempStreak
        if (isWin) {
          bestStreak = Math.max(bestStreak, tempStreak)
        } else {
          worstStreak = Math.min(worstStreak, tempStreak)
        }
      }
    })
    
    return {
      totalTrades: closedTrades.length,
      winRate,
      avgWin,
      avgLoss,
      profitFactor,
      currentStreak,
      bestStreak,
      worstStreak,
      riskRewardRatio
    }
  }
}
