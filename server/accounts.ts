'use server'

import { getUserId, getUserIdSafe } from '@/server/auth'
import { Trade } from '@prisma/client'
import { Account } from '@/context/data-provider'
import { unstable_cache, revalidateTag } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { convertDecimal } from '@/lib/utils/decimal'
import { NotificationService } from './services/notification-service'
import { NotificationType } from '@prisma/client'

/**
 * Helper function to determine if a phase number represents the funded stage
 * based on the evaluation type.
 */
function isFundedPhase(evaluationType: string, phaseNumber: number): boolean {
  switch (evaluationType) {
    case 'Two Step':
      return phaseNumber >= 3
    case 'One Step':
      return phaseNumber >= 2
    case 'Instant':
      return phaseNumber >= 1
    default:
      return phaseNumber >= 3 // Default to Two Step behavior
  }
}

/**
 * Helper function to get display name for a phase - stage only (Phase 1, Phase 2, Funded)
 */
function getPhaseDisplayName(evaluationType: string, phaseNumber: number): string {
  if (isFundedPhase(evaluationType, phaseNumber)) {
    return 'Funded'
  }
  return `Phase ${phaseNumber}`
}

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

  // Use shared decimal conversion utility
  const serializedTrades = trades.map(trade => ({
    ...trade,
    entryPrice: convertDecimal(trade.entryPrice),
    closePrice: convertDecimal(trade.closePrice),
    stopLoss: convertDecimal(trade.stopLoss),
    takeProfit: convertDecimal(trade.takeProfit),
  })) as any

  const groupedTrades = serializedTrades.reduce((acc: any, trade: any) => {
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
    flattenedTrades: serializedTrades
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
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Failed to rename account')
  }
}

export async function deleteTradesByIdsAction(tradeIds: string[]): Promise<void> {
  try {
    const userId = await getUserId()

    // Batch delete for large sets to avoid timeout
    const BATCH_SIZE = 500
    const totalBatches = Math.ceil(tradeIds.length / BATCH_SIZE)

    for (let i = 0; i < totalBatches; i++) {
      const start = i * BATCH_SIZE
      const end = Math.min(start + BATCH_SIZE, tradeIds.length)
      const batch = tradeIds.slice(start, end)

      await prisma.trade.deleteMany({
        where: {
          id: { in: batch },
          userId: userId
        }
      })
    }

    // Invalidate caches after all deletes complete
    await invalidateUserCaches(userId)

  } catch (error) {
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
    balanceToDate,
    ...baseAccountData
  } = account

  if (existingAccount) {
    return await prisma.account.update({
      where: { id: existingAccount.id },
      data: baseAccountData
    })
  }

  return await prisma.account.create({
    data: {
      id: crypto.randomUUID(),
      ...baseAccountData,
      User: {
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

export async function getAccountsAction(options?: { includeArchived?: boolean }) {
  try {
    const userId = await getUserIdSafe()
    const { includeArchived = false } = options || {}

    // If user is not authenticated, return empty array instead of throwing error
    if (!userId) {
      return []
    }

    // IMPORTANT: Removed unstable_cache wrapper to prevent "items over 2MB cannot be cached" errors
    // Account data with many phases and trades can exceed Next.js 2MB cache limit
    // Database queries are already fast with proper indexing
    let accounts: any[] = [];
    let masterAccounts: any[] = [];

    try {
      // Build where clause for live accounts
      const accountWhere: any = { userId: userId }
      if (!includeArchived) {
        accountWhere.isArchived = false
      }

      // Fetch regular live trading accounts with optimized query
      const accountsPromise = prisma.account.findMany({
        where: accountWhere,
        select: {
          id: true,
          number: true,
          name: true,
          broker: true,
          startingBalance: true,
          createdAt: true,
          userId: true,
          isArchived: true,
        },
        orderBy: {
          createdAt: 'desc' // Show newest accounts first
        }
      })

      // Build where clause for prop firm accounts
      const masterAccountWhere: any = { userId: userId }
      if (!includeArchived) {
        masterAccountWhere.isArchived = false
      }

      // Fetch prop firm master accounts in parallel with better error handling
      const masterAccountsPromise = prisma.masterAccount.findMany({
        where: masterAccountWhere,
        include: {
          PhaseAccount: {
            orderBy: {
              phaseNumber: 'desc' // Most recent first
            },
            take: 10 // Get latest 10 phases
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      }).catch((masterAccountError) => {
        return []
      })

      // Execute both queries in parallel for better performance
      const [regularAccounts, propFirmAccounts] = await Promise.all([
        accountsPromise,
        masterAccountsPromise
      ])

      accounts = regularAccounts
      masterAccounts = propFirmAccounts
    } catch (dbError) {
      // Return empty array instead of throwing to prevent app crash
      return []
    }

    // PERFORMANCE FIX: Single trade count query instead of duplicate
    // Both live and prop-firm accounts use accountNumber field, so one query is sufficient
    const tradeCounts = await prisma.trade.groupBy({
      by: ['accountNumber'],
      where: { userId },
      _count: { id: true }
    })

    // Create a single map for quick lookup (used for both account types)
    const tradeCountMap = new Map(
      tradeCounts.map(tc => [tc.accountNumber, tc._count.id])
    )

    // Transform regular accounts
    const transformedAccounts = accounts.map((account: any) => ({
      ...account,
      propfirm: '',
      accountType: 'live' as const,
      displayName: account.name || account.number,
      tradeCount: tradeCountMap.get(account.number) || 0,
      owner: { id: userId, email: '' },
      isOwner: true,
      status: 'active' as const,
      currentPhase: 'live',
      group: null,
      isArchived: account.isArchived || false
    }))

    // Transform master accounts to unified format - create one entry per phase
    // Only include active and funded phases (accounts page has its own status filter)
    const transformedMasterAccounts: any[] = []
    masterAccounts.forEach((masterAccount: any) => {

      if (masterAccount.PhaseAccount && masterAccount.PhaseAccount.length > 0) {
        // Check if this master account has any failed phases
        const hasFailedPhase = masterAccount.PhaseAccount.some((p: any) => p.status === 'failed')
        const isMasterAccountFailed = masterAccount.status === 'failed'

        // Get all phaseIds for this master account (for aggregation when failed)
        // Only calculate aggregation if there's a failed phase (for accounts page display)
        // Create one entry for each phase (excluding pending phases)
        masterAccount.PhaseAccount.forEach((phase: any) => {
          // Skip pending phases - they don't exist yet until user reaches them
          if (phase.status === 'pending') return

          // Determine if this phase is the funded phase based on evaluation type
          const phaseName = getPhaseDisplayName(masterAccount.evaluationType, phase.phaseNumber)

          // Always use individual phase trade count
          // Aggregation for failed phases will be calculated on the client side (accounts page)
          const phaseTradeCount = tradeCountMap.get(phase.phaseId) || 0

          transformedMasterAccounts.push({
            id: phase.id, // Use phase ID instead of composite key
            number: phase.phaseId,
            name: masterAccount.accountName,
            propfirm: masterAccount.propFirmName,
            broker: undefined,
            startingBalance: phase.accountSize || masterAccount.accountSize,
            accountType: 'prop-firm' as const,
            displayName: `${masterAccount.accountName} (${phaseName})`,
            tradeCount: phaseTradeCount,
            owner: { id: userId, email: '' },
            isOwner: true,
            status: phase.status,
            currentPhase: phase.phaseNumber,
            createdAt: phase.createdAt || masterAccount.createdAt,
            userId: masterAccount.userId,
            isArchived: masterAccount.isArchived || false,
            // Add phase details for UI components that need them (named currentPhaseDetails to match useAccounts)
            currentPhaseDetails: {
              phaseNumber: phase.phaseNumber,
              status: phase.status,
              phaseId: phase.phaseId,
              masterAccountId: masterAccount.id, // This is the key for deduplication
              masterAccountName: masterAccount.accountName,
              evaluationType: masterAccount.evaluationType // Add evaluationType for UI components
            }
          })
        })
      }
      // Remove fallback master account creation - it causes duplicates
      // If a master account has no phases, it won't be shown (correct behavior)
    })

    // Combine both account types
    return [...transformedAccounts, ...transformedMasterAccounts]
  } catch (error) {
    // Return empty array instead of throwing error to prevent frontend crashes
    return []
  }
}

/**
 * Save a payout request for a funded prop firm account
 * Business Rule: Payouts can ONLY be requested for accounts with 'Funded' status
 */
export async function savePayoutAction(payout: {
  masterAccountId: string
  phaseAccountId: string
  amount: number
  requestDate?: Date
  notes?: string
}) {
  try {
    const userId = await getUserId()

    // Validate required fields
    if (!payout.masterAccountId || !payout.phaseAccountId || !payout.amount) {
      throw new Error('Missing required payout fields: masterAccountId, phaseAccountId, and amount are required')
    }

    if (payout.amount <= 0) {
      throw new Error('Payout amount must be greater than 0')
    }

    // Verify account ownership
    const masterAccount = await prisma.masterAccount.findFirst({
      where: {
        id: payout.masterAccountId,
        userId
      },
      include: {
        PhaseAccount: {
          where: {
            id: payout.phaseAccountId
          }
        }
      }
    })

    if (!masterAccount) {
      throw new Error('Master account not found or unauthorized')
    }

    const phaseAccount = masterAccount.PhaseAccount[0]
    if (!phaseAccount) {
      throw new Error('Phase account not found')
    }

    // CRITICAL BUSINESS RULE: Only funded accounts can request payouts
    // Check if this is the funded phase based on evaluation type
    if (!isFundedPhase(masterAccount.evaluationType, phaseAccount.phaseNumber)) {
      const currentPhaseName = getPhaseDisplayName(masterAccount.evaluationType, phaseAccount.phaseNumber)
      throw new Error(`Payouts can only be requested for Funded accounts. This account is currently in ${currentPhaseName}.`)
    }

    if (phaseAccount.status !== 'active') {
      throw new Error(`Cannot request payout for ${phaseAccount.status} account. Account must be active.`)
    }

    // Calculate available balance for payout
    const trades = await prisma.trade.findMany({
      where: {
        phaseAccountId: payout.phaseAccountId
      },
      select: {
        pnl: true,
        commission: true
      }
    })

    const totalProfit = trades.reduce((sum, trade) => {
      return sum + (trade.pnl - (trade.commission || 0))
    }, 0)

    // Get existing payouts to calculate remaining balance
    const existingPayouts = await prisma.payout.findMany({
      where: {
        phaseAccountId: payout.phaseAccountId
      },
      select: {
        amount: true
      }
    })

    const totalPayouts = existingPayouts.reduce((sum: number, p: { amount: number }) => sum + p.amount, 0)
    const availableBalance = totalProfit - totalPayouts

    if (payout.amount > availableBalance) {
      throw new Error(`Insufficient balance for payout. Available: $${availableBalance.toFixed(2)}, Requested: $${payout.amount.toFixed(2)}`)
    }

    // Create the payout record
    const newPayout = await prisma.payout.create({
      data: {
        id: crypto.randomUUID(),
        masterAccountId: payout.masterAccountId,
        phaseAccountId: payout.phaseAccountId,
        amount: payout.amount,
        requestDate: payout.requestDate || new Date(),
        status: 'pending',
        notes: payout.notes || null,
        updatedAt: new Date()
      }
    })

    // Invalidate caches
    await invalidateUserCaches(userId)

    // Send notification
    await NotificationService.send({
      userId,
      type: NotificationType.SYSTEM,
      title: 'Payout Requested',
      message: `Request for $${payout.amount.toFixed(2)} submitted.`,
      data: {
        payoutId: newPayout.id,
        amount: payout.amount,
        phaseAccountId: payout.phaseAccountId
      }
    })

    return {
      success: true,
      data: newPayout,
      message: `Payout request created for $${payout.amount.toFixed(2)}`
    }
  } catch (error) {
    throw error
  }
}

/**
 * Delete a payout request
 * Can only delete pending payouts
 */
export async function deletePayoutAction(payoutId: string) {
  try {
    const userId = await getUserId()

    if (!payoutId) {
      throw new Error('Payout ID is required')
    }

    // Find the payout and verify ownership
    const payout = await prisma.payout.findUnique({
      where: { id: payoutId },
      include: {
        MasterAccount: {
          select: {
            userId: true
          }
        }
      }
    })

    if (!payout) {
      throw new Error('Payout not found')
    }

    if (payout.MasterAccount.userId !== userId) {
      throw new Error('Unauthorized: You do not own this payout')
    }

    // Only allow deletion of pending payouts
    if (payout.status !== 'pending') {
      throw new Error(`Cannot delete ${payout.status} payout. Only pending payouts can be deleted.`)
    }

    // Delete the payout
    await prisma.payout.delete({
      where: { id: payoutId }
    })

    // Invalidate caches
    await invalidateUserCaches(userId)

    return {
      success: true,
      message: 'Payout deleted successfully'
    }
  } catch (error) {
    throw error
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
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Failed to rename instrument')
  }
}

export async function checkAndResetAccountsAction() {
  // Reset functionality not implemented - placeholder function
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
    // Ignore cache invalidation errors
  }
}

export async function createAccountAction(accountNumber: string) {
  try {
    const userId = await getUserId()
    const account = await prisma.account.create({
      data: {
        id: crypto.randomUUID(),
        number: accountNumber,
        userId,
        startingBalance: 0,
      },
    })
    return account
  } catch (error) {
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
        PhaseAccount: {
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
    if (masterAccount && masterAccount.PhaseAccount.length > 0) {
      return masterAccount.PhaseAccount[0]
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
          select: { Trade: true }
        }
      }
    })

    return phases
  } catch (error) {
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

      // Optimized: Create trades with direct phase linking using createMany
      const tradesToCreate = trades.map(trade => ({
        ...trade,
        phaseAccountId: currentPhase.id,
        userId
      }))

      // Use createMany for batch insert with skipDuplicates
      const result = await prisma.trade.createMany({
        data: tradesToCreate,
        skipDuplicates: true
      })

      // If no trades were added, they're all duplicates
      if (result.count === 0) {
        return {
          success: true,
          linkedCount: 0,
          phaseAccountId: currentPhase.id,
          phaseNumber: currentPhase.phaseNumber,
          accountName: masterAccount.accountName,
          message: 'All trades already exist in this account'
        }
      }


      // Send notification for successful import
      await NotificationService.send({
        userId,
        type: NotificationType.IMPORT_STATUS,
        title: 'Trades Imported',
        message: `Successfully imported ${result.count} trades to ${masterAccount.accountName}.`,
        data: {
          count: result.count,
          accountName: masterAccount.accountName,
          phaseAccountId: currentPhase.id,
          invalidationKey: `import-${masterAccount.id}-${Date.now()}`
        }
      })

      return {
        success: true,
        linkedCount: result.count,
        phaseAccountId: currentPhase.id,
        phaseNumber: currentPhase.phaseNumber,
        accountName: masterAccount.accountName
      }
    } else {
      // Regular account - batch update
      const regularAccount = await prisma.account.findFirst({
        where: { number: trades[0]?.accountNumber }
      })

      if (!regularAccount) {
        throw new Error(`No account found with account number "${trades[0]?.accountNumber}". Please create the account first.`)
      }

      // Create trades with account linking
      const tradesToCreate = trades.map(trade => ({
        ...trade,
        accountId: regularAccount.id,
        userId
      }))

      const result = await prisma.trade.createMany({
        data: tradesToCreate,
        skipDuplicates: true
      })

      // If no trades were added, they're all duplicates
      if (result.count === 0) {
        return {
          success: true,
          linkedCount: 0,
          accountId: regularAccount.id,
          accountName: regularAccount.name || regularAccount.number,
          message: 'All trades already exist in this account'
        }
      }

      return {
        success: true,
        linkedCount: result.count,
        accountId: regularAccount.id,
        accountName: regularAccount.name || regularAccount.number
      }
    }
  } catch (error) {

    throw error
  }
}

export async function saveAndLinkTrades(accountId: string, trades: any[]) {
  try {
    const userId = await getUserId()

    // Clean the data to remove undefined values and ensure all required fields are present
    const cleanedData = trades.map(trade => {
      const cleanTrade = Object.fromEntries(
        Object.entries(trade).filter(([_, value]) => value !== undefined)
      ) as Partial<any>

      return {
        ...cleanTrade,
        accountNumber: cleanTrade.accountNumber || '',
        instrument: cleanTrade.instrument || '',
        entryPrice: cleanTrade.entryPrice || '',
        closePrice: cleanTrade.closePrice || '',
        entryDate: cleanTrade.entryDate || '',
        closeDate: cleanTrade.closeDate || '',
        quantity: cleanTrade.quantity ?? 0,
        pnl: cleanTrade.pnl || 0,
        timeInPosition: cleanTrade.timeInPosition || 0,
        userId: cleanTrade.userId || userId,
        side: cleanTrade.side || '',
        commission: cleanTrade.commission || 0,
        entryId: cleanTrade.entryId || null,
        comment: cleanTrade.comment || null,
        createdAt: cleanTrade.createdAt || new Date(),
      }
    })

    // STEP 1: PRE-TRANSACTION VALIDATION (OUTSIDE TRANSACTION - FASTER)
    // Determine if this is a prop firm or regular account BEFORE duplicate check
    const phaseAccount = await prisma.phaseAccount.findUnique({
      where: { id: accountId },
      include: {
        MasterAccount: {
          select: {
            id: true,
            accountName: true,
            accountSize: true,
            userId: true
          }
        }
      }
    })

    let isPropFirm = false
    let phaseAccountId: string | null = null
    let regularAccountId: string | null = null
    let accountName: string
    let phaseNumber: number | null = null
    let masterAccountId: string | null = null

    if (phaseAccount) {
      // It's a prop firm account
      isPropFirm = true
      phaseAccountId = phaseAccount.id
      phaseNumber = phaseAccount.phaseNumber
      accountName = phaseAccount.MasterAccount.accountName
      masterAccountId = phaseAccount.MasterAccount.id

      // Pre-check profit target OUTSIDE transaction to fail fast
      const pnlSum = await prisma.trade.aggregate({
        where: { phaseAccountId: phaseAccount.id },
        _sum: { pnl: true }
      })

      const currentPnL = pnlSum._sum.pnl || 0
      const profitTargetAmount = (phaseAccount.profitTargetPercent / 100) * phaseAccount.MasterAccount.accountSize

      if (profitTargetAmount && currentPnL >= profitTargetAmount) {
        const nextPhaseNumber = phaseAccount.phaseNumber + 1
        const nextPhaseName = nextPhaseNumber === 2 ? 'Phase 2' : nextPhaseNumber === 3 ? 'Funded' : `Phase ${nextPhaseNumber}`
        throw new Error(
          `This account has already passed ${phaseAccount.phaseNumber === 1 ? 'Phase 1' : phaseAccount.phaseNumber === 2 ? 'Phase 2' : 'the current phase'}. ` +
          `Please provide your ${nextPhaseName} account ID before importing more trades. ` +
          `Go to the account details page to complete the phase transition.`
        )
      }
    } else {
      // Try regular account
      const regularAccount = await prisma.account.findFirst({
        where: { id: accountId, userId },
        select: { id: true, name: true }
      })

      if (!regularAccount) {
        throw new Error(`Account not found (ID: ${accountId}). The account may have been deleted.`)
      }

      isPropFirm = false
      regularAccountId = accountId
      accountName = regularAccount.name || accountId
    }

    // STEP 2: DUPLICATE DETECTION (SCOPED TO SPECIFIC ACCOUNT)
    // Check for duplicates WITHIN the specific account being imported to
    const tradesWithIds = cleanedData.filter(t => t.entryId)
    const tradesWithoutIds = cleanedData.filter(t => !t.entryId)

    let newTrades = [...tradesWithoutIds] // Assume trades without IDs are new

    if (tradesWithIds.length > 0) {
      // Only query for trades that have IDs (much faster)
      const entryIds = tradesWithIds.filter(t => t.entryId).map(t => t.entryId!)

      // CRITICAL FIX: Check duplicates WITHIN the specific account, not across all accounts
      const existingTrades = await prisma.trade.findMany({
        where: {
          userId,
          entryId: { in: entryIds },
          // Scope to the specific account being imported to
          ...(isPropFirm
            ? { phaseAccountId: phaseAccountId! }
            : { accountId: regularAccountId! }
          )
        },
        select: {
          entryId: true
        }
      })

      const existingEntryIds = new Set(existingTrades.map(t => t.entryId).filter(Boolean))

      // Filter out duplicates
      newTrades.push(...tradesWithIds.filter(trade => {
        if (trade.entryId && existingEntryIds.has(trade.entryId)) return false
        return true
      }))
    }

    if (newTrades.length === 0) {
      return {
        success: true,
        linkedCount: 0,
        totalTrades: cleanedData.length,
        message: `All ${cleanedData.length} trades already exist in this account - no new trades to import`,
        isDuplicate: true
      }
    }

    // STEP 3: OPTIMIZED BATCH PROCESSING
    // Use larger batch sizes and avoid transaction overhead for simple inserts
    const BATCH_SIZE = 1000 // Increased from 500 for better throughput
    const totalBatches = Math.ceil(newTrades.length / BATCH_SIZE)
    let totalCreated = 0

    // Pre-process all trades once (avoid doing this per batch)
    const allTradesToCreate = newTrades.map(trade => {
      const cleanTrade: any = {}

      // Only include non-null fields
      for (const key of Object.keys(trade)) {
        const value = (trade as any)[key]
        if (value !== null && value !== undefined) {
          cleanTrade[key] = value
        }
      }

      // Add linking fields
      cleanTrade.phaseAccountId = isPropFirm ? phaseAccountId : null
      cleanTrade.accountId = isPropFirm ? null : regularAccountId

      return cleanTrade
    })

    // Process trades in batches without transaction wrapper (createMany is already atomic)
    for (let i = 0; i < totalBatches; i++) {
      const start = i * BATCH_SIZE
      const end = Math.min(start + BATCH_SIZE, allTradesToCreate.length)
      const batch = allTradesToCreate.slice(start, end)

      // Direct createMany - faster than wrapping in transaction
      const createResult = await prisma.trade.createMany({
        data: batch,
        skipDuplicates: true // Extra safety for duplicates
      })

      totalCreated += createResult.count
    }

    // Build result
    const result = {
      success: true,
      linkedCount: totalCreated,
      totalTrades: newTrades.length,
      phaseAccountId,
      phaseNumber,
      accountId: regularAccountId,
      accountName,
      isPropFirm,
      masterAccountId,
      evaluation: undefined as any,
      isDuplicate: false
    }

    // AUTO-EVALUATION: Check for breaches synchronously (FAST - breach detection only)
    if (result.isPropFirm && result.phaseAccountId && result.masterAccountId) {
      try {
        const { PhaseEvaluationEngine } = await import('@/lib/prop-firm/phase-evaluation-engine')

        const evaluation = await PhaseEvaluationEngine.evaluatePhase(
          result.masterAccountId,
          result.phaseAccountId
        )

        // CRITICAL: Check for PASSING first (profit target achieved)
        if (evaluation.isPassed && evaluation.canAdvance) {
          if (!phaseAccount) {
            throw new Error('Phase account not found')
          }

          const currentPhaseNumber = phaseAccount.phaseNumber
          const nextPhaseNumber = currentPhaseNumber + 1

          // Get master account to determine if there's a next phase
          const masterAccountData = await prisma.masterAccount.findUnique({
            where: { id: result.masterAccountId },
            include: { PhaseAccount: { orderBy: { phaseNumber: 'asc' } } }
          })

          if (!masterAccountData) {
            throw new Error('Master account not found')
          }

          // Check if next phase exists
          const nextPhase = masterAccountData.PhaseAccount.find(p => p.phaseNumber === nextPhaseNumber)

          if (nextPhase) {
            // Check if next phase has a phaseId (account number)
            // If not, this requires MANUAL transition (user must provide next phase account ID)
            if (!nextPhase.phaseId || nextPhase.phaseId.trim() === '') {
              // Determine if the next phase is the FUNDED phase
              const isTransitioningToFunded = isFundedPhase(masterAccountData.evaluationType, nextPhaseNumber)

              // Determine the display name for the next phase
              const nextPhaseName = isTransitioningToFunded ? 'Funded' : `Phase ${nextPhaseNumber}`

              // Set phase to pending_approval and create appropriate notification
              await prisma.$transaction([
                prisma.phaseAccount.update({
                  where: { id: result.phaseAccountId },
                  data: { status: 'pending_approval', endDate: new Date() }
                }),
                // Create different notification based on whether transitioning to funded or another eval phase
                prisma.notification.create({
                  data: isTransitioningToFunded ? {
                    // FUNDED transition: Needs approval first, then ID
                    userId: userId,
                    type: 'FUNDED_PENDING_APPROVAL',
                    title: 'Congratulations! Evaluation Complete!',
                    message: `Your ${masterAccountData.accountName} has passed all evaluation phases! Please confirm once your prop firm approves your funded account.`,
                    data: {
                      masterAccountId: result.masterAccountId,
                      phaseAccountId: result.phaseAccountId,
                      accountName: masterAccountData.accountName,
                      propFirmName: masterAccountData.propFirmName,
                      currentPhaseNumber: currentPhaseNumber,
                      nextPhaseNumber: nextPhaseNumber,
                      evaluationType: masterAccountData.evaluationType
                    },
                    actionRequired: true
                  } : {
                    // NON-FUNDED transition: Just needs ID
                    userId: userId,
                    type: 'PHASE_TRANSITION_PENDING',
                    title: `Phase ${currentPhaseNumber} Complete!`,
                    message: `Your ${masterAccountData.accountName} has met the profit target! Enter your ${nextPhaseName} account ID to continue.`,
                    data: {
                      masterAccountId: result.masterAccountId,
                      phaseAccountId: result.phaseAccountId,
                      accountName: masterAccountData.accountName,
                      propFirmName: masterAccountData.propFirmName,
                      currentPhaseNumber: currentPhaseNumber,
                      nextPhaseNumber: nextPhaseNumber,
                      evaluationType: masterAccountData.evaluationType
                    },
                    actionRequired: true
                  }
                })
              ])

                // Return different status based on whether transitioning to funded or another eval phase
                ; (result as any).evaluation = isTransitioningToFunded ? {
                  // FUNDED: Use pending_approval - notification handles approval flow
                  status: 'pending_approval',
                  reason: 'awaiting_firm_approval',
                  message: `Congratulations! Your evaluation is complete. Please confirm your firm's approval via notifications.`,
                  requiresManualTransition: true,
                  nextPhase: nextPhaseNumber,
                  currentPnL: evaluation.progress?.currentPnL || 0,
                  profitTargetPercent: evaluation.progress?.profitTargetPercent || 0,
                  currentPhaseNumber: currentPhaseNumber,
                  evaluationType: masterAccountData.evaluationType,
                  propFirmName: masterAccountData.propFirmName
                } : {
                  // NON-FUNDED: Use ready_for_transition - direct ID dialog
                  status: 'ready_for_transition',
                  reason: 'profit_target_achieved',
                  message: `Phase ${currentPhaseNumber} profit target achieved! Ready to advance to ${nextPhaseName}.`,
                  requiresManualTransition: true,
                  nextPhase: nextPhaseNumber,
                  currentPnL: evaluation.progress?.currentPnL || 0,
                  profitTargetPercent: evaluation.progress?.profitTargetPercent || 0,
                  currentPhaseNumber: currentPhaseNumber,
                  evaluationType: masterAccountData.evaluationType,
                  propFirmName: masterAccountData.propFirmName
                }
            } else {
              // Next phase has an account ID - safe to auto-advance
              await prisma.$transaction([
                // Mark current phase as passed
                prisma.phaseAccount.update({
                  where: { id: result.phaseAccountId },
                  data: { status: 'passed', endDate: new Date() }
                }),
                // Activate next phase
                prisma.phaseAccount.update({
                  where: { id: nextPhase.id },
                  data: {
                    status: 'active',
                    startDate: new Date()
                  }
                }),
                // Update master account current phase
                prisma.masterAccount.update({
                  where: { id: result.masterAccountId },
                  data: { currentPhase: nextPhaseNumber }
                })
              ])

              // Determine the display name for the next phase
              const autoNextPhaseName = isFundedPhase(masterAccountData.evaluationType, nextPhaseNumber)
                ? 'Funded'
                : `Phase ${nextPhaseNumber}`

                ; (result as any).evaluation = {
                  status: 'passed',
                  reason: 'profit_target_achieved',
                  message: `Phase ${currentPhaseNumber} passed! Advanced to ${autoNextPhaseName}`,
                  nextPhase: nextPhaseNumber,
                  currentPhaseNumber: currentPhaseNumber,
                  evaluationType: masterAccountData.evaluationType,
                  propFirmName: masterAccountData.propFirmName
                }
            }
          } else {
            // This was the final evaluation phase - waiting for firm approval
            // Use pending_approval status until user confirms firm's decision
            await prisma.$transaction([
              prisma.phaseAccount.update({
                where: { id: result.phaseAccountId },
                data: { status: 'pending_approval', endDate: new Date() }
              }),
              // Create notification for user to take action
              prisma.notification.create({
                data: {
                  userId: userId,
                  type: 'FUNDED_PENDING_APPROVAL',
                  title: 'Congratulations! Awaiting Firm Approval',
                  message: `Your ${masterAccountData.accountName} account has met the profit target! Please update when the firm confirms your funded status.`,
                  data: {
                    masterAccountId: result.masterAccountId,
                    phaseAccountId: result.phaseAccountId,
                    accountName: masterAccountData.accountName,
                    propFirmName: masterAccountData.propFirmName
                  },
                  actionRequired: true
                }
              })
            ])

            result.evaluation = {
              status: 'pending_approval',
              reason: 'awaiting_firm_approval',
              message: `Congratulations! Your account met the profit target. Waiting for firm approval...`,
              currentPhaseNumber: currentPhaseNumber,
              evaluationType: masterAccountData.evaluationType,
              propFirmName: masterAccountData.propFirmName
            }
          }

          // Invalidate cache so UI updates
          await invalidateUserCaches(userId)
        }
        // Check for FAILURE (breach detected)
        else if (evaluation.isFailed) {
          // Fetch account size for breach record
          const phaseAccountData = await prisma.phaseAccount.findUnique({
            where: { id: result.phaseAccountId },
            include: { MasterAccount: { select: { accountSize: true } } }
          })

          await prisma.$transaction([
            prisma.phaseAccount.update({
              where: { id: result.phaseAccountId },
              data: { status: 'failed', endDate: new Date() }
            }),
            prisma.masterAccount.update({
              where: { id: result.masterAccountId },
              data: {
                status: 'failed'
              }
            }),
            prisma.breachRecord.create({
              data: {
                id: crypto.randomUUID(),
                phaseAccountId: result.phaseAccountId,
                breachType: evaluation.drawdown.breachType || 'max_drawdown',
                breachAmount: evaluation.drawdown.breachAmount || 0,
                breachTime: evaluation.drawdown.breachTime || new Date(),
                currentEquity: evaluation.drawdown.currentEquity,
                accountSize: phaseAccountData?.MasterAccount.accountSize || 0,
                dailyStartBalance: evaluation.drawdown.dailyStartBalance,
                highWaterMark: evaluation.drawdown.highWaterMark,
                notes: `Auto-detected breach during trade import. ${evaluation.drawdown.breachType?.replace('_', ' ')} exceeded by $${evaluation.drawdown.breachAmount?.toFixed(2)}`
              }
            })
          ])

          // Invalidate cache immediately so UI updates
          await invalidateUserCaches(userId)

          // Add evaluation result to response for user feedback
          result.evaluation = {
            status: 'failed',
            reason: evaluation.drawdown.breachType,
            message: `Account failed due to ${evaluation.drawdown.breachType?.replace('_', ' ')} breach`
          }
        }
        // Account is still in progress
        else {
          const progressPercent = evaluation.progress?.profitTargetPercent?.toFixed(1) || '0.0'

          result.evaluation = {
            status: 'in_progress',
            reason: 'profit_target_not_met',
            message: `Phase in progress: ${progressPercent}% of profit target achieved`,
            progressPercent: parseFloat(progressPercent)
          }
        }
      } catch (evalError) {
        // Don't fail the import if evaluation fails
      }
    }

    // Invalidate caches after successful import
    await invalidateUserCaches(userId)

    return result
  } catch (error) {
    throw error
  }
}

export async function checkPhaseProgression(accountId: string) {
  try {
    const userId = await getUserId()

    // First check if this is a MasterAccount (prop firm account)
    const masterAccount = await prisma.masterAccount.findUnique({
      where: { id: accountId },
      select: { id: true, accountName: true, accountSize: true }
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
      const profitTargetAmount = (currentPhase.profitTargetPercent / 100) * masterAccount.accountSize

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
    throw error
  }
}

export async function progressAccountPhase(masterAccountId: string, currentPhase: any) {
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

    // Determine next phase number
    let nextPhaseNumber: number
    let nextPhaseAccountNumber: string

    switch (currentPhase.phaseNumber) {
      case 1:
        nextPhaseNumber = 2
        // Get phase 2 account number from user input or generate
        const phase2Phase = await prisma.phaseAccount.findFirst({
          where: { masterAccountId, phaseNumber: 2 },
          select: { phaseId: true }
        })
        nextPhaseAccountNumber = phase2Phase?.phaseId || 'Not Set'
        break
      case 2:
        nextPhaseNumber = 3 // Funded
        // Get funded account number from user input or generate
        const fundedPhase = await prisma.phaseAccount.findFirst({
          where: { masterAccountId, phaseNumber: 3 },
          select: { phaseId: true }
        })
        nextPhaseAccountNumber = fundedPhase?.phaseId || 'Not Set'
        break
      default:
        throw new Error('Cannot progress from funded phase')
    }

    if (nextPhaseAccountNumber === 'Not Set') {
      throw new Error(`Please set the account number for phase ${nextPhaseNumber} before progressing`)
    }

    // Activate the next phase by updating its status and phaseId
    const nextPhase = await prisma.phaseAccount.findFirst({
      where: { masterAccountId, phaseNumber: nextPhaseNumber, status: 'pending' }
    })

    if (!nextPhase) {
      throw new Error(`Next phase (${nextPhaseNumber}) not found or not in pending status`)
    }

    const updatedPhase = await prisma.phaseAccount.update({
      where: { id: nextPhase.id },
      data: {
        status: 'active',
        phaseId: nextPhaseAccountNumber,
        startDate: new Date()
      }
    })

    // Update master account current phase
    await prisma.masterAccount.update({
      where: { id: masterAccountId },
      data: { currentPhase: nextPhaseNumber }
    })

    return {
      success: true,
      previousPhase: currentPhase.phaseNumber,
      newPhase: nextPhaseNumber,
      message: `Account progressed from phase ${currentPhase.phaseNumber} to phase ${nextPhaseNumber}`
    }

  } catch (error) {
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
          select: { Trade: true }
        },
        Trade: {
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
    const totalTrades = phases.reduce((sum, phase) => sum + phase._count.Trade, 0)
    const totalPnl = phases.reduce((sum, phase) =>
      sum + phase.Trade.reduce((tradeSum, trade) => tradeSum + trade.pnl, 0), 0)
    const totalCommission = phases.reduce((sum, phase) =>
      sum + phase.Trade.reduce((tradeSum, trade) => tradeSum + trade.commission, 0), 0)

    const netProfit = totalPnl - totalCommission
    // CRITICAL FIX: Use NET P&L (after commission) for win categorization
    const winningTrades = phases.reduce((sum, phase) =>
      sum + phase.Trade.filter(trade => (trade.pnl - (trade.commission || 0)) > 0).length, 0)

    return {
      account: {
        id: account.id,
        name: account.name
      },
      phases: phases.map(phase => {
        // Calculate win rate excluding break-even trades
        const phaseWins = phase.Trade?.filter(trade => (trade.pnl - (trade.commission || 0)) > 0).length || 0
        const phaseLosses = phase.Trade?.filter(trade => (trade.pnl - (trade.commission || 0)) < 0).length || 0
        const tradableCount = phaseWins + phaseLosses

        return {
          id: phase.id,
          phaseNumber: phase.phaseNumber,
          status: phase.status,
          phaseId: phase.phaseId,
          profitTargetPercent: phase.profitTargetPercent,
          dailyDrawdownPercent: phase.dailyDrawdownPercent,
          maxDrawdownPercent: phase.maxDrawdownPercent,
          totalTrades: phase._count.Trade,
          winningTrades: phaseWins,
          winRate: tradableCount > 0 ? (phaseWins / tradableCount) * 100 : 0,
          startDate: phase.startDate,
          endDate: phase.endDate
        }
      }),
      summary: {
        totalTrades,
        totalPnl,
        totalCommission,
        netProfit,
        winningTrades,
        // Calculate summary win rate excluding break-even
        winRate: totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0
      }
    }

  } catch (error) {
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
      // Update the phase status to failed and master account status
      await prisma.$transaction([
        prisma.phaseAccount.update({
          where: { id: currentPhase.id },
          data: {
            status: 'failed',
            endDate: new Date()
          }
        }),
        prisma.masterAccount.update({
          where: { id: accountId },
          data: {
            status: 'failed'
          }
        })
      ])

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
    throw error
  }
}
