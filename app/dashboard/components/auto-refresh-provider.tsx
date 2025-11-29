'use client'

/**
 * AutoRefreshProvider - DEPRECATED
 * 
 * This component previously handled 30-second polling for data updates.
 * It has been replaced by Supabase Realtime (postgres_changes) in DataProvider.
 * 
 * How the new system works:
 * - Server monitors database for changes via Supabase Realtime
 * - When any change occurs, server pushes update to all connected clients
 * - Clients automatically refresh data when they receive the push
 * - NO polling, NO 30-second intervals, NO wasted resources
 * 
 * This file is kept for backwards compatibility but does nothing.
 * @see /lib/realtime/database-realtime.ts for the new implementation
 * @see /context/data-provider.tsx for where subscriptions are used
 */

// Empty provider - just renders children
export function AutoRefreshProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

// Stub exports for backwards compatibility
// These do nothing - realtime is handled by DataProvider now
export function useRegisterDialog(_isOpen: boolean) {
  // No-op: Realtime doesn't need to pause during dialogs
  // because it only triggers on actual database changes
}

export function useDialogTracking() {
  return {
    hasOpenDialog: false,
    registerDialog: () => {},
    unregisterDialog: () => {}
  }
}
