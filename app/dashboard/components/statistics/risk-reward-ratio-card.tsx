'use client'

import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { WidgetSize } from '../../types/dashboard'
import { Scale, HelpCircle } from "lucide-react"
import { useTradeStatistics } from "@/hooks/use-trade-statistics"

interface RiskRewardRatioCardProps {
  size?: WidgetSize
}

export default function RiskRewardRatioCard({ size = 'tiny' }: RiskRewardRatioCardProps) {
  const { avgWin, avgLoss, riskRewardRatio } = useTradeStatistics()

  // Calculate progress percentage for visualization
  const totalValue = Math.abs(avgLoss) + Math.abs(avgWin)
  const profitPercentage = totalValue > 0
    ? (Math.abs(avgWin) / totalValue) * 100
    : 50

  return (
    <Card className="h-full">
      <div className="flex flex-col items-center justify-center h-full gap-2 p-2">
        <div className="flex items-center gap-1.5">
          <Scale className="h-3 w-3 text-primary" />
          <span className="font-medium text-sm">RR {riskRewardRatio}</span>
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
                Ratio between your average win and average loss. A ratio above 1 indicates your wins are larger than your losses, which is a positive indicator of your trading strategy.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <TooltipProvider delayDuration={100}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="w-full px-1 py-1.5 cursor-pointer">
                <Progress value={profitPercentage} className="h-1.5" />
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={5}>
              <div className="text-xs space-y-0.5">
                <div className="text-green-600 dark:text-green-400">Avg. Win: ${avgWin.toFixed(2)}</div>
                <div className="text-destructive">Avg. Loss: ${avgLoss.toFixed(2)}</div>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </Card>
  )
} 