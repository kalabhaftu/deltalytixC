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
      // PERFORMANCE FIX: Disable automatic page refreshes that were causing
      // multi-minute load times due to complete data reloading every 30 seconds
      // TODO: Implement targeted data refresh instead of full page reload if needed
      return // Disabled for performance
    }

    // Start auto-refresh
    startAutoRefresh()

    // Listen for visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
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



