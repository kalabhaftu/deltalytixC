/**
 * Network connectivity fallback utilities
 * Handles graceful degradation when external services are unavailable
 */

export interface NetworkConnectivityStatus {
  isOnline: boolean
  lastChecked: number
  externalServicesAvailable: {
    supabase: boolean
    fonts: boolean
    general: boolean
  }
}

// Simple in-memory cache for network status
let networkStatus: NetworkConnectivityStatus = {
  isOnline: true,
  lastChecked: 0,
  externalServicesAvailable: {
    supabase: true,
    fonts: true,
    general: true
  }
}

// Cache duration: 30 seconds
const CACHE_DURATION = 30 * 1000

/**
 * Check if we have basic internet connectivity
 */
export async function checkNetworkConnectivity(): Promise<boolean> {
  if (typeof window === 'undefined') {
    // Server side - assume connected
    return true
  }

  // Use Navigator API if available
  if ('onLine' in navigator) {
    return navigator.onLine
  }

  return true
}

/**
 * Test if external service is reachable with timeout
 */
async function testServiceConnectivity(url: string, timeout: number = 3000): Promise<boolean> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)
    
    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      mode: 'no-cors' // Avoid CORS issues for connectivity test
    })
    
    clearTimeout(timeoutId)
    return true
  } catch (error) {
    return false
  }
}

/**
 * Check connectivity to specific external services
 */
export async function checkExternalServices(): Promise<NetworkConnectivityStatus['externalServicesAvailable']> {
  const now = Date.now()
  
  // Return cached result if still fresh
  if (now - networkStatus.lastChecked < CACHE_DURATION) {
    return networkStatus.externalServicesAvailable
  }

  const [supabaseOk, fontsOk, generalOk] = await Promise.allSettled([
    testServiceConnectivity('https://supabase.com'),
    testServiceConnectivity('https://fonts.googleapis.com'),
    testServiceConnectivity('https://www.google.com')
  ])

  const results = {
    supabase: supabaseOk.status === 'fulfilled' && supabaseOk.value,
    fonts: fontsOk.status === 'fulfilled' && fontsOk.value,
    general: generalOk.status === 'fulfilled' && generalOk.value
  }

  // Update cache
  networkStatus = {
    isOnline: await checkNetworkConnectivity(),
    lastChecked: now,
    externalServicesAvailable: results
  }

  return results
}

/**
 * Get current network status (uses cache)
 */
export function getNetworkStatus(): NetworkConnectivityStatus {
  return { ...networkStatus }
}

/**
 * Handle fetch with automatic retries and fallbacks
 */
export async function fetchWithFallback(
  url: string,
  options: RequestInit = {},
  retries: number = 2
): Promise<Response> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const timeout = Math.min(5000 + (attempt * 2000), 10000) // 5s, 7s, 9s
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout)

      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      })

      clearTimeout(timeoutId)
      
      if (!response.ok && response.status >= 500 && attempt < retries) {
        throw new Error(`HTTP ${response.status}`)
      }

      return response
    } catch (error) {
      lastError = error as Error
      
      if (attempt < retries) {
        // Exponential backoff
        const delay = Math.min(1000 * Math.pow(2, attempt), 5000)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  throw lastError || new Error('Fetch failed after retries')
}
