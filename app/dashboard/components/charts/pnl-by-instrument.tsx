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

interface PnLByInstrumentProps {
  size?: WidgetSize
}

interface InstrumentData {
  instrument: string
  pnl: number
  trades: number
  wins: number
  losses: number
  winRate: number
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

  const data = payload[0].payload as InstrumentData
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
    <div className="bg-card/95 backdrop-blur-md border border-border/50 rounded-xl p-4 shadow-2xl min-w-[180px]">
      {/* Instrument Header */}
      <p className="text-sm font-bold mb-2">{data.instrument}</p>

      {/* P/L - Large & Bold */}
      <p className={cn(
        "text-2xl font-bold tracking-tight",
        isProfit ? "text-emerald-500" : "text-red-500"
      )}>
        {formatCurrency(data.pnl)}
      </p>

      {/* Stats */}
      <div className="mt-3 pt-3 border-t border-border/30 space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Trades</span>
          <span className="font-semibold">{data.trades}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Win Rate</span>
          <span className="font-semibold">{data.winRate.toFixed(0)}%</span>
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

function getNiceStep(value: number): number {
  if (!isFinite(value) || value <= 0) return 25
  const exponent = Math.floor(Math.log10(value))
  const base = Math.pow(10, exponent)
  const fraction = value / base

  if (fraction <= 1) return 1 * base
  if (fraction <= 2) return 2 * base
  if (fraction <= 2.5) return 2.5 * base
  if (fraction <= 5) return 5 * base
  return 10 * base
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function PnLByInstrument({ size = 'small-long' }: PnLByInstrumentProps) {
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

    const instrumentMap: Record<string, { pnl: number; trades: number; wins: number; losses: number }> = {}

    groupedTrades.forEach((trade: any) => {
      const instrument = trade.symbol || trade.instrument || 'Unknown'

      if (!instrumentMap[instrument]) {
        instrumentMap[instrument] = { pnl: 0, trades: 0, wins: 0, losses: 0 }
      }

      const netPnl = (trade.pnl || 0) - (trade.commission || 0)
      instrumentMap[instrument].pnl += netPnl
      instrumentMap[instrument].trades += 1

      if (netPnl > BREAK_EVEN_THRESHOLD) {
        instrumentMap[instrument].wins += 1
      } else if (netPnl < -BREAK_EVEN_THRESHOLD) {
        instrumentMap[instrument].losses += 1
      }
    })

    const data: InstrumentData[] = Object.entries(instrumentMap).map(([instrument, stats]) => ({
      instrument,
      pnl: stats.pnl,
      trades: stats.trades,
      wins: stats.wins,
      losses: stats.losses,
      winRate: stats.trades > 0 ? (stats.wins / stats.trades) * 100 : 0,
    }))

    return data.sort((a, b) => b.pnl - a.pnl)
  }, [formattedTrades])

  // ---------------------------------------------------------------------------
  // Y-AXIS DOMAIN CALCULATION (PRESERVED - DO NOT MODIFY)
  // ---------------------------------------------------------------------------
  const { yDomain, yTicks } = React.useMemo(() => {
    if (!chartData.length) {
      return {
        yDomain: [-100, 100] as [number, number],
        yTicks: [-100, -50, 0, 50, 100],
      }
    }

    const pnls = chartData.map(item => item.pnl)
    const minValue = Math.min(...pnls)
    const maxValue = Math.max(...pnls)

    if (minValue >= 0) {
      const step = getNiceStep(maxValue / 4 || 1)
      const niceMax = step * 4
      return {
        yDomain: [0, niceMax] as [number, number],
        yTicks: [0, niceMax / 2, niceMax],
      }
    }

    if (maxValue <= 0) {
      const step = getNiceStep(Math.abs(minValue) / 4 || 1)
      const niceMin = step * 4
      return {
        yDomain: [-niceMin, 0] as [number, number],
        yTicks: [-niceMin, -niceMin / 2, 0],
      }
    }

    const maxAbs = Math.max(Math.abs(minValue), Math.abs(maxValue))
    const step = getNiceStep(maxAbs / 4 || 1)
    const niceMax = step * 4
    const domain: [number, number] = [-niceMax, niceMax]
    const ticks = [-niceMax, -niceMax / 2, 0, niceMax / 2, niceMax]

    return { yDomain: domain, yTicks: ticks }
  }, [chartData])

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
            P/L by Instrument
          </CardTitle>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-4 w-4 text-muted-foreground hover:text-foreground cursor-help transition-colors" />
            </TooltipTrigger>
            <TooltipContent>
              <p>Profit and Loss breakdown by trading instrument</p>
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
              margin={{ top: 20, right: 20, left: 10, bottom: 20 }}
              barGap={4}
            >
              {/* Subtle Grid - Horizontal Only */}
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={COLORS.grid}
                strokeOpacity={CHART_CONFIG.gridOpacity}
                vertical={false}
              />

              {/* X Axis - Instruments */}
              <XAxis
                dataKey="instrument"
                stroke={COLORS.axis}
                fontSize={isCompact ? 9 : 10}
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value) => value.length > 8 ? value.substring(0, 6) + '..' : value}
              />

              {/* Y Axis - Currency */}
              <YAxis
                tickFormatter={formatAxisValue}
                stroke={COLORS.axis}
                fontSize={isCompact ? 10 : 11}
                tickLine={false}
                axisLine={false}
                width={50}
                domain={yDomain}
                ticks={yTicks}
              />

              {/* Zero Reference Line */}
              <ReferenceLine
                y={0}
                stroke={COLORS.axis}
                strokeDasharray="3 3"
                strokeOpacity={CHART_CONFIG.referenceLineOpacity}
              />

              {/* Tooltip */}
              <RechartsTooltip
                content={<ChartTooltip />}
                cursor={{ fill: 'hsl(var(--muted)/0.3)' }}
              />

              {/* Bars with Rounded Tops */}
              <Bar
                dataKey="pnl"
                radius={CHART_CONFIG.barRadius}
                maxBarSize={50}
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
    </Card>
  )
}
