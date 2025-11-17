'use client'

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { useTradeStatistics } from '@/hooks/use-trade-statistics'
import { cn } from '@/lib/utils'
import { HelpCircle } from 'lucide-react'
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
      <CardContent className="p-5 h-full flex flex-col justify-center">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs text-muted-foreground font-medium">
            Avg win/loss trade
          </span>
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="w-3 h-3 rounded-full bg-muted flex items-center justify-center cursor-help">
                  <HelpCircle className="h-2 w-2 text-muted-foreground" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" sideOffset={5} className="max-w-[200px]">
                <p className="text-xs">Average profit on winning trades vs average loss on losing trades. Higher ratios indicate better risk/reward management.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xl font-bold text-foreground">
                    {riskRewardRatio.toFixed(2)}
                  </span>
                </div>
        
        {/* Horizontal Progress Bar */}
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
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
})

export default AvgWinLoss
