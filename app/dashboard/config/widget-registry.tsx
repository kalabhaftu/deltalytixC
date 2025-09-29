import React, { lazy, Suspense } from 'react'
import { WidgetType, WidgetSize } from '../types/dashboard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { WidgetErrorBoundary } from '@/components/error-boundary'
import { WidgetSkeleton } from '@/components/ui/widget-skeletons'

// Lazy load heavy chart components to improve compilation time
const EquityChart = lazy(() => import('../components/charts/equity-chart'))
const TickDistributionChart = lazy(() => import('../components/charts/tick-distribution'))
const PNLChart = lazy(() => import('../components/charts/pnl-bar-chart'))
const TimeOfDayTradeChart = lazy(() => import('../components/charts/pnl-time-bar-chart'))
const TimeInPositionChart = lazy(() => import('../components/charts/time-in-position'))
const TimeRangePerformanceChart = lazy(() => import('../components/charts/time-range-performance'))
const WeekdayPNLChart = lazy(() => import('../components/charts/weekday-pnl'))
const PnLBySideChart = lazy(() => import('../components/charts/pnl-by-side'))
const CommissionsPnLChart = lazy(() => import('../components/charts/commissions-pnl'))
const TradeDistributionChart = lazy(() => import('../components/charts/trade-distribution'))
const RadarChart = lazy(() => import('../components/charts/radar-chart'))

// Keep statistics components as regular imports (they're lighter)
import AveragePositionTimeCard from '../components/statistics/average-position-time-card'
import CumulativePnlCard from '../components/statistics/cumulative-pnl-card'
import LongShortPerformanceCard from '../components/statistics/long-short-card'
import TradePerformanceCard from '../components/statistics/trade-performance-card'
import WinningStreakCard from '../components/statistics/winning-streak-card'
import RiskRewardRatioCard from '../components/statistics/risk-reward-ratio-card'
import ProfitFactorCard from '../components/statistics/profit-factor-card'
import StatisticsWidget from '../components/statistics/statistics-widget'
import AdvancedMetricsCard from '../components/statistics/advanced-metrics-card'

// KPI components
import NetPnlKpi from '../components/kpi/net-pnl-kpi'
import WinRateKpi from '../components/kpi/win-rate-kpi'
import ProfitFactorKpi from '../components/kpi/profit-factor-kpi'
import DayWinRateKpi from '../components/kpi/day-win-rate-kpi'
import AvgWinLossKpi from '../components/kpi/avg-win-loss-kpi'

// Calendar component
import CalendarPnl from '../components/calendar/calendar-widget'

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
              {day}
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
    getComponent: ({ size }) => (
      <Suspense fallback={<WidgetSkeleton type="weekdayPnlChart" size="medium" />}>
        <WeekdayPNLChart size={size} />
      </Suspense>
    ),
    getPreview: () => (
      <Suspense fallback={<WidgetSkeleton type="weekdayPnlChart" size="medium" />}>
        <WeekdayPNLChart size="small" />
      </Suspense>
    )
  },
  pnlChart: {
    type: 'pnlChart',
    defaultSize: 'medium',
    allowedSizes: ['small', 'small-long', 'medium', 'large'],
    category: 'charts',
    previewHeight: 300,
    getComponent: ({ size }) => (
      <Suspense fallback={<WidgetSkeleton type="pnlChart" size="medium" />}>
        <PNLChart size={size} />
      </Suspense>
    ),
    getPreview: () => (
      <Suspense fallback={<WidgetSkeleton type="pnlChart" size="medium" />}>
        <PNLChart size="small" />
      </Suspense>
    )
  },
  timeOfDayChart: {
    type: 'timeOfDayChart',
    defaultSize: 'medium',
    allowedSizes: ['small', 'small-long', 'medium', 'large'],
    category: 'charts',
    previewHeight: 300,
    getComponent: ({ size }) => (
      <Suspense fallback={<WidgetSkeleton type="timeOfDayChart" size="medium" />}>
        <TimeOfDayTradeChart size={size} />
      </Suspense>
    ),
    getPreview: () => (
      <Suspense fallback={<WidgetSkeleton type="timeOfDayChart" size="medium" />}>
        <TimeOfDayTradeChart size="small" />
      </Suspense>
    )
  },
  timeInPositionChart: {
    type: 'timeInPositionChart',
    defaultSize: 'medium',
    allowedSizes: ['small', 'small-long', 'medium', 'large'],
    category: 'charts',
    previewHeight: 300,
    getComponent: ({ size }) => (
      <Suspense fallback={<WidgetSkeleton type="timeInPositionChart" size="medium" />}>
        <TimeInPositionChart size={size} />
      </Suspense>
    ),
    getPreview: () => (
      <Suspense fallback={<WidgetSkeleton type="timeInPositionChart" size="medium" />}>
        <TimeInPositionChart size="small" />
      </Suspense>
    )
  },
  equityChart: {
    type: 'equityChart',
    defaultSize: 'medium',
    allowedSizes: ['small', 'small-long', 'medium', 'large'],
    category: 'charts',
    previewHeight: 300,
    getComponent: ({ size }) => (
      <Suspense fallback={<WidgetSkeleton type="equityChart" size="medium" />}>
        <EquityChart size={size} />
      </Suspense>
    ),
    getPreview: () => (
      <Suspense fallback={<WidgetSkeleton type="equityChart" size="medium" />}>
        <EquityChart size="small" />
      </Suspense>
    )
  },
  pnlBySideChart: {
    type: 'pnlBySideChart',
    defaultSize: 'medium',
    allowedSizes: ['small', 'small-long', 'medium', 'large'],
    category: 'charts',
    previewHeight: 300,
    getComponent: ({ size }) => (
      <Suspense fallback={<WidgetSkeleton type="pnlBySideChart" size="medium" />}>
        <PnLBySideChart size={size} />
      </Suspense>
    ),
    getPreview: () => (
      <Suspense fallback={<WidgetSkeleton type="pnlBySideChart" size="medium" />}>
        <PnLBySideChart size="small" />
      </Suspense>
    )
  },
  tickDistribution: {
    type: 'tickDistribution',
    defaultSize: 'medium',
    allowedSizes: ['small', 'small-long', 'medium', 'large'],
    category: 'charts',
    previewHeight: 300,
    getComponent: ({ size }) => (
      <Suspense fallback={<WidgetSkeleton type="tickDistribution" size="medium" />}>
        <TickDistributionChart size={size} />
      </Suspense>
    ),
    getPreview: () => (
      <Suspense fallback={<WidgetSkeleton type="tickDistribution" size="medium" />}>
        <TickDistributionChart size="small" />
      </Suspense>
    )
  },
  radarChart: {
    type: 'radarChart',
    defaultSize: 'medium',
    allowedSizes: ['small', 'small-long', 'medium', 'large'],
    category: 'charts',
    previewHeight: 300,
    getComponent: ({ size }) => (
      <Suspense fallback={<WidgetSkeleton type="radarChart" size="medium" />}>
        <RadarChart size={size} />
      </Suspense>
    ),
    getPreview: () => (
      <Suspense fallback={<WidgetSkeleton type="radarChart" size="medium" />}>
        <RadarChart size="small" />
      </Suspense>
    )
  },
  commissionsPnl: {
    type: 'commissionsPnl',
    defaultSize: 'medium',
    allowedSizes: ['small', 'small-long', 'medium', 'large'],
    category: 'charts',
    previewHeight: 300,
    getComponent: ({ size }) => (
      <Suspense fallback={<WidgetSkeleton type="commissionsPnl" size="medium" />}>
        <CommissionsPnLChart size={size} />
      </Suspense>
    ),
    getPreview: () => (
      <Suspense fallback={<WidgetSkeleton type="commissionsPnl" size="medium" />}>
        <CommissionsPnLChart size="small" />
      </Suspense>
    )
  },
  tradeDistribution: {
    type: 'tradeDistribution',
    defaultSize: 'medium',
    allowedSizes: ['small', 'small-long', 'medium', 'large'],
    category: 'charts',
    previewHeight: 300,
    getComponent: ({ size }) => (
      <Suspense fallback={<WidgetSkeleton type="tradeDistribution" size="medium" />}>
        <TradeDistributionChart size={size} />
      </Suspense>
    ),
    getPreview: () => (
      <Suspense fallback={<WidgetSkeleton type="tradeDistribution" size="medium" />}>
        <TradeDistributionChart size="small" />
      </Suspense>
    )
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
    getComponent: ({ size }) => (
      <Suspense fallback={<WidgetSkeleton type="timeRangePerformance" size="medium" />}>
        <TimeRangePerformanceChart size={size} />
      </Suspense>
    ),
    getPreview: () => (
      <Suspense fallback={<WidgetSkeleton type="timeRangePerformance" size="medium" />}>
        <TimeRangePerformanceChart size="small" />
      </Suspense>
    )
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
  advancedMetrics: {
    type: 'advancedMetrics',
    defaultSize: 'tiny',
    allowedSizes: ['tiny'],
    category: 'statistics',
    previewHeight: 100,
    getComponent: ({ size }) => <AdvancedMetricsCard size={size} />,
    getPreview: () => <AdvancedMetricsCard size="tiny" />
  },
  netPnlKpi: {
    type: 'netPnlKpi',
    defaultSize: 'kpi',
    allowedSizes: ['kpi'],
    category: 'statistics',
    previewHeight: 120,
    getComponent: ({ size }) => <NetPnlKpi size={size} />,
    getPreview: () => <NetPnlKpi size="kpi" />
  },
  winRateKpi: {
    type: 'winRateKpi',
    defaultSize: 'kpi',
    allowedSizes: ['kpi'],
    category: 'statistics',
    previewHeight: 120,
    getComponent: ({ size }) => <WinRateKpi size={size} />,
    getPreview: () => <WinRateKpi size="kpi" />
  },
  profitFactorKpi: {
    type: 'profitFactorKpi',
    defaultSize: 'kpi',
    allowedSizes: ['kpi'],
    category: 'statistics',
    previewHeight: 120,
    getComponent: ({ size }) => <ProfitFactorKpi size={size} />,
    getPreview: () => <ProfitFactorKpi size="kpi" />
  },
  dayWinRateKpi: {
    type: 'dayWinRateKpi',
    defaultSize: 'kpi',
    allowedSizes: ['kpi'],
    category: 'statistics',
    previewHeight: 120,
    getComponent: ({ size }) => <DayWinRateKpi size={size} />,
    getPreview: () => <DayWinRateKpi size="kpi" />
  },
  avgWinLossKpi: {
    type: 'avgWinLossKpi',
    defaultSize: 'kpi',
    allowedSizes: ['kpi'],
    category: 'statistics',
    previewHeight: 120,
    getComponent: ({ size }) => <AvgWinLossKpi size={size} />,
    getPreview: () => <AvgWinLossKpi size="kpi" />
  },
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