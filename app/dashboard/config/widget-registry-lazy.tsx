import React, { lazy, Suspense } from 'react'
import { WidgetType, WidgetSize } from '../types/dashboard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { WidgetErrorBoundary } from '@/components/error-boundary'
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
const GoalsRiskCommandCenter = lazy(() => import('../components/kpi/goals-risk-command-center'))
const SessionAnalysis = lazy(() => import('../components/kpi/session-analysis'))

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



// Lazy component wrapper with suspense
function LazyWidget({
  Component,
  size,
  type,
  Preview
}: {
  Component: React.LazyExoticComponent<React.ComponentType<{ size?: WidgetSize }>>
  size: WidgetSize
  type: WidgetType
  Preview?: React.ReactNode
}) {
  return (
    <Suspense fallback={Preview || <div className="animate-pulse bg-muted/20 rounded-xl h-full w-full" />}>
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

// Calendar Preview
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
                className="aspect-square text-xs flex items-center justify-center rounded hover:bg-muted/50"
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
            <div className="h-3 w-20 bg-muted-foreground/10 rounded animate-pulse" />
            <div className="h-6 w-24 bg-muted-foreground/20 rounded animate-pulse" />
          </div>
          <div className="h-12 w-12 rounded-full bg-muted-foreground/10 animate-pulse" />
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
          <div className="flex-1 bg-muted-foreground/5 rounded-lg animate-pulse flex items-end p-4">
            <div className="flex items-end gap-1 w-full h-20">
              {Array(6).fill(0).map((_, j) => {
                const height = Math.random() * 60 + 20
                return (
                  <div
                    key={j}
                    className="flex-1 bg-muted-foreground/10 rounded-t animate-pulse"
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
                <div className="h-4 w-12 bg-muted-foreground/10 rounded animate-pulse" />
                <div className="h-4 w-16 bg-muted-foreground/10 rounded animate-pulse" />
              </div>
              <div className="h-4 w-20 bg-muted-foreground/20 rounded animate-pulse" />
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
    getComponent: ({ size }) => <LazyWidget Component={CalendarPnl} size={size} type="calendarAdvanced" Preview={<CreateCalendarPreview />} />,
    getPreview: () => <CreateCalendarPreview />
  },
  calendarMini: {
    type: 'calendarMini',
    defaultSize: 'large',
    allowedSizes: ['medium', 'large'],
    category: 'charts',
    description: 'Compact calendar view with daily P&L highlights',
    previewHeight: 350,
    getComponent: ({ size }) => <LazyWidget Component={MiniCalendarWrapper} size={size} type="calendarMini" Preview={<CreateCalendarPreview />} />,
    getPreview: () => <CreateCalendarPreview />
  },
  recentTrades: {
    type: 'recentTrades',
    defaultSize: 'large',
    allowedSizes: ['large', 'extra-large'],
    category: 'tables',
    description: 'Display recent trading activity',
    previewHeight: 400,
    getComponent: ({ size }) => <LazyWidget Component={RecentTradesWidget} size={size} type="recentTrades" Preview={CreateTablePreview('Recent Trades')} />,
    getPreview: () => CreateTablePreview('Recent Trades')
  },
  accountBalancePnl: {
    type: 'accountBalancePnl',
    defaultSize: 'small',
    allowedSizes: ['small'],
    category: 'statistics',
    description: 'Current account balance and P&L',
    kpiRowOnly: true,
    getComponent: ({ size }) => <LazyWidget Component={AccountBalancePnl} size={size} type="accountBalancePnl" Preview={CreateKpiPreview('Account Balance & P&L')} />,
    getPreview: () => CreateKpiPreview('Account Balance & P&L')
  },
  tradeWinRate: {
    type: 'tradeWinRate',
    defaultSize: 'small',
    allowedSizes: ['small'],
    category: 'statistics',
    description: 'Win rate by trade count',
    kpiRowOnly: true,
    getComponent: ({ size }) => <LazyWidget Component={TradeWinRate} size={size} type="tradeWinRate" Preview={CreateKpiPreview('Trade Win Rate')} />,
    getPreview: () => CreateKpiPreview('Trade Win Rate')
  },
  dayWinRate: {
    type: 'dayWinRate',
    defaultSize: 'small',
    allowedSizes: ['small'],
    category: 'statistics',
    description: 'Win rate by trading days',
    kpiRowOnly: true,
    getComponent: ({ size }) => <LazyWidget Component={DayWinRate} size={size} type="dayWinRate" Preview={CreateKpiPreview('Day Win Rate')} />,
    getPreview: () => CreateKpiPreview('Day Win Rate')
  },
  profitFactor: {
    type: 'profitFactor',
    defaultSize: 'small',
    allowedSizes: ['small'],
    category: 'statistics',
    description: 'Ratio of gross profit to gross loss',
    kpiRowOnly: true,
    getComponent: ({ size }) => <LazyWidget Component={ProfitFactor} size={size} type="profitFactor" Preview={CreateKpiPreview('Profit Factor')} />,
    getPreview: () => CreateKpiPreview('Profit Factor')
  },
  avgWinLoss: {
    type: 'avgWinLoss',
    defaultSize: 'small',
    allowedSizes: ['small'],
    category: 'statistics',
    description: 'Average win vs average loss',
    kpiRowOnly: true,
    getComponent: ({ size }) => <LazyWidget Component={AvgWinLoss} size={size} type="avgWinLoss" Preview={CreateKpiPreview('Avg Win/Loss')} />,
    getPreview: () => CreateKpiPreview('Avg Win/Loss')
  },
  currentStreak: {
    type: 'currentStreak',
    defaultSize: 'small',
    allowedSizes: ['small'],
    category: 'statistics',
    description: 'Current winning or losing streak',
    kpiRowOnly: true,
    getComponent: ({ size }) => <LazyWidget Component={CurrentStreak} size={size} type="currentStreak" Preview={CreateKpiPreview('Current Streak')} />,
    getPreview: () => CreateKpiPreview('Current Streak')
  },
  netDailyPnL: {
    type: 'netDailyPnL',
    defaultSize: 'large',
    allowedSizes: ['medium', 'large', 'extra-large'],
    category: 'charts',
    description: 'Daily net P&L bar chart',
    previewHeight: 300,
    getComponent: ({ size }) => <LazyWidget Component={NetDailyPnL} size={size} type="netDailyPnL" Preview={CreateChartPreview('Net Daily P&L')} />,
    getPreview: () => CreateChartPreview('Net Daily P&L')
  },
  dailyCumulativePnL: {
    type: 'dailyCumulativePnL',
    defaultSize: 'large',
    allowedSizes: ['medium', 'large', 'extra-large'],
    category: 'charts',
    description: 'Cumulative P&L line chart',
    previewHeight: 300,
    getComponent: ({ size }) => <LazyWidget Component={DailyCumulativePnL} size={size} type="dailyCumulativePnL" Preview={CreateChartPreview('Cumulative P&L')} />,
    getPreview: () => CreateChartPreview('Cumulative P&L')
  },
  accountBalanceChart: {
    type: 'accountBalanceChart',
    defaultSize: 'large',
    allowedSizes: ['medium', 'large', 'extra-large'],
    category: 'charts',
    description: 'Account balance over time',
    previewHeight: 300,
    getComponent: ({ size }) => <LazyWidget Component={AccountBalanceChart} size={size} type="accountBalanceChart" Preview={CreateChartPreview('Balance Chart')} />,
    getPreview: () => CreateChartPreview('Balance Chart')
  },
  weekdayPnL: {
    type: 'weekdayPnL',
    defaultSize: 'medium',
    allowedSizes: ['medium', 'large'],
    category: 'charts',
    description: 'P&L breakdown by day of week',
    previewHeight: 250,
    getComponent: ({ size }) => <LazyWidget Component={WeekdayPnL} size={size} type="weekdayPnL" Preview={CreateChartPreview('Weekday P&L')} />,
    getPreview: () => CreateChartPreview('Weekday P&L')
  },
  tradeDurationPerformance: {
    type: 'tradeDurationPerformance',
    defaultSize: 'medium',
    allowedSizes: ['medium', 'large'],
    category: 'charts',
    description: 'Performance by trade duration',
    previewHeight: 250,
    getComponent: ({ size }) => <LazyWidget Component={TradeDurationPerformance} size={size} type="tradeDurationPerformance" Preview={CreateChartPreview('Trade Duration')} />,
    getPreview: () => CreateChartPreview('Trade Duration')
  },
  performanceScore: {
    type: 'performanceScore',
    defaultSize: 'medium',
    allowedSizes: ['medium', 'large'],
    category: 'charts',
    description: 'Overall trading performance score',
    previewHeight: 250,
    getComponent: ({ size }) => <LazyWidget Component={PerformanceScore} size={size} type="performanceScore" Preview={CreateChartPreview('Performance Score')} />,
    getPreview: () => CreateChartPreview('Performance Score')
  },
  pnlByInstrument: {
    type: 'pnlByInstrument',
    defaultSize: 'medium',
    allowedSizes: ['medium', 'large'],
    category: 'charts',
    description: 'P&L breakdown by trading instrument',
    previewHeight: 250,
    getComponent: ({ size }) => <LazyWidget Component={PnLByInstrument} size={size} type="pnlByInstrument" Preview={CreateChartPreview('P&L by Instrument')} />,
    getPreview: () => CreateChartPreview('P&L by Instrument')
  },
  pnlByStrategy: {
    type: 'pnlByStrategy',
    defaultSize: 'medium',
    allowedSizes: ['medium', 'large'],
    category: 'charts',
    description: 'P&L breakdown by trading strategy',
    previewHeight: 250,
    getComponent: ({ size }) => <LazyWidget Component={PnLByStrategy} size={size} type="pnlByStrategy" Preview={CreateChartPreview('P&L by Strategy')} />,
    getPreview: () => CreateChartPreview('P&L by Strategy')
  },
  winRateByStrategy: {
    type: 'winRateByStrategy',
    defaultSize: 'medium',
    allowedSizes: ['medium', 'large'],
    category: 'charts',
    description: 'Win rate breakdown by strategy',
    previewHeight: 250,
    getComponent: ({ size }) => <LazyWidget Component={WinRateByStrategy} size={size} type="winRateByStrategy" Preview={CreateChartPreview('Win Rate by Strategy')} />,
    getPreview: () => CreateChartPreview('Win Rate by Strategy')
  },
  goalsRiskCommandCenter: {
    type: 'goalsRiskCommandCenter',
    defaultSize: 'large',
    allowedSizes: ['medium', 'large', 'extra-large'],
    category: 'statistics',
    description: 'Combined goals tracker and risk metrics command center',
    previewHeight: 200,
    getComponent: ({ size }) => <LazyWidget Component={GoalsRiskCommandCenter} size={size} type="goalsRiskCommandCenter" Preview={CreateKpiPreview('Command Center')} />,
    getPreview: () => CreateKpiPreview('Command Center')
  },
  sessionAnalysis: {
    type: 'sessionAnalysis',
    defaultSize: 'medium',
    allowedSizes: ['small', 'medium', 'large'],
    category: 'statistics',
    description: 'Performance breakdown by trading session',
    previewHeight: 200,
    getComponent: ({ size }) => <LazyWidget Component={SessionAnalysis} size={size} type="sessionAnalysis" Preview={CreateKpiPreview('Session Analysis')} />,
    getPreview: () => CreateKpiPreview('Session Analysis')
  }
}

// Export for backwards compatibility
export const WIDGET_REGISTRY = WIDGET_REGISTRY_LAZY


