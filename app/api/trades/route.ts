import { NextRequest, NextResponse } from 'next/server'
import { deleteTrade } from '@/server/trades'
import { getUserIdSafe } from '@/server/auth'
import { prisma } from '@/lib/prisma'
import { DataSerializer } from '@/lib/data-serialization'
import { createSuccessResponse, createErrorResponse, ErrorResponses } from '@/lib/api-response'
import { tradeQuerySchema, tradeDeleteSchema } from '@/lib/validation/trade-schemas'

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdSafe()

    if (!userId) {
      return createSuccessResponse([], undefined, { count: 0 })
    }

    const { searchParams } = new URL(request.url)
    
    // Validate query parameters
    const queryParams = {
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      accountId: searchParams.get('accountId'),
      startDate: searchParams.get('startDate'),
      endDate: searchParams.get('endDate'),
      instrument: searchParams.get('instrument'),
    }

    const validationResult = tradeQuerySchema.safeParse(queryParams)
    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: validationResult.error.errors.map(e => e.message).join(', ') },
        { status: 400 }
      )
    }

    const { page, limit } = validationResult.data
    const offset = (page - 1) * limit
    const stream = searchParams.get('stream') === 'true'
    const test = searchParams.get('test') === '1'

    // For streaming responses, use a smaller page size to avoid memory issues
    // For large requests (like loading all trades), cap at 5000 to prevent memory issues
    const actualLimit = stream ? Math.min(limit, 50) : Math.min(limit, 5000)


    // If test is requested, return a simple test response
    if (test) {

      // Test database connectivity
      let dbStatus = 'unknown'
      let tradeCount = 0
      try {
        await prisma.$queryRaw`SELECT 1 as test_connection`
        dbStatus = 'connected'

        // Get actual trade count
        const countResult = await prisma.trade.count({
          where: { userId }
        })
        tradeCount = countResult
      } catch (error) {
        console.error('API: Database connection test failed:', error)
        dbStatus = 'disconnected'
      }

      return createSuccessResponse(
        { test: true, timestamp: new Date().toISOString() },
        'API is working',
        { databaseStatus: dbStatus, tradeCount }
      )
    }

    // Regular paginated response (removed streaming for simplicity)
    const trades = await getTradesPaginated(offset, actualLimit)

    // Get total count for better UX
    const totalCount = await getTotalTradeCount()

    const responseData = {
      success: true,
      data: trades,
      count: trades.length,
      page,
      limit: actualLimit,
      hasMore: trades.length === actualLimit && offset + trades.length < totalCount,
      total: totalCount
    }


    const response = NextResponse.json(responseData)
    return response
  } catch (error) {
    console.error('API: Failed to fetch trades:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    // Handle authentication errors with 401 status
    if (errorMessage.includes('not authenticated')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Authentication required',
          timestamp: new Date().toISOString()
        },
        { status: 401 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

// Helper function for paginated trades
async function getTradesPaginated(offset: number, limit: number) {
  const userId = await getUserIdSafe()

  if (!userId) {
    throw new Error('User not authenticated')
  }

  const trades = await prisma.trade.findMany({
    where: { userId },
    include: {
      Account: true
      // phase: true, // Phase field not available
      // propFirmPhase: true, // PropFirmPhase field not available
    },
    orderBy: {
      entryTime: 'desc'
    },
    skip: offset,
    take: limit
  })

  return trades
}


// Helper function to get total count
async function getTotalTradeCount() {
  const userId = await getUserIdSafe()

  if (!userId) {
    return 0
  }

  const count = await prisma.trade.count({
    where: { userId }
  })

  return count
}

export async function PUT(request: NextRequest) {
  try {
    const updatedTrade = await request.json()

    if (!updatedTrade.id) {
      return NextResponse.json(
        { success: false, error: 'Trade ID is required' },
        { status: 400 }
      )
    }

    // Import the update function
    const { updateTradeImage } = await import('@/server/trades')

    // Handle image updates
    const imageFields = ['cardPreviewImage']

    for (const field of imageFields) {
      if (updatedTrade[field] !== undefined) {
        await updateTradeImage([updatedTrade.id], updatedTrade[field], field as any)
      }
    }

    // Handle other trade updates
    const { prisma } = await import('@/lib/prisma')
    const userId = await getUserIdSafe()

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User not authenticated' },
        { status: 401 }
      )
    }

    // Update the trade with non-image fields
    const { id, ...updateData } = updatedTrade
    delete updateData.cardPreviewImage
    delete updateData.tradingModel // Handle tradingModel separately

    // Update trading model if provided
    if (updatedTrade.tradingModel !== undefined) {
      await prisma.trade.update({
        where: { id, userId },
        data: { tradingModel: updatedTrade.tradingModel }
      })
    }

    if (Object.keys(updateData).length > 0) {
      await prisma.trade.update({
        where: { id, userId },
        data: updateData
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to update trade:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update trade' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tradeId = searchParams.get('id')

    if (!tradeId) {
      return NextResponse.json(
        { success: false, error: 'Trade ID is required' },
        { status: 400 }
      )
    }

    const result = await deleteTrade(tradeId)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Failed to delete trade:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete trade' },
      { status: 500 }
    )
  }
}

// New endpoint for progressive data loading
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdSafe()

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { action, batchSize = 50, offset = 0, filters = {} } = body


    switch (action) {
      case 'getBatch':
        const trades = await getTradesBatch(offset, batchSize, filters)
        const total = await getTotalTradeCount()
        const hasMore = offset + batchSize < total

        return NextResponse.json({
          success: true,
          data: trades,
          batchSize,
          offset,
          total,
          hasMore,
          progress: Math.min(((offset + trades.length) / total) * 100, 100)
        })

      case 'getStats':
        const stats = await getTradesStatistics(offset, batchSize)
        return NextResponse.json({
          success: true,
          data: stats
        })

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('API: Progressive data error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to process progressive request' },
      { status: 500 }
    )
  }
}

// Helper function for batch loading
async function getTradesBatch(offset: number, limit: number, filters: any = {}) {
  const userId = await getUserIdSafe()

  if (!userId) {
    throw new Error('User not authenticated')
  }

  let whereClause: any = { userId }

  // Apply filters if provided
  if (filters.dateRange?.from && filters.dateRange?.to) {
    whereClause.entryTime = {
      gte: filters.dateRange.from,
      lte: filters.dateRange.to
    }
  }

  if (filters.instruments?.length > 0) {
    whereClause.instrument = { in: filters.instruments }
  }

  if (filters.accountNumbers?.length > 0) {
    whereClause.accountNumber = { in: filters.accountNumbers }
  }

  const trades = await prisma.trade.findMany({
    where: whereClause,
    include: {
      Account: true
      // phase: true, // Phase field not available
      // propFirmPhase: true, // PropFirmPhase field not available
    },
    orderBy: {
      entryTime: 'desc'
    },
    skip: offset,
    take: limit
  })

  return trades
}

// Helper function for progressive statistics
async function getTradesStatistics(offset: number, limit: number) {
  const userId = await getUserIdSafe()

  if (!userId) {
    throw new Error('User not authenticated')
  }

  const trades = await prisma.trade.findMany({
    where: { userId },
    select: {
      pnl: true,
      commission: true,
      quantity: true,
      entryTime: true,
      exitTime: true,
      side: true,
      instrument: true
    },
    orderBy: {
      entryTime: 'desc'
    },
    skip: offset,
    take: limit
  })

  const stats = trades.reduce((acc, trade) => {
    const netPnl = trade.pnl - trade.commission
    acc.totalPnL += netPnl
    acc.totalTrades += 1
    acc.totalCommission += trade.commission
    acc.winningTrades += netPnl > 0 ? 1 : 0
    acc.losingTrades += netPnl < 0 ? 1 : 0
    acc.totalVolume += Math.abs(trade.quantity)
    return acc
  }, {
    totalPnL: 0,
    totalTrades: 0,
    totalCommission: 0,
    winningTrades: 0,
    losingTrades: 0,
    totalVolume: 0,
    winRate: 0
  })

  // CRITICAL FIX: Exclude break-even trades from win rate denominator
  const tradableCount = stats.winningTrades + stats.losingTrades
  const winRate = tradableCount > 0 ? (stats.winningTrades / tradableCount) * 100 : 0
  stats.winRate = winRate

  return stats
}
