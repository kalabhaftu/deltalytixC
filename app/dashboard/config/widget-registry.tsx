import React from 'react'
import { WidgetType, WidgetSize } from '../types/dashboard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { WidgetErrorBoundary } from '@/components/error-boundary'
import { cn } from '@/lib/utils'

// Calendar components
import CalendarPnl from '../components/calendar/calendar-widget'
import MiniCalendarWrapper from '../components/calendar/mini-calendar-wrapper'
import RecentTradesWidget from '../components/trades/recent-trades-widget'

// KPI components
import AccountBalancePnl from '../components/kpi/account-balance-pnl'
import TradeWinRate from '../components/kpi/trade-win-rate'
import DayWinRate from '../components/kpi/day-win-rate'
import ProfitFactor from '../components/kpi/profit-factor'
import AvgWinLoss from '../components/kpi/avg-win-loss'
import CurrentStreak from '../components/kpi/current-streak'
import GoalsRiskCommandCenter from '../components/kpi/goals-risk-command-center'
import SessionAnalysis from '../components/kpi/session-analysis'

// Chart components
import NetDailyPnL from '../components/charts/net-daily-pnl'
import DailyCumulativePnL from '../components/charts/daily-cumulative-pnl'
import AccountBalanceChart from '../components/charts/account-balance-chart'
import WeekdayPnL from '../components/charts/weekday-pnl'
import TradeDurationPerformance from '../components/charts/trade-duration-performance'
import PerformanceScore from '../components/charts/performance-score'
import PnLByInstrument from '../components/charts/pnl-by-instrument'
import PnLByStrategy from '../components/charts/pnl-by-strategy'
import WinRateByStrategy from '../components/charts/win-rate-by-strategy'

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
  kpiRowOnly?: boolean // If true, can only be placed in row 0 (first KPI row with 5 slots)
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

export const WIDGET_REGISTRY: Record<WidgetType, WidgetConfig> = {
  calendarAdvanced: {
    type: 'calendarAdvanced',
    defaultSize: 'extra-large',
    allowedSizes: ['large', 'extra-large'],
    category: 'charts',
    description: 'Full calendar with daily P&L, trade counts, and performance analytics',
    previewHeight: 500,
    getComponent: () => <CalendarPnl />,
    getPreview: () => <CreateCalendarPreview />
  },
  calendarMini: {
    type: 'calendarMini',
    defaultSize: 'large',
    allowedSizes: ['medium', 'large'],
    category: 'charts',
    description: 'Compact calendar (Mon-Fri) with monthly P&L and weekly summary',
    previewHeight: 300,
    getComponent: () => <MiniCalendarWrapper />,
    getPreview: () => <CreateCalendarPreview />
  },
  recentTrades: {
    type: 'recentTrades',
    defaultSize: 'small',
    allowedSizes: ['small', 'medium', 'large'],
    category: 'tables',
    description: 'List of your 10 most recent trades with P&L and side',
    previewHeight: 300,
    getComponent: () => <RecentTradesWidget />,
    getPreview: () => (
      <Card className="w-full h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Recent Trades</CardTitle>
        </CardHeader>
        <CardContent className="p-2">
          <div className="space-y-1 text-xs text-muted-foreground">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex justify-between p-2 hover:bg-muted rounded">
                <span>AAPL</span>
                <span className="text-green-600">+$125.50</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  },
  accountBalancePnl: {
    type: 'accountBalancePnl',
    defaultSize: 'kpi',
    allowedSizes: ['kpi'],
    category: 'statistics',
    description: 'Current account balance with total P&L',
    previewHeight: 80,
    kpiRowOnly: true,
    getComponent: ({ size }) => <AccountBalancePnl size={size} />,
    getPreview: () => <AccountBalancePnl size="kpi" />
  },
  tradeWinRate: {
    type: 'tradeWinRate',
    defaultSize: 'kpi',
    allowedSizes: ['kpi'],
    category: 'statistics',
    description: 'Percentage of winning trades',
    previewHeight: 80,
    kpiRowOnly: true,
    getComponent: ({ size }) => <TradeWinRate size={size} />,
    getPreview: () => <TradeWinRate size="kpi" />
  },
  dayWinRate: {
    type: 'dayWinRate',
    defaultSize: 'kpi',
    allowedSizes: ['kpi'],
    category: 'statistics',
    description: 'Percentage of profitable trading days',
    previewHeight: 80,
    kpiRowOnly: true,
    getComponent: ({ size }) => <DayWinRate size={size} />,
    getPreview: () => <DayWinRate size="kpi" />
  },
  profitFactor: {
    type: 'profitFactor',
    defaultSize: 'kpi',
    allowedSizes: ['kpi'],
    category: 'statistics',
    description: 'Total profits divided by total losses',
    previewHeight: 80,
    kpiRowOnly: true,
    getComponent: ({ size }) => <ProfitFactor size={size} />,
    getPreview: () => <ProfitFactor size="kpi" />
  },
  avgWinLoss: {
    type: 'avgWinLoss',
    defaultSize: 'kpi',
    allowedSizes: ['kpi'],
    category: 'statistics',
    description: 'Average profit on winning vs losing trades',
    previewHeight: 80,
    kpiRowOnly: true,
    getComponent: ({ size }) => <AvgWinLoss size={size} />,
    getPreview: () => <AvgWinLoss size="kpi" />
  },
  currentStreak: {
    type: 'currentStreak',
    defaultSize: 'kpi',
    allowedSizes: ['kpi'],
    category: 'statistics',
    description: 'Current winning/losing streaks for both days and trades',
    previewHeight: 80,
    kpiRowOnly: true,
    getComponent: ({ size }) => <CurrentStreak size={size} />,
    getPreview: () => <CurrentStreak size="kpi" />
  },
  netDailyPnL: {
    type: 'netDailyPnL',
    defaultSize: 'small-long',
    allowedSizes: ['small-long', 'medium', 'large'],
    category: 'charts',
    description: 'Daily profit/loss bar chart showing wins and losses',
    previewHeight: 200,
    getComponent: ({ size }) => <NetDailyPnL size={size} />,
    getPreview: () => (
      <Card className="w-full h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Net Daily P/L</CardTitle>
        </CardHeader>
        <CardContent className="p-2">
          <div className="h-32 flex items-end gap-1">
            {Array.from({ length: 12 }).map((_, i) => {
              const isPositive = Math.random() > 0.4
              const height = Math.random() * 80 + 20
              return (
                <div
                  key={i}
                  className={cn(
                    "flex-1 rounded-t",
                    isPositive ? "bg-green-500" : "bg-red-500"
                  )}
                  style={{ height: `${height}%` }}
                />
              )
            })}
          </div>
        </CardContent>
      </Card>
    )
  },
  dailyCumulativePnL: {
    type: 'dailyCumulativePnL',
    defaultSize: 'small-long',
    allowedSizes: ['small-long', 'medium', 'large'],
    category: 'charts',
    description: 'Cumulative profit/loss area chart over time',
    previewHeight: 200,
    getComponent: ({ size }) => <DailyCumulativePnL size={size} />,
    getPreview: () => (
      <Card className="w-full h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Daily Net Cumulative P/L</CardTitle>
        </CardHeader>
        <CardContent className="p-2">
          <div className="h-32 relative">
            <svg viewBox="0 0 100 100" className="w-full h-full">
              <defs>
                <linearGradient id="preview-gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity="0.8" />
                  <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity="0.1" />
                </linearGradient>
              </defs>
              <path
                d="M 0,80 L 20,60 L 40,45 L 60,50 L 80,30 L 100,20 L 100,100 L 0,100 Z"
                fill="url(#preview-gradient)"
                stroke="hsl(var(--chart-2))"
                strokeWidth="2"
              />
            </svg>
          </div>
        </CardContent>
      </Card>
    )
  },
  accountBalanceChart: {
    type: 'accountBalanceChart',
    defaultSize: 'small-long',
    allowedSizes: ['small-long', 'medium', 'large'],
    category: 'charts',
    description: 'Account balance progression with detailed trade information',
    previewHeight: 200,
    getComponent: ({ size }) => <AccountBalanceChart size={size} />,
    getPreview: () => (
      <Card className="w-full h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Account Balance</CardTitle>
        </CardHeader>
        <CardContent className="p-2">
          <div className="h-32 relative">
            <svg viewBox="0 0 100 100" className="w-full h-full">
              <path
                d="M 0,80 L 20,60 L 40,65 L 60,40 L 80,45 L 100,25"
                fill="none"
                stroke="hsl(var(--chart-2))"
                strokeWidth="2"
              />
              <circle cx="20" cy="60" r="2" fill="hsl(var(--chart-2))" />
              <circle cx="40" cy="65" r="2" fill="hsl(var(--chart-2))" />
              <circle cx="60" cy="40" r="2" fill="hsl(var(--chart-2))" />
              <circle cx="80" cy="45" r="2" fill="hsl(var(--chart-2))" />
              <circle cx="100" cy="25" r="2" fill="hsl(var(--chart-2))" />
            </svg>
          </div>
        </CardContent>
      </Card>
    )
  },
  weekdayPnL: {
    type: 'weekdayPnL',
    defaultSize: 'small-long',
    allowedSizes: ['small-long', 'medium', 'large'],
    category: 'charts',
    description: 'P&L breakdown by weekday (Mon-Fri) with average toggle',
    previewHeight: 200,
    getComponent: ({ size }) => <WeekdayPnL size={size} />,
    getPreview: () => (
      <Card className="w-full h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Weekday P/L</CardTitle>
        </CardHeader>
        <CardContent className="p-2">
          <div className="h-32 flex items-end gap-1">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((day, i) => {
              const isPositive = Math.random() > 0.3
              const height = Math.random() * 80 + 20
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className={cn(
                      "w-full rounded-t",
                      isPositive ? "bg-green-500" : "bg-red-500"
                    )}
                    style={{ height: `${height}%` }}
                  />
                  <span className="text-[8px] text-muted-foreground">{day}</span>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    )
  },
  tradeDurationPerformance: {
    type: 'tradeDurationPerformance',
    defaultSize: 'small-long',
    allowedSizes: ['small-long', 'medium', 'large'],
    category: 'charts',
    description: 'P&L by trade duration (how long positions were held)',
    previewHeight: 200,
    getComponent: ({ size }) => <TradeDurationPerformance size={size} />,
    getPreview: () => (
      <Card className="w-full h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Trade Duration Performance</CardTitle>
        </CardHeader>
        <CardContent className="p-2">
          <div className="h-32 flex items-end gap-1">
            {Array.from({ length: 6 }).map((_, i) => {
              const isPositive = Math.random() > 0.4
              const height = Math.random() * 80 + 20
              return (
                <div
                  key={i}
                  className={cn(
                    "flex-1 rounded-t",
                    isPositive ? "bg-green-500" : "bg-red-500"
                  )}
                  style={{ height: `${height}%` }}
                />
              )
            })}
          </div>
        </CardContent>
      </Card>
    )
  },
  performanceScore: {
    type: 'performanceScore',
    defaultSize: 'small-long',
    allowedSizes: ['small-long', 'medium', 'large'],
    category: 'charts',
    description: 'Overall performance score with radar chart showing 6 key metrics',
    previewHeight: 200,
    getComponent: ({ size }) => <PerformanceScore size={size} />,
    getPreview: () => (
      <Card className="w-full h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Performance Score</CardTitle>
        </CardHeader>
        <CardContent className="p-2">
          <div className="h-32 relative flex items-center justify-center">
            <svg viewBox="0 0 100 100" className="w-full h-full">
              <defs>
                <linearGradient id="score-gradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="hsl(var(--destructive))" />
                  <stop offset="50%" stopColor="hsl(var(--warning))" />
                  <stop offset="100%" stopColor="hsl(var(--chart-2))" />
                </linearGradient>
              </defs>
              <polygon
                points="50,20 70,40 70,70 50,80 30,70 30,40"
                fill="hsl(var(--chart-3))"
                fillOpacity="0.3"
                stroke="hsl(var(--chart-3))"
                strokeWidth="2"
              />
              <text x="50" y="55" textAnchor="middle" fontSize="16" fill="currentColor" fontWeight="bold">
                75
              </text>
            </svg>
          </div>
        </CardContent>
      </Card>
    )
  },
  pnlByInstrument: {
    type: 'pnlByInstrument',
    defaultSize: 'small-long',
    allowedSizes: ['small-long', 'medium', 'large'],
    category: 'charts',
    description: 'P&L breakdown by trading instrument/pair with metrics',
    previewHeight: 250,
    getComponent: ({ size }) => <PnLByInstrument size={size} />,
    getPreview: () => (
      <Card className="w-full h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">P&L by Instrument</CardTitle>
        </CardHeader>
        <CardContent className="p-2">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span>NAS100</span>
              <span className="text-green-600 font-medium">$1,240</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span>EURUSD</span>
              <span className="text-red-600 font-medium">-$320</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span>GOLD</span>
              <span className="text-green-600 font-medium">$890</span>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  },
  pnlByStrategy: {
    type: 'pnlByStrategy',
    defaultSize: 'small-long',
    allowedSizes: ['small-long', 'medium', 'large'],
    category: 'charts',
    description: 'P&L performance by trading strategy/model with win/loss stats',
    previewHeight: 250,
    getComponent: ({ size }) => <PnLByStrategy size={size} />,
    getPreview: () => (
      <Card className="w-full h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">P&L by Strategy</CardTitle>
        </CardHeader>
        <CardContent className="p-2">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span>ICT 2022</span>
              <span className="text-green-600 font-medium">$2,140</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span>MSNR</span>
              <span className="text-green-600 font-medium">$780</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span>Price Action</span>
              <span className="text-red-600 font-medium">-$420</span>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  },
  winRateByStrategy: {
    type: 'winRateByStrategy',
    defaultSize: 'small-long',
    allowedSizes: ['small-long', 'medium', 'large'],
    category: 'charts',
    description: 'Win rate distribution and success metrics by strategy',
    previewHeight: 250,
    getComponent: ({ size }) => <WinRateByStrategy size={size} />,
    getPreview: () => (
      <Card className="w-full h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Win Rate by Strategy</CardTitle>
        </CardHeader>
        <CardContent className="p-2">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span>ICT 2022</span>
              <span className="text-green-600 font-medium">72%</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span>MSNR</span>
              <span className="text-green-600 font-medium">68%</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span>Price Action</span>
              <span className="text-yellow-600 font-medium">45%</span>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  },
  goalsRiskCommandCenter: {
    type: 'goalsRiskCommandCenter',
    defaultSize: 'large',
    allowedSizes: ['medium', 'large', 'extra-large'],
    category: 'statistics',
    description: 'Combined goals tracker and risk metrics command center',
    previewHeight: 200,
    getComponent: ({ size }) => <GoalsRiskCommandCenter size={size} />,
    getPreview: () => (
      <Card className="w-full h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Command Center</CardTitle>
        </CardHeader>
        <CardContent className="p-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center justify-center">
              <div className="w-10 h-10 rounded-full border-4 border-emerald-500 border-t-transparent"></div>
            </div>
            <div className="space-y-1">
              <div className="p-1.5 bg-red-500/10 rounded text-xs">Max DD</div>
              <div className="p-1.5 bg-emerald-500/10 rounded text-xs">Streak</div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  },
  sessionAnalysis: {
    type: 'sessionAnalysis',
    defaultSize: 'small-long',
    allowedSizes: ['small', 'small-long', 'medium', 'large'],
    category: 'statistics',
    description: 'Performance breakdown by trading session',
    previewHeight: 200,
    getComponent: ({ size }) => <SessionAnalysis size={size as any} />,
    getPreview: () => (
      <Card className="w-full h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Session Analysis</CardTitle>
        </CardHeader>
        <CardContent className="p-2">
          <div className="space-y-2 text-xs">
            <div className="p-2 bg-purple-500/10 rounded"><span>Asia</span></div>
            <div className="p-2 bg-amber-500/10 rounded"><span>New York</span></div>
          </div>
        </CardContent>
      </Card>
    )
  },
}

export function getWidgetsByCategory(category: WidgetConfig['category']) {
  return Object.values(WIDGET_REGISTRY).filter(widget => widget.category === category)
}

export function isValidWidgetSize(type: WidgetType, size: WidgetSize): boolean {
  return WIDGET_REGISTRY[type].allowedSizes.includes(size)
}

export function requiresFullWidth(type: WidgetType): boolean {
  return WIDGET_REGISTRY[type].requiresFullWidth || false
}

export function isKpiRowOnly(type: WidgetType): boolean {
  return WIDGET_REGISTRY[type].kpiRowOnly || false
}

export function canPlaceWidgetInRow(type: WidgetType, row: number): boolean {
  // If widget is KPI-only, it can only be placed in row 0 (first row with 5 KPI slots)
  if (isKpiRowOnly(type)) {
    return row === 0
  }
  // Other widgets can be placed anywhere except row 0 (reserved for KPIs)
  return row > 0
}

export function getWidgetComponent(type: WidgetType, size: WidgetSize): React.ReactElement {
  return (
    <WidgetErrorBoundary widgetType={type}>
      {WIDGET_REGISTRY[type].getComponent({ size })}
    </WidgetErrorBoundary>
  )
}

export function getWidgetPreview(type: WidgetType): React.ReactElement {
  return WIDGET_REGISTRY[type].getPreview()
} 