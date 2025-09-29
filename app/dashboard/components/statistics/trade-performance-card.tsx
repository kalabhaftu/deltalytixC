'use client'

import { useData } from "@/context/data-provider"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { BarChart, TrendingUp, TrendingDown, Minus, HelpCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { WidgetSize } from '../../types/dashboard'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface TradePerformanceCardProps {
  size?: WidgetSize
}


export default function TradePerformanceCard({ size = 'medium' }: TradePerformanceCardProps) {
  const { statistics: { nbWin, nbLoss, nbBe, nbTrades } } = useData()

  // Calculate rates (exclude break-even trades from win rate - industry standard)
  const tradableTradesCount = nbWin + nbLoss // Exclude break-even trades
  const winRate = tradableTradesCount > 0 ? Math.round((nbWin / tradableTradesCount) * 1000) / 10 : 0 // Round to 1 decimal place
  const lossRate = nbTrades > 0 ? Math.round((nbLoss / nbTrades) * 1000) / 10 : 0 // Round to 1 decimal place
  const beRate = nbTrades > 0 ? Math.round((nbBe / nbTrades) * 1000) / 10 : 0 // Round to 1 decimal place

  // Let widget canvas handle loading states to avoid hooks violations

    return (
      <Card className="h-full">
        <div className="flex items-center justify-center h-full gap-1.5">
          <div className="flex items-center gap-1">
            <TrendingUp className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
            <span className="font-medium text-sm">{winRate.toFixed(1)}%</span>
          </div>
          <span className="text-muted-foreground">/</span>
          <div className="flex items-center gap-1">
            <Minus className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-medium text-sm">{beRate}%</span>
          </div>
          <span className="text-muted-foreground">/</span>
          <div className="flex items-center gap-1">
            <TrendingDown className="h-3.5 w-3.5 text-destructive" />
            <span className="font-medium text-sm">{lossRate}%</span>
          </div>
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent 
                side="bottom" 
                sideOffset={5} 
                className="max-w-[300px]"
              >
                Track your overall trading performance and win rate statistics.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </Card>
    )
  }
