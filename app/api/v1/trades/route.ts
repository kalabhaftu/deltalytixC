/**
 * Server-Filtered Trades API (v1)
 * 
 * GET /api/v1/trades
 * 
 * Replaces client-side `formattedTrades` useMemo in DataProvider.
 * All 7 filters (account, date, instrument, PnL, time, weekday, hour)
 * are applied server-side via Prisma WHERE clauses.
 * 
 * Returns: { trades, total, statistics, calendarData }
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserId } from '@/server/auth'
import { convertDecimal } from '@/lib/utils/decimal'
import { calculateStatistics, formatCalendarData } from '@/lib/utils'
import { CacheHeaders } from '@/lib/api-cache-headers'
import { applyRateLimit, apiLimiter } from '@/lib/rate-limiter'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  const rateLimitRes = await applyRateLimit(request, apiLimiter)
  if (rateLimitRes) return rateLimitRes

  const start = Date.now()
  try {
    const authUserId = await getUserId()
    
    // Map auth user ID to internal user ID
    const userLookup = await prisma.user.findUnique({
      where: { auth_user_id: authUserId },
      select: { id: true }
    })
    
    if (!userLookup) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    const internalUserId = userLookup.id
    const params = request.nextUrl.searchParams
    
    // Parse filter params
    const accountNumbers = params.get('accounts')?.split(',').filter(Boolean) || []
    const dateFrom = params.get('dateFrom')
    const dateTo = params.get('dateTo')
    const instruments = params.get('instruments')?.split(',').filter(Boolean) || []
    const pnlMin = params.get('pnlMin') ? parseFloat(params.get('pnlMin')!) : undefined
    const pnlMax = params.get('pnlMax') ? parseFloat(params.get('pnlMax')!) : undefined
    const timeRange = params.get('timeRange') || null
    const weekday = params.get('weekday') ? parseInt(params.get('weekday')!) : null
    const hour = params.get('hour') ? parseInt(params.get('hour')!) : null
    const limit = parseInt(params.get('limit') || '5000')
    // Optional pagination (TradeZella-style). If omitted, response stays backwards-compatible.
    const pageLimit = params.get('pageLimit') ? parseInt(params.get('pageLimit')!) : null
    const pageOffset = params.get('pageOffset') ? parseInt(params.get('pageOffset')!) : 0
    const includeStats = params.get('includeStats') !== 'false' // default true
    const includeCalendar = params.get('includeCalendar') !== 'false' // default true
    const timezone = params.get('timezone') || 'UTC'
    
    // Build Prisma where clause — ALL filtering server-side
    const whereClause: any = { userId: internalUserId }
    
    // Account filter
    if (accountNumbers.length > 0) {
      whereClause.OR = [
        { accountNumber: { in: accountNumbers } },
        { phaseAccountId: { in: accountNumbers } }
      ]
    }
    
    // Date range filter (entryDate is String in schema)
    if (dateFrom || dateTo) {
      whereClause.entryDate = {}
      if (dateFrom) {
        whereClause.entryDate.gte = dateFrom.includes('T') ? dateFrom : `${dateFrom}T00:00:00.000Z`
      }
      if (dateTo) {
        whereClause.entryDate.lte = dateTo.includes('T') ? dateTo : `${dateTo}T23:59:59.999Z`
      }
    }
    
    // Instrument filter
    if (instruments.length > 0) {
      whereClause.instrument = { in: instruments }
    }
    
    // PnL range filter
    if (pnlMin !== undefined || pnlMax !== undefined) {
      whereClause.pnl = {}
      if (pnlMin !== undefined) whereClause.pnl.gte = pnlMin
      if (pnlMax !== undefined) whereClause.pnl.lte = pnlMax
    }
    
    // Time-in-position range filter (convert seconds-based ranges)
    if (timeRange) {
      const timeRanges: Record<string, [number, number]> = {
        'under1min': [0, 60],
        '1to5min': [60, 300],
        '5to10min': [300, 600],
        '10to15min': [600, 900],
        '15to30min': [900, 1800],
        '30to60min': [1800, 3600],
        '1to2hours': [3600, 7200],
        '2to5hours': [7200, 18000],
        'over5hours': [18000, 999999999],
      }
      const range = timeRanges[timeRange]
      if (range) {
        whereClause.timeInPosition = { gte: range[0], lt: range[1] }
      }
    }
    
    // Fetch trades + accounts in parallel
    const [rawTrades, accounts] = await Promise.all([
      prisma.trade.findMany({
        where: whereClause,
        orderBy: { entryDate: 'desc' },
        take: limit,
        include: {
          TradingModel: {
            select: { id: true, name: true }
          }
        }
      }),
      // Fetch accounts for statistics calculation
      includeStats ? prisma.account.findMany({
        where: { userId: internalUserId },
        include: { _count: { select: { Trade: true } } }
      }) : Promise.resolve([])
    ])
    
    // Convert decimals
    let trades = rawTrades.map((trade: typeof rawTrades[number]) => ({
      ...trade,
      entryPrice: convertDecimal(trade.entryPrice),
      closePrice: convertDecimal(trade.closePrice),
      stopLoss: convertDecimal(trade.stopLoss),
      takeProfit: convertDecimal(trade.takeProfit),
      tradingModel: (trade as any).TradingModel?.name || null
    }))
    
    // Post-query filters that can't be done in Prisma WHERE
    // Weekday filter (derived from entryDate + timezone)
    if (weekday !== null) {
      trades = trades.filter(trade => {
        if (!trade.entryDate) return false
        const d = new Date(trade.entryDate)
        return d.getDay() === weekday
      })
    }
    
    // Hour filter (derived from entryDate + timezone)
    if (hour !== null) {
      trades = trades.filter(trade => {
        if (!trade.entryDate) return false
        const d = new Date(trade.entryDate)
        return d.getHours() === hour
      })
    }
    
    // Compute statistics + calendar data server-side
    const statistics = includeStats ? calculateStatistics(trades, accounts) : null
    const calendarData = includeCalendar ? formatCalendarData(trades, accounts, timezone) : null

    // Optional response pagination to reduce payload size
    const total = trades.length
    const pagedTrades = pageLimit !== null && pageLimit > 0
      ? trades.slice(Math.max(0, pageOffset), Math.max(0, pageOffset) + pageLimit)
      : trades
    
    const response = NextResponse.json({
      trades: pagedTrades,
      total,
      page: pageLimit !== null ? { limit: pageLimit, offset: Math.max(0, pageOffset) } : null,
      statistics,
      calendarData,
    })
    Object.entries(CacheHeaders.privateShort).forEach(([k, v]) => response.headers.set(k, v))

    logger.info('GET /api/v1/trades', { latencyMs: Date.now() - start, total: trades.length }, 'api')
    return response

  } catch (error: any) {
    logger.error('GET /api/v1/trades failed', { error: error?.message, latencyMs: Date.now() - start }, 'api')
    if (error.message?.includes('not authenticated') || error.message?.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
