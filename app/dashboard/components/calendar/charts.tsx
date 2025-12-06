"use client"

import React from 'react'
import { BarChart, Bar, Cell, Tooltip, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Line, ComposedChart, ReferenceLine, Area, AreaChart } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartConfig, ChartContainer } from "@/components/ui/chart"
import { CalendarEntry } from "@/app/dashboard/types/calendar"
import { useTheme } from "@/context/theme-provider"
import { cn } from "@/lib/utils"
import { CHART_STYLES, PNL_TEXT_STYLES } from "@/app/dashboard/constants/calendar-styles"

interface ChartsProps {
  dayData: CalendarEntry | undefined;
  isWeekly?: boolean;
}

const chartConfig = {
  pnl: {
    label: "P&L Distribution",
    color: "hsl(var(--success))",
  },
  equity: {
    label: "Equity Variation",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig

const formatCurrency = (value: number | undefined | null) => {
  if (value == null) return '$0.00'
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const formatCompact = (value: number) => {
  if (Math.abs(value) >= 1000) {
    return `$${(value / 1000).toFixed(1)}k`
  }
  return `$${value.toFixed(0)}`
}

// Custom Tooltip Component
function CustomTooltip({ active, payload, isWeekly }: any) {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <div className={CHART_STYLES.tooltip}>
        <p className="font-semibold text-sm mb-1">{isWeekly ? data.date : data.time}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center justify-between gap-3 text-sm">
            <span className="text-muted-foreground">{entry.name}:</span>
            <span className={cn(
              "font-semibold",
              entry.dataKey === 'pnl'
                ? (entry.value >= 0 ? PNL_TEXT_STYLES.profit : PNL_TEXT_STYLES.loss)
                : 'text-primary'
            )}>
              {formatCurrency(entry.value)}
            </span>
          </div>
        ))}
        <p className="text-xs text-muted-foreground mt-1">
          Trade #{data.tradeNumber}
        </p>
      </div>
    )
  }
  return null
}

// Distribution Tooltip
function DistributionTooltip({ active, payload, totalPnL }: any) {
  if (active && payload?.[0]) {
    const data = payload[0].payload
    const percentage = data.account !== 'total'
      ? ((data.value / totalPnL) * 100).toFixed(1)
      : '100'
    return (
      <div className={CHART_STYLES.tooltip}>
        <p className="font-semibold text-sm">{data.name}</p>
        <p className={cn(
          "font-bold text-lg",
          data.value >= 0 ? PNL_TEXT_STYLES.profit : PNL_TEXT_STYLES.loss
        )}>
          {formatCurrency(data.value)}
        </p>
        {data.account !== 'total' && (
          <p className="text-xs text-muted-foreground">
            {percentage}% of total
          </p>
        )}
      </div>
    )
  }
  return null
}

export function Charts({ dayData, isWeekly = false }: ChartsProps) {
  const { effectiveTheme } = useTheme()
  const isDarkMode = effectiveTheme === 'dark' || effectiveTheme === 'midnight-ocean'
  const locale = 'en'

  const chartData = React.useMemo(() => {
    if (!dayData?.trades?.length) {
      return {
        accountPnL: {},
        equityChartData: [],
        distributionData: [],
        totalPnL: 0,
        domain: [0, 0] as [number, number]
      }
    }

    // Calculate P&L for each account
    const accountPnL = dayData.trades.reduce((acc, trade) => {
      const accountNumber = trade.accountNumber || 'Unknown'
      const totalPnL = trade.pnl - (trade.commission || 0)
      acc[accountNumber] = (acc[accountNumber] || 0) + totalPnL
      return acc
    }, {} as Record<string, number>)

    // Distribution data
    const distributionData = Object.entries(accountPnL)
      .map(([account, pnl]) => ({ name: account, value: pnl, account }))
      .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))

    const totalPnL = distributionData.reduce((sum, item) => sum + item.value, 0)

    // Equity chart data
    const equityChartData = [...dayData.trades]
      .sort((a, b) => new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime())
      .map((trade, index) => {
        const runningBalance = dayData.trades
          .slice(0, index + 1)
          .reduce((sum, t) => sum + (t.pnl - (t.commission || 0)), 0)
        return {
          time: new Date(trade.entryDate).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }),
          date: new Date(trade.entryDate).toLocaleDateString(locale, {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
          }),
          balance: runningBalance,
          pnl: trade.pnl - (trade.commission || 0),
          tradeNumber: index + 1,
        }
      })

    // Calculate domain
    const allValues = [
      ...Object.values(accountPnL),
      ...equityChartData.map(d => d.pnl),
      ...equityChartData.map(d => d.balance),
    ]
    const min = Math.min(...allValues, 0)
    const max = Math.max(...allValues, 0)
    const padding = (max - min) * 0.15 || 100
    const domain = [
      Math.floor((min - padding) / 100) * 100,
      Math.ceil((max + padding) / 100) * 100
    ] as [number, number]

    return {
      accountPnL,
      equityChartData,
      distributionData,
      totalPnL,
      domain
    }
  }, [dayData?.trades, locale])

  if (!dayData?.trades?.length) {
    return (
      <div className="h-full flex items-center justify-center py-12">
        <p className="text-muted-foreground">No trading data available</p>
      </div>
    )
  }

  // Theme-aware colors
  const profitColor = isDarkMode ? 'hsl(160, 84%, 40%)' : 'hsl(160, 84%, 35%)'
  const lossColor = isDarkMode ? 'hsl(0, 84%, 55%)' : 'hsl(0, 72%, 51%)'
  const primaryColor = 'hsl(var(--primary))'
  const mutedColor = 'hsl(var(--muted-foreground))'

  const distributionColors = isDarkMode
    ? ['#8b5cf6', '#6366f1', '#3b82f6', '#0ea5e9', '#06b6d4', '#14b8a6']
    : ['#a78bfa', '#818cf8', '#60a5fa', '#38bdf8', '#22d3ee', '#2dd4bf']

  return (
    <div className="space-y-5">
      {/* Equity Chart */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">
            {isWeekly ? "Weekly Equity" : "Daily Equity"}
          </CardTitle>
          <CardDescription>
            Final Balance: {formatCurrency(chartData.equityChartData[chartData.equityChartData.length - 1]?.balance || 0)}
          </CardDescription>
        </CardHeader>
        <CardContent className="h-[220px] pt-2">
          <ChartContainer config={chartConfig} className="h-full w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={chartData.equityChartData}
                margin={{ top: 10, right: 10, left: 0, bottom: 30 }}
              >
                <defs>
                  <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={primaryColor} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={primaryColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} vertical={false} />
                <XAxis
                  dataKey={isWeekly ? "date" : "time"}
                  angle={-45}
                  textAnchor="end"
                  height={50}
                  tick={{ fontSize: 10, fill: mutedColor }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tickFormatter={formatCompact}
                  domain={chartData.domain}
                  tick={{ fontSize: 10, fill: mutedColor }}
                  tickLine={false}
                  axisLine={false}
                  width={50}
                />
                <Tooltip content={<CustomTooltip isWeekly={isWeekly} />} />
                <ReferenceLine y={0} stroke={mutedColor} strokeDasharray="3 3" opacity={0.5} />
                <Bar dataKey="pnl" name="P&L" opacity={0.9} radius={[2, 2, 0, 0]}>
                  {chartData.equityChartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.pnl >= 0 ? profitColor : lossColor}
                    />
                  ))}
                </Bar>
                <Line
                  type="monotone"
                  dataKey="balance"
                  stroke={primaryColor}
                  strokeWidth={2.5}
                  dot={false}
                  name="Equity"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Distribution Chart */}
      {chartData.distributionData.length > 1 && (
        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">
              {isWeekly ? "Weekly Performance" : "Account Distribution"}
            </CardTitle>
            <CardDescription>
              Total: {formatCurrency(chartData.totalPnL)}
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[200px] pt-2">
            <ChartContainer config={chartConfig} className="h-full w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData.distributionData}
                  margin={{ top: 10, right: 10, left: 0, bottom: 50 }}
                  barCategoryGap={8}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} vertical={false} />
                  <XAxis
                    type="category"
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    height={50}
                    interval={0}
                    tick={(props) => {
                      const { x, y, payload } = props
                      return (
                        <g transform={`translate(${x},${y})`}>
                          <text
                            dy={10}
                            dx={-4}
                            textAnchor="end"
                            transform="rotate(-45)"
                            className="text-[9px] fill-muted-foreground"
                          >
                            {payload.value.length > 15 ? payload.value.substring(0, 15) + '...' : payload.value}
                          </text>
                        </g>
                      )
                    }}
                  />
                  <YAxis
                    type="number"
                    tickFormatter={formatCompact}
                    domain={chartData.domain}
                    tick={{ fontSize: 10, fill: mutedColor }}
                    tickLine={false}
                    axisLine={false}
                    width={50}
                  />
                  <ReferenceLine y={0} stroke={mutedColor} />
                  <Tooltip content={<DistributionTooltip totalPnL={chartData.totalPnL} />} />
                  <Bar dataKey="value" name="P&L" radius={[4, 4, 0, 0]}>
                    {chartData.distributionData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.value >= 0 ? distributionColors[index % distributionColors.length] : lossColor}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      )}
    </div>
  )
}