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

interface TradeWinRateProps {
  size?: string
}

const TradeWinRate = React.memo(function TradeWinRate({ size }: TradeWinRateProps) {
  const { winRate, nbWin, nbTrades } = useTradeStatistics()
  
  // Determine color based on win rate - use CSS variables for consistency
  const getColor = (rate: number) => {
    if (rate >= 50) return 'hsl(var(--chart-profit))' // Profit green
    return 'hsl(var(--chart-loss))' // Loss red
  }

  return (
    <Card className="w-full h-24">
      <CardContent className="p-5 h-full flex items-center justify-between">
        <div className="flex flex-col">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-muted-foreground font-medium">
              Trade Win %
            </span>
            <TooltipProvider delayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="w-3 h-3 rounded-full bg-muted flex items-center justify-center cursor-help">
                    <HelpCircle className="h-2 w-2 text-muted-foreground" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={5} className="max-w-[220px]">
                  <p className="text-xs">Percentage of winning trades out of total trades. Excludes break-even trades from calculation.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
                  <span className="text-xl font-bold text-foreground">
                    {winRate.toFixed(1)}%
                  </span>
        </div>
        
        <div className="flex-shrink-0">
          <CircularProgress
            value={winRate}
            size={56}
            strokeWidth={6}
            color={getColor(winRate)}
            showPercentage={false}
          />
        </div>
      </CardContent>
    </Card>
  )
})

export default TradeWinRate
