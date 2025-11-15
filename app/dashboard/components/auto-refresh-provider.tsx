'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useData } from '@/context/data-provider'

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
  const { refreshTrades } = useData()
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const isActiveRef = useRef(true)
  const lastRefreshRef = useRef<number>(Date.now())

  useEffect(() => {
    if (!enabled) return

    const handleVisibilityChange = () => {
      isActiveRef.current = !document.hidden
      
      if (document.hidden) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }
      } else {
        startAutoRefresh()
      }
    }

    const startAutoRefresh = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      
      intervalRef.current = setInterval(async () => {
        const now = Date.now()
        const timeSinceLastRefresh = now - lastRefreshRef.current
        
        if (isActiveRef.current && timeSinceLastRefresh >= refreshInterval) {
          try {
            await refreshTrades()
            lastRefreshRef.current = now
          } catch (error) {
            // Silent fail
          }
        }
      }, refreshInterval)
    }

    startAutoRefresh()
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [router, refreshInterval, enabled, refreshTrades])

  return <>{children}</>
}
