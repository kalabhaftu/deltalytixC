'use client'

/**
 * Automatic Cache Cleanup Component
 * 
 * Automatically detects and clears stale caches on app load
 * Should be placed at the root level to run once on mount
 */

import { useEffect } from 'react'
import { useAuth } from '@/context/auth-provider'
import { useAutoCacheCleanup } from '@/hooks/use-auto-cache-cleanup'

export function AutoCacheCleanup() {
  const { user } = useAuth()
  
  // Auto-cleanup stale caches
  useAutoCacheCleanup({
    userId: user?.id,
    enabled: true
  })
  
  return null // This component doesn't render anything
}

