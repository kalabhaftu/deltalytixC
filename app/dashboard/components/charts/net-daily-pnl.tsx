"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useData } from "@/context/data-provider"
import { cn, formatCurrency, formatNumber } from "@/lib/utils"
import { WidgetSize } from '@/app/dashboard/types/dashboard'
import { getWidgetStyles } from '@/app/dashboard/config/widget-dimensions'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine
} from 'recharts'
import { Info } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

// ============================================================================
// TYPES
// ============================================================================

interface NetDailyPnLProps {
  size?: WidgetSize
}

interface ChartDataPoint {
  date: string
  pnl: number
  shortNumber: number
  longNumber: number
  wins: number
  losses: number
}

// ============================================================================
// CONSTANTS - Tradezella Premium Styling
// ============================================================================

const COLORS = {
  profit: 'hsl(var(--chart-profit))',      // Emerald green
  loss: 'hsl(var(--chart-loss))',          // Red
  grid: 'hsl(var(--border))',
  axis: 'hsl(var(--muted-foreground))',
  reference: 'hsl(var(--muted-foreground))'
} as const

const CHART_CONFIG = {
  gridOpacity: 0.25, // Increased from 0.1 for better visibility
  barRadius: [4, 4, 0, 0] as [number, number, number, number],
  referenceLineOpacity: 0.4
} as const

// ============================================================================
// TOOLTIP COMPONENT - Glassmorphism Style
// ============================================================================

function ChartTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null

  const data = payload[0].payload as ChartDataPoint
  const date = new Date(data.date + 'T00:00:00Z')
  const isProfit = data.pnl >= 0

  return (
    <div className="bg-card/95 backdrop-blur-md border border-border/50 rounded-xl p-4 shadow-2xl">
      {/* Date Header */}
      <p className="text-xs font-medium text-muted-foreground mb-1">
        {date.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
          year: "numeric",
          timeZone: 'UTC'
        })}
      </p>

      {/* P/L Value - Large & Bold */}
      <p className={cn(
        "text-2xl font-bold tracking-tight",
        isProfit ? "text-long" : "text-short"
      )}>
        {formatCurrency(data.pnl)}
      </p>

      {/* Stats Grid */}
      <div className="mt-3 pt-3 border-t border-border/30 grid grid-cols-2 gap-x-6 gap-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Trades</span>
          <span className="font-semibold">{data.longNumber + data.shortNumber}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Long/Short</span>
          <span className="font-semibold">{data.longNumber}/{data.shortNumber}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Wins</span>
          <span className="font-semibold text-long">{data.wins}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Losses</span>
          <span className="font-semibold text-short">{data.losses}</span>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

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

export default function NetDailyPnL({ size = 'small-long' }: NetDailyPnLProps) {
  // ---------------------------------------------------------------------------
  // DATA HOOKS (PRESERVED - DO NOT MODIFY)
  // ---------------------------------------------------------------------------
  const { calendarData, formattedTrades } = useData()

  // ---------------------------------------------------------------------------
  // DATA PROCESSING (PRESERVED - DO NOT MODIFY)
  // ---------------------------------------------------------------------------
  const chartData = React.useMemo(() => {
    const { groupTradesByExecution } = require('@/lib/utils')
    const groupedTrades = groupTradesByExecution(formattedTrades)

    const tradesByDate = groupedTrades.reduce((acc: Record<string, { wins: number; losses: number }>, trade: any) => {
      const date = trade.entryDate.split('T')[0]
      if (!acc[date]) {
        acc[date] = { wins: 0, losses: 0 }
      }
      const netPnL = trade.pnl - (trade.commission || 0)
      if (netPnL > 0) {
        acc[date].wins++
      } else if (netPnL < 0) {
        acc[date].losses++
      }
      return acc
    }, {})

    return Object.entries(calendarData)
      .map(([date, values]) => ({
        date,
        pnl: values.pnl,
        shortNumber: values.shortNumber,
        longNumber: values.longNumber,
        wins: tradesByDate[date]?.wins || 0,
        losses: tradesByDate[date]?.losses || 0,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }, [calendarData, formattedTrades])

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

    const pnls = chartData.map((item) => item.pnl)
    const minValue = Math.min(0, ...pnls)
    const maxValue = Math.max(0, ...pnls)
    const maxAbs = Math.max(Math.abs(minValue), Math.abs(maxValue))

    if (maxAbs === 0) {
      return {
        yDomain: [-100, 100] as [number, number],
        yTicks: [-100, -50, 0, 50, 100],
      }
    }

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
            Net Daily P/L
          </CardTitle>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-4 w-4 text-muted-foreground hover:text-foreground cursor-help transition-colors" />
            </TooltipTrigger>
            <TooltipContent>
              <p>Daily net profit/loss including commissions</p>
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
              barCategoryGap="25%"
            >
              {/* Subtle Grid - Horizontal Only */}
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={COLORS.grid}
                strokeOpacity={CHART_CONFIG.gridOpacity}
                vertical={false}
              />

              {/* X Axis - Dates */}
              <XAxis
                dataKey="date"
                tickFormatter={(value) => {
                  const date = new Date(value + 'T00:00:00Z')
                  return date.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    timeZone: 'UTC'
                  })
                }}
                stroke={COLORS.axis}
                fontSize={isCompact ? 10 : 11}
                tickLine={false}
                axisLine={false}
                tickMargin={8}
              />

              {/* Y Axis - Currency */}
              <YAxis
                tickFormatter={formatAxisValue}
                stroke={COLORS.axis}
                fontSize={isCompact ? 10 : 11}
                tickLine={false}
                axisLine={false}
                domain={yDomain}
                ticks={yTicks}
                width={50}
              />

              {/* Tooltip */}
              <RechartsTooltip
                content={<ChartTooltip />}
                cursor={{ fill: 'hsl(var(--muted)/0.3)' }}
              />

              {/* Zero Reference Line */}
              <ReferenceLine
                y={0}
                stroke={COLORS.reference}
                strokeDasharray="3 3"
                strokeOpacity={CHART_CONFIG.referenceLineOpacity}
              />

              {/* Bars with Rounded Tops */}
              <Bar
                dataKey="pnl"
                radius={CHART_CONFIG.barRadius}
                maxBarSize={60}
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
