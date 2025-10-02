/**
 * Widget Dimensions Configuration
 * 
 * TradeZella-inspired fixed widget sizing system.
 * All widgets maintain consistent dimensions for professional layout.
 */

import { WidgetSize } from '../types/dashboard'

export interface WidgetDimensions {
  /**
   * Grid column span (out of 12 columns)
   */
  colSpan: number
  
  /**
   * Minimum width in pixels
   */
  minWidth: string
  
  /**
   * Fixed height
   */
  height: string
  
  /**
   * Aspect ratio (optional, for responsive scaling)
   */
  aspectRatio?: string
}

/**
 * Fixed widget dimensions matching TradeZella's professional layout
 * 
 * Grid System: 12 columns
 * Gap: 1rem (16px)
 * 
 * Sizes are designed to be:
 * - Wider than previous fractional system
 * - Consistent across breakpoints
 * - Professional and spacious
 */
export const WIDGET_DIMENSIONS: Record<WidgetSize, WidgetDimensions> = {
  // KPI widgets - Always in a row of 5
  'kpi': {
    colSpan: 12,  // Full width on mobile, managed by grid on desktop
    minWidth: '240px',
    height: '120px',
  },
  
  // Tiny widgets - Rarely used
  'tiny': {
    colSpan: 3,
    minWidth: '280px',
    height: '180px',
  },
  
  // Small widgets - 4 columns (1/3 width)
  'small': {
    colSpan: 4,
    minWidth: '320px',
    height: '320px',
  },
  
  // Small-long widgets - 4 columns, taller
  'small-long': {
    colSpan: 4,
    minWidth: '400px',
    height: '360px',
  },
  
  // Medium widgets - 6 columns (1/2 width)
  'medium': {
    colSpan: 6,
    minWidth: '480px',
    height: '400px',
  },
  
  // Large widgets - 8 columns (2/3 width)
  'large': {
    colSpan: 8,
    minWidth: '660px',
    height: '480px',
  },
  
  // Extra-large widgets - 12 columns (full width)
  'extra-large': {
    colSpan: 12,
    minWidth: '100%',
    height: '800px',
  },
}

/**
 * Get Tailwind grid column class for a widget size
 */
export function getGridColClass(size: WidgetSize): string {
  const span = WIDGET_DIMENSIONS[size].colSpan
  return `col-span-12 md:col-span-${span}`
}

/**
 * Get inline styles for a widget (use sparingly, prefer Tailwind)
 */
export function getWidgetStyles(size: WidgetSize): React.CSSProperties {
  const dims = WIDGET_DIMENSIONS[size]
  return {
    minWidth: dims.minWidth,
    height: dims.height,
    ...(dims.aspectRatio && { aspectRatio: dims.aspectRatio }),
  }
}

/**
 * Widget grouping configuration
 * Defines how widgets should be visually grouped
 */
export const WIDGET_GROUPS = {
  kpi: {
    name: 'Key Performance Indicators',
    bgClass: 'bg-kpi-section',
    padding: 'p-4',
    gap: 'gap-3',
    gridCols: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5',
  },
  charts: {
    name: 'Charts & Analytics',
    bgClass: 'bg-transparent',
    padding: 'px-4',
    gap: 'gap-4',
    gridCols: 'grid-cols-1 md:grid-cols-12',
  },
  tables: {
    name: 'Data Tables',
    bgClass: 'bg-transparent',
    padding: 'px-4',
    gap: 'gap-4',
    gridCols: 'grid-cols-1',
  },
} as const

/**
 * Standard card padding based on size
 */
export const CARD_PADDING: Record<WidgetSize, string> = {
  'kpi': 'p-4',
  'tiny': 'p-3',
  'small': 'p-4',
  'small-long': 'p-4',
  'medium': 'p-4',
  'large': 'p-6',
  'extra-large': 'p-6',
}

/**
 * Standard card header height (consistent across all widgets)
 */
export const CARD_HEADER_HEIGHT = '56px'

/**
 * Get responsive grid configuration for dashboard
 */
export function getDashboardGridConfig() {
  return {
    container: 'max-w-[1920px] mx-auto',
    gap: 'gap-4',
    padding: 'px-4 py-6',
    cols: 'grid-cols-12',
  }
}

