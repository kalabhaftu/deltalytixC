// Centralized calendar styling constants
// Softer, consistent "today" highlight across all devices

export const TODAY_STYLES = {
  // Soft, muted highlight that works in both light and dark mode
  cell: "border-slate-300/50 bg-slate-100/40 dark:bg-slate-800/30 ring-1 ring-slate-300/40 dark:ring-slate-700/40",
  text: "text-slate-700 dark:text-slate-200 font-semibold",
} as const

export const WEEKDAYS_FULL = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const
export const WEEKDAYS_WEEKDAYS_ONLY = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] as const

