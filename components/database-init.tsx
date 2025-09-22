'use client'

import { useEffect, useRef } from 'react'

// Optimized database initialization - only run in development and skip unnecessary calls
export function DatabaseInit() {
  const initialized = useRef(false)

  useEffect(() => {
    // Prevent multiple initializations
    if (initialized.current || process.env.NODE_ENV !== 'development') return
    initialized.current = true

    // Simplified database check - only test connection if needed
    const initializeDatabase = async () => {
      try {
        // Only initialize if we actually need to test the connection
        // In production, let the first API call handle initialization
        if (process.env.NODE_ENV === 'production') return

        // Quick connection test with very short timeout
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 2000) // 2 second timeout

        const response = await fetch('/api/admin/init-db', {
          method: 'POST',
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          console.warn('[DB Init] Database initialization returned error status')
        }
      } catch (error) {
        if (error instanceof Error && error.name !== 'AbortError') {
          console.warn('[DB Init] Database connection test failed:', error.message)
        }
        // Don't retry - let the app handle database connections naturally
      }
    }

    // Delay initialization to not block initial page load
    const timer = setTimeout(initializeDatabase, 5000) // 5 second delay

    return () => {
      clearTimeout(timer)
    }
  }, [])

  return null // This component doesn't render anything
}
