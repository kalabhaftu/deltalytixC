/**
 * Phase Evaluation Engine for New MasterAccount/PhaseAccount System
 * Implements failure-first priority and proper trailing drawdown logic
 */

import { prisma } from '@/lib/prisma'

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
   * FIXED: Now checks HISTORICAL daily drawdowns, not just today
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
        MasterAccount: {
          include: {
            User: true
          }
        },
        Trade: {
          where: { phaseAccountId },
          orderBy: { exitTime: 'asc' }
        },
        DailyAnchor: {
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
      tradesCount: phaseAccount.Trade.length,
      accountSize: phaseAccount.MasterAccount.accountSize
    })

    const masterAccount = phaseAccount.MasterAccount
    const trades = phaseAccount.Trade
    const timezone = masterAccount.User.timezone || 'UTC'

    // CRITICAL FIX: Calculate current metrics using NET P&L (after commission)
    // Prop firms must account for commission as it affects actual account balance
    const currentPnL = trades.reduce((sum, trade) => {
      const netPnl = (trade.pnl || 0) - (trade.commission || 0)
      return sum + netPnl
    }, 0)
    const currentEquity = masterAccount.accountSize + currentPnL

    this.log(`Current metrics calculated (NET of commission)`, {
      currentPnL,
      currentEquity,
      startingBalance: masterAccount.accountSize
    })

    // Calculate high-water mark (highest equity since phase start) using NET P&L
    let highWaterMark = masterAccount.accountSize
    let runningBalance = masterAccount.accountSize
    
    for (const trade of trades) {
      const netPnl = (trade.pnl || 0) - (trade.commission || 0)
      runningBalance += netPnl
      highWaterMark = Math.max(highWaterMark, runningBalance)
    }

    this.log(`High-water mark calculated: ${highWaterMark}`)

    // CRITICAL FIX: Check historical daily drawdowns for ALL days
    this.log(`[EVAL] Starting historical breach check for ${trades.length} trades`)
    this.log(`[EVAL] Account size: $${masterAccount.accountSize}, Daily DD%: ${phaseAccount.dailyDrawdownPercent}%, Limit: $${(masterAccount.accountSize * phaseAccount.dailyDrawdownPercent / 100).toFixed(2)}`)
    
    const historicalBreachCheck = await this.checkHistoricalDailyDrawdowns(
      phaseAccount,
      trades,
      masterAccount.accountSize,
      timezone
    )

    if (historicalBreachCheck.isBreached) {
      // Log critical failure even in production
      console.warn(`[EVAL] ⛔ HISTORICAL BREACH DETECTED on ${historicalBreachCheck.breachDate}`, {
        breachAmount: historicalBreachCheck.breachAmount,
        dayLoss: historicalBreachCheck.dayLoss,
        dailyLimit: historicalBreachCheck.dailyLimit
      })

      // Return immediate failure
      return {
        drawdown: {
          currentEquity,
          dailyStartBalance: historicalBreachCheck.dayStartBalance,
          highWaterMark,
          dailyDrawdownUsed: historicalBreachCheck.dayLoss,
          dailyDrawdownLimit: historicalBreachCheck.dailyLimit,
          dailyDrawdownRemaining: 0,
          dailyDrawdownPercent: (historicalBreachCheck.dayLoss / historicalBreachCheck.dayStartBalance) * 100,
          maxDrawdownUsed: masterAccount.accountSize - currentEquity,
          maxDrawdownLimit: masterAccount.accountSize * (phaseAccount.maxDrawdownPercent / 100),
          maxDrawdownRemaining: 0,
          maxDrawdownPercent: ((masterAccount.accountSize - currentEquity) / masterAccount.accountSize) * 100,
          isBreached: true,
          breachType: 'daily_drawdown',
          breachAmount: historicalBreachCheck.breachAmount,
          breachTime: historicalBreachCheck.breachTime
        },
        progress: this.calculateProgress(phaseAccount, currentPnL, trades),
        isFailed: true,
        isPassed: false,
        canAdvance: false,
        nextAction: 'fail'
      }
    }

    // Get daily start balance from daily anchor system (for current day display)
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
   * CRITICAL METHOD: Check historical daily drawdowns for ALL trading days
   * This catches breaches that happened on past dates when importing historical trades
   */
  private static async checkHistoricalDailyDrawdowns(
    phaseAccount: any,
    trades: any[],
    accountSize: number,
    timezone: string
  ): Promise<{
    isBreached: boolean
    breachDate?: string
    breachTime?: Date
    dayStartBalance: number
    dayEndBalance: number
    dayLoss: number
    dailyLimit: number
    breachAmount?: number
  }> {
    
    if (trades.length === 0) {
      return {
        isBreached: false,
        dayStartBalance: accountSize,
        dayEndBalance: accountSize,
        dayLoss: 0,
        dailyLimit: accountSize * (phaseAccount.dailyDrawdownPercent / 100)
      }
    }

    // Calculate daily drawdown limit
    const dailyDrawdownLimit = accountSize * (phaseAccount.dailyDrawdownPercent / 100)

    // Group trades by day
    const tradesByDay = new Map<string, any[]>()
    
    this.log(`[EVAL] Grouping ${trades.length} trades by day...`)
    for (const trade of trades) {
      const exitDate = trade.exitTime || trade.createdAt
      const dateStr = this.getDateInTimezone(new Date(exitDate), timezone)
      
      // this.log(`[EVAL] Trade: ${trade.instrument} PnL=$${trade.pnl} exitDate=${exitDate} -> day=${dateStr}`)
      
      if (!tradesByDay.has(dateStr)) {
        tradesByDay.set(dateStr, [])
      }
      tradesByDay.get(dateStr)!.push(trade)
    }

    this.log(`[EVAL] Grouped into ${tradesByDay.size} days: ${Array.from(tradesByDay.keys()).join(', ')}`)
    this.log(`[EVAL] Daily limit: $${dailyDrawdownLimit.toFixed(2)} (${phaseAccount.dailyDrawdownPercent}%)`)
    
    this.log(`Checking ${tradesByDay.size} days for historical breaches`, {
      dailyDrawdownLimit,
      dailyDrawdownPercent: phaseAccount.dailyDrawdownPercent
    })

    // Sort days chronologically
    const sortedDays = Array.from(tradesByDay.keys()).sort()

    // Track running balance
    let runningBalance = accountSize

    // Check each day
    for (const dayStr of sortedDays) {
      const dayTrades = tradesByDay.get(dayStr)!
      const dayStartBalance = runningBalance

    // Calculate day's P&L
    let dayPnL = 0
    for (const trade of dayTrades) {
      // CRITICAL FIX: Use net P&L for daily drawdown calculations
      const netPnl = (trade.pnl || 0) - (trade.commission || 0)
      dayPnL += netPnl
    }

    const dayEndBalance = dayStartBalance + dayPnL
    const dayLoss = dayPnL < 0 ? Math.abs(dayPnL) : 0

    this.log(`[EVAL] 📅 Day: ${dayStr}`, {
      dayStartBalance: `$${dayStartBalance.toFixed(2)}`,
      dayPnL: `$${dayPnL.toFixed(2)}`,
      dayEndBalance: `$${dayEndBalance.toFixed(2)}`,
      dayLoss: `$${dayLoss.toFixed(2)}`,
      dailyLimit: `$${dailyDrawdownLimit.toFixed(2)}`,
      tradesCount: dayTrades.length,
      isBreached: dayLoss > dailyDrawdownLimit
    })

    // Check if this day breached the daily drawdown limit
    if (dayLoss > dailyDrawdownLimit) {
      const breachAmount = dayLoss - dailyDrawdownLimit
      
      // Log critical breach info even in production
      console.warn(`[EVALUATION_ENGINE] HISTORICAL DAILY DRAWDOWN BREACH DETECTED!`, {
        date: dayStr,
        dayStartBalance,
        dayEndBalance,
        dayLoss,
        dailyLimit: dailyDrawdownLimit,
        breachAmount,
        tradesOnDay: dayTrades.length
      })

      return {
        isBreached: true,
        breachDate: dayStr,
        breachTime: new Date(dayStr),
        dayStartBalance,
        dayEndBalance,
        dayLoss,
        dailyLimit: dailyDrawdownLimit,
        breachAmount
      }
    }

      // Update running balance for next day
      runningBalance = dayEndBalance
    }

    // No breach detected
    return {
      isBreached: false,
      dayStartBalance: accountSize,
      dayEndBalance: runningBalance,
      dayLoss: 0,
      dailyLimit: dailyDrawdownLimit
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
    
    
    // STEP 1: Look for today's daily anchor
    const todayAnchor = await prisma.dailyAnchor.findFirst({
      where: {
        phaseAccountId,
        date: todayDate
      }
    })

    if (todayAnchor) {
      return todayAnchor.anchorEquity
    }

    // STEP 2: No anchor exists - ROBUST FALLBACK LOGIC

    try {
      // Get phase account with all necessary data
      const phaseAccount = await prisma.phaseAccount.findFirst({
        where: { id: phaseAccountId },
        include: {
          MasterAccount: true,
          Trade: {
            where: { phaseAccountId },
            orderBy: { exitTime: 'asc' }
          }
        }
      })

      if (!phaseAccount) {
        console.warn(`[DAILY_ANCHOR] Phase account ${phaseAccountId} not found`)
        return fallbackBalance
      }

      // STEP 3: Calculate current equity for anchor using NET P&L
      const tradesPnL = phaseAccount.Trade.reduce((sum, trade) => {
        const netPnl = (trade.pnl || 0) - (trade.commission || 0)
        return sum + netPnl
      }, 0)
      const anchorEquity = phaseAccount.MasterAccount.accountSize + tradesPnL

      // STEP 4: Try to create the missing anchor (atomic operation)
      const newAnchor = await prisma.dailyAnchor.create({
        data: {
          id: crypto.randomUUID(),
          phaseAccountId,
          date: todayDate,
          anchorEquity
        }
      })


      return newAnchor.anchorEquity

    } catch (error) {
      console.error(`[DAILY_ANCHOR] Failed to create fallback anchor for ${phaseAccountId}:`, error)
      
      // STEP 5: Ultimate fallback - use provided fallback balance
      
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
