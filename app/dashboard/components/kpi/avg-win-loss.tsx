'use client'

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { useData } from '@/context/data-provider'
import { cn } from '@/lib/utils'

interface AvgWinLossProps {
  size?: string
}

export default function AvgWinLoss({ size }: AvgWinLossProps) {
  const { dashboardStats } = useData()
  
  // Extract real data
  const avgWin = dashboardStats?.avgWin || 0
  const avgLoss = Math.abs(dashboardStats?.avgLoss || 0)
  const ratio = avgLoss > 0 ? avgWin / avgLoss : 0
  
  // Calculate the percentage for the progress bar
  // If avgWin is larger, green takes more space
  const total = avgWin + avgLoss
  const winPercentage = total > 0 ? (avgWin / total) * 100 : 50
  
  const formatCurrency = (amount: number) => {
    if (Math.abs(amount) >= 1000) {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        notation: 'compact',
        minimumFractionDigits: 1,
        maximumFractionDigits: 2,
      }).format(amount)
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <Card className="w-full h-20 border border-border/20 shadow-sm bg-white dark:bg-gray-900">
      <CardContent className="p-4 h-full flex flex-col justify-center">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs text-muted-foreground font-medium">
            Avg win/loss trade
          </span>
          <div className="w-3 h-3 rounded-full bg-muted flex items-center justify-center">
            <span className="text-[8px] text-muted-foreground">i</span>
          </div>
        </div>
        
        <div className="flex items-center justify-between mb-2">
          <span className="text-lg font-bold text-foreground">
            {ratio.toFixed(2)}
          </span>
        </div>
        
        {/* Horizontal Progress Bar */}
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-green-500 rounded-full transition-all duration-500"
                style={{ width: `${winPercentage}%` }}
              />
              <div 
                className="h-full bg-red-500 rounded-full transition-all duration-500 -mt-2"
                style={{ width: `${100 - winPercentage}%`, marginLeft: `${winPercentage}%` }}
              />
            </div>
          </div>
          
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1">
              <span className="text-green-600 font-medium">
                {formatCurrency(avgWin)}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-red-600 font-medium">
                -{formatCurrency(avgLoss)}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
