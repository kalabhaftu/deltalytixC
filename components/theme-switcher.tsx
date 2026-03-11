'use client'

import { Moon } from 'lucide-react'
import { Button } from './ui/button'

/**
 * Theme Switcher - Currently dark-only.
 * Light theme will be added later.
 * For now, this renders a static dark-mode indicator.
 */
export function ThemeSwitcher() {
  return (
    <Button variant="ghost" size="icon" disabled title="Dark theme active">
      <Moon className="h-[1.2rem] w-[1.2rem]" />
      <span className="sr-only">Dark theme</span>
    </Button>
  )
}