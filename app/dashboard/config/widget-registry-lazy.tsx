import React, { lazy, Suspense } from 'react'
import { WidgetType, WidgetSize } from '../types/dashboard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { WidgetErrorBoundary } from '@/components/error-boundary'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

// Lazy load all widget components for code splitting
const CalendarPnl = lazy(() => import('../components/calendar/calendar-widget'))
const MiniCalendarWrapper = lazy(() => import('../components/calendar/mini-calendar-wrapper'))
const RecentTradesWidget = lazy(() => import('../components/trades/recent-trades-widget'))

// KPI components (lazy loaded)
const AccountBalancePnl = lazy(() => import('../components/kpi/account-balance-pnl'))
const TradeWinRate = lazy(() => import('../components/kpi/trade-win-rate'))
const DayWinRate = lazy(() => import('../components/kpi/day-win-rate'))
const ProfitFactor = lazy(() => import('../components/kpi/profit-factor'))
const AvgWinLoss = lazy(() => import('../components/kpi/avg-win-loss'))
const CurrentStreak = lazy(() => import('../components/kpi/current-streak'))

// Chart components (lazy loaded)
const NetDailyPnL = lazy(() => import('../components/charts/net-daily-pnl'))
const DailyCumulativePnL = lazy(() => import('../components/charts/daily-cumulative-pnl'))
const AccountBalanceChart = lazy(() => import('../components/charts/account-balance-chart'))
const WeekdayPnL = lazy(() => import('../components/charts/weekday-pnl'))
const TradeDurationPerformance = lazy(() => import('../components/charts/trade-duration-performance'))
const PerformanceScore = lazy(() => import('../components/charts/performance-score'))
const PnLByInstrument = lazy(() => import('../components/charts/pnl-by-instrument'))
const PnLByStrategy = lazy(() => import('../components/charts/pnl-by-strategy'))
const WinRateByStrategy = lazy(() => import('../components/charts/win-rate-by-strategy'))

// Detailed widget loading skeletons - EXACTLY matching Step 1 design with fixed dimensions
function KpiWidgetSkeleton() {
  return (
    <div className="w-full h-[120px]">
      <Card className="h-full p-4">
        <div className="flex items-start justify-between h-full">
          <div className="space-y-2 flex-1">
            <div className="h-3 w-20 bg-muted-foreground/20 rounded animate-pulse" />
            <div className="h-6 w-24 bg-muted-foreground/30 rounded animate-pulse" />
          </div>
          <div className="h-12 w-12 rounded-full bg-muted-foreground/20 animate-pulse" />
        </div>
      </Card>
    </div>
  )
}

function ChartWidgetSkeleton() {
  return (
    <div className="w-full h-[360px]">
      <Card className="h-full p-6">
        <div className="space-y-4 h-full">
          <div className="h-5 w-28 bg-muted-foreground/30 rounded animate-pulse" />
          <div className="flex-1 bg-muted-foreground/10 rounded-lg animate-pulse flex items-end p-4">
            <div className="flex items-end gap-1 w-full h-32">
              {Array(8).fill(0).map((_, j) => {
                const height = Math.random() * 80 + 20
                return (
                  <div 
                    key={j} 
                    className="flex-1 bg-muted-foreground/20 rounded-t animate-pulse"
                    style={{ 
                      height: `${height}%`,
                      animationDelay: `${j * 50}ms`
                    }}
                  />
                )
              })}
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}

function TableWidgetSkeleton() {
  return (
    <div className="w-full h-[300px]">
      <Card className="h-full p-6">
        <div className="space-y-4">
          <div className="h-5 w-32 bg-muted-foreground/30 rounded animate-pulse" />
          <div className="space-y-3">
            {Array(5).fill(0).map((_, i) => (
              <div key={i} className="flex justify-between items-center py-2 border-b border-muted/30">
                <div className="flex items-center space-x-3">
                  <div className="h-4 w-12 bg-muted-foreground/20 rounded animate-pulse" />
                  <div className="h-4 w-16 bg-muted-foreground/20 rounded animate-pulse" />
                </div>
                <div className="h-4 w-20 bg-muted-foreground/30 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  )
}

function CalendarWidgetSkeleton() {
  return (
    <div className="w-full h-[300px]">
      <Card className="h-full p-6">
        <div className="space-y-4 h-full">
          <div className="flex items-center justify-between">
            <div className="h-5 w-24 bg-muted-foreground/30 rounded animate-pulse" />
            <div className="flex gap-2">
              <div className="h-6 w-6 bg-muted-foreground/20 rounded animate-pulse" />
              <div className="h-6 w-6 bg-muted-foreground/20 rounded animate-pulse" />
            </div>
          </div>
          <div className="flex-1 flex flex-col space-y-2">
            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-1">
              {Array(7).fill(0).map((_, i) => (
                <div key={i} className="h-4 bg-muted-foreground/20 rounded animate-pulse text-center" />
              ))}
            </div>
            {/* Calendar days */}
            <div className="flex-1 flex flex-col justify-start space-y-1 max-h-[180px] overflow-hidden">
              {Array(4).fill(0).map((_, weekIndex) => (
                <div key={weekIndex} className="grid grid-cols-7 gap-1 flex-1">
                  {Array(7).fill(0).map((_, dayIndex) => (
                    <div 
                      key={dayIndex} 
                      className="w-full h-full min-h-[24px] max-h-[32px] bg-muted-foreground/10 rounded animate-pulse" 
                      style={{ animationDelay: `${(weekIndex * 7 + dayIndex) * 15}ms` }} 
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}

function WidgetSkeleton({ size, type }: { size: WidgetSize, type?: WidgetType }) {
  // Use specific skeletons based on widget type - EXACTLY matching Step 1 with fixed dimensions
  if (type?.includes('calendar')) {
    return <CalendarWidgetSkeleton />
  }
  
  if (type?.includes('recentTrades') || type?.includes('table')) {
    return <TableWidgetSkeleton />
  }
  
  if (type?.includes('chart') || type?.includes('Chart') || type?.includes('PnL') || type?.includes('Performance')) {
    return <ChartWidgetSkeleton />
  }
  
  // Default to KPI skeleton for small widgets
  if (size === 'small') {
    return <KpiWidgetSkeleton />
  }
  
  // Default to chart skeleton for larger widgets
  return <ChartWidgetSkeleton />
}

// Lazy component wrapper with suspense
function LazyWidget({ 
  Component, 
  size,
  type
}: { 
  Component: React.LazyExoticComponent<React.ComponentType<{ size?: WidgetSize }>>
  size: WidgetSize
  type: WidgetType
}) {
  return (
    <Suspense fallback={<WidgetSkeleton size={size} type={type} />}>
      <WidgetErrorBoundary widgetType="Widget">
        <Component size={size} />
      </WidgetErrorBoundary>
    </Suspense>
  )
}

export interface WidgetConfig {
  type: WidgetType
  defaultSize: WidgetSize
  allowedSizes: WidgetSize[]
  category: 'charts' | 'statistics' | 'tables' | 'other'
  description?: string
  requiresFullWidth?: boolean
  minWidth?: number
  minHeight?: number
  previewHeight?: number
  kpiRowOnly?: boolean
  getComponent: (props: { size: WidgetSize }) => React.ReactElement
  getPreview: () => React.ReactElement
}

function CreateCalendarPreview() {
  const weekdays = [
    'Sun',
    'Mon',
    'Tue',
    'Wed',
    'Thu',
    'Fri',
    'Sat'
  ] as const

  return (
    <Card className="w-full h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Calendar</CardTitle>
      </CardHeader>
      <CardContent className="p-2">
        <div className="space-y-1">
          <div className="grid grid-cols-7 gap-1 text-xs text-muted-foreground">
            {weekdays.map(day => (
              <div key={day} className="text-center p-1">{day}</div>
          ))}
        </div>
          <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 35 }, (_, i) => (
            <div 
              key={i} 
                className="aspect-square text-xs flex items-center justify-center rounded hover:bg-muted"
            >
                {i % 7 === 0 ? Math.floor(i / 7) + 1 : ''}
            </div>
          ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function CreateKpiPreview(title: string) {
  return (
    <Card className="w-full h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="flex items-start justify-between h-full">
          <div className="space-y-2 flex-1">
            <div className="h-3 w-20 bg-muted-foreground/20 rounded animate-pulse" />
            <div className="h-6 w-24 bg-muted-foreground/30 rounded animate-pulse" />
          </div>
          <div className="h-12 w-12 rounded-full bg-muted-foreground/20 animate-pulse" />
        </div>
      </CardContent>
    </Card>
  )
}

function CreateChartPreview(title: string) {
  return (
    <Card className="w-full h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="space-y-4 h-full">
          <div className="flex-1 bg-muted-foreground/10 rounded-lg animate-pulse flex items-end p-4">
            <div className="flex items-end gap-1 w-full h-20">
              {Array(6).fill(0).map((_, j) => {
                const height = Math.random() * 60 + 20
                return (
                  <div 
                    key={j} 
                    className="flex-1 bg-muted-foreground/20 rounded-t animate-pulse"
                    style={{ 
                      height: `${height}%`,
                      animationDelay: `${j * 50}ms`
                    }}
                  />
                )
              })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function CreateTablePreview(title: string) {
  return (
    <Card className="w-full h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="space-y-3">
          {Array(3).fill(0).map((_, i) => (
            <div key={i} className="flex justify-between items-center py-2 border-b border-muted/30">
              <div className="flex items-center space-x-3">
                <div className="h-4 w-12 bg-muted-foreground/20 rounded animate-pulse" />
                <div className="h-4 w-16 bg-muted-foreground/20 rounded animate-pulse" />
              </div>
              <div className="h-4 w-20 bg-muted-foreground/30 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export const WIDGET_REGISTRY_LAZY: Record<WidgetType, WidgetConfig> = {
  calendarAdvanced: {
    type: 'calendarAdvanced',
    defaultSize: 'extra-large',
    allowedSizes: ['large', 'extra-large'],
    category: 'charts',
    description: 'Full calendar with daily P&L, trade counts, and performance analytics',
    previewHeight: 500,
    getComponent: ({ size }) => <LazyWidget Component={CalendarPnl} size={size} type="calendarAdvanced" />,
    getPreview: () => <CreateCalendarPreview />
  },
  calendarMini: {
    type: 'calendarMini',
    defaultSize: 'large',
    allowedSizes: ['medium', 'large'],
    category: 'charts',
    description: 'Compact calendar view with daily P&L highlights',
    previewHeight: 350,
    getComponent: ({ size }) => <LazyWidget Component={MiniCalendarWrapper} size={size} type="calendarMini" />,
    getPreview: () => <CreateCalendarPreview />
  },
  recentTrades: {
    type: 'recentTrades',
    defaultSize: 'large',
    allowedSizes: ['large', 'extra-large'],
    category: 'tables',
    description: 'Display recent trading activity',
    previewHeight: 400,
    getComponent: ({ size }) => <LazyWidget Component={RecentTradesWidget} size={size} type="recentTrades" />,
    getPreview: () => CreateTablePreview('Recent Trades')
  },
  accountBalancePnl: {
    type: 'accountBalancePnl',
    defaultSize: 'small',
    allowedSizes: ['small'],
    category: 'statistics',
    description: 'Current account balance and P&L',
    kpiRowOnly: true,
    getComponent: ({ size }) => <LazyWidget Component={AccountBalancePnl} size={size} type="accountBalancePnl" />,
    getPreview: () => CreateKpiPreview('Account Balance & P&L')
  },
  tradeWinRate: {
    type: 'tradeWinRate',
    defaultSize: 'small',
    allowedSizes: ['small'],
    category: 'statistics',
    description: 'Win rate by trade count',
    kpiRowOnly: true,
    getComponent: ({ size }) => <LazyWidget Component={TradeWinRate} size={size} type="tradeWinRate" />,
    getPreview: () => CreateKpiPreview('Trade Win Rate')
  },
  dayWinRate: {
    type: 'dayWinRate',
    defaultSize: 'small',
    allowedSizes: ['small'],
    category: 'statistics',
    description: 'Win rate by trading days',
    kpiRowOnly: true,
    getComponent: ({ size }) => <LazyWidget Component={DayWinRate} size={size} type="dayWinRate" />,
    getPreview: () => CreateKpiPreview('Day Win Rate')
  },
  profitFactor: {
    type: 'profitFactor',
    defaultSize: 'small',
    allowedSizes: ['small'],
    category: 'statistics',
    description: 'Ratio of gross profit to gross loss',
    kpiRowOnly: true,
    getComponent: ({ size }) => <LazyWidget Component={ProfitFactor} size={size} type="profitFactor" />,
    getPreview: () => CreateKpiPreview('Profit Factor')
  },
  avgWinLoss: {
    type: 'avgWinLoss',
    defaultSize: 'small',
    allowedSizes: ['small'],
    category: 'statistics',
    description: 'Average win vs average loss',
    kpiRowOnly: true,
    getComponent: ({ size }) => <LazyWidget Component={AvgWinLoss} size={size} type="avgWinLoss" />,
    getPreview: () => CreateKpiPreview('Avg Win/Loss')
  },
  currentStreak: {
    type: 'currentStreak',
    defaultSize: 'small',
    allowedSizes: ['small'],
    category: 'statistics',
    description: 'Current winning or losing streak',
    kpiRowOnly: true,
    getComponent: ({ size }) => <LazyWidget Component={CurrentStreak} size={size} type="currentStreak" />,
    getPreview: () => CreateKpiPreview('Current Streak')
  },
  netDailyPnL: {
    type: 'netDailyPnL',
    defaultSize: 'large',
    allowedSizes: ['medium', 'large', 'extra-large'],
    category: 'charts',
    description: 'Daily net P&L bar chart',
    previewHeight: 300,
    getComponent: ({ size }) => <LazyWidget Component={NetDailyPnL} size={size} type="netDailyPnL" />,
    getPreview: () => CreateChartPreview('Net Daily P&L')
  },
  dailyCumulativePnL: {
    type: 'dailyCumulativePnL',
    defaultSize: 'large',
    allowedSizes: ['medium', 'large', 'extra-large'],
    category: 'charts',
    description: 'Cumulative P&L line chart',
    previewHeight: 300,
    getComponent: ({ size }) => <LazyWidget Component={DailyCumulativePnL} size={size} type="dailyCumulativePnL" />,
    getPreview: () => CreateChartPreview('Cumulative P&L')
  },
  accountBalanceChart: {
    type: 'accountBalanceChart',
    defaultSize: 'large',
    allowedSizes: ['medium', 'large', 'extra-large'],
    category: 'charts',
    description: 'Account balance over time',
    previewHeight: 300,
    getComponent: ({ size }) => <LazyWidget Component={AccountBalanceChart} size={size} type="accountBalanceChart" />,
    getPreview: () => CreateChartPreview('Balance Chart')
  },
  weekdayPnL: {
    type: 'weekdayPnL',
    defaultSize: 'medium',
    allowedSizes: ['medium', 'large'],
    category: 'charts',
    description: 'P&L breakdown by day of week',
    previewHeight: 250,
    getComponent: ({ size }) => <LazyWidget Component={WeekdayPnL} size={size} type="weekdayPnL" />,
    getPreview: () => CreateChartPreview('Weekday P&L')
  },
  tradeDurationPerformance: {
    type: 'tradeDurationPerformance',
    defaultSize: 'medium',
    allowedSizes: ['medium', 'large'],
    category: 'charts',
    description: 'Performance by trade duration',
    previewHeight: 250,
    getComponent: ({ size }) => <LazyWidget Component={TradeDurationPerformance} size={size} type="tradeDurationPerformance" />,
    getPreview: () => CreateChartPreview('Trade Duration')
  },
  performanceScore: {
    type: 'performanceScore',
    defaultSize: 'medium',
    allowedSizes: ['medium', 'large'],
    category: 'charts',
    description: 'Overall trading performance score',
    previewHeight: 250,
    getComponent: ({ size }) => <LazyWidget Component={PerformanceScore} size={size} type="performanceScore" />,
    getPreview: () => CreateChartPreview('Performance Score')
  },
  pnlByInstrument: {
    type: 'pnlByInstrument',
    defaultSize: 'medium',
    allowedSizes: ['medium', 'large'],
    category: 'charts',
    description: 'P&L breakdown by trading instrument',
    previewHeight: 250,
    getComponent: ({ size }) => <LazyWidget Component={PnLByInstrument} size={size} type="pnlByInstrument" />,
    getPreview: () => CreateChartPreview('P&L by Instrument')
  },
  pnlByStrategy: {
    type: 'pnlByStrategy',
    defaultSize: 'medium',
    allowedSizes: ['medium', 'large'],
    category: 'charts',
    description: 'P&L breakdown by trading strategy',
    previewHeight: 250,
    getComponent: ({ size }) => <LazyWidget Component={PnLByStrategy} size={size} type="pnlByStrategy" />,
    getPreview: () => CreateChartPreview('P&L by Strategy')
  },
  winRateByStrategy: {
    type: 'winRateByStrategy',
    defaultSize: 'medium',
    allowedSizes: ['medium', 'large'],
    category: 'charts',
    description: 'Win rate breakdown by strategy',
    previewHeight: 250,
    getComponent: ({ size }) => <LazyWidget Component={WinRateByStrategy} size={size} type="winRateByStrategy" />,
    getPreview: () => CreateChartPreview('Win Rate by Strategy')
  }
}

// Export for backwards compatibility
export const WIDGET_REGISTRY = WIDGET_REGISTRY_LAZY


