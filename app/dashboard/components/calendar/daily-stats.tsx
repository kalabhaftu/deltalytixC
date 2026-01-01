"use client"

import React from 'react'
import { TrendingUp, TrendingDown, Clock, BarChart3 } from 'lucide-react'
import { CalendarEntry } from "@/app/dashboard/types/calendar"
import { groupTradesByExecution } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { STAT_CARD_STYLES, PNL_TEXT_STYLES } from '@/app/dashboard/constants/calendar-styles'

interface DailyStatsProps {
  dayData: CalendarEntry | undefined;
  isWeekly?: boolean;
}

const formatCurrency = (value: number | undefined | null) => {
  if (value == null) return '$0.00'
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const formatDuration = (seconds: number) => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainingSeconds = Math.floor(seconds % 60)

  if (hours > 0) return `${hours}h ${minutes}m`
  if (minutes > 0) return `${minutes}m ${remainingSeconds}s`
  return `${remainingSeconds}s`
}

interface StatCardProps {
  icon: React.ElementType
  label: string
  value: string | number
  subtext?: string
  trend?: 'positive' | 'negative' | 'neutral'
  className?: string
}

function StatCard({ icon: Icon, label, value, subtext, trend = 'neutral', className }: StatCardProps) {
  return (
    <div className={cn(STAT_CARD_STYLES.base, "flex items-center gap-4", className)}>
      <div className={cn(
        STAT_CARD_STYLES.iconWrapper,
        "!mb-0 shrink-0",
        trend === 'positive' && 'bg-long/10',
        trend === 'negative' && 'bg-short/10',
      )}>
        <Icon className={cn(
          "h-4 w-4",
          trend === 'positive' && 'text-long',
          trend === 'negative' && 'text-short',
          trend === 'neutral' && 'text-muted-foreground',
        )} />
      </div>

      <div className="flex-1 min-w-0">
        <p className={STAT_CARD_STYLES.label}>{label}</p>
        <p className={cn(
          "text-lg font-bold",
          trend === 'positive' && PNL_TEXT_STYLES.profit,
          trend === 'negative' && PNL_TEXT_STYLES.loss,
        )}>
          {value}
        </p>
        {subtext && (
          <p className={STAT_CARD_STYLES.subValue}>{subtext}</p>
        )}
      </div>
    </div>
  )
}

export function DailyStats({ dayData, isWeekly = false }: DailyStatsProps) {
  const stats = React.useMemo(() => {
    if (!dayData?.trades?.length) {
      return null
    }

    // CRITICAL: Group trades to show correct execution count
    const groupedTrades = groupTradesByExecution(dayData.trades)

    // Calculate P&L for each account
    const accountPnL = groupedTrades.reduce((acc, trade) => {
      const accountNumber = trade.accountNumber || 'Unknown'
      const totalPnL = trade.pnl - (trade.commission || 0)
      acc[accountNumber] = (acc[accountNumber] || 0) + totalPnL
      return acc
    }, {} as Record<string, number>)

    const totalPnL = Object.values(accountPnL).reduce((sum, pnl) => sum + pnl, 0)
    const avgTimeInPosition = groupedTrades.reduce((sum, trade) => sum + trade.timeInPosition, 0) / groupedTrades.length
    const accountCount = Object.keys(accountPnL).length

    // Equity curve calculation
    const sortedTrades = groupedTrades.sort((a, b) => new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime());
    const equity = [0];
    let cumulative = 0;
    sortedTrades.forEach(trade => {
      cumulative += trade.pnl - (trade.commission || 0);
      equity.push(cumulative);
    });

    // Max drawdown
    let peak = -Infinity;
    let maxDD = 0;
    equity.forEach(val => {
      if (val > peak) peak = val;
      const dd = peak - val;
      if (dd > maxDD) maxDD = dd;
    });

    // Max runup (profit)
    let trough = Infinity;
    let maxRU = 0;
    equity.forEach(val => {
      if (val < trough) trough = val;
      const ru = val - trough;
      if (ru > maxRU) maxRU = ru;
    });

    return {
      totalPnL,
      avgTimeInPosition,
      accountCount,
      maxDrawdown: maxDD,
      maxProfit: maxRU,
      tradeCount: groupedTrades.length
    }
  }, [dayData?.trades])

  if (!stats) {
    return null
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <StatCard
        icon={stats.totalPnL >= 0 ? TrendingUp : TrendingDown}
        label="Net P&L"
        value={formatCurrency(stats.totalPnL)}
        subtext={`${stats.accountCount} ${stats.accountCount > 1 ? "accounts" : "account"}`}
        trend={stats.totalPnL >= 0 ? 'positive' : 'negative'}
      />

      <StatCard
        icon={Clock}
        label="Avg Time"
        value={formatDuration(stats.avgTimeInPosition)}
        subtext={`${stats.tradeCount} ${stats.tradeCount > 1 ? "trades" : "trade"}`}
        trend="neutral"
      />

      <StatCard
        icon={TrendingDown}
        label="Max Drawdown"
        value={`-${formatCurrency(stats.maxDrawdown)}`}
        trend={stats.maxDrawdown > 0 ? 'negative' : 'neutral'}
      />

      <StatCard
        icon={BarChart3}
        label="Max Profit"
        value={formatCurrency(stats.maxProfit)}
        trend={stats.maxProfit > 0 ? 'positive' : 'neutral'}
      />
    </div>
  )
}