'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'dark' | 'system'

type ThemeContextType = {
  theme: Theme
  effectiveTheme: 'dark'
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  effectiveTheme: 'dark',
  setTheme: () => {},
  toggleTheme: () => {},
})

export const useTheme = () => useContext(ThemeContext)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('dark')
  const [mounted, setMounted] = useState(false)

  const applyTheme = () => {
    if (typeof window === 'undefined') return
    const root = window.document.documentElement
    root.classList.remove('light', 'midnight-ocean')
    root.classList.add('dark')
    root.style.colorScheme = 'dark'
  }

  useEffect(() => {
    setMounted(true)
    applyTheme()

    const savedTheme = localStorage.getItem('theme') as Theme | null
    if (savedTheme === 'dark' || savedTheme === 'system') {
      setThemeState(savedTheme)
    } else {
      // Migrate any old theme value to dark
      setThemeState('dark')
      localStorage.setItem('theme', 'dark')
    }
  }, [])

  useEffect(() => {
    if (mounted) {
      applyTheme()
      localStorage.setItem('theme', theme)
    }
  }, [theme, mounted])

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
  }

  const toggleTheme = () => {
    // Only dark theme for now — no-op toggle
  }

  const value = {
    theme,
    effectiveTheme: 'dark' as const,
    setTheme,
    toggleTheme,
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}
