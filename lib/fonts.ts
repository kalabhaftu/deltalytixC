// Temporarily disable Google Fonts due to network issues
// import { Inter } from 'next/font/google'

// Use system fonts as fallback due to network issues
export const inter = {
  variable: "--font-inter",
  className: "",
}

// CSS class name that includes both Next.js font and fallback
export const fontClassName = `${inter.variable} font-sans`

// For components that need direct access to the font family
export const fontFamily = 'var(--font-inter), Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif'
