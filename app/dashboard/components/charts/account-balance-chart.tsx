"use client"

import * as React from "react"
const { memo } = React
import {
  Line,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  Dot
} from "recharts"
import { Info } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useData } from "@/context/data-provider"
import { useUserStore } from "@/store/user-store"
import { cn, formatCurrency, formatNumber, formatPercent, BREAK_EVEN_THRESHOLD } from "@/lib/utils"
import { WidgetSize } from '@/app/dashboard/types/dashboard'
import { getWidgetStyles } from '@/app/dashboard/config/widget-dimensions'
import { calculateTotalStartingBalance } from '@/lib/utils/balance-calculator'

// ============================================================================
// TYPES
// ============================================================================

interface AccountBalanceChartProps {
  size?: WidgetSize
}

interface ChartDataPoint {
  date: string
  balance: number
  change: number
  changePercent: number
  trades: number
  wins: number
  losses: number
  hasActivity: boolean
}

// ============================================================================
// CONSTANTS - Tradezella Premium Styling
// ============================================================================

const COLORS = {
  profit: 'hsl(var(--chart-profit))',
  loss: 'hsl(var(--chart-loss))',
  grid: 'hsl(var(--border))',
  axis: 'hsl(var(--muted-foreground))',
  line: 'hsl(var(--chart-profit))'
} as const

const CHART_CONFIG = {
  gridOpacity: 0.25,
  strokeWidth: 2.5,
  dotRadius: 4
} as const

// ============================================================================
// TOOLTIP COMPONENT - Glassmorphism Style
// ============================================================================

function ChartTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null

  const data = payload[0].payload as ChartDataPoint
  const date = new Date(data.date + 'T00:00:00Z')
  const isProfit = data.change > BREAK_EVEN_THRESHOLD
  const isLoss = data.change < -BREAK_EVEN_THRESHOLD

  return (
    <div className="bg-card/95 backdrop-blur-md border border-border/50 rounded-xl p-4 shadow-2xl min-w-[220px]">
      {/* Date Header */}
      <p className="text-xs font-medium text-muted-foreground mb-2">
        {date.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
          year: "numeric",
          timeZone: 'UTC'
        })}
      </p>

      {/* Balance - Large & Bold */}
      <div className="mb-3">
        <span className="text-xs text-muted-foreground">Balance</span>
        <p className="text-2xl font-bold tracking-tight">
          {formatCurrency(data.balance)}
        </p>
      </div>

      {/* Change */}
      <div className={cn(
        "flex items-center justify-between py-2 px-3 rounded-lg",
        isProfit ? "bg-long/10" : isLoss ? "bg-short/10" : "bg-muted/10"
      )}>
        <span className="text-xs text-muted-foreground">Change</span>
        <span className={cn(
          "text-sm font-bold",
          isProfit ? "text-long" : isLoss ? "text-short" : "text-muted-foreground"
        )}>
          {isProfit || isLoss ? (isProfit ? "+" : "") + formatCurrency(data.change) : "$0.00"} ({isProfit || isLoss ? (isProfit ? "+" : "") + formatPercent(data.changePercent) : "0%"})
        </span>
      </div>

      {/* Trade Stats */}
      {data.trades > 0 && (
        <div className="mt-3 pt-3 border-t border-border/30 grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-lg font-bold">{data.trades}</p>
            <p className="text-[10px] text-muted-foreground">Trades</p>
          </div>
          <div>
            <p className="text-lg font-bold text-long">{data.wins}</p>
            <p className="text-[10px] text-muted-foreground">Wins</p>
          </div>
          <div>
            <p className="text-lg font-bold text-short">{data.losses}</p>
            <p className="text-[10px] text-muted-foreground">Losses</p>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// CUSTOM DOT COMPONENT
// ============================================================================

function CustomDot(props: any) {
  const { cx, cy, payload } = props
  if (!payload.hasActivity) return null

  return (
    <Dot
      cx={cx}
      cy={cy}
      r={CHART_CONFIG.dotRadius}
      fill={COLORS.profit}
      stroke="hsl(var(--background))"
      strokeWidth={2}
    />
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

function AccountBalanceChart({ size = 'small-long' }: AccountBalanceChartProps) {
  // ---------------------------------------------------------------------------
  // DATA HOOKS (PRESERVED - DO NOT MODIFY)
  // ---------------------------------------------------------------------------
  const { calendarData, formattedTrades, accountNumbers } = useData()
  const allAccounts = useUserStore(state => state.accounts)

  // ---------------------------------------------------------------------------
  // ACCOUNT FILTERING (PRESERVED - DO NOT MODIFY)
  // ---------------------------------------------------------------------------
  const accounts = React.useMemo(() => {
    if (!allAccounts || allAccounts.length === 0) return []
    if (!accountNumbers || accountNumbers.length === 0) {
      return allAccounts
    }
    return allAccounts.filter(acc => accountNumbers.includes(acc.number))
  }, [allAccounts, accountNumbers])

  // ---------------------------------------------------------------------------
  // DATA PROCESSING (PRESERVED - DO NOT MODIFY)
  // ---------------------------------------------------------------------------
  const chartData = React.useMemo(() => {
    const initialBalance = calculateTotalStartingBalance(accounts)

    if (accounts.length === 0 || initialBalance === 0) {
      return []
    }

    const { groupTradesByExecution } = require('@/lib/utils')
    const groupedTrades = groupTradesByExecution(formattedTrades)

    const tradesByDate = groupedTrades.reduce((acc: Record<string, { wins: number; losses: number; trades: number }>, trade: any) => {
      const date = trade.entryDate.split('T')[0]
      if (!acc[date]) {
        acc[date] = { wins: 0, losses: 0, trades: 0 }
      }
      acc[date].trades++
      const netPnL = trade.pnl - (trade.commission || 0)
      if (netPnL > BREAK_EVEN_THRESHOLD) {
        acc[date].wins++
      } else if (netPnL < -BREAK_EVEN_THRESHOLD) {
        acc[date].losses++
      }
      return acc
    }, {})

    const sortedData = Object.entries(calendarData)
      .map(([date, values]) => ({
        date,
        dailyPnL: values.pnl,
        trades: tradesByDate[date]?.trades || 0,
        wins: tradesByDate[date]?.wins || 0,
        losses: tradesByDate[date]?.losses || 0,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    const daysWithActivity = sortedData.filter(item => item.trades > 0)

    if (daysWithActivity.length === 0) {
      return []
    }

    const firstTradeDate = daysWithActivity[0].date
    const dayBeforeFirstTrade = new Date(firstTradeDate + 'T00:00:00Z')
    dayBeforeFirstTrade.setDate(dayBeforeFirstTrade.getDate() - 1)
    const startingPointDate = dayBeforeFirstTrade.toISOString().split('T')[0]

    const result: ChartDataPoint[] = [{
      date: startingPointDate,
      balance: initialBalance,
      change: 0,
      changePercent: 0,
      trades: 0,
      wins: 0,
      losses: 0,
      hasActivity: false,
    }]

    let runningBalance = initialBalance
    let previousBalance = initialBalance

    const activityPoints = daysWithActivity.map((item) => {
      runningBalance += item.dailyPnL
      const change = runningBalance - previousBalance
      const changePercent = previousBalance !== 0 ? (change / Math.abs(previousBalance)) * 100 : 0

      const point = {
        date: item.date,
        balance: runningBalance,
        change: change,
        changePercent: changePercent,
        trades: item.trades,
        wins: item.wins,
        losses: item.losses,
        hasActivity: true,
      }

      previousBalance = runningBalance
      return point
    })

    return [...result, ...activityPoints]
  }, [calendarData, formattedTrades, accounts])

  // ---------------------------------------------------------------------------
  // LINE COLOR DETERMINATION (PRESERVED - DO NOT MODIFY)
  // ---------------------------------------------------------------------------
  const initialBalance = React.useMemo(() => calculateTotalStartingBalance(accounts), [accounts])
  const currentBalance = chartData.length > 0 ? chartData[chartData.length - 1].balance : initialBalance
  const isPositive = currentBalance >= initialBalance

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
            Account Balance
          </CardTitle>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-4 w-4 text-muted-foreground hover:text-foreground cursor-help transition-colors" />
            </TooltipTrigger>
            <TooltipContent>
              <p>Account balance progression over time</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Current Balance Badge */}
        {chartData.length > 0 && (
          <div className={cn(
            "text-xs font-bold px-2 py-1 rounded-md",
            isPositive ? "bg-long/10 text-long" : "bg-short/10 text-short"
          )}>
            {formatCurrency(currentBalance)}
          </div>
        )}
      </CardHeader>

      {/* Chart Container */}
      <CardContent className="flex-1 p-0 relative min-h-[100px]">
        <div className="absolute inset-0">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 20, right: 20, left: 10, bottom: 20 }}
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
                domain={['auto', 'auto']}
              />

              {/* Tooltip */}
              <RechartsTooltip
                content={<ChartTooltip />}
                cursor={{ stroke: 'hsl(var(--muted-foreground))', strokeDasharray: '3 3' }}
              />

              {/* Line */}
              <Line
                type="monotone"
                dataKey="balance"
                stroke={isPositive ? COLORS.profit : COLORS.loss}
                strokeWidth={CHART_CONFIG.strokeWidth}
                dot={<CustomDot />}
                activeDot={{
                  r: 6,
                  strokeWidth: 2,
                  stroke: 'hsl(var(--background))'
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

export default memo(AccountBalanceChart)
