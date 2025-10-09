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

interface TooltipProps {
  active?: boolean
  payload?: Array<{
    payload: DurationData
  }>
  label?: string
}

const chartConfig = {
  pnl: {
    label: "Trade Duration Performance",
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
        <p className="font-semibold text-sm">{data.bucket}</p>
        <p className={`font-bold ${data.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          Total P/L: {formatCurrency(data.pnl)}
        </p>
        <div className="text-xs text-muted-foreground mt-1">
          <p>Trades: {data.trades}</p>
          <p>Avg P/L: {formatCurrency(data.avgPnl)}</p>
          <p>Win Rate: {data.winRate.toFixed(1)}%</p>
          <p className="text-green-600">Wins: {data.wins}</p>
          <p className="text-red-600">Losses: {data.losses}</p>
        </div>
      </div>
    )
  }
  return null
}

// Helper to calculate duration in minutes
const calculateDurationMinutes = (entryTime: string, exitTime: string): number => {
  const entry = new Date(entryTime).getTime()
  const exit = new Date(exitTime).getTime()
  return (exit - entry) / (1000 * 60) // Convert to minutes
}

// Helper to categorize duration into buckets
const getDurationBucket = (minutes: number): string => {
  if (minutes < 1) return "< 1min"
  if (minutes < 5) return "1-5min"
  if (minutes < 15) return "5-15min"
  if (minutes < 30) return "15-30min"
  if (minutes < 60) return "30min-1hr"
  if (minutes < 120) return "1-2hr"
  if (minutes < 240) return "2-4hr"
  return "4hr+"
}

export default function TradeDurationPerformance({ size = 'small-long' }: TradeDurationPerformanceProps) {
  const { formattedTrades } = useData()
  const [showAverage, setShowAverage] = React.useState(false)

  const chartData = React.useMemo(() => {
    // Define bucket order
    const bucketOrder = [
      "< 1min",
      "1-5min", 
      "5-15min",
      "15-30min",
      "30min-1hr",
      "1-2hr",
      "2-4hr",
      "4hr+"
    ]

    // Group trades by duration bucket
    const durationMap: Record<string, { pnl: number; trades: number; wins: number; losses: number }> = {}
    
    bucketOrder.forEach(bucket => {
      durationMap[bucket] = { pnl: 0, trades: 0, wins: 0, losses: 0 }
    })

    formattedTrades.forEach(trade => {
      if (trade.entryDate && trade.closeDate) {
        const durationMinutes = calculateDurationMinutes(trade.entryDate, trade.closeDate)
        const bucket = getDurationBucket(durationMinutes)
        
        const netPnL = trade.pnl - (trade.commission || 0)
        durationMap[bucket].pnl += netPnL
        durationMap[bucket].trades++
        
        if (netPnL > 0) {
          durationMap[bucket].wins++
        } else if (netPnL < 0) {
          durationMap[bucket].losses++
        }
      }
    })

    // Create chart data in correct order
    return bucketOrder.map(bucket => {
      const data = durationMap[bucket]
      const winRate = data.trades > 0 ? (data.wins / data.trades) * 100 : 0
      const avgPnl = data.trades > 0 ? data.pnl / data.trades : 0
      
      // Apply average if toggle is on
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
    }).filter(item => item.trades > 0) // Only show buckets with trades
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
              Trade Duration Performance
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
                  <p>P&L by how long trades were held. Toggle to show average P&L per trade.</p>
                </TooltipContent>
              </UITooltip>
            </TooltipProvider>
          </div>
          
          {/* Average Toggle */}
          <div className="flex items-center gap-2">
            <Label htmlFor="duration-average-toggle" className="text-xs text-muted-foreground cursor-pointer">
              Average
            </Label>
            <Switch
              id="duration-average-toggle"
              checked={showAverage}
              onCheckedChange={setShowAverage}
              className="scale-75"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent 
        className={cn(
          "flex-1 min-h-[200px]",
          size === 'small' ? "p-1" : "p-2 sm:p-4"
        )}
      >
        <div className="w-full h-full">
          <ChartContainer config={chartConfig} className="w-full h-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={
                  size === 'small'
                    ? { left: -10, right: -10, top: 0, bottom: 25 }
                    : { left: -20, right: -10, top: 5, bottom: 30 }
                }
                barGap={0}
              >
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  className="text-border dark:opacity-[0.12] opacity-[0.2]"
                />
                <XAxis
                  dataKey="bucket"
                  tickLine={false}
                  axisLine={false}
                  height={size === 'small' ? 20 : 32}
                  tickMargin={size === 'small' ? 4 : 8}
                  tick={{ 
                    fontSize: size === 'small' ? 8 : 10,
                    fill: 'currentColor'
                  }}
                  angle={-45}
                  textAnchor="end"
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
                  maxBarSize={size === 'small' ? 30 : 50}
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
}

