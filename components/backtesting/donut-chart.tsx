'use client'

import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts"
import { cn } from "@/lib/utils"
import { HelpCircle } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface DonutChartProps {
  title: string
  percentage: number
  winCount: number
  lossCount: number
  tooltip?: string
  className?: string
}

export function DonutChart({ 
  title, 
  percentage, 
  winCount, 
  lossCount, 
  tooltip,
  className 
}: DonutChartProps) {
  const data = [
    { 
      name: 'Winners', 
      value: winCount, 
      color: '#10b981' // Green
    },
    { 
      name: 'Losers', 
      value: lossCount, 
      color: '#ef4444' // Red
    }
  ]

  const total = winCount + lossCount

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
      
      <CardContent className="flex-1 p-6 pt-2 flex flex-col items-center justify-center">
        <div className="relative w-40 h-40 mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={70}
                paddingAngle={3}
                dataKey="value"
                startAngle={90}
                endAngle={450}
                stroke="none"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          
          {/* Center content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-3xl font-bold text-green-400">
              {percentage.toFixed(0)}%
            </div>
            <div className="text-xs text-green-400 font-medium">
              WINRATE
            </div>
          </div>
        </div>
        
        {/* Legend */}
        <div className="flex justify-center items-center gap-4 mt-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-green-500" />
            <span className="text-sm font-medium">{winCount}</span>
            <span className="text-xs text-muted-foreground">winners</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-red-500" />
            <span className="text-sm font-medium">{lossCount}</span>
            <span className="text-xs text-muted-foreground">losers</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
