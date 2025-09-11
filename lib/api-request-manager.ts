/**
 * Request deduplication and caching manager
 * Prevents multiple simultaneous identical API calls
 */

interface PendingRequest {
  promise: Promise<Response>
  timestamp: number
}

interface CachedResponse {
  data: any
  timestamp: number
  expiry: number
}

class ApiRequestManager {
  private pendingRequests = new Map<string, PendingRequest>()
  private cache = new Map<string, CachedResponse>()
  private readonly DEFAULT_CACHE_TTL = 30000 // 30 seconds
  private readonly REQUEST_TIMEOUT = 25000 // 25 seconds
  
  /**
   * Make a cached API request with deduplication
   */
  async request(
    url: string, 
    options: RequestInit = {}, 
    cacheTTL: number = this.DEFAULT_CACHE_TTL
  ): Promise<Response> {
    const requestKey = this.getRequestKey(url, options)
    
    // Check cache first (for GET requests only)
    if ((!options.method || options.method === 'GET') && cacheTTL > 0) {
      const cached = this.getFromCache(requestKey)
      if (cached) {
        return new Response(JSON.stringify(cached), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      }
    }
    
    // Check if request is already pending
    const pending = this.pendingRequests.get(requestKey)
    if (pending) {
      console.log(`[API] Deduplicating request to ${url}`)
      return pending.promise
    }
    
    // Create new request with timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => {
      controller.abort()
      this.pendingRequests.delete(requestKey)
    }, this.REQUEST_TIMEOUT)
    
    const requestPromise = fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      }
    }).finally(() => {
      clearTimeout(timeoutId)
      this.pendingRequests.delete(requestKey)
    })
    
    // Store pending request
    this.pendingRequests.set(requestKey, {
      promise: requestPromise,
      timestamp: Date.now()
    })
    
    try {
      const response = await requestPromise
      
      // Cache successful GET responses
      if (response.ok && (!options.method || options.method === 'GET') && cacheTTL > 0) {
        const clonedResponse = response.clone()
        try {
          const data = await clonedResponse.json()
          this.setCache(requestKey, data, cacheTTL)
        } catch (e) {
          // Ignore JSON parse errors for caching
        }
      }
      
      return response
    } catch (error) {
      this.pendingRequests.delete(requestKey)
      throw error
    }
  }
  
  /**
   * Generate a unique key for the request
   */
  private getRequestKey(url: string, options: RequestInit): string {
    const method = options.method || 'GET'
    const body = options.body ? JSON.stringify(options.body) : ''
    return `${method}:${url}:${body}`
  }
  
  /**
   * Get cached response if still valid
   */
  private getFromCache(key: string): any | null {
    const cached = this.cache.get(key)
    if (!cached) return null
    
    if (Date.now() > cached.expiry) {
      this.cache.delete(key)
      return null
    }
    
    return cached.data
  }
  
  /**
   * Store response in cache
   */
  private setCache(key: string, data: any, ttl: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiry: Date.now() + ttl
    })
  }
  
  /**
   * Clear expired cache entries
   */
  clearExpired(): void {
    const now = Date.now()
    for (const [key, cached] of this.cache.entries()) {
      if (now > cached.expiry) {
        this.cache.delete(key)
      }
    }
  }
  
  /**
   * Clear all cache and pending requests
   */
  clear(): void {
    this.cache.clear()
    this.pendingRequests.clear()
  }
  
  /**
   * Get cache statistics
   */
  getStats() {
    return {
      cacheSize: this.cache.size,
      pendingRequests: this.pendingRequests.size,
      cacheHitRate: this.cache.size > 0 ? 'Available' : 'No data'
    }
  }
}

// Global instance
export const apiRequestManager = new ApiRequestManager()

// Cleanup expired cache entries every 5 minutes
if (typeof window !== 'undefined') {
  setInterval(() => {
    apiRequestManager.clearExpired()
  }, 5 * 60 * 1000)
}

/**
 * Enhanced fetch wrapper with deduplication and caching
 */
export async function apiRequest(
  url: string,
  options: RequestInit = {},
  cacheTTL: number = 30000
): Promise<Response> {
  return apiRequestManager.request(url, options, cacheTTL)
}

/**
 * Specialized fetch for JSON APIs with error handling
 */
export async function fetchJson<T = any>(
  url: string,
  options: RequestInit = {},
  cacheTTL: number = 30000
): Promise<{
  success: boolean
  data?: T
  error?: string
  status: number
}> {
  try {
    const response = await apiRequest(url, options, cacheTTL)
    const data = await response.json()
    
    return {
      success: response.ok,
      data: response.ok ? data : undefined,
      error: response.ok ? undefined : data.error || `HTTP ${response.status}`,
      status: response.status
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
      status: 0
    }
  }
}

