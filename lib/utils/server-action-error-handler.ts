import { toast } from 'sonner'

/**
 * Detects if an error is a Server Action mismatch error
 * This happens when the client has old action IDs after a new deployment
 */
export function isServerActionMismatchError(error: unknown): boolean {
  if (!error) return false
  
  const errorMessage = error instanceof Error ? error.message : String(error)
  
  return (
    errorMessage.includes('Failed to find Server Action') ||
    errorMessage.includes('This request might be from an older or newer deployment') ||
    errorMessage.includes('Cannot read properties of undefined') && errorMessage.includes('workers')
  )
}

/**
 * Detects if an error is a deployment-related error
 */
export function isDeploymentError(error: unknown): boolean {
  if (!error) return false
  
  const errorMessage = error instanceof Error ? error.message : String(error)
  
  return (
    isServerActionMismatchError(error) ||
    errorMessage.includes('ChunkLoadError') ||
    errorMessage.includes('Loading chunk') ||
    errorMessage.includes('Failed to fetch dynamically imported module')
  )
}

/**
 * Handles Server Action errors gracefully
 * Shows user-friendly message and auto-refreshes if needed
 */
export function handleServerActionError(error: unknown, options?: {
  autoRefresh?: boolean
  refreshDelay?: number
  showToast?: boolean
  context?: string
}): boolean {
  const {
    autoRefresh = true,
    refreshDelay = 2000,
    showToast = true,
    context = ''
  } = options || {}

  if (isServerActionMismatchError(error)) {
    if (showToast) {
      if (autoRefresh) {
        toast.info('App updated. Refreshing page...', {
          duration: refreshDelay,
          description: 'A new version was deployed',
        })
        
        setTimeout(() => {
          window.location.reload()
        }, refreshDelay)
      } else {
        toast.info('App version mismatch detected', {
          duration: Infinity,
          description: 'Please refresh the page to continue',
          action: {
            label: 'Refresh',
            onClick: () => window.location.reload(),
          },
        })
      }
    } else if (autoRefresh) {
      // Silent refresh without toast
      setTimeout(() => {
        window.location.reload()
      }, refreshDelay)
    }
    
    return true // Error was handled
  }

  if (isDeploymentError(error)) {
    if (showToast) {
      toast.error('Failed to load resource', {
        description: 'The app was recently updated. Please refresh the page.',
        action: {
          label: 'Refresh',
          onClick: () => window.location.reload(),
        },
      })
    }
    
    return true // Error was handled
  }

  return false // Error was not a deployment error
}

/**
 * Wraps an async function with Server Action error handling
 * Usage: const safeAction = withServerActionErrorHandling(myAction)
 */
export function withServerActionErrorHandling<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options?: {
    autoRefresh?: boolean
    refreshDelay?: number
    showToast?: boolean
    context?: string
    onError?: (error: unknown) => void
  }
): T {
  return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    try {
      return await fn(...args)
    } catch (error) {
      const wasHandled = handleServerActionError(error, options)
      
      if (!wasHandled) {
        // If it wasn't a deployment error, call the custom error handler
        options?.onError?.(error)
        throw error // Re-throw for normal error handling
      }
      
      // Return a rejected promise for deployment errors
      return Promise.reject(error)
    }
  }) as T
}

/**
 * Global error handler for Server Actions
 * Can be attached to window.addEventListener('error') or 'unhandledrejection'
 */
export function setupGlobalServerActionErrorHandler() {
  if (typeof window === 'undefined') return

  // Handle unhandled promise rejections (Server Actions often throw these)
  window.addEventListener('unhandledrejection', (event) => {
    if (isDeploymentError(event.reason)) {
      event.preventDefault() // Prevent console error
      handleServerActionError(event.reason, {
        autoRefresh: true,
        refreshDelay: 2000,
        showToast: true,
        context: 'Unhandled Promise Rejection'
      })
    }
  })

  // Handle regular errors
  window.addEventListener('error', (event) => {
    if (isDeploymentError(event.error)) {
      event.preventDefault() // Prevent console error
      handleServerActionError(event.error, {
        autoRefresh: true,
        refreshDelay: 2000,
        showToast: true,
        context: 'Global Error'
      })
    }
  })
}

