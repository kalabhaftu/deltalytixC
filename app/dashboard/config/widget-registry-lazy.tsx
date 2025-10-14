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

// Widget loading skeleton
function WidgetSkeleton({ size }: { size: WidgetSize }) {
  const height = size === 'small' ? 'h-32' : size === 'medium' ? 'h-48' : size === 'large' ? 'h-64' : 'h-96'
  
  return (
    <Card className={cn('w-full', height)}>
      <CardHeader className="pb-2">
        <Skeleton className="h-4 w-32" />
      </CardHeader>
      <CardContent className="p-4">
        <Skeleton className="h-full w-full" />
      </CardContent>
    </Card>
  )
}

// Lazy component wrapper with suspense
function LazyWidget({ 
  Component, 
  size 
}: { 
  Component: React.LazyExoticComponent<React.ComponentType<{ size?: WidgetSize }>>
  size: WidgetSize 
}) {
  return (
    <Suspense fallback={<WidgetSkeleton size={size} />}>
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

function CreateGenericPreview(title: string) {
  return (
    <Card className="w-full h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-4 flex items-center justify-center">
        <Skeleton className="h-20 w-full" />
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
    getComponent: ({ size }) => <LazyWidget Component={CalendarPnl} size={size} />,
    getPreview: () => <CreateCalendarPreview />
  },
  calendarMini: {
    type: 'calendarMini',
    defaultSize: 'large',
    allowedSizes: ['medium', 'large'],
    category: 'charts',
    description: 'Compact calendar view with daily P&L highlights',
    previewHeight: 350,
    getComponent: ({ size }) => <LazyWidget Component={MiniCalendarWrapper} size={size} />,
    getPreview: () => <CreateCalendarPreview />
  },
  recentTrades: {
    type: 'recentTrades',
    defaultSize: 'large',
    allowedSizes: ['large', 'extra-large'],
    category: 'tables',
    description: 'Display recent trading activity',
    previewHeight: 400,
    getComponent: ({ size }) => <LazyWidget Component={RecentTradesWidget} size={size} />,
    getPreview: () => CreateGenericPreview('Recent Trades')
  },
  accountBalancePnl: {
    type: 'accountBalancePnl',
    defaultSize: 'small',
    allowedSizes: ['small'],
    category: 'statistics',
    description: 'Current account balance and P&L',
    kpiRowOnly: true,
    getComponent: ({ size }) => <LazyWidget Component={AccountBalancePnl} size={size} />,
    getPreview: () => CreateGenericPreview('Account Balance & P&L')
  },
  tradeWinRate: {
    type: 'tradeWinRate',
    defaultSize: 'small',
    allowedSizes: ['small'],
    category: 'statistics',
    description: 'Win rate by trade count',
    kpiRowOnly: true,
    getComponent: ({ size }) => <LazyWidget Component={TradeWinRate} size={size} />,
    getPreview: () => CreateGenericPreview('Trade Win Rate')
  },
  dayWinRate: {
    type: 'dayWinRate',
    defaultSize: 'small',
    allowedSizes: ['small'],
    category: 'statistics',
    description: 'Win rate by trading days',
    kpiRowOnly: true,
    getComponent: ({ size }) => <LazyWidget Component={DayWinRate} size={size} />,
    getPreview: () => CreateGenericPreview('Day Win Rate')
  },
  profitFactor: {
    type: 'profitFactor',
    defaultSize: 'small',
    allowedSizes: ['small'],
    category: 'statistics',
    description: 'Ratio of gross profit to gross loss',
    kpiRowOnly: true,
    getComponent: ({ size }) => <LazyWidget Component={ProfitFactor} size={size} />,
    getPreview: () => CreateGenericPreview('Profit Factor')
  },
  avgWinLoss: {
    type: 'avgWinLoss',
    defaultSize: 'small',
    allowedSizes: ['small'],
    category: 'statistics',
    description: 'Average win vs average loss',
    kpiRowOnly: true,
    getComponent: ({ size }) => <LazyWidget Component={AvgWinLoss} size={size} />,
    getPreview: () => CreateGenericPreview('Avg Win/Loss')
  },
  currentStreak: {
    type: 'currentStreak',
    defaultSize: 'small',
    allowedSizes: ['small'],
    category: 'statistics',
    description: 'Current winning or losing streak',
    kpiRowOnly: true,
    getComponent: ({ size }) => <LazyWidget Component={CurrentStreak} size={size} />,
    getPreview: () => CreateGenericPreview('Current Streak')
  },
  netDailyPnL: {
    type: 'netDailyPnL',
    defaultSize: 'large',
    allowedSizes: ['medium', 'large', 'extra-large'],
    category: 'charts',
    description: 'Daily net P&L bar chart',
    previewHeight: 300,
    getComponent: ({ size }) => <LazyWidget Component={NetDailyPnL} size={size} />,
    getPreview: () => CreateGenericPreview('Net Daily P&L')
  },
  dailyCumulativePnL: {
    type: 'dailyCumulativePnL',
    defaultSize: 'large',
    allowedSizes: ['medium', 'large', 'extra-large'],
    category: 'charts',
    description: 'Cumulative P&L line chart',
    previewHeight: 300,
    getComponent: ({ size }) => <LazyWidget Component={DailyCumulativePnL} size={size} />,
    getPreview: () => CreateGenericPreview('Cumulative P&L')
  },
  accountBalanceChart: {
    type: 'accountBalanceChart',
    defaultSize: 'large',
    allowedSizes: ['medium', 'large', 'extra-large'],
    category: 'charts',
    description: 'Account balance over time',
    previewHeight: 300,
    getComponent: ({ size }) => <LazyWidget Component={AccountBalanceChart} size={size} />,
    getPreview: () => CreateGenericPreview('Balance Chart')
  },
  weekdayPnL: {
    type: 'weekdayPnL',
    defaultSize: 'medium',
    allowedSizes: ['medium', 'large'],
    category: 'charts',
    description: 'P&L breakdown by day of week',
    previewHeight: 250,
    getComponent: ({ size }) => <LazyWidget Component={WeekdayPnL} size={size} />,
    getPreview: () => CreateGenericPreview('Weekday P&L')
  },
  tradeDurationPerformance: {
    type: 'tradeDurationPerformance',
    defaultSize: 'medium',
    allowedSizes: ['medium', 'large'],
    category: 'charts',
    description: 'Performance by trade duration',
    previewHeight: 250,
    getComponent: ({ size }) => <LazyWidget Component={TradeDurationPerformance} size={size} />,
    getPreview: () => CreateGenericPreview('Trade Duration')
  },
  performanceScore: {
    type: 'performanceScore',
    defaultSize: 'medium',
    allowedSizes: ['medium', 'large'],
    category: 'charts',
    description: 'Overall trading performance score',
    previewHeight: 250,
    getComponent: ({ size }) => <LazyWidget Component={PerformanceScore} size={size} />,
    getPreview: () => CreateGenericPreview('Performance Score')
  },
  pnlByInstrument: {
    type: 'pnlByInstrument',
    defaultSize: 'medium',
    allowedSizes: ['medium', 'large'],
    category: 'charts',
    description: 'P&L breakdown by trading instrument',
    previewHeight: 250,
    getComponent: ({ size }) => <LazyWidget Component={PnLByInstrument} size={size} />,
    getPreview: () => CreateGenericPreview('P&L by Instrument')
  },
  pnlByStrategy: {
    type: 'pnlByStrategy',
    defaultSize: 'medium',
    allowedSizes: ['medium', 'large'],
    category: 'charts',
    description: 'P&L breakdown by trading strategy',
    previewHeight: 250,
    getComponent: ({ size }) => <LazyWidget Component={PnLByStrategy} size={size} />,
    getPreview: () => CreateGenericPreview('P&L by Strategy')
  },
  winRateByStrategy: {
    type: 'winRateByStrategy',
    defaultSize: 'medium',
    allowedSizes: ['medium', 'large'],
    category: 'charts',
    description: 'Win rate breakdown by strategy',
    previewHeight: 250,
    getComponent: ({ size }) => <LazyWidget Component={WinRateByStrategy} size={size} />,
    getPreview: () => CreateGenericPreview('Win Rate by Strategy')
  }
}

// Export for backwards compatibility
export const WIDGET_REGISTRY = WIDGET_REGISTRY_LAZY


