"use client"

import * as React from "react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
  ResponsiveContainer,
  ReferenceLine,
  Tooltip as RechartsTooltip
} from "recharts"
import { Info } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useData } from "@/context/data-provider"
import { cn, formatCurrency, formatNumber, BREAK_EVEN_THRESHOLD } from "@/lib/utils"
import { WidgetSize } from '@/app/dashboard/types/dashboard'
import { getWidgetStyles } from '@/app/dashboard/config/widget-dimensions'

// ============================================================================
// TYPES
// ============================================================================

interface DailyCumulativePnLProps {
  size?: WidgetSize
}

interface ChartDataPoint {
  date: string
  cumulativePnL: number
  dailyPnL: number
  trades: number
}

// ============================================================================
// CONSTANTS - Tradezella Premium Styling
// ============================================================================

const COLORS = {
  profit: 'hsl(var(--chart-profit))',
  loss: 'hsl(var(--chart-loss))',
  grid: 'hsl(var(--border))',
  axis: 'hsl(var(--muted-foreground))'
} as const

const CHART_CONFIG = {
  gridOpacity: 0.25,
  referenceLineOpacity: 0.4,
  strokeWidth: 2.5
} as const

// ============================================================================
// TOOLTIP COMPONENT - Glassmorphism Style
// ============================================================================

function ChartTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null

  const data = payload[0].payload as ChartDataPoint
  const date = new Date(data.date + 'T00:00:00Z')
  const isCumulativeProfit = data.cumulativePnL > BREAK_EVEN_THRESHOLD
  const isCumulativeLoss = data.cumulativePnL < -BREAK_EVEN_THRESHOLD
  const isDailyProfit = data.dailyPnL > BREAK_EVEN_THRESHOLD
  const isDailyLoss = data.dailyPnL < -BREAK_EVEN_THRESHOLD

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

      {/* Cumulative P/L - Large & Bold */}
      <div className="mb-2">
        <span className="text-xs text-muted-foreground">Cumulative</span>
        <p className={cn(
          "text-2xl font-bold tracking-tight",
          isCumulativeProfit ? "text-long" : isCumulativeLoss ? "text-short" : "text-muted-foreground"
        )}>
          {formatCurrency(data.cumulativePnL)}
        </p>
      </div>

      {/* Daily P/L */}
      <div className="pt-2 border-t border-border/30">
        <div className="flex justify-between items-center">
          <span className="text-xs text-muted-foreground">Today's P/L</span>
          <span className={cn(
            "text-sm font-semibold",
            isDailyProfit ? "text-long" : isDailyLoss ? "text-short" : "text-muted-foreground"
          )}>
            {isDailyProfit ? "+" : ""}{formatCurrency(data.dailyPnL)}
          </span>
        </div>
        <div className="flex justify-between items-center mt-1">
          <span className="text-xs text-muted-foreground">Trades</span>
          <span className="text-sm font-semibold">{data.trades}</span>
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

export default function DailyCumulativePnL({ size = 'small-long' }: DailyCumulativePnLProps) {
  // ---------------------------------------------------------------------------
  // DATA HOOKS (PRESERVED - DO NOT MODIFY)
  // ---------------------------------------------------------------------------
  const { calendarData } = useData()

  // ---------------------------------------------------------------------------
  // DATA PROCESSING (PRESERVED - DO NOT MODIFY)
  // ---------------------------------------------------------------------------
  const chartData = React.useMemo(() => {
    const sortedData = Object.entries(calendarData)
      .map(([date, values]) => ({
        date,
        dailyPnL: values.pnl,
        trades: values.shortNumber + values.longNumber,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    let cumulative = 0
    const result: ChartDataPoint[] = []

    sortedData.forEach((item) => {
      cumulative += item.dailyPnL
      result.push({
        ...item,
        cumulativePnL: cumulative,
      })
    })

    return result
  }, [calendarData])

  // ---------------------------------------------------------------------------
  // GRADIENT OFFSET CALCULATION (PRESERVED - DO NOT MODIFY)
  // ---------------------------------------------------------------------------
  const gradientOffset = React.useMemo(() => {
    if (chartData.length === 0) return 0

    const dataMax = Math.max(...chartData.map((i) => i.cumulativePnL))
    const dataMin = Math.min(...chartData.map((i) => i.cumulativePnL))

    if (dataMax <= 0) return 0
    if (dataMin >= 0) return 1

    return dataMax / (dataMax - dataMin)
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
            Cumulative P/L
          </CardTitle>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-4 w-4 text-muted-foreground hover:text-foreground cursor-help transition-colors" />
            </TooltipTrigger>
            <TooltipContent>
              <p>Running total of daily profit/loss over time</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </CardHeader>

      {/* Chart Container */}
      <CardContent className="flex-1 p-0 relative min-h-[100px]">
        <div className="absolute inset-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 20, right: 20, left: 10, bottom: 20 }}
            >
              {/* Gradient Definitions */}
              <defs>
                {/* Split gradient for area fill */}
                <linearGradient id="cumulativeFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLORS.profit} stopOpacity={0.5} />
                  <stop offset={`${gradientOffset * 100}%`} stopColor={COLORS.profit} stopOpacity={0.1} />
                  <stop offset={`${gradientOffset * 100}%`} stopColor={COLORS.loss} stopOpacity={0.1} />
                  <stop offset="100%" stopColor={COLORS.loss} stopOpacity={0.5} />
                </linearGradient>

                {/* Split gradient for stroke */}
                <linearGradient id="cumulativeStroke" x1="0" y1="0" x2="0" y2="1">
                  <stop offset={`${gradientOffset * 100}%`} stopColor={COLORS.profit} />
                  <stop offset={`${gradientOffset * 100}%`} stopColor={COLORS.loss} />
                </linearGradient>
              </defs>

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
                minTickGap={40}
              />

              {/* Y Axis - Currency */}
              <YAxis
                tickFormatter={formatAxisValue}
                stroke={COLORS.axis}
                fontSize={isCompact ? 10 : 11}
                tickLine={false}
                axisLine={false}
                width={55}
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
                cursor={{ stroke: 'hsl(var(--muted-foreground))', strokeDasharray: '3 3' }}
              />

              {/* Area with Gradient Fill */}
              <Area
                type="monotone"
                dataKey="cumulativePnL"
                stroke="url(#cumulativeStroke)"
                strokeWidth={CHART_CONFIG.strokeWidth}
                fill="url(#cumulativeFill)"
                dot={false}
                activeDot={{
                  r: 4,
                  strokeWidth: 2,
                  stroke: 'hsl(var(--background))'
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}