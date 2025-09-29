"use client"

import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from "recharts"
import { cn } from "@/lib/utils"
import { Info, TrendingUp, TrendingDown } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { WidgetSize } from '@/app/dashboard/types/dashboard'
import { useData } from "@/context/data-provider"

interface RadarChartProps {
  size?: WidgetSize
}

interface ChartDataPoint {
  metric: string
  value: number
  fullMark: number
}


export default function DashboardRadarChart({ size = 'medium' }: RadarChartProps) {
  const { formattedTrades: trades } = useData()

  const metrics = React.useMemo(() => {
    if (!trades.length) {
      return {
        winRate: 50,
        profitFactor: 1.0,
        avgWinLoss: 1.0,
        recoveryFactor: 1.0,
        maxDrawdown: 10,
        consistency: 50
      }
    }

    // Calculate real metrics from trades data
    const winningTrades = trades.filter(trade => Number(trade.pnl) > 0)
    const losingTrades = trades.filter(trade => Number(trade.pnl) < 0)

    const winRate = trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 50

    const totalWins = winningTrades.reduce((sum, trade) => sum + Number(trade.pnl), 0)
    const totalLosses = Math.abs(losingTrades.reduce((sum, trade) => sum + Number(trade.pnl), 0))
    const profitFactor = totalLosses > 0 ? totalWins / totalLosses : 1.0

    const avgWin = winningTrades.length > 0
      ? winningTrades.reduce((sum, trade) => sum + Number(trade.pnl), 0) / winningTrades.length
      : 0
    const avgLoss = losingTrades.length > 0
      ? Math.abs(losingTrades.reduce((sum, trade) => sum + Number(trade.pnl), 0) / losingTrades.length)
      : 0
    const avgWinLoss = avgLoss > 0 ? avgWin / avgLoss : 1.0

    // Calculate recovery factor (simplified)
    const maxDrawdown = trades.length > 0
      ? Math.min(...trades.map(trade => Number(trade.pnl)))
      : -1000
    const recoveryFactor = Math.abs(maxDrawdown) > 0 ? totalWins / Math.abs(maxDrawdown) : 1.0

    // Calculate consistency (simplified - coefficient of variation)
    const pnls = trades.map(trade => Number(trade.pnl))
    const mean = pnls.reduce((sum, pnl) => sum + pnl, 0) / pnls.length
    const variance = pnls.reduce((sum, pnl) => sum + Math.pow(pnl - mean, 2), 0) / pnls.length
    const stdDev = Math.sqrt(variance)
    const consistency = mean !== 0 ? Math.max(0, (1 - stdDev / Math.abs(mean)) * 100) : 50

    return {
      winRate,
      profitFactor,
      avgWinLoss,
      recoveryFactor,
      maxDrawdown: Math.abs(maxDrawdown),
      consistency
    }
  }, [trades])

  // Normalize metrics to 0-100 scale for radar chart
  const normalizeMetric = (value: number, max: number = 100) => {
    return Math.min(Math.max((value / max) * 100, 0), 100)
  }

  const data: ChartDataPoint[] = [
    {
      metric: 'Win Rate',
      value: normalizeMetric(metrics.winRate, 100),
      fullMark: 100
    },
    {
      metric: 'Profit Factor',
      value: normalizeMetric(metrics.profitFactor, 5),
      fullMark: 100
    },
    {
      metric: 'Avg Win/Loss',
      value: normalizeMetric(metrics.avgWinLoss, 3),
      fullMark: 100
    },
    {
      metric: 'Recovery',
      value: normalizeMetric(metrics.recoveryFactor, 20),
      fullMark: 100
    },
    {
      metric: 'Consistency',
      value: normalizeMetric(metrics.consistency, 100),
      fullMark: 100
    },
    {
      metric: 'Drawdown Control',
      value: normalizeMetric(100 - (metrics.maxDrawdown / 1000 * 100), 100),
      fullMark: 100
    }
  ]

  // Calculate overall performance score
  const overallScore = React.useMemo(() => {
    const avgScore = data.reduce((sum, item) => sum + item.value, 0) / data.length
    return Math.round(avgScore)
  }, [data])

  // Get color based on score
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600 dark:text-green-400"
    if (score >= 60) return "text-yellow-600 dark:text-yellow-400"
    return "text-red-600 dark:text-red-400"
  }

  const getProgressBarColor = (score: number) => {
    if (score >= 80) return "bg-green-500"
    if (score >= 60) return "bg-yellow-500"
    return "bg-red-500"
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader
        className={cn(
          "flex flex-row items-center justify-between space-y-0 border-b shrink-0",
          size === 'small-long' ? "p-2 h-[40px]" : "p-3 sm:p-4 h-[56px]"
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
              Performance Radar
            </CardTitle>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className={cn(
                    "text-muted-foreground hover:text-foreground transition-colors cursor-help",
                    size === 'small-long' ? "h-3.5 w-3.5" : "h-4 w-4"
                  )} />
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>Multi-dimensional performance analysis showing key trading metrics in radar format.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className={cn("flex items-center gap-2", getScoreColor(overallScore))}>
            {overallScore >= 60 ? (
              <TrendingUp className={cn("h-4 w-4", size === 'small-long' && "h-3 w-3")} />
            ) : (
              <TrendingDown className={cn("h-4 w-4", size === 'small-long' && "h-3 w-3")} />
            )}
            <span className={cn("font-bold", size === 'small-long' ? "text-sm" : "text-base")}>
              {overallScore}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent
        className={cn(
          "flex-1 min-h-0",
          size === 'small-long' ? "p-1" : "p-2 sm:p-4"
        )}
      >
        <div className={cn("w-full h-full")}>
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={data} margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
              <PolarGrid
                stroke="hsl(var(--border))"
                strokeWidth={1}
              />
              <PolarAngleAxis
                dataKey="metric"
                tick={{
                  fontSize: size === 'small-long' ? 10 : 11,
                  fill: 'hsl(var(--muted-foreground))'
                }}
              />
              <PolarRadiusAxis
                angle={90}
                domain={[0, 100]}
                tick={false}
                axisLine={false}
              />
              <Radar
                name="Score"
                dataKey="value"
                stroke="#8b5cf6"
                fill="#8b5cf6"
                fillOpacity={0.3}
                strokeWidth={2}
                dot={{ fill: '#8b5cf6', stroke: 'none', strokeWidth: 0, r: 4 }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Optional: Add score breakdown for larger sizes */}
        {size !== 'small-long' && (
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0</span>
              <span>25</span>
              <span>50</span>
              <span>75</span>
              <span>100</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={cn("h-full transition-all duration-500", getProgressBarColor(overallScore))}
                style={{ width: `${Math.min(overallScore, 100)}%` }}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
