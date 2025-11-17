"use client"

import * as React from "react"
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer } from "@/components/ui/chart"
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
import { calculateZellaScore, calculateMetricsFromTrades } from "@/lib/zella-score"

interface PerformanceScoreProps {
  size?: WidgetSize
}

interface MetricData {
  metric: string
  value: number
  fullMark: number
  rawValue?: number
  weight?: number
  description?: string
  target?: string
}

const chartConfig = {
  score: {
    label: "Performance Score",
    color: "hsl(var(--chart-1))",
  },
}

export default function PerformanceScore({ size = 'small-long' }: PerformanceScoreProps) {
  const { formattedTrades } = useData()

  const { chartData, overallScore, scoreResult, hasData } = React.useMemo(() => {
    const metrics = calculateMetricsFromTrades(formattedTrades)
    
    if (!metrics) {
      const emptyData: MetricData[] = [
        { metric: 'Win %', value: 0, fullMark: 100 },
        { metric: 'Profit Factor', value: 0, fullMark: 100 },
        { metric: 'Avg W/L', value: 0, fullMark: 100 },
        { metric: 'Recovery', value: 0, fullMark: 100 },
        { metric: 'Consistency', value: 0, fullMark: 100 },
        { metric: 'Drawdown', value: 0, fullMark: 100 },
      ]
      return {
        chartData: emptyData,
        overallScore: 0,
        scoreResult: null,
        hasData: false
      }
    }

    const scoreResult = calculateZellaScore(metrics)

    const radarData: MetricData[] = [
      { 
        metric: 'Win %', 
        value: scoreResult.breakdown.tradeWinPercentageScore, 
        fullMark: 100,
        rawValue: scoreResult.metrics.tradeWinPercentage,
        weight: 15,
        description: 'Percentage of winning trades',
        target: '60%+'
      },
      { 
        metric: 'Profit Factor', 
        value: scoreResult.breakdown.profitFactorScore, 
        fullMark: 100,
        rawValue: scoreResult.metrics.profitFactor,
        weight: 25,
        description: 'Total Wins ÷ Total Losses',
        target: '2.6+'
      },
      { 
        metric: 'Avg W/L', 
        value: scoreResult.breakdown.avgWinLossScore, 
        fullMark: 100,
        rawValue: scoreResult.metrics.avgWinLoss,
        weight: 20,
        description: 'Average Win ÷ Average Loss',
        target: '2.6+'
      },
      { 
        metric: 'Recovery', 
        value: scoreResult.breakdown.recoveryFactorScore, 
        fullMark: 100,
        rawValue: scoreResult.metrics.recoveryFactor,
        weight: 10,
        description: 'Net Profit ÷ Max Drawdown',
        target: '3.5+'
      },
      { 
        metric: 'Consistency', 
        value: scoreResult.breakdown.consistencyScoreValue, 
        fullMark: 100,
        rawValue: scoreResult.metrics.consistencyScore,
        weight: 10,
        description: 'Stability of daily returns',
        target: 'Higher is better'
      },
      { 
        metric: 'Drawdown', 
        value: scoreResult.breakdown.maxDrawdownScore, 
        fullMark: 100,
        rawValue: scoreResult.metrics.maxDrawdown,
        weight: 20,
        description: 'Maximum peak-to-trough decline',
        target: 'Lower is better'
      },
    ]

    return { 
      chartData: radarData, 
      overallScore: scoreResult.overallScore,
      scoreResult,
      hasData: true
    }
  }, [formattedTrades])

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-600'
    if (score >= 40) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreBarColor = (score: number) => {
    if (score >= 70) return 'bg-green-600'
    if (score >= 40) return 'bg-yellow-600'
    return 'bg-red-600'
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null

    const data = payload[0].payload as MetricData

    const formatRawValue = (metric: string, value: number) => {
      if (metric === 'Win %') return `${value.toFixed(1)}%`
      if (metric === 'Drawdown') return `${value.toFixed(1)}%`
      if (metric === 'Consistency') return `${value.toFixed(0)}/100`
      return value.toFixed(2)
    }

    return (
      <div className="rounded-lg border bg-background p-3 shadow-lg">
        <div className="grid gap-2">
          <div className="font-semibold text-sm border-b pb-1">{data.metric}</div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            <span className="text-muted-foreground">Value:</span>
            <span className="font-semibold">{formatRawValue(data.metric, data.rawValue || 0)}</span>
            
            <span className="text-muted-foreground">Score:</span>
            <span className="font-semibold">{Math.round(data.value)}/100</span>
            
            <span className="text-muted-foreground">Weight:</span>
            <span className="font-semibold">{data.weight}%</span>
          </div>
          <div className="border-t pt-1.5 space-y-0.5">
            <div className="text-[11px] text-muted-foreground">{data.description}</div>
            <div className="text-[11px]">
              <span className="text-muted-foreground">Target: </span>
              <span className="text-primary font-medium">{data.target}</span>
            </div>
          </div>
        </div>
      </div>
    )
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
              Performance Score
            </CardTitle>
            <TooltipProvider delayDuration={100}>
              <UITooltip>
                <TooltipTrigger asChild>
                  <Info className={cn(
                    "text-muted-foreground hover:text-foreground transition-colors cursor-help",
                    size === 'small-long' ? "h-3.5 w-3.5" : "h-4 w-4"
                  )} />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[260px]">
                  <p className="text-xs">Your ultimate trading performance tracker combining 6 key metrics with weighted importance.</p>
                </TooltipContent>
              </UITooltip>
            </TooltipProvider>
          </div>

          <div className={cn("flex items-center gap-2", hasData ? getScoreColor(overallScore) : "text-muted-foreground")}>
            {hasData && (overallScore >= 60 ? (
              <TrendingUp className={cn("h-4 w-4", size === 'small-long' && "h-3 w-3")} />
            ) : (
              <TrendingDown className={cn("h-4 w-4", size === 'small-long' && "h-3 w-3")} />
            ))}
            <span className={cn("font-bold", size === 'small-long' ? "text-sm" : "text-base")}>
              {hasData ? overallScore : '-'}
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
        {chartData.length > 0 && hasData ? (
          <div className="w-full h-full">
            <ChartContainer config={chartConfig} className="w-full h-full">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart
                  data={chartData}
                  margin={
                    size === 'small' || size === 'small-long'
                      ? { top: 30, right: 40, bottom: 30, left: 40 }
                      : { top: 30, right: 40, bottom: 30, left: 40 }
                  }
                >
                  <PolarGrid
                    stroke="hsl(var(--border))"
                    strokeWidth={1}
                  />
                  <PolarAngleAxis
                    dataKey="metric"
                    tick={{
                      fontSize: size === 'small' || size === 'small-long' ? 8 : 10,
                      fill: 'hsl(var(--muted-foreground))'
                    }}
                    stroke="hsl(var(--border))"
                  />
                  <PolarRadiusAxis
                    angle={90}
                    domain={[0, 100]}
                    tick={false}
                    axisLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Radar
                    name="Score"
                    dataKey="value"
                    stroke="hsl(var(--chart-4))"
                    fill="hsl(var(--chart-4))"
                    fillOpacity={0.3}
                    strokeWidth={2}
                    dot={{
                      fill: 'hsl(var(--chart-4))',
                      stroke: 'hsl(var(--background))',
                      strokeWidth: 1,
                      r: size === 'small' || size === 'small-long' ? 4 : 5
                    }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center min-h-[280px]">
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">No trading data available</p>
              <p className="text-xs text-muted-foreground">Import trades to see your performance score</p>
            </div>
          </div>
        )}

        {chartData.length > 0 && hasData && (
          <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Your Performance Score</p>
              <p className={cn("text-2xl font-bold", getScoreColor(overallScore))}>
                {overallScore}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Progress</p>
              <div className="space-y-1">
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn("h-full transition-all duration-500", getScoreBarColor(overallScore))}
                    style={{ width: `${Math.min(overallScore, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>0</span>
                  <span>50</span>
                  <span>100</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
