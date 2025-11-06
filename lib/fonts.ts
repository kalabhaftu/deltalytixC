// Temporarily disabled Google Fonts due to network connectivity issues
// import { Inter } from "next/font/google";

// PERFORMANCE FIX: Using system fonts to avoid Google Fonts network dependency
// export const inter = Inter({
//   subsets: ["latin"],
//   variable: "--font-inter",
//   display: 'optional', // Changed from 'swap' to 'optional' - app works without font
//   fallback: ['system-ui', 'sans-serif'], // Simplified fallback
// })

// Using system font as primary font
export const inter = {
  variable: "--font-inter",
  className: "font-sans",
  style: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif'
  }
}

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
