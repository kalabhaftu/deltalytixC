'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'light' | 'dark' | 'midnight-ocean' | 'system'

type ThemeContextType = {
  theme: Theme
  effectiveTheme: 'light' | 'dark' | 'midnight-ocean'
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'system',
  effectiveTheme: 'light',
  setTheme: () => {},
  toggleTheme: () => {},
})

export const useTheme = () => useContext(ThemeContext)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('system')
  const [effectiveTheme, setEffectiveTheme] = useState<'light' | 'dark' | 'midnight-ocean'>('light')
  const [mounted, setMounted] = useState(false)

  const applyTheme = (newTheme: Theme) => {
    if (typeof window === 'undefined') return
    
    const root = window.document.documentElement
    root.classList.remove('light', 'dark', 'midnight-ocean')

    let newEffectiveTheme: 'light' | 'dark' | 'midnight-ocean' = 'light'
    if (newTheme === 'system') {
      newEffectiveTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    } else {
      newEffectiveTheme = newTheme
    }

    root.classList.add(newEffectiveTheme)
    setEffectiveTheme(newEffectiveTheme)
  }

  useEffect(() => {
    setMounted(true)
    
    // Get current theme from DOM (set by the script)
    const root = document.documentElement
    const isDark = root.classList.contains('dark')
    const isMidnightOcean = root.classList.contains('midnight-ocean')
    const currentEffectiveTheme = isMidnightOcean ? 'midnight-ocean' : (isDark ? 'dark' : 'light')
    setEffectiveTheme(currentEffectiveTheme)
    
    const savedTheme = localStorage.getItem('theme') as Theme | null
    
    if (savedTheme) {
      setThemeState(savedTheme)
    }
    
    // Only apply theme if it differs from what the script set
    const scriptSetTheme = currentEffectiveTheme
    const expectedTheme = savedTheme === 'system' || !savedTheme 
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : savedTheme
    
    if (expectedTheme !== scriptSetTheme) {
      applyTheme(savedTheme || 'system')
    }
  }, [])

  useEffect(() => {
    if (mounted) {
      applyTheme(theme)
      localStorage.setItem('theme', theme)
    }
  }, [theme, mounted])

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => {
      if (theme === 'system') {
        applyTheme('system')
      }
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [theme])

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
  }

  const toggleTheme = () => {
    setThemeState(prevTheme => {
      // FIXED: Include system theme in toggle cycle
      // Cycle: Light → Dark → Midnight Ocean → System → Light
      if (prevTheme === 'light') return 'dark'
      if (prevTheme === 'dark') return 'midnight-ocean'
      if (prevTheme === 'midnight-ocean') return 'system'
      return 'light' // From system back to light
    })
  }

  const value = {
    theme,
    effectiveTheme,
    setTheme,
    toggleTheme,
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}
