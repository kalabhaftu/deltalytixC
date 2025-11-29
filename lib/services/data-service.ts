/**
 * Unified Data Service
 * Single source of truth for all data fetching operations
 */

import { fetchWithError, FetchResult } from '@/lib/utils/fetch-with-error'
import { CacheManager, CacheKeys, CacheTags } from '@/lib/cache/cache-manager'
import { CACHE_DURATION_SHORT, CACHE_DURATION_MEDIUM, API_TIMEOUT } from '@/lib/constants'

// ===========================================
// TYPES
// ===========================================

export interface DashboardStats {
  totalAccounts: number
  totalTrades: number
  totalEquity: number
  totalPnL: number
  winRate: number
  profitFactor: number
  grossProfits: number
  grossLosses: number
  winningTrades: number
  losingTrades: number
  breakEvenTrades: number
  chartData: Array<{ date: string; pnl: number }>
  isAuthenticated: boolean
  lastUpdated: string
}

export interface Account {
  id: string
  number: string
  name: string
  propfirm: string
  broker: string | undefined
  startingBalance: number
  status: string
  accountType: 'prop-firm' | 'live'
  displayName: string
  tradeCount: number
  currentPhase?: number
  isArchived?: boolean
}

export interface PropFirmAccount {
  id: string
  accountName: string
  propFirmName: string
  accountSize: number
  evaluationType: string
  status: string
  currentPhase: any
  phases: any[]
  currentPnL?: number
  currentBalance?: number
  currentEquity?: number
}

// ===========================================
// IN-FLIGHT REQUEST DEDUPLICATION
// ===========================================

const inFlightRequests = new Map<string, Promise<any>>()

/**
 * Deduplicate requests - if a request for the same key is already in flight,
 * return that promise instead of making a new request
 */
async function deduplicatedFetch<T>(
  key: string,
  fetcher: () => Promise<FetchResult<T>>
): Promise<FetchResult<T>> {
  // Check if request is already in flight
  const existing = inFlightRequests.get(key)
  if (existing) {
    return existing
  }

  // Create new request
  const request = fetcher().finally(() => {
    inFlightRequests.delete(key)
  })

  inFlightRequests.set(key, request)
  return request
}

// ===========================================
// DATA SERVICE CLASS
// ===========================================

class DataServiceClass {
  private static instance: DataServiceClass | null = null

  private constructor() {}

  static getInstance(): DataServiceClass {
    if (!DataServiceClass.instance) {
      DataServiceClass.instance = new DataServiceClass()
    }
    return DataServiceClass.instance
  }

  // ===========================================
  // DASHBOARD STATISTICS
  // ===========================================

  /**
   * Fetch dashboard statistics
   * Uses caching and request deduplication
   */
  async getDashboardStats(options?: {
    forceRefresh?: boolean
    masterAccountId?: string
    phaseId?: string
    phaseNumber?: number
  }): Promise<FetchResult<DashboardStats>> {
    const cacheKey = CacheKeys.dashboard('current')

    // Check cache first
    if (!options?.forceRefresh) {
      const cached = CacheManager.getWithStale<DashboardStats>(cacheKey)
      if (cached.data && !cached.isStale) {
        return { data: cached.data, error: null, status: 200, ok: true }
      }
    }

    // Build query params
    const params = new URLSearchParams()
    if (options?.masterAccountId) {
      params.append('masterAccountId', options.masterAccountId)
    }
    if (options?.phaseId) {
      params.append('phaseId', options.phaseId)
    }
    if (options?.phaseNumber) {
      params.append('phaseNumber', options.phaseNumber.toString())
    }

    const url = `/api/dashboard/stats${params.toString() ? `?${params.toString()}` : ''}`

    // Fetch with deduplication
    const result = await deduplicatedFetch<{ success: boolean; data: DashboardStats }>(
      `stats:${params.toString()}`,
      () => fetchWithError(url, { timeout: API_TIMEOUT })
    )

    if (result.ok && result.data?.data) {
      // Cache the result
      CacheManager.set(cacheKey, result.data.data, {
        ttl: CACHE_DURATION_SHORT,
        tags: [CacheTags.STATISTICS, CacheTags.DASHBOARD]
      })

      return { 
        data: result.data.data, 
        error: null, 
        status: result.status, 
        ok: true 
      }
    }

    return {
      data: null,
      error: result.error,
      status: result.status,
      ok: false
    }
  }

  // ===========================================
  // ACCOUNTS
  // ===========================================

  /**
   * Fetch all accounts (unified - regular + prop firm)
   */
  async getAccounts(options?: {
    forceRefresh?: boolean
    includeArchived?: boolean
  }): Promise<FetchResult<Account[]>> {
    const cacheKey = `accounts:${options?.includeArchived ? 'all' : 'active'}`

    // Check cache first
    if (!options?.forceRefresh) {
      const cached = CacheManager.getWithStale<Account[]>(cacheKey)
      if (cached.data && !cached.isStale) {
        return { data: cached.data, error: null, status: 200, ok: true }
      }
    }

    // Use server action via API route
    const result = await deduplicatedFetch<{ accounts: Account[] }>(
      cacheKey,
      () => fetchWithError('/api/accounts', { timeout: API_TIMEOUT })
    )

    if (result.ok && result.data?.accounts) {
      CacheManager.set(cacheKey, result.data.accounts, {
        ttl: CACHE_DURATION_MEDIUM,
        tags: [CacheTags.ACCOUNTS]
      })

      return {
        data: result.data.accounts,
        error: null,
        status: result.status,
        ok: true
      }
    }

    return {
      data: null,
      error: result.error,
      status: result.status,
      ok: false
    }
  }

  // ===========================================
  // PROP FIRM ACCOUNTS
  // ===========================================

  /**
   * Fetch single prop firm account with real-time data
   */
  async getPropFirmAccount(
    accountId: string,
    options?: { forceRefresh?: boolean }
  ): Promise<FetchResult<PropFirmAccount>> {
    const cacheKey = CacheKeys.propFirmAccount(accountId)

    // Check cache first
    if (!options?.forceRefresh) {
      const cached = CacheManager.getWithStale<PropFirmAccount>(cacheKey)
      if (cached.data && !cached.isStale) {
        return { data: cached.data, error: null, status: 200, ok: true }
      }
    }

    const result = await deduplicatedFetch<{ account: PropFirmAccount }>(
      cacheKey,
      () => fetchWithError(`/api/prop-firm/accounts/${accountId}`, { timeout: API_TIMEOUT })
    )

    if (result.ok && result.data?.account) {
      CacheManager.set(cacheKey, result.data.account, {
        ttl: CACHE_DURATION_SHORT,
        tags: [CacheTags.PROP_FIRM, CacheTags.ACCOUNTS]
      })

      return {
        data: result.data.account,
        error: null,
        status: result.status,
        ok: true
      }
    }

    return {
      data: null,
      error: result.error,
      status: result.status,
      ok: false
    }
  }

  /**
   * Fetch prop firm account trades
   */
  async getPropFirmTrades(
    accountId: string,
    phase?: string | 'all'
  ): Promise<FetchResult<any[]>> {
    const params = phase ? `?phase=${phase}` : ''
    
    const result = await fetchWithError<{ success: boolean; data: { trades: any[] } }>(
      `/api/prop-firm/accounts/${accountId}/trades${params}`,
      { timeout: API_TIMEOUT }
    )

    if (result.ok && result.data?.data?.trades) {
      return {
        data: result.data.data.trades,
        error: null,
        status: result.status,
        ok: true
      }
    }

    return {
      data: null,
      error: result.error,
      status: result.status,
      ok: false
    }
  }

  /**
   * Fetch prop firm payouts
   */
  async getPropFirmPayouts(accountId: string): Promise<FetchResult<{
    eligibility: any
    history: any[]
  }>> {
    const result = await fetchWithError<{ success: boolean; data: any }>(
      `/api/prop-firm/accounts/${accountId}/payouts`,
      { timeout: API_TIMEOUT }
    )

    if (result.ok && result.data?.data) {
      return {
        data: result.data.data,
        error: null,
        status: result.status,
        ok: true
      }
    }

    return {
      data: { eligibility: null, history: [] },
      error: result.error,
      status: result.status,
      ok: false
    }
  }

  // ===========================================
  // TRADES
  // ===========================================

  /**
   * Fetch trades with pagination
   */
  async getTrades(options?: {
    page?: number
    limit?: number
    accountNumbers?: string[]
    dateRange?: { from: Date; to: Date }
    forceRefresh?: boolean
  }): Promise<FetchResult<{ trades: any[]; total: number }>> {
    const params = new URLSearchParams()
    
    if (options?.page) params.append('page', options.page.toString())
    if (options?.limit) params.append('limit', options.limit.toString())
    if (options?.accountNumbers?.length) {
      params.append('accountNumbers', options.accountNumbers.join(','))
    }
    if (options?.dateRange?.from) {
      params.append('from', options.dateRange.from.toISOString())
    }
    if (options?.dateRange?.to) {
      params.append('to', options.dateRange.to.toISOString())
    }

    const result = await fetchWithError<{ trades: any[]; total: number }>(
      `/api/trades?${params.toString()}`,
      { timeout: API_TIMEOUT }
    )

    return result
  }

  // ===========================================
  // CACHE MANAGEMENT
  // ===========================================

  /**
   * Invalidate all caches for a user
   */
  invalidateAll(): void {
    CacheManager.clear()
  }

  /**
   * Invalidate specific cache by tag
   */
  invalidateByTag(tags: string[]): void {
    CacheManager.invalidateByTag(tags)
  }

  /**
   * Invalidate accounts cache
   */
  invalidateAccounts(): void {
    CacheManager.invalidateByTag([CacheTags.ACCOUNTS])
  }

  /**
   * Invalidate trades cache
   */
  invalidateTrades(): void {
    CacheManager.invalidateByTag([CacheTags.TRADES, CacheTags.STATISTICS])
  }

  /**
   * Invalidate prop firm cache
   */
  invalidatePropFirm(accountId?: string): void {
    if (accountId) {
      CacheManager.delete(CacheKeys.propFirmAccount(accountId))
    }
    CacheManager.invalidateByTag([CacheTags.PROP_FIRM])
  }
}

// ===========================================
// EXPORTS
// ===========================================

export const DataService = DataServiceClass.getInstance()

export default DataService

