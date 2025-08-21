'use client'

import { useEffect, useRef } from 'react'

// Simple component to initialize database on app start
export function DatabaseInit() {
  const initialized = useRef(false)

  useEffect(() => {
    // Prevent multiple initializations
    if (initialized.current) return
    initialized.current = true

    // Run database initialization on client side
    const initializeDatabase = async () => {
      try {
        // Make a request to initialize the database
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

        await fetch('/api/admin/init-db', {
          method: 'POST',
          signal: controller.signal,
        })

        clearTimeout(timeoutId)
      } catch (error) {
        if (error instanceof Error && error.name !== 'AbortError') {
          console.warn('[DB Init] Failed to initialize database:', error)
        }
      }
    }

    // Add a small delay to prevent immediate execution
    const timer = setTimeout(initializeDatabase, 1000)
    
    return () => {
      clearTimeout(timer)
    }
  }, [])

  return null // This component doesn't render anything
}
