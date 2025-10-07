export interface CalendarEvent {
  id: string
  title: string
  date: string
  pnl?: number
  trades?: number
  type?: 'trade' | 'milestone' | 'event'
  color?: string
}

export interface CalendarData {
  events: CalendarEvent[]
  month: number
  year: number
}

export interface CalendarProps {
  data?: CalendarData
  onDateSelect?: (date: string) => void
  className?: string
}
