"use client"

import * as React from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartConfig } from "@/components/ui/chart"
import { useData } from "@/context/data-provider"
import { cn } from "@/lib/utils"
import { WidgetSize } from '@/app/dashboard/types/dashboard'
import { Info } from 'lucide-react'
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Button } from "@/components/ui/button"
import { useTickDetailsStore } from "@/store/tick-details-store"
import { useUserStore } from "@/store/user-store"

interface TickDistributionProps {
  size?: WidgetSize
}

interface ChartDataPoint {
  ticks: string;
  count: number;
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: ChartDataPoint;
  }>;
  label?: string;
}

const chartConfig = {
  count: {
    label: "Count",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig

const CustomTooltip = ({ active, payload }: TooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="rounded-lg border bg-background p-2 shadow-sm">
        <div className="grid gap-2">
          <div className="flex flex-col">
            <span className="text-[0.70rem] uppercase text-muted-foreground">
              Performance
            </span>
            <span className="font-bold text-muted-foreground">
              {data.ticks} {parseInt(data.ticks) !== 1 ? 'units' : 'unit'}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[0.70rem] uppercase text-muted-foreground">
              Trades
            </span>
            <span className="font-bold">
              {data.count} {data.count !== 1 ? 'trades' : 'trade'}
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

const formatCount = (value: number) => {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}k`
  }
  return value.toString()
}

export default function TickDistributionChart({ size = 'medium' }: TickDistributionProps) {
  const { formattedTrades: trades, tickFilter, setTickFilter } = useData()
  const tickDetails = useTickDetailsStore(state => state.tickDetails)

  const chartData = React.useMemo(() => {
    if (!trades.length) return []

    // Create a map to store unit counts (pips or points)
    const unitCounts: Record<number, number> = {}

    // Count trades for each unit value
    trades.forEach(trade => {
      // Validate trade data
      const pnl = Number(trade.pnl) || 0
      const quantity = Number(trade.quantity) || 0
      
      // Skip trades with invalid data
      if (quantity === 0 || isNaN(pnl) || isNaN(quantity)) {
        return
      }
      
      // Calculate PnL per contract
      const pnlPerContract = pnl / quantity
      
      // Universal calculation: Forex = Pips, Everything else = Points
      // Commented out futures logic - using CFD approach for all non-forex
      const isForex = /usd|eur|gbp|jpy|aud|cad|nzd|chf/.test(trade.instrument.toLowerCase())
      
      // // FUTURES LOGIC (COMMENTED OUT)
      // const isFutures = /es|nq|ym|mes|mnq|mym/.test(trade.instrument.toLowerCase())
      // if (isFutures) {
      //   // Use actual futures tick values
      //   let tickValue = 1
      //   if (trade.instrument.toLowerCase().includes('es')) tickValue = 12.50
      //   else if (trade.instrument.toLowerCase().includes('nq')) tickValue = 5.00
      //   else if (trade.instrument.toLowerCase().includes('ym')) tickValue = 5.00
      //   else if (trade.instrument.toLowerCase().includes('mes')) tickValue = 1.25
      //   else if (trade.instrument.toLowerCase().includes('mnq')) tickValue = 1.00
      //   else if (trade.instrument.toLowerCase().includes('mym')) tickValue = 1.00
      //   units = Math.round(pnlPerContract / tickValue)
      // }
      
      const units = isForex 
        ? Math.round(pnlPerContract / 0.0001)  // Pips (0.0001)
        : Math.round(pnlPerContract / 1.0)     // Points (1.0) - CFDs and everything else
      
      // Only count valid unit values (filter out extreme outliers)
      if (Math.abs(units) <= 1000) { // Reasonable range limit
        unitCounts[units] = (unitCounts[units] || 0) + 1
      }
    })

    // Convert the unit counts to sorted chart data
    return Object.entries(unitCounts)
      .map(([unit, count]) => ({
        ticks: unit === '0' ? '0' : Number(unit) > 0 ? `+${unit}` : `${unit}`,
        count
      }))
      .sort((a, b) => Number(a.ticks.replace('+', '')) - Number(b.ticks.replace('+', '')))

  }, [trades])

  const handleBarClick = (data: any) => {
    if (!data || !trades.length) return
    const clickedTicks = data.ticks
    if (tickFilter.value === clickedTicks) {
      setTickFilter({ value: null })
    } else {
      setTickFilter({ value: clickedTicks })
    }
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader 
        className={cn(
          "flex flex-row items-center justify-between space-y-0 border-b shrink-0",
          size === 'small-long' ? "p-2 h-[40px]" : "p-3 sm:p-4 h-[56px]"
        )}
      >
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-1.5">
             <CardTitle 
               className={cn(
                 "line-clamp-1",
                 size === 'small-long' ? "text-sm" : "text-base"
               )}
             >
               Tick Distribution
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
                   <p>Distribution of trading performance in universal units. Forex trades show pips, CFD indices and other instruments show points.</p>
                 </TooltipContent>
              </UITooltip>
            </TooltipProvider>
          </div>
          {tickFilter.value && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 lg:px-3"
               onClick={() => setTickFilter({ value: null })}
             >
               Clear Filter
             </Button>
          )}
        </div>
      </CardHeader>
      <CardContent 
        className={cn(
          "flex-1 min-h-0",
          size === 'small-long' ? "p-1" : "p-2 sm:p-4"
        )}
      >
        <div className={cn("w-full h-full")}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={
                size === 'small-long'
                  ? { left: 0, right: 4, top: 4, bottom: 20 }
                  : { left: 0, right: 8, top: 8, bottom: 24 }
              }
              onClick={(e) => e?.activePayload && handleBarClick(e.activePayload[0].payload)}
            >
              <CartesianGrid 
                strokeDasharray="3 3" 
                className="text-border dark:opacity-[0.12] opacity-[0.2]"
              />
              <XAxis
                dataKey="ticks"
                tickLine={false}
                axisLine={false}
                height={size === 'small-long' ? 20 : 24}
                tickMargin={size === 'small-long' ? 4 : 8}
                tick={(props) => {
                  const { x, y, payload } = props;
                  return (
                    <g transform={`translate(${x},${y})`}>
                      <text
                        x={0}
                        y={0}
                        dy={size === 'small-long' ? 8 : 4}
                        textAnchor={size === 'small-long' ? 'end' : 'middle'}
                        fill="currentColor"
                        fontSize={size === 'small-long' ? 9 : 11}
                        transform={size === 'small-long' ? 'rotate(-45)' : 'rotate(0)'}
                      >
                        {payload.value}
                      </text>
                    </g>
                  );
                }}
                interval="preserveStartEnd"
                allowDataOverflow={true}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={45}
                tickMargin={4}
                tickFormatter={formatCount}
                tick={{ 
                  fontSize: size === 'small-long' ? 9 : 11,
                  fill: 'currentColor'
                }}
              />
              <Tooltip 
                content={<CustomTooltip />}
                wrapperStyle={{ 
                  fontSize: size === 'small-long' ? '10px' : '12px',
                  zIndex: 1000
                }} 
              />
              <Bar
                dataKey="count"
                fill={chartConfig.count.color}
                radius={[3, 3, 0, 0]}
                maxBarSize={size === 'small-long' ? 25 : 40}
                className="transition-all duration-300 ease-in-out"
                opacity={tickFilter.value ? 0.3 : 1}
              >
                {chartData.map((entry) => (
                  <Cell
                    key={`cell-${entry.ticks}`}
                    opacity={tickFilter.value === entry.ticks ? 1 : (tickFilter.value ? 0.3 : 1)}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
