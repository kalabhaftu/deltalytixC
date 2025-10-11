"use client"

import * as React from "react"
import { Line, LineChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Tooltip, Dot } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartConfig, ChartContainer } from "@/components/ui/chart"
import { useData } from "@/context/data-provider"
import { useUserStore } from "@/store/user-store"
import { cn } from "@/lib/utils"
import { WidgetSize } from '@/app/dashboard/types/dashboard'
import { Info } from 'lucide-react'
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { calculateTotalStartingBalance } from '@/lib/utils/balance-calculator'

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

interface TooltipProps {
  active?: boolean
  payload?: Array<{
    payload: ChartDataPoint
  }>
}

const chartConfig = {
  balance: {
    label: "Account Balance",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig

import { formatCurrency, formatNumber, formatPercent } from '@/lib/utils'

const formatCurrencyValue = (value: number) => {
  const absValue = Math.abs(value)
  if (absValue >= 1000000) {
    return `${value < 0 ? '-' : ''}$${formatNumber(absValue / 1000000, 1)}M`
  }
  if (absValue >= 1000) {
    return `${value < 0 ? '-' : ''}$${formatNumber(absValue / 1000, 1)}k`
  }
  return `${value < 0 ? '-' : ''}$${formatNumber(absValue, 0)}`
}

const CustomTooltip = ({ active, payload }: TooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    const date = new Date(data.date + 'T00:00:00Z')
    
    return (
      <div className="bg-background p-3 border rounded shadow-sm min-w-[200px]">
        <p className="font-semibold text-sm mb-2">
          {date.toLocaleDateString("en-US", { 
            month: "short", 
            day: "numeric", 
            year: "numeric",
            timeZone: 'UTC'
          })}
        </p>
        <div className="space-y-1">
          <p className="font-bold text-base">
            Balance: {formatCurrency(data.balance)}
          </p>
          <p className={cn(
            "text-sm font-medium",
            data.change >= 0 ? 'text-green-600' : 'text-red-600'
          )}>
            Change: {data.change >= 0 ? '+' : ''}{formatCurrency(data.change)} ({data.changePercent >= 0 ? '+' : ''}{formatPercent(data.changePercent)})
          </p>
          <div className="text-xs text-muted-foreground mt-2 pt-2 border-t space-y-0.5">
            <p>Trades Executed: {data.trades}</p>
            <p className="text-green-600">Wins: {data.wins}</p>
            <p className="text-red-600">Losses: {data.losses}</p>
          </div>
        </div>
      </div>
    )
  }
  return null
}

// Custom dot to show on activity days
const CustomDot = (props: any) => {
  const { cx, cy, payload } = props
  if (!payload.hasActivity) return null
  
  return (
    <Dot 
      cx={cx} 
      cy={cy} 
      r={3} 
      fill="hsl(var(--chart-2))" 
      stroke="hsl(var(--background))"
      strokeWidth={1.5}
    />
  )
}

export default function AccountBalanceChart({ size = 'small-long' }: AccountBalanceChartProps) {
  const { calendarData, formattedTrades } = useData()
  const accounts = useUserStore(state => state.accounts)

  const chartData = React.useMemo(() => {
    // ✅ USE UNIFIED CALCULATOR - Handles prop firm phase deduplication
    // This replaces the old naive sum that would triple-count prop firm accounts
    const initialBalance = calculateTotalStartingBalance(accounts)
    
    // Group trades by date and calculate wins/losses
    const tradesByDate = formattedTrades.reduce((acc, trade) => {
      const date = trade.entryDate.split('T')[0]
      if (!acc[date]) {
        acc[date] = { wins: 0, losses: 0, trades: 0 }
      }
      acc[date].trades++
      const netPnL = trade.pnl - (trade.commission || 0)
      if (netPnL > 0) {
        acc[date].wins++
      } else if (netPnL < 0) {
        acc[date].losses++
      }
      return acc
    }, {} as Record<string, { wins: number; losses: number; trades: number }>)

    // Get all dates and sort them
    const sortedData = Object.entries(calendarData)
      .map(([date, values]) => ({
        date,
        dailyPnL: values.pnl,
        trades: tradesByDate[date]?.trades || 0,
        wins: tradesByDate[date]?.wins || 0,
        losses: tradesByDate[date]?.losses || 0,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    // Filter to only days with trades (activity)
    const daysWithActivity = sortedData.filter(item => item.trades > 0)

    // Calculate cumulative balance starting from initial balance
    let runningBalance = initialBalance
    let previousBalance = initialBalance

    return daysWithActivity.map((item, index) => {
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
  }, [calendarData, formattedTrades, accounts])

  // Determine line color based on current balance vs initial balance
  // ✅ USE UNIFIED CALCULATOR - Same deduplication logic as chart data
  const initialBalance = React.useMemo(() => calculateTotalStartingBalance(accounts), [accounts])
  const currentBalance = chartData.length > 0 ? chartData[chartData.length - 1].balance : initialBalance
  const isPositive = currentBalance >= initialBalance

  return (
    <Card className="h-full flex flex-col">
      <CardHeader 
        className={cn(
          "flex flex-col items-stretch space-y-0 border-b shrink-0",
          size === 'small-long' ? "p-2 h-[40px]" : size === 'small' ? "p-2 h-[48px]" : "p-3 sm:p-4 h-[56px]"
        )}
      >
        <div className="flex items-center justify-between h-full">
          <div className="flex items-center gap-1.5">
            <CardTitle 
              className={cn(
                "line-clamp-1",
                size === 'small-long' ? "text-sm" : "text-base"
              )}
            >
              Account Balance
            </CardTitle>
            <TooltipProvider delayDuration={100}>
              <UITooltip>
                <TooltipTrigger asChild>
                  <Info className={cn(
                    "text-muted-foreground hover:text-foreground transition-colors cursor-help",
                    size === 'small-long' ? "h-3.5 w-3.5" : "h-4 w-4"
                  )} />
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>Account balance progression over time. Only shows days with trading activity.</p>
                </TooltipContent>
              </UITooltip>
            </TooltipProvider>
          </div>
        </div>
      </CardHeader>
      <CardContent 
        className={cn(
          "flex-1",
          size === 'small' ? "p-1" : "p-2 sm:p-4"
        )}
      >
        <div className="w-full h-[200px]">
          <ChartContainer config={chartConfig} className="w-full h-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={
                  size === 'small'
                    ? { left: -10, right: 0, top: 0, bottom: 0 }
                    : { left: -15, right: 0, top: 5, bottom: 5 }
                }
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  height={size === 'small' ? 20 : 24}
                  tickMargin={size === 'small' ? 4 : 8}
                  tick={{ 
                    fontSize: size === 'small' ? 9 : 11,
                    fill: 'currentColor'
                  }}
                  minTickGap={size === 'small' ? 30 : 50}
                  tickFormatter={(value) => {
                    const date = new Date(value + 'T00:00:00Z')
                    return date.toLocaleDateString("en-US", {
                      day: "numeric",
                      month: "short",
                      timeZone: 'UTC'
                    })
                  }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={60}
                  tickMargin={4}
                  tick={{ 
                    fontSize: size === 'small' ? 9 : 11,
                    fill: 'currentColor'
                  }}
                  tickFormatter={formatCurrencyValue}
                />
                <Tooltip 
                  content={<CustomTooltip />}
                  wrapperStyle={{ 
                    fontSize: size === 'small' ? '10px' : '12px',
                    zIndex: 1000
                  }} 
                />
                <Line
                  type="monotone"
                  dataKey="balance"
                  stroke={isPositive ? "hsl(var(--chart-2))" : "hsl(var(--chart-1))"}
                  strokeWidth={2}
                  dot={<CustomDot />}
                  activeDot={{ r: 5 }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  )
}
