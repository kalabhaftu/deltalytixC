'use client'

import { useData } from "@/context/data-provider"
import { Card } from "@/components/ui/card"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { WidgetSize } from '../../types/dashboard'
import { TrendingUp, TrendingDown, BarChart3, HelpCircle } from "lucide-react"
import { useMemo } from "react"

interface AdvancedMetricsCardProps {
  size?: WidgetSize
}

export default function AdvancedMetricsCard({ size = 'tiny' }: AdvancedMetricsCardProps) {
  const { formattedTrades } = useData()
  
  const { totalVolume, formattedVolume, maxDrawdown, sharpeRatio } = useMemo(() => {
    // Total Volume
    const totalVolume = formattedTrades.reduce((sum, trade) => sum + Math.abs(trade.quantity), 0)
    const formattedVolume = totalVolume >= 1000000 
      ? `${(totalVolume / 1000000).toFixed(1)}M`
      : totalVolume >= 1000 
        ? `${(totalVolume / 1000).toFixed(1)}K`
        : totalVolume.toString()
    
    // Maximum Drawdown
    let runningPnL = 0
    let peak = 0
    let maxDrawdown = 0
    
    if (formattedTrades.length > 0) {
      const sortedTrades = [...formattedTrades].sort((a, b) => 
        new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime()
      )
      
      sortedTrades.forEach(trade => {
        runningPnL += trade.pnl
        if (runningPnL > peak) peak = runningPnL
        const currentDrawdown = peak - runningPnL
        if (currentDrawdown > maxDrawdown) maxDrawdown = currentDrawdown
      })
    }
    
    // Sharpe Ratio
    let sharpeRatio = 0
    if (formattedTrades.length >= 2) {
      const returns = formattedTrades.map(trade => trade.pnl)
      const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length
      const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / (returns.length - 1)
      const stdDev = Math.sqrt(variance)
      sharpeRatio = stdDev === 0 ? 0 : (avgReturn / stdDev) * Math.sqrt(252)
    }
    
    return { totalVolume, formattedVolume, maxDrawdown, sharpeRatio }
  }, [formattedTrades])

  return (
    <Card className="flex items-center justify-center h-full p-2">
      <div className="flex items-center gap-2">
        {/* Volume */}
        <div className="flex items-center gap-1">
          <TrendingUp className="h-3 w-3 text-primary" />
          <span className="font-semibold text-sm text-foreground">
            {formattedVolume}
          </span>
        </div>
        
        {/* Drawdown */}
        <div className="flex items-center gap-1">
          <TrendingDown className="h-3 w-3 text-destructive" />
          <span className="font-semibold text-sm text-foreground">
            ${Math.round(maxDrawdown / 1000)}K
          </span>
        </div>
        
        {/* Sharpe */}
        <div className="flex items-center gap-1">
          <TrendingUp className="h-3 w-3 text-primary" />
          <span className="font-semibold text-sm text-foreground">
            {isFinite(sharpeRatio) ? sharpeRatio.toFixed(1) : '0.0'}
          </span>
        </div>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <HelpCircle className="h-3 w-3 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent 
              side="bottom" 
              sideOffset={5} 
              className="max-w-[300px]"
            >
              <div className="space-y-2">
                <p className="font-semibold">Advanced Trading Metrics</p>
                <div className="space-y-1 text-sm">
                  <div>
                    <span className="font-medium">Volume:</span> Total shares/contracts traded ({totalVolume.toLocaleString()})
                  </div>
                  <div>
                    <span className="font-medium">Drawdown:</span> Largest peak-to-trough decline (${maxDrawdown.toLocaleString()})
                  </div>
                  <div>
                    <span className="font-medium">Sharpe Ratio:</span> Risk-adjusted return metric ({isFinite(sharpeRatio) ? sharpeRatio.toFixed(2) : '0.00'})
                  </div>
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </Card>
  )
}
