/**
 * Shared chart theming constants for Tradezella-style premium aesthetics
 * Use these across all chart components for visual consistency
 */

// Color constants using CSS variables for theme support
export const CHART_COLORS = {
    profit: "hsl(var(--chart-profit))",
    loss: "hsl(var(--chart-loss))",
    primary: "hsl(var(--chart-2))",
    secondary: "hsl(var(--chart-1))",
    muted: "hsl(var(--muted-foreground))",
    border: "hsl(var(--border))",
} as const

// Grid styling - subtle, dashed, low opacity
export const GRID_STYLE = {
    strokeDasharray: "3 3",
    stroke: "hsl(var(--border))",
    strokeOpacity: 0.15,
    vertical: false,
} as const

// Reference line styling (zero line)
export const REFERENCE_LINE_STYLE = {
    stroke: "hsl(var(--muted-foreground))",
    strokeDasharray: "3 3",
    strokeOpacity: 0.4,
} as const

// Axis styling - clean, no lines
export const AXIS_STYLE = {
    tickLine: false,
    axisLine: false,
    tick: {
        fill: "currentColor",
    },
} as const

// Tooltip styling
export const TOOLTIP_STYLE = {
    container: "bg-card/95 backdrop-blur-sm p-3 border border-border/50 rounded-lg shadow-xl",
    title: "font-semibold text-sm mb-2",
    value: "font-bold text-base",
    subtitle: "text-xs text-muted-foreground",
    positive: "text-emerald-500 dark:text-emerald-400",
    negative: "text-red-500 dark:text-red-400",
} as const

// Bar chart styling
export const BAR_STYLE = {
    radius: [4, 4, 0, 0] as [number, number, number, number],
    radiusSmall: [3, 3, 0, 0] as [number, number, number, number],
    maxBarSize: {
        small: 40,
        medium: 50,
        large: 60,
    },
} as const

// Area chart gradient stops
export const AREA_GRADIENT = {
    topOpacity: 0.6,
    bottomOpacity: 0.05,
} as const

// Responsive margins for different widget sizes
export const CHART_MARGINS = {
    small: { left: 0, right: 5, top: 5, bottom: 5 },
    "small-long": { left: 5, right: 5, top: 5, bottom: 5 },
    medium: { left: 10, right: 10, top: 10, bottom: 10 },
    large: { left: 15, right: 15, top: 10, bottom: 10 },
} as const

// Font sizes for different widget sizes
export const CHART_FONT_SIZES = {
    small: 9,
    "small-long": 10,
    medium: 11,
    large: 12,
} as const
