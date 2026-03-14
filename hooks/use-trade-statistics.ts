'use client'

import { useMemo } from 'react'
import { useData } from '@/context/data-provider'
import { calculateAverageWinLoss, groupTradesByExecution } from '@/lib/utils'

/**
 * Custom hook that provides all trading statistics calculations
 * 
 * REFACTORED: Statistics now come from the server via DataProvider's
 * useFilteredTrades() hook. This hook is a thin wrapper that merges
 * the server-computed stats with client-side grouping for advanced display.
 */
export function useTradeStatistics() {
  const { formattedTrades, accounts, statistics, accountNumbers } = useData()

  // Group trades by execution for advanced display calculations
  const groupedTrades = useMemo(
    () => groupTradesByExecution(formattedTrades) as any[],
    [formattedTrades]
  )

  // Average win/loss calculations (lightweight client-side)
  const avgWinLossStats = useMemo(
    () => calculateAverageWinLoss(formattedTrades),
    [formattedTrades]
  )

  // Derive additional stats from server-computed statistics
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
    } = statistics

    const netPnlWithPayouts = cumulativePnl - cumulativeFees - totalPayouts
    const tradableTradesCount = nbWin + nbLoss
    const winRate = tradableTradesCount > 0 ? Math.round((nbWin / tradableTradesCount) * 1000) / 10 : 0
    const lossRate = nbTrades > 0 ? Math.round((nbLoss / nbTrades) * 1000) / 10 : 0
    const beRate = nbTrades > 0 ? Math.round((nbBe / nbTrades) * 1000) / 10 : 0

    // Server stats may include streak properties — safely access them
    const stats = statistics as any
    
    return {
      netPnlWithPayouts,
      winRate,
      lossRate,
      beRate,
      winningStreak,
      biggestWin: statistics.biggestWin ?? 0,
      biggestLoss: statistics.biggestLoss ?? 0,
      avgWin: avgWinLossStats.avgWin,
      avgLoss: avgWinLossStats.avgLoss,
      riskRewardRatio: avgWinLossStats.riskRewardRatio,
      currentTradeStreak: stats.currentTradeStreak ?? 0,
      bestTradeStreak: stats.bestTradeStreak ?? 0,
      worstTradeStreak: stats.worstTradeStreak ?? 0,
      currentDayStreak: stats.currentDayStreak ?? 0,
      bestDayStreak: stats.bestDayStreak ?? 0,
      worstDayStreak: stats.worstDayStreak ?? 0,
    }
  }, [statistics, avgWinLossStats])

  return {
    // Core statistics from server
    ...statistics,

    // Derived statistics
    ...derivedStats,

    // Average win/loss data
    ...avgWinLossStats,

    // Server stats metadata (backward-compatible)
    isLoadingServerStats: false,
    serverError: null,
    refetchServerStats: () => {},

    // Raw trade data for advanced calculations
    formattedTrades,
    accounts
  }
}
