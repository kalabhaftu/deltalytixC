/**
 * Centralized Application Constants
 * All timeout, cache, and configuration values in one place
 */

// ===========================================
// CACHE DURATIONS
// ===========================================

/** Short cache duration - for frequently changing data (30 seconds) */
export const CACHE_DURATION_SHORT = 30 * 1000

/** Medium cache duration - for moderately stable data (1 minute) */
export const CACHE_DURATION_MEDIUM = 60 * 1000

/** Long cache duration - for stable data (5 minutes) */
export const CACHE_DURATION_LONG = 5 * 60 * 1000

/** Extra long cache duration - for rarely changing data (15 minutes) */
export const CACHE_DURATION_EXTRA_LONG = 15 * 60 * 1000

// ===========================================
// API TIMEOUTS
// ===========================================

/** Default API request timeout (10 seconds) */
export const API_TIMEOUT = 10 * 1000

/** Short API timeout for simple operations (5 seconds) */
export const API_TIMEOUT_SHORT = 5 * 1000

/** Long API timeout for complex operations (30 seconds) */
export const API_TIMEOUT_LONG = 30 * 1000

// ===========================================
// POLLING INTERVALS
// ===========================================

/** Default polling interval for real-time updates (30 seconds) */
export const POLL_INTERVAL = 30 * 1000

/** Fast polling interval for critical updates (10 seconds) */
export const POLL_INTERVAL_FAST = 10 * 1000

/** Slow polling interval for background updates (60 seconds) */
export const POLL_INTERVAL_SLOW = 60 * 1000

// ===========================================
// DEBOUNCE DELAYS
// ===========================================

/** Default debounce delay for user input (300ms) */
export const DEBOUNCE_DELAY = 300

/** Short debounce for responsive inputs (150ms) */
export const DEBOUNCE_DELAY_SHORT = 150

/** Long debounce for expensive operations (500ms) */
export const DEBOUNCE_DELAY_LONG = 500

// ===========================================
// PAGINATION
// ===========================================

/** Default page size for lists */
export const DEFAULT_PAGE_SIZE = 50

/** Large page size for tables */
export const LARGE_PAGE_SIZE = 100

/** Small page size for cards/grids */
export const SMALL_PAGE_SIZE = 20

// ===========================================
// REAL-TIME
// ===========================================

/** Minimum interval between real-time refreshes (2 seconds) */
export const MIN_REFRESH_INTERVAL = 2 * 1000

/** Maximum interval between batched refreshes (15 seconds) */
export const MAX_REFRESH_INTERVAL = 15 * 1000

/** Reconnection delay for WebSocket (5 seconds) */
export const RECONNECT_DELAY = 5 * 1000

/** Maximum reconnection attempts */
export const MAX_RECONNECT_ATTEMPTS = 5

// ===========================================
// RETRY CONFIGURATION
// ===========================================

/** Maximum retry attempts for failed requests */
export const MAX_RETRY_ATTEMPTS = 3

/** Base delay between retries (1 second) */
export const RETRY_BASE_DELAY = 1000

/** Retry delay multiplier for exponential backoff */
export const RETRY_MULTIPLIER = 2

// ===========================================
// MEMORY LIMITS
// ===========================================

/** Maximum items in memory cache */
export const MAX_CACHE_ITEMS = 1000

/** Maximum trades to load at once */
export const MAX_TRADES_BATCH = 500

/** Warning threshold for trade count */
export const TRADES_WARNING_THRESHOLD = 5000

