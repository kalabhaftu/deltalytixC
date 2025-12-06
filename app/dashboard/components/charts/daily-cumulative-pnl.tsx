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
  positivePnL: number | null
  negativePnL: number | null
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

    // Calculate cumulative P/L with zero-crossing interpolation for smooth transitions
    let cumulative = 0
    const result: ChartDataPoint[] = []

    sortedData.forEach((item, index) => {
      const prevCumulative = cumulative
      cumulative += item.dailyPnL

      // If line crosses zero, add interpolated point at zero for smooth transition
      if (index > 0 && prevCumulative !== 0 && cumulative !== 0) {
        if ((prevCumulative > 0 && cumulative < 0) || (prevCumulative < 0 && cumulative > 0)) {
          // Line crosses zero - add interpolated point
          const prevDate = sortedData[index - 1]?.date
          if (prevDate) {
            const ratio = Math.abs(prevCumulative) / (Math.abs(prevCumulative) + Math.abs(cumulative))
            const interpolatedDate = new Date(
              new Date(prevDate).getTime() +
              ratio * (new Date(item.date).getTime() - new Date(prevDate).getTime())
            ).toISOString().split('T')[0]

            result.push({
              date: interpolatedDate,
              dailyPnL: 0,
              trades: 0,
              cumulativePnL: 0,
              positivePnL: 0,
              negativePnL: 0,
            })
          }
        }
      }

      const positivePnL = cumulative > 0 ? cumulative : (cumulative === 0 ? 0 : null)
      const negativePnL = cumulative < 0 ? cumulative : (cumulative === 0 ? 0 : null)

      result.push({
        ...item,
        cumulativePnL: cumulative,
        positivePnL,
        negativePnL,
      })
    })

    return result
  }, [calendarData])


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
        <div className="w-full h-[280px]">
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
                  {/* Green gradient for profit area (above zero) */}
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor="hsl(var(--chart-profit))"
                      stopOpacity={0.4}
                    />
                    <stop
                      offset="95%"
                      stopColor="hsl(var(--chart-profit))"
                      stopOpacity={0.05}
                    />
                  </linearGradient>
                  {/* Red gradient for loss area (below zero) */}
                  <linearGradient id="colorLoss" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor="hsl(var(--chart-loss))"
                      stopOpacity={0.05}
                    />
                    <stop
                      offset="95%"
                      stopColor="hsl(var(--chart-loss))"
                      stopOpacity={0.4}
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
                {/* Green line and fill for positive values */}
                <Area
                  type="monotone"
                  dataKey="positivePnL"
                  stroke="hsl(var(--chart-profit))"
                  strokeWidth={2}
                  fill="url(#colorProfit)"
                  isAnimationActive={false}
                  dot={false}
                  activeDot={false}
                />
                {/* Red line and fill for negative values */}
                <Area
                  type="monotone"
                  dataKey="negativePnL"
                  stroke="hsl(var(--chart-loss))"
                  strokeWidth={2}
                  fill="url(#colorLoss)"
                  isAnimationActive={false}
                  dot={false}
                  activeDot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  )
}