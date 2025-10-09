export type WidgetType = 
  | 'accountBalancePnl'
  | 'tradeWinRate'
  | 'dayWinRate'
  | 'profitFactor'
  | 'avgWinLoss'
  | 'netPnl'
  | 'currentStreak'
  | 'netDailyPnL'
  | 'dailyCumulativePnL'
  | 'accountBalanceChart'
  | 'weekdayPnL'
  | 'tradeDurationPerformance'
  | 'performanceScore'
  | 'pnlByInstrument'
  | 'pnlByStrategy'
  | 'winRateByStrategy'
  | 'longShortCard'
  | 'advancedMetricsCard'
  | 'tradePerformanceCard'
  | 'riskRewardRatioCard'
  | 'cumulativePnlCard'
  | 'winningStreakCard'
  | 'profitFactorCard'
  | 'averagePositionTimeCard'
  | 'calendarPnl'
  | 'miniCalendarWrapper'
  | 'recentTradesWidget'

export type WidgetSize = 'tiny' | 'small' | 'small-long' | 'medium' | 'large' | 'extra-large' | 'kpi'

export interface WidgetDimensions {
  columns: number
  rows: number
  minWidth?: number
  minHeight?: number
  previewHeight?: number
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
}
