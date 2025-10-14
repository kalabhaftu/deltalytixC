/**
 * Batched Database Operations
 * 
 * Provides utilities for efficient batch operations
 * Reduces database round trips and improves performance
 */

import { prisma } from '@/lib/prisma'
import { Trade, Account, Prisma } from '@prisma/client'

/**
 * Batch create trades with transaction
 * More efficient than creating one-by-one
 */
export async function batchCreateTrades(
  trades: Prisma.TradeCreateInput[]
): Promise<{ count: number; errors: any[] }> {
  const errors: any[] = []
  let count = 0

  try {
    // Use createMany for bulk insert (much faster)
    const result = await prisma.trade.createMany({
      data: trades as any,
      skipDuplicates: true, // Skip trades that already exist
    })
    
    count = result.count
  } catch (error) {
    console.error('Batch create trades failed:', error)
    errors.push(error)
  }

  return { count, errors }
}

/**
 * Batch update trades with transaction
 */
export async function batchUpdateTrades(
  updates: { id: string; data: Prisma.TradeUpdateInput }[]
): Promise<{ count: number; errors: any[] }> {
  const errors: any[] = []
  let count = 0

  try {
    // Use transaction for atomic updates
    await prisma.$transaction(
      updates.map(({ id, data }) =>
        prisma.trade.update({
          where: { id },
          data,
        })
      )
    )
    
    count = updates.length
  } catch (error) {
    console.error('Batch update trades failed:', error)
    errors.push(error)
  }

  return { count, errors }
}

/**
 * Batch delete trades with transaction
 */
export async function batchDeleteTrades(
  tradeIds: string[]
): Promise<{ count: number; errors: any[] }> {
  const errors: any[] = []
  let count = 0

  try {
    // Use deleteMany for bulk delete
    const result = await prisma.trade.deleteMany({
      where: {
        id: {
          in: tradeIds,
        },
      },
    })
    
    count = result.count
  } catch (error) {
    console.error('Batch delete trades failed:', error)
    errors.push(error)
  }

  return { count, errors }
}

/**
 * Fetch multiple accounts in parallel
 */
export async function fetchAccountsInParallel(
  userId: string,
  accountIds: string[]
): Promise<Account[]> {
  try {
    // Fetch all accounts in a single query
    const accounts = await prisma.account.findMany({
      where: {
        userId,
        id: {
          in: accountIds,
        },
      },
    })
    
    return accounts
  } catch (error) {
    console.error('Parallel account fetch failed:', error)
    return []
  }
}

/**
 * Fetch trades with related data in a single query (avoid N+1)
 */
export async function fetchTradesWithRelations(
  userId: string,
  options?: {
    limit?: number
    accountIds?: string[]
    startDate?: Date
    endDate?: Date
  }
): Promise<Trade[]> {
  try {
    const { limit = 1000, accountIds, startDate, endDate } = options || {}

    const trades = await prisma.trade.findMany({
      where: {
        userId,
        ...(accountIds && accountIds.length > 0 && {
          accountId: {
            in: accountIds,
          },
        }),
        ...(startDate && {
          entryTime: {
            gte: startDate,
          },
        }),
        ...(endDate && {
          entryTime: {
            lte: endDate,
          },
        }),
      },
      orderBy: {
        entryTime: 'desc',
      },
      take: limit,
      // Eagerly load relations to avoid N+1 queries
      include: {
        account: true,
        phaseAccount: true,
      },
    })
    
    return trades as any
  } catch (error) {
    console.error('Fetch trades with relations failed:', error)
    return []
  }
}

/**
 * Batch upsert (create or update) trades
 */
export async function batchUpsertTrades(
  trades: (Prisma.TradeCreateInput & { entryId?: string })[]
): Promise<{ created: number; updated: number; errors: any[] }> {
  const errors: any[] = []
  let created = 0
  let updated = 0

  try {
    // Use transaction for atomic upserts
    const results = await prisma.$transaction(
      trades.map((trade) =>
        prisma.trade.upsert({
          where: {
            id: trade.id || `temp-${trade.entryId || Math.random().toString(36)}`,
          },
          create: trade,
          update: trade,
        })
      )
    )
    
    // Count creates vs updates (this is approximate)
    created = results.length
  } catch (error) {
    console.error('Batch upsert trades failed:', error)
    errors.push(error)
  }

  return { created, updated, errors }
}

/**
 * Optimized dashboard stats query (single query instead of multiple)
 */
export async function fetchDashboardStats(
  userId: string,
  accountIds?: string[]
) {
  try {
    // Single aggregation query for all stats
    const stats = await prisma.trade.aggregate({
      where: {
        userId,
        ...(accountIds && accountIds.length > 0 && {
          accountId: {
            in: accountIds,
          },
        }),
      },
      _count: {
        id: true,
      },
      _sum: {
        pnl: true,
        commission: true,
      },
      _avg: {
        pnl: true,
      },
    })

    // Get win/loss counts in parallel
    const [winCount, lossCount] = await Promise.all([
      prisma.trade.count({
        where: {
          userId,
          pnl: { gt: 0 },
          ...(accountIds && accountIds.length > 0 && {
            accountId: { in: accountIds },
          }),
        },
      }),
      prisma.trade.count({
        where: {
          userId,
          pnl: { lt: 0 },
          ...(accountIds && accountIds.length > 0 && {
            accountId: { in: accountIds },
          }),
        },
      }),
    ])

    return {
      totalTrades: stats._count.id,
      totalPnl: stats._sum.pnl || 0,
      totalCommission: stats._sum.commission || 0,
      avgPnl: stats._avg.pnl || 0,
      winCount,
      lossCount,
      winRate: stats._count.id > 0 ? (winCount / stats._count.id) * 100 : 0,
    }
  } catch (error) {
    console.error('Fetch dashboard stats failed:', error)
    return null
  }
}

