"use client"

import * as React from "react"
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useData } from "@/context/data-provider"
import { cn } from "@/lib/utils"
import { WidgetSize } from '@/app/dashboard/types/dashboard'
import { getWidgetStyles } from '@/app/dashboard/config/widget-dimensions'
import { TrendingUp, TrendingDown, Trophy, Info } from 'lucide-react'
import { calculateZellaScore, calculateMetricsFromTrades } from "@/lib/zella-score"
import {
  Tooltip as UiTooltip,
  TooltipContent as UiTooltipContent,
  TooltipTrigger as UiTooltipTrigger,
} from "@/components/ui/tooltip"

// ============================================================================
// TYPES
// ============================================================================

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

// ============================================================================
// CONSTANTS - Tradezella Premium Styling
// ============================================================================

const COLORS = {
  profit: 'hsl(var(--chart-profit))',
  grid: 'hsl(var(--border))',
  amber: 'hsl(var(--chart-4))',
  red: 'hsl(var(--chart-loss))'
} as const

// ============================================================================
// TOOLTIP COMPONENT - Glassmorphism Style
// ============================================================================

function ChartTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null

  const data = payload[0].payload as MetricData

  const formatRawValue = (metric: string, value: number) => {
    if (metric === 'Win %') return `${value.toFixed(1)}%`
    if (metric === 'Drawdown') return `${value.toFixed(1)}%`
    if (metric === 'Consistency') return `${value.toFixed(0)}/100`
    return value.toFixed(2)
  }

  return (
    <div className="bg-card/95 backdrop-blur-md border border-border/50 rounded-xl p-4 shadow-2xl min-w-[180px]">
      {/* Metric Header */}
      <p className="text-sm font-bold mb-2 border-b border-border/30 pb-2">{data.metric}</p>

      {/* Stats */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Value</span>
          <span className="font-bold">{formatRawValue(data.metric, data.rawValue || 0)}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Score</span>
          <span className="font-bold">{Math.round(data.value)}/100</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Weight</span>
          <span className="font-semibold">{data.weight}%</span>
        </div>
      </div>

      {/* Target */}
      <div className="mt-2 pt-2 border-t border-border/30">
        <p className="text-[10px] text-muted-foreground">{data.description}</p>
        <p className="text-xs mt-1">
          <span className="text-muted-foreground">Target: </span>
          <span className="text-long font-semibold">{data.target}</span>
        </p>
      </div>
    </div>
  )
}

// ============================================================================
// SCORE BADGE COMPONENT
// ============================================================================

function ScoreBadge({ score, hasData }: { score: number; hasData: boolean }) {
  const getScoreColor = (s: number) => {
    if (s >= 70) return 'text-long bg-long/10 border-long/30'
    if (s >= 40) return 'text-amber-500 bg-amber-500/10 border-amber-500/30'
    return 'text-short bg-short/10 border-short/30'
  }

  if (!hasData) {
    return (
      <div className="px-3 py-1 rounded-lg bg-muted/50 border border-border/50">
        <span className="text-sm font-bold text-muted-foreground">--</span>
      </div>
    )
  }

  return (
    <div className={cn(
      "flex items-center gap-1.5 px-3 py-1 rounded-lg border",
      getScoreColor(score)
    )}>
      {score >= 60 ? (
        <TrendingUp className="h-3.5 w-3.5" />
      ) : (
        <TrendingDown className="h-3.5 w-3.5" />
      )}
      <span className="text-sm font-bold">{score}</span>
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function PerformanceScore({ size = 'small-long' }: PerformanceScoreProps) {
  // ---------------------------------------------------------------------------
  // DATA HOOKS (PRESERVED - DO NOT MODIFY)
  // ---------------------------------------------------------------------------
  const { formattedTrades } = useData()

  // ---------------------------------------------------------------------------
  // DATA PROCESSING (PRESERVED - DO NOT MODIFY)
  // ---------------------------------------------------------------------------
  const { chartData, overallScore, hasData } = React.useMemo(() => {
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
      return { chartData: emptyData, overallScore: 0, hasData: false }
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
      hasData: true
    }
  }, [formattedTrades])

  // ---------------------------------------------------------------------------
  // SCORE COLOR UTILITIES
  // ---------------------------------------------------------------------------
  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-long'
    if (score >= 40) return 'text-amber-500'
    return 'text-short'
  }

  const getScoreBarColor = (score: number) => {
    if (score >= 70) return 'bg-long'
    if (score >= 40) return 'bg-amber-500'
    return 'bg-short'
  }

  // ---------------------------------------------------------------------------
  // SIZE-RESPONSIVE VALUES
  // ---------------------------------------------------------------------------
  const isCompact = size === 'small' || size === 'small-long'
  const widgetStyles = getWidgetStyles(size || 'small-long')

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------
  return (
    <Card className="flex flex-col bg-card" style={{ height: widgetStyles.height }}>
      {/* Header */}
      <CardHeader className="flex flex-row items-center justify-between shrink-0 border-b border-border/50 h-12 px-5">
        <div className="flex items-center gap-2">
          <Trophy className={cn("text-amber-500", isCompact ? "h-4 w-4" : "h-5 w-5")} />
          <CardTitle className={cn(
            "font-semibold tracking-tight",
            isCompact ? "text-sm" : "text-base"
          )}>
            Performance Score
          </CardTitle>
          <UiTooltip>
            <UiTooltipTrigger asChild>
              <Info className="h-4 w-4 text-muted-foreground hover:text-foreground cursor-help transition-colors" />
            </UiTooltipTrigger>
            <UiTooltipContent>
              <p>Overall trading performance score based on 6 key metrics</p>
            </UiTooltipContent>
          </UiTooltip>
        </div>

        <ScoreBadge score={overallScore} hasData={hasData} />
      </CardHeader>

      {/* Chart Container */}
      <CardContent className="flex-1 p-0 flex flex-col">
        {hasData ? (
          <>
            {/* Radar Chart */}
            <div className="flex-1 relative min-h-[200px]">
              <div className="absolute inset-0">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart
                    data={chartData}
                    margin={{ top: 30, right: 40, bottom: 30, left: 40 }}
                  >
                    <PolarGrid
                      stroke={COLORS.grid}
                      strokeOpacity={0.6}
                    />
                    <PolarAngleAxis
                      dataKey="metric"
                      tick={{
                        fontSize: isCompact ? 9 : 11,
                        fill: 'hsl(var(--muted-foreground))'
                      }}
                      stroke={COLORS.grid}
                      strokeOpacity={0.6}
                    />
                    <PolarRadiusAxis
                      angle={90}
                      domain={[0, 100]}
                      tick={false}
                      axisLine={false}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Radar
                      name="Score"
                      dataKey="value"
                      stroke={COLORS.profit}
                      fill={COLORS.profit}
                      fillOpacity={0.25}
                      strokeWidth={2}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Score Summary */}
            <div className="px-4 pb-4">
              <div className="grid grid-cols-2 gap-4 p-3 bg-muted/30 rounded-xl">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Your Score</p>
                  <p className={cn("text-2xl font-bold", getScoreColor(overallScore))}>
                    {overallScore}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Progress</p>
                  <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn("h-full transition-all duration-500 rounded-full", getScoreBarColor(overallScore))}
                      style={{ width: `${Math.min(overallScore, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-2">
              <Trophy className="h-12 w-12 text-muted-foreground/30 mx-auto" />
              <p className="text-sm text-muted-foreground">No trading data available</p>
              <p className="text-xs text-muted-foreground">Import trades to see your score</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
