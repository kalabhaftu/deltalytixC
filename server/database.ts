'use server'
import { Trade, Prisma, DashboardLayout } from '@prisma/client'
import { revalidatePath, revalidateTag } from 'next/cache'
import { Widget, Layouts } from '@/app/dashboard/types/dashboard'
import { createClient, getUserId, getUserIdSafe } from './auth'
import { startOfDay } from 'date-fns'

import { prisma } from '@/lib/prisma'
import { unstable_cache } from 'next/cache'
import { logger } from '@/lib/logger'

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
          closeId: cleanTrade.closeId || null,
          comment: cleanTrade.comment || null,
                  imageBase64: cleanTrade.imageBase64 || null,
        imageBase64Second: cleanTrade.imageBase64Second || null,
        imageBase64Third: (cleanTrade as any).imageBase64Third || null,
        imageBase64Fourth: (cleanTrade as any).imageBase64Fourth || null,
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

      // OPTIMIZED DUPLICATE DETECTION: Use efficient batching strategy
      logger.debug(`Checking for duplicate trades for user ${userId}`, { count: cleanedData.length }, 'SaveTrades')
      
      // For small datasets (< 100 trades), use optimized batch approach
      if (cleanedData.length < 100) {
        // Get all potentially matching trades in one query using date range
        const dateRange = {
          min: new Date(Math.min(...cleanedData.map(t => new Date(t.entryDate).getTime()))),
          max: new Date(Math.max(...cleanedData.map(t => new Date(t.closeDate || t.entryDate).getTime())))
        }
        
        const existingTrades = await prisma.trade.findMany({
          where: { 
            userId,
            accountNumber: { in: [...new Set(cleanedData.map(t => t.accountNumber))] },
            entryDate: { gte: dateRange.min.toISOString(), lte: dateRange.max.toISOString() }
          },
          select: {
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

        // Create set of existing signatures for fast lookup
        const existingSignatures = new Set(
          existingTrades.map(trade => 
            `${trade.entryId || ''}-${trade.closeId || ''}-${trade.accountNumber}-${trade.entryDate}-${trade.instrument}-${trade.quantity}-${trade.entryPrice}-${trade.closePrice}`
          )
        )

        // Filter out duplicate trades
        const newTrades = cleanedData.filter(trade => {
          const signature = `${trade.entryId || ''}-${trade.closeId || ''}-${trade.accountNumber}-${trade.entryDate}-${trade.instrument}-${trade.quantity}-${trade.entryPrice}-${trade.closePrice}`
          return !existingSignatures.has(signature)
        })

        logger.debug(`Found ${cleanedData.length - newTrades.length} duplicate trades, ${newTrades.length} new trades to add`, { 
          total: cleanedData.length, 
          duplicates: cleanedData.length - newTrades.length, 
          new: newTrades.length 
        }, 'SaveTrades')

        if (newTrades.length === 0) {
          return {
            error: 'DUPLICATE_TRADES',
            numberOfTradesAdded: 0,
            details: `All ${cleanedData.length} trades already exist`
          }
        }

        // Add only new trades
        const result = await prisma.trade.createMany({
          data: newTrades,
          skipDuplicates: true
        })

        revalidatePath('/')
        return {
          error: false,
          numberOfTradesAdded: result.count,
          details: {
            totalProcessed: cleanedData.length,
            duplicatesSkipped: cleanedData.length - newTrades.length,
            newTradesAdded: result.count
          }
        }
      }

      // For larger datasets, use batch processing with skipDuplicates
      logger.debug(`Large dataset detected (${cleanedData.length} trades), using batch processing`, {}, 'SaveTrades')
      
      const result = await prisma.trade.createMany({
        data: cleanedData,
        skipDuplicates: true
      })

      logger.debug(`Batch processing completed: ${result.count} trades added`, { 
        total: cleanedData.length, 
        added: result.count,
        skipped: cleanedData.length - result.count
      }, 'SaveTrades')


      revalidatePath('/')
      return {
        error: false,
        numberOfTradesAdded: result.count,
        details: {
          totalProcessed: cleanedData.length,
          duplicatesSkipped: cleanedData.length - result.count,
          newTradesAdded: result.count
        }
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
        console.log('[saveTradesAction] Database connection error - returning specific error')
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
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user && !userId) {
        // No user found, returning empty array
        return []
      }

    const actualUserId = userId || user?.id
    if (!actualUserId) {
      if (process.env.NODE_ENV === 'development') {
      }
      return []
    }

    const page = options?.page || 1
    const limit = options?.limit || 100
    const offset = options?.offset || (page - 1) * limit

    // PERFORMANCE OPTIMIZATION: Use paginated queries for better memory efficiency
    return unstable_cache(
      async () => {
        try {
          let whereClause: any = { userId: actualUserId }

          // Apply filters if provided
          if (options?.filters?.dateRange?.from && options?.filters?.dateRange?.to) {
            whereClause.entryDate = {
              gte: options.filters.dateRange.from,
              lte: options.filters.dateRange.to
            }
          }

          if (options?.filters?.instruments?.length) {
            whereClause.instrument = { in: options.filters.instruments }
          }

          if (options?.filters?.accountNumbers?.length) {
            whereClause.accountNumber = { in: options.filters.accountNumbers }
          }

          const query: any = {
            where: whereClause,
            orderBy: { entryDate: 'desc' },
            skip: offset,
            take: limit
          }

          const trades = await prisma.trade.findMany(query)

          // Loaded trades successfully

          return trades.map(trade => ({
            ...trade,
            entryDate: new Date(trade.entryDate).toISOString(),
            exitDate: trade.closeDate ? new Date(trade.closeDate).toISOString() : null
          }))
        } catch (error) {
          if (error instanceof Error) {
            // Handle table doesn't exist error
            if (error.message.includes('does not exist')) {
              // Trade table does not exist yet, returning empty array
              return []
            }
            // Handle database connection errors
            if (error.message.includes("Can't reach database server") ||
                error.message.includes('P1001') ||
                error.message.includes('connection') ||
                error.message.includes('timeout')) {
              // Database connection error, returning empty array
              return []
            }
          }
          // Unexpected error occurred
          return [] // Return empty array instead of throwing
        }
      },
      [`trades-${actualUserId}-${page}-${limit}-${offset}-${JSON.stringify(options?.filters || {})}`],
      {
        tags: [`trades-${actualUserId}`],
        revalidate: 1800 // 30 minutes cache
      }
    )()

  } catch (error) {
    // Error in getTradesAction
    // Return empty array if there's any error
    return []
  }
}


export async function updateTradesAction(tradesIds: string[], update: Partial<Trade>): Promise<number> {
  try {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const userId = user?.id
  if (!userId) {
    return 0
  }

  const result = await prisma.trade.updateMany({
    where: { id: { in: tradesIds }, userId },
    data: update
  })

  revalidateTag(`trades-${userId}`)

  return result.count
  } catch (error) {
    console.error('[updateTrades] Database error:', error)
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
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error("[updateTradeComment] Known database error:", {
        code: error.code,
        message: error.message
      })
    } else {
      console.error("[updateTradeComment] Unknown error:", error)
    }
    throw error
  }
}

export async function loadDashboardLayoutAction(): Promise<Layouts | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const userId = user?.id
  if (!userId) {
    throw new Error('User not found')
  }
  try {
    const dashboard = await prisma.dashboardLayout.findUnique({
      where: { userId },
    })
    
    if (!dashboard) {
      return null
    }

    // Safely parse JSON with fallback to empty arrays
    const parseJsonSafely = (jsonData: Prisma.JsonValue): Widget[] => {
      try {
        // If it's already an array, return it (we trust it's valid Widget data)
        if (Array.isArray(jsonData)) {
          return (jsonData as unknown) as Widget[]
        }
        // If it's a string, parse it
        if (typeof jsonData === 'string') {
          return JSON.parse(jsonData)
        }
        // Otherwise return empty array
        return []
      } catch (error) {
        console.error('[loadDashboardLayout] JSON parse error:', error)
        return []
      }
    }

    return {
      desktop: parseJsonSafely(dashboard.desktop),
      mobile: parseJsonSafely(dashboard.mobile)
    }
  } catch (error) {
    console.error('[loadDashboardLayout] Database error:', error)
    return null
  }
}

export async function saveDashboardLayoutAction(layouts: DashboardLayout): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const userId = user?.id
  if (!userId || !layouts) {
    console.error('[saveDashboardLayout] Invalid input:', { userId, hasLayouts: !!layouts })
    return
  }

  try {
    // Ensure layouts are valid arrays before stringifying
    const desktopLayout = Array.isArray(layouts.desktop) ? layouts.desktop : []
    const mobileLayout = Array.isArray(layouts.mobile) ? layouts.mobile : []

    const dashboard = await prisma.dashboardLayout.upsert({
      where: { userId },
      update: {
        desktop: JSON.stringify(desktopLayout),
        mobile: JSON.stringify(mobileLayout),
        updatedAt: new Date()
      },
      create: {
        userId,
        desktop: JSON.stringify(desktopLayout),
        mobile: JSON.stringify(mobileLayout)
      },
    })
    
  } catch (error) {
    console.error('[saveDashboardLayout] Database error:', error)
  }
}

export async function groupTradesAction(tradeIds: string[]): Promise<boolean> {
  try {
    const userId = await getUserIdSafe()

    // If user is not authenticated, return false
    if (!userId) {
      console.log('[groupTrades] User not authenticated, returning false')
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
    console.error('[groupTrades] Database error:', error)
    return false
  }
}

export async function ungroupTradesAction(tradeIds: string[]): Promise<boolean> {
  try {
    const userId = await getUserIdSafe()

    // If user is not authenticated, return false
    if (!userId) {
      console.log('[ungroupTrades] User not authenticated, returning false')
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
    console.error('[ungroupTrades] Database error:', error)
    return false
  }
}
