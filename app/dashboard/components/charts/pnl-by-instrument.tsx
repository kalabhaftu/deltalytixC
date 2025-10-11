"use client"

import * as React from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Cell, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartConfig, ChartContainer } from "@/components/ui/chart"
import { useData } from "@/context/data-provider"
import { cn } from "@/lib/utils"
import { WidgetSize } from '@/app/dashboard/types/dashboard'
import { Info, TrendingUp, TrendingDown } from 'lucide-react'
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

const chartConfig = {
  pnl: {
    label: "P/L by Instrument",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig

interface PnLByInstrumentProps {
  size?: WidgetSize
}

interface InstrumentData {
  instrument: string
  pnl: number
  trades: number
  wins: number
  losses: number
  winRate: number
}

export default function PnLByInstrument({ size = 'small-long' }: PnLByInstrumentProps) {
  const { formattedTrades } = useData()

  const chartData = React.useMemo(() => {
    // Group trades by instrument
    const instrumentMap: Record<string, { pnl: number; trades: number; wins: number; losses: number }> = {}
    
    formattedTrades.forEach(trade => {
      const instrument = trade.symbol || trade.instrument || 'Unknown'
      
      if (!instrumentMap[instrument]) {
        instrumentMap[instrument] = { pnl: 0, trades: 0, wins: 0, losses: 0 }
      }
      
      const netPnl = (trade.pnl || 0) - (trade.commission || 0)
      instrumentMap[instrument].pnl += netPnl
      instrumentMap[instrument].trades += 1
      
      if (netPnl > 0) {
        instrumentMap[instrument].wins += 1
      } else if (netPnl < 0) {
        instrumentMap[instrument].losses += 1
      }
    })
    
    // Convert to array and calculate win rate
    const data: InstrumentData[] = Object.entries(instrumentMap).map(([instrument, stats]) => ({
      instrument,
      pnl: stats.pnl,
      trades: stats.trades,
      wins: stats.wins,
      losses: stats.losses,
      winRate: stats.trades > 0 ? (stats.wins / stats.trades) * 100 : 0,
    }))
    
    // Sort by PnL (highest first)
    return data.sort((a, b) => b.pnl - a.pnl)
  }, [formattedTrades])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as InstrumentData
      return (
        <div className="rounded-lg border bg-background p-3 shadow-lg">
          <div className="grid gap-2">
            <div className="font-semibold text-sm">{data.instrument}</div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              <span className="text-muted-foreground">P&L:</span>
              <span className={cn("font-medium", data.pnl >= 0 ? "text-green-600" : "text-red-600")}>
                {formatCurrency(data.pnl)}
              </span>
              <span className="text-muted-foreground">Trades:</span>
              <span className="font-medium">{data.trades} ({data.wins}W/{data.losses}L)</span>
              <span className="text-muted-foreground">Win Rate:</span>
              <span className="font-medium">{data.winRate.toFixed(1)}%</span>
            </div>
          </div>
        </div>
      )
    }
    return null
  }

  const totalPnl = chartData.reduce((sum, item) => sum + item.pnl, 0)
  const bestInstrument = chartData.length > 0 ? chartData[0] : null
  const worstInstrument = chartData.length > 0 ? chartData[chartData.length - 1] : null

  return (
    <Card className="h-full flex flex-col">
      <CardHeader
        className={cn(
          "flex flex-row items-center justify-between space-y-0 border-b shrink-0",
          size === 'small-long' ? "p-2 h-[40px]" : size === 'small' ? "p-2 h-[48px]" : "p-3 sm:p-4 h-[56px]"
        )}
      >
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-1.5">
            <CardTitle
              className={cn(
                "line-clamp-1",
                size === 'small-long' ? "text-sm" : "text-base"
              )}
            >
              P&L by Instrument
            </CardTitle>
            <TooltipProvider delayDuration={100}>
              <UITooltip>
                <TooltipTrigger asChild>
                  <Info className={cn(
                    "text-muted-foreground hover:text-foreground transition-colors cursor-help",
                    size === 'small-long' ? "h-3.5 w-3.5" : "h-4 w-4"
                  )} />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[250px]">
                  <p>Profit & Loss breakdown by trading instrument/pair. Shows total P&L, trade count, and win rate for each instrument.</p>
                </TooltipContent>
              </UITooltip>
            </TooltipProvider>
          </div>

          {/* Summary Badge */}
          <div className={cn("flex items-center gap-2", totalPnl >= 0 ? "text-green-600" : "text-red-600")}>
            {totalPnl >= 0 ? (
              <TrendingUp className={cn("h-4 w-4", size === 'small-long' && "h-3 w-3")} />
            ) : (
              <TrendingDown className={cn("h-4 w-4", size === 'small-long' && "h-3 w-3")} />
            )}
            <span className={cn("font-bold", size === 'small-long' ? "text-sm" : "text-base")}>
              {formatCurrency(totalPnl)}
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent
        className={cn(
          "flex-1 min-h-[280px]",
          size === 'small' ? "p-1" : "p-2 sm:p-4"
        )}
      >
        {chartData.length > 0 ? (
          <div className="w-full h-full">
            <ChartContainer config={chartConfig} className="w-full h-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={
                    size === 'small' || size === 'small-long'
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
                    dataKey="instrument"
                    tickLine={false}
                    axisLine={false}
                    height={size === 'small' || size === 'small-long' ? 20 : 24}
                    tickMargin={size === 'small' || size === 'small-long' ? 4 : 8}
                    tick={{
                      fontSize: size === 'small' || size === 'small-long' ? 9 : 11,
                      fill: 'currentColor'
                    }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    width={60}
                    tickMargin={4}
                    tick={{
                      fontSize: size === 'small' || size === 'small-long' ? 9 : 11,
                      fill: 'currentColor'
                    }}
                    tickFormatter={(value) => `$${value >= 1000 ? (value / 1000).toFixed(1) + 'k' : value}`}
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
                      fontSize: size === 'small' || size === 'small-long' ? '10px' : '12px',
                      zIndex: 1000
                    }}
                  />
                  <Bar
                    dataKey="pnl"
                    radius={[3, 3, 0, 0]}
                    maxBarSize={size === 'small' || size === 'small-long' ? 40 : 60}
                  >
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.pnl >= 0 ? 'hsl(var(--chart-profit))' : 'hsl(var(--chart-loss))'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center min-h-[280px]">
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">No instrument data available</p>
              <p className="text-xs text-muted-foreground">Import trades to see P&L by instrument</p>
            </div>
          </div>
        )}

        {/* Summary Stats - Only show when there's data */}
        {chartData.length > 0 && (
          <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t">
              {bestInstrument && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Best Performer</p>
                  <p className="text-sm font-semibold truncate">{bestInstrument.instrument}</p>
                  <p className="text-xs text-green-600 font-medium">{formatCurrency(bestInstrument.pnl)}</p>
                </div>
              )}
              {worstInstrument && worstInstrument.pnl < 0 && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Worst Performer</p>
                  <p className="text-sm font-semibold truncate">{worstInstrument.instrument}</p>
                  <p className="text-xs text-red-600 font-medium">{formatCurrency(worstInstrument.pnl)}</p>
                </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
