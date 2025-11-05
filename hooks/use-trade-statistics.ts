'use client'

import { useMemo } from 'react'
import { useData } from '@/context/data-provider'
import { Trade } from '@prisma/client'
import { calculateStatistics, calculateAverageWinLoss, groupTradesByExecution } from '@/lib/utils'

/**
 * Custom hook that provides all trading statistics calculations
 * This serves as a single source of truth for all statistical metrics
 */
export function useTradeStatistics() {
  const { formattedTrades, accounts } = useData()

  // CRITICAL: Group trades by execution first for accurate counting
  const groupedTrades = useMemo(() => groupTradesByExecution(formattedTrades), [formattedTrades])

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

    // Calculate streaks
    let currentTradeStreak = 0
    let bestTradeStreak = 0
    let worstTradeStreak = 0
    let tempTradeStreak = 0
    
    let currentDayStreak = 0
    let bestDayStreak = 0
    let worstDayStreak = 0
    
    // Calculate trade streaks using GROUPED trades
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
      
      // Current streak is the last one
      if (i === groupedTrades.length - 1) {
        currentTradeStreak = tempTradeStreak
      }
    }
    
    // Calculate day streaks (group GROUPED trades by day)
    const tradesByDay = groupedTrades.reduce((acc, trade) => {
      const date = new Date(trade.entryDate).toDateString()
      if (!acc[date]) {
        acc[date] = []
      }
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
      
      // Current streak is the last one
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
      // Streak statistics
      currentTradeStreak,
      bestTradeStreak,
      worstTradeStreak,
      currentDayStreak,
      bestDayStreak,
      worstDayStreak,
    }
  }, [coreStats, avgWinLossStats, groupedTrades])

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
