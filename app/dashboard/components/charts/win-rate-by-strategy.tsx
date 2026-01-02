"use client"

import * as React from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Cell,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  ReferenceLine
} from "recharts"
import { Info } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useData } from "@/context/data-provider"
import { cn, BREAK_EVEN_THRESHOLD } from "@/lib/utils"
import { WidgetSize } from '@/app/dashboard/types/dashboard'
import { getWidgetStyles } from '@/app/dashboard/config/widget-dimensions'

// ============================================================================
// TYPES
// ============================================================================

interface WinRateByStrategyProps {
  size?: WidgetSize
}

interface StrategyWinRate {
  strategy: string
  winRate: number
  totalTrades: number
  wins: number
  losses: number
  profitFactor: number
  consistency: number
}

// ============================================================================
// CONSTANTS - Tradezella Premium Styling
// ============================================================================

const COLORS = {
  profit: 'hsl(var(--chart-profit))',
  loss: 'hsl(var(--chart-loss))',
  grid: 'hsl(var(--border))',
  axis: 'hsl(var(--muted-foreground))',
  reference: 'hsl(45 93% 47%)'  // 50% reference line in amber
} as const

const CHART_CONFIG = {
  gridOpacity: 0.25,
  barRadius: [0, 4, 4, 0] as [number, number, number, number],
  referenceLineOpacity: 0.6
} as const

// ============================================================================
// TOOLTIP COMPONENT - Glassmorphism Style
// ============================================================================

function ChartTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null

  const data = payload[0].payload as StrategyWinRate
  const isWinning = data.winRate >= 50

  return (
    <div className="bg-card/95 backdrop-blur-md border border-border/50 rounded-xl p-4 shadow-2xl min-w-[200px]">
      {/* Strategy Header */}
      <p className="text-sm font-bold mb-2 truncate max-w-[180px]">{data.strategy}</p>

      {/* Win Rate - Large & Bold */}
      <p className={cn(
        "text-2xl font-bold tracking-tight",
        isWinning ? "text-long" : "text-short"
      )}>
        {data.winRate.toFixed(1)}%
      </p>

      {/* Stats Grid */}
      <div className="mt-3 pt-3 border-t border-border/30 space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Total Trades</span>
          <span className="font-semibold">{data.totalTrades}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Profit Factor</span>
          <span className="font-semibold">{data.profitFactor.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Consistency</span>
          <span className="font-semibold">{data.consistency.toFixed(0)}%</span>
        </div>
        <div className="grid grid-cols-2 gap-2 pt-2">
          <div className="text-center p-2 bg-long/10 rounded-lg">
            <p className="text-sm font-bold text-long">{data.wins}</p>
            <p className="text-[10px] text-muted-foreground">Wins</p>
          </div>
          <div className="text-center p-2 bg-short/10 rounded-lg">
            <p className="text-sm font-bold text-short">{data.losses}</p>
            <p className="text-[10px] text-muted-foreground">Losses</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function WinRateByStrategy({ size = 'small-long' }: WinRateByStrategyProps) {
  // ---------------------------------------------------------------------------
  // DATA HOOKS (PRESERVED - DO NOT MODIFY)
  // ---------------------------------------------------------------------------
  const { formattedTrades } = useData()

  // ---------------------------------------------------------------------------
  // DATA PROCESSING (PRESERVED - DO NOT MODIFY)
  // ---------------------------------------------------------------------------
  const chartData = React.useMemo(() => {
    const { groupTradesByExecution } = require('@/lib/utils')
    const groupedTrades = groupTradesByExecution(formattedTrades)

    const strategyMap: Record<string, { wins: number; losses: number; grossWin: number; grossLoss: number; allWins: number[] }> = {}

    groupedTrades.forEach((trade: any) => {
      const strategy = trade.tradingModel || 'No Strategy'

      if (!strategyMap[strategy]) {
        strategyMap[strategy] = { wins: 0, losses: 0, grossWin: 0, grossLoss: 0, allWins: [] }
      }

      const netPnl = (trade.pnl || 0) - (trade.commission || 0)

      if (netPnl > BREAK_EVEN_THRESHOLD) {
        strategyMap[strategy].wins += 1
        strategyMap[strategy].grossWin += netPnl
        strategyMap[strategy].allWins.push(netPnl)
      } else if (netPnl < -BREAK_EVEN_THRESHOLD) {
        strategyMap[strategy].losses += 1
        strategyMap[strategy].grossLoss += Math.abs(netPnl)
      }
    })

    const data: StrategyWinRate[] = Object.entries(strategyMap).map(([strategy, stats]) => {
      const totalTrades = stats.wins + stats.losses
      const winRate = totalTrades > 0 ? (stats.wins / totalTrades) * 100 : 0
      const profitFactor = stats.grossLoss > 0 ? stats.grossWin / stats.grossLoss : stats.grossWin > 0 ? 999 : 0

      const avgWin = stats.allWins.length > 0 ? stats.allWins.reduce((a, b) => a + b, 0) / stats.allWins.length : 0
      const variance = stats.allWins.length > 0
        ? stats.allWins.reduce((sum, win) => sum + Math.pow(win - avgWin, 2), 0) / stats.allWins.length
        : 0
      const stdDev = Math.sqrt(variance)
      const consistency = avgWin > 0 ? Math.max(0, 100 - (stdDev / avgWin) * 100) : 0

      return {
        strategy,
        winRate,
        totalTrades,
        wins: stats.wins,
        losses: stats.losses,
        profitFactor,
        consistency,
      }
    })

    return data.sort((a, b) => b.winRate - a.winRate)
  }, [formattedTrades])

  // ---------------------------------------------------------------------------
  // COMPUTED VALUES
  // ---------------------------------------------------------------------------
  const avgWinRate = chartData.length > 0
    ? chartData.reduce((sum, item) => sum + item.winRate, 0) / chartData.length
    : 0

  // ---------------------------------------------------------------------------
  // SIZE-RESPONSIVE VALUES
  // ---------------------------------------------------------------------------
  const isCompact = size === 'small' || size === 'small-long'
  const widgetStyles = getWidgetStyles(size || 'small-long')

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------
  return (
    <Card className="flex flex-col bg-card" style={{ height: widgetStyles.height }}>
      {/* Header */}
      <CardHeader className="flex flex-row items-center justify-between shrink-0 border-b border-border/50 h-12 px-5">
        <div className="flex items-center gap-2">
          <CardTitle className={cn(
            "font-semibold tracking-tight",
            isCompact ? "text-sm" : "text-base"
          )}>
            Win Rate by Strategy
          </CardTitle>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-4 w-4 text-muted-foreground hover:text-foreground cursor-help transition-colors" />
            </TooltipTrigger>
            <TooltipContent>
              <p>Percentage of winning trades per strategy/model</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Avg Win Rate Badge */}
        {chartData.length > 0 && (
          <div className={cn(
            "text-xs font-bold px-2 py-1 rounded-md",
            avgWinRate >= 50 ? "bg-long/10 text-long" : "bg-short/10 text-short"
          )}>
            Avg: {avgWinRate.toFixed(0)}%
          </div>
        )}
      </CardHeader>

      {/* Chart Container */}
      <CardContent className="flex-1 p-0 relative min-h-[100px]">
        <div className="absolute inset-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 20, right: 30, left: 10, bottom: 20 }}
              barGap={4}
            >
              {/* Subtle Grid */}
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={COLORS.grid}
                strokeOpacity={CHART_CONFIG.gridOpacity}
                horizontal={false}
              />

              {/* X Axis - Win Rate Percentage */}
              <XAxis
                type="number"
                domain={[0, 100]}
                tickFormatter={(value) => `${value}%`}
                stroke={COLORS.axis}
                fontSize={isCompact ? 10 : 11}
                tickLine={false}
                axisLine={false}
              />

              {/* Y Axis - Strategy Names */}
              <YAxis
                type="category"
                dataKey="strategy"
                stroke={COLORS.axis}
                fontSize={isCompact ? 9 : 10}
                tickLine={false}
                axisLine={false}
                width={80}
                tickFormatter={(value) => value.length > 12 ? value.substring(0, 10) + '...' : value}
              />

              {/* 50% Reference Line */}
              <ReferenceLine
                x={50}
                stroke={COLORS.reference}
                strokeDasharray="3 3"
                strokeOpacity={CHART_CONFIG.referenceLineOpacity}
                label={{
                  value: '50%',
                  position: 'top',
                  fontSize: 10,
                  fill: COLORS.reference
                }}
              />

              {/* Tooltip */}
              <RechartsTooltip
                content={<ChartTooltip />}
                cursor={{ fill: 'hsl(var(--muted)/0.3)' }}
              />

              {/* Bars with Rounded Ends */}
              <Bar
                dataKey="winRate"
                radius={CHART_CONFIG.barRadius}
                maxBarSize={35}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.winRate >= 50 ? COLORS.profit : COLORS.loss}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
