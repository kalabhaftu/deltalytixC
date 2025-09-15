'use server'
import { Trade, Prisma, DashboardLayout } from '@prisma/client'
import { revalidatePath, revalidateTag } from 'next/cache'
import { Widget, Layouts } from '@/app/[locale]/dashboard/types/dashboard'
import { createClient, getUserId } from './auth'
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
  logger.debug('Starting cache invalidation for tags', tags, 'Cache')
  
  tags.forEach(tag => {
    try {
      logger.debug(`Revalidating tag: ${tag}`, undefined, 'Cache')
      revalidateTag(tag)
      logger.debug(`Successfully revalidated tag: ${tag}`, undefined, 'Cache')
    } catch (error) {
      logger.error(`Error revalidating tag ${tag}`, error, 'Cache')
    }
  })
  
  logger.debug(`Completed cache invalidation for ${tags.length} tags`, undefined, 'Cache')
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
          videoUrl: cleanTrade.videoUrl || null,
          tags: cleanTrade.tags || [],
                  imageBase64: cleanTrade.imageBase64 || null,
        imageBase64Second: cleanTrade.imageBase64Second || null,
        imageBase64Third: (cleanTrade as any).imageBase64Third || null,
        imageBase64Fourth: (cleanTrade as any).imageBase64Fourth || null,
          groupId: cleanTrade.groupId || null,
          createdAt: cleanTrade.createdAt || new Date(),
        } as Trade
      })

      const userId = cleanedData[0]?.userId
      if (!userId) {
        return {
          error: 'INVALID_DATA',
          numberOfTradesAdded: 0,
          details: 'No user ID found in trades'
        }
      }

      // ULTRA-FAST DUPLICATE DETECTION: Use database-level checking with minimal queries
      logger.debug(`Checking for duplicate trades for user ${userId}`, { count: cleanedData.length }, 'SaveTrades')
      
      // For small datasets (< 100 trades), use simple approach
      if (cleanedData.length < 100) {
        // Check for duplicates using a single optimized query
        const existingTrades = await prisma.trade.findMany({
          where: { 
            userId,
            OR: cleanedData.map(trade => ({
              entryId: trade.entryId || null,
              closeId: trade.closeId || null,
              accountNumber: trade.accountNumber,
              entryDate: trade.entryDate,
              instrument: trade.instrument,
              quantity: trade.quantity,
              entryPrice: trade.entryPrice,
              closePrice: trade.closePrice
            }))
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

      // Trigger prop firm account evaluation using the official evaluation system
      try {
        const { PropFirmAccountEvaluator } = await import('@/lib/prop-firm/account-evaluation')
        
        // Get the actual saved trades with IDs for linking
        const savedTrades = await prisma.trade.findMany({
          where: {
            userId,
            accountId: null, // Only unlinked trades
            createdAt: {
              gte: new Date(Date.now() - 5 * 60 * 1000) // Last 5 minutes
            }
          }
        })
        
        const evaluationResult = await PropFirmAccountEvaluator.linkTradesAndEvaluate(savedTrades, userId)
        
        logger.info('Prop firm evaluation completed', {
          linkedTradesCount: evaluationResult.linkedTrades.length,
          statusUpdatesCount: evaluationResult.statusUpdates.length,
          errorsCount: evaluationResult.errors.length,
          statusUpdates: evaluationResult.statusUpdates
        }, 'SaveTrades')
        
        if (evaluationResult.errors.length > 0) {
          logger.warn('Evaluation errors', { errors: evaluationResult.errors }, 'SaveTrades')
        }
      } catch (evaluationError) {
        // Log evaluation errors but don't fail the trade import
        logger.error('Failed to evaluate prop firm accounts (batch)', evaluationError, 'SaveTrades')
      }

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
    } catch(error) {
      logger.dbError('saveTrades', error)
      
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

// Create cache function dynamically for each user/subscription combination
function getCachedTrades(userId: string, isSubscribed: boolean, page: number, chunkSize: number): Promise<Trade[]> {
  return unstable_cache(
    async () => {
      console.log(`[Cache MISS] Fetching trades for user ${userId}, subscribed: ${isSubscribed}`)
      
      try {
        const query: TradeQuery = {
          where: { userId },
          orderBy: { entryDate: 'desc' },
          skip: (page - 1) * chunkSize,
          take: chunkSize
        }

        if (!isSubscribed) {
          const oneWeekAgo = startOfDay(new Date())
          oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
          query.where.entryDate = { gte: oneWeekAgo.toISOString() }
        }

        return await prisma.trade.findMany(query)
      } catch (error) {
        if (error instanceof Error) {
          // Handle table doesn't exist error
          if (error.message.includes('does not exist')) {
            console.log('[getCachedTrades] Trade table does not exist yet, returning empty array')
            return []
          }
          // Handle database connection errors
          if (error.message.includes("Can't reach database server") || 
              error.message.includes('P1001') ||
              error.message.includes('connection') ||
              error.message.includes('timeout')) {
            console.log('[getCachedTrades] Database connection error, returning empty array')
            return []
          }
        }
        console.error('[getCachedTrades] Unexpected error:', error)
        return [] // Return empty array instead of throwing
      }
    },
    // Static string array - this is the cache key
    [`trades-${userId}-${isSubscribed}-${page}`],
    { 
      tags: [`trades-${userId}`], // User-specific tag for revalidation
      revalidate: 3600 // Revalidate every hour (3600 seconds)
    }
  )()  // Note the () at the end - we call the cached function immediately
}


export async function getTradesAction(userId: string | null = null): Promise<Trade[]> {
    try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user && !userId) {
        console.log('[getTradesAction] No user found, returning empty array')
        return []
      }

    const isSubscribed = true // All users now have full access


    // Get cached trades
    // Per page
    const actualUserId = userId || user?.id
    if (!actualUserId) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[getTradesAction] No user ID available, returning empty array')
      }
      return []
    }
    
    const query: TradeCountQuery = {
      where: { 
        userId: actualUserId,
       }
    }
    if (!isSubscribed) {
      const oneWeekAgo = startOfDay(new Date())
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
      query.where.entryDate = { gte: oneWeekAgo.toISOString() }
    }
    let count;
    try {
      count = await prisma.trade.count(query)
    } catch (error) {
      if (error instanceof Error) {
        // Handle table doesn't exist error
        if (error.message.includes('does not exist')) {
          console.log('[getTradesAction] Trade table does not exist yet, returning empty array')
          return []
        }
        // Handle database connection errors
        if (error.message.includes("Can't reach database server") || 
            error.message.includes('P1001') ||
            error.message.includes('connection') ||
            error.message.includes('timeout')) {
          console.log('[getTradesAction] Database connection error, returning empty array')
          return []
        }
      }
      console.error('[getTradesAction] Unexpected error:', error)
      return [] // Return empty array instead of throwing
    }
    // Split pages by chunks of 1000
    const chunkSize = 1000
    const totalPages = Math.ceil(count / chunkSize)
    const trades: Trade[] = []
    for (let page = 1; page <= totalPages; page++) {
      const pageTrades = await getCachedTrades(actualUserId, isSubscribed, page, chunkSize)
      trades.push(...pageTrades)
    }
    console.log(`[getTrades] Found ${count} trades fetched ${trades.length}`)

    // Tell the server that the trades have changed
    // Next page reload will fetch the new trades instead of using the cached data
    return trades.map(trade => ({
      ...trade,
      entryDate: new Date(trade.entryDate).toISOString(),
      exitDate: trade.closeDate ? new Date(trade.closeDate).toISOString() : null
    }))
  } catch (error) {
    console.error('[getTradesAction] Error in main function:', error)
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

export async function updateTradeVideoUrlAction(tradeId: string, videoUrl: string | null) {
  try {
    await prisma.trade.update({
      where: { id: tradeId },
      data: { videoUrl }
    })
    revalidatePath('/')
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error("[updateTradeVideoUrl] Known database error:", {
        code: error.code,
        message: error.message
      })
    } else {
      console.error("[updateTradeVideoUrl] Unknown error:", error)
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
      console.log('[loadDashboardLayout] No layout found for user:', userId)
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
    const userId = await getUserId()
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
    const userId = await getUserId()
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
