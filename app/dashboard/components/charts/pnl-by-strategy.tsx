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
import { cn, formatNumber, BREAK_EVEN_THRESHOLD } from "@/lib/utils"
import { WidgetSize } from '@/app/dashboard/types/dashboard'
import { getWidgetStyles } from '@/app/dashboard/config/widget-dimensions'

// ============================================================================
// TYPES
// ============================================================================

interface PnLByStrategyProps {
  size?: WidgetSize
}

interface StrategyData {
  strategy: string
  pnl: number
  trades: number
  wins: number
  losses: number
  winRate: number
  avgPnl: number
  profitFactor: number
}

// ============================================================================
// CONSTANTS - Tradezella Premium Styling
// ============================================================================

const COLORS = {
  profit: 'hsl(142 76% 36%)',
  loss: 'hsl(0 84% 60%)',
  grid: 'hsl(var(--border))',
  axis: 'hsl(var(--muted-foreground))'
} as const

const CHART_CONFIG = {
  gridOpacity: 0.25,
  barRadius: [4, 4, 0, 0] as [number, number, number, number],
  referenceLineOpacity: 0.4
} as const

// ============================================================================
// TOOLTIP COMPONENT - Glassmorphism Style
// ============================================================================

function ChartTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null

  const data = payload[0].payload as StrategyData
  const isProfit = data.pnl >= 0

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  return (
    <div className="bg-card/95 backdrop-blur-md border border-border/50 rounded-xl p-4 shadow-2xl min-w-[200px]">
      {/* Strategy Header */}
      <p className="text-sm font-bold mb-2 truncate max-w-[180px]">{data.strategy}</p>

      {/* P/L - Large & Bold */}
      <p className={cn(
        "text-2xl font-bold tracking-tight",
        isProfit ? "text-emerald-500" : "text-red-500"
      )}>
        {formatCurrency(data.pnl)}
      </p>

      {/* Stats Grid */}
      <div className="mt-3 pt-3 border-t border-border/30 space-y-2">
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Trades</span>
            <span className="font-semibold">{data.trades}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Win Rate</span>
            <span className="font-semibold">{data.winRate.toFixed(0)}%</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Avg P/L</span>
            <span className={cn(
              "font-semibold",
              data.avgPnl >= 0 ? "text-emerald-500" : "text-red-500"
            )}>
              {formatCurrency(data.avgPnl)}
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">PF</span>
            <span className="font-semibold">{data.profitFactor.toFixed(2)}</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 pt-2">
          <div className="text-center p-2 bg-emerald-500/10 rounded-lg">
            <p className="text-sm font-bold text-emerald-500">{data.wins}</p>
            <p className="text-[10px] text-muted-foreground">Wins</p>
          </div>
          <div className="text-center p-2 bg-red-500/10 rounded-lg">
            <p className="text-sm font-bold text-red-500">{data.losses}</p>
            <p className="text-[10px] text-muted-foreground">Losses</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function formatAxisValue(value: number): string {
  const absValue = Math.abs(value)
  if (absValue >= 1000000) {
    return `${value < 0 ? '-' : ''}$${formatNumber(absValue / 1000000, 1)}M`
  }
  if (absValue >= 1000) {
    return `${value < 0 ? '-' : ''}$${formatNumber(absValue / 1000, 1)}k`
  }
  return `${value < 0 ? '-' : ''}$${formatNumber(absValue, 0)}`
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function PnLByStrategy({ size = 'small-long' }: PnLByStrategyProps) {
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

    const strategyMap: Record<string, { pnl: number; trades: number; wins: number; losses: number; grossWin: number; grossLoss: number }> = {}

    groupedTrades.forEach((trade: any) => {
      const strategy = trade.tradingModel || 'No Strategy'

      if (!strategyMap[strategy]) {
        strategyMap[strategy] = { pnl: 0, trades: 0, wins: 0, losses: 0, grossWin: 0, grossLoss: 0 }
      }

      const netPnl = (trade.pnl || 0) - (trade.commission || 0)
      strategyMap[strategy].pnl += netPnl
      strategyMap[strategy].trades += 1

      if (netPnl > BREAK_EVEN_THRESHOLD) {
        strategyMap[strategy].wins += 1
        strategyMap[strategy].grossWin += netPnl
      } else if (netPnl < -BREAK_EVEN_THRESHOLD) {
        strategyMap[strategy].losses += 1
        strategyMap[strategy].grossLoss += Math.abs(netPnl)
      }
    })

    const data: StrategyData[] = Object.entries(strategyMap).map(([strategy, stats]) => {
      const tradableCount = stats.wins + stats.losses
      const winRate = tradableCount > 0 ? (stats.wins / tradableCount) * 100 : 0
      const avgPnl = stats.trades > 0 ? stats.pnl / stats.trades : 0
      const profitFactor = stats.grossLoss > 0 ? stats.grossWin / stats.grossLoss : stats.grossWin > 0 ? 999 : 0

      return {
        strategy,
        pnl: stats.pnl,
        trades: stats.trades,
        wins: stats.wins,
        losses: stats.losses,
        winRate,
        avgPnl,
        profitFactor,
      }
    })

    return data.sort((a, b) => b.pnl - a.pnl)
  }, [formattedTrades])

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
            P/L by Strategy
          </CardTitle>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-4 w-4 text-muted-foreground hover:text-foreground cursor-help transition-colors" />
            </TooltipTrigger>
            <TooltipContent>
              <p>Profit and Loss broken down by trading strategy</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </CardHeader>

      {/* Chart Container */}

      <CardContent className="flex-1 p-0 relative min-h-[100px]">
        <div className="absolute inset-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 20, right: 20, left: 10, bottom: 20 }}
              barGap={4}
            >
              {/* Subtle Grid - Vertical Only (since horizontal chart) */}
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={COLORS.grid}
                strokeOpacity={CHART_CONFIG.gridOpacity}
                horizontal={false}
              />

              {/* X Axis - Currency Values */}
              <XAxis
                type="number"
                tickFormatter={formatAxisValue}
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

              {/* Zero Reference Line */}
              <ReferenceLine
                x={0}
                stroke={COLORS.axis}
                strokeDasharray="3 3"
                strokeOpacity={CHART_CONFIG.referenceLineOpacity}
              />

              {/* Tooltip */}
              <RechartsTooltip
                content={<ChartTooltip />}
                cursor={{ fill: 'hsl(var(--muted)/0.3)' }}
              />

              {/* Bars with Rounded Ends */}
              <Bar
                dataKey="pnl"
                radius={[0, 4, 4, 0]}
                maxBarSize={40}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.pnl >= 0 ? COLORS.profit : COLORS.loss}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card >
  )
}
