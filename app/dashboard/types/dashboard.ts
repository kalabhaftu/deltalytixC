export type WidgetType =
  | 'calendarAdvanced'
  | 'calendarMini'
  | 'recentTrades'
  | 'accountBalancePnl'
  | 'tradeWinRate'
  | 'dayWinRate'
  | 'profitFactor'
  | 'avgWinLoss'
  | 'currentStreak'
  | 'goalsRiskCommandCenter'
  | 'sessionAnalysis'
  | 'netDailyPnL'
  | 'dailyCumulativePnL'
  | 'accountBalanceChart'
  | 'weekdayPnL'
  | 'tradeDurationPerformance'
  | 'performanceScore'
  | 'pnlByInstrument'
  | 'pnlByStrategy'
  | 'winRateByStrategy'
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