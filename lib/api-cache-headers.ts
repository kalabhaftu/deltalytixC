/**
 * API Cache Headers Utility
 * 
 * Provides standardized cache headers for different types of API responses
 * to optimize performance and reduce server load
 */

export const CacheHeaders = {
  /**
   * No cache - For authentication and user-specific data
   */
  noCache: {
    'Cache-Control': 'private, no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  },

  /**
   * Short cache (60 seconds) - For frequently changing data
   * Uses stale-while-revalidate for better UX
   */
  short: {
    'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
  },

  /**
   * Medium cache (5 minutes) - For semi-static data
   */
  medium: {
    'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
  },

  /**
   * Long cache (1 hour) - For relatively static data
   */
  long: {
    'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
  },

  /**
   * Very long cache (1 day) - For static resources
   */
  veryLong: {
    'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=172800',
  },

  /**
   * Immutable cache - For content that never changes (by hash/version)
   */
  immutable: {
    'Cache-Control': 'public, max-age=31536000, immutable',
  },
}

/**
 * Helper to add cache headers to NextResponse
 */
export function withCacheHeaders(
  response: Response,
  cacheType: keyof typeof CacheHeaders = 'short'
): Response {
  const headers = new Headers(response.headers)
  const cacheHeaders = CacheHeaders[cacheType]
  
  Object.entries(cacheHeaders).forEach(([key, value]) => {
    headers.set(key, value)
  })

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

/**
 * Get cache headers for a specific cache duration
 */
export function getCacheHeaders(
  maxAge: number,
  staleWhileRevalidate?: number
): Record<string, string> {
  const swr = staleWhileRevalidate ?? maxAge * 2
  return {
    'Cache-Control': `public, s-maxage=${maxAge}, stale-while-revalidate=${swr}`,
  }
}


