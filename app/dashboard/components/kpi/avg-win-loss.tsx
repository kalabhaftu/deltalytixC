'use client'

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { useTradeStatistics } from '@/hooks/use-trade-statistics'
import { cn } from '@/lib/utils'
import { Info } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface AvgWinLossProps {
  size?: string
}

const AvgWinLoss = React.memo(function AvgWinLoss({ size }: AvgWinLossProps) {
  const { avgWin, avgLoss, riskRewardRatio } = useTradeStatistics()

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
    <Card className="w-full h-24">
      <CardContent className="px-6 py-4 h-full flex flex-col justify-between">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <span className="text-[11px] uppercase tracking-wide font-bold text-muted-foreground/80">
              Avg win/loss trade
            </span>
            <TooltipProvider delayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="w-3 h-3 rounded-full bg-muted flex items-center justify-center cursor-help">
                    <Info className="h-3 w-3 text-muted-foreground" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={5} className="max-w-[200px]">
                  <p className="text-xs">Average profit on winning trades vs average loss on losing trades. Higher ratios indicate better risk/reward management.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <span className="text-2xl font-bold text-foreground tracking-tight">
            {riskRewardRatio.toFixed(2)}
          </span>
        </div>

        {/* Horizontal Progress Bar & Stats */}
        <div className="space-y-1.5">
          <div className="w-full h-1 bg-muted rounded-full overflow-hidden flex">
            <div
              className="h-full bg-long transition-all duration-500"
              style={{ width: `${winPercentage}%` }}
            />
            <div
              className="h-full bg-short transition-all duration-500"
              style={{ width: `${100 - winPercentage}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] font-semibold">
            <span className="text-long flex items-center gap-1">
              {formatCurrency(avgWin)}
            </span>
            <span className="text-short flex items-center gap-1">
              -{formatCurrency(avgLoss)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
})

export default AvgWinLoss
