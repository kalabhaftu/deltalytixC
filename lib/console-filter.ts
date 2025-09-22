/**
 * Console filter for development environment
 * Suppresses excessive warnings and noise while preserving important messages
 */

// Store original console methods
const originalConsole = {
  log: console.log,
  warn: console.warn,
  error: console.error,
  info: console.info,
  debug: console.debug
}

// Patterns to suppress in development
const SUPPRESS_PATTERNS = [
  // Recharts ResponsiveContainer warnings
  /The width\(\d+\) and height\(\d+\) are both fixed numbers/,
  /maybe you don't need to use a ResponsiveContainer/,

  // React DevTools promotion (keeps showing up)
  /Download the React DevTools for a better development experience/,

  // Vercel Analytics debug messages (only in dev)
  /\[Vercel Web Analytics\]/,
  /\[Vercel Speed Insights\]/,

  // Fast Refresh messages (too noisy)
  /\[Fast Refresh\]/,

  // RRWEB console recording (recording our console!)
  /rrweb-plugin-console-record\.js/,

  // Select controlled/uncontrolled warnings
  /Select is changing from uncontrolled to controlled/,
  /Components should not switch from controlled to uncontrolled/,

  // Data logs from CSV processing (verbose arrays)
  /^\(\d+\)\s+\[.*\]\s+\(\d+\)\s+\[Array/,
  /^\(\d+\)\s+\['ID',.*\]\s+\(\d+\)\s+\[Array/,

  // React performance warnings that are development noise
  /react_stack_bottom_frame/,
  /commitPassiveMountOnFiber/,
  /recursivelyTraversePassiveMountEffects/,

  // Import button debug logs (now removed from code)
  /\[ImportButton\] Saving trades:/,
  /Available tick details:/,

  // Data provider debug logs (now removed from code)
  /\[refreshTrades\] Production environment - forcing cache miss/,
  /Error refreshing trades:/,
  /Error loading data:/,
  /Error details:/,

  // AccountsPage repetitive logs
  /\[AccountsPage\] Component rendered/,
  /\[AccountsPage\] User:/,
  /\[AccountsPage\] Accounts from hook:/,
  /\[AccountsPage\] Is loading:/,
  /\[AccountsPage\] Accounts details:/,
  /\[AccountsPage\] Filtering accounts/,
  /\[AccountsPage\] Input accounts:/,
  /\[AccountsPage\] Account filter settings:/,
  /\[AccountsPage\] Search query:/,
  /\[AccountsPage\] Filter type:/,
  /\[AccountsPage\] Filter status:/,
  /\[AccountsPage\] After active-only filter:/,
  /\[AccountsPage\] Final filtered accounts:/,
  /\[AccountsPage\] Final accounts details:/,
  /\[AccountsPage\] All accounts mode - no filtering applied/,

  // useAccounts hook logs
  /\[useAccounts\] Fetching accounts using server action/,
  /\[useAccounts\] Server action returned:/,
  /\[useAccounts\] Transformed accounts:/,
  /\[useAccounts\] Successfully cached:/,
  /\[useAccounts\] Using cached accounts, skipping fetch/,

  // DataProvider logs
  /\[DataProvider\] Setting accounts:/,
  /\[DataProvider\] Account details:/,

  // AutoRefreshProvider logs
  /\[AutoRefreshProvider\] Auto-refresh disabled to improve performance/,

  // CSS preload warnings
  /The resource .* was preloaded using link preload but not used within a few seconds/
]

// Important patterns to ALWAYS show (even if they match suppress patterns)
const IMPORTANT_PATTERNS = [
  /error/i,
  /exception/i,
  /failed/i,
  /critical/i,
  /security/i,
  /fetch/i,
  /api/i,
  /http/i,
  /500/i,
  /400/i,
  /404/i,
  /network/i,
  /connection/i
]

function shouldSuppressMessage(message: string): boolean {
  // Never suppress important messages
  if (IMPORTANT_PATTERNS.some(pattern => pattern.test(message))) {
    return false
  }
  
  // Check if message matches any suppress pattern
  return SUPPRESS_PATTERNS.some(pattern => pattern.test(message))
}

function createFilteredConsoleMethod(
  originalMethod: (...args: any[]) => void,
  level: 'log' | 'warn' | 'error' | 'info' | 'debug'
) {
  return (...args: any[]) => {
    const message = args.join(' ')
    
    // In production, always use original methods
    if (process.env.NODE_ENV === 'production') {
      return originalMethod.apply(console, args)
    }
    
    // In development, filter based on patterns
    if (!shouldSuppressMessage(message)) {
      return originalMethod.apply(console, args)
    }
    
    // Optionally log suppressed messages to a different place for debugging
    if (process.env.VERBOSE_CONSOLE === 'true') {
      originalMethod.apply(console, [`[FILTERED ${level.toUpperCase()}]`, ...args])
    }
  }
}

/**
 * Apply console filtering for development
 */
export function applyConsoleFilter() {
  if (typeof window === 'undefined') return // Server-side, don't filter
  
  // Only apply filtering in development
  if (process.env.NODE_ENV !== 'development') return
  
  console.log = createFilteredConsoleMethod(originalConsole.log, 'log')
  console.warn = createFilteredConsoleMethod(originalConsole.warn, 'warn')
  console.info = createFilteredConsoleMethod(originalConsole.info, 'info')
  console.debug = createFilteredConsoleMethod(originalConsole.debug, 'debug')
  
  // Don't filter errors as they're critical
  // console.error remains unchanged
}

/**
 * Restore original console methods
 */
export function restoreConsole() {
  if (typeof window === 'undefined') return
  
  console.log = originalConsole.log
  console.warn = originalConsole.warn
  console.error = originalConsole.error
  console.info = originalConsole.info
  console.debug = originalConsole.debug
}

/**
 * Temporarily disable console filtering
 */
export function withOriginalConsole<T>(fn: () => T): T {
  const wasFiltered = console.log !== originalConsole.log
  
  if (wasFiltered) {
    restoreConsole()
  }
  
  try {
    return fn()
  } finally {
    if (wasFiltered) {
      applyConsoleFilter()
    }
  }
}

/**
 * Add a custom suppress pattern
 */
export function addSuppressPattern(pattern: RegExp) {
  SUPPRESS_PATTERNS.push(pattern)
}

/**
 * Remove a suppress pattern
 */
export function removeSuppressPattern(pattern: RegExp) {
  const index = SUPPRESS_PATTERNS.indexOf(pattern)
  if (index > -1) {
    SUPPRESS_PATTERNS.splice(index, 1)
  }
}

/**
 * Get current suppress patterns (for debugging)
 */
export function getSuppressPatterns(): RegExp[] {
  return [...SUPPRESS_PATTERNS]
}
