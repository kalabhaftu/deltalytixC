"use client"

import * as React from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Cell, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts"
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

const chartConfig = {
  pnl: {
    label: "P&L by Strategy",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig

interface PnLByStrategyProps {
  size?: WidgetSize
}

interface StrategyData {
  strategy: string
  pnl: number
  trades: number
  wins: number
  losses: number
  winRate: number
  avgPnl: number
  profitFactor: number
}

export default function PnLByStrategy({ size = 'small-long' }: PnLByStrategyProps) {
  const { formattedTrades } = useData()

  const chartData = React.useMemo(() => {
    // CRITICAL FIX: Group trades first to handle partial closes
    const { groupTradesByExecution } = require('@/lib/utils')
    const groupedTrades = groupTradesByExecution(formattedTrades)

    // Group trades by strategy (both tradingModel and custom strategy)
    const strategyMap: Record<string, { pnl: number; trades: number; wins: number; losses: number; grossWin: number; grossLoss: number }> = {}
    
    groupedTrades.forEach((trade: any) => {
      const strategy = trade.tradingModel || 'No Strategy'
      
      if (!strategyMap[strategy]) {
        strategyMap[strategy] = { pnl: 0, trades: 0, wins: 0, losses: 0, grossWin: 0, grossLoss: 0 }
      }
      
      const netPnl = (trade.pnl || 0) - (trade.commission || 0)
      strategyMap[strategy].pnl += netPnl
      strategyMap[strategy].trades += 1
      
      if (netPnl > 0) {
        strategyMap[strategy].wins += 1
        strategyMap[strategy].grossWin += netPnl
      } else if (netPnl < 0) {
        strategyMap[strategy].losses += 1
        strategyMap[strategy].grossLoss += Math.abs(netPnl)
      }
    })
    
    // Convert to array and calculate metrics
    const data: StrategyData[] = Object.entries(strategyMap).map(([strategy, stats]) => {
      // CRITICAL FIX: Exclude break-even trades from win rate denominator
      const tradableCount = stats.wins + stats.losses
      const winRate = tradableCount > 0 ? (stats.wins / tradableCount) * 100 : 0
      const avgPnl = stats.trades > 0 ? stats.pnl / stats.trades : 0
      const profitFactor = stats.grossLoss > 0 ? stats.grossWin / stats.grossLoss : stats.grossWin > 0 ? 999 : 0
      
      return {
        strategy,
        pnl: stats.pnl,
        trades: stats.trades,
        wins: stats.wins,
        losses: stats.losses,
        winRate,
        avgPnl,
        profitFactor,
      }
    })
    
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

  const formatYAxis = (value: number) => {
    const absValue = Math.abs(value)
    if (absValue >= 1000) {
      return `$${(value / 1000).toFixed(1)}k`
    }
    return `$${value.toFixed(0)}`
  }

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      
      return (
        <div className="rounded-lg border bg-card p-3 shadow-lg">
          <div className="grid gap-2">
            <div className="font-semibold text-sm">{data.strategy}</div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              <span className="text-muted-foreground">Total P&L:</span>
              <span className={cn(
                "font-medium",
                data.pnl >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
              )}>
                {formatCurrency(data.pnl)}
              </span>
              <span className="text-muted-foreground">Trades:</span>
              <span className="font-medium">{data.trades} ({data.wins}W/{data.losses}L)</span>
              <span className="text-muted-foreground">Win Rate:</span>
              <span className="font-medium">{data.winRate.toFixed(1)}%</span>
              <span className="text-muted-foreground">Profit Factor:</span>
              <span className="font-medium">{data.profitFactor.toFixed(2)}</span>
            </div>
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
              P&L by Strategy
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
                  <p className="text-xs">Performance breakdown by trading strategy/model. Shows total P&L, win/loss ratio, and profit factor.</p>
                </TooltipContent>
              </UITooltip>
            </TooltipProvider>
          </div>
        </div>
      </CardHeader>

      <CardContent
        className={cn(
          "flex-1 min-h-[28u 0px]",
          size === 'small' || size === 'small-long' ? "p-1" : "p-2 sm:p-4"
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
                      ? { left: -5, right: -10, top: 0, bottom: 5 }
                      : { left: -15, right: -10, top: 5, bottom: 10 }
                  }
                  barGap={0}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="strategy"
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
                    tickFormatter={formatYAxis}
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
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">No strategy data available</p>
              <p className="text-xs text-muted-foreground">Assign strategies to your trades to see performance</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
