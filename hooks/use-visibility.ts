'use client'

import { useState, useEffect, useCallback } from 'react'

/**
 * Hook to track document visibility state
 * Returns true when tab is visible, false when hidden
 */
export function useVisibility(): boolean {
  const [isVisible, setIsVisible] = useState(() => {
    if (typeof document === 'undefined') return true
    return document.visibilityState === 'visible'
  })

  useEffect(() => {
    if (typeof document === 'undefined') return

    const handleVisibilityChange = () => {
      setIsVisible(document.visibilityState === 'visible')
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  return isVisible
}

/**
 * Hook for visibility-aware polling
 * Automatically pauses when tab is hidden, resumes when visible
 * 
 * @param callback - Function to call on each poll interval
 * @param interval - Polling interval in milliseconds
 * @param enabled - Whether polling is enabled
 * @returns Object with polling state and controls
 */
export function useVisibilityAwarePolling(
  callback: () => void | Promise<void>,
  interval: number,
  enabled: boolean = true
): {
  isPolling: boolean
  isVisible: boolean
  forceRefresh: () => void
} {
  const [isPolling, setIsPolling] = useState(false)
  const isVisible = useVisibility()

  const forceRefresh = useCallback(() => {
    callback()
  }, [callback])

  useEffect(() => {
    if (!enabled) {
      setIsPolling(false)
      return
    }

    // Only poll when visible
    if (!isVisible) {
      setIsPolling(false)
      return
    }

    // Start polling
    setIsPolling(true)
    
    // Initial call
    callback()

    const intervalId = setInterval(callback, interval)

    return () => {
      clearInterval(intervalId)
      setIsPolling(false)
    }
  }, [callback, interval, enabled, isVisible])

  return {
    isPolling,
    isVisible,
    forceRefresh
  }
}

/**
 * Hook that returns a function debounced to only execute when tab becomes visible
 * Useful for triggering refreshes after a user returns to the tab
 */
export function useRefreshOnVisible(
  callback: () => void | Promise<void>,
  minDelay: number = 5000 // Minimum time tab must be hidden before refresh
): void {
  const isVisible = useVisibility()

  useEffect(() => {
    let hiddenTime: number | null = null

    if (!isVisible) {
      hiddenTime = Date.now()
    } else if (hiddenTime !== null) {
      const elapsed = Date.now() - hiddenTime
      if (elapsed >= minDelay) {
        callback()
      }
      hiddenTime = null
    }
  }, [isVisible, callback, minDelay])
}

export default useVisibility

