export interface CalendarEvent {
  id: string
  title: string
  date: string
  pnl?: number
  trades?: number
  type?: 'trade' | 'milestone' | 'event'
  color?: string
}

export interface CalendarDayData {
  pnl: number
  tradeNumber: number
  longNumber: number
  shortNumber: number
  trades: any[]
  note?: string
}

export interface CalendarData {
  [date: string]: CalendarDayData
}

export interface CalendarProps {
  data?: CalendarData
  onDateSelect?: (date: string) => void
  className?: string
}
