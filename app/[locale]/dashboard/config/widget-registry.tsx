import React, { Suspense } from 'react'
import dynamic from 'next/dynamic'
import { WidgetType, WidgetSize } from '../types/dashboard'

// Dynamic imports for better code splitting and performance
const EquityChart = dynamic(() => import('../components/charts/equity-chart'), {
  loading: () => <div className="h-64 flex items-center justify-center">Loading chart...</div>
})
const TickDistributionChart = dynamic(() => import('../components/charts/tick-distribution'), {
  loading: () => <div className="h-64 flex items-center justify-center">Loading chart...</div>
})
const PNLChart = dynamic(() => import('../components/charts/pnl-bar-chart'), {
  loading: () => <div className="h-64 flex items-center justify-center">Loading chart...</div>
})
const TimeOfDayTradeChart = dynamic(() => import('../components/charts/pnl-time-bar-chart'), {
  loading: () => <div className="h-64 flex items-center justify-center">Loading chart...</div>
})
const TimeInPositionChart = dynamic(() => import('../components/charts/time-in-position'), {
  loading: () => <div className="h-64 flex items-center justify-center">Loading chart...</div>
})
const TimeRangePerformanceChart = dynamic(() => import('../components/charts/time-range-performance'), {
  loading: () => <div className="h-64 flex items-center justify-center">Loading chart...</div>
})
const WeekdayPNLChart = dynamic(() => import('../components/charts/weekday-pnl'), {
  loading: () => <div className="h-64 flex items-center justify-center">Loading chart...</div>
})
const PnLBySideChart = dynamic(() => import('../components/charts/pnl-by-side'), {
  loading: () => <div className="h-64 flex items-center justify-center">Loading chart...</div>
})
const CommissionsPnLChart = dynamic(() => import('../components/charts/commissions-pnl'), {
  loading: () => <div className="h-64 flex items-center justify-center">Loading chart...</div>
})
const TradeDistributionChart = dynamic(() => import('../components/charts/trade-distribution'), {
  loading: () => <div className="h-64 flex items-center justify-center">Loading chart...</div>
})

// Statistics widgets with dynamic loading
const AveragePositionTimeCard = dynamic(() => import('../components/statistics/average-position-time-card'), {
  loading: () => <div className="h-32 flex items-center justify-center">Loading...</div>
})
const CumulativePnlCard = dynamic(() => import('../components/statistics/cumulative-pnl-card'), {
  loading: () => <div className="h-32 flex items-center justify-center">Loading...</div>
})
const LongShortPerformanceCard = dynamic(() => import('../components/statistics/long-short-card'), {
  loading: () => <div className="h-32 flex items-center justify-center">Loading...</div>
})
const TradePerformanceCard = dynamic(() => import('../components/statistics/trade-performance-card'), {
  loading: () => <div className="h-32 flex items-center justify-center">Loading...</div>
})
const WinningStreakCard = dynamic(() => import('../components/statistics/winning-streak-card'), {
  loading: () => <div className="h-32 flex items-center justify-center">Loading...</div>
})
const RiskRewardRatioCard = dynamic(() => import('../components/statistics/risk-reward-ratio-card'), {
  loading: () => <div className="h-32 flex items-center justify-center">Loading...</div>
})
const CalendarPnl = dynamic(() => import('../components/calendar/calendar-widget'), {
  loading: () => <div className="h-64 flex items-center justify-center">Loading calendar...</div>
})
const StatisticsWidget = dynamic(() => import('../components/statistics/statistics-widget'), {
  loading: () => <div className="h-32 flex items-center justify-center">Loading...</div>
})
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
const ProfitFactorCard = dynamic(() => import('../components/statistics/profit-factor-card'), {
  loading: () => <div className="h-32 flex items-center justify-center">Loading...</div>
})
import { LineChart, Line, XAxis, YAxis } from 'recharts'
import { useI18n } from '@/locales/client'
import { WidgetErrorBoundary } from '@/components/error-boundary'
import { OptimizedChartContainer } from '@/components/ui/optimized-chart'
// import MarketChart from '../components/market/market-chart'

export interface WidgetConfig {
  type: WidgetType
  defaultSize: WidgetSize
  allowedSizes: WidgetSize[]
  category: 'charts' | 'statistics' | 'tables' | 'other'
  requiresFullWidth?: boolean
  minWidth?: number
  minHeight?: number
  previewHeight?: number
  getComponent: (props: { size: WidgetSize }) => React.ReactElement
  getPreview: () => React.ReactElement
}



function CreateCalendarPreview() {
  const t = useI18n()
  const weekdays = [
    'calendar.weekdays.sun',
    'calendar.weekdays.mon',
    'calendar.weekdays.tue',
    'calendar.weekdays.wed',
    'calendar.weekdays.thu',
    'calendar.weekdays.fri',
    'calendar.weekdays.sat'
  ] as const

  return (
    <Card className="h-[500px] flex flex-col">
      <CardHeader className="pb-3 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="text-sm font-medium">Calendar</CardTitle>
          </div>
          <div className="flex items-center gap-1.5">
            <Button 
              variant="outline" 
              size="icon" 
              className="h-7 w-7 sm:h-8 sm:w-8"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              size="icon" 
              className="h-7 w-7 sm:h-8 sm:w-8"
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-4">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekdays.map((day) => (
            <div key={day} className="text-center text-xs font-medium text-muted-foreground p-1">
              {t(day)}
            </div>
          ))}
        </div>
        
        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1 h-[calc(100%-40px)]">
          {/* Calendar days - just empty boxes showing the structure */}
          {Array.from({ length: 35 }, (_, i) => (
            <div 
              key={i} 
              className="flex flex-col items-center justify-center p-1 rounded border border-border hover:bg-accent transition-colors cursor-pointer"
            >
              <div className="h-4 w-full bg-muted-foreground/10 rounded mb-0.5" />
              <div className="h-2 w-3/4 bg-muted-foreground/5 rounded" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}


export const WIDGET_REGISTRY: Record<WidgetType, WidgetConfig> = {
  weekdayPnlChart: {
    type: 'weekdayPnlChart',
    defaultSize: 'medium',
    allowedSizes: ['small', 'small-long', 'medium', 'large'],
    category: 'charts',
    previewHeight: 300,
    getComponent: ({ size }) => <WeekdayPNLChart size={size} />,
    getPreview: () => <WeekdayPNLChart size="small" />
  },
  pnlChart: {
    type: 'pnlChart',
    defaultSize: 'medium',
    allowedSizes: ['small', 'small-long', 'medium', 'large'],
    category: 'charts',
    previewHeight: 300,
    getComponent: ({ size }) => <PNLChart size={size} />,
    getPreview: () => <PNLChart size="small" />
  },
  timeOfDayChart: {
    type: 'timeOfDayChart',
    defaultSize: 'medium',
    allowedSizes: ['small', 'small-long', 'medium', 'large'],
    category: 'charts',
    previewHeight: 300,
    getComponent: ({ size }) => <TimeOfDayTradeChart size={size} />,
    getPreview: () => <TimeOfDayTradeChart size="small" />
  },
  timeInPositionChart: {
    type: 'timeInPositionChart',
    defaultSize: 'medium',
    allowedSizes: ['small', 'small-long', 'medium', 'large'],
    category: 'charts',
    previewHeight: 300,
    getComponent: ({ size }) => <TimeInPositionChart size={size} />,
    getPreview: () => <TimeInPositionChart size="small" />
  },
  equityChart: {
    type: 'equityChart',
    defaultSize: 'medium',
    allowedSizes: ['small', 'small-long', 'medium', 'large'],
    category: 'charts',
    previewHeight: 300,
    getComponent: ({ size }) => <EquityChart size={size} />,
    getPreview: () => <EquityChart size="small" />
  },
  pnlBySideChart: {
    type: 'pnlBySideChart',
    defaultSize: 'medium',
    allowedSizes: ['small', 'small-long', 'medium', 'large'],
    category: 'charts',
    previewHeight: 300,
    getComponent: ({ size }) => <PnLBySideChart size={size} />,
    getPreview: () => <PnLBySideChart size="small" />
  },
  tickDistribution: {
    type: 'tickDistribution',
    defaultSize: 'medium',
    allowedSizes: ['small', 'small-long', 'medium', 'large'],
    category: 'charts',
    previewHeight: 300,
    getComponent: ({ size }) => <TickDistributionChart size={size} />,
    getPreview: () => <TickDistributionChart size="small" />
  },
  commissionsPnl: {
    type: 'commissionsPnl',
    defaultSize: 'medium',
    allowedSizes: ['small', 'small-long', 'medium', 'large'],
    category: 'charts',
    previewHeight: 300,
    getComponent: ({ size }) => <CommissionsPnLChart size={size} />,
    getPreview: () => <CommissionsPnLChart size="small" />
  },
  tradeDistribution: {
    type: 'tradeDistribution',
    defaultSize: 'medium',
    allowedSizes: ['small', 'small-long', 'medium', 'large'],
    category: 'charts',
    previewHeight: 300,
    getComponent: ({ size }) => <TradeDistributionChart size={size} />,
    getPreview: () => <TradeDistributionChart size="small" />
  },
  averagePositionTime: {
    type: 'averagePositionTime',
    defaultSize: 'tiny',
    allowedSizes: ['tiny'],
    category: 'statistics',
    previewHeight: 100,
    getComponent: ({ size }) => <AveragePositionTimeCard size={size} />,
    getPreview: () => <AveragePositionTimeCard size="tiny" />
  },
  cumulativePnl: {
    type: 'cumulativePnl',
    defaultSize: 'tiny',
    allowedSizes: ['tiny'],
    category: 'statistics',
    previewHeight: 100,
    getComponent: ({ size }) => <CumulativePnlCard size={size} />,
    getPreview: () => <CumulativePnlCard size="tiny" />
  },
  longShortPerformance: {
    type: 'longShortPerformance',
    defaultSize: 'tiny',
    allowedSizes: ['tiny'],
    category: 'statistics',
    previewHeight: 100,
    getComponent: ({ size }) => <LongShortPerformanceCard size={size} />,
    getPreview: () => <LongShortPerformanceCard size="tiny" />
  },
  tradePerformance: {
    type: 'tradePerformance',
    defaultSize: 'tiny',
    allowedSizes: ['tiny'],
    category: 'statistics',
    previewHeight: 100,
    getComponent: ({ size }) => <TradePerformanceCard size={size} />,
    getPreview: () => <TradePerformanceCard size="tiny" />
  },
  winningStreak: {
    type: 'winningStreak',
    defaultSize: 'tiny',
    allowedSizes: ['tiny'],
    category: 'statistics',
    previewHeight: 100,
    getComponent: ({ size }) => <WinningStreakCard size={size} />,
    getPreview: () => <WinningStreakCard size="tiny" />
  },
  profitFactor: {
    type: 'profitFactor',
    defaultSize: 'tiny',
    allowedSizes: ['tiny'],
    category: 'statistics',
    previewHeight: 100,
    getComponent: ({ size }) => <ProfitFactorCard size={size} />,
    getPreview: () => <ProfitFactorCard size="tiny" />
  },
  statisticsWidget: {
    type: 'statisticsWidget',
    defaultSize: 'medium',
    allowedSizes: ['medium'],
    category: 'statistics',
    previewHeight: 100,
    getComponent: ({ size }) => <StatisticsWidget size={size} />,
    getPreview: () => <StatisticsWidget size="small" />
  },
  calendarWidget: {
    type: 'calendarWidget',
    defaultSize: 'extra-large',
    allowedSizes: ['large', 'extra-large'],
    category: 'other',
    previewHeight: 500,
    getComponent: () => <CalendarPnl />,
    getPreview: () => <CreateCalendarPreview />
  },
  timeRangePerformance: {
    type: 'timeRangePerformance',
    defaultSize: 'medium',
    allowedSizes: ['small', 'small-long', 'medium', 'large'],
    category: 'charts',
    previewHeight: 300,
    getComponent: ({ size }) => <TimeRangePerformanceChart size={size} />,
    getPreview: () => <TimeRangePerformanceChart size="small" />
  },
  riskRewardRatio: {
    type: 'riskRewardRatio',
    defaultSize: 'tiny',
    allowedSizes: ['tiny'],
    category: 'statistics',
    previewHeight: 100,
    getComponent: ({ size }) => <RiskRewardRatioCard size={size} />,
    getPreview: () => <RiskRewardRatioCard size="tiny" />
  },
  // marketChart: {
  //   type: 'marketChart',
  //   defaultSize: 'large',
  //   allowedSizes: ['small', 'medium', 'large'],
  //   category: 'charts',
  //   previewHeight: 300,
  //   getComponent: ({ size }) => <MarketChart />,
  //   getPreview: () => <MarketChart />
  // },
}

export function getWidgetsByCategory(category: WidgetConfig['category']) {
  return Object.values(WIDGET_REGISTRY).filter(widget => widget.category === category)
}

export function isValidWidgetSize(type: WidgetType, size: WidgetSize): boolean {
  return WIDGET_REGISTRY[type].allowedSizes.includes(size)
}

export function getDefaultWidgetSize(type: WidgetType): WidgetSize {
  return WIDGET_REGISTRY[type].defaultSize
}

export function requiresFullWidth(type: WidgetType): boolean {
  return WIDGET_REGISTRY[type].requiresFullWidth ?? false
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