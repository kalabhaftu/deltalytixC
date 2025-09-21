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
  AccountPhase, 
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
  phaseId: string
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
   * Links imported trades to prop firm accounts and triggers status evaluation
   */
  static async linkTradesAndEvaluate(
    trades: any[], 
    userId: string
  ): Promise<{
    linkedTrades: TradeAccountLink[]
    statusUpdates: AccountStatusUpdate[]
    errors: string[]
  }> {
    const linkedTrades: TradeAccountLink[] = []
    const statusUpdates: AccountStatusUpdate[] = []
    const errors: string[] = []
    const accountsToEvaluate = new Set<string>()

    try {
      // Get ALL prop firm accounts for this user (including failed accounts for historical data)
      const propFirmAccounts = await prisma.account.findMany({
        where: {
          userId,
          propfirm: { not: '' } // Only prop firm accounts - DO NOT exclude failed accounts
        },
        include: {
          phases: {
            where: { phaseStatus: 'active' }, // Only get active phases, not archived ones
            orderBy: { createdAt: 'desc' },
            take: 1
          }
        }
      })

      if (propFirmAccounts.length === 0) {
        logger.info('No prop firm accounts found for user', { userId }, 'AccountEvaluator')
        return { linkedTrades, statusUpdates, errors }
      }

      // Process each trade
      for (const trade of trades) {
        try {
          // Find matching prop firm account by account number
          const matchingAccount = propFirmAccounts.find(
            account => account.number === trade.accountNumber
          )

          if (!matchingAccount) {
            errors.push(`No prop firm account found for account number: ${trade.accountNumber}`)
            continue
          }

          // Handle failed accounts - assign trades for historical data but don't evaluate
          if (matchingAccount.status === 'failed') {
            // For failed accounts, simply link the trade without phase evaluation
            await prisma.trade.update({
              where: { id: trade.id },
              data: { 
                accountId: matchingAccount.id,
                // Leave phaseId as null since account is failed
              }
            })

            linkedTrades.push({
              tradeId: trade.id,
              accountId: matchingAccount.id,
              accountNumber: trade.accountNumber,
              phaseId: null,
              reason: 'Failed account - linked for historical data'
            })
            
            logger.info('Linked trade to failed account', {
              tradeId: trade.id,
              accountNumber: trade.accountNumber,
              accountId: matchingAccount.id
            }, 'AccountEvaluator')
            
            continue // Skip evaluation for failed accounts
          }

          const currentPhase = matchingAccount.phases[0]
          if (!currentPhase) {
            // No active phase but account is not failed - this is an error
            errors.push(`No active phase found for non-failed account: ${trade.accountNumber}`)
            continue
          }

          // Check if Phase 2 requires new account ID assignment
          if (currentPhase.phaseType === 'phase_2') {
            // Check if this account has been through Phase 1 transition
            const hasPhase1 = await prisma.accountPhase.findFirst({
              where: {
                accountId: matchingAccount.id,
                phaseType: 'phase_1',
                phaseStatus: 'passed'
              }
            })

            if (hasPhase1) {
              // This means we transitioned from Phase 1 to Phase 2
              // Check if account number was updated for Phase 2
              const transitions = await prisma.accountTransition.findMany({
                where: {
                  accountId: matchingAccount.id,
                  toPhaseId: currentPhase.id
                }
              })

              const hasNewAccountId = transitions.some(t => 
                t.metadata && 
                typeof t.metadata === 'object' && 
                'newAccountNumber' in t.metadata &&
                t.metadata.newAccountNumber
              )

              if (!hasNewAccountId) {
                errors.push(`Phase 2 requires new account ID assignment for account: ${trade.accountNumber}. Please complete phase transition first.`)
                continue
              }
            }
          }

          // Update trade with account and phase linking
          await prisma.trade.update({
            where: { id: trade.id },
            data: {
              accountId: matchingAccount.id,
              phaseId: currentPhase.id,
              // Convert string dates to proper DateTime if needed
              entryTime: trade.entryDate ? new Date(trade.entryDate) : null,
              exitTime: trade.closeDate ? new Date(trade.closeDate) : null,
              symbol: trade.instrument,
              realizedPnl: trade.pnl,
              fees: trade.commission || 0
            }
          })

          linkedTrades.push({
            tradeId: trade.id,
            accountId: matchingAccount.id,
            phaseId: currentPhase.id
          })

          // Mark account for evaluation
          accountsToEvaluate.add(matchingAccount.id)

          logger.debug('Linked trade to account', { 
            tradeId: trade.id, 
            accountId: matchingAccount.id, 
            accountNumber: trade.accountNumber 
          }, 'AccountEvaluator')

        } catch (error) {
          const errorMsg = `Failed to link trade ${trade.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
          errors.push(errorMsg)
          logger.error('Trade linking error', error, 'AccountEvaluator')
        }
      }

      // Evaluate all affected accounts
      for (const accountId of accountsToEvaluate) {
        try {
          const statusUpdate = await this.updateAccountStatus(accountId)
          if (statusUpdate) {
            statusUpdates.push(statusUpdate)
          }
        } catch (error) {
          const errorMsg = `Failed to evaluate account ${accountId}: ${error instanceof Error ? error.message : 'Unknown error'}`
          errors.push(errorMsg)
          logger.error('Account evaluation error', error, 'AccountEvaluator')
        }
      }

      logger.info('Trade linking and evaluation completed', {
        totalTrades: trades.length,
        linkedTrades: linkedTrades.length,
        accountsEvaluated: accountsToEvaluate.size,
        statusUpdates: statusUpdates.length,
        errors: errors.length
      }, 'AccountEvaluator')

    } catch (error) {
      const errorMsg = `Critical error in linkTradesAndEvaluate: ${error instanceof Error ? error.message : 'Unknown error'}`
      errors.push(errorMsg)
      logger.error('Critical evaluation error', error, 'AccountEvaluator')
    }

    return { linkedTrades, statusUpdates, errors }
  }

  /**
   * Core function to re-evaluate account status after new trades
   */
  static async updateAccountStatus(accountId: string): Promise<AccountStatusUpdate | null> {
    try {
      // Get account with current phase and recent trades
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
            orderBy: { exitTime: 'desc' }
          },
          dailyAnchors: {
            orderBy: { date: 'desc' },
            take: 1
          }
        }
      })

      if (!account) {
        throw new Error(`Account ${accountId} not found`)
      }

      const currentPhase = account.phases[0]
      if (!currentPhase) {
        throw new Error(`No active phase found for account ${accountId}`)
      }

      // Skip evaluation if account is already failed
      if (account.status === 'failed') {
        return null
      }

      const previousStatus = account.status

      // Calculate current metrics from trades
      const { currentBalance, currentEquity, netProfit, highWaterMark } = 
        await this.calculateAccountMetrics(account, currentPhase, account.trades)

      // Get daily start balance for drawdown calculation (timezone-aware)
      const dailyStartBalance = await this.getDailyStartBalance(
        accountId, 
        account.timezone || 'UTC', 
        account.startingBalance
      )

      // 1. Check for Failure First (Daily DD or Max DD breach)
      const drawdownResult = PropFirmBusinessRules.calculateDrawdown(
        account as any,
        currentPhase as any,
        currentEquity,
        dailyStartBalance,
        highWaterMark
      )

      if (drawdownResult.isBreached) {
        // Account has breached - mark as failed immediately
        const newStatus: AccountStatus = 'failed'
        
        await prisma.$transaction(async (tx) => {
          // Update account status
          await tx.account.update({
            where: { id: accountId },
            data: { status: newStatus }
          })

          // Mark current phase as failed
          await tx.accountPhase.update({
            where: { id: currentPhase.id },
            data: { 
              phaseStatus: 'failed',
              phaseEndAt: new Date()
            }
          })

          // Record the breach
          await tx.breach.create({
            data: {
              accountId,
              phaseId: currentPhase.id,
              breachType: drawdownResult.breachType!,
              breachAmount: drawdownResult.breachAmount!,
              breachThreshold: drawdownResult.breachType === 'daily_drawdown' 
                ? (account.dailyDrawdownAmount || 0)
                : (account.maxDrawdownAmount || 0),
              equity: currentEquity,
              breachTime: new Date(),
              description: `${drawdownResult.breachType} breach: ${drawdownResult.breachAmount} exceeds limit`
            }
          })

          // Create audit log
          await tx.auditLog.create({
            data: {
              userId: account.userId,
              action: 'ACCOUNT_FAILED',
              entity: 'ACCOUNT',
              entityId: accountId,
              details: {
                reason: 'drawdown_breach',
                breachType: drawdownResult.breachType,
                breachAmount: drawdownResult.breachAmount,
                previousStatus,
                newStatus
              }
            }
          })
        })

        logger.warn('Account failed due to drawdown breach', {
          accountId,
          accountNumber: account.number,
          breachType: drawdownResult.breachType,
          breachAmount: drawdownResult.breachAmount,
          currentEquity
        }, 'AccountEvaluator')

        return {
          accountId,
          previousStatus,
          newStatus,
          reason: `${drawdownResult.breachType} breach`,
          breachDetails: {
            type: drawdownResult.breachType!,
            amount: drawdownResult.breachAmount!,
            threshold: drawdownResult.breachType === 'daily_drawdown' 
              ? (account.dailyDrawdownAmount || 0)
              : (account.maxDrawdownAmount || 0)
          }
        }
      }

      // 2. Check for Phase Progression (profit target met)
      // IMPORTANT: Only allow progression if no breaches exist
      const activeBreaches = await prisma.breach.count({
        where: {
          accountId,
          phaseId: currentPhase.id
        }
      })

      if (activeBreaches > 0) {
        // Account has breaches - cannot progress regardless of profit target
        logger.info('Account progression blocked due to existing breaches', {
          accountId,
          accountNumber: account.number,
          breachCount: activeBreaches
        }, 'AccountEvaluator')
        
        // Update phase metrics but don't allow progression
        await prisma.accountPhase.update({
          where: { id: currentPhase.id },
          data: {
            currentEquity,
            currentBalance,
            highestEquitySincePhaseStart: highWaterMark,
            netProfitSincePhaseStart: netProfit,
          }
        })

        return null // No status change due to existing breaches
      }

      const progressResult = PropFirmBusinessRules.calculatePhaseProgress(
        account as any,
        currentPhase as any,
        netProfit
      )

      if (progressResult.canProgress && progressResult.nextPhaseType) {
        const nextPhaseType = progressResult.nextPhaseType
        let newAccountStatus: AccountStatus = account.status

        await prisma.$transaction(async (tx) => {
          // Mark current phase as passed
          await tx.accountPhase.update({
            where: { id: currentPhase.id },
            data: {
              phaseStatus: 'passed',
              phaseEndAt: new Date()
            }
          })

          // Determine profit target for next phase
          const nextProfitTarget = nextPhaseType === 'funded' 
            ? undefined 
            : PropFirmBusinessRules.getDefaultProfitTarget(
                nextPhaseType,
                account.startingBalance,
                account.evaluationType
              )

          // Create next phase
          await tx.accountPhase.create({
            data: {
              accountId,
              phaseType: nextPhaseType,
              phaseStatus: 'active',
              profitTarget: nextProfitTarget,
              currentEquity,
              currentBalance,
              highestEquitySincePhaseStart: highWaterMark,
              netProfitSincePhaseStart: nextPhaseType === 'funded' ? 0 : netProfit,
            }
          })

          // Update account status if reaching funded
          if (nextPhaseType === 'funded') {
            newAccountStatus = 'funded'
            await tx.account.update({
              where: { id: accountId },
              data: { status: newAccountStatus }
            })
          }

          // Create transition record
          await tx.accountTransition.create({
            data: {
              accountId,
              fromPhaseId: currentPhase.id,
              fromStatus: account.status,
              toStatus: newAccountStatus,
              reason: 'profit_target_achieved',
              transitionTime: new Date(),
              metadata: {
                profitTarget: currentPhase.profitTarget,
                netProfit,
                nextPhaseType
              }
            }
          })

          // Create audit log
          await tx.auditLog.create({
            data: {
              userId: account.userId,
              action: 'PHASE_PROGRESSION',
              entity: 'ACCOUNT',
              entityId: accountId,
              details: {
                fromPhase: currentPhase.phaseType,
                toPhase: nextPhaseType,
                profitTarget: currentPhase.profitTarget,
                netProfit,
                previousStatus,
                newStatus: newAccountStatus
              }
            }
          })
        })

        logger.info('Account progressed to next phase', {
          accountId,
          accountNumber: account.number,
          fromPhase: currentPhase.phaseType,
          toPhase: nextPhaseType,
          netProfit,
          profitTarget: currentPhase.profitTarget
        }, 'AccountEvaluator')

        return {
          accountId,
          previousStatus,
          newStatus: newAccountStatus,
          reason: `Progressed from ${currentPhase.phaseType} to ${nextPhaseType}`
        }
      }

      // 3. No status change - just update phase metrics
      await prisma.accountPhase.update({
        where: { id: currentPhase.id },
        data: {
          currentEquity,
          currentBalance,
          highestEquitySincePhaseStart: highWaterMark, // Use calculated high-water mark
          netProfitSincePhaseStart: netProfit,
        }
      })

      // Update account status to active if it was previously passed (reset from previous phase)
      if (account.status !== 'active' && account.status !== 'funded') {
        await prisma.account.update({
          where: { id: accountId },
          data: { status: 'active' }
        })

        return {
          accountId,
          previousStatus,
          newStatus: 'active',
          reason: 'Account reactivated with new trades'
        }
      }

      return null // No status change

    } catch (error) {
      logger.error('Error updating account status', error, 'AccountEvaluator')
      throw error
    }
  }

  /**
   * Calculate account metrics from trades with proper high-water mark tracking
   */
  private static async calculateAccountMetrics(
    account: any,
    currentPhase: any,
    trades: any[]
  ): Promise<{
    currentBalance: number
    currentEquity: number
    netProfit: number
    highWaterMark: number
  }> {
    // Filter trades for current phase and sort chronologically
    const phaseTrades = trades
      .filter(trade => trade.phaseId === currentPhase.id)
      .sort((a, b) => {
        // Use exitTime if available, otherwise createdAt
        const timeA = a.exitTime || a.createdAt
        const timeB = b.exitTime || b.createdAt
        return new Date(timeA).getTime() - new Date(timeB).getTime()
      })

    // Calculate running balance and track highest equity chronologically
    let runningBalance = account.startingBalance
    let highWaterMark = account.startingBalance
    
    // Track the highest equity from phase start
    const phaseStartHighest = currentPhase.highestEquitySincePhaseStart || account.startingBalance
    highWaterMark = Math.max(highWaterMark, phaseStartHighest)

    // Process trades chronologically to find true high-water mark
    for (const trade of phaseTrades) {
      runningBalance += (trade.pnl || 0)
      // For now, equity equals balance (no open positions tracking)
      const equityAtThisPoint = runningBalance
      
      // Update high-water mark if this is a new peak
      if (equityAtThisPoint > highWaterMark) {
        highWaterMark = equityAtThisPoint
      }
    }

    const netProfit = phaseTrades.reduce((sum, trade) => sum + (trade.pnl || 0), 0)
    const currentBalance = runningBalance
    const currentEquity = currentBalance

    // Ensure high-water mark is at least the current equity
    highWaterMark = Math.max(highWaterMark, currentEquity)

    return {
      currentBalance,
      currentEquity,
      netProfit,
      highWaterMark
    }
  }

  /**
   * Create daily anchors for accounts (timezone-aware, called by cron)
   */
  static async createDailyAnchors(userId?: string, forceDate?: string): Promise<number> {
    let anchorsCreated = 0

    const whereClause: any = {
      propfirm: { not: '' }, // Only prop firm accounts
      status: { not: 'failed' } // Skip failed accounts
    }

    if (userId) {
      whereClause.userId = userId
    }

    // Get accounts that need daily anchors
    const accounts = await prisma.account.findMany({
      where: whereClause,
      include: {
        phases: {
          where: { phaseStatus: 'active' },
          orderBy: { createdAt: 'desc' },
          take: 1
        },
        trades: {
          where: { accountId: { not: null } },
          orderBy: { exitTime: 'desc' },
          take: 1
        }
      }
    })

    // Group accounts by timezone for efficient processing
    const accountsByTimezone = new Map<string, typeof accounts>()
    
    for (const account of accounts) {
      const timezone = account.timezone || 'UTC'
      if (!accountsByTimezone.has(timezone)) {
        accountsByTimezone.set(timezone, [])
      }
      accountsByTimezone.get(timezone)!.push(account)
    }

    // Process each timezone group
    for (const [timezone, timezoneAccounts] of accountsByTimezone) {
      try {
        // Calculate the date in the account's timezone
        const now = new Date()
        const todayInTimezone = forceDate || this.getDateInTimezone(now, timezone)
        
        // Check which accounts need anchors for this date
        const accountsWithExistingAnchors = await prisma.account.findMany({
          where: {
            id: { in: timezoneAccounts.map(a => a.id) }
          },
          include: {
            dailyAnchors: {
              where: { date: new Date(todayInTimezone) }
            }
          }
        })

        const accountsNeedingAnchors = timezoneAccounts.filter(account => {
          const existingAnchor = accountsWithExistingAnchors.find(a => a.id === account.id)
          return !existingAnchor?.dailyAnchors.length && account.phases.length > 0
        })

        if (accountsNeedingAnchors.length === 0) {
          continue
        }

        // Create daily anchors for accounts in this timezone
        const anchorsToCreate = accountsNeedingAnchors.map(account => {
          const currentPhase = account.phases[0]
          const anchorEquity = currentPhase?.currentEquity || account.startingBalance

          return {
            accountId: account.id,
            date: new Date(todayInTimezone),
            anchorEquity
          }
        })

        const result = await prisma.dailyAnchor.createMany({
          data: anchorsToCreate,
          skipDuplicates: true
        })

        anchorsCreated += result.count

        logger.info('Created daily anchors for timezone', {
          timezone,
          count: result.count,
          date: todayInTimezone,
          accounts: accountsNeedingAnchors.map(a => a.number)
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
    accountId: string, 
    accountTimezone: string, 
    accountStartingBalance: number
  ): Promise<number> {
    const today = this.getDateInTimezone(new Date(), accountTimezone)
    
    // Get today's daily anchor
    const todayAnchor = await prisma.dailyAnchor.findFirst({
      where: {
        accountId,
        date: new Date(today)
      }
    })

    if (todayAnchor) {
      return todayAnchor.anchorEquity
    }

    // If no anchor for today, try to create one immediately
    try {
      const account = await prisma.account.findFirst({
        where: { id: accountId },
        include: {
          phases: {
            where: { phaseStatus: 'active' },
            orderBy: { createdAt: 'desc' },
            take: 1
          }
        }
      })

      if (account && account.phases.length > 0) {
        const currentPhase = account.phases[0]
        const anchorEquity = currentPhase.currentEquity || accountStartingBalance

        const newAnchor = await prisma.dailyAnchor.create({
          data: {
            accountId,
            date: new Date(today),
            anchorEquity
          }
        })

        logger.info('Created missing daily anchor', {
          accountId,
          date: today,
          anchorEquity
        }, 'AccountEvaluator')

        return newAnchor.anchorEquity
      }
    } catch (error) {
      logger.warn('Failed to create missing daily anchor', { accountId, error }, 'AccountEvaluator')
    }

    // Fallback to starting balance
    return accountStartingBalance
  }
}
