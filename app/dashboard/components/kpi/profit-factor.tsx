'use client'

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { CircularProgress } from '@/components/ui/circular-progress'
import { useData } from '@/context/data-provider'

interface ProfitFactorProps {
  size?: string
}

export default function ProfitFactor({ size }: ProfitFactorProps) {
  const { dashboardStats } = useData()
  
  // Extract real data
  const totalProfits = dashboardStats?.totalProfits || 0
  const totalLosses = Math.abs(dashboardStats?.totalLosses || 0)
  const profitFactor = totalLosses > 0 ? totalProfits / totalLosses : 0
  
  // Convert profit factor to percentage for circular progress (capped at 100%)
  // Values above 1.0 are good, so we'll map 0-2.0 to 0-100%
  const progressValue = Math.min((profitFactor / 2.0) * 100, 100)
  
  // Determine color based on profit factor
  const getColor = (factor: number) => {
    if (factor >= 1.5) return '#22c55e' // green-500 - excellent
    if (factor >= 1.0) return '#eab308' // yellow-500 - profitable
    return '#ef4444' // red-500 - unprofitable
  }

  return (
    <Card className="w-full h-20 border-0 shadow-sm bg-white dark:bg-gray-950">
      <CardContent className="p-4 h-full flex items-center justify-between">
        <div className="flex flex-col">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-muted-foreground font-medium">
              Profit Factor
            </span>
            <div className="w-3 h-3 rounded-full bg-muted flex items-center justify-center">
              <span className="text-[8px] text-muted-foreground">i</span>
            </div>
          </div>
          <span className="text-lg font-bold text-foreground">
            {profitFactor.toFixed(2)}
          </span>
        </div>
        
        <div className="flex-shrink-0">
          <CircularProgress
            value={progressValue}
            size={48}
            strokeWidth={6}
            color={getColor(profitFactor)}
            showPercentage={false}
          />
        </div>
      </CardContent>
    </Card>
  )
}
