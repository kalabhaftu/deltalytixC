/**
 * Prop Firm Account Evaluation Engine
 * Core system for linking trades to accounts and evaluating account status
 */

import { prisma } from '@/lib/prisma'
import { PropFirmBusinessRules } from './business-rules'
import { logger } from '@/lib/logger'
import { getActiveAccountsWhereClause } from '@/lib/utils/account-filters'
import type { 
  PropFirmAccount, 
  // AccountPhase, // DEPRECATED - Old system 
  PropFirmTrade, 
  DrawdownCalculation,
  PhaseProgress,
  AccountStatus,
  PhaseType,
  BreachType
} from '@/types/prop-firm'

export interface TradeAccountLink {
  tradeId: string
  accountId: string
  accountNumber: string
  phaseId: string
  reason?: string
}

export interface AccountStatusUpdate {
  accountId: string
  previousStatus: AccountStatus
  newStatus: AccountStatus
  reason: string
  breachDetails?: {
    type: BreachType
    amount: number
    threshold: number
  }
}

export class PropFirmAccountEvaluator {

  /**
   * Create daily anchors for phase accounts (timezone-aware, called by cron)
   */
  static async createDailyAnchors(userId?: string, forceDate?: string): Promise<number> {
    let anchorsCreated = 0

    const whereClause: any = {
      isActive: true // Only active master accounts
    }

    if (userId) {
      whereClause.userId = userId
    }

    // Get master accounts with active phases that need daily anchors
    const masterAccounts = await prisma.masterAccount.findMany({
      where: whereClause,
      include: {
        user: true,
        phases: {
          where: { status: 'active' },
          include: {
            trades: {
              orderBy: { exitTime: 'desc' },
              take: 1
            }
          }
        }
      }
    })

    // Group phase accounts by timezone for efficient processing
    const phasesByTimezone = new Map<string, any[]>()
    
    for (const masterAccount of masterAccounts) {
      const timezone = masterAccount.user.timezone || 'UTC'
      
      for (const phase of masterAccount.phases) {
        if (!phasesByTimezone.has(timezone)) {
          phasesByTimezone.set(timezone, [])
        }
        phasesByTimezone.get(timezone)!.push({
          ...phase,
          masterAccount,
          timezone
        })
      }
    }

    // Process each timezone group
    for (const [timezone, phases] of phasesByTimezone) {
      try {
        // Get current date in this timezone
        const targetDate = forceDate ? new Date(forceDate) : new Date()
        const dateStr = this.getDateInTimezone(targetDate, timezone)
        const anchorDate = new Date(dateStr)

        logger.info(`Creating daily anchors for ${phases.length} phases in timezone ${timezone}`, {
          timezone,
          targetDate: dateStr,
          phaseCount: phases.length
        }, 'AccountEvaluator')

        for (const phase of phases) {
          // Check if anchor already exists for this date
          const existingAnchor = await prisma.dailyAnchor.findFirst({
            where: {
              phaseAccountId: phase.id,
              date: anchorDate
            }
          })

          if (existingAnchor) {
            continue // Skip if anchor already exists
          }

          // Calculate current equity from trades
          const tradesPnL = phase.trades.reduce((sum: number, trade: any) => sum + (trade.pnl || 0), 0)
          const anchorEquity = phase.masterAccount.accountSize + tradesPnL

          // Create daily anchor
          await prisma.dailyAnchor.create({
            data: {
              phaseAccountId: phase.id,
              date: anchorDate,
              anchorEquity
            }
          })

          anchorsCreated++

          logger.debug(`Created daily anchor for phase ${phase.id}`, {
            phaseId: phase.id,
            masterAccountId: phase.masterAccount.id,
            date: dateStr,
            anchorEquity,
            timezone
          }, 'AccountEvaluator')
        }

        logger.info(`Completed daily anchor creation for timezone ${timezone}`, {
          timezone,
          anchorsCreated: anchorsCreated,
          targetDate: dateStr
        }, 'AccountEvaluator')

      } catch (error) {
        logger.error(`Failed to create daily anchors for timezone ${timezone}`, error, 'AccountEvaluator')
      }
    }

    return anchorsCreated
  }

  /**
   * Get current date string in specified timezone (YYYY-MM-DD format)
   */
  private static getDateInTimezone(date: Date, timezone: string): string {
    try {
      // Convert to timezone and get date string
      const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: timezone })
      return formatter.format(date) // Returns YYYY-MM-DD format
    } catch (error) {
      logger.warn(`Invalid timezone ${timezone}, falling back to UTC`, { timezone }, 'AccountEvaluator')
      return date.toISOString().split('T')[0]
    }
  }

  /**
   * Get daily start balance for drawdown calculation (timezone-aware)
   */
  private static async getDailyStartBalance(
    phaseAccountId: string, 
    accountTimezone: string, 
    accountStartingBalance: number
  ): Promise<number> {
    const today = this.getDateInTimezone(new Date(), accountTimezone)
    
    // Get today's daily anchor
    const todayAnchor = await prisma.dailyAnchor.findFirst({
      where: {
        phaseAccountId,
        date: new Date(today)
      }
    })

    if (todayAnchor) {
      return todayAnchor.anchorEquity
    }

    // If no anchor for today, try to create one immediately
    try {
      const phaseAccount = await prisma.phaseAccount.findFirst({
        where: { id: phaseAccountId },
        include: {
          masterAccount: true,
          trades: true
        }
      })

      if (phaseAccount) {
        // Calculate current equity from trades
        const tradesPnL = phaseAccount.trades.reduce((sum, trade) => sum + (trade.pnl || 0), 0)
        const anchorEquity = phaseAccount.masterAccount.accountSize + tradesPnL

        const newAnchor = await prisma.dailyAnchor.create({
          data: {
            phaseAccountId,
            date: new Date(today),
            anchorEquity
          }
        })

        return newAnchor.anchorEquity
      }
    } catch (error) {
      console.warn('Failed to create missing daily anchor', { phaseAccountId, error })
    }

    // Fallback to starting balance
    return accountStartingBalance
  }
}