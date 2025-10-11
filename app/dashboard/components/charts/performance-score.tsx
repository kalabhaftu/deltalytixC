"use client"

import * as React from "react"
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
}

export default function PerformanceScore({ size = 'small-long' }: PerformanceScoreProps) {
  const { formattedTrades } = useData()

  const { chartData, overallScore, zellaResult, hasData } = React.useMemo(() => {
    // Calculate metrics using Zella Score formula
    const metrics = calculateMetricsFromTrades(formattedTrades)
    
    // No data case
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
        zellaResult: null,
        hasData: false
      }
    }

    const zellaResult = calculateZellaScore(metrics)

    // Create radar chart data using Zella Score breakdown
    const radarData: MetricData[] = [
      { metric: 'Win %', value: zellaResult.breakdown.tradeWinPercentageScore, fullMark: 100 },
      { metric: 'Profit Factor', value: zellaResult.breakdown.profitFactorScore, fullMark: 100 },
      { metric: 'Avg W/L', value: zellaResult.breakdown.avgWinLossScore, fullMark: 100 },
      { metric: 'Recovery', value: zellaResult.breakdown.recoveryFactorScore, fullMark: 100 },
      { metric: 'Consistency', value: zellaResult.breakdown.consistencyScoreValue, fullMark: 100 },
      { metric: 'Drawdown', value: zellaResult.breakdown.maxDrawdownScore, fullMark: 100 },
    ]

    return { 
      chartData: radarData, 
      overallScore: zellaResult.overallScore,
      zellaResult,
      hasData: true
    }
  }, [formattedTrades])

  // Color based on score
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
                <TooltipContent side="top" className="max-w-[300px]">
                  <p>Zella Score: Your ultimate trading performance tracker combining 6 key metrics with weighted importance.</p>
                </TooltipContent>
              </UITooltip>
            </TooltipProvider>
          </div>
          
          {/* Score Badge in Header */}
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
        {!hasData ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[280px] text-center">
            <div className="text-muted-foreground text-sm">
              No trading data available
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Import trades to see your performance score
            </div>
          </div>
        ) : (
          <>
            {/* Radar Chart */}
            <div className="mb-2">
              <ResponsiveContainer width="100%" height={200}>
                <RadarChart data={chartData} margin={{ 
                  top: size === 'small-long' ? 10 : 15, 
                  right: size === 'small-long' ? 15 : 25, 
                  bottom: size === 'small-long' ? 10 : 15, 
                  left: size === 'small-long' ? 15 : 25 
                }}>
                  <PolarGrid
                    stroke="hsl(var(--border))"
                    strokeWidth={1}
                  />
                  <PolarAngleAxis
                    dataKey="metric"
                    tick={{
                      fontSize: size === 'small-long' ? 9 : 11,
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
                    dot={{ fill: '#8b5cf6', stroke: 'none', strokeWidth: 0, r: size === 'small-long' ? 3 : 4 }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* Score Display */}
            <div className="space-y-1">
              <div className="text-center">
                <div className="text-xs font-medium text-muted-foreground mb-1">
                  Your Performance Score
                </div>
                <div className={cn("text-lg font-bold", getScoreColor(overallScore))}>
                  {overallScore}
                </div>
              </div>
          
              {/* Progress bar */}
              <div className="space-y-0.5">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0</span>
                  <span>20</span>
                  <span>40</span>
                  <span>60</span>
                  <span>80</span>
                  <span>100</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div 
                    className={cn("h-full transition-all duration-500", getScoreBarColor(overallScore))}
                    style={{ width: `${Math.min(overallScore, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
