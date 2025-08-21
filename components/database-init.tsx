'use client'

import { useEffect } from 'react'

// Simple component to initialize database on app start
export function DatabaseInit() {
  useEffect(() => {
    // Run database initialization on client side
    const initializeDatabase = async () => {
      try {
        // Make a request to initialize the database
        await fetch('/api/admin/init-db', {
          method: 'POST',
        })
      } catch (error) {
        console.warn('[DB Init] Failed to initialize database:', error)
      }
    }

    initializeDatabase()
  }, [])

  return null // This component doesn't render anything
}
