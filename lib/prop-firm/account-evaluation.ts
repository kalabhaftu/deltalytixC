/**
 * Prop Firm Account Evaluation Engine
 * Core system for linking trades to accounts and evaluating account status
 */

import { prisma } from '@/lib/prisma'
import { PropFirmBusinessRules } from './business-rules'
import { logger } from '@/lib/logger'
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
      // Get all prop firm accounts for this user
      const propFirmAccounts = await prisma.account.findMany({
        where: {
          userId,
          propfirm: { not: '' }, // Only prop firm accounts
          status: { not: 'failed' } // Skip already failed accounts
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

          const currentPhase = matchingAccount.phases[0]
          if (!currentPhase) {
            errors.push(`No active phase found for account: ${trade.accountNumber}`)
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

      // Get daily start balance for drawdown calculation
      const dailyAnchor = account.dailyAnchors[0]
      const dailyStartBalance = dailyAnchor?.anchorEquity || account.startingBalance

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
          highestEquitySincePhaseStart: Math.max(highWaterMark, currentPhase.highestEquitySincePhaseStart),
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
   * Calculate account metrics from trades
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
    // Calculate net profit from all trades in current phase
    const phaseTrades = trades.filter(trade => trade.phaseId === currentPhase.id)
    const netProfit = phaseTrades.reduce((sum, trade) => sum + (trade.pnl || 0), 0)
    
    // Current balance = starting balance + net profit
    const currentBalance = account.startingBalance + netProfit
    
    // For now, equity equals balance (no open positions)
    const currentEquity = currentBalance
    
    // High water mark is the highest equity reached in this phase
    const highWaterMark = Math.max(currentEquity, currentPhase.highestEquitySincePhaseStart || account.startingBalance)

    return {
      currentBalance,
      currentEquity,
      netProfit,
      highWaterMark
    }
  }

  /**
   * Create daily anchors for accounts (should be called daily via cron)
   */
  static async createDailyAnchors(userId?: string): Promise<number> {
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]

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
        dailyAnchors: {
          where: { date: new Date(todayStr) }
        }
      }
    })

    // Filter accounts that don't have today's anchor
    const accountsNeedingAnchors = accounts.filter(account => 
      account.dailyAnchors.length === 0 && account.phases.length > 0
    )

    if (accountsNeedingAnchors.length === 0) {
      return 0
    }

    // Create daily anchors
    const anchorsToCreate = accountsNeedingAnchors.map(account => {
      const currentPhase = account.phases[0]
      const anchorEquity = currentPhase?.currentEquity || account.startingBalance

      return {
        accountId: account.id,
        date: new Date(todayStr),
        anchorEquity
      }
    })

    const result = await prisma.dailyAnchor.createMany({
      data: anchorsToCreate,
      skipDuplicates: true
    })

    logger.info('Created daily anchors', {
      count: result.count,
      date: todayStr
    }, 'AccountEvaluator')

    return result.count
  }
}
