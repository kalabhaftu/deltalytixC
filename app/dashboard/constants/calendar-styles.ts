// Centralized calendar styling constants
// Clean, minimal design with consistent styling

// Today highlight styles - subtle ring
export const TODAY_STYLES = {
  cell: "ring-2 ring-primary/50 bg-primary/5",
  text: "text-primary font-bold",
} as const

// Day cell base styles - cleaner, less gradient
export const DAY_CELL_STYLES = {
  base: "relative overflow-hidden rounded-lg border transition-all duration-150 cursor-pointer hover:shadow-md hover:border-border",
  profit: "bg-long/10 border-long/30",
  loss: "bg-short/10 border-short/30",
  empty: "bg-card/30 border-border/40 hover:bg-muted/20",
  notCurrentMonth: "opacity-40",
} as const

// Weekly summary cell styles - minimal
export const WEEKLY_CELL_STYLES = {
  base: "rounded-lg border transition-all duration-150 cursor-pointer hover:shadow-sm",
  profit: "bg-long/10 border-long/20",
  loss: "bg-short/10 border-short/20",
  flat: "bg-muted/10 border-dashed border-border/40",
} as const

// Text color utilities
export const PNL_TEXT_STYLES = {
  profit: "text-long",
  loss: "text-short",
  neutral: "text-muted-foreground",
} as const

// Stat card styles for modals - wider, cleaner
export const STAT_CARD_STYLES = {
  base: "relative rounded-lg border bg-card p-4 transition-all duration-150 hover:shadow-sm",
  iconWrapper: "flex h-9 w-9 items-center justify-center rounded-md bg-muted mb-2",
  label: "text-xs font-medium text-muted-foreground mb-0.5",
  value: "text-xl font-bold tracking-tight",
  subValue: "text-xs text-muted-foreground mt-0.5",
} as const

// Modal header styles - cleaner
export const MODAL_STYLES = {
  header: "flex items-center justify-between p-5 border-b bg-card",
  title: "text-lg font-bold tracking-tight",
  subtitle: "text-sm text-muted-foreground",
  tabs: "bg-muted/50 p-1 rounded-lg",
  tabTrigger: "data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md px-4 py-2 text-sm font-medium transition-all",
} as const

// Chart styling - cleaner
export const CHART_STYLES = {
  gradient: {
    profit: { start: "hsl(var(--chart-profit))", end: "hsl(var(--chart-profit) / 0)" },
    loss: { start: "hsl(var(--chart-loss))", end: "hsl(var(--chart-loss) / 0)" },
    primary: { start: "hsl(var(--primary))", end: "hsl(var(--primary) / 0)" },
  },
  tooltip: "rounded-lg border bg-popover p-3 shadow-lg",
  axis: "text-xs fill-muted-foreground",
} as const

// Metric pill styles (for header totals) - simpler
export const METRIC_PILL_STYLES = {
  base: "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-sm font-semibold",
  profit: "bg-long/15 text-long",
  loss: "bg-short/15 text-short",
} as const

// Animation classes - subtle
export const ANIMATION_CLASSES = {
  fadeIn: "animate-in fade-in duration-200",
  slideUp: "animate-in slide-in-from-bottom-2 duration-200",
  scaleIn: "animate-in zoom-in-95 duration-150",
} as const

// Weekday headers
export const WEEKDAYS_FULL = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const
export const WEEKDAYS_WEEKDAYS_ONLY = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] as const
export const WEEKDAYS_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const

// View modes
export type CalendarViewMode = 'daily' | 'weekly'
