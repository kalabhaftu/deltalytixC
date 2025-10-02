'use client'

import * as React from "react"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartConfig } from "@/components/ui/chart"
import { useData } from "@/context/data-provider"
import { cn } from "@/lib/utils"
import { Info } from 'lucide-react'
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { WidgetSize } from '@/app/dashboard/types/dashboard'
interface CommissionsPnLChartProps {
  size?: WidgetSize
}

const chartConfig = {
  pnl: {
    label: "Net P/L",
    color: "hsl(var(--chart-3))",
  },
  commissions: {
    label: "Commissions",
    color: "hsl(var(--chart-4))",
  },
} satisfies ChartConfig

const formatCurrency = (value: number) =>
  value.toLocaleString('en-US', { style: 'currency', currency: 'USD' })

import { formatPercentage } from '@/lib/utils'

export default function CommissionsPnLChart({ size = 'medium' }: CommissionsPnLChartProps) {
  const { formattedTrades:trades } = useData()
  const chartData = React.useMemo(() => {
    // Calculate totals with null safety
    const totalPnL = trades.reduce((sum, trade) => sum + (trade.pnl || 0), 0)
    const totalCommissions = trades.reduce((sum, trade) => sum + Math.abs(trade.commission || 0), 0)
    

    // For pie chart, we need absolute values to show proportions correctly
    const absPnL = Math.abs(totalPnL)
    const absCommissions = Math.abs(totalCommissions)
    const total = absPnL + absCommissions

    // Handle case where total is 0 to avoid division by zero
    if (total === 0 || (absPnL === 0 && absCommissions === 0)) {
      return [
        {
          name: "P&L",
          value: 0,
          displayValue: 0,
          percentage: 0,
          fill: chartConfig.pnl.color
        },
        {
          name: "Commissions",
          value: 0,
          displayValue: 0,
          percentage: 0,
          fill: chartConfig.commissions.color
        }
      ]
    }

    // Create data with actual values but calculate percentages from absolute values
    const data = []
    
    if (absPnL > 0) {
      data.push({
        name: "P&L",
        value: totalPnL, // Keep original sign for display
        displayValue: absPnL, // Absolute value for pie chart display
        percentage: absPnL / total,
        fill: chartConfig.pnl.color
      })
    }
    
    if (absCommissions > 0) {
      data.push({
        name: "Commissions",
        value: totalCommissions, // Always positive for commissions
        displayValue: absCommissions, // Absolute value for pie chart display
        percentage: absCommissions / total,
        fill: chartConfig.commissions.color
      })
    }

    return data
  }, [trades])

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="rounded-lg border bg-background p-2 shadow-sm">
          <div className="grid gap-2">
            <div className="flex flex-col">
              <span className="text-[0.70rem] uppercase text-muted-foreground">
                Category
              </span>
              <span className="font-bold text-muted-foreground">
                {data.name}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[0.70rem] uppercase text-muted-foreground">
                Amount
              </span>
              <span className="font-bold">
                {formatCurrency(data.value)}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[0.70rem] uppercase text-muted-foreground">
                Percentage
              </span>
              <span className="font-bold text-muted-foreground">
                {formatPercentage(data.percentage)}
              </span>
            </div>
          </div>
        </div>
      )
    }
    return null
  }

  const CustomLegend = ({ payload }: any) => {
    return (
      <div className="flex justify-center gap-4 pt-2">
        {payload.map((entry: any, index: number) => (
          <div key={`legend-${index}`} className="flex items-center gap-1.5">
            <div 
              className="h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-xs text-muted-foreground">
              {entry.value}
            </span>
          </div>
        ))}
      </div>
    )
  }

  const getChartHeight = () => {
    switch (size) {
      case 'small-long':
        return 140
      case 'medium':
        return 200
      case 'large':
        return 280
      default:
        return 200
    }
  }

  const getOuterRadius = () => {
    switch (size) {
      case 'small-long':
        return 45
      case 'medium':
        return 70
      case 'large':
        return 100
      default:
        return 70
    }
  }

  // Check if we have any meaningful data to display
  const hasData = chartData.length > 0 && chartData.some(item => Math.abs(item.value) > 0)

  return (
    <Card className="h-full flex flex-col">
      <CardHeader 
        className={cn(
          "flex flex-col items-stretch space-y-0 border-b shrink-0",
          size === 'small-long' ? "p-2 h-[40px]" : size === 'small' ? "p-2 h-[48px]" : "p-3 sm:p-4 h-[56px]"
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <CardTitle 
              className={cn(
                "line-clamp-1",
                size === 'small-long' ? "text-sm" : "text-base"
              )}
            >
              Commissions & P&L
            </CardTitle>
            <TooltipProvider>
              <UITooltip>
                <TooltipTrigger asChild>
                  <Info className={cn(
                    "text-muted-foreground hover:text-foreground transition-colors cursor-help",
                    size === 'small-long' ? "h-3.5 w-3.5" : "h-4 w-4"
                  )} />
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>Breakdown of commissions and P&L by category</p>
                </TooltipContent>
              </UITooltip>
            </TooltipProvider>
          </div>
        </div>
      </CardHeader>
      <CardContent 
        className={cn(
          "flex-1 min-h-0",
          size === 'small-long' ? "p-1" : "p-2 sm:p-4"
        )}
      >
        {!hasData ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-muted-foreground text-sm">
                No P&L or commission data available
              </p>
              <p className="text-muted-foreground text-xs mt-1">
                Import trades with P&L and commission information
              </p>
            </div>
          </div>
        ) : (
          <div className={cn(
            "w-full h-full"
          )}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
              <Pie
                data={chartData}
                dataKey="displayValue"
                nameKey="name"
                cx="50%"
                cy="45%"
                innerRadius={getOuterRadius() * 0.6}
                outerRadius={getOuterRadius()}
                paddingAngle={2}
                stroke="none"
              >
                  {chartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`}
                      fill={entry.fill}
                      className="transition-all duration-300 ease-in-out"
                    />
                  ))}
                </Pie>
                <Tooltip 
                  content={<CustomTooltip />}
                  wrapperStyle={{ 
                    fontSize: size === 'small-long' ? '10px' : '12px',
                    zIndex: 1000
                  }} 
                />
                <Legend 
                  content={<CustomLegend />}
                  verticalAlign="bottom"
                  align="center"
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}