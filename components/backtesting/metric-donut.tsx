'use client'

import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts"
import { cn } from "@/lib/utils"
import { HelpCircle } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface MetricDonutProps {
  title: string
  value: number | string
  percentage?: number
  winCount?: number
  lossCount?: number
  neutralCount?: number
  tooltip?: string
  className?: string
}

export function MetricDonut({ 
  title, 
  value, 
  percentage,
  winCount = 0,
  lossCount = 0,
  neutralCount = 0,
  tooltip,
  className 
}: MetricDonutProps) {
  // Create data for the donut chart
  const data = []
  
  if (winCount > 0) {
    data.push({ name: 'Win', value: winCount, color: '#10b981' })
  }
  if (neutralCount > 0) {
    data.push({ name: 'Neutral', value: neutralCount, color: '#6b7280' })
  }
  if (lossCount > 0) {
    data.push({ name: 'Loss', value: lossCount, color: '#ef4444' })
  }

  // If no specific counts provided, create a simple percentage-based chart
  if (data.length === 0 && percentage !== undefined) {
    data.push(
      { name: 'Value', value: percentage, color: '#10b981' },
      { name: 'Remaining', value: 100 - percentage, color: '#e5e7eb' }
    )
  }

  const formatValue = (val: number | string) => {
    if (typeof val === 'number') {
      if (title.includes('P&L')) {
        return new Intl.NumberFormat('en-US', { 
          style: 'currency', 
          currency: 'USD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        }).format(val)
      }
      if (title.includes('%')) {
        return `${val.toFixed(2)}%`
      }
      return val.toFixed(2)
    }
    return val
  }

  const getValueColor = () => {
    if (typeof value === 'number') {
      if (title.includes('P&L') || title.includes('trade')) {
        return value >= 0 ? "text-green-600 dark:text-green-400" : "text-destructive"
      }
      if (title.includes('win') || title.includes('factor')) {
        return value >= 50 || value >= 1 ? "text-green-600 dark:text-green-400" : "text-destructive"
      }
    }
    return "text-foreground"
  }

  return (
    <Card className={cn("h-full", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          {tooltip && (
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent 
                side="bottom" 
                sideOffset={5} 
                className="max-w-[300px]"
              >
                {tooltip}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 p-4 pt-0 flex flex-col items-center">
        {data.length > 0 && (
          <div className="relative w-20 h-12 mb-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="100%"
                  innerRadius={28}
                  outerRadius={35}
                  paddingAngle={1}
                  dataKey="value"
                  startAngle={180}
                  endAngle={0}
                  stroke="none"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
        
        <div className={cn("text-xl font-bold font-mono text-center", getValueColor())}>
          {formatValue(value)}
        </div>
        
        {/* Legend for counts */}
        {(winCount > 0 || lossCount > 0 || neutralCount > 0) && (
          <div className="flex justify-center items-center gap-2 mt-2 text-xs">
            {winCount > 0 && (
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-sm bg-green-500" />
                <span>{winCount}</span>
              </div>
            )}
            {neutralCount > 0 && (
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-sm bg-gray-500" />
                <span>{neutralCount}</span>
              </div>
            )}
            {lossCount > 0 && (
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-sm bg-red-500" />
                <span>{lossCount}</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
