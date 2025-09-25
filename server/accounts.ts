'use server'

import { getUserId, getUserIdSafe } from '@/server/auth'
import { PrismaClient, Trade, Payout } from '@prisma/client'
import { Account } from '@/context/data-provider'
import { unstable_cache } from 'next/cache'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

type GroupedTrades = Record<string, Record<string, Trade[]>>

interface FetchTradesResult {
  groupedTrades: GroupedTrades;
  flattenedTrades: Trade[];
}

export async function fetchGroupedTradesAction(userId: string): Promise<FetchTradesResult> {
  const trades = await prisma.trade.findMany({
    where: {
      userId: userId
    },
    orderBy: [
      { accountNumber: 'asc' },
      { instrument: 'asc' }
    ]
  })

  const groupedTrades = trades.reduce<GroupedTrades>((acc, trade) => {
    if (!acc[trade.accountNumber]) {
      acc[trade.accountNumber] = {}
    }
    if (!acc[trade.accountNumber][trade.instrument]) {
      acc[trade.accountNumber][trade.instrument] = []
    }
    acc[trade.accountNumber][trade.instrument].push(trade)
    return acc
  }, {})

  return {
    groupedTrades,
    flattenedTrades: trades
  }
}

export async function removeAccountsFromTradesAction(accountNumbers: string[]): Promise<void> {
  const userId = await getUserId()
  await prisma.trade.deleteMany({
    where: {
      accountNumber: { in: accountNumbers },
      userId: userId
    }
  })
  await prisma.account.deleteMany({
    where: {
      number: { in: accountNumbers },
      userId: userId
    }
  })
}

export async function removeAccountFromTradesAction(accountNumber: string): Promise<void> {
  const userId = await getUserId()
  await prisma.trade.deleteMany({
    where: {
      accountNumber: accountNumber,
      userId: userId
    }
  })
}

export async function deleteInstrumentGroupAction(accountNumber: string, instrumentGroup: string, userId: string): Promise<void> {
  await prisma.trade.deleteMany({
    where: {
      accountNumber: accountNumber,
      instrument: { startsWith: instrumentGroup },
      userId: userId
    }
  })
}

export async function updateCommissionForGroupAction(accountNumber: string, instrumentGroup: string, newCommission: number): Promise<void> {
  // We have to update the commission for all trades in the group and compute based on the quantity
  const trades = await prisma.trade.findMany({
    where: {
      accountNumber: accountNumber,
      instrument: { startsWith: instrumentGroup }
    }
  })
  // For each trade, update the commission
  for (const trade of trades) {
    const updatedCommission = newCommission * trade.quantity
    await prisma.trade.update({
      where: {
        id: trade.id
      },
      data: {
        commission: updatedCommission
      }
    })
  }
}

export async function renameAccountAction(oldAccountNumber: string, newAccountNumber: string): Promise<void> {
  try {
    const userId = await getUserId()
    // First check if the account exists and get its ID
    const existingAccount = await prisma.account.findFirst({
      where: {
        number: oldAccountNumber,
        userId: userId
      }
    })

    if (!existingAccount) {
      throw new Error('Account not found')
    }

    // Check if the new account number is already in use by this user
    const duplicateAccount = await prisma.account.findFirst({
      where: {
        number: newAccountNumber,
        userId: userId
      }
    })

    if (duplicateAccount) {
      throw new Error('You already have an account with this number')
    }

    // Use a transaction to ensure all updates happen together
    await prisma.$transaction(async (tx) => {
      // Update the account number
      await tx.account.update({
        where: {
          id: existingAccount.id
        },
        data: {
          number: newAccountNumber
        }
      })

      // Update trades accountNumber
      await tx.trade.updateMany({
        where: {
          accountNumber: oldAccountNumber,
          userId: userId
        },
        data: {
          accountNumber: newAccountNumber
        }
      })

      // Update payouts accountNumber
      await tx.payout.updateMany({
        where: {
          accountId: existingAccount.id
        },
        data: {
          accountNumber: newAccountNumber
        }
      })
    })
  } catch (error) {
    console.error('Error renaming account:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Failed to rename account')
  }
}

export async function deleteTradesByIdsAction(tradeIds: string[]): Promise<void> {
  try {
    const userId = await getUserId()

    // Delete trades and invalidate cache in parallel for faster response
    const [result] = await Promise.all([
      prisma.trade.deleteMany({
        where: {
          id: { in: tradeIds },
          userId: userId // Ensure user can only delete their own trades
        }
      }),
      // Invalidate multiple related caches immediately
      (async () => {
        await invalidateUserCaches(userId)
      })()
    ])

  } catch (error) {
    console.error('[deleteTradesByIds] Error deleting trades:', error)
    throw error
  }
}

export async function setupAccountAction(account: Account) {
  const userId = await getUserId()
  const existingAccount = await prisma.account.findFirst({
    where: {
      number: account.number,
      userId: userId
    }
  })

  // Extract fields that should not be included in the database operation
  const { 
    id, 
    userId: _, 
    payouts, 
    groupId,
    balanceToDate,
    group,
    ...baseAccountData 
  } = account

  // Handle group relation separately if groupId exists
  const accountDataWithGroup = {
    ...baseAccountData,
    ...(groupId && {
      group: {
        connect: {
          id: groupId
        }
      }
    })
  }

  if (existingAccount) {
    return await prisma.account.update({
      where: { id: existingAccount.id },
      data: accountDataWithGroup
    })
  }

  return await prisma.account.create({
    data: {
      ...accountDataWithGroup,
      user: {
        connect: {
          id: userId
        }
      }
    }
  })
}

export async function deleteAccountAction(account: Account) {
  const userId = await getUserId()
  await prisma.account.delete({
    where: {
      id: account.id,
      userId: userId
    }
  })
}

export async function getAccountsAction() {
  try {
    const userId = await getUserIdSafe()

    // If user is not authenticated, return empty array instead of throwing error
    if (!userId) {
      return []
    }

    // PERFORMANCE OPTIMIZATION: Use caching and minimal fields with error handling
    return unstable_cache(
      async () => {
        let accounts = [];
        try {
          accounts = await prisma.account.findMany({
            where: {
              userId: userId,
              // Include all accounts regardless of propfirm status
            },
            select: {
              id: true,
              number: true,
              name: true,
              propfirm: true,
              broker: true,
              startingBalance: true,
              status: true,
              createdAt: true,
              userId: true,
              groupId: true,
              // Skip payouts for performance - can be loaded on demand
            }
          })
        } catch (dbError) {
          console.error('[getAccountsAction] Database error:', dbError)
          // Return empty array instead of throwing to prevent app crash
          return []
        }

        if (accounts.length === 0) {
          // Try to see if there are any accounts at all in the database
          try {
            const allAccounts = await prisma.account.findMany({
              select: { id: true, userId: true, number: true, propfirm: true },
              take: 5
            })
          } catch (dbError) {
            console.error('[getAccountsAction] Secondary database error:', dbError)
          }
        }

        // Get trade counts for all accounts (including prop firm accounts)
        const accountIds = accounts.map(account => account.id)
        console.log(`[getAccountsAction] Fetching trade counts for ${accountIds.length} accounts:`, accountIds)
        console.log(`[getAccountsAction] Account details:`, accounts.map(a => ({ id: a.id, name: a.name, propfirm: a.propfirm })))

        // First, let's check what trades exist in the database
        const allTrades = await prisma.trade.findMany({
          where: {
            accountId: { in: accountIds }
          },
          select: {
            id: true,
            accountId: true,
            phaseId: true,
            symbol: true,
            entryTime: true
          },
          take: 10
        })
        console.log(`[getAccountsAction] Sample trades in database:`, allTrades)

        const tradeCounts = await prisma.trade.groupBy({
          by: ['accountId'],
          where: {
            accountId: { in: accountIds }
          },
          _count: {
            id: true
          }
        })
        console.log(`[getAccountsAction] Direct account trade counts:`, tradeCounts)

        // Also get trade counts for prop firm phases
        const propFirmAccounts = accounts.filter(account => account.propfirm)
        console.log(`[getAccountsAction] Prop firm accounts count:`, propFirmAccounts.length)

        let phaseTradeCounts: any[] = []
        if (propFirmAccounts.length > 0) {
          const phaseIds = await prisma.accountPhase.findMany({
            where: {
              accountId: { in: propFirmAccounts.map(account => account.id) }
            },
            select: { id: true, accountId: true, phaseType: true, phaseStatus: true, accountNumber: true }
          })
          console.log(`[getAccountsAction] Found ${phaseIds.length} phases for prop firm accounts:`, phaseIds)

          // Check trades linked to these phases
          const phaseTradeSample = await prisma.trade.findMany({
            where: {
              phaseId: { in: phaseIds.map(p => p.id) }
            },
            select: {
              id: true,
              phaseId: true,
              accountId: true,
              symbol: true
            },
            take: 5
          })
          console.log(`[getAccountsAction] Sample phase trades:`, phaseTradeSample)

          if (phaseIds.length > 0) {
            const result = await prisma.trade.groupBy({
              by: ['phaseId'],
              where: {
                phaseId: { in: phaseIds.map(p => p.id) }
              },
              _count: {
                id: true
              }
            })
            console.log(`[getAccountsAction] Phase trade counts:`, result)
            phaseTradeCounts = result as any[]
          }
        }

        // Create a map of account ID to trade count
        const tradeCountMap = new Map()
        tradeCounts.forEach(tc => {
          tradeCountMap.set(tc.accountId, tc._count.id)
        })

        // Add phase trade counts to account trade counts
        for (const tc of phaseTradeCounts) {
          const phaseId = tc.phaseId
          const phase = await prisma.accountPhase.findUnique({
            where: { id: phaseId },
            select: { accountId: true }
          })

          if (phase?.accountId) {
            const currentCount = tradeCountMap.get(phase.accountId) || 0
            tradeCountMap.set(phase.accountId, currentCount + tc._count.id)
          }
        }

        console.log(`[getAccountsAction] Final trade count map:`, Object.fromEntries(tradeCountMap))

        return accounts.map((account: any) => ({
          ...account,
          tradeCount: tradeCountMap.get(account.id) || 0,
          payouts: [], // Empty for performance - load on demand if needed
        }))
      },
      [`accounts-${userId}`],
      {
        tags: [`accounts-${userId}`],
        revalidate: 30 // 30 seconds cache - balanced approach for performance and freshness
      }
    )()
  } catch (error) {
    console.error('Error fetching accounts:', error)
    // Return empty array instead of throwing error to prevent frontend crashes
    return []
  }
}

export async function savePayoutAction(payout: Payout) {
  
  try {
    // First find the account to get its ID
    const userId = await getUserId()
    const account = await prisma.account.findFirst({
      where: {
        number: payout.accountNumber,
        userId: userId
      }
    })

    if (!account) {
      throw new Error('Account not found')
    }

    return await prisma.payout.upsert({
      where: {
        id: payout.id
      },
      create: {
        id: crypto.randomUUID(),
        accountNumber: payout.accountNumber,
        date: payout.date,
        amount: payout.amount,
        status: payout.status,
        account: {
          connect: {
            id: account.id
          }
        }
      },
      update: {
        accountNumber: payout.accountNumber,
        date: payout.date,
        amount: payout.amount,
        status: payout.status,
        account: {
          connect: {
            id: account.id
          }
        }
      },
    })
  } catch (error) {
    console.error('Error adding payout:', error)
    throw new Error('Failed to add payout')
  }
}

export async function deletePayoutAction(payoutId: string) {
  try {
    const userId = await getUserId()
    const payout = await prisma.payout.findUnique({
      where: { id: payoutId, account: { userId: userId } },
      include: {
        account: true
      }
    });

    if (!payout) {
      throw new Error('Payout not found');
    }

    // Delete the payout
    await prisma.payout.delete({
      where: { id: payoutId }
    });

    // Decrement the payoutCount on the account
    await prisma.account.update({
      where: {
        id: payout.account.id
      },
      data: {
        payoutCount: {
          decrement: 1
        }
      }
    });

    return true;
  } catch (error) {
    console.error('Failed to delete payout:', error);
    throw new Error('Failed to delete payout');
  }
}

export async function renameInstrumentAction(accountNumber: string, oldInstrumentName: string, newInstrumentName: string): Promise<void> {
  try {
    const userId = await getUserId()
    // Update all trades for this instrument in this account
    await prisma.trade.updateMany({
      where: {
        accountNumber: accountNumber,
        instrument: oldInstrumentName,
        userId: userId
      },
      data: {
        instrument: newInstrumentName
      }
    })
  } catch (error) {
    console.error('Error renaming instrument:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Failed to rename instrument')
  }
}

export async function checkAndResetAccountsAction() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const accountsToReset = await prisma.account.findMany({
    where: {
      resetDate: {
        lte: today,
      },
    },
  })

  for (const account of accountsToReset) {
    await prisma.account.update({
      where: {
        id: account.id
      },
      data: {
        resetDate: null,
      }
    })
  }
}


// Utility function for comprehensive cache invalidation
export async function invalidateUserCaches(userId: string) {
  try {
    const { revalidateTag } = await import('next/cache')
    revalidateTag(`accounts-${userId}`)
    revalidateTag(`user-data-${userId}`)
    revalidateTag(`grouped-trades-${userId}`)
    revalidateTag(`trades-${userId}`)
    revalidateTag(`prop-firm-accounts-${userId}`)
    revalidateTag(`prop-firm-phases-${userId}`)
  } catch (error) {
    console.error(`Failed to invalidate caches for user ${userId}:`, error)
  }
}

export async function createAccountAction(accountNumber: string) {
  try {
    const userId = await getUserId()
    const account = await prisma.account.create({
      data: {
        number: accountNumber,
        userId,
        propfirm: '',
        drawdownThreshold: 0,
        profitTarget: 0,
        isPerformance: false,
        payoutCount: 0,
      },
    })
    return account
  } catch (error) {
    console.error('Error creating account:', error)
    throw error
  }
}

// Phase-based Prop Firm Account Management

export async function getCurrentActivePhase(accountId: string) {
  try {
    const userId = await getUserId()

    // Verify account ownership
    const account = await prisma.account.findFirst({
      where: { id: accountId, userId },
      select: { id: true, status: true }
    })

    if (!account) {
      throw new Error('Account not found')
    }

    // Get current active phase
    const currentPhase = await prisma.accountPhase.findFirst({
      where: {
        accountId,
        phaseStatus: 'active'
      },
      orderBy: { phaseStartAt: 'desc' }
    })

    return currentPhase
  } catch (error) {
    console.error('Error getting current active phase:', error)
    throw error
  }
}

export async function getAccountPhases(accountId: string) {
  try {
    const userId = await getUserId()

    // Verify account ownership
    const account = await prisma.account.findFirst({
      where: { id: accountId, userId },
      select: { id: true, status: true }
    })

    if (!account) {
      throw new Error('Account not found')
    }

    // Get all phases for the account
    const phases = await prisma.accountPhase.findMany({
      where: { accountId },
      orderBy: { phaseStartAt: 'asc' },
      include: {
        _count: {
          select: { trades: true }
        }
      }
    })

    return phases
  } catch (error) {
    console.error('Error getting account phases:', error)
    throw error
  }
}

export async function linkTradesToCurrentPhase(accountId: string, trades: any[]) {
  try {
    const userId = await getUserId()

    // Verify account ownership
    const account = await prisma.account.findFirst({
      where: { id: accountId, userId },
      select: { id: true, status: true, name: true }
    })

    if (!account) {
      throw new Error('Account not found')
    }

    // Get current active phase
    const currentPhase = await getCurrentActivePhase(accountId)

    if (!currentPhase) {
      throw new Error(`No active phase found for account "${account.name || accountId}". Please set up the account phases first.`)
    }

    if (currentPhase.phaseStatus !== 'active') {
      throw new Error(`Account "${account.name || accountId}" is in ${currentPhase.phaseStatus} status. Cannot add trades to inactive phases.`)
    }

    // Check if any trades are already linked to this phase
    const existingTrades = await prisma.trade.findMany({
      where: {
        userId,
        propFirmPhaseId: currentPhase.id
      },
      select: {
        id: true,
        entryId: true,
        closeId: true,
        accountNumber: true,
        entryDate: true,
        instrument: true,
        quantity: true,
        entryPrice: true,
        closePrice: true
      }
    })

    // Create signature for existing trades to avoid duplicates
    const existingSignatures = new Set(
      existingTrades.map(trade =>
        `${trade.entryId || ''}-${trade.closeId || ''}-${trade.accountNumber}-${trade.entryDate}-${trade.instrument}-${trade.quantity}-${trade.entryPrice}-${trade.closePrice}`
      )
    )

    // Filter out duplicates and prepare trades for insertion
    const newTrades = trades.filter(trade => {
      const signature = `${trade.entryId || ''}-${trade.closeId || ''}-${trade.accountNumber}-${trade.entryDate}-${trade.instrument}-${trade.quantity}-${trade.entryPrice}-${trade.closePrice}`
      return !existingSignatures.has(signature)
    }).map(trade => ({
      ...trade,
      userId,
      propFirmPhaseId: currentPhase.id,
      accountId: accountId,
      accountNumber: currentPhase.accountNumber // Use phase account number
    }))

    if (newTrades.length === 0) {
      throw new Error('All trades already exist for this phase')
    }

    // Save trades in transaction
    const result = await prisma.$transaction(async (tx) => {
      const createdTrades = await tx.trade.createMany({
        data: newTrades,
        skipDuplicates: true
      })

      // Get account starting balance
      const account = await tx.account.findFirst({
        where: { id: currentPhase.accountId },
        select: { startingBalance: true }
      })

      // Update phase statistics
      const totalTrades = await tx.trade.count({
        where: { propFirmPhaseId: currentPhase.id }
      })

      const phaseTrades = await tx.trade.findMany({
        where: { propFirmPhaseId: currentPhase.id },
        select: {
          pnl: true,
          commission: true,
          side: true
        }
      })

      const totalPnl = phaseTrades.reduce((sum, trade) => sum + trade.pnl, 0)
      const totalCommission = phaseTrades.reduce((sum, trade) => sum + trade.commission, 0)
      const winningTrades = phaseTrades.filter(trade => trade.pnl > 0).length
      const netProfit = totalPnl - totalCommission
      const currentBalance = (account?.startingBalance || 0) + netProfit

      await tx.accountPhase.update({
        where: { id: currentPhase.id },
        data: {
          totalTrades,
          winningTrades,
          totalCommission,
          netProfitSincePhaseStart: netProfit,
          currentBalance,
          currentEquity: currentBalance,
          highestEquitySincePhaseStart: Math.max(currentPhase.highestEquitySincePhaseStart, currentBalance)
        }
      })

      return createdTrades
    })

    return {
      success: true,
      tradesAdded: result.count,
      phaseId: currentPhase.id,
      phaseType: currentPhase.phaseType,
      accountNumber: currentPhase.accountNumber,
      message: `Successfully added ${result.count} trades to ${currentPhase.phaseType} phase (Account: ${currentPhase.accountNumber})`
    }

  } catch (error) {
    console.error('Error linking trades to current phase:', error)
    throw error
  }
}

export async function checkPhaseProgression(accountId: string) {
  try {
    const userId = await getUserId()

    // Verify account ownership
    const account = await prisma.account.findFirst({
      where: { id: accountId, userId },
      select: { id: true, status: true, name: true }
    })

    if (!account) {
      throw new Error('Account not found')
    }

    // Get current active phase
    const currentPhase = await getCurrentActivePhase(accountId)

    if (!currentPhase) {
      throw new Error('No active phase found')
    }

    // Calculate current progress
    const phaseTrades = await prisma.trade.findMany({
      where: { propFirmPhaseId: currentPhase.id },
      select: { pnl: true, commission: true }
    })

    const totalPnl = phaseTrades.reduce((sum, trade) => sum + trade.pnl, 0)
    const totalCommission = phaseTrades.reduce((sum, trade) => sum + trade.commission, 0)
    const netProfit = totalPnl - totalCommission

    // Check if profit target is reached
    if (currentPhase.profitTarget && netProfit >= currentPhase.profitTarget) {
      // Progress to next phase
      return await progressAccountPhase(accountId, currentPhase)
    }

    return {
      currentPhase,
      netProfit,
      profitTarget: currentPhase.profitTarget,
      progressPercentage: currentPhase.profitTarget ? (netProfit / currentPhase.profitTarget) * 100 : 0,
      canProgress: currentPhase.profitTarget ? netProfit >= currentPhase.profitTarget : false
    }

  } catch (error) {
    console.error('Error checking phase progression:', error)
    throw error
  }
}

export async function progressAccountPhase(accountId: string, currentPhase: any) {
  try {
    const userId = await getUserId()

    // Mark current phase as completed
    await prisma.accountPhase.update({
      where: { id: currentPhase.id },
      data: {
        phaseStatus: 'passed',
        phaseEndAt: new Date()
      }
    })

    // Determine next phase type
    let nextPhaseType: string
    let nextPhaseAccountNumber: string

    switch (currentPhase.phaseType) {
      case 'phase_1':
        nextPhaseType = 'phase_2'
        // Get phase 2 account number from user input or generate
        const phase2Phase = await prisma.accountPhase.findFirst({
          where: { accountId, phaseType: 'phase_2' },
          select: { accountNumber: true }
        })
        nextPhaseAccountNumber = phase2Phase?.accountNumber || 'Not Set'
        break
      case 'phase_2':
        nextPhaseType = 'funded'
        // Get funded account number from user input or generate
        const fundedPhase = await prisma.accountPhase.findFirst({
          where: { accountId, phaseType: 'funded' },
          select: { accountNumber: true }
        })
        nextPhaseAccountNumber = fundedPhase?.accountNumber || 'Not Set'
        break
      default:
        throw new Error('Cannot progress from funded phase')
    }

    if (nextPhaseAccountNumber === 'Not Set') {
      throw new Error(`Please set the account number for ${nextPhaseType} phase before progressing`)
    }

    // Create new active phase
    const newPhase = await prisma.accountPhase.create({
      data: {
        accountId,
        phaseType: nextPhaseType as any,
        phaseStatus: 'active',
        accountNumber: nextPhaseAccountNumber,
        phaseStartAt: new Date()
      }
    })

    return {
      success: true,
      previousPhase: currentPhase.phaseType,
      newPhase: nextPhaseType,
      message: `Account progressed from ${currentPhase.phaseType} to ${nextPhaseType}`
    }

  } catch (error) {
    console.error('Error progressing account phase:', error)
    throw error
  }
}

export async function getAccountHistory(accountId: string) {
  try {
    const userId = await getUserId()

    // Verify account ownership
    const account = await prisma.account.findFirst({
      where: { id: accountId, userId },
      select: { id: true, name: true, status: true, masterId: true }
    })

    if (!account) {
      throw new Error('Account not found')
    }

    // Get all phases with trade counts and statistics
    const phases = await prisma.accountPhase.findMany({
      where: { accountId },
      orderBy: { phaseStartAt: 'asc' },
      include: {
        _count: {
          select: { trades: true }
        },
        trades: {
          select: {
            pnl: true,
            commission: true,
            createdAt: true
          },
          orderBy: { createdAt: 'asc' }
        }
      }
    })

    // Calculate total statistics
    const totalTrades = phases.reduce((sum, phase) => sum + phase._count.trades, 0)
    const totalPnl = phases.reduce((sum, phase) =>
      sum + phase.trades.reduce((tradeSum, trade) => tradeSum + trade.pnl, 0), 0)
    const totalCommission = phases.reduce((sum, phase) =>
      sum + phase.trades.reduce((tradeSum, trade) => tradeSum + trade.commission, 0), 0)

    const netProfit = totalPnl - totalCommission
    const winningTrades = phases.reduce((sum, phase) =>
      sum + phase.trades.filter(trade => trade.pnl > 0).length, 0)

    return {
      account: {
        id: account.id,
        name: account.name,
        status: account.status,
        masterId: account.masterId
      },
      phases: phases.map(phase => ({
        id: phase.id,
        phaseType: phase.phaseType,
        phaseStatus: phase.phaseStatus,
        accountNumber: phase.accountNumber,
        profitTarget: phase.profitTarget,
        netProfit: phase.netProfitSincePhaseStart,
        totalTrades: phase._count.trades,
        winningTrades: phase.winningTrades,
        winRate: phase._count.trades > 0 ? (phase.winningTrades / phase._count.trades) * 100 : 0,
        phaseStartAt: phase.phaseStartAt,
        phaseEndAt: phase.phaseEndAt
      })),
      summary: {
        totalTrades,
        totalPnl,
        totalCommission,
        netProfit,
        winningTrades,
        winRate: totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0
      }
    }

  } catch (error) {
    console.error('Error getting account history:', error)
    throw error
  }
}

// Account Failure and Breach Detection with Static/Trailing Drawdown Support

export async function checkAccountBreaches(accountId: string) {
  try {
    const userId = await getUserId()

    // Verify account ownership with drawdown settings
    const account = await prisma.account.findFirst({
      where: { id: accountId, userId },
      select: {
        id: true,
        name: true,
        status: true,
        dailyLoss: true,
        startingBalance: true,
        drawdownModeMax: true,
        dailyDrawdownType: true,
        maxDrawdownType: true,
        drawdownThreshold: true
      }
    })

    if (!account) {
      throw new Error('Account not found')
    }

    if (account.status === 'failed') {
      return {
        isFailed: true,
        reason: 'Account already failed',
        account
      }
    }

    // Get current active phase
    const currentPhase = await getCurrentActivePhase(accountId)
    if (!currentPhase) {
      return {
        isFailed: false,
        reason: 'No active phase',
        account
      }
    }

    // Get all trades for this phase to calculate current balance
    const phaseTrades = await prisma.trade.findMany({
      where: { propFirmPhaseId: currentPhase.id },
      select: {
        pnl: true,
        commission: true,
        createdAt: true
      },
      orderBy: { createdAt: 'asc' }
    })

    const totalPnl = phaseTrades.reduce((sum, trade) => sum + trade.pnl, 0)
    const totalCommission = phaseTrades.reduce((sum, trade) => sum + trade.commission, 0)
    const netProfit = totalPnl - totalCommission
    const currentBalance = (account.startingBalance || 0) + netProfit
    const currentEquity = currentBalance

    // Check daily loss limit
    if (account.dailyLoss && account.dailyDrawdownType) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const todayTrades = phaseTrades.filter(trade =>
        new Date(trade.createdAt) >= today
      )

      const todayPnl = todayTrades.reduce((sum, trade) => sum + trade.pnl, 0)
      const todayCommission = todayTrades.reduce((sum, trade) => sum + trade.commission, 0)
      const todayNet = todayPnl - todayCommission

      // Calculate daily loss limit based on type (absolute or percent)
      let dailyLossLimit: number
      if (account.dailyDrawdownType === 'absolute') {
        dailyLossLimit = -Math.abs(account.dailyLoss)
      } else {
        dailyLossLimit = -(account.dailyLoss / 100) * account.startingBalance
      }

      if (todayNet <= dailyLossLimit) {
        return await failAccount(accountId, currentPhase, {
          type: 'daily_drawdown',
          limit: account.dailyLoss,
          actual: Math.abs(todayNet),
          message: `Daily loss limit breached: ${account.dailyLoss}${account.dailyDrawdownType === 'absolute' ? '' : '%'} (${dailyLossLimit.toFixed(2)}) exceeded by ${Math.abs(todayNet).toFixed(2)}`
        })
      }
    }

    // Check maximum drawdown limit (static vs trailing)
    if (account.drawdownThreshold > 0 && account.maxDrawdownType && account.drawdownModeMax) {
      let maxDrawdownLimit: number
      let currentDrawdown: number
      let breachType = 'max_drawdown'

      if (account.drawdownModeMax === 'trailing') {
        // Trailing drawdown: calculated from highest equity point
        if (currentPhase.highestEquitySincePhaseStart > 0) {
          maxDrawdownLimit = currentPhase.highestEquitySincePhaseStart * (account.drawdownThreshold / 100)
          currentDrawdown = currentPhase.highestEquitySincePhaseStart - currentBalance
          breachType = 'max_drawdown'
        } else {
          // No trades yet, skip trailing drawdown check
          maxDrawdownLimit = 0
          currentDrawdown = 0
        }
      } else {
        // Static drawdown: calculated from starting balance
        if (account.maxDrawdownType === 'absolute') {
          maxDrawdownLimit = Math.abs(account.drawdownThreshold)
        } else {
          maxDrawdownLimit = (account.drawdownThreshold / 100) * account.startingBalance
        }
        currentDrawdown = account.startingBalance - currentBalance
        breachType = 'max_drawdown'
      }

      if (currentDrawdown >= maxDrawdownLimit) {
        const limitDisplay = account.maxDrawdownType === 'absolute'
          ? account.drawdownThreshold
          : `${account.drawdownThreshold}% (${maxDrawdownLimit.toFixed(2)})`

        return await failAccount(accountId, currentPhase, {
          type: breachType,
          limit: account.drawdownThreshold,
          actual: (currentDrawdown / (account.drawdownModeMax === 'trailing' ? currentPhase.highestEquitySincePhaseStart : account.startingBalance)) * 100,
          message: `${account.drawdownModeMax === 'trailing' ? 'Trailing' : 'Static'} drawdown limit breached: ${limitDisplay} exceeded by ${currentDrawdown.toFixed(2)}`
        })
      }
    }

    return {
      isFailed: false,
      currentBalance,
      netProfit,
      account
    }

  } catch (error) {
    console.error('Error checking account breaches:', error)
    throw error
  }
}

export async function failAccount(accountId: string, currentPhase: any, breachDetails: any) {
  try {
    const userId = await getUserId()

    // Get account information for breach record
    const account = await prisma.account.findFirst({
      where: { id: accountId, userId },
      select: { startingBalance: true }
    })

    // Get phase trades to calculate current equity
    const phaseTrades = await prisma.trade.findMany({
      where: { propFirmPhaseId: currentPhase.id },
      select: { pnl: true, commission: true }
    })

    const totalPnl = phaseTrades.reduce((sum, trade) => sum + trade.pnl, 0)
    const totalCommission = phaseTrades.reduce((sum, trade) => sum + trade.commission, 0)
    const currentEquity = (account?.startingBalance || 0) + (totalPnl - totalCommission)

    // Mark current phase as failed
    await prisma.accountPhase.update({
      where: { id: currentPhase.id },
      data: {
        phaseStatus: 'failed',
        phaseEndAt: new Date()
      }
    })

    // Mark account as failed
    await prisma.account.update({
      where: { id: accountId },
      data: { status: 'failed' }
    })

    // Create breach record using DrawdownBreach model
    await prisma.drawdownBreach.create({
      data: {
        phaseId: currentPhase.id,
        accountId: accountId,
        breachType: breachDetails.type as any,
        breachAmount: breachDetails.actual,
        limitAmount: breachDetails.limit,
        equityAtBreach: currentEquity,
        balanceAtBreach: currentEquity
      }
    })

    return {
      success: true,
      failureType: breachDetails.type,
      message: `Account failed due to ${breachDetails.type} breach`,
      breachDetails
    }

  } catch (error) {
    console.error('Error failing account:', error)
    throw error
  }
}

export async function getFailedAccountsHistory() {
  try {
    const userId = await getUserId()

    // Get all failed accounts with their phases
    const failedAccounts = await prisma.account.findMany({
      where: {
        userId,
        status: 'failed'
      },
      select: {
        id: true,
        name: true,
        masterId: true,
        createdAt: true,
        phases: {
          include: {
            _count: {
              select: { trades: true }
            },
            trades: {
              select: {
                pnl: true,
                commission: true,
                createdAt: true
              }
            },
            breaches: {
              orderBy: { breachTime: 'desc' }
            }
          },
          orderBy: { phaseStartAt: 'asc' }
        }
      }
    })

    return failedAccounts.map((account: any) => {
      const totalTrades = account.phases.reduce((sum: number, phase: any) => sum + phase._count.trades, 0)
      const totalPnl = account.phases.reduce((sum: number, phase: any) =>
        sum + phase.trades.reduce((tradeSum: number, trade: any) => tradeSum + trade.pnl, 0), 0)
      const totalCommission = account.phases.reduce((sum: number, phase: any) =>
        sum + phase.trades.reduce((tradeSum: number, trade: any) => tradeSum + trade.commission, 0), 0)
      const netProfit = totalPnl - totalCommission
      const winningTrades = account.phases.reduce((sum: number, phase: any) =>
        sum + phase.trades.filter((trade: any) => trade.pnl > 0).length, 0)

      return {
        account: {
          id: account.id,
          name: account.name,
          masterId: account.masterId,
          createdAt: account.createdAt
        },
        phases: account.phases.map((phase: any) => ({
          id: phase.id,
          phaseType: phase.phaseType,
          accountNumber: phase.accountNumber,
          phaseStatus: phase.phaseStatus,
          totalTrades: phase._count.trades,
          netProfit: phase.netProfitSincePhaseStart,
          winRate: phase._count.trades > 0 ? (phase.winningTrades / phase._count.trades) * 100 : 0,
          phaseStartAt: phase.phaseStartAt,
          phaseEndAt: phase.phaseEndAt,
          breach: phase.breaches[0] // Get the first breach that caused the failure
        })),
        summary: {
          totalTrades,
          totalPnl,
          totalCommission,
          netProfit,
          winningTrades,
          winRate: totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0
        }
      }
    })

  } catch (error) {
    console.error('Error getting failed accounts history:', error)
    throw error
  }
}

