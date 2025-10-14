'use client'

/**
 * Optimized Data Provider - Performance-focused replacement for the monolithic data-provider
 * 
 * This provider composes multiple focused providers for better performance:
 * - UserDataProvider: User authentication and profile data
 * - AccountsProvider: Account and group management
 * - TradesProvider: Trade data with pagination
 * 
 * Benefits:
 * - Smaller bundle size through code splitting
 * - Faster initial load (lazy loading of data)
 * - Better caching (focused contexts)
 * - Reduced re-renders (isolated state)
 */

import React from 'react'
import { UserDataProvider } from './user-data-provider'
import { AccountsProvider } from './accounts-provider'
import { TradesProvider } from './trades-provider'
import { AuthProvider } from './auth-provider'

export function OptimizedDataProvider({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <UserDataProvider>
        <AccountsProvider>
          <TradesProvider>
            {children}
          </TradesProvider>
        </AccountsProvider>
      </UserDataProvider>
    </AuthProvider>
  )
}

// Re-export hooks for convenience
export { useUserData } from './user-data-provider'
export { useAccounts } from './accounts-provider'
export { useTrades } from './trades-provider'
export { useAuth } from './auth-provider'


