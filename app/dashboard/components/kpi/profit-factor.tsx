'use client'

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { CircularProgress } from '@/components/ui/circular-progress'
import { useTradeStatistics } from '@/hooks/use-trade-statistics'
import { HelpCircle } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface ProfitFactorProps {
  size?: string
}

const ProfitFactor = React.memo(function ProfitFactor({ size }: ProfitFactorProps) {
  const { profitFactor, grossWin, grossLosses } = useTradeStatistics()
  
  // Convert profit factor to percentage for circular progress (capped at 100%)
  // Values above 1.0 are good, so we'll map 0-2.0 to 0-100%
  const progressValue = Math.min((profitFactor / 2.0) * 100, 100)
  
  // Determine color based on profit factor - use CSS variables for consistency
  const getColor = (factor: number) => {
    if (factor >= 1.0) return 'hsl(var(--chart-profit))' // Profit green (profitable)
    return 'hsl(var(--chart-loss))' // Loss red (unprofitable)
  }

  return (
    <Card className="w-full h-24">
      <CardContent className="p-5 h-full flex items-center justify-between">
        <div className="flex flex-col">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-muted-foreground font-medium">
              Profit factor
            </span>
            <TooltipProvider delayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="w-3 h-3 rounded-full bg-muted flex items-center justify-center cursor-help">
                    <HelpCircle className="h-2 w-2 text-muted-foreground" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={5} className="max-w-[220px]">
                  <p className="text-xs">Total profits divided by total losses. Values above 1.0 indicate profitability. Higher values mean better risk management.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <span className="text-xl font-bold text-foreground">
            {profitFactor.toFixed(2)}
          </span>
        </div>
        
        <div className="flex-shrink-0">
          <CircularProgress
            value={progressValue}
            size={56}
            strokeWidth={6}
            color={getColor(profitFactor)}
            showPercentage={false}
            type="circle"
          />
        </div>
      </CardContent>
    </Card>
  )
})

export default ProfitFactor
