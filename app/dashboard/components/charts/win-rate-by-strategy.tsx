"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useData } from "@/context/data-provider"
import { cn } from "@/lib/utils"
import { WidgetSize } from '@/app/dashboard/types/dashboard'
import { Info, PieChartIcon, BarChart3 } from 'lucide-react'
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
  PieChart,
  Pie
} from 'recharts'

interface WinRateByStrategyProps {
  size?: WidgetSize
}

interface StrategyWinRate {
  strategy: string
  winRate: number
  totalTrades: number
  wins: number
  losses: number
  profitFactor: number
  consistency: number
}

const COLORS = ['#16a34a', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#84cc16']

export default function WinRateByStrategy({ size = 'small-long' }: WinRateByStrategyProps) {
  const { formattedTrades } = useData()
  const [viewMode, setViewMode] = React.useState<'pie' | 'bar'>('pie')

  const chartData = React.useMemo(() => {
    // Group trades by strategy
    const strategyMap: Record<string, { wins: number; losses: number; grossWin: number; grossLoss: number; allWins: number[] }> = {}
    
    formattedTrades.forEach(trade => {
      const strategy = trade.tradingModel || 'No Strategy'
      
      if (!strategyMap[strategy]) {
        strategyMap[strategy] = { wins: 0, losses: 0, grossWin: 0, grossLoss: 0, allWins: [] }
      }
      
      const netPnl = (trade.pnl || 0) - (trade.commission || 0)
      
      if (netPnl > 0) {
        strategyMap[strategy].wins += 1
        strategyMap[strategy].grossWin += netPnl
        strategyMap[strategy].allWins.push(netPnl)
      } else if (netPnl < 0) {
        strategyMap[strategy].losses += 1
        strategyMap[strategy].grossLoss += Math.abs(netPnl)
      }
    })
    
    // Convert to array and calculate metrics
    const data: StrategyWinRate[] = Object.entries(strategyMap).map(([strategy, stats]) => {
      const totalTrades = stats.wins + stats.losses
      const winRate = totalTrades > 0 ? (stats.wins / totalTrades) * 100 : 0
      const profitFactor = stats.grossLoss > 0 ? stats.grossWin / stats.grossLoss : stats.grossWin > 0 ? 999 : 0
      
      // Calculate consistency (standard deviation of wins)
      const avgWin = stats.allWins.length > 0 ? stats.allWins.reduce((a, b) => a + b, 0) / stats.allWins.length : 0
      const variance = stats.allWins.length > 0 
        ? stats.allWins.reduce((sum, win) => sum + Math.pow(win - avgWin, 2), 0) / stats.allWins.length 
        : 0
      const stdDev = Math.sqrt(variance)
      const consistency = avgWin > 0 ? Math.max(0, 100 - (stdDev / avgWin) * 100) : 0
      
      return {
        strategy,
        winRate,
        totalTrades,
        wins: stats.wins,
        losses: stats.losses,
        profitFactor,
        consistency,
      }
    })
    
    // Sort by win rate (highest first)
    return data.sort((a, b) => b.winRate - a.winRate)
  }, [formattedTrades])

  const avgWinRate = chartData.length > 0 
    ? chartData.reduce((sum, item) => sum + item.winRate, 0) / chartData.length 
    : 0

  const bestStrategy = chartData.length > 0 ? chartData[0] : null

  // Custom tooltips
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="rounded-lg border bg-card p-3 shadow-lg">
          <div className="grid gap-2">
            <div className="font-semibold text-sm">{data.strategy}</div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              <span className="text-muted-foreground">Win Rate:</span>
              <span className="font-bold text-green-600 dark:text-green-400">{data.winRate.toFixed(1)}%</span>
              <span className="text-muted-foreground">Total Trades:</span>
              <span className="font-medium">{data.totalTrades}</span>
              <span className="text-muted-foreground">W/L:</span>
              <span className="font-medium">{data.wins}W / {data.losses}L</span>
              <span className="text-muted-foreground">Profit Factor:</span>
              <span className="font-medium">{data.profitFactor.toFixed(2)}</span>
              <span className="text-muted-foreground">Consistency:</span>
              <span className="font-medium">{data.consistency.toFixed(1)}%</span>
            </div>
          </div>
        </div>
      )
    }
    return null
  }

  // Pie chart label renderer
  const renderLabel = (entry: any) => {
    return `${entry.winRate.toFixed(0)}%`
  }

  // Color helper for win rate
  const getWinRateColor = (winRate: number) => {
    if (winRate >= 60) return 'hsl(var(--chart-profit))'
    if (winRate >= 40) return '#f59e0b'
    return 'hsl(var(--chart-loss))'
  }

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
              Win Rate by Strategy
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
                  <p>Win rate distribution and success metrics across different trading strategies/models.</p>
                </TooltipContent>
              </UITooltip>
            </TooltipProvider>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            <div className="text-xs font-medium text-muted-foreground">
              Avg: <span className="text-foreground font-bold">{avgWinRate.toFixed(1)}%</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode(viewMode === 'pie' ? 'bar' : 'pie')}
              className="h-7 w-7 p-0"
            >
              {viewMode === 'pie' ? <BarChart3 className="h-3.5 w-3.5" /> : <PieChartIcon className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent
        className={cn(
          "flex-1 p-4 pt-4 flex flex-col",
          size === 'small' ? "p-2 pt-2" : ""
        )}
      >
        {chartData.length > 0 ? (
          <>
            {viewMode === 'pie' ? (
              /* Pie Chart View */
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={chartData}
                    dataKey="winRate"
                    nameKey="strategy"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={renderLabel}
                    labelLine={false}
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              /* Bar Chart View */
              <ResponsiveContainer width="100%" height={200}>
                <BarChart
                  data={chartData}
                  margin={{ top: 5, right: 5, left: 0, bottom: 45 }}
                >
                  <CartesianGrid 
                    strokeDasharray="3 3" 
                    stroke="hsl(var(--border))" 
                    vertical={false}
                  />
                  <XAxis 
                    dataKey="strategy" 
                    angle={-45}
                    textAnchor="end"
                    height={60}
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={size === 'small' || size === 'small-long' ? 10 : 11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    domain={[0, 100]}
                    tickFormatter={(value) => `${value}%`}
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={size === 'small' || size === 'small-long' ? 10 : 11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))' }} />
                  <Bar dataKey="winRate" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={getWinRateColor(entry.winRate)}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}

            {/* Best Strategy Summary */}
            {bestStrategy && (
              <div className="mt-3 pt-3 border-t">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Best Strategy</p>
                  <p className="text-sm font-semibold">{bestStrategy.strategy}</p>
                  <div className="flex items-center gap-4 text-xs">
                    <span className="text-green-600 dark:text-green-400 font-bold">{bestStrategy.winRate.toFixed(1)}% Win Rate</span>
                    <span className="text-muted-foreground">{bestStrategy.wins}W/{bestStrategy.losses}L</span>
                    <span className="text-muted-foreground">PF: {bestStrategy.profitFactor.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center min-h-[280px]">
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">No strategy data available</p>
              <p className="text-xs text-muted-foreground">Assign strategies to your trades to see win rates</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
