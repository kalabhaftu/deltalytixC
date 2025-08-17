'use client'

import { useEffect } from 'react'
import { applyConsoleFilter } from '@/lib/console-filter'

interface ConsoleFilterWrapperProps {
  children: React.ReactNode
}

/**
 * Client component that applies console filtering in development
 */
export function ConsoleFilterWrapper({ children }: ConsoleFilterWrapperProps) {
  useEffect(() => {
    // Apply console filtering only in development
    if (process.env.NODE_ENV === 'development') {
      applyConsoleFilter()
    }
  }, [])

  return <>{children}</>
}
