"use client"

import * as React from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Cell, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartConfig, ChartContainer } from "@/components/ui/chart"
import { useData } from "@/context/data-provider"
import { cn } from "@/lib/utils"
import { WidgetSize } from '@/app/dashboard/types/dashboard'
import { Info } from 'lucide-react'
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

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

interface TooltipProps {
  active?: boolean
  payload?: Array<{
    payload: WeekdayData
  }>
  label?: string
}

const chartConfig = {
  pnl: {
    label: "P/L by Weekday",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig

import { formatCurrency, formatNumber } from '@/lib/utils'

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

const positiveColor = "hsl(var(--chart-2))" // Green color
const negativeColor = "hsl(var(--chart-1))" // Red/Orange color

const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <div className="bg-background p-2 border rounded shadow-sm">
        <p className="font-semibold text-sm">{data.dayName}</p>
        <p className={`font-bold ${data.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          P/L: {formatCurrency(data.pnl)}
        </p>
        <div className="text-xs text-muted-foreground mt-1">
          <p>Trades: {data.trades} ({data.losses} losses)</p>
          <p className="text-green-600">Wins: {data.wins}</p>
          <p className="text-red-600">Losses: {data.losses}</p>
          <p>Win Rate: {data.winRate.toFixed(1)}%</p>
        </div>
      </div>
    )
  }
  return null
}

const WeekdayPnL = React.memo(function WeekdayPnL({ size = 'small-long' }: WeekdayPnLProps) {
  const { formattedTrades } = useData()
  const [showAverage, setShowAverage] = React.useState(false)

  const chartData = React.useMemo(() => {
    // CRITICAL FIX: Group trades first to handle partial closes
    const { groupTradesByExecution } = require('@/lib/utils')
    const groupedTrades = groupTradesByExecution(formattedTrades)

    // Group trades by weekday (0=Sunday, 1=Monday, ..., 6=Saturday)
    const weekdayMap: Record<number, { pnl: number; trades: number; wins: number; losses: number }> = {}
    
    groupedTrades.forEach((trade: any) => {
      const date = new Date(trade.entryDate)
      const dayOfWeek = date.getDay()
      
      // Only include Monday-Friday (1-5)
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        if (!weekdayMap[dayOfWeek]) {
          weekdayMap[dayOfWeek] = { pnl: 0, trades: 0, wins: 0, losses: 0 }
        }
        
        const netPnL = trade.pnl - (trade.commission || 0)
        weekdayMap[dayOfWeek].pnl += netPnL
        weekdayMap[dayOfWeek].trades++
        
        if (netPnL > 0) {
          weekdayMap[dayOfWeek].wins++
        } else if (netPnL < 0) {
          weekdayMap[dayOfWeek].losses++
        }
      }
    })

    // Create chart data for Mon-Fri
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
      
      // Calculate win rate
      const winRate = data.trades > 0 ? (data.wins / data.trades) * 100 : 0
      
      // Apply average if toggle is on
      const displayPnl = showAverage && data.trades > 0 ? data.pnl / data.trades : data.pnl

      return {
        day,
        dayName: dayName.substring(0, 3), // Short name for chart
        pnl: displayPnl,
        trades: data.trades,
        wins: data.wins,
        losses: data.losses,
        winRate,
      }
    })
  }, [formattedTrades, showAverage])

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
              Weekday P/L
            </CardTitle>
            <TooltipProvider delayDuration={100}>
              <UITooltip>
                <TooltipTrigger asChild>
                  <Info className={cn(
                    "text-muted-foreground hover:text-foreground transition-colors cursor-help",
                    size === 'small-long' ? "h-3.5 w-3.5" : "h-4 w-4"
                  )} />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[180px]">
                  <p className="text-xs">P&L breakdown by weekday (Mon-Fri). Toggle to show average P&L per trade.</p>
                </TooltipContent>
              </UITooltip>
            </TooltipProvider>
          </div>
          
          {/* Average Toggle */}
          <div className="flex items-center gap-2">
            <Label htmlFor="average-toggle" className="text-xs text-muted-foreground cursor-pointer">
              Average
            </Label>
            <Switch
              id="average-toggle"
              checked={showAverage}
              onCheckedChange={setShowAverage}
              className="scale-75"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent
        className={cn(
          "flex-1 min-h-[280px]",
          size === 'small' || size === 'small-long' ? "p-1" : "p-2 sm:p-4"
        )}
      >
        <div className="w-full h-full">
          <ChartContainer config={chartConfig} className="w-full h-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={
                  size === 'small'
                    ? { left: -10, right: -10, top: 0, bottom: 5 }
                    : { left: -20, right: -10, top: 5, bottom: 10 }
                }
                barGap={0}
              >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
                vertical={false}
              />
                <XAxis
                  dataKey="dayName"
                  tickLine={false}
                  axisLine={false}
                  height={size === 'small' ? 20 : 24}
                  tickMargin={size === 'small' ? 4 : 8}
                  tick={{ 
                    fontSize: size === 'small' ? 9 : 11,
                    fill: 'currentColor'
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
                <ReferenceLine
                  y={0}
                  stroke="hsl(var(--muted-foreground))"
                  strokeDasharray="3 3"
                  strokeOpacity={0.5}
                />
                <Tooltip 
                  content={<CustomTooltip />}
                  wrapperStyle={{ 
                    fontSize: size === 'small' ? '10px' : '12px',
                    zIndex: 1000
                  }} 
                />
                <Bar
                  dataKey="pnl"
                  radius={[3, 3, 0, 0]}
                  maxBarSize={size === 'small' ? 40 : 60}
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.pnl >= 0 ? positiveColor : negativeColor}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  )
})

export default WeekdayPnL