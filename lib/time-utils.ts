import { formatInTimeZone, toZonedTime } from 'date-fns-tz';

export const DEFAULT_TIMEZONE = 'America/New_York';

export type MarketSession = 'Asia' | 'London' | 'New York' | 'Outside Session';
export type KillzoneBadge = 'London Killzone' | 'NY Killzone' | 'Lunch Time' | 'NY PM';

// Sessions (for analysis) - Priority: NY > London > Asia
export const MARKET_SESSIONS = [
  { name: 'New York', start: 8, end: 17 },
  { name: 'London', start: 3, end: 12 },
  { name: 'Asia', start: 19, end: 4 }, // Crosses midnight
];

// Killzones (indicators only)
export const KILLZONE_BADGES = [
  { name: 'London Killzone', start: 2, end: 5 },
  { name: 'NY Killzone', start: 7, end: 10 },
  { name: 'Lunch Time', start: 11, end: 13 },
  { name: 'NY PM', start: 13, end: 16 }
];

/**
 * Returns the analytical market session based on priority: NY > London > Asia.
 */
export function getTradingSession(date: Date | string | number): MarketSession {
  if (!date) return 'Outside Session';
  const parsedDate = new Date(date);
  if (isNaN(parsedDate.getTime())) return 'Outside Session';

  const nyDate = toZonedTime(parsedDate, DEFAULT_TIMEZONE);
  const hour = nyDate.getHours();
  const minute = nyDate.getMinutes();
  const time = hour + minute / 60;

  // New York Priority (08:00 - 17:00)
  if (time >= 8 && time < 17) return 'New York';
  
  // London Priority (03:00 - 12:00)
  if (time >= 3 && time < 12) return 'London';
  
  // Asia Priority (19:00 - 04:00) - crosses midnight
  if (time >= 19 || time < 4) return 'Asia';

  return 'Outside Session';
}

/**
 * Returns a killzone badge if the time falls into one of the designated windows.
 */
export function getKillzoneBadge(date: Date | string | number): KillzoneBadge | null {
  if (!date) return null;
  const parsedDate = new Date(date);
  if (isNaN(parsedDate.getTime())) return null;

  const nyDate = toZonedTime(parsedDate, DEFAULT_TIMEZONE);
  const hour = nyDate.getHours();
  const minute = nyDate.getMinutes();
  const time = hour + minute / 60;

  for (const kz of KILLZONE_BADGES) {
    // Basic range check (no midnight cross expected for these killzones based on these times)
    if (time >= kz.start && time < kz.end) {
      return kz.name as KillzoneBadge;
    }
  }

  return null;
}

/**
 * Helper to display time cleanly formatted according to user preferences.
 */
export function formatUserTime(date: Date | string | number, timezone: string = DEFAULT_TIMEZONE, timeFormat: '12h' | '24h' = '24h'): string {
  if (!date) return 'N/A';
  const parsedDate = new Date(date);
  if (isNaN(parsedDate.getTime())) return 'N/A';

  const formatStr = timeFormat === '12h' ? 'MMM d, yyyy h:mm a' : 'MMM d, yyyy HH:mm';
  return formatInTimeZone(parsedDate, timezone, formatStr);
}

/**
 * Helper to display time with a custom format string.
 */
export function formatTimeInZone(date: Date | string | number, formatStr: string, timezone: string = DEFAULT_TIMEZONE): string {
  if (!date) return 'N/A';
  const parsedDate = new Date(date);
  if (isNaN(parsedDate.getTime())) return 'N/A';
  return formatInTimeZone(parsedDate, timezone, formatStr);
}
