'use client'

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { CircularProgress } from '@/components/ui/circular-progress'
import { useData } from '@/context/data-provider'

interface DayWinRateProps {
  size?: string
}

export default function DayWinRate({ size }: DayWinRateProps) {
  const { dashboardStats } = useData()
  
  // Extract real data
  const winningDays = dashboardStats?.winningDays || 0
  const totalDays = dashboardStats?.totalDays || 0
  const dayWinRate = totalDays > 0 ? (winningDays / totalDays) * 100 : 0
  
  // Determine color based on day win rate
  const getColor = (rate: number) => {
    if (rate >= 60) return '#22c55e' // green-500
    if (rate >= 40) return '#eab308' // yellow-500
    return '#ef4444' // red-500
  }

  return (
    <Card className="w-full h-20 border-0 shadow-sm bg-white dark:bg-gray-950">
      <CardContent className="p-4 h-full flex items-center justify-between">
        <div className="flex flex-col">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-muted-foreground font-medium">
              Day Win %
            </span>
            <div className="w-3 h-3 rounded-full bg-muted flex items-center justify-center">
              <span className="text-[8px] text-muted-foreground">i</span>
            </div>
          </div>
          <span className="text-lg font-bold text-foreground">
            {dayWinRate.toFixed(2)}%
          </span>
        </div>
        
        <div className="flex-shrink-0">
          <CircularProgress
            value={dayWinRate}
            size={48}
            strokeWidth={6}
            color={getColor(dayWinRate)}
            showPercentage={false}
          />
        </div>
      </CardContent>
    </Card>
  )
}
