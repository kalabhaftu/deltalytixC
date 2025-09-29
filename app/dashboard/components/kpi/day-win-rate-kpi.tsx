"use client"

import React from 'react'
import { useData } from "@/context/data-provider"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { WidgetSize } from '../../types/dashboard'
import { HelpCircle } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface DayWinRateKpiProps {
  size?: WidgetSize
}

// Custom Gauge Component for Day Win Rate
function DayWinGaugeChart({ value }: { value: number }) {
  // Normalize value to 0-1 range for percentage
  const normalizedValue = Math.min(value / 100, 1)

  // Calculate angle for half-circle gauge (180 degrees total)
  const angle = normalizedValue * 180

  // SVG dimensions - adjusted for proper stroke containment
  const radius = 20
  const strokeWidth = 4
  const centerX = 27
  const centerY = 22

  // Background arc (full semicircle)
  const backgroundPath = `M ${centerX - radius} ${centerY} A ${radius} ${radius} 0 0 1 ${centerX + radius} ${centerY}`

  // Value arc (partial semicircle based on value)
  const valueAngle = (angle * Math.PI) / 180
  const endX = centerX + radius * Math.cos(Math.PI - valueAngle)
  const endY = centerY - radius * Math.sin(Math.PI - valueAngle)
  const largeArcFlag = angle > 90 ? 1 : 0
  const valuePath = `M ${centerX - radius} ${centerY} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY}`

  // Color based on percentage
  const getColor = (val: number) => {
    if (val >= 70) return '#10b981' // green-500
    if (val >= 50) return '#f59e0b' // amber-500
    return '#ef4444' // red-500
  }

  return (
    <div className="relative w-14 h-7">
      <svg width="54" height="28" viewBox="0 0 54 28" className="overflow-visible">
        {/* Background arc */}
        <path
          d={backgroundPath}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted-foreground/20"
        />

        {/* Value arc */}
        <path
          d={valuePath}
          fill="none"
          stroke={getColor(value)}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
      </svg>
    </div>
  )
}

export default function DayWinRateKpi({ size = 'kpi' }: DayWinRateKpiProps) {
  const { calendarData } = useData()
  
  // Calculate day win rate from calendar data
  const dayEntries = Object.entries(calendarData)
  const totalDays = dayEntries.length
  const winningDays = dayEntries.filter(([_, data]) => data.pnl > 0).length
  const neutralDays = dayEntries.filter(([_, data]) => data.pnl === 0).length
  const losingDays = dayEntries.filter(([_, data]) => data.pnl < 0).length
  
  const dayWinRate = totalDays > 0 ? Math.round((winningDays / totalDays) * 1000) / 10 : 0 // Round to 1 decimal place
  
  // Determine if day win rate is good
  const isGood = dayWinRate >= 50
  const isExcellent = dayWinRate >= 70

  return (
    <Card className="h-full">
      <CardContent className="flex flex-col justify-between h-full p-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">Day win %</span>
            <TooltipProvider delayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={5} className="max-w-[300px]">
                  Percentage of profitable trading days. Shows consistency in daily performance.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* Main Content - Optimized for wider layout */}
        <div className="flex-1 flex items-center justify-between gap-4">
          {/* Main Value */}
          <div className="text-center">
            <div className={cn(
              "text-2xl font-bold",
              isExcellent 
                ? "text-green-600 dark:text-green-400"
                : isGood 
                ? "text-amber-600 dark:text-amber-400"
                : "text-red-600 dark:text-red-400"
            )}>
              {dayWinRate.toFixed(2)}%
            </div>
          </div>

          {/* Gauge Chart */}
          <div className="relative">
            <DayWinGaugeChart value={dayWinRate} />
          </div>
        </div>

      </CardContent>
    </Card>
  )
}
