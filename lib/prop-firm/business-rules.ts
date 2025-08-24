/**
 * Prop Firm Business Rules Engine
 * Core business logic for drawdown calculation, phase progression, and compliance
 */

import { 
  PropFirmAccount, 
  AccountPhase, 
  PropFirmTrade, 
  DrawdownCalculation, 
  PhaseProgress, 
  PayoutEligibility,
  BreachType,
  PhaseType,
  AccountStatus,
  DrawdownType,
  DrawdownMode
} from '@/types/prop-firm'

export class PropFirmBusinessRules {
  
  /**
   * Calculate current drawdown status for an account
   */
  static calculateDrawdown(
    account: PropFirmAccount,
    currentPhase: AccountPhase,
    currentEquity: number,
    dailyStartBalance: number,
    highestEquitySincePhaseStart: number
  ): DrawdownCalculation {
    const result: DrawdownCalculation = {
      dailyDrawdownRemaining: 0,
      maxDrawdownRemaining: 0,
      currentEquity,
      dailyStartBalance,
      highestEquity: highestEquitySincePhaseStart,
      isBreached: false,
    }

    // Calculate daily drawdown
    if (account.dailyDrawdownAmount && account.dailyDrawdownAmount > 0) {
      const dailyLimit = account.dailyDrawdownType === 'percent' 
        ? dailyStartBalance * (account.dailyDrawdownAmount / 100)
        : account.dailyDrawdownAmount

      const dailyDD = dailyStartBalance - currentEquity
      result.dailyDrawdownRemaining = Math.max(0, dailyLimit - dailyDD)

      if (dailyDD > dailyLimit) {
        result.isBreached = true
        result.breachType = 'daily_drawdown'
        result.breachAmount = dailyDD
      }
    }

    // Calculate max drawdown
    if (account.maxDrawdownAmount && account.maxDrawdownAmount > 0) {
      let maxLimit: number
      let maxDD: number

      if (account.drawdownModeMax === 'static') {
        // Static from starting balance
        maxLimit = account.maxDrawdownType === 'percent'
          ? account.startingBalance * (account.maxDrawdownAmount / 100)
          : account.maxDrawdownAmount
        maxDD = account.startingBalance - currentEquity
      } else {
        // Trailing from highest equity
        maxLimit = account.maxDrawdownType === 'percent'
          ? highestEquitySincePhaseStart * (account.maxDrawdownAmount / 100)
          : account.maxDrawdownAmount
        maxDD = highestEquitySincePhaseStart - currentEquity
      }

      result.maxDrawdownRemaining = Math.max(0, maxLimit - maxDD)

      if (maxDD > maxLimit && !result.isBreached) {
        result.isBreached = true
        result.breachType = 'max_drawdown'
        result.breachAmount = maxDD
      }
    }

    return result
  }

  /**
   * Calculate phase progression status
   */
  static calculatePhaseProgress(
    account: PropFirmAccount,
    currentPhase: AccountPhase,
    netProfitSincePhaseStart: number
  ): PhaseProgress {
    const daysInPhase = Math.floor(
      (new Date().getTime() - currentPhase.phaseStartAt.getTime()) / (1000 * 60 * 60 * 24)
    )

    const result: PhaseProgress = {
      currentPhase,
      profitProgress: 0,
      profitTarget: currentPhase.profitTarget,
      daysInPhase,
      canProgress: false,
    }

    // Calculate profit progress
    if (currentPhase.profitTarget && currentPhase.profitTarget > 0) {
      result.profitProgress = (netProfitSincePhaseStart / currentPhase.profitTarget) * 100
      
      if (netProfitSincePhaseStart >= currentPhase.profitTarget) {
        result.canProgress = true
        
        // Determine next phase
        if (account.evaluationType === 'one_step') {
          if (currentPhase.phaseType === 'phase_1') {
            result.nextPhaseType = 'funded'
          }
        } else {
          // two_step
          if (currentPhase.phaseType === 'phase_1') {
            result.nextPhaseType = 'phase_2'
          } else if (currentPhase.phaseType === 'phase_2') {
            result.nextPhaseType = 'funded'
          }
        }
      }
    } else if (currentPhase.phaseType === 'funded') {
      // Funded accounts have no profit target
      result.profitProgress = 100
      result.canProgress = false // Already at final phase
    }

    return result
  }

  /**
   * Calculate payout eligibility for funded accounts
   */
  static calculatePayoutEligibility(
    account: PropFirmAccount,
    currentPhase: AccountPhase,
    daysSinceFunded: number,
    daysSinceLastPayout: number,
    netProfitSinceLastPayout: number,
    hasActiveBreaches: boolean
  ): PayoutEligibility {
    const result: PayoutEligibility = {
      isEligible: false,
      daysSinceFunded,
      daysSinceLastPayout,
      netProfitSinceLastPayout,
      minDaysRequired: account.minDaysToFirstPayout || 4,
      minProfitRequired: account.payoutEligibilityMinProfit,
      blockers: [],
    }

    // Only funded accounts can request payouts
    if (currentPhase.phaseType !== 'funded') {
      result.blockers.push('Account must be in funded phase')
      return result
    }

    // Check minimum days since funded
    if (daysSinceFunded < (account.minDaysToFirstPayout || 4)) {
      result.blockers.push(`Must wait ${account.minDaysToFirstPayout || 4} days since funding`)
    }

    // Check minimum days since last payout
    const payoutCycle = account.payoutCycleDays || 14
    if (daysSinceLastPayout < payoutCycle) {
      result.blockers.push(`Must wait ${payoutCycle} days since last payout`)
    }

    // Check minimum profit requirement
    if (account.payoutEligibilityMinProfit && netProfitSinceLastPayout < account.payoutEligibilityMinProfit) {
      result.blockers.push(`Must have at least $${account.payoutEligibilityMinProfit} profit since last payout`)
    }

    // Check for active breaches
    if (hasActiveBreaches) {
      result.blockers.push('Cannot request payout with active rule violations')
    }

    result.isEligible = result.blockers.length === 0

    return result
  }

  /**
   * Determine if equity calculation should include open PnL
   */
  static shouldIncludeOpenPnl(account: PropFirmAccount, calculationType: 'drawdown' | 'progression'): boolean {
    if (calculationType === 'drawdown') {
      return account.ddIncludeOpenPnl
    }
    return account.progressionIncludeOpenPnl
  }

  /**
   * Calculate equity based on account configuration
   */
  static calculateEquity(
    balance: number, 
    openPnl: number, 
    account: PropFirmAccount, 
    calculationType: 'drawdown' | 'progression'
  ): number {
    if (this.shouldIncludeOpenPnl(account, calculationType)) {
      return balance + openPnl
    }
    return balance
  }

  /**
   * Validate phase transition rules
   */
  static validatePhaseTransition(
    account: PropFirmAccount,
    fromPhase: AccountPhase,
    toPhaseType: PhaseType,
    netProfit: number
  ): { valid: boolean; reason?: string } {
    // Can't transition if account is failed
    if (account.status === 'failed') {
      return { valid: false, reason: 'Account is in failed status' }
    }

    // Validate profit target requirements
    if (fromPhase.profitTarget && netProfit < fromPhase.profitTarget) {
      return { valid: false, reason: 'Profit target not reached' }
    }

    // Validate evaluation type progression
    if (account.evaluationType === 'one_step') {
      if (fromPhase.phaseType === 'phase_1' && toPhaseType !== 'funded') {
        return { valid: false, reason: 'One-step evaluation must go directly to funded' }
      }
    } else {
      // two_step
      if (fromPhase.phaseType === 'phase_1' && toPhaseType !== 'phase_2') {
        return { valid: false, reason: 'Phase 1 must progress to Phase 2' }
      }
      if (fromPhase.phaseType === 'phase_2' && toPhaseType !== 'funded') {
        return { valid: false, reason: 'Phase 2 must progress to funded' }
      }
    }

    // Can't go backwards
    const phaseOrder = { 'phase_1': 1, 'phase_2': 2, 'funded': 3 }
    if (phaseOrder[fromPhase.phaseType] >= phaseOrder[toPhaseType]) {
      return { valid: false, reason: 'Cannot move to previous phase' }
    }

    return { valid: true }
  }

  /**
   * Calculate payout effects on account
   */
  static calculatePayoutEffects(
    account: PropFirmAccount,
    currentBalance: number,
    payoutAmount: number
  ): {
    newBalance: number
    shouldReset: boolean
    newResetBalance?: number
    resetAnchors: boolean
  } {
    const result = {
      newBalance: currentBalance,
      shouldReset: account.resetOnPayout,
      resetAnchors: false,
    }

    if (account.resetOnPayout) {
      // Reset to starting balance or configured reset balance
      result.newBalance = account.fundedResetBalance || account.startingBalance
      result.resetAnchors = true
    } else if (account.reduceBalanceByPayout) {
      // Reduce balance by payout amount
      result.newBalance = currentBalance - payoutAmount
    }

    return result
  }

  /**
   * Determine minimum profit target for phase
   */
  static getDefaultProfitTarget(
    phaseType: PhaseType, 
    startingBalance: number,
    evaluationType: string
  ): number | undefined {
    // Default profit targets as percentage of starting balance
    const defaultTargets = {
      'one_step': { 'phase_1': 0.10 }, // 10% for single phase
      'two_step': { 
        'phase_1': 0.08, // 8% for phase 1
        'phase_2': 0.05  // 5% for phase 2
      }
    }

    const targets = defaultTargets[evaluationType as keyof typeof defaultTargets]
    if (targets && phaseType in targets) {
      return startingBalance * targets[phaseType as keyof typeof targets]
    }

    return undefined
  }

  /**
   * Validate account configuration
   */
  static validateAccountConfiguration(account: Partial<PropFirmAccount>): {
    valid: boolean
    errors: string[]
  } {
    const errors: string[] = []

    // Validate drawdown configuration
    if (account.dailyDrawdownType === 'percent' && account.dailyDrawdownAmount) {
      if (account.dailyDrawdownAmount > 100) {
        errors.push('Daily drawdown percentage cannot exceed 100%')
      }
    }

    if (account.maxDrawdownType === 'percent' && account.maxDrawdownAmount) {
      if (account.maxDrawdownAmount > 100) {
        errors.push('Max drawdown percentage cannot exceed 100%')
      }
    }

    // Validate profit split
    if (account.profitSplitPercent && account.profitSplitPercent > 100) {
      errors.push('Profit split percentage cannot exceed 100%')
    }

    // Validate payout cycle
    if (account.payoutCycleDays && account.payoutCycleDays < 1) {
      errors.push('Payout cycle must be at least 1 day')
    }

    // Validate minimum days to first payout
    if (account.minDaysToFirstPayout && account.minDaysToFirstPayout < 0) {
      errors.push('Minimum days to first payout cannot be negative')
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * Calculate risk metrics for account
   */
  static calculateRiskMetrics(
    account: PropFirmAccount,
    trades: PropFirmTrade[],
    currentEquity: number
  ): {
    totalTrades: number
    winRate: number
    avgWin: number
    avgLoss: number
    profitFactor: number
    maxDrawdownEncountered: number
    currentStreak: number
    riskOfRuin: number
  } {
    const winners = trades.filter(t => (t.realizedPnl || t.pnl) > 0)
    const losers = trades.filter(t => (t.realizedPnl || t.pnl) < 0)
    
    const avgWin = winners.length > 0 
      ? winners.reduce((sum, t) => sum + (t.realizedPnl || t.pnl), 0) / winners.length 
      : 0
    
    const avgLoss = losers.length > 0 
      ? Math.abs(losers.reduce((sum, t) => sum + (t.realizedPnl || t.pnl), 0) / losers.length)
      : 0

    const grossProfit = winners.reduce((sum, t) => sum + (t.realizedPnl || t.pnl), 0)
    const grossLoss = Math.abs(losers.reduce((sum, t) => sum + (t.realizedPnl || t.pnl), 0))
    
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : 0

    // Calculate current streak
    let currentStreak = 0
    if (trades.length > 0) {
      const lastTrade = trades[trades.length - 1]
      const isWin = (lastTrade.realizedPnl || lastTrade.pnl) > 0
      
      for (let i = trades.length - 1; i >= 0; i--) {
        const tradeIsWin = (trades[i].realizedPnl || trades[i].pnl) > 0
        if (tradeIsWin === isWin) {
          currentStreak++
        } else {
          break
        }
      }
      
      if (!isWin) currentStreak = -currentStreak
    }

    // Simple risk of ruin calculation (Kelly criterion based)
    const winRate = trades.length > 0 ? winners.length / trades.length : 0
    const b = avgLoss > 0 ? avgWin / avgLoss : 0
    const q = 1 - winRate
    const riskOfRuin = winRate > 0 && b > 0 ? Math.pow(q / (winRate * b), 1) : 1

    return {
      totalTrades: trades.length,
      winRate: winRate * 100,
      avgWin,
      avgLoss,
      profitFactor,
      maxDrawdownEncountered: account.startingBalance - Math.min(...[account.startingBalance, currentEquity]),
      currentStreak,
      riskOfRuin: Math.min(riskOfRuin, 1) * 100
    }
  }
}


