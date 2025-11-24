'use client'

import { useEffect } from 'react'
import { useDeploymentCheck } from '@/hooks/use-deployment-check'
import { setupGlobalServerActionErrorHandler } from '@/lib/utils/server-action-error-handler'

interface DeploymentMonitorProps {
  /**
   * How often to check for new deployments (in milliseconds)
   * @default 300000 (5 minutes)
   */
  checkInterval?: number
  
  /**
   * Whether to automatically refresh when a new deployment is detected
   * @default false (shows a toast with refresh button instead)
   */
  autoRefresh?: boolean
  
  /**
   * Delay before auto-refresh (in milliseconds)
   * @default 3000 (3 seconds)
   */
  autoRefreshDelay?: number

  /**
   * Enable deployment checking
   * @default true in production, false in development
   */
  enabled?: boolean
}

/**
 * Monitors for new deployments and handles Server Action errors
 * Should be placed at the root of the app (in layout.tsx)
 */
export function DeploymentMonitor({
  checkInterval = 5 * 60 * 1000, // 5 minutes
  autoRefresh = false,
  autoRefreshDelay = 3000,
  enabled = process.env.NODE_ENV === 'production',
}: DeploymentMonitorProps = {}) {
  // Set up deployment checking
  useDeploymentCheck({
    checkInterval,
    enabled,
    autoRefresh,
    autoRefreshDelay,
    onNewDeployment: () => {
      // Deployment detected
    },
  })

  // Set up global error handlers for Server Actions
  useEffect(() => {
    if (enabled) {
      setupGlobalServerActionErrorHandler()
    }
  }, [enabled])

  // This component doesn't render anything
  return null
}

