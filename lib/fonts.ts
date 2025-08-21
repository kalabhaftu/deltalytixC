import { Inter } from 'next/font/google'

export const inter = Inter({
  subsets: ['latin'],
  display: 'optional', // Changed from 'swap' to 'optional' for better fallback handling
  variable: '--font-inter',
  // Fallback fonts for when Google Fonts fails to load
  fallback: [
    '-apple-system',
    'BlinkMacSystemFont', 
    'Segoe UI',
    'Roboto',
    'Oxygen',
    'Ubuntu',
    'Cantarell',
    'Fira Sans',
    'Droid Sans',
    'Helvetica Neue',
    'sans-serif'
  ],
  // Preload for better performance
  preload: false, // Changed to false to reduce connection attempts
  // Adjust for better rendering
  adjustFontFallback: true,
})

// CSS class name that includes both Next.js font and fallback
export const fontClassName = `${inter.variable} font-sans`

// For components that need direct access to the font family
export const fontFamily = 'var(--font-inter), Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif'
