import { Inter } from "next/font/google";

// Next.js 13+ font configuration with optimized loading and better fallbacks
export const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: 'swap',
  preload: true, // Enable preload for better performance
  fallback: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', 'sans-serif'],
  adjustFontFallback: true, // Enable automatic fallback adjustments
})

// System font fallback for when Google Fonts is completely unavailable
export const systemFont = {
  variable: '--font-system',
  className: 'font-sans',
  style: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif'
  }
}

// CSS class name that includes both Next.js font and fallback
export const fontClassName = `${inter.variable} font-sans`

// For components that need direct access to the font family
export const fontFamily = 'var(--font-inter), Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif'
