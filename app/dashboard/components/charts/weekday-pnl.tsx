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
import { cn, formatCurrency, formatNumber, BREAK_EVEN_THRESHOLD } from "@/lib/utils"
import { WidgetSize } from '@/app/dashboard/types/dashboard'
import { getWidgetStyles } from '@/app/dashboard/config/widget-dimensions'
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

// ============================================================================
// TYPES
// ============================================================================

interface WeekdayPnLProps {
  size?: WidgetSize
}

interface WeekdayData {
  day: string
  dayName: string
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
  profit: 'hsl(var(--chart-profit))',
  loss: 'hsl(var(--chart-loss))',
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

  const data = payload[0].payload as WeekdayData
  const isProfit = data.pnl > BREAK_EVEN_THRESHOLD
  const isLoss = data.pnl < -BREAK_EVEN_THRESHOLD

  return (
    <div className="bg-card/95 backdrop-blur-md border border-border/50 rounded-xl p-4 shadow-2xl min-w-[180px]">
      {/* Day Header */}
      <p className="text-sm font-bold mb-2">{data.dayName}</p>

      {/* P/L - Large & Bold */}
      <p className={cn(
        "text-2xl font-bold tracking-tight",
        isProfit ? "text-long" : isLoss ? "text-short" : "text-muted-foreground"
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

const WeekdayPnL = React.memo(function WeekdayPnL({ size = 'small-long' }: WeekdayPnLProps) {
  // ---------------------------------------------------------------------------
  // DATA HOOKS (PRESERVED - DO NOT MODIFY)
  // ---------------------------------------------------------------------------
  const { formattedTrades } = useData()
  const [showAverage, setShowAverage] = React.useState(false)

  // ---------------------------------------------------------------------------
  // DATA PROCESSING (PRESERVED - DO NOT MODIFY)
  // ---------------------------------------------------------------------------
  const chartData = React.useMemo(() => {
    const { groupTradesByExecution } = require('@/lib/utils')
    const groupedTrades = groupTradesByExecution(formattedTrades)

    const weekdayMap: Record<number, { pnl: number; trades: number; wins: number; losses: number }> = {}

    groupedTrades.forEach((trade: any) => {
      const date = new Date(trade.entryDate)
      const dayOfWeek = date.getDay()

      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        if (!weekdayMap[dayOfWeek]) {
          weekdayMap[dayOfWeek] = { pnl: 0, trades: 0, wins: 0, losses: 0 }
        }

        const netPnL = trade.pnl - (trade.commission || 0)
        weekdayMap[dayOfWeek].pnl += netPnL
        weekdayMap[dayOfWeek].trades++

        if (netPnL > BREAK_EVEN_THRESHOLD) {
          weekdayMap[dayOfWeek].wins++
        } else if (netPnL < -BREAK_EVEN_THRESHOLD) {
          weekdayMap[dayOfWeek].losses++
        }
      }
    })

    const weekdays = [
      { day: '1', dayName: 'Monday' },
      { day: '2', dayName: 'Tuesday' },
      { day: '3', dayName: 'Wednesday' },
      { day: '4', dayName: 'Thursday' },
      { day: '5', dayName: 'Friday' },
    ]

    return weekdays.map(({ day, dayName }) => {
      const dayNum = parseInt(day)
      const data = weekdayMap[dayNum] || { pnl: 0, trades: 0, wins: 0, losses: 0 }
      const winRate = data.trades > 0 ? (data.wins / data.trades) * 100 : 0
      const displayPnl = showAverage && data.trades > 0 ? data.pnl / data.trades : data.pnl

      return {
        day,
        dayName,
        pnl: displayPnl,
        trades: data.trades,
        wins: data.wins,
        losses: data.losses,
        winRate,
      }
    })
  }, [formattedTrades, showAverage])

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
            Weekday P/L
          </CardTitle>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-4 w-4 text-muted-foreground hover:text-foreground cursor-help transition-colors" />
            </TooltipTrigger>
            <TooltipContent>
              <p>Profit and Loss performance by day of the week</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Average Toggle */}
        <div className="flex items-center gap-2">
          <Label
            htmlFor="weekday-average"
            className="text-xs text-muted-foreground cursor-pointer"
          >
            Avg
          </Label>
          <Switch
            id="weekday-average"
            checked={showAverage}
            onCheckedChange={setShowAverage}
            className="scale-75"
          />
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

              {/* X Axis - Days */}
              <XAxis
                dataKey="dayName"
                tickFormatter={(value) => value.substring(0, 3)}
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
                width={50}
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
                maxBarSize={60}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.pnl > BREAK_EVEN_THRESHOLD ? COLORS.profit : entry.pnl < -BREAK_EVEN_THRESHOLD ? COLORS.loss : 'hsl(var(--muted-foreground)/0.4)'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
})

export default WeekdayPnL