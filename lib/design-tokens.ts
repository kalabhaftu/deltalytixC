/**
 * Design Tokens - TradeZella-Inspired Color System
 * 
 * This file defines the core design tokens for the application.
 * Colors are extracted from TradeZella's professional UI/UX design.
 * 
 * Usage: Import tokens and use with CSS-in-JS or Tailwind config
 */

export const colors = {
  // Dark Theme
  dark: {
    background: {
      primary: '#0B0E1D',      // Main background (deep navy)
      secondary: '#1A1F3A',    // Card backgrounds
      tertiary: '#252B47',     // Hover states
    },
    border: {
      default: 'rgba(255, 255, 255, 0.1)',  // Subtle borders
      hover: 'rgba(255, 255, 255, 0.2)',
      focus: 'rgba(139, 92, 246, 0.5)',     // Purple focus ring
    },
    text: {
      primary: '#FFFFFF',      // Main text
      secondary: '#9CA3AF',    // Muted text
      tertiary: '#6B7280',     // Disabled text
    },
    status: {
      profit: '#10B981',       // Green for profits
      loss: '#EF4444',         // Red for losses
      neutral: '#6B7280',      // Gray for break-even
    },
    accent: {
      purple: '#8B5CF6',       // Primary accent (streaks, badges)
      blue: '#3B82F6',         // Secondary accent
      teal: '#14B8A6',         // Tertiary accent
    },
  },

  // Light Theme
  light: {
    background: {
      primary: '#F9FAFB',      // Main background (off-white)
      secondary: '#FFFFFF',    // Card backgrounds
      tertiary: '#F3F4F6',     // Hover states
    },
    border: {
      default: '#E5E7EB',      // Default borders
      hover: '#D1D5DB',
      focus: 'rgba(139, 92, 246, 0.5)',
    },
    text: {
      primary: '#111827',      // Main text (near black)
      secondary: '#6B7280',    // Muted text
      tertiary: '#9CA3AF',     // Disabled text
    },
    status: {
      profit: '#059669',       // Darker green for light mode
      loss: '#DC2626',         // Darker red for light mode
      neutral: '#6B7280',
    },
    accent: {
      purple: '#7C3AED',       // Slightly darker purple
      blue: '#2563EB',
      teal: '#0D9488',
    },
  },
} as const

export const spacing = {
  widgetGap: '24px',        // Gap between widgets (TradeZella standard)
  sectionGap: '48px',       // Gap between sections
  containerPadding: '32px', // Container padding
  cardPadding: '24px',      // Card internal padding
} as const

export const borderRadius = {
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '24px',
} as const

export const shadows = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
} as const

export const typography = {
  fontFamily: {
    sans: 'var(--font-sans)',
    mono: 'var(--font-mono)',
  },
  fontSize: {
    xs: '0.75rem',     // 12px
    sm: '0.875rem',    // 14px
    base: '1rem',      // 16px
    lg: '1.125rem',    // 18px
    xl: '1.25rem',     // 20px
    '2xl': '1.5rem',   // 24px
    '3xl': '1.875rem', // 30px
  },
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
} as const

// Chart-specific colors (Recharts compatible)
export const chartColors = {
  profit: '#10B981',
  loss: '#EF4444',
  gradients: {
    profit: {
      start: 'rgba(16, 185, 129, 0.3)',
      end: 'rgba(16, 185, 129, 0.01)',
    },
    loss: {
      start: 'rgba(239, 68, 68, 0.3)',
      end: 'rgba(239, 68, 68, 0.01)',
    },
  },
  line: {
    grid: 'rgba(156, 163, 175, 0.1)',
    axis: 'rgba(156, 163, 175, 0.3)',
  },
} as const

// Zella Score gradient (for score bar)
export const zellaScoreGradient = {
  stops: [
    { offset: '0%', color: '#EF4444' },    // Red (low score)
    { offset: '50%', color: '#F59E0B' },   // Yellow (medium)
    { offset: '100%', color: '#10B981' },  // Green (high score)
  ],
} as const

export type ThemeMode = 'dark' | 'light'

/**
 * Get color value based on theme mode
 */
export function getColor(
  path: string,
  mode: ThemeMode = 'dark'
): string {
  const parts = path.split('.')
  let value: any = colors[mode]
  
  for (const part of parts) {
    value = value?.[part]
  }
  
  return value as string
}
