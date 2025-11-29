'use client'

import { useMemo, useCallback, useState, useEffect, useRef } from 'react'
import { useData } from '@/context/data-provider'
import { Trade } from '@prisma/client'
import { calculateStatistics, calculateAverageWinLoss, groupTradesByExecution } from '@/lib/utils'
import { fetchWithError, handleFetchError } from '@/lib/utils/fetch-with-error'
import { CACHE_DURATION_SHORT } from '@/lib/constants'

interface ServerStats {
  totalTrades: number
  winningTrades: number
  losingTrades: number
  breakEvenTrades: number
  winRate: number
  profitFactor: number
  grossProfits: number
  grossLosses: number
  totalPnL: number
  avgWin: number
  avgLoss: number
  riskRewardRatio: number
  biggestWin: number
  biggestLoss: number
  currentTradeStreak: number
  bestTradeStreak: number
  worstTradeStreak: number
  currentDayStreak: number
  bestDayStreak: number
  worstDayStreak: number
  totalEquity: number
  chartData: Array<{ date: string; pnl: number }>
}

/**
 * Custom hook that provides all trading statistics calculations
 * Uses server-side calculations for heavy operations, with client-side fallback
 */
export function useTradeStatistics() {
  const { formattedTrades, accounts, accountNumbers } = useData()
  
  // Server stats state
  const [serverStats, setServerStats] = useState<ServerStats | null>(null)
  const [isLoadingServerStats, setIsLoadingServerStats] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  
  // Cache management
  const lastFetchRef = useRef<number>(0)
  const lastAccountsRef = useRef<string>('')

  // Fetch server statistics
  const fetchServerStats = useCallback(async (force = false) => {
    const now = Date.now()
    const accountsKey = accountNumbers.join(',')
    
    // Skip if recently fetched with same accounts (unless forced)
    if (
      !force &&
      serverStats &&
      now - lastFetchRef.current < CACHE_DURATION_SHORT &&
      lastAccountsRef.current === accountsKey
    ) {
      return
    }

    setIsLoadingServerStats(true)
    setServerError(null)

    try {
      const params = new URLSearchParams()
      if (accountNumbers.length > 0) {
        params.append('accountNumbers', accountNumbers.join(','))
      }

      const url = `/api/dashboard/stats${params.toString() ? `?${params.toString()}` : ''}`
      const result = await fetchWithError<{ success: boolean; data: ServerStats }>(url)

      if (result.ok && result.data?.data) {
        setServerStats(result.data.data)
        lastFetchRef.current = now
        lastAccountsRef.current = accountsKey
      } else if (result.error) {
        setServerError(handleFetchError(result.error))
      }
    } catch (error) {
      setServerError(handleFetchError(error))
    } finally {
      setIsLoadingServerStats(false)
    }
  }, [accountNumbers, serverStats])

  // Fetch on mount and when accounts change
  useEffect(() => {
    if (formattedTrades.length > 0) {
      fetchServerStats()
    }
  }, [accountNumbers.join(',')]) // Only refetch when account selection changes

  // CRITICAL: Group trades by execution first for accurate counting
  const groupedTrades = useMemo(() => groupTradesByExecution(formattedTrades), [formattedTrades])

  // Core statistics from the centralized calculation (client-side fallback)
  const coreStats = useMemo(() => {
    return calculateStatistics(formattedTrades, accounts)
  }, [formattedTrades, accounts])

  // Average win/loss calculations
  const avgWinLossStats = useMemo(() => {
    return calculateAverageWinLoss(formattedTrades)
  }, [formattedTrades])

  // Additional derived statistics (optimized - uses server stats when available)
  const derivedStats = useMemo(() => {
    const {
      nbWin,
      nbLoss,
      nbBe,
      nbTrades,
      cumulativePnl,
      cumulativeFees,
      totalPayouts,
      winningStreak,
      grossWin,
      grossLosses,
      biggestWin,
      biggestLoss
    } = coreStats

    // Net P&L including payouts
    const netPnlWithPayouts = cumulativePnl - cumulativeFees - totalPayouts

    // Use server stats for streaks if available (expensive client-side calculation)
    if (serverStats) {
      return {
        netPnlWithPayouts,
        winRate: serverStats.winRate,
        lossRate: nbTrades > 0 ? Math.round((nbLoss / nbTrades) * 1000) / 10 : 0,
        beRate: nbTrades > 0 ? Math.round((nbBe / nbTrades) * 1000) / 10 : 0,
        winningStreak,
        biggestWin: serverStats.biggestWin,
        biggestLoss: serverStats.biggestLoss,
        avgWin: serverStats.avgWin,
        avgLoss: serverStats.avgLoss,
        riskRewardRatio: serverStats.riskRewardRatio,
        currentTradeStreak: serverStats.currentTradeStreak,
        bestTradeStreak: serverStats.bestTradeStreak,
        worstTradeStreak: serverStats.worstTradeStreak,
        currentDayStreak: serverStats.currentDayStreak,
        bestDayStreak: serverStats.bestDayStreak,
        worstDayStreak: serverStats.worstDayStreak,
      }
    }

    // Client-side fallback for streaks
    const tradableTradesCount = nbWin + nbLoss
    const winRate = tradableTradesCount > 0 ? Math.round((nbWin / tradableTradesCount) * 1000) / 10 : 0
    const lossRate = nbTrades > 0 ? Math.round((nbLoss / nbTrades) * 1000) / 10 : 0
    const beRate = nbTrades > 0 ? Math.round((nbBe / nbTrades) * 1000) / 10 : 0

    // Calculate streaks (client-side only when server unavailable)
    let currentTradeStreak = 0
    let bestTradeStreak = 0
    let worstTradeStreak = 0
    let tempTradeStreak = 0
    
    let currentDayStreak = 0
    let bestDayStreak = 0
    let worstDayStreak = 0
    
    for (let i = 0; i < groupedTrades.length; i++) {
      const trade = groupedTrades[i]
      const netPnl = trade.pnl - (trade.commission || 0)
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
    
    const tradesByDay = groupedTrades.reduce((acc, trade) => {
      const date = new Date(trade.entryDate).toDateString()
      if (!acc[date]) acc[date] = []
      acc[date].push(trade)
      return acc
    }, {} as Record<string, Trade[]>)
    
    const sortedDays = Object.keys(tradesByDay).sort((a, b) => 
      new Date(a).getTime() - new Date(b).getTime()
    )
    
    let tempDayStreak = 0
    for (let i = 0; i < sortedDays.length; i++) {
      const dayTrades = tradesByDay[sortedDays[i]]
      const dayPnl = dayTrades.reduce((sum, t) => sum + (t.pnl - (t.commission || 0)), 0)
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
      netPnlWithPayouts,
      winRate,
      lossRate,
      beRate,
      winningStreak,
      biggestWin,
      biggestLoss,
      avgWin: avgWinLossStats.avgWin,
      avgLoss: avgWinLossStats.avgLoss,
      riskRewardRatio: avgWinLossStats.riskRewardRatio,
      currentTradeStreak,
      bestTradeStreak,
      worstTradeStreak,
      currentDayStreak,
      bestDayStreak,
      worstDayStreak,
    }
  }, [coreStats, avgWinLossStats, groupedTrades, serverStats])

  return {
    // Core statistics
    ...coreStats,

    // Derived statistics
    ...derivedStats,

    // Average win/loss data
    ...avgWinLossStats,

    // Server stats metadata
    isLoadingServerStats,
    serverError,
    refetchServerStats: fetchServerStats,

    // Raw trade data for advanced calculations
    formattedTrades,
    accounts
  }
}
