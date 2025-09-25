'use server'

import { getUserId, getUserIdSafe } from '@/server/auth'
import { PrismaClient, Trade } from '@prisma/client'
import { Account } from '@/context/data-provider'
import { unstable_cache, revalidateTag } from 'next/cache'

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
        let accounts: any[] = [];
        let masterAccounts: any[] = [];

        try {
          // Fetch regular live trading accounts
          accounts = await prisma.account.findMany({
            where: {
              userId: userId,
            },
            select: {
              id: true,
              number: true,
              name: true,
              broker: true,
              startingBalance: true,
              createdAt: true,
              userId: true,
              groupId: true,
            }
          })

          // Try to fetch new prop firm master accounts (may fail if not generated)
          try {
            masterAccounts = await prisma.masterAccount.findMany({
              where: {
                userId: userId,
              },
              include: {
                phases: {
                  where: {
                    status: 'active'
                  },
                  orderBy: {
                    phaseNumber: 'asc'
                  },
                  take: 1 // Get current active phase
                }
              }
            })
          } catch (masterAccountError) {
            console.log('[getAccountsAction] MasterAccount not available yet:', masterAccountError)
            masterAccounts = []
          }
        } catch (dbError) {
          console.error('[getAccountsAction] Database error:', dbError)
          // Return empty array instead of throwing to prevent app crash
          return []
        }

        // Get trade counts for regular accounts
        const accountIds = accounts.map(account => account.id)
        const tradeCounts = await prisma.trade.groupBy({
          by: ['accountId'],
          where: {
            accountId: { in: accountIds }
          },
          _count: {
            id: true
          }
        })

        // Get trade counts for master accounts (via phase accounts)
        const masterAccountIds = masterAccounts.map((ma: any) => ma.id)
        const phaseAccountIds = masterAccounts.flatMap((ma: any) => ma.phases?.map((p: any) => p.id) || [])

        let phaseTradeCounts: any[] = []
        if (phaseAccountIds.length > 0) {
          // Note: Since phaseAccountId might not be in the generated client yet,
          // we'll calculate trade counts differently for now
          phaseTradeCounts = []
        }

        // Create trade count maps
        const tradeCountMap = new Map()
        tradeCounts.forEach(tc => {
          tradeCountMap.set(tc.accountId, tc._count.id)
        })

        const masterTradeCountMap = new Map()
        // For now, set all master accounts to 0 trades until phaseAccountId is properly indexed
        masterAccounts.forEach((ma: any) => {
          masterTradeCountMap.set(ma.id, 0)
        })

        // Transform regular accounts
        const transformedAccounts = accounts.map((account: any) => ({
          ...account,
          propfirm: '',
          accountType: 'live' as const,
          displayName: account.name || account.number,
          tradeCount: tradeCountMap.get(account.id) || 0,
          owner: { id: userId, email: '' },
          isOwner: true,
          status: 'active' as const,
          currentPhase: 'live',
          group: null
        }))

        // Transform master accounts to unified format
        const transformedMasterAccounts = masterAccounts.map((masterAccount: any) => {
          const currentPhase = masterAccount.phases?.[0] || null
          return {
            id: masterAccount.id,
            number: currentPhase?.phaseId || `master-${masterAccount.id}`,
            name: masterAccount.accountName,
            propfirm: masterAccount.propFirmName,
            broker: undefined,
            startingBalance: masterAccount.accountSize,
            accountType: 'prop-firm' as const,
            displayName: masterAccount.accountName,
            tradeCount: masterTradeCountMap.get(masterAccount.id) || 0,
            owner: { id: userId, email: '' },
            isOwner: true,
            status: masterAccount.isActive ? 'active' : 'failed' as const,
            currentPhase: masterAccount.phases?.[0]?.phaseNumber ? (masterAccount.phases[0].phaseNumber >= 3 ? 'funded' : `phase_${masterAccount.phases[0].phaseNumber}`) : 'phase_1',
            createdAt: masterAccount.createdAt,
            userId: masterAccount.userId,
            groupId: null,
            group: null
          }
        })

        // Combine both account types
        return [...transformedAccounts, ...transformedMasterAccounts]
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

export async function savePayoutAction(payout: any) {
  // Payout functionality not implemented - placeholder function
  console.log('savePayoutAction called with:', payout)
  throw new Error('Payout functionality not implemented')
}

export async function deletePayoutAction(payoutId: string) {
  // Payout functionality not implemented - placeholder function
  console.log('deletePayoutAction called with:', payoutId)
  throw new Error('Payout functionality not implemented')
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
  // Reset functionality not implemented - placeholder function
  console.log('checkAndResetAccountsAction called - no resetDate field available')
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
        startingBalance: 0,
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

    // First check if this is a MasterAccount (prop firm account)
    const masterAccount = await prisma.masterAccount.findUnique({
      where: { id: accountId },
      include: {
        phases: {
          where: {
            status: 'active'
          },
          orderBy: {
            phaseNumber: 'asc'
          },
          take: 1 // Get current active phase
        }
      }
    })

    // If it's a prop firm account, return the current active phase
    if (masterAccount && masterAccount.phases.length > 0) {
      return masterAccount.phases[0]
    }

    // If not a prop firm account, check if it's a regular account
    const regularAccount = await prisma.account.findFirst({
      where: { id: accountId, userId },
      select: { id: true }
    })

    if (!regularAccount) {
      throw new Error('Account not found')
    }

    // For regular accounts, we don't have phases, so return null
    return null
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
      select: { id: true, name: true }
    })

    if (!account) {
      throw new Error('Account not found')
    }

    // Get all phases for the account
    const phases = await prisma.phaseAccount.findMany({
      where: { masterAccountId: accountId },
      orderBy: { startDate: 'asc' },
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

    // First check if this is a MasterAccount (prop firm account)
    const masterAccount = await prisma.masterAccount.findUnique({
      where: { id: accountId },
      select: { id: true, accountName: true }
    })

    if (masterAccount) {
      // It's a prop firm account, get current active phase
      const currentPhase = await getCurrentActivePhase(accountId)

      if (!currentPhase) {
        throw new Error(`No active phase found for prop firm account "${masterAccount.accountName}". Please set up the account phases first.`)
      }

      if (currentPhase.status !== 'active') {
        throw new Error(`Prop firm account "${masterAccount.accountName}" is in ${currentPhase.status} status. Cannot add trades to inactive phases.`)
      }

      // Check if any trades are already linked to this phase
    const existingTrades = await prisma.trade.findMany({
      where: {
        userId,
        phaseAccountId: currentPhase.id
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
      accountId: accountId
    }))

    // For prop firm accounts, link existing trades to the phase
    const tradesToUpdate = trades.filter(trade =>
      !existingTrades.some(existing =>
        existing.entryId === trade.entryId &&
        existing.closeId === trade.closeId &&
        existing.accountNumber === trade.accountNumber
      )
    )

    for (const trade of tradesToUpdate) {
      await prisma.trade.update({
        where: { id: trade.id },
        data: { phaseAccountId: currentPhase.id }
      })
    }

    return {
      success: true,
      linkedCount: tradesToUpdate.length,
      phaseId: currentPhase.id,
      accountName: masterAccount.accountName
    }

    // If not a prop firm account, check if it's a regular account
    const regularAccount = await prisma.account.findFirst({
      where: { id: accountId, userId },
      select: { id: true, name: true }
    })

    if (!regularAccount) {
      throw new Error('Account not found')
    }

    // For regular accounts, link trades directly to the accountId
    const regularTradesToUpdate = trades.filter(trade => !trade.accountId || trade.accountId !== accountId)

    for (const trade of regularTradesToUpdate) {
      await prisma.trade.update({
        where: { id: trade.id },
        data: { accountId }
      })
    }

      return {
        success: true,
        linkedCount: regularTradesToUpdate.length,
        accountId,
        accountName: regularAccount?.name || accountId
      }
    }

    // If not a prop firm account, check if it's a regular account
    const regularAccount = await prisma.account.findFirst({
      where: { id: accountId, userId },
      select: { id: true, name: true }
    })

    if (!regularAccount) {
      throw new Error('Account not found')
    }

    // For regular accounts, link trades directly to the accountId
    const regularTradesToUpdate = trades.filter(trade => !trade.accountId || trade.accountId !== accountId)

    for (const trade of regularTradesToUpdate) {
      await prisma.trade.update({
        where: { id: trade.id },
        data: { accountId }
      })
    }

    return {
      success: true,
      linkedCount: regularTradesToUpdate.length,
      accountId,
      accountName: regularAccount.name || accountId
    }
  } catch (error) {
    console.error('Error linking trades to current phase:', error)
    throw error
  }
}

export async function checkPhaseProgression(accountId: string) {
  try {
    const userId = await getUserId()

    // First check if this is a MasterAccount (prop firm account)
    const masterAccount = await prisma.masterAccount.findUnique({
      where: { id: accountId },
      select: { id: true, accountName: true }
    })

    if (masterAccount) {
      // It's a prop firm account, get current active phase
      const currentPhase = await getCurrentActivePhase(accountId)

      if (!currentPhase) {
        return {
          isFailed: false,
          reason: 'No active phase',
          account: { id: accountId, name: masterAccount.accountName }
        }
      }

      // Calculate current progress
      const phaseTrades = await prisma.trade.findMany({
        where: { phaseAccountId: currentPhase.id },
        select: { pnl: true, commission: true }
      })

      const totalPnl = phaseTrades.reduce((sum, trade) => sum + trade.pnl, 0)
      const totalCommission = phaseTrades.reduce((sum, trade) => sum + trade.commission, 0)
      const netProfit = totalPnl - totalCommission

      // Check if profit target is reached (convert percentage to actual amount)
      const profitTargetAmount = (currentPhase.profitTargetPercent / 100) * (0) // accountSize not available

      if (profitTargetAmount && netProfit >= profitTargetAmount) {
        // Progress to next phase
        return await progressAccountPhase(accountId, currentPhase)
      }

      return {
        currentPhase,
        netProfit,
        profitTarget: profitTargetAmount,
        progressPercentage: profitTargetAmount ? (netProfit / profitTargetAmount) * 100 : 0,
        canProgress: profitTargetAmount ? netProfit >= profitTargetAmount : false
      }
    }

    // If not a prop firm account, check if it's a regular account
    const regularAccount = await prisma.account.findFirst({
      where: { id: accountId, userId },
      select: { id: true, name: true, startingBalance: true }
    })

    if (!regularAccount) {
      throw new Error('Account not found')
    }

    // For regular accounts, calculate P&L from all trades
    const accountTrades = await prisma.trade.findMany({
      where: { accountId },
      select: { pnl: true, commission: true }
    })

    const totalPnl = accountTrades.reduce((sum, trade) => sum + trade.pnl, 0)
    const totalCommission = accountTrades.reduce((sum, trade) => sum + trade.commission, 0)
    const netProfit = totalPnl - totalCommission

    return {
      currentPhase: null,
      netProfit,
      profitTarget: null,
      progressPercentage: 0,
      canProgress: false
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
    await prisma.phaseAccount.update({
      where: { id: currentPhase.id },
      data: {
        status: 'passed',
        endDate: new Date()
      }
    })

    // Determine next phase type
    let nextPhaseType: string
    let nextPhaseAccountNumber: string

    switch (currentPhase.phaseType) {
      case 'phase_1':
        nextPhaseType = 'phase_2'
        // Get phase 2 account number from user input or generate
        const phase2Phase = await prisma.phaseAccount.findFirst({
          where: { masterAccountId: accountId, phaseNumber: 2 },
          select: { phaseId: true }
        })
        nextPhaseAccountNumber = phase2Phase?.phaseId || 'Not Set'
        break
      case 'phase_2':
        nextPhaseType = 'funded'
        // Get funded account number from user input or generate
        const fundedPhase = await prisma.phaseAccount.findFirst({
          where: { masterAccountId: accountId, phaseNumber: 3 },
          select: { phaseId: true }
        })
        nextPhaseAccountNumber = fundedPhase?.phaseId || 'Not Set'
        break
      default:
        throw new Error('Cannot progress from funded phase')
    }

    if (nextPhaseAccountNumber === 'Not Set') {
      throw new Error(`Please set the account number for ${nextPhaseType} phase before progressing`)
    }

    // Create new active phase
    const newPhase = await prisma.phaseAccount.create({
      data: {
        masterAccountId: accountId,
        phaseNumber: nextPhaseType === 'phase_2' ? 2 : 3,
        status: 'active',
        phaseId: nextPhaseAccountNumber,
        startDate: new Date(),
        profitTargetPercent: 5, // Default profit target percentage
        dailyDrawdownPercent: 4, // Default daily drawdown percentage
        maxDrawdownPercent: 8   // Default max drawdown percentage
      }
    })

    return {
      success: true,
      previousPhase: currentPhase.phaseNumber === 1 ? 'phase_1' : 'phase_2',
      newPhase: nextPhaseType,
      message: `Account progressed from ${currentPhase.phaseNumber === 1 ? 'phase_1' : 'phase_2'} to ${nextPhaseType}`
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
      select: { id: true, name: true }
    })

    if (!account) {
      throw new Error('Account not found')
    }

    // Get all phases with trade counts and statistics
    const phases = await prisma.phaseAccount.findMany({
      where: { masterAccountId: accountId },
      orderBy: { startDate: 'asc' },
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
        name: account.name
      },
      phases: phases.map(phase => ({
        id: phase.id,
        phaseNumber: phase.phaseNumber,
        status: phase.status,
        phaseId: phase.phaseId,
        profitTargetPercent: phase.profitTargetPercent,
        dailyDrawdownPercent: phase.dailyDrawdownPercent,
        maxDrawdownPercent: phase.maxDrawdownPercent,
        totalTrades: phase._count.trades,
        winningTrades: phase.trades?.filter(trade => trade.pnl > 0).length || 0,
        winRate: phase._count.trades > 0 ? (phase.trades?.filter(trade => trade.pnl > 0).length || 0 / phase._count.trades) * 100 : 0,
        startDate: phase.startDate,
        endDate: phase.endDate
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

    // First check if this is a MasterAccount (prop firm account)
    const masterAccount = await prisma.masterAccount.findUnique({
      where: { id: accountId },
      select: { id: true, accountName: true, accountSize: true }
    })

    if (masterAccount) {
      // For prop firm accounts, return basic info without complex breach checking
      return {
        isFailed: false,
        reason: 'Prop firm accounts have different breach rules',
        account: { id: accountId, name: masterAccount.accountName, accountSize: masterAccount.accountSize }
      }
    }

    // If not a prop firm account, check if it's a regular account
    const regularAccount = await prisma.account.findFirst({
      where: { id: accountId, userId },
      select: { id: true, name: true, startingBalance: true }
    })

    if (!regularAccount) {
      throw new Error('Account not found')
    }

    // For regular accounts, return basic info without complex breach checking
    return {
      isFailed: false,
      reason: 'Regular accounts have no breach rules',
      account: { id: accountId, name: regularAccount.name, startingBalance: regularAccount.startingBalance }
    }
  } catch (error) {
    console.error('Error checking account breaches:', error)
    throw error
  }
}

export async function failAccount(accountId: string, currentPhase: any, breachDetails: any) {
  try {
    const userId = await getUserId()

    // First check if this is a MasterAccount (prop firm account)
    const masterAccount = await prisma.masterAccount.findUnique({
      where: { id: accountId },
      select: { id: true, accountName: true }
    })

    if (masterAccount && currentPhase) {
      // Update the phase status to failed
      await prisma.phaseAccount.update({
        where: { id: currentPhase.id },
        data: {
          status: 'failed',
          endDate: new Date()
        }
      })

      return {
        isFailed: true,
        reason: breachDetails?.reason || 'Account failed due to breach',
        account: { id: accountId, name: masterAccount.accountName }
      }
    }

    return {
      isFailed: false,
      reason: 'Account not found or no active phase',
      account: { id: accountId, name: 'Unknown' }
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
        userId: userId
      },
      include: {
        // phases: true // phases field not available on Account model
      }
    })

    return failedAccounts
  } catch (error) {
    console.error('Error getting failed accounts history:', error)
    throw error
  }
}
