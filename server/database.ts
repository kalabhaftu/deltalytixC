'use server'
import { Trade, Prisma } from '@prisma/client'
import { revalidatePath, revalidateTag } from 'next/cache'
import { Widget, Layouts } from '@/app/dashboard/types/dashboard'
import { createClient, getUserId, getUserIdSafe } from './auth'
import { startOfDay } from 'date-fns'

import { prisma } from '@/lib/prisma'
import { unstable_cache } from 'next/cache'
import { logger } from '@/lib/logger'
import { convertDecimal } from '@/lib/utils/decimal'

type TradeError = 
  | 'DUPLICATE_TRADES'
  | 'NO_TRADES_ADDED'
  | 'DATABASE_ERROR'
  | 'INVALID_DATA'
  | 'DATABASE_CONNECTION_ERROR'

interface TradeResponse {
  error: TradeError | false
  numberOfTradesAdded: number
  details?: unknown
}

interface TradeQueryWhere {
  userId: string
  entryDate?: { gte: string }
}

interface TradeCountQuery {
  where: TradeQueryWhere
}

interface TradeQuery extends TradeCountQuery {
  orderBy: { entryDate: 'desc' }
  skip: number
  take: number
}

export async function revalidateCache(tags: string[]) {
  tags.forEach(tag => {
    try {
      revalidateTag(tag)
    } catch (error) {
      logger.error(`Error revalidating tag ${tag}`, error, 'Cache')
    }
  })
}

export async function saveTradesAction(data: Trade[]): Promise<TradeResponse> {
    if (!Array.isArray(data) || data.length === 0) {
      return {
        error: 'INVALID_DATA',
        numberOfTradesAdded: 0,
        details: 'No trades provided'
      }
    }

    try {
      // Clean the data to remove undefined values and ensure all required fields are present
      const cleanedData = data.map(trade => {
        const cleanTrade = Object.fromEntries(
          Object.entries(trade).filter(([_, value]) => value !== undefined)
        ) as Partial<Trade>
        
        return {
          ...cleanTrade,
          // Ensure required fields have default values
          accountNumber: cleanTrade.accountNumber || '',
          instrument: cleanTrade.instrument || '',
          entryPrice: cleanTrade.entryPrice || '',
          closePrice: cleanTrade.closePrice || '',
          entryDate: cleanTrade.entryDate || '',
          closeDate: cleanTrade.closeDate || '',
          quantity: cleanTrade.quantity ?? 0,
          pnl: cleanTrade.pnl || 0,
          timeInPosition: cleanTrade.timeInPosition || 0,
          userId: cleanTrade.userId || '',
          side: cleanTrade.side || '',
          commission: cleanTrade.commission || 0,
          entryId: cleanTrade.entryId || null,
          comment: cleanTrade.comment || null,
          groupId: cleanTrade.groupId || null,
          createdAt: cleanTrade.createdAt || new Date(),
        } as Trade
      })

      // Note: We now allow unlinked trades to be saved first, then linked in a separate step
      // This validation is removed to support the save-then-link flow

      const userId = cleanedData[0]?.userId
      if (!userId) {
        return {
          error: 'INVALID_DATA',
          numberOfTradesAdded: 0,
          details: 'No user ID found in trades'
        }
      }

      // Database-level deduplication: Let PostgreSQL handle duplicate detection via unique constraint
      // This is much more efficient than JavaScript-based filtering
      logger.debug(`Inserting ${cleanedData.length} trades with database-level deduplication`, { userId }, 'SaveTrades')
      
      const result = await prisma.trade.createMany({
        data: cleanedData as any,
        skipDuplicates: true // Database constraint handles duplicate rejection efficiently
      })

      logger.debug(`Batch insert completed: ${result.count} trades added`, { 
        total: cleanedData.length, 
        added: result.count,
        skipped: cleanedData.length - result.count
      }, 'SaveTrades')


      revalidatePath('/')
      return {
        error: false,
        numberOfTradesAdded: result.count,
        details: `Processed ${cleanedData.length} entries. ${result.count} new trades added.`
      }
    } catch(error) {
      logger.error('Database error in saveTrades', error, 'saveTrades')
      
      // Handle database connection errors more gracefully
      if (error instanceof Error && (
        error.message.includes("Can't reach database server") ||
        error.message.includes('P1001') ||
        error.message.includes('Connection timeout') ||
        error.message.includes('ECONNREFUSED') ||
        error.message.includes('ENOTFOUND')
      )) {
        return { 
          error: 'DATABASE_CONNECTION_ERROR', 
          numberOfTradesAdded: 0,
          details: 'Database is temporarily unavailable. Please check your database connection and try again.'
        }
      }
      
      // Handle other database errors
      return { 
        error: 'DATABASE_ERROR', 
        numberOfTradesAdded: 0,
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    }
}



export async function getTradesAction(userId: string | null = null, options?: {
  page?: number
  limit?: number
  offset?: number
  filters?: {
    dateRange?: { from: Date; to: Date }
    instruments?: string[]
    accountNumbers?: string[]
  }
}): Promise<Trade[]> {
  try {
    // PERFORMANCE FIX: If userId is provided (from DataProvider), use it directly
    // Only fetch from auth if no userId provided (rare case)
    let actualUserId = userId
    
    if (!actualUserId) {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return []
      }
      actualUserId = user.id
    }

    const page = options?.page || 1
    const limit = options?.limit || 100000 // Load all trades by default
    const offset = options?.offset || (page - 1) * limit

    // IMPORTANT: Removed unstable_cache wrapper to prevent "items over 2MB cannot be cached" errors
    // Trade data with images and large datasets exceeds Next.js 2MB cache limit
    // Database queries are already fast with proper indexing
    try {
      let whereClause: any = { userId: actualUserId }

      // CRITICAL: Primary account filter - fetch only selected accounts
      // PERFORMANCE FIX: Use accountNumbers from filters
      const accountsFilter = options?.filters?.accountNumbers
      if (accountsFilter?.length) {
        whereClause.accountNumber = { in: accountsFilter }
      }

      // Apply additional filters if provided
      if (options?.filters?.dateRange?.from && options?.filters?.dateRange?.to) {
        whereClause.entryDate = {
          gte: options.filters.dateRange.from,
          lte: options.filters.dateRange.to
        }
      }

      if (options?.filters?.instruments?.length) {
        whereClause.instrument = { in: options.filters.instruments }
      }

      const query: any = {
        where: whereClause,
        orderBy: { entryDate: 'desc' },
        skip: offset,
        take: limit
      }

      const trades = await prisma.trade.findMany(query)

      // Use shared decimal conversion utility
      return trades.map(trade => ({
        ...trade,
        entryPrice: convertDecimal(trade.entryPrice),
        closePrice: convertDecimal(trade.closePrice),
        stopLoss: convertDecimal(trade.stopLoss),
        takeProfit: convertDecimal(trade.takeProfit),
        entryDate: new Date(trade.entryDate).toISOString(),
        exitDate: trade.closeDate ? new Date(trade.closeDate).toISOString() : null
      })) as any
    } catch (error) {
      if (error instanceof Error) {
        // Handle table doesn't exist error
        if (error.message.includes('does not exist')) {
          return []
        }
        // Handle database connection errors
        if (error.message.includes("Can't reach database server") ||
            error.message.includes('P1001') ||
            error.message.includes('connection') ||
            error.message.includes('timeout')) {
          return []
        }
      }
      // Unexpected error occurred
      return []
    }

  } catch (error) {
    // Error in getTradesAction
    // Return empty array if there's any error
    return []
  }
}


export async function updateTradesAction(tradesIds: string[], update: Partial<Trade>): Promise<number> {
  try {
    // CRITICAL: Convert auth_user_id to internal user.id
    const authUserId = await getUserIdSafe()
    if (!authUserId) {
      return 0
    }

    // Look up internal user ID
    const userLookup = await prisma.user.findUnique({
      where: { auth_user_id: authUserId },
      select: { id: true }
    })

    if (!userLookup) {
      return 0
    }

    const internalUserId = userLookup.id

    const result = await prisma.trade.updateMany({
      where: { id: { in: tradesIds }, userId: internalUserId },
      data: update as any
    })

    revalidateTag(`trades-${internalUserId}`)

    return result.count
  } catch (error) {
    return 0
  }
}

export async function updateTradeCommentAction(tradeId: string, comment: string | null) {
  try {
    await prisma.trade.update({
      where: { id: tradeId },
      data: { comment }
    })
    revalidatePath('/')
  } catch (error) {
    throw error
  }
}

// Dashboard layout functions removed - DashboardLayout table doesn't exist in schema
// These functions are deprecated and should not be used
export async function loadDashboardLayoutAction(): Promise<Layouts | null> {
  return null
}

export async function saveDashboardLayoutAction(layouts: any): Promise<void> {
  return
}

export async function groupTradesAction(tradeIds: string[]): Promise<boolean> {
  try {
    const userId = await getUserIdSafe()

    // If user is not authenticated, return false
    if (!userId) {
      return false
    }

    // Generate a new group ID
    const groupId = crypto.randomUUID()

    // Update all selected trades with the new group ID
    await prisma.trade.updateMany({
      where: {
        id: { in: tradeIds },
        userId // Ensure we only update the user's own trades
      },
      data: { groupId }
    })

    revalidatePath('/')
    return true
  } catch (error) {
    return false
  }
}

export async function ungroupTradesAction(tradeIds: string[]): Promise<boolean> {
  try {
    const userId = await getUserIdSafe()

    // If user is not authenticated, return false
    if (!userId) {
      return false
    }

    // Remove group ID from selected trades
    await prisma.trade.updateMany({
      where: {
        id: { in: tradeIds },
        userId // Ensure we only update the user's own trades
      },
      data: { groupId: "" }
    })

    revalidatePath('/')
    return true
  } catch (error) {
    return false
  }
}
