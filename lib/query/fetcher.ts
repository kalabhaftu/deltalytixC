/**
 * Unified fetcher for React Query
 * Wraps the existing fetchWithError utility for consistent error handling
 */

import { fetchWithError } from '@/lib/utils/fetch-with-error'

/**
 * Default GET fetcher for React Query queryFn
 * Handles auth, timeouts, and error formatting
 */
export async function fetcher<T = unknown>(url: string): Promise<T> {
  const response = await fetchWithError(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  })
  return response as T
}

/**
 * POST fetcher for React Query queryFn
 * Used for endpoints like /api/reports/stats that accept filter bodies
 */
export async function postFetcher<T = unknown>(
  url: string,
  body: Record<string, unknown>
): Promise<T> {
  const response = await fetchWithError(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return response as T
}

/**
 * Type-safe query key factory
 * Creates structured keys that React Query uses for caching and invalidation
 */
export const queryKeys = {
  // Dashboard
  stats: (filters?: Record<string, unknown>) =>
    ['dashboard-stats', filters ?? {}] as const,

  // Trades
  trades: (filters?: Record<string, unknown>) =>
    ['trades', filters ?? {}] as const,
  trade: (id: string) => ['trade', id] as const,

  // Accounts
  accounts: () => ['accounts'] as const,
  accountStats: (filters?: Record<string, unknown>) =>
    ['account-stats', filters ?? {}] as const,

  // User
  userProfile: () => ['user-profile'] as const,

  // Tags
  tags: () => ['tags'] as const,

  // Calendar
  calendarNotes: (params?: Record<string, unknown>) =>
    ['calendar-notes', params ?? {}] as const,

  // Journal
  journal: (params?: Record<string, unknown>) =>
    ['journal', params ?? {}] as const,
  journalDaily: (date: string) => ['journal-daily', date] as const,

  // Reports
  reportStats: (filters?: Record<string, unknown>) =>
    ['report-stats', filters ?? {}] as const,

  // Goals
  goals: () => ['goals'] as const,

  // Trading models
  tradingModels: () => ['trading-models'] as const,

  // Notifications
  notifications: () => ['notifications'] as const,
} as const
