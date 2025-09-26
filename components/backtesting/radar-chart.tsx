'use client'

import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from "recharts"
import { cn } from "@/lib/utils"
import { HelpCircle } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { ZellaScoreMetrics } from "@/types/backtesting"

interface RadarChartComponentProps {
  zellaScore: number
  metrics: ZellaScoreMetrics
  tooltip?: string
  className?: string
}

export function RadarChartComponent({ 
  zellaScore, 
  metrics, 
  tooltip,
  className 
}: RadarChartComponentProps) {
  // Normalize metrics to 0-100 scale for radar chart
  const normalizeMetric = (value: number, max: number = 100) => {
    return Math.min(Math.max((value / max) * 100, 0), 100)
  }

  const data = [
    {
      metric: 'Win %',
      value: normalizeMetric(metrics.winRate, 100)
    },
    {
      metric: 'Profit factor',
      value: normalizeMetric(metrics.profitFactor, 5) // Assuming max of 5 for profit factor
    },
    {
      metric: 'Avg win/loss',
      value: normalizeMetric(metrics.avgWinLoss, 3) // Assuming max of 3 for avg win/loss
    },
    {
      metric: 'Recovery factor',
      value: normalizeMetric(metrics.recoveryFactor, 20) // Assuming max of 20 for recovery factor
    },
    {
      metric: 'Max drawdown',
      value: normalizeMetric(100 - Math.abs(metrics.maxDrawdown / 1000), 100) // Inverse for drawdown (lower is better)
    },
    {
      metric: 'Consistency',
      value: normalizeMetric(metrics.consistency, 100)
    }
  ]

  // Get color based on Zella score
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
    <Card className={cn("h-full", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Zella score
          </CardTitle>
          {tooltip && (
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent 
                side="bottom" 
                sideOffset={5} 
                className="max-w-[300px]"
              >
                {tooltip}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 p-4 pt-0 flex flex-col">
        <div className="h-64 mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={data} margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
              <PolarGrid 
                stroke="hsl(var(--border))" 
                strokeWidth={1}
              />
              <PolarAngleAxis 
                dataKey="metric" 
                tick={{ 
                  fontSize: 11, 
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
        
        {/* Score display */}
        <div className="space-y-3">
          <div>
            <div className="text-sm font-medium text-muted-foreground mb-2">
              Your Zella Score
            </div>
            <div className={cn("text-3xl font-bold", getScoreColor(zellaScore))}>
              {zellaScore.toFixed(2)}
            </div>
          </div>
          
          {/* Progress bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0</span>
              <span>20</span>
              <span>40</span>
              <span>60</span>
              <span>80</span>
              <span>100</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className={cn("h-full transition-all duration-500", getProgressBarColor(zellaScore))}
                style={{ width: `${Math.min(zellaScore, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
