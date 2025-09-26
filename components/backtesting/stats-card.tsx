'use client'

import React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { HelpCircle } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface StatsCardProps {
  title: string
  value: string | number
  subtitle?: string
  positive?: boolean
  neutral?: boolean
  tooltip?: string
  className?: string
}

export function StatsCard({ 
  title, 
  value, 
  subtitle, 
  positive, 
  neutral, 
  tooltip,
  className 
}: StatsCardProps) {
  const formatValue = (val: string | number) => {
    if (typeof val === 'number') {
      if (title.includes('P&L')) {
        // Format large numbers like $191,266
        return new Intl.NumberFormat('en-US', { 
          style: 'currency', 
          currency: 'USD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        }).format(Math.round(val))
      }
      if (title.includes('trade') && !title.includes('%')) {
        return new Intl.NumberFormat('en-US', { 
          style: 'currency', 
          currency: 'USD',
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
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
    if (neutral) return "text-foreground"
    if (positive === undefined) return "text-foreground"
    return positive ? "text-green-600 dark:text-green-400" : "text-destructive"
  }

  return (
    <Card className={cn("h-full", className)}>
      <CardContent className="p-4 h-full flex flex-col justify-between">
        <div className="flex items-start justify-between mb-2">
          <span className="text-sm text-muted-foreground font-medium">
            {title}
          </span>
          {tooltip && (
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help ml-1 flex-shrink-0" />
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
        
        <div className="flex-1 flex flex-col justify-center">
          <div className={cn(
            "text-2xl font-bold font-mono mb-1",
            getValueColor()
          )}>
            {formatValue(value)}
          </div>
          {subtitle && (
            <div className="text-xs text-muted-foreground">
              {subtitle}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
