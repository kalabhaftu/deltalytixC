/**
 * Phase Evaluation Engine for New MasterAccount/PhaseAccount System
 * Implements failure-first priority and proper trailing drawdown logic
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export interface DrawdownCalculation {
  currentEquity: number
  dailyStartBalance: number
  highWaterMark: number
  dailyDrawdownUsed: number
  dailyDrawdownLimit: number
  dailyDrawdownRemaining: number
  dailyDrawdownPercent: number
  maxDrawdownUsed: number
  maxDrawdownLimit: number
  maxDrawdownRemaining: number
  maxDrawdownPercent: number
  isBreached: boolean
  breachType?: 'daily_drawdown' | 'max_drawdown'
  breachAmount?: number
  breachTime?: Date
}

export interface PhaseProgress {
  currentPnL: number
  profitTargetAmount: number
  profitTargetRemaining: number
  profitTargetPercent: number
  tradingDaysCompleted: number
  minTradingDaysRequired: number
  isEligibleForAdvancement: boolean
  canPassPhase: boolean
  daysRemaining?: number
}

export interface PhaseEvaluationResult {
  drawdown: DrawdownCalculation
  progress: PhaseProgress
  isFailed: boolean
  isPassed: boolean
  canAdvance: boolean
  nextAction: 'continue' | 'fail' | 'advance'
}

export class PhaseEvaluationEngine {
  
  /**
   * Enhanced logging for development mode
   */
  private static log(message: string, data?: any) {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[EVALUATION_ENGINE] ${message}`, data ? JSON.stringify(data, null, 2) : '')
    }
  }

  private static logError(message: string, error: any) {
    if (process.env.NODE_ENV === 'development') {
      console.error(`[EVALUATION_ENGINE] ERROR: ${message}`, error)
    } else {
      // Production: minimal logging
      console.error(`Evaluation error: ${message}`)
    }
  }
  
  /**
   * CRITICAL: Evaluate phase status with FAILURE-FIRST PRIORITY
   * Always check for failure conditions before checking if profit target is met
   * ENHANCED: Detailed logging in development mode
   */
  static async evaluatePhase(
    masterAccountId: string,
    phaseAccountId: string
  ): Promise<PhaseEvaluationResult> {
    
    this.log(`Starting evaluation for masterAccountId: ${masterAccountId}, phaseAccountId: ${phaseAccountId}`)
    
    // Get complete phase data
    const phaseAccount = await prisma.phaseAccount.findFirst({
      where: { id: phaseAccountId },
      include: {
        masterAccount: {
          include: {
            user: true
          }
        },
        trades: {
          where: { phaseAccountId },
          orderBy: { exitTime: 'asc' }
        },
        dailyAnchors: {
          orderBy: { date: 'desc' },
          take: 1
        }
      }
    })

    if (!phaseAccount) {
      this.logError(`Phase account not found: ${phaseAccountId}`, null)
      throw new Error('Phase account not found')
    }

    this.log(`Phase account found`, {
      phaseNumber: phaseAccount.phaseNumber,
      status: phaseAccount.status,
      tradesCount: phaseAccount.trades.length,
      accountSize: phaseAccount.masterAccount.accountSize
    })

    const masterAccount = phaseAccount.masterAccount
    const trades = phaseAccount.trades
    const timezone = masterAccount.user.timezone || 'UTC'

    // Calculate current metrics
    const currentPnL = trades.reduce((sum, trade) => sum + (trade.pnl || 0), 0)
    const currentEquity = masterAccount.accountSize + currentPnL

    this.log(`Current metrics calculated`, {
      currentPnL,
      currentEquity,
      startingBalance: masterAccount.accountSize
    })

    // Calculate high-water mark (highest equity since phase start)
    let highWaterMark = masterAccount.accountSize
    let runningBalance = masterAccount.accountSize
    
    for (const trade of trades) {
      runningBalance += trade.pnl || 0
      highWaterMark = Math.max(highWaterMark, runningBalance)
    }

    this.log(`High-water mark calculated: ${highWaterMark}`)

    // Get daily start balance from daily anchor system
    const dailyStartBalance = await this.getDailyStartBalance(
      phaseAccountId,
      timezone,
      masterAccount.accountSize
    )

    this.log(`Daily start balance: ${dailyStartBalance}`)

    // STEP 1: Calculate drawdown (FAILURE CHECK FIRST)
    const drawdown = this.calculateDrawdown(
      phaseAccount,
      currentEquity,
      dailyStartBalance,
      highWaterMark
    )

    this.log(`Drawdown calculation completed`, {
      isBreached: drawdown.isBreached,
      breachType: drawdown.breachType,
      dailyDrawdownUsed: drawdown.dailyDrawdownUsed,
      dailyDrawdownLimit: drawdown.dailyDrawdownLimit,
      maxDrawdownUsed: drawdown.maxDrawdownUsed,
      maxDrawdownLimit: drawdown.maxDrawdownLimit
    })

    // STEP 2: Calculate progress
    const progress = this.calculateProgress(
      phaseAccount,
      currentPnL,
      trades
    )

    this.log(`Progress calculation completed`, {
      canPassPhase: progress.canPassPhase,
      isEligibleForAdvancement: progress.isEligibleForAdvancement,
      profitTargetPercent: progress.profitTargetPercent,
      tradingDaysCompleted: progress.tradingDaysCompleted,
      minTradingDaysRequired: progress.minTradingDaysRequired
    })

    // STEP 3: FAILURE-FIRST EVALUATION
    // If account is breached, it CANNOT pass regardless of profit target
    if (drawdown.isBreached) {
      this.log(`FAILURE-FIRST: Account breached - ${drawdown.breachType}`, {
        breachAmount: drawdown.breachAmount,
        profitTargetMet: progress.profitTargetPercent >= 100
      })
      
      return {
        drawdown,
        progress,
        isFailed: true,
        isPassed: false,
        canAdvance: false,
        nextAction: 'fail'
      }
    }

    // STEP 4: Check if profit target is met AND other requirements
    const canAdvance = progress.canPassPhase && progress.isEligibleForAdvancement
    
    this.log(`Final evaluation result`, {
      canAdvance,
      nextAction: canAdvance ? 'advance' : 'continue',
      isFailed: false,
      isPassed: canAdvance
    })
    
    return {
      drawdown,
      progress,
      isFailed: false,
      isPassed: canAdvance,
      canAdvance,
      nextAction: canAdvance ? 'advance' : 'continue'
    }
  }

  /**
   * Calculate comprehensive drawdown status with trailing/static logic
   */
  private static calculateDrawdown(
    phaseAccount: any,
    currentEquity: number,
    dailyStartBalance: number,
    highWaterMark: number
  ): DrawdownCalculation {
    
    const accountSize = phaseAccount.masterAccount.accountSize

    // Daily drawdown calculation (always from daily start balance)
    const dailyDrawdownLimit = accountSize * (phaseAccount.dailyDrawdownPercent / 100)
    const dailyDrawdownUsed = Math.max(0, dailyStartBalance - currentEquity)
    const dailyDrawdownRemaining = Math.max(0, dailyDrawdownLimit - dailyDrawdownUsed)
    const dailyDrawdownPercent = dailyStartBalance > 0 ? (dailyDrawdownUsed / dailyStartBalance) * 100 : 0

    // Max drawdown calculation (static vs trailing)
    let maxDrawdownBase: number
    let maxDrawdownLimit: number
    
    if (phaseAccount.maxDrawdownType === 'trailing') {
      // Trailing: Use high-water mark as base
      maxDrawdownBase = highWaterMark
      maxDrawdownLimit = highWaterMark * (phaseAccount.maxDrawdownPercent / 100)
    } else {
      // Static: Use starting balance as base
      maxDrawdownBase = accountSize
      maxDrawdownLimit = accountSize * (phaseAccount.maxDrawdownPercent / 100)
    }

    const maxDrawdownUsed = Math.max(0, maxDrawdownBase - currentEquity)
    const maxDrawdownRemaining = Math.max(0, maxDrawdownLimit - maxDrawdownUsed)
    const maxDrawdownPercent = maxDrawdownBase > 0 ? (maxDrawdownUsed / maxDrawdownBase) * 100 : 0

    // FAILURE-FIRST PRIORITY: Check breaches
    let isBreached = false
    let breachType: 'daily_drawdown' | 'max_drawdown' | undefined
    let breachAmount: number | undefined

    // Check daily drawdown FIRST
    if (dailyDrawdownUsed > dailyDrawdownLimit) {
      isBreached = true
      breachType = 'daily_drawdown'
      breachAmount = dailyDrawdownUsed - dailyDrawdownLimit
    }
    // Only check max drawdown if daily drawdown hasn't been breached
    else if (maxDrawdownUsed > maxDrawdownLimit) {
      isBreached = true
      breachType = 'max_drawdown'
      breachAmount = maxDrawdownUsed - maxDrawdownLimit
    }

    return {
      currentEquity,
      dailyStartBalance,
      highWaterMark,
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
   * Calculate phase progression status
   */
  private static calculateProgress(
    phaseAccount: any,
    currentPnL: number,
    trades: any[]
  ): PhaseProgress {
    
    const accountSize = phaseAccount.masterAccount.accountSize
    const profitTargetAmount = accountSize * (phaseAccount.profitTargetPercent / 100)
    const profitTargetRemaining = Math.max(0, profitTargetAmount - currentPnL)
    const profitTargetPercent = profitTargetAmount > 0 ? (currentPnL / profitTargetAmount) * 100 : 100

    // Calculate trading days (unique dates with trades)
    const tradingDates = new Set(
      trades.map(trade => {
        const date = trade.exitTime || trade.createdAt
        return new Date(date).toDateString()
      })
    )
    const tradingDaysCompleted = tradingDates.size
    const minTradingDaysRequired = phaseAccount.minTradingDays || 0

    // Check if profit target is met
    const isProfitTargetMet = phaseAccount.profitTargetPercent === 0 || currentPnL >= profitTargetAmount
    
    // Check if minimum trading days are met
    const areMinTradingDaysMet = tradingDaysCompleted >= minTradingDaysRequired

    // Check time limit (if applicable)
    let isWithinTimeLimit = true
    let daysRemaining: number | undefined

    if (phaseAccount.timeLimitDays) {
      const phaseStartDate = new Date(phaseAccount.startDate)
      const currentDate = new Date()
      const daysSinceStart = Math.floor((currentDate.getTime() - phaseStartDate.getTime()) / (1000 * 60 * 60 * 24))
      
      daysRemaining = phaseAccount.timeLimitDays - daysSinceStart
      isWithinTimeLimit = daysSinceStart <= phaseAccount.timeLimitDays
    }

    const canPassPhase = isProfitTargetMet && areMinTradingDaysMet && isWithinTimeLimit
    const isEligibleForAdvancement = canPassPhase

    return {
      currentPnL,
      profitTargetAmount,
      profitTargetRemaining,
      profitTargetPercent,
      tradingDaysCompleted,
      minTradingDaysRequired,
      isEligibleForAdvancement,
      canPassPhase,
      daysRemaining
    }
  }

  /**
   * Get daily start balance using Daily Anchor system with robust fallback logic
   * ENHANCED: Creates anchor on-the-fly if missing (cron job failure recovery)
   */
  private static async getDailyStartBalance(
    phaseAccountId: string,
    timezone: string,
    fallbackBalance: number
  ): Promise<number> {
    
    // Get today's date in the account's timezone
    const today = this.getDateInTimezone(new Date(), timezone)
    const todayDate = new Date(today)
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[DAILY_ANCHOR] Checking anchor for ${phaseAccountId} on ${today}`)
    }
    
    // STEP 1: Look for today's daily anchor
    const todayAnchor = await prisma.dailyAnchor.findFirst({
      where: {
        phaseAccountId,
        date: todayDate
      }
    })

    if (todayAnchor) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[DAILY_ANCHOR] Found existing anchor: ${todayAnchor.anchorEquity}`)
      }
      return todayAnchor.anchorEquity
    }

    // STEP 2: No anchor exists - ROBUST FALLBACK LOGIC
    if (process.env.NODE_ENV === 'development') {
      console.log(`[DAILY_ANCHOR] No anchor found, creating fallback anchor`)
    }

    try {
      // Get phase account with all necessary data
      const phaseAccount = await prisma.phaseAccount.findFirst({
        where: { id: phaseAccountId },
        include: {
          masterAccount: true,
          trades: {
            where: { phaseAccountId },
            orderBy: { exitTime: 'asc' }
          }
        }
      })

      if (!phaseAccount) {
        console.warn(`[DAILY_ANCHOR] Phase account ${phaseAccountId} not found`)
        return fallbackBalance
      }

      // STEP 3: Calculate current equity for anchor
      const tradesPnL = phaseAccount.trades.reduce((sum, trade) => sum + (trade.pnl || 0), 0)
      const anchorEquity = phaseAccount.masterAccount.accountSize + tradesPnL

      // STEP 4: Try to create the missing anchor (atomic operation)
      const newAnchor = await prisma.dailyAnchor.create({
        data: {
          phaseAccountId,
          date: todayDate,
          anchorEquity
        }
      })

      if (process.env.NODE_ENV === 'development') {
        console.log(`[DAILY_ANCHOR] Created fallback anchor: ${newAnchor.anchorEquity}`)
      }

      return newAnchor.anchorEquity

    } catch (error) {
      console.error(`[DAILY_ANCHOR] Failed to create fallback anchor for ${phaseAccountId}:`, error)
      
      // STEP 5: Ultimate fallback - use provided fallback balance
      if (process.env.NODE_ENV === 'development') {
        console.log(`[DAILY_ANCHOR] Using ultimate fallback balance: ${fallbackBalance}`)
      }
      
      return fallbackBalance
    }
  }

  /**
   * Get date string in specific timezone
   */
  private static getDateInTimezone(date: Date, timezone: string): string {
    try {
      const options: Intl.DateTimeFormatOptions = {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }
      
      const parts = new Intl.DateTimeFormat('en-CA', options).format(date)
      return parts // Returns YYYY-MM-DD format
    } catch (error) {
      console.warn(`Invalid timezone ${timezone}, falling back to UTC`)
      return date.toISOString().split('T')[0]
    }
  }
}
