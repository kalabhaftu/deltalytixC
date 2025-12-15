/**
 * Server-Side Statistics Calculator
 * Centralized statistics calculation with caching for optimal performance
 */

import { prisma } from '@/lib/prisma'
import { unstable_cache } from 'next/cache'
import { calculateAccountBalances } from '@/lib/utils/balance-calculator'
import { groupTradesByExecution } from '@/lib/utils'
import { CACHE_DURATION_SHORT } from '@/lib/constants'

// ===========================================
// TYPES
// ===========================================

export interface TradeStatistics {
  totalTrades: number
  winningTrades: number
  losingTrades: number
  breakEvenTrades: number
  winRate: number
  lossRate: number
  profitFactor: number
  grossProfits: number
  grossLosses: number
  totalPnL: number
  avgWin: number
  avgLoss: number
  riskRewardRatio: number
  biggestWin: number
  biggestLoss: number
  // Streaks
  currentTradeStreak: number
  bestTradeStreak: number
  worstTradeStreak: number
  currentDayStreak: number
  bestDayStreak: number
  worstDayStreak: number
  // Time statistics
  totalPositionTime: number
  averagePositionTime: string
  // Account statistics
  totalAccounts: number
  totalEquity: number
  // Chart data
  chartData: Array<{ date: string; pnl: number }>
  // Metadata
  lastUpdated: string
}

export interface CalculateStatisticsOptions {
  userId: string
  accountNumbers?: string[]
  dateFrom?: Date
  dateTo?: Date
  forceRefresh?: boolean
}

// ===========================================
// CORE CALCULATION FUNCTIONS
// ===========================================

/**
 * Calculate streaks from grouped trades
 */
function calculateStreaks(groupedTrades: any[]): {
  currentTradeStreak: number
  bestTradeStreak: number
  worstTradeStreak: number
  currentDayStreak: number
  bestDayStreak: number
  worstDayStreak: number
} {
  let currentTradeStreak = 0
  let bestTradeStreak = 0
  let worstTradeStreak = 0
  let tempTradeStreak = 0

  // Calculate trade streaks
  for (let i = 0; i < groupedTrades.length; i++) {
    const trade = groupedTrades[i]
    const netPnl = trade.pnl + (trade.commission || 0)  // Commission is negative
    const isWin = netPnl > 0

    if (isWin) {
      tempTradeStreak = tempTradeStreak >= 0 ? tempTradeStreak + 1 : 1
      bestTradeStreak = Math.max(bestTradeStreak, tempTradeStreak)
    } else if (netPnl < 0) {
      tempTradeStreak = tempTradeStreak <= 0 ? tempTradeStreak - 1 : -1
      worstTradeStreak = Math.min(worstTradeStreak, tempTradeStreak)
    }

    if (i === groupedTrades.length - 1) {
      currentTradeStreak = tempTradeStreak
    }
  }

  // Calculate day streaks
  const tradesByDay = groupedTrades.reduce((acc, trade) => {
    const date = new Date(trade.entryDate).toDateString()
    if (!acc[date]) {
      acc[date] = []
    }
    acc[date].push(trade)
    return acc
  }, {} as Record<string, any[]>)

  const sortedDays = Object.keys(tradesByDay).sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime()
  )

  let currentDayStreak = 0
  let bestDayStreak = 0
  let worstDayStreak = 0
  let tempDayStreak = 0

  for (let i = 0; i < sortedDays.length; i++) {
    const dayTrades = tradesByDay[sortedDays[i]]
    const dayPnl = dayTrades.reduce(
      (sum: number, t: any) => sum + (t.pnl + (t.commission || 0)),
      0
    )
    const isWinDay = dayPnl > 0

    if (isWinDay) {
      tempDayStreak = tempDayStreak >= 0 ? tempDayStreak + 1 : 1
      bestDayStreak = Math.max(bestDayStreak, tempDayStreak)
    } else if (dayPnl < 0) {
      tempDayStreak = tempDayStreak <= 0 ? tempDayStreak - 1 : -1
      worstDayStreak = Math.min(worstDayStreak, tempDayStreak)
    }

    if (i === sortedDays.length - 1) {
      currentDayStreak = tempDayStreak
    }
  }

  return {
    currentTradeStreak,
    bestTradeStreak,
    worstTradeStreak,
    currentDayStreak,
    bestDayStreak,
    worstDayStreak
  }
}

/**
 * Format position time as human-readable string
 */
function formatPositionTime(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.round((seconds % 3600) / 60)
  return `${hours}h ${minutes}m`
}

/**
 * Core statistics calculation - used by both cached and non-cached paths
 */
async function calculateStatisticsCore(
  options: CalculateStatisticsOptions
): Promise<TradeStatistics> {
  const { userId, accountNumbers, dateFrom, dateTo } = options

  // Build where clause
  const whereClause: any = { userId }

  if (accountNumbers && accountNumbers.length > 0) {
    whereClause.accountNumber = { in: accountNumbers }
  }

  if (dateFrom || dateTo) {
    whereClause.createdAt = {}
    if (dateFrom) whereClause.createdAt.gte = dateFrom
    if (dateTo) whereClause.createdAt.lte = dateTo
  }

  // Fetch required data in parallel
  const [accounts, trades, transactions] = await Promise.all([
    prisma.account.findMany({
      where: {
        userId,
        isArchived: false,
        ...(accountNumbers?.length ? { number: { in: accountNumbers } } : {})
      },
      select: {
        id: true,
        number: true,
        startingBalance: true
      }
    }),
    prisma.trade.findMany({
      where: whereClause,
      select: {
        id: true,
        entryId: true,
        entryDate: true,
        instrument: true,
        side: true,
        pnl: true,
        commission: true,
        createdAt: true,
        accountNumber: true,
        quantity: true,
        timeInPosition: true,
        closeDate: true,
        closePrice: true,
        exitTime: true,
        groupId: true
      },
      orderBy: { createdAt: 'asc' }
    }),
    prisma.liveAccountTransaction.findMany({
      where: { userId },
      select: {
        accountId: true,
        amount: true
      }
    })
  ])

  // Group trades by execution for accurate counting
  const groupedTrades = groupTradesByExecution(trades as any[])

  // Calculate win/loss counts
  const winningTrades = groupedTrades.filter(
    t => t.pnl + (t.commission || 0) > 0
  ).length
  const losingTrades = groupedTrades.filter(
    t => t.pnl + (t.commission || 0) < 0
  ).length
  const breakEvenTrades = groupedTrades.filter(
    t => t.pnl + (t.commission || 0) === 0
  ).length

  // Calculate rates
  const tradableCount = winningTrades + losingTrades
  const winRate = tradableCount > 0
    ? Math.round((winningTrades / tradableCount) * 1000) / 10
    : 0
  const lossRate = groupedTrades.length > 0
    ? Math.round((losingTrades / groupedTrades.length) * 1000) / 10
    : 0

  // Calculate P&L metrics
  const grossProfits = groupedTrades.reduce((sum, t) => {
    const netPnL = t.pnl + (t.commission || 0)
    return netPnL > 0 ? sum + netPnL : sum
  }, 0)

  const grossLosses = Math.abs(
    groupedTrades.reduce((sum, t) => {
      const netPnL = t.pnl + (t.commission || 0)
      return netPnL < 0 ? sum + netPnL : sum
    }, 0)
  )

  const totalPnL = groupedTrades.reduce(
    (sum, t) => sum + (t.pnl + (t.commission || 0)),
    0
  )

  const profitFactor =
    grossLosses === 0
      ? grossProfits > 0
        ? Infinity
        : 0
      : grossProfits / grossLosses

  // Calculate averages
  const wins = groupedTrades.filter(t => t.pnl + (t.commission || 0) > 0)
  const losses = groupedTrades.filter(t => t.pnl + (t.commission || 0) < 0)

  const avgWin =
    wins.length > 0
      ? wins.reduce((sum, t) => sum + (t.pnl + (t.commission || 0)), 0) /
      wins.length
      : 0
  const avgLoss =
    losses.length > 0
      ? losses.reduce(
        (sum, t) => sum + Math.abs(t.pnl + (t.commission || 0)),
        0
      ) / losses.length
      : 0
  const riskRewardRatio = avgLoss > 0 ? avgWin / avgLoss : 0

  // Find biggest win/loss
  const biggestWin = Math.max(
    0,
    ...groupedTrades.map(t => t.pnl + (t.commission || 0))
  )
  const biggestLoss = Math.abs(
    Math.min(0, ...groupedTrades.map(t => t.pnl + (t.commission || 0)))
  )

  // Calculate streaks
  const streaks = calculateStreaks(groupedTrades)

  // Calculate position time
  const totalPositionTime = groupedTrades.reduce(
    (sum, t) => sum + (t.timeInPosition || 0),
    0
  )
  const averagePositionTime = formatPositionTime(
    groupedTrades.length > 0 ? totalPositionTime / groupedTrades.length : 0
  )

  // Calculate equity
  const accountEquities = calculateAccountBalances(
    accounts as any[],
    trades as any[],
    transactions,
    { excludeFailedAccounts: false, includePayouts: true }
  )
  const totalEquity = Array.from(accountEquities.values()).reduce(
    (sum, equity) => sum + equity,
    0
  )

  // Generate chart data (last 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const recentTrades = groupedTrades.filter(
    t => new Date(t.createdAt) >= thirtyDaysAgo
  )

  const dailyPnL = new Map<string, number>()
  recentTrades.forEach(trade => {
    const date = new Date(trade.createdAt).toISOString().split('T')[0]
    const netPnL = trade.pnl + (trade.commission || 0)
    dailyPnL.set(date, (dailyPnL.get(date) || 0) + netPnL)
  })

  const chartData = Array.from(dailyPnL.entries())
    .map(([date, pnl]) => ({ date, pnl }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-14)

  return {
    totalTrades: groupedTrades.length,
    winningTrades,
    losingTrades,
    breakEvenTrades,
    winRate,
    lossRate,
    profitFactor: Math.round(profitFactor * 100) / 100,
    grossProfits: Math.round(grossProfits * 100) / 100,
    grossLosses: Math.round(grossLosses * 100) / 100,
    totalPnL: Math.round(totalPnL * 100) / 100,
    avgWin: Math.round(avgWin * 100) / 100,
    avgLoss: Math.round(avgLoss * 100) / 100,
    riskRewardRatio: Math.round(riskRewardRatio * 100) / 100,
    biggestWin: Math.round(biggestWin * 100) / 100,
    biggestLoss: Math.round(biggestLoss * 100) / 100,
    ...streaks,
    totalPositionTime,
    averagePositionTime,
    totalAccounts: accounts.length,
    totalEquity: Math.round(totalEquity * 100) / 100,
    chartData,
    lastUpdated: new Date().toISOString()
  }
}

// ===========================================
// CACHED EXPORTS
// ===========================================

/**
 * Get cached statistics for a user
 * Uses Next.js unstable_cache for server-side caching
 */
export const getCachedStatistics = unstable_cache(
  async (userId: string, accountNumbersJson?: string) => {
    const accountNumbers = accountNumbersJson
      ? JSON.parse(accountNumbersJson)
      : undefined
    return calculateStatisticsCore({ userId, accountNumbers })
  },
  ['trade-statistics'],
  {
    revalidate: CACHE_DURATION_SHORT / 1000, // Convert ms to seconds
    tags: ['statistics']
  }
)

/**
 * Calculate statistics without caching
 * Use for real-time updates or when fresh data is required
 */
export async function calculateStatisticsRealtime(
  options: CalculateStatisticsOptions
): Promise<TradeStatistics> {
  return calculateStatisticsCore(options)
}

/**
 * Empty statistics object for unauthenticated or empty states
 */
export const emptyStatistics: TradeStatistics = {
  totalTrades: 0,
  winningTrades: 0,
  losingTrades: 0,
  breakEvenTrades: 0,
  winRate: 0,
  lossRate: 0,
  profitFactor: 0,
  grossProfits: 0,
  grossLosses: 0,
  totalPnL: 0,
  avgWin: 0,
  avgLoss: 0,
  riskRewardRatio: 0,
  biggestWin: 0,
  biggestLoss: 0,
  currentTradeStreak: 0,
  bestTradeStreak: 0,
  worstTradeStreak: 0,
  currentDayStreak: 0,
  bestDayStreak: 0,
  worstDayStreak: 0,
  totalPositionTime: 0,
  averagePositionTime: '0s',
  totalAccounts: 0,
  totalEquity: 0,
  chartData: [],
  lastUpdated: new Date().toISOString()
}

