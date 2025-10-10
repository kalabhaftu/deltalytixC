'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Logo } from '@/components/logo'
import { Button } from "@/components/ui/button"
import { ArrowLeft, Home, Search, Sun, Moon, Monitor } from "lucide-react"

// English-only text constants
const text = {
  title: '404 - Page Not Found',
  heading: 'Oops! Page not found',
  description: 'The page you\'re looking for doesn\'t exist or has been moved.',
  goHome: 'Go back home',
  goBack: 'Go back',
  searchPlaceholder: 'Search for a page...',
  searchComingSoon: 'Search functionality coming soon'
}

// Removed unnecessary locale detection - English only

function getThemeFromLocalStorage(): 'light' | 'dark' | 'system' {
  if (typeof window === 'undefined') return 'system'
  
  try {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | 'system' | null
    return savedTheme || 'system'
  } catch {
    return 'system'
  }
}

function getEffectiveTheme(theme: 'light' | 'dark' | 'system'): 'light' | 'dark' {
  if (theme === 'system') {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }
    return 'light'
  }
  return theme
}

function applyThemeToDocument(effectiveTheme: 'light' | 'dark') {
  if (typeof window === 'undefined') return
  
  const root = document.documentElement
  root.classList.remove('light', 'dark')
  root.classList.add(effectiveTheme)
}

// Removed unnecessary locale detection - English only

function NotFoundContent() {
  const router = useRouter()
  const [isClient, setIsClient] = useState(false)
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system')
  const [effectiveTheme, setEffectiveTheme] = useState<'light' | 'dark'>('light')

  useEffect(() => {
    setIsClient(true)
    
    // Set page title
    document.title = text.title + ' | Deltalytix'
    
    // Apply theme from localStorage
    const savedTheme = getThemeFromLocalStorage()
    const currentEffectiveTheme = getEffectiveTheme(savedTheme)
    setTheme(savedTheme)
    setEffectiveTheme(currentEffectiveTheme)
    applyThemeToDocument(currentEffectiveTheme)
    
    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleThemeChange = () => {
      if (savedTheme === 'system') {
        const newEffectiveTheme = getEffectiveTheme('system')
        setEffectiveTheme(newEffectiveTheme)
        applyThemeToDocument(newEffectiveTheme)
      }
    }
    
    mediaQuery.addEventListener('change', handleThemeChange)
    return () => mediaQuery.removeEventListener('change', handleThemeChange)
  }, [])

  const handleGoBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back()
    } else {
      router.push('/')
    }
  }

  const handleThemeToggle = () => {
    const themeOrder: ('light' | 'dark' | 'system')[] = ['light', 'dark', 'system']
    const currentIndex = themeOrder.indexOf(theme)
    const nextTheme = themeOrder[(currentIndex + 1) % themeOrder.length]
    
    setTheme(nextTheme)
    const newEffectiveTheme = getEffectiveTheme(nextTheme)
    setEffectiveTheme(newEffectiveTheme)
    
    applyThemeToDocument(newEffectiveTheme)
    localStorage.setItem('theme', nextTheme)
  }

  const getThemeIcon = () => {
    if (theme === 'system') return <Monitor className="w-4 h-4" />
    if (effectiveTheme === 'dark') return <Moon className="w-4 h-4" />
    return <Sun className="w-4 h-4" />
  }

  // Show fallback during hydration with English text
  if (!isClient) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-4 relative">
        {/* Placeholder for theme toggle */}
        <div className="absolute top-4 right-4 w-10 h-8" />

        <Logo className="w-16 h-16 mb-8 fill-primary" />
        <h1 className="text-6xl font-bold mb-4 text-foreground">404</h1>
        <h2 className="text-2xl font-semibold text-muted-foreground mb-6 text-center">
          {text.heading}
        </h2>
        <p className="text-muted-foreground mb-8 text-center max-w-md leading-relaxed">
          {text.description}
        </p>
        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm">
          <Button asChild variant="default" className="flex-1">
            <Link href="/">
              <Home className="w-4 h-4 mr-2" />
              {text.goHome}
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-4 relative">
      {/* Theme toggle button in top right */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleThemeToggle}
        className="absolute top-4 right-4 flex items-center gap-2"
        title={`Current theme: ${theme}`}
      >
        {getThemeIcon()}
      </Button>

      <Logo className="w-16 h-16 mb-8 fill-primary" />
      
      {/* Large 404 */}
      <h1 className="text-6xl font-bold mb-4 text-foreground">404</h1>
      
      {/* Heading */}
      <h2 className="text-2xl font-semibold text-muted-foreground mb-6 text-center">
        {text.heading}
      </h2>
      
      {/* Description */}
      <p className="text-muted-foreground mb-8 text-center max-w-md leading-relaxed">
        {text.description}
      </p>
      
      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm">
        <Button asChild variant="default" className="flex-1">
          <Link href="/">
            <Home className="w-4 h-4 mr-2" />
            {text.goHome}
          </Link>
        </Button>
        
        <Button
          variant="outline"
          onClick={handleGoBack}
          className="flex-1"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {text.goBack}
        </Button>
      </div>
      
      {/* Optional search placeholder for future enhancement */}
      <div className="mt-8 w-full max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <input
            type="text"
            placeholder={text.searchPlaceholder}
            className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
            disabled
          />
        </div>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          {text.searchComingSoon}
        </p>
      </div>
    </div>
  )
}

export default function NotFound() {
  return <NotFoundContent />
}
