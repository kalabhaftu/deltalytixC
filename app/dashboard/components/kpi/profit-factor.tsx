'use client'

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { CircularProgress } from '@/components/ui/circular-progress'
import { useTradeStatistics } from '@/hooks/use-trade-statistics'
import { Info } from 'lucide-react'
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

  // Memoize expensive calculations
  const { progressValue, color } = React.useMemo(() => {
    // Convert profit factor to percentage for circular progress (capped at 100%)
    // Values above 1.0 are good, so we'll map 0-2.0 to 0-100%
    const progress = Math.min((profitFactor / 2.0) * 100, 100)
    const colorValue = profitFactor >= 1.0
      ? 'hsl(var(--chart-profit))'
      : 'hsl(var(--chart-loss))'

    return { progressValue: progress, color: colorValue }
  }, [profitFactor])


  return (
    <Card className="w-full h-24">
      <CardContent className="px-6 py-4 h-full flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <span className="text-[11px] uppercase tracking-wide font-bold text-muted-foreground/80">
              Profit factor
            </span>
            <TooltipProvider delayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="w-3 h-3 rounded-full bg-muted flex items-center justify-center cursor-help">
                    <Info className="h-3 w-3 text-muted-foreground" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={5} className="max-w-[220px]">
                  <p className="text-xs">Total profits divided by total losses. Values above 1.0 indicate profitability. Higher values mean better risk management.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <span className="text-2xl font-bold text-foreground tracking-tight">
            {profitFactor.toFixed(2)}
          </span>
        </div>

        <div className="flex-shrink-0">
          <CircularProgress
            value={progressValue}
            size={48}
            strokeWidth={5}
            color={color}
            showPercentage={false}
            type="circle"
          />
        </div>
      </CardContent>
    </Card>
  )
})

export default ProfitFactor
