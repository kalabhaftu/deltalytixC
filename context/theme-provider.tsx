'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'light' | 'dark' | 'system'

type ThemeContextType = {
  theme: Theme
  effectiveTheme: 'light' | 'dark'
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

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'dark'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('dark')
  const [mounted, setMounted] = useState(false)

  const resolveEffective = (t: Theme): 'light' | 'dark' => {
    if (t === 'system') return getSystemTheme()
    return t
  }

  const applyTheme = (t: Theme) => {
    if (typeof window === 'undefined') return
    const effective = resolveEffective(t)
    const root = window.document.documentElement
    root.classList.remove('light', 'dark')
    root.classList.add(effective)
    root.style.colorScheme = effective
  }

  useEffect(() => {
    setMounted(true)

    const savedTheme = localStorage.getItem('theme') as Theme | null
    const validThemes: Theme[] = ['light', 'dark', 'system']
    const resolved = savedTheme && validThemes.includes(savedTheme) ? savedTheme : 'dark'

    setThemeState(resolved)
    applyTheme(resolved)

    // Listen for system preference changes when in system mode
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => {
      const current = localStorage.getItem('theme') as Theme | null
      if (current === 'system') applyTheme('system')
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  useEffect(() => {
    if (mounted) {
      applyTheme(theme)
      localStorage.setItem('theme', theme)
    }
  }, [theme, mounted])

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
  }

  const toggleTheme = () => {
    setThemeState(prev => (resolveEffective(prev) === 'dark' ? 'light' : 'dark'))
  }

  const value = {
    theme,
    effectiveTheme: resolveEffective(theme),
    setTheme,
    toggleTheme,
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}
