'use client'

import { useMemo } from 'react'
import { useData } from '@/context/data-provider'
import { Trade } from '@prisma/client'
import { calculateStatistics, calculateAverageWinLoss } from '@/lib/utils'

/**
 * Custom hook that provides all trading statistics calculations
 * This serves as a single source of truth for all statistical metrics
 */
export function useTradeStatistics() {
  const { formattedTrades, accounts } = useData()

  // Core statistics from the centralized calculation
  const coreStats = useMemo(() => {
    return calculateStatistics(formattedTrades, accounts)
  }, [formattedTrades, accounts])

  // Average win/loss calculations
  const avgWinLossStats = useMemo(() => {
    return calculateAverageWinLoss(formattedTrades)
  }, [formattedTrades])

  // Additional derived statistics
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

    // Rates and percentages (properly rounded to avoid floating point precision issues)
    const tradableTradesCount = nbWin + nbLoss
    const winRate = tradableTradesCount > 0 ? Math.round((nbWin / tradableTradesCount) * 1000) / 10 : 0 // Round to 1 decimal place
    const lossRate = nbTrades > 0 ? Math.round((nbLoss / nbTrades) * 1000) / 10 : 0 // Round to 1 decimal place
    const beRate = nbTrades > 0 ? Math.round((nbBe / nbTrades) * 1000) / 10 : 0 // Round to 1 decimal place

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
      riskRewardRatio: avgWinLossStats.riskRewardRatio
    }
  }, [coreStats, avgWinLossStats])

  return {
    // Core statistics
    ...coreStats,

    // Derived statistics
    ...derivedStats,

    // Average win/loss data
    ...avgWinLossStats,

    // Raw trade data for advanced calculations
    formattedTrades,
    accounts
  }
}
