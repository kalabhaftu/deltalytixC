/**
 * Comprehensive Prop Firm Trading Engine
 * Handles all aspects of prop firm account management, drawdown calculations,
 * phase progressions, and payout eligibility
 *
 * Account Structure:
 * - Master Account ID (UUID) - Internal system identifier
 * - Display Name - User-friendly account name (e.g., "My Maven")
 * - Phase Account Numbers - User-provided numbers for each phase
 * - Active Phase - Current phase where trades are added
 */

import { Decimal } from '@prisma/client/runtime/library'

// Types
export interface PropFirmAccount {
  // Master account details
  id: string // Master ID (internal)
  userId: string
  name: string // Display name (e.g., "My Maven")
  propfirm: string // Firm type
  accountSize: string // Account size as string in DB
  startingBalance: number // Numeric version for calculations
  currency: string
  leverage: number
  evaluationType: 'one_step' | 'two_step'
  status: 'active' | 'failed' | 'passed' | 'funded' | null

  // Phase account numbers (user-provided)
  phase1AccountId?: string | null
  phase2AccountId?: string | null
  fundedAccountId?: string | null

  // Status and dates
  createdAt: Date
  purchaseDate?: Date | null
  challengeStartDate?: Date | null
  challengeEndDate?: Date | null
  fundedDate?: Date | null

  // Phase-specific configurations
  phase1ProfitTarget: number
  phase2ProfitTarget: number
  phase1MaxDrawdown: number
  phase2MaxDrawdown: number
  fundedMaxDrawdown: number
  phase1DailyDrawdown: number
  phase2DailyDrawdown: number
  fundedDailyDrawdown: number

  // Trading rules
  minTradingDaysPhase1: number
  minTradingDaysPhase2: number
  maxTradingDaysPhase1?: number | null
  maxTradingDaysPhase2?: number | null
  consistencyRule: number
  trailingDrawdownEnabled: boolean

  // Payout configuration (for funded accounts)
  initialProfitSplit: number
  maxProfitSplit: number
  profitSplitIncrementPerPayout: number
  minPayoutAmount: number
  maxPayoutAmount?: number | null
  payoutFrequencyDays: number
  minDaysBeforeFirstPayout: number

  // Additional Prisma fields
  phases?: any[]
}

export interface PropFirmPhase {
  id: string
  accountId: string
  phaseType: 'phase_1' | 'phase_2' | 'funded'
  phaseStatus: 'active' | 'passed' | 'failed' | 'pending'
  accountNumber: string

  // Phase configuration
  startingBalance: number
  currentBalance: number
  currentEquity: number
  highWaterMark: number

  // Targets and limits
  profitTarget: number | null
  maxDrawdownAmount: number
  dailyDrawdownAmount: number
  minTradingDays: number
  maxTradingDays?: number | null

  // Progress tracking
  startedAt: Date
  completedAt?: Date | null
  failedAt?: Date | null
  daysTraded: number

  // Statistics
  totalTrades: number
  winningTrades: number
  totalCommission: number

  // Additional fields from Prisma model
  phaseStartAt: Date
  phaseEndAt?: Date | null
  netProfitSincePhaseStart: number
  highestEquitySincePhaseStart: number
  createdAt: Date
  updatedAt: Date
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
  tags: string[]
  // Legacy fields for compatibility
  accountNumber?: string
  instrument?: string
  closePrice?: string
  entryDate?: string
  closeDate?: string
  pnl?: number
  userId?: string
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
   * Get the current active phase for an account
   * Trades should be added to this phase
   */
  static getCurrentActivePhase(account: PropFirmAccount, phases: PropFirmPhase[]): PropFirmPhase | null {
    return phases.find(phase => phase.phaseStatus === 'active') || null
  }

  /**
   * Get the next phase type based on evaluation type
   */
  static getNextPhaseType(currentPhaseType: 'phase_1' | 'phase_2' | 'funded', evaluationType: 'one_step' | 'two_step'): 'phase_1' | 'phase_2' | 'funded' | null {
    if (evaluationType === 'one_step') {
      return currentPhaseType === 'phase_1' ? 'funded' : null
    } else {
      // two_step
      switch (currentPhaseType) {
        case 'phase_1': return 'phase_2'
        case 'phase_2': return 'funded'
        default: return null
      }
    }
  }

  /**
   * Check if account has valid account number for current phase
   */
  static hasValidAccountNumberForCurrentPhase(account: PropFirmAccount, currentPhase: PropFirmPhase): boolean {
    switch (currentPhase.phaseType) {
      case 'phase_1':
        return !!account.phase1AccountId
      case 'phase_2':
        return !!account.phase2AccountId
      case 'funded':
        return !!account.fundedAccountId
      default:
        return false
    }
  }

  /**
   * Create a new phase for the account
   */
  static createNewPhase(
    account: PropFirmAccount,
    phaseType: 'phase_1' | 'phase_2' | 'funded'
  ): Omit<PropFirmPhase, 'id' | 'createdAt' | 'updatedAt' | 'phaseStartAt'> {
    const baseBalance = Number(account.accountSize)

    // Get phase-specific configuration
    let profitTarget: number
    let maxDrawdownAmount: number
    let dailyDrawdownAmount: number
    let minTradingDays: number
    let maxTradingDays: number | undefined

    switch (phaseType) {
      case 'phase_1':
        profitTarget = (baseBalance * account.phase1ProfitTarget) / 100
        maxDrawdownAmount = (baseBalance * account.phase1MaxDrawdown) / 100
        dailyDrawdownAmount = (baseBalance * account.phase1DailyDrawdown) / 100
        minTradingDays = account.minTradingDaysPhase1
        maxTradingDays = account.maxTradingDaysPhase1 || undefined
        break
      case 'phase_2':
        profitTarget = (baseBalance * account.phase2ProfitTarget) / 100
        maxDrawdownAmount = (baseBalance * account.phase2MaxDrawdown) / 100
        dailyDrawdownAmount = (baseBalance * account.phase2DailyDrawdown) / 100
        minTradingDays = account.minTradingDaysPhase2
        maxTradingDays = account.maxTradingDaysPhase2 || undefined
        break
      case 'funded':
        // Funded accounts don't have profit targets, but maintain drawdown limits
        profitTarget = 0
        maxDrawdownAmount = (baseBalance * account.fundedMaxDrawdown) / 100
        dailyDrawdownAmount = (baseBalance * account.fundedDailyDrawdown) / 100
        minTradingDays = 0
        maxTradingDays = undefined
        break
    }

    return {
      accountId: account.id,
      phaseType,
      phaseStatus: 'active',
      accountNumber: this.getAccountNumberForPhase(account, phaseType),
      startingBalance: baseBalance,
      currentBalance: baseBalance,
      currentEquity: baseBalance,
      highWaterMark: baseBalance,
      profitTarget,
      maxDrawdownAmount,
      dailyDrawdownAmount,
      minTradingDays,
      maxTradingDays,
      startedAt: new Date(),
      daysTraded: 0,
      totalTrades: 0,
      winningTrades: 0,
      totalCommission: 0,
      netProfitSincePhaseStart: 0,
      highestEquitySincePhaseStart: baseBalance
    }
  }

  /**
   * Get account number for a specific phase
   */
  static getAccountNumberForPhase(account: PropFirmAccount, phaseType: 'phase_1' | 'phase_2' | 'funded'): string {
    switch (phaseType) {
      case 'phase_1':
        return account.phase1AccountId || 'Not Set'
      case 'phase_2':
        return account.phase2AccountId || 'Not Set'
      case 'funded':
        return account.fundedAccountId || 'Not Set'
      default:
        return 'Unknown'
    }
  }

  /**
   * Check if current phase should advance to next phase
   */
  static shouldAdvancePhase(account: PropFirmAccount, phase: PropFirmPhase, trades: PropFirmTrade[]): boolean {
    // Funded accounts don't advance
    if (phase.phaseType === 'funded') {
      return false
    }

    // Check if profit target is met
    const profitProgress = phase.currentEquity - phase.startingBalance
    const profitTargetMet = phase.profitTarget ? profitProgress >= phase.profitTarget : false

    if (!profitTargetMet) {
      return false
    }

    // Check minimum trading days
    const tradingDays = this.calculateTradingDays(trades)
    const minDaysMet = tradingDays >= phase.minTradingDays

    if (!minDaysMet) {
      return false
    }

    // Check consistency rule
    const consistencyMet = this.checkConsistencyRule(trades, account.consistencyRule)

    return consistencyMet
  }

  /**
   * Check consistency rule (max daily profit ≤ X% of total profit)
   */
  static checkConsistencyRule(trades: PropFirmTrade[], maxPercent: number): boolean {
    if (trades.length === 0) return true

    // Group trades by day and calculate daily profits
    const dailyProfits = new Map<string, number>()

    trades.forEach(trade => {
      if (trade.realizedPnl && trade.exitTime) {
        const date = trade.exitTime.toISOString().split('T')[0]
        const current = dailyProfits.get(date) || 0
        dailyProfits.set(date, current + trade.realizedPnl)
      }
    })

    const totalProfit = Array.from(dailyProfits.values()).reduce((sum, profit) => sum + profit, 0)
    if (totalProfit <= 0) return true

    const maxDailyProfit = Math.max(...Array.from(dailyProfits.values()).filter(p => p > 0))
    const percentageOfTotal = (maxDailyProfit / totalProfit) * 100

    return percentageOfTotal <= maxPercent
  }


  /**
   * Calculate trading days from trades array
   */
  static calculateTradingDays(trades: PropFirmTrade[]): number {
    const tradingDays = new Set<string>()

    trades.forEach(trade => {
      if (trade.entryTime) {
        const date = trade.entryTime.toISOString().split('T')[0]
        tradingDays.add(date)
      }
    })

    return tradingDays.size
  }

  /**
   * Get phase display information
   */
  static getPhaseDisplayInfo(phase: PropFirmPhase): {
    label: string
    color: string
    status: string
  } {
    const phaseLabels = {
      phase_1: 'Phase 1',
      phase_2: 'Phase 2',
      funded: 'Funded'
    }

    const statusColors = {
      active: 'bg-green-500',
      passed: 'bg-blue-500',
      failed: 'bg-red-500',
      pending: 'bg-yellow-500'
    }

    return {
      label: phaseLabels[phase.phaseType] || phase.phaseType,
      color: statusColors[phase.phaseStatus] || 'bg-gray-500',
      status: phase.phaseStatus
    }
  }

  /**
   * Process a trade and update phase accordingly
   */
  static async processTrade(
    account: PropFirmAccount,
    phase: PropFirmPhase,
    tradeData: {
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
      comment?: string
      strategy?: string
    }
  ): Promise<{
    trade: PropFirmTrade
    updatedPhase: PropFirmPhase
    shouldAdvance: boolean
    breachDetected: boolean
    breachType?: 'daily_drawdown' | 'max_drawdown'
  }> {
    // Calculate P&L
    const isClosedTrade = tradeData.exitTime && tradeData.exitPrice
    let realizedPnl = 0

    if (isClosedTrade) {
      const priceDiff = tradeData.side === 'long'
        ? tradeData.exitPrice! - tradeData.entryPrice
        : tradeData.entryPrice - tradeData.exitPrice!

      realizedPnl = priceDiff * tradeData.quantity
      realizedPnl -= (tradeData.commission + tradeData.swap + tradeData.fees)
    }

    // Create trade record
    const trade: PropFirmTrade = {
      id: `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      phaseId: phase.id,
      accountId: account.id,
      symbol: tradeData.symbol,
      side: tradeData.side,
      quantity: tradeData.quantity,
      entryPrice: tradeData.entryPrice,
      exitPrice: tradeData.exitPrice,
      entryTime: tradeData.entryTime,
      exitTime: tradeData.exitTime,
      commission: tradeData.commission,
      swap: tradeData.swap,
      fees: tradeData.fees,
      realizedPnl: isClosedTrade ? realizedPnl : undefined,
      equityAtOpen: phase.currentEquity,
      equityAtClose: isClosedTrade ? phase.currentEquity + realizedPnl : undefined,
      comment: tradeData.comment,
      strategy: tradeData.strategy,
      tags: [],
      // Legacy fields
      accountNumber: phase.accountNumber,
      instrument: tradeData.symbol,
      closePrice: tradeData.exitPrice?.toString(),
      entryDate: tradeData.entryTime.toISOString().split('T')[0],
      closeDate: tradeData.exitTime?.toISOString().split('T')[0] || '',
      pnl: realizedPnl,
      userId: account.userId
    }

    // Update phase statistics
    const updatedPhase: PropFirmPhase = {
      ...phase,
      currentEquity: phase.currentEquity + realizedPnl,
      currentBalance: phase.currentBalance + realizedPnl,
      totalTrades: phase.totalTrades + 1,
      totalCommission: phase.totalCommission + tradeData.commission + tradeData.fees
    }

    // Update statistics if trade is closed
    if (isClosedTrade) {
      if (realizedPnl > 0) {
        updatedPhase.winningTrades++
      }

      // Update high water mark
      if (updatedPhase.currentEquity > updatedPhase.highWaterMark) {
        updatedPhase.highWaterMark = updatedPhase.currentEquity
      }
    }

    // Check for advancement
    const shouldAdvance = this.shouldAdvancePhase(account, updatedPhase, [trade])

    // Check for breaches
    const drawdown = this.calculateDrawdown(
      updatedPhase,
      updatedPhase.currentEquity,
      phase.startingBalance, // Daily start balance
      account.trailingDrawdownEnabled
    )

    const breachDetected = drawdown.isBreached
    const breachType = drawdown.breachType

    return {
      trade,
      updatedPhase,
      shouldAdvance,
      breachDetected,
      breachType
    }
  }

  /**
   * Handle phase transition
   */
  static async transitionPhase(
    account: PropFirmAccount,
    currentPhase: PropFirmPhase,
    nextPhaseType: 'phase_1' | 'phase_2' | 'funded'
  ): Promise<PropFirmPhase> {
    // Mark current phase as passed
    currentPhase.phaseStatus = 'passed'
    currentPhase.phaseEndAt = new Date()

    // Create new phase
    const newPhase = this.createNewPhase(account, nextPhaseType)

    return {
      ...newPhase,
      id: `phase_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      updatedAt: new Date()
    } as PropFirmPhase
  }

  /**
   * Validate account for trade addition
   */
  static validateAccountForTrade(account: PropFirmAccount, currentPhase: PropFirmPhase): {
    isValid: boolean
    error?: string
  } {
    if (!currentPhase) {
      return {
        isValid: false,
        error: 'No active phase found. Account may need to be created or phase may have failed.'
      }
    }

    if (!this.hasValidAccountNumberForCurrentPhase(account, currentPhase)) {
      return {
        isValid: false,
        error: `Account number not set for ${currentPhase.phaseType}. Please set the account number before adding trades.`
      }
    }

    if (currentPhase.phaseStatus !== 'active') {
      return {
        isValid: false,
        error: `Current phase ${currentPhase.phaseType} is not active. Status: ${currentPhase.phaseStatus}`
      }
    }

    return { isValid: true }
  }
  
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
    const profitProgressPercent = phase.profitTarget ? (profitProgress / phase.profitTarget!) * 100 : 0
    
    // Calculate trading days
    const tradingDays = this.calculateTradingDays(trades)
    const minTradingDaysMet = tradingDays >= phase.minTradingDays
    
    // Calculate consistency (largest daily profit should not exceed X% of total profit)
    const consistencyMet = this.checkConsistency(trades, currentProfit, account.consistencyRule)
    
    // Check if ready to advance
    const profitTargetMet = phase.profitTarget ? profitProgress >= phase.profitTarget : false
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
      const activePhase = phases.find(p => p.accountId === account.id && p.phaseStatus === 'active')
      return total + (activePhase?.currentEquity || 0)
    }, 0)
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
