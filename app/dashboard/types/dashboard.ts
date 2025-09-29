export type WidgetType =
  | 'equityChart'
  | 'pnlChart'
  | 'timeOfDayChart'
  | 'timeInPositionChart'
  | 'weekdayPnlChart'
  | 'pnlBySideChart'
  | 'tickDistribution'
  | 'radarChart'
  | 'commissionsPnl'
  | 'calendarWidget'
  | 'averagePositionTime'
  | 'cumulativePnl'
  | 'longShortPerformance'
  | 'tradePerformance'
  | 'winningStreak'
  | 'profitFactor'
  | 'statisticsWidget'
  | 'tradeDistribution'
  | 'timeRangePerformance'
  | 'riskRewardRatio'
  | 'advancedMetrics'
  | 'netPnlKpi'
  | 'winRateKpi'
  | 'profitFactorKpi'
  | 'dayWinRateKpi'
  | 'avgWinLossKpi'
export type WidgetSize = 'tiny' | 'small' | 'small-long' | 'medium' | 'large' | 'extra-large' | 'kpi'

export interface LayoutItem {
  i: string
  x: number
  y: number
  w: number
  h: number
}

export interface Widget extends LayoutItem {
  type: WidgetType
  size: WidgetSize
  static?: boolean
}

export interface Layouts {
  desktop: Widget[]
  mobile: Widget[]
}

export interface LayoutState {
  layouts: Layouts
  activeLayout: 'desktop' | 'mobile'
} 