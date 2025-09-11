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
    // Ensure all inputs are valid numbers with proper defaults
    const safeCurrentEquity = this.ensureValidNumber(currentEquity, account.startingBalance)
    const safeDailyStartBalance = this.ensureValidNumber(dailyStartBalance, account.startingBalance)
    const safeHighestEquity = this.ensureValidNumber(highestEquitySincePhaseStart, account.startingBalance)

    const result: DrawdownCalculation = {
      dailyDrawdownRemaining: 0,
      maxDrawdownRemaining: 0,
      currentEquity: safeCurrentEquity,
      dailyStartBalance: safeDailyStartBalance,
      highestEquity: safeHighestEquity,
      isBreached: false,
    }

    // Calculate daily drawdown
    if (account.dailyDrawdownAmount && account.dailyDrawdownAmount > 0) {
      const dailyLimit = account.dailyDrawdownType === 'percent' 
        ? safeDailyStartBalance * (account.dailyDrawdownAmount / 100)
        : account.dailyDrawdownAmount

      const dailyDD = Math.max(0, safeDailyStartBalance - safeCurrentEquity)
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
        maxDD = Math.max(0, account.startingBalance - safeCurrentEquity)
      } else {
        // Trailing from highest equity
        maxLimit = account.maxDrawdownType === 'percent'
          ? safeHighestEquity * (account.maxDrawdownAmount / 100)
          : account.maxDrawdownAmount
        maxDD = Math.max(0, safeHighestEquity - safeCurrentEquity)
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
    const safeNetProfit = this.ensureValidNumber(netProfitSincePhaseStart, 0)
    
    const daysInPhase = Math.max(0, Math.floor(
      (new Date().getTime() - currentPhase.phaseStartAt.getTime()) / (1000 * 60 * 60 * 24)
    ))

    const result: PhaseProgress = {
      currentPhase,
      profitProgress: 0,
      profitTarget: currentPhase.profitTarget || 0,
      daysInPhase,
      canProgress: false,
    }

    // Calculate profit progress
    if (currentPhase.profitTarget && currentPhase.profitTarget > 0) {
      result.profitProgress = Math.min(100, Math.max(0, (safeNetProfit / currentPhase.profitTarget) * 100))
      
      if (safeNetProfit >= currentPhase.profitTarget) {
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
    const safeNetProfit = this.ensureValidNumber(netProfitSinceLastPayout, 0)
    const safeDaysSinceFunded = Math.max(0, daysSinceFunded)
    const safeDaysSinceLastPayout = Math.max(0, daysSinceLastPayout)
    
    const result: PayoutEligibility = {
      isEligible: false,
      daysSinceFunded: safeDaysSinceFunded,
      daysSinceLastPayout: safeDaysSinceLastPayout,
      netProfitSinceLastPayout: safeNetProfit,
      minDaysRequired: 30, // Default minimum funded days
      blockers: [],
      maxPayoutAmount: 0,
      profitSplitAmount: 0,
      nextEligibleDate: undefined,
    }

    // Check for active breaches
    if (hasActiveBreaches) {
      result.blockers.push('Active rule violations prevent payout')
      return result
    }

    // Check minimum days since funded
    const minDaysToFirstPayout = account.minDaysToFirstPayout || 4
    if (safeDaysSinceFunded < minDaysToFirstPayout) {
      result.blockers.push(`Must wait ${minDaysToFirstPayout - safeDaysSinceFunded} more days since funded`)
      return result
    }

    // Check payout cycle
    const payoutCycleDays = account.payoutCycleDays || 14
    if (safeDaysSinceLastPayout < payoutCycleDays) {
      const nextEligible = new Date()
      nextEligible.setDate(nextEligible.getDate() + (payoutCycleDays - safeDaysSinceLastPayout))
      result.nextEligibleDate = nextEligible
      result.blockers.push(`Must wait ${payoutCycleDays - safeDaysSinceLastPayout} more days since last payout`)
      return result
    }

    // Check minimum profit requirement
    const minProfit = account.payoutEligibilityMinProfit || 0
    if (safeNetProfit < minProfit) {
      result.blockers.push(`Minimum profit requirement not met (${minProfit} needed, ${safeNetProfit} available)`)
      return result
    }

    // Calculate payout amounts
    const profitSplitPercent = Math.min(100, Math.max(0, account.profitSplitPercent || 80))
    result.profitSplitAmount = safeNetProfit * (profitSplitPercent / 100)
    result.maxPayoutAmount = result.profitSplitAmount

    // All checks passed
    result.isEligible = true
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
   * Validate phase transition
   */
  static validatePhaseTransition(
    account: PropFirmAccount,
    fromPhase: AccountPhase,
    toPhaseType: PhaseType,
    netProfit: number
  ): { valid: boolean; reason?: string } {
    const safeNetProfit = this.ensureValidNumber(netProfit, 0)

    // Check if transition is allowed
    if (fromPhase.phaseType === 'funded' && toPhaseType !== 'funded') {
      return { valid: false, reason: 'Cannot transition from funded phase' }
    }

    // Check profit target for non-funded phases
    if (toPhaseType !== 'funded' && fromPhase.profitTarget && safeNetProfit < fromPhase.profitTarget) {
      return { valid: false, reason: 'Profit target not met' }
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
    const safeCurrentBalance = this.ensureValidNumber(currentBalance, account.startingBalance)
    const safePayoutAmount = this.ensureValidNumber(payoutAmount, 0)
    
    const result = {
      newBalance: safeCurrentBalance,
      shouldReset: account.resetOnPayout || false,
      resetAnchors: false,
    }

    if (account.resetOnPayout) {
      // Reset to starting balance or configured reset balance
      result.newBalance = this.ensureValidNumber(account.fundedResetBalance || account.startingBalance, account.startingBalance)
      result.resetAnchors = true
    } else if (account.reduceBalanceByPayout) {
      // Reduce balance by payout amount
      result.newBalance = Math.max(0, safeCurrentBalance - safePayoutAmount)
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
    const safeStartingBalance = this.ensureValidNumber(startingBalance, 0)
    
    if (phaseType === 'funded') {
      return undefined // Funded accounts have no profit target
    }

    // Default profit targets based on common prop firm standards
    if (evaluationType === 'one_step') {
      return safeStartingBalance * 0.08 // 8% for one-step
    } else {
      // two_step
      if (phaseType === 'phase_1') {
        return safeStartingBalance * 0.08 // 8% for Phase 1
      } else if (phaseType === 'phase_2') {
        return safeStartingBalance * 0.05 // 5% for Phase 2
      }
    }

    return safeStartingBalance * 0.08 // Default fallback
  }

  /**
   * Validate account configuration
   */
  static validateAccountConfiguration(account: Partial<PropFirmAccount>): {
    valid: boolean
    errors: string[]
  } {
    const errors: string[] = []

    // Check required fields
    if (!account.number || account.number.trim() === '') {
      errors.push('Account number is required')
    }

    if (!account.startingBalance || account.startingBalance <= 0) {
      errors.push('Starting balance must be greater than 0')
    }

    if (!account.propfirm || account.propfirm.trim() === '') {
      errors.push('Prop firm name is required')
    }

    // Check drawdown configuration
    if (account.dailyDrawdownAmount && account.dailyDrawdownAmount <= 0) {
      errors.push('Daily drawdown amount must be greater than 0')
    }

    if (account.maxDrawdownAmount && account.maxDrawdownAmount <= 0) {
      errors.push('Maximum drawdown amount must be greater than 0')
    }

    // Check percentage limits
    if (account.dailyDrawdownType === 'percent' && account.dailyDrawdownAmount && account.dailyDrawdownAmount > 100) {
      errors.push('Daily drawdown percentage cannot exceed 100%')
    }

    if (account.maxDrawdownType === 'percent' && account.maxDrawdownAmount && account.maxDrawdownAmount > 100) {
      errors.push('Maximum drawdown percentage cannot exceed 100%')
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
    const safeCurrentEquity = this.ensureValidNumber(currentEquity, account.startingBalance)
    
    if (!trades || trades.length === 0) {
      return {
        totalTrades: 0,
        winRate: 0,
        avgWin: 0,
        avgLoss: 0,
        profitFactor: 0,
        maxDrawdownEncountered: 0,
        currentStreak: 0,
        riskOfRuin: 1
      }
    }

    // Calculate trade PnL safely
    const tradePnLs = trades.map(trade => {
      const pnl = trade.realizedPnl || trade.pnl || 0
      return this.ensureValidNumber(pnl, 0)
    })

    const winners = tradePnLs.filter(pnl => pnl > 0)
    const losers = tradePnLs.filter(pnl => pnl < 0)
    
    const avgWin = winners.length > 0 
      ? winners.reduce((sum, pnl) => sum + pnl, 0) / winners.length 
      : 0
    
    const avgLoss = losers.length > 0 
      ? Math.abs(losers.reduce((sum, pnl) => sum + pnl, 0) / losers.length)
      : 0

    const grossProfit = winners.reduce((sum, pnl) => sum + pnl, 0)
    const grossLoss = Math.abs(losers.reduce((sum, pnl) => sum + pnl, 0))
    
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : 0

    // Calculate current streak
    let currentStreak = 0
    if (tradePnLs.length > 0) {
      const lastTradePnL = tradePnLs[tradePnLs.length - 1]
      const isWin = lastTradePnL > 0
      
      for (let i = tradePnLs.length - 1; i >= 0; i--) {
        const tradeIsWin = tradePnLs[i] > 0
        if (tradeIsWin === isWin) {
          currentStreak++
        } else {
          break
        }
      }
      
      if (!isWin) currentStreak = -currentStreak
    }

    // Calculate max drawdown encountered
    let runningEquity = account.startingBalance
    let peakEquity = account.startingBalance
    let maxDrawdownEncountered = 0

    tradePnLs.forEach(pnl => {
      runningEquity += pnl
      peakEquity = Math.max(peakEquity, runningEquity)
      const currentDrawdown = peakEquity - runningEquity
      maxDrawdownEncountered = Math.max(maxDrawdownEncountered, currentDrawdown)
    })

    // Simple risk of ruin calculation (Kelly criterion based)
    const winRate = tradePnLs.length > 0 ? winners.length / tradePnLs.length : 0
    const b = avgLoss > 0 ? avgWin / avgLoss : 0
    const q = 1 - winRate
    const riskOfRuin = winRate > 0 && b > 0 ? Math.pow(q / (winRate * b), 1) : 1

    return {
      totalTrades: tradePnLs.length,
      winRate: winRate * 100,
      avgWin,
      avgLoss,
      profitFactor,
      maxDrawdownEncountered,
      currentStreak,
      riskOfRuin
    }
  }

  /**
   * Ensure a number is valid (not NaN, null, or undefined)
   */
  private static ensureValidNumber(value: number | null | undefined, defaultValue: number): number {
    if (value === null || value === undefined || isNaN(value) || !isFinite(value)) {
      return defaultValue
    }
    return value
  }
}


