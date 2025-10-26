"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, ReferenceLine, Tooltip } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartConfig, ChartContainer } from "@/components/ui/chart"
import { useData } from "@/context/data-provider"
import { cn } from "@/lib/utils"
import { WidgetSize } from '@/app/dashboard/types/dashboard'
import { Info } from 'lucide-react'
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface DailyCumulativePnLProps {
  size?: WidgetSize
}

interface ChartDataPoint {
  date: string
  cumulativePnL: number
  dailyPnL: number
  trades: number
}

interface TooltipProps {
  active?: boolean
  payload?: Array<{
    payload: ChartDataPoint
  }>
}

const chartConfig = {
  cumulativePnL: {
    label: "Cumulative P/L",
    color: "hsl(var(--chart-2))",
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

const CustomTooltip = ({ active, payload }: TooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    const date = new Date(data.date + 'T00:00:00Z')
    return (
      <div className="bg-background p-2 border rounded shadow-sm">
        <p className="font-semibold text-sm">
          {date.toLocaleDateString("en-US", { 
            month: "short", 
            day: "numeric", 
            year: "numeric",
            timeZone: 'UTC'
          })}
        </p>
        <p className={`font-bold ${data.cumulativePnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          Cumulative: {formatCurrency(data.cumulativePnL)}
        </p>
        <div className="text-xs text-muted-foreground mt-1">
          <p className={data.dailyPnL >= 0 ? 'text-green-600' : 'text-red-600'}>
            Daily: {formatCurrency(data.dailyPnL)}
          </p>
          <p>Trades: {data.trades}</p>
        </div>
      </div>
    )
  }
  return null
}

export default function DailyCumulativePnL({ size = 'small-long' }: DailyCumulativePnLProps) {
  const { calendarData } = useData()

  const chartData = React.useMemo(() => {
    const sortedData = Object.entries(calendarData)
      .map(([date, values]) => ({
        date,
        dailyPnL: values.pnl,
        trades: values.shortNumber + values.longNumber,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    // Calculate cumulative P/L
    let cumulative = 0
    return sortedData.map(item => {
      cumulative += item.dailyPnL
      return {
        ...item,
        cumulativePnL: cumulative,
      }
    })
  }, [calendarData])

  // Calculate gradient colors based on final cumulative value
  const finalValue = chartData.length > 0 ? chartData[chartData.length - 1].cumulativePnL : 0
  const isPositive = finalValue >= 0

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
              Daily Net Cumulative P/L
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
                  <p className="text-xs">Running total of profit/loss over time. Shows how your account balance changes day by day.</p>
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
              <AreaChart
                data={chartData}
                margin={
                  size === 'small'
                    ? { left: -10, right: 0, top: 0, bottom: 0 }
                    : { left: -15, right: 0, top: 5, bottom: 5 }
                }
              >
                <defs>
                  <linearGradient id="colorPnL" x1="0" y1="0" x2="0" y2="1">
                    <stop 
                      offset="5%" 
                      stopColor={isPositive ? "hsl(var(--chart-profit))" : "hsl(var(--chart-loss))"} 
                      stopOpacity={0.4}
                    />
                    <stop 
                      offset="95%" 
                      stopColor={isPositive ? "hsl(var(--chart-profit))" : "hsl(var(--chart-loss))"} 
                      stopOpacity={0.0}
                    />
                  </linearGradient>
                </defs>
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
                      month: "short",
                      day: "numeric",
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
                <Area
                  type="monotone"
                  dataKey="cumulativePnL"
                  stroke={isPositive ? "hsl(var(--chart-profit))" : "hsl(var(--chart-loss))"}
                  strokeWidth={2}
                  fill="url(#colorPnL)"
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  )
}