'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

interface AutoRefreshProviderProps {
  children: React.ReactNode
  refreshInterval?: number
  enabled?: boolean
}

export function AutoRefreshProvider({ 
  children, 
  refreshInterval = 30000, // 30 seconds
  enabled = true 
}: AutoRefreshProviderProps) {
  const router = useRouter()
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const isActiveRef = useRef(true)

  useEffect(() => {
    if (!enabled) return

    // Handle visibility change to pause/resume when tab is not active
    const handleVisibilityChange = () => {
      isActiveRef.current = !document.hidden
      
      if (document.hidden) {
        // Clear interval when tab is hidden
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }
      } else {
        // Resume interval when tab becomes visible
        startAutoRefresh()
      }
    }

    const startAutoRefresh = () => {
      // Clear any existing interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }

      intervalRef.current = setInterval(() => {
        // Only refresh if tab is active and we're on a dashboard page
        if (isActiveRef.current && window.location.pathname.includes('/dashboard')) {
          router.refresh()
        }
      }, refreshInterval)
    }

    // Start auto-refresh
    startAutoRefresh()

    // Listen for visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [router, refreshInterval, enabled])

  return <>{children}</>
}

// Hook for manual refresh trigger
export function useManualRefresh() {
  const router = useRouter()
  
  const refresh = () => {
    router.refresh()
  }

  return { refresh }
}



