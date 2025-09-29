'use client'

import { useData } from '@/context/data-provider'
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { ArrowLeftRight, ArrowUpFromLine, ArrowDownFromLine, HelpCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { WidgetSize } from '../../types/dashboard'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface LongShortPerformanceCardProps {
  size?: WidgetSize
}

export default function LongShortPerformanceCard({ size = 'medium' }: LongShortPerformanceCardProps) {
  const { calendarData } = useData()

  // Calculate long/short data
  const chartData = Object.entries(calendarData).map(([date, values]) => ({
    date,
    pnl: values.pnl,
    shortNumber: values.shortNumber,
    longNumber: values.longNumber,
  }))

  const longNumber = chartData.reduce((acc, curr) => acc + curr.longNumber, 0)
  const shortNumber = chartData.reduce((acc, curr) => acc + curr.shortNumber, 0)
  const totalTrades = longNumber + shortNumber
  const longRate = totalTrades > 0 ? Math.round((longNumber / totalTrades) * 1000) / 10 : 0
  const shortRate = totalTrades > 0 ? Math.round((shortNumber / totalTrades) * 1000) / 10 : 0

    return (
      <Card className="h-full">
        <div className="flex items-center justify-center h-full gap-1.5">
          <div className="flex items-center gap-1">
            <ArrowUpFromLine className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
            <span className="font-medium text-sm">{longRate}%</span>
          </div>
          <span className="text-muted-foreground">/</span>
          <div className="flex items-center gap-1">
            <ArrowDownFromLine className="h-3.5 w-3.5 text-destructive" />
            <span className="font-medium text-sm">{shortRate}%</span>
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
                Compare your performance between long and short positions.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </Card>
    )
  }
