"use client"

import * as React from "react"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, Label } from "recharts"
import type { Props } from 'recharts/types/component/Label'
import type { PolarViewBox } from 'recharts/types/util/types'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
interface TradeDistributionProps {
  size?: WidgetSize
}

interface ChartDataPoint {
  name: string;
  value: number;
  color: string;
  count: number;
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: ChartDataPoint;
  }>;
}

const CustomTooltip = ({ active, payload }: TooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="rounded-lg border bg-background p-2 shadow-sm">
        <div className="grid gap-2">
          <div className="flex flex-col">
            <span className="text-[0.70rem] uppercase text-muted-foreground">
              Instrument
            </span>
            <span className="font-bold text-muted-foreground">
              {data.name}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[0.70rem] uppercase text-muted-foreground">
              Percentage
            </span>
            <span className="font-bold">
              {data.value.toFixed(2)}%
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export default function TradeDistributionChart({ size = 'medium' }: TradeDistributionProps) {
  const { statistics: { nbWin, nbLoss, nbBe, nbTrades } } = useData()
  const chartData = React.useMemo(() => {
    // Note: For distribution chart, we show percentage of all trades
    // This is different from win rate calculation which excludes break-even trades
    const winRate = Number((nbWin / nbTrades * 100).toFixed(2))
    const lossRate = Number((nbLoss / nbTrades * 100).toFixed(2))
    const beRate = Number((nbBe / nbTrades * 100).toFixed(2))

    return [
      { name: "Wins", value: winRate, color: 'hsl(var(--success))', count: nbWin },
      { name: "Break Even", value: beRate, color: 'hsl(var(--muted-foreground))', count: nbBe },
      { name: "Losses", value: lossRate, color: 'hsl(var(--destructive))', count: nbLoss }
    ]
  }, [nbWin, nbLoss, nbBe, nbTrades])

  // Calculate responsive radius based on size and screen
  const getRadius = React.useMemo(() => {
    if (size === 'small-long') {
      return {
        inner: '45%',
        outer: '65%'
      }
    }
    
    // For regular sizes, use slightly smaller radius to ensure proper containment
    return {
      inner: '48%',
      outer: '68%'
    }
  }, [size])

  const renderColorfulLegendText = (value: string, entry: any) => {
    return <span className="text-xs text-muted-foreground">{value}</span>;
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
              Trade Distribution
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
                  <p>Distribution of trades by instrument</p>
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
        <div className={cn(
          "w-full",
          // Responsive height based on screen size
          size === 'small-long' 
            ? "h-[180px] min-h-[180px]" 
            : "h-[220px] min-h-[220px] sm:h-[260px] sm:min-h-[260px] md:h-[280px] md:min-h-[280px] lg:h-[300px] lg:min-h-[300px]"
        )}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart 
              margin={{ 
                top: size === 'small-long' ? 10 : 15, 
                right: size === 'small-long' ? 10 : 15, 
                bottom: size === 'small-long' ? 20 : 30, 
                left: size === 'small-long' ? 10 : 15 
              }}
            >
              <Pie
                data={chartData}
                cx="50%"
                cy="42%"
                innerRadius={getRadius.inner}
                outerRadius={getRadius.outer}
                paddingAngle={2}
                dataKey="value"
                startAngle={90}
                endAngle={-270}
                stroke="hsl(var(--background))"
                strokeWidth={1}
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.color}
                    className="transition-all duration-300 ease-in-out hover:opacity-80 dark:brightness-90"
                  />
                ))}
                <Label
                  position="center"
                  content={(props: Props) => {
                    if (!props.viewBox) return null;
                    const viewBox = props.viewBox as PolarViewBox;
                    if (!viewBox.cx || !viewBox.cy) return null;
                    const cx = viewBox.cx;
                    const cy = viewBox.cy;

                    // Use conservative label positioning to prevent overflow
                    const labelRadius = Math.min(cx, cy) * 0.80; // Position labels at 80% of available radius

                    return chartData.map((entry, index) => {
                      const angle = -90 + (360 * (entry.value / 100) / 2) + (360 * chartData.slice(0, index).reduce((acc, curr) => acc + curr.value, 0) / 100);
                      const x = cx + labelRadius * Math.cos((angle * Math.PI) / 180);
                      const y = cy + labelRadius * Math.sin((angle * Math.PI) / 180);
                      return (
                        <text
                          key={index}
                          x={x}
                          y={y}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          className="fill-muted-foreground font-medium translate-y-2"
                          style={{ 
                            fontSize: size === 'small-long' ? '10px' : '12px'
                          }}
                        >
                          {entry.value > 5 ? `${Math.round(entry.value)}%` : ''}
                        </text>
                      );
                    });
                  }}
                />
              </Pie>
              <Legend 
                verticalAlign="bottom"
                align="center"
                iconSize={size === 'small-long' ? 6 : 8}
                iconType="circle"
                formatter={renderColorfulLegendText}
                wrapperStyle={{
                  paddingTop: size === 'small-long' ? 0 : 8,
                  fontSize: size === 'small-long' ? '10px' : '11px'
                }}
              />
              <Tooltip 
                content={<CustomTooltip />}
                wrapperStyle={{ 
                  fontSize: size === 'small-long' ? '10px' : '12px',
                  zIndex: 1000
                }} 
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
} 