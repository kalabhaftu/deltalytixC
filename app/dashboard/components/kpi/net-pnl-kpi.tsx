"use client"

import React from 'react'
import { useTradeStatistics } from "@/hooks/use-trade-statistics"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { WidgetSize } from '../../types/dashboard'
import { HelpCircle, TrendingUp } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface NetPnlKpiProps {
  size?: WidgetSize
}

export default function NetPnlKpi({ size = 'kpi' }: NetPnlKpiProps) {
  const { netPnlWithPayouts, winningTrades, losingTrades } = useTradeStatistics()

  // Use net P&L including payouts from centralized calculation
  const netPnl = netPnlWithPayouts
  const isPositive = netPnl >= 0

  // Dynamic badge logic: show winning trades if positive P&L, losing trades if negative
  const badgeCount = isPositive ? winningTrades.length : losingTrades.length
  const badgeLabel = isPositive ? "wins" : "losses"

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(Math.abs(value))
  }

  return (
    <Card className="h-full">
      <CardContent className="flex flex-col h-full p-3">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">Net P&L</span>
            <TooltipProvider delayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={5} className="max-w-[300px]">
                  Your total profit or loss across all trades, including fees and commissions.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          
          {/* Dynamic Badge - positioned like in reference */}
          <div className="bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400 px-2 py-1 rounded text-xs font-medium">
            {badgeCount}
          </div>
        </div>

        {/* Main Value - centered for wider layout */}
        <div className="flex-1 flex items-center justify-center">
          <div className={cn(
            "text-2xl font-bold",
            isPositive 
              ? "text-green-600 dark:text-green-400" 
              : "text-red-600 dark:text-red-400"
          )}>
            {formatCurrency(netPnl)}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
