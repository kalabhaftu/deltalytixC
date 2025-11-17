"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useData } from "@/context/data-provider"
import { cn, formatCurrency, formatNumber } from "@/lib/utils"
import { WidgetSize } from '@/app/dashboard/types/dashboard'
import { Info } from 'lucide-react'
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine
} from 'recharts'

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

export default function NetDailyPnL({ size = 'small-long' }: NetDailyPnLProps) {
  const { calendarData, formattedTrades } = useData()

const getNiceStep = (value: number) => {
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

const chartData = React.useMemo(() => {
    // CRITICAL FIX: Group trades first to handle partial closes
    const { groupTradesByExecution } = require('@/lib/utils')
    const groupedTrades = groupTradesByExecution(formattedTrades)

    // Group trades by date to calculate wins/losses
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

  // Custom tooltip component
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      const date = new Date(data.date + 'T00:00:00Z')
      
      return (
        <div className="bg-card p-3 border rounded-lg shadow-lg">
          <p className="font-semibold text-sm mb-1">
            {date.toLocaleDateString("en-US", { 
              month: "short", 
              day: "numeric", 
              year: "numeric",
              timeZone: 'UTC'
            })}
          </p>
          <p className={cn(
            "font-bold text-base mb-2",
            data.pnl >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
          )}>
            Net P/L: {formatCurrency(data.pnl)}
          </p>
          <div className="text-xs text-muted-foreground space-y-0.5">
            <p>Trades: {data.longNumber + data.shortNumber}</p>
            <p>Long: {data.longNumber} | Short: {data.shortNumber}</p>
            <p className="text-green-600 dark:text-green-400">Wins: {data.wins}</p>
            <p className="text-red-600 dark:text-red-400">Losses: {data.losses}</p>
          </div>
        </div>
      )
    }
    return null
  }

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
              Net Daily P/L
            </CardTitle>
            <TooltipProvider delayDuration={100}>
              <UITooltip>
                <TooltipTrigger asChild>
                  <Info className={cn(
                    "text-muted-foreground hover:text-foreground transition-colors cursor-help",
                    size === 'small-long' ? "h-3.5 w-3.5" : "h-4 w-4"
                  )} />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[200px]">
                  <p className="text-xs">Daily profit and loss with trade details. Green bars = profitable days, red bars = losing days.</p>
                </TooltipContent>
              </UITooltip>
            </TooltipProvider>
          </div>
        </div>
      </CardHeader>
      <CardContent 
        className={cn(
          "flex-1 pb-6",
          size === 'small' ? "p-1 pb-6" : "p-2 sm:p-4 pb-6"
        )}
      >
        <ResponsiveContainer width="100%" height={280}>
          <BarChart
            data={chartData}
            margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
            barCategoryGap="30%"
          >
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="hsl(var(--border))" 
              vertical={false}
            />
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
              stroke="hsl(var(--muted-foreground))"
              fontSize={size === 'small' ? 10 : 11}
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              tickFormatter={formatCurrencyValue}
              stroke="hsl(var(--muted-foreground))"
              fontSize={size === 'small' ? 9 : 11}
              tickLine={false}
              axisLine={false}
              domain={yDomain}
              ticks={yTicks}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))' }} />
            <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" opacity={0.5} />
            <Bar dataKey="pnl" radius={[3, 3, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.pnl >= 0 ? 'hsl(var(--chart-profit))' : 'hsl(var(--chart-loss))'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
