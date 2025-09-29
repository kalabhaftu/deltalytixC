'use client'

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { CircularProgress } from '@/components/ui/circular-progress'
import { useData } from '@/context/data-provider'

interface TradeWinRateProps {
  size?: string
}

export default function TradeWinRate({ size }: TradeWinRateProps) {
  const { dashboardStats } = useData()
  
  // Extract real data
  const winningTrades = dashboardStats?.winningTrades || 0
  const totalTrades = dashboardStats?.totalTrades || 0
  const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0
  
  // Determine color based on win rate
  const getColor = (rate: number) => {
    if (rate >= 60) return '#22c55e' // green-500
    if (rate >= 40) return '#eab308' // yellow-500
    return '#ef4444' // red-500
  }

  return (
    <Card className="w-full h-20 border border-border/20 shadow-sm bg-white dark:bg-gray-900">
      <CardContent className="p-4 h-full flex items-center justify-between">
        <div className="flex flex-col">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-muted-foreground font-medium">
              Trade Win %
            </span>
            <div className="w-3 h-3 rounded-full bg-muted flex items-center justify-center">
              <span className="text-[8px] text-muted-foreground">i</span>
            </div>
          </div>
          <span className="text-lg font-bold text-foreground">
            {winRate.toFixed(2)}%
          </span>
        </div>
        
        <div className="flex-shrink-0">
          <CircularProgress
            value={winRate}
            size={48}
            strokeWidth={6}
            color={getColor(winRate)}
            showPercentage={false}
          />
        </div>
      </CardContent>
    </Card>
  )
}
