'use client'

import React from "react"
import { StatsCard } from "./stats-card"
import { DonutChart } from "./donut-chart"
import { MetricDonut } from "./metric-donut"
import { RadarChartComponent } from "./radar-chart"
import { CalendarView } from "./calendar-view"
import { BacktestingData } from "@/types/backtesting"
import { TooltipProvider } from "@/components/ui/tooltip"

interface BacktestingDashboardProps {
  data: BacktestingData
  className?: string
}

export function BacktestingDashboard({ data, className }: BacktestingDashboardProps) {
  const { stats, calendarData, zellaMetrics } = data

  // Calculate monthly stats for current month
  const currentDate = new Date()
  const currentMonth = currentDate.getMonth()
  const currentYear = currentDate.getFullYear()
  
  const monthlyStats = Object.entries(calendarData)
    .filter(([dateString]) => {
      const date = new Date(dateString)
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear
    })
    .reduce(
      (acc, [, dayData]) => ({
        totalPnl: acc.totalPnl + dayData.pnl,
        totalDays: acc.totalDays + (dayData.trades > 0 ? 1 : 0)
      }),
      { totalPnl: 0, totalDays: 0 }
    )

  return (
    <TooltipProvider delayDuration={100}>
      <div className={className}>
        {/* Top row - Main stats with donut charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <MetricDonut
          title="Net P&L"
          value={stats.netPnl}
          tooltip="Total profit or loss from all trades in the backtest. This represents your overall performance after all trades are closed."
        />
        <MetricDonut
          title="Trade win %"
          value={stats.tradeWinRate}
          percentage={stats.tradeWinRate}
          winCount={159}
          neutralCount={7}
          lossCount={134}
          tooltip="Percentage of winning trades out of total trades. Shows the ratio of profitable trades to total trades executed."
        />
        <MetricDonut
          title="Profit factor"
          value={stats.profitFactor}
          tooltip="Ratio of gross profit to gross loss. Values above 1.0 indicate profitability. Higher values mean better performance."
        />
        <MetricDonut
          title="Day win %"
          value={stats.dayWinRate}
          percentage={stats.dayWinRate}
          winCount={127}
          neutralCount={1}
          lossCount={83}
          tooltip="Percentage of profitable trading days. Shows how consistently you make money on a daily basis."
        />
        <MetricDonut
          title="Avg win/loss trade"
          value="2.32"
          tooltip="Ratio of average winning trade to average losing trade. Higher values indicate better risk-reward management."
        />
      </div>

      {/* Second row - Additional metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatsCard
          title="Profit Factor"
          value={1.64}
          neutral
          tooltip="Gross profit divided by gross loss. A value above 1.0 means your strategy is profitable overall."
        />
        <StatsCard
          title="Average Winning Trade"
          value={stats.avgWinTrade}
          positive
          tooltip="Average profit per winning trade. This shows how much you typically make on successful trades."
        />
        <StatsCard
          title="Average Losing Trade"
          value={stats.avgLossTrade}
          positive={false}
          tooltip="Average loss per losing trade. This shows your typical loss amount when trades go against you."
        />
      </div>

      {/* Third row - Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Winning percentage donut chart */}
          <DonutChart
            title="Winning % By Trades"
            percentage={63.0}
            winCount={19}
            lossCount={11}
            tooltip="Visual breakdown of winning vs losing trades. Shows the proportion of successful trades in your strategy."
          />

        {/* Zella score radar chart */}
        <RadarChartComponent
          zellaScore={stats.zellaScore}
          metrics={zellaMetrics}
          tooltip="Comprehensive trading performance score based on multiple metrics including win rate, profit factor, consistency, and risk management."
        />
      </div>

      {/* Fourth row - Calendar full width */}
      <div className="w-full">
        <CalendarView
          calendarData={calendarData}
          monthlyStats={monthlyStats}
        />
      </div>
      </div>
    </TooltipProvider>
  )
}
