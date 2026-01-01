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

interface TradeDurationPerformanceProps {
  size?: WidgetSize
}

interface DurationData {
  bucket: string
  pnl: number
  trades: number
  wins: number
  losses: number
  winRate: number
  avgPnl: number
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

const BUCKET_ORDER = [
  "< 1min",
  "1-5min",
  "5-15min",
  "15-30min",
  "30min-1hr",
  "1-2hr",
  "2-4hr",
  "4hr+"
] as const

// ============================================================================
// TOOLTIP COMPONENT - Glassmorphism Style
// ============================================================================

function ChartTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null

  const data = payload[0].payload as DurationData
  const isProfit = data.pnl >= 0

  return (
    <div className="bg-card/95 backdrop-blur-md border border-border/50 rounded-xl p-4 shadow-2xl min-w-[180px]">
      {/* Duration Header */}
      <p className="text-sm font-bold mb-2">{data.bucket}</p>

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
          <span className="text-muted-foreground">Avg P/L</span>
          <span className={cn(
            "font-semibold",
            data.avgPnl >= 0 ? "text-emerald-500" : "text-red-500"
          )}>
            {formatCurrency(data.avgPnl)}
          </span>
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

function calculateDurationMinutes(entryTime: string, exitTime: string): number {
  const entry = new Date(entryTime).getTime()
  const exit = new Date(exitTime).getTime()
  return (exit - entry) / (1000 * 60)
}

function getDurationBucket(minutes: number): string {
  if (minutes < 1) return "< 1min"
  if (minutes < 5) return "1-5min"
  if (minutes < 15) return "5-15min"
  if (minutes < 30) return "15-30min"
  if (minutes < 60) return "30min-1hr"
  if (minutes < 120) return "1-2hr"
  if (minutes < 240) return "2-4hr"
  return "4hr+"
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function TradeDurationPerformance({ size = 'small-long' }: TradeDurationPerformanceProps) {
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

    const durationMap: Record<string, { pnl: number; trades: number; wins: number; losses: number }> = {}

    BUCKET_ORDER.forEach(bucket => {
      durationMap[bucket] = { pnl: 0, trades: 0, wins: 0, losses: 0 }
    })

    groupedTrades.forEach((trade: any) => {
      if (trade.entryDate && trade.closeDate) {
        const durationMinutes = calculateDurationMinutes(trade.entryDate, trade.closeDate)
        const bucket = getDurationBucket(durationMinutes)

        const netPnL = trade.pnl - (trade.commission || 0)
        durationMap[bucket].pnl += netPnL
        durationMap[bucket].trades++

        if (netPnL > BREAK_EVEN_THRESHOLD) {
          durationMap[bucket].wins++
        } else if (netPnL < -BREAK_EVEN_THRESHOLD) {
          durationMap[bucket].losses++
        }
      }
    })

    return BUCKET_ORDER.map(bucket => {
      const data = durationMap[bucket]
      const winRate = data.trades > 0 ? (data.wins / data.trades) * 100 : 0
      const avgPnl = data.trades > 0 ? data.pnl / data.trades : 0
      const displayPnl = showAverage ? avgPnl : data.pnl

      return {
        bucket,
        pnl: displayPnl,
        trades: data.trades,
        wins: data.wins,
        losses: data.losses,
        winRate,
        avgPnl,
      }
    }).filter(item => item.trades > 0)
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
            Duration Performance
          </CardTitle>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-4 w-4 text-muted-foreground hover:text-foreground cursor-help transition-colors" />
            </TooltipTrigger>
            <TooltipContent>
              <p>Performance based on trade duration length</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Average Toggle */}
        <div className="flex items-center gap-2">
          <Label
            htmlFor="duration-average"
            className="text-xs text-muted-foreground cursor-pointer"
          >
            Avg
          </Label>
          <Switch
            id="duration-average"
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

              {/* X Axis - Duration Buckets */}
              <XAxis
                dataKey="bucket"
                stroke={COLORS.axis}
                fontSize={isCompact ? 9 : 10}
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                angle={-20}
                textAnchor="end"
                height={40}
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
