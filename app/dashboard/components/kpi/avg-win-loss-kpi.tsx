"use client"

import React from 'react'
import { useTradeStatistics } from "@/hooks/use-trade-statistics"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { WidgetSize } from '../../types/dashboard'
import { HelpCircle } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface AvgWinLossKpiProps {
  size?: WidgetSize
}


export default function AvgWinLossKpi({ size = 'kpi' }: AvgWinLossKpiProps) {
  const { avgWin, avgLoss, riskRewardRatio, biggestWin, biggestLoss } = useTradeStatistics()

  // Use the risk-reward ratio from centralized calculation
  const ratio = riskRewardRatio

  // Calculate bar widths for horizontal chart using biggest values
  const maxValue = Math.max(Math.abs(biggestWin), Math.abs(biggestLoss))
  const winWidth = maxValue > 0 ? (Math.abs(biggestWin) / maxValue) * 80 : 0 // 80% max width
  const lossWidth = maxValue > 0 ? (Math.abs(biggestLoss) / maxValue) * 80 : 0 // 80% max width

  const formatCurrency = (value: number) => {
    if (Math.abs(value) >= 1000) {
      return `$${(Math.abs(value) / 1000).toFixed(2)}K`
    }
    return `$${Math.abs(value).toFixed(0)}`
  }

  return (
    <Card className="h-full">
      <CardContent className="flex flex-col justify-between h-full p-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">Avg win/loss trade</span>
            <TooltipProvider delayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={5} className="max-w-[300px]">
                  Average profit per winning trade vs average loss per losing trade. Higher ratios indicate better risk/reward.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* Main Content - Single unified bar layout */}
        <div className="flex-1 flex items-center justify-between gap-4">
          {/* Main Value */}
          <div className="text-center">
            <div className="text-2xl font-bold text-foreground">
              {ratio}
            </div>
          </div>

          {/* Single Unified Horizontal Bar */}
          <div className="flex-1 space-y-1">
            {/* Win/Loss Labels */}
            <div className="flex justify-between items-center">
              <span className="text-xs font-medium text-green-600 dark:text-green-400">
                +{formatCurrency(avgWin)}
              </span>
              <span className="text-xs font-medium text-red-600 dark:text-red-400">
                -{formatCurrency(Math.abs(avgLoss))}
              </span>
            </div>
            
            {/* Single Bar - Green section for wins, Red section for losses */}
            <div className="w-full bg-muted/50 rounded-full h-2 relative overflow-hidden">
              {/* Green section (proportional to avg win) */}
              <div 
                className="absolute left-0 top-0 bg-green-500 h-full transition-all duration-300"
                style={{ width: `${avgWin > 0 ? (Math.abs(avgWin) / (Math.abs(avgWin) + Math.abs(avgLoss))) * 100 : 0}%` }}
              />
              {/* Red section (proportional to avg loss) */}
              <div 
                className="absolute right-0 top-0 bg-red-500 h-full transition-all duration-300"
                style={{ width: `${avgLoss < 0 ? (Math.abs(avgLoss) / (Math.abs(avgWin) + Math.abs(avgLoss))) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
