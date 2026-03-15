/**
 * Server-Side Report Statistics Calculator
 * 
 * Absorbs ALL client-side useMemo calculations from reports/page.tsx:
 * - tradingActivity (win rate, avg trades/month, trading days)
 * - psychMetrics (drawdown, expectancy, streaks, avg holding time, profit factor)
 * - sessionPerformance (per-session stats for NY/London/Asia/Outside)
 * - rMultipleDistribution (R-multiple buckets)
 * 
 * These were previously computed client-side on 50,000+ trade arrays.
 * Now they run server-side in a single pass and return pre-computed DTOs.
 */

import { prisma } from '@/lib/prisma'
import { classifyTrade } from '@/lib/utils'
import { getTradingSession } from '@/lib/time-utils'
import { groupTradesByExecution } from '@/lib/utils'

// ===========================================
// TYPES (Report-specific DTOs)
// ===========================================

export interface TradingActivityDTO {
  totalTrades: number
  winRate: string
  avgTradesPerMonth: number
  tradingDaysActive: number
}

export interface PsychMetricsDTO {
  longestWinStreak: number
  longestLoseStreak: number
  avgWin: string
  avgLoss: string
  totalNetPnL: number
  expectancy: string
  profitFactor: string
  avgHoldingTime: string
  maxDrawdown: string
  peakEquity: string
}

export interface SessionPerformanceDTO {
  [sessionName: string]: {
    name: string
    range: string
    trades: number
    wins: number
    pnl: number
    totalHoldMs: number
    peak: number
    maxDD: number
  }
}

export interface RMultipleDistributionDTO {
  '<-1R': number
  '-1R to 0R': number
  '0R to 1R': number
  '1R to 2R': number
  '2R to 3R': number
  '>3R': number
}

export interface ReportStatsResponse {
  tradingActivity: TradingActivityDTO | null
  psychMetrics: PsychMetricsDTO | null
  sessionPerformance: SessionPerformanceDTO | null
  rMultipleDistribution: RMultipleDistributionDTO | null
  filteredTrades: any[]
  filterOptions: {
    symbols: string[]
    sessions: string[]
    outcomes: Array<{ value: string; label: string }>
    strategies: Array<{ id: string; name: string }>
  }
}

export interface ReportStatsFilters {
  userId: string
  accountId?: string
  accountNumbers?: string[]
  dateFrom?: string
  dateTo?: string
  symbol?: string
  session?: string
  outcome?: string
  strategy?: string
  ruleBroken?: string
}

// ===========================================
// CORE COMPUTATION
// ===========================================

export async function calculateReportStatistics(
  filters: ReportStatsFilters
): Promise<ReportStatsResponse> {
  const { userId, accountNumbers, dateFrom, dateTo, accountId } = filters

  // Build Prisma where clause — all filtering done server-side
  const whereClause: any = { userId }

  if (accountId) {
    whereClause.accountId = accountId
  }

  if (accountNumbers && accountNumbers.length > 0) {
    whereClause.accountNumber = { in: accountNumbers }
  }

  // entryDate is String in schema — compare as ISO strings (not Date objects)
  // Reports UI sends ISO via toISOString(). We preserve full timestamps to match stored values.
  if (dateFrom || dateTo) {
    whereClause.entryDate = {}
    if (dateFrom) {
      whereClause.entryDate.gte = dateFrom.includes('T') ? dateFrom : `${dateFrom}T00:00:00.000Z`
    }
    if (dateTo) {
      whereClause.entryDate.lte = dateTo.includes('T') ? dateTo : `${dateTo}T23:59:59.999Z`
    }
  }

  if (filters.symbol && filters.symbol !== 'all') {
    whereClause.OR = [
      { symbol: filters.symbol },
      { instrument: filters.symbol }
    ]
  }

  if (filters.outcome && filters.outcome !== 'all') {
    whereClause.outcome = filters.outcome
  }

  if (filters.strategy && filters.strategy !== 'all') {
    whereClause.modelId = filters.strategy
  }

  if (filters.ruleBroken && filters.ruleBroken !== 'all') {
    whereClause.ruleBroken = filters.ruleBroken === 'broken'
  }

  // Fetch trades with fields needed for computations + spreadsheet display
  // Fetch filter options separately to ensure they are always populated regardless of current filters
  const [rawTrades, tradingModels, allPossibleSymbols] = await Promise.all([
    prisma.trade.findMany({
      where: whereClause,
      select: {
        id: true,
        entryId: true,
        entryDate: true,
        closeDate: true,
        closePrice: true,
        instrument: true,
        symbol: true,
        side: true,
        pnl: true,
        commission: true,
        quantity: true,
        entryPrice: true,
        stopLoss: true,
        takeProfit: true,
        groupId: true,
        accountNumber: true,
        accountId: true,
        phaseAccountId: true,
        timeInPosition: true,
        outcome: true,
        modelId: true,
        ruleBroken: true,
      },
      orderBy: { entryDate: 'asc' },
    }),
    prisma.tradingModel.findMany({
      where: { userId },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    prisma.trade.findMany({
      where: { 
        userId,
        // When fetching options, we only filter by account if one is selected, 
        // ensuring the list adapts to the selected account but not the date range.
        ...(accountId && accountId !== 'all' ? { accountId } : {}),
        ...(accountNumbers && accountNumbers.length > 0 ? { accountNumber: { in: accountNumbers } } : {})
      },
      select: { symbol: true, instrument: true },
    }),
  ])

  // Extract unique symbols from the separate query for filter options
  // Extract unique symbols from the separate query for filter options
  // Use a Case-Insensitive Set to deduplicate instrument vs symbol
  const symbols = [...new Set(
    allPossibleSymbols.map(t => (t.symbol || t.instrument || '').trim())
      .filter(Boolean)
  )].sort() as string[]
  const strategies = tradingModels.map(m => ({ id: m.id, name: m.name }))

  // Group by execution for accurate counting
  const trades = groupTradesByExecution(rawTrades as any[]) as any[]

  // Session filter (needs to be done post-query since it's derived from entryDate)
  const filteredTrades = filters.session && filters.session !== 'all'
    ? trades.filter(trade => {
      if (!trade.entryDate) return false
      const session = getTradingSession(new Date(trade.entryDate))
      return session === filters.session
    })
    : trades

  if (filteredTrades.length === 0) {
    return {
      tradingActivity: null,
      psychMetrics: null,
      sessionPerformance: null,
      rMultipleDistribution: null,
      filteredTrades: [],
      filterOptions: buildFilterOptions(symbols, strategies),
    }
  }

  // Single-pass computation for all metrics
  const result = computeAllMetrics(filteredTrades, dateFrom, dateTo)

  return {
    ...result,
    filteredTrades,
    filterOptions: buildFilterOptions(symbols, strategies),
  }
}

function buildFilterOptions(symbols: string[], strategies: Array<{ id: string; name: string }>) {
  return {
    symbols,
    sessions: [
      'London Killzone',
      'NY Killzone',
      'London Close Killzone',
      'Lunch Time',
      'NY PM',
      'Asian Killzone',
      'Outside Session',
    ],
    outcomes: [
      { value: 'GOOD_WIN', label: 'Good Win' },
      { value: 'BAD_WIN', label: 'Bad Win' },
      { value: 'GOOD_LOSS', label: 'Good Loss' },
      { value: 'BAD_LOSS', label: 'Bad Loss' },
      { value: 'BREAKEVEN', label: 'Breakeven' },
    ],
    strategies,
  }
}

// ===========================================
// ALL METRICS IN OPTIMIZED PASSES
// ===========================================

function computeAllMetrics(
  trades: any[],
  dateFrom?: string,
  dateTo?: string
): Omit<ReportStatsResponse, 'filterOptions' | 'filteredTrades'> {
  const sorted = [...trades].sort((a, b) => {
    const dateA = a.entryDate ? new Date(a.entryDate).getTime() : 0
    const dateB = b.entryDate ? new Date(b.entryDate).getTime() : 0
    return dateA - dateB
  })

  // --- Pass 1: Core metrics (drawdown, PnL, wins/losses, holding time, sessions, R-multiples) ---
  let cumulativePnL = 0
  let maxDD = 0
  let peakEquity = 0
  let totalGrossProfit = 0
  let totalGrossLoss = 0
  let totalHoldingTimeMs = 0
  let tradesWithDuration = 0

  // Win/loss tracking
  const wins: any[] = []
  const losses: any[] = []

  // Streak tracking
  let maxWinStreak = 0
  let maxLoseStreak = 0
  let tempStreak = 0
  let lastWasWin: boolean | null = null

  // Unique trading days
  const tradeDates = new Set<string>()

  // Session performance
  const sessions: SessionPerformanceDTO = {
    'New York': { name: 'New York Session', range: '08:00 - 17:00', trades: 0, wins: 0, pnl: 0, totalHoldMs: 0, peak: 0, maxDD: 0 },
    'London': { name: 'London Session', range: '03:00 - 12:00', trades: 0, wins: 0, pnl: 0, totalHoldMs: 0, peak: 0, maxDD: 0 },
    'Asia': { name: 'Asia Session', range: '19:00 - 04:00', trades: 0, wins: 0, pnl: 0, totalHoldMs: 0, peak: 0, maxDD: 0 },
    'Outside Session': { name: 'Outside Session', range: 'N/A', trades: 0, wins: 0, pnl: 0, totalHoldMs: 0, peak: 0, maxDD: 0 },
  }

  // R-multiple distribution
  const rDistribution: RMultipleDistributionDTO = {
    '<-1R': 0,
    '-1R to 0R': 0,
    '0R to 1R': 0,
    '1R to 2R': 0,
    '2R to 3R': 0,
    '>3R': 0,
  }

  // Single pass through all trades
  for (const trade of sorted) {
    const netPnL = (trade.pnl || 0) + (trade.commission || 0)
    const outcome = classifyTrade(netPnL)

    // Cumulative PnL + Drawdown
    cumulativePnL += netPnL
    if (cumulativePnL > peakEquity) peakEquity = cumulativePnL
    const dd = peakEquity - cumulativePnL
    if (dd > maxDD) maxDD = dd

    // Win/Loss classification
    if (outcome === 'win') {
      wins.push(trade)
      totalGrossProfit += netPnL
    } else if (outcome === 'loss') {
      losses.push(trade)
      totalGrossLoss += Math.abs(netPnL)
    }

    // Streaks
    if (outcome === 'breakeven') {
      if (lastWasWin !== null) {
        if (lastWasWin) maxWinStreak = Math.max(maxWinStreak, tempStreak)
        else maxLoseStreak = Math.max(maxLoseStreak, tempStreak)
      }
      tempStreak = 0
      lastWasWin = null
    } else {
      const isWin = outcome === 'win'
      if (lastWasWin === null) {
        tempStreak = 1
        lastWasWin = isWin
      } else if (isWin === lastWasWin) {
        tempStreak++
      } else {
        if (lastWasWin) maxWinStreak = Math.max(maxWinStreak, tempStreak)
        else maxLoseStreak = Math.max(maxLoseStreak, tempStreak)
        tempStreak = 1
        lastWasWin = isWin
      }
    }

    // Trading days
    if (trade.entryDate) {
      const dateStr = new Date(trade.entryDate).toISOString().split('T')[0]
      tradeDates.add(dateStr)
    }

    // Holding time
    if (trade.entryDate && trade.closeDate) {
      const entryTime = new Date(trade.entryDate).getTime()
      const exitTime = new Date(trade.closeDate).getTime()
      if (!isNaN(entryTime) && !isNaN(exitTime) && exitTime > entryTime) {
        totalHoldingTimeMs += (exitTime - entryTime)
        tradesWithDuration++
      }
    }

    // Session performance
    if (trade.entryDate) {
      const entryDateStr = trade.entryDate || ''
      const date = entryDateStr.includes('Z') ? entryDateStr : `${entryDateStr}Z`
      const sessionName = getTradingSession(new Date(date)) || 'Outside Session'

      if (sessions[sessionName]) {
        const s = sessions[sessionName]
        s.trades++
        if (outcome === 'win') s.wins++
        s.pnl += (trade.pnl || 0)

        if (trade.entryDate && trade.closeDate) {
          const entry = new Date(trade.entryDate).getTime()
          const exit = new Date(trade.closeDate).getTime()
          if (!isNaN(entry) && !isNaN(exit) && exit > entry) {
            s.totalHoldMs += (exit - entry)
          }
        }

        const currentPnL = s.pnl
        if (currentPnL > s.peak) s.peak = currentPnL
        const sessionDD = s.peak - currentPnL
        if (sessionDD > s.maxDD) s.maxDD = sessionDD
      }
    }

    // R-multiple distribution
    const entry = typeof trade.entryPrice === 'string' ? parseFloat(trade.entryPrice) : trade.entryPrice
    const sl = typeof trade.stopLoss === 'string' ? parseFloat(trade.stopLoss) : (trade.stopLoss || 0)
    const qty = trade.quantity || 0

    if (sl > 0 && entry > 0 && qty > 0) {
      const risk = Math.abs(entry - sl) * qty
      if (risk > 0) {
        const r = netPnL / risk
        if (r < -1) rDistribution['<-1R']++
        else if (r < 0) rDistribution['-1R to 0R']++
        else if (r < 1) rDistribution['0R to 1R']++
        else if (r < 2) rDistribution['1R to 2R']++
        else if (r < 3) rDistribution['2R to 3R']++
        else rDistribution['>3R']++
      }
    } else {
      if (outcome === 'win') rDistribution['1R to 2R']++
      else if (outcome === 'loss') rDistribution['-1R to 0R']++
      else rDistribution['0R to 1R']++
    }
  }

  // Finalize streaks
  if (lastWasWin !== null) {
    if (lastWasWin) maxWinStreak = Math.max(maxWinStreak, tempStreak)
    else maxLoseStreak = Math.max(maxLoseStreak, tempStreak)
  }

  // --- Derived metrics ---
  const tradableCount = wins.length + losses.length
  const winRate = tradableCount > 0 ? ((wins.length / tradableCount) * 100).toFixed(1) : '0.0'

  const avgWin = wins.length > 0 ? totalGrossProfit / wins.length : 0
  const avgLoss = losses.length > 0 ? totalGrossLoss / losses.length : 0
  const expectancy = sorted.length > 0 ? cumulativePnL / sorted.length : 0
  const profitFactor = totalGrossLoss > 0 ? totalGrossProfit / totalGrossLoss : totalGrossProfit > 0 ? 99 : 0

  const avgHoldingTimeMs = tradesWithDuration > 0 ? totalHoldingTimeMs / tradesWithDuration : 0
  const hours = Math.floor(avgHoldingTimeMs / (1000 * 60 * 60))
  const minutes = Math.floor((avgHoldingTimeMs % (1000 * 60 * 60)) / (1000 * 60))

  // Date range calculation
  const from = dateFrom ? new Date(dateFrom) : null
  const to = dateTo ? new Date(dateTo) : null
  const daysInRange = from && to
    ? Math.max(1, Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)))
    : 30
  const monthsInRange = Math.max(1, Math.ceil(daysInRange / 30))

  return {
    tradingActivity: {
      totalTrades: sorted.length,
      winRate,
      avgTradesPerMonth: Math.round(sorted.length / monthsInRange),
      tradingDaysActive: tradeDates.size,
    },
    psychMetrics: {
      longestWinStreak: maxWinStreak,
      longestLoseStreak: maxLoseStreak,
      avgWin: avgWin.toFixed(2),
      avgLoss: avgLoss.toFixed(2),
      totalNetPnL: cumulativePnL,
      expectancy: expectancy.toFixed(2),
      profitFactor: profitFactor.toFixed(2),
      avgHoldingTime: `${hours}h ${minutes}m`,
      maxDrawdown: maxDD.toFixed(2),
      peakEquity: peakEquity.toFixed(2),
    },
    sessionPerformance: sessions,
    rMultipleDistribution: rDistribution,
  }
}
