"use client"

import React from 'react'
import { useTradeStatistics } from "@/hooks/use-trade-statistics"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { WidgetSize } from '../../types/dashboard'
import { HelpCircle } from "lucide-react"
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface ProfitFactorKpiProps {
  size?: WidgetSize
}


export default function ProfitFactorKpi({ size = 'kpi' }: ProfitFactorKpiProps) {
  const { profitFactor } = useTradeStatistics()

  // Determine if profit factor is good (>1 is profitable, >2 is excellent)
  const isGood = profitFactor > 1
  const isExcellent = profitFactor > 2

  // Normalize profit factor for donut chart (cap at 5 for visualization)
  const normalizedValue = Math.min(profitFactor / 5, 1) * 100
  const remainingValue = 100 - normalizedValue

  // Data for donut chart
  const chartData = [
    { name: 'value', value: normalizedValue, color: isExcellent ? '#10b981' : isGood ? '#f59e0b' : '#ef4444' },
    { name: 'remaining', value: remainingValue, color: '#e5e5e5' }
  ]

  return (
    <Card className="h-full">
      <CardContent className="flex flex-col justify-between h-full p-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">Profit factor</span>
            <TooltipProvider delayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={5} className="max-w-[300px]">
                  Ratio of gross profits to gross losses. Values above 1.0 indicate profitability, above 2.0 is excellent.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* Main Content - Optimized for wider layout */}
        <div className="flex-1 flex items-center justify-between gap-4">
          {/* Main Value */}
          <div className="text-center">
            <div className="text-2xl font-bold text-foreground">
              {profitFactor.toFixed(2)}
            </div>
          </div>

          {/* Donut Chart - Thinner ring, no border */}
          <div className="w-16 h-16 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={24}
                  outerRadius={28}
                  startAngle={90}
                  endAngle={450}
                  paddingAngle={0}
                  dataKey="value"
                  stroke="none"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
