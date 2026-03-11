'use client'

import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/context/theme-provider'
import { Button } from '@/components/ui/button'

export function ThemeSwitcher() {
  const { effectiveTheme, toggleTheme } = useTheme()

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      aria-label={effectiveTheme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
    >
      {effectiveTheme === 'dark' ? (
        <Moon className="h-4 w-4 text-muted-foreground" />
      ) : (
        <Sun className="h-4 w-4 text-muted-foreground" />
      )}
    </Button>
  )
}