import { toZonedTime, formatInTimeZone } from 'date-fns-tz'
import { startOfDay, endOfDay, isWithinInterval } from 'date-fns'

export const DEFAULT_TIMEZONE = 'America/New_York'

export interface TradingSession {
  name: string
  start: string // HH:mm
  end: string // HH:mm
}

export const TRADING_SESSIONS: Record<string, TradingSession> = {
  ASIA: { name: 'Asian', start: '18:00', end: '03:00' }, // 6 PM previous day to 3 AM NY
  LONDON: { name: 'London', start: '03:00', end: '11:00' }, // 3 AM to 11 AM NY
  NEW_YORK: { name: 'New York', start: '08:00', end: '17:00' }, // 8 AM to 5 PM NY
}

/**
 * Determines the trading session for a given date.
 * The date is assumed to be in UTC or already handled by the Date object.
 * It converts the date to New York time (or target timezone) to check against session definitions.
 */
export function getTradingSession(date: Date | string, targetTimezone: string = DEFAULT_TIMEZONE): string {
  const d = typeof date === 'string' ? new Date(date) : date
  
  // Convert the input date to the target timezone (NY)
  const zonedDate = toZonedTime(d, targetTimezone)
  
  // Get hours in the target timezone
  const hour = zonedDate.getHours()
  
  // Check sessions based on NY time definition
  // Asia: 18:00 - 03:00 (crosses midnight)
  if (hour >= 18 || hour < 3) return TRADING_SESSIONS.ASIA.name
  
  // London: 03:00 - 11:00
  if (hour >= 3 && hour < 8) return TRADING_SESSIONS.LONDON.name
  
  // London/NY Overlap: 08:00 - 11:00
  if (hour >= 8 && hour < 11) return 'London/NY Overlap'
  
  // New York: 08:00 - 17:00 (Overlap handled above, so this captures 11:00 onwards)
  if (hour >= 11 && hour < 17) return TRADING_SESSIONS.NEW_YORK.name
  
  // After NY close but before Asia open: 17:00 - 18:00
  if (hour >= 17 && hour < 18) return 'Post-Market'
  
  return 'Other'
}

/**
 * Formats a date in the target timezone for display.
 */
export function formatTimeInZone(date: Date | string, formatStr: string, timezone: string = DEFAULT_TIMEZONE): string {
  return formatInTimeZone(date, timezone, formatStr)
}

