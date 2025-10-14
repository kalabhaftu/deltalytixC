'use client'

import { toast } from 'sonner'
import type { ApiErrorResponse } from './api-error-handler'

/**
 * Handles API errors from fetch requests
 * Automatically detects deployment mismatches and prompts refresh
 */
export async function handleApiResponse<T = any>(
  response: Response,
  options?: {
    showToast?: boolean
    autoRefresh?: boolean
    refreshDelay?: number
    onError?: (error: ApiErrorResponse) => void
  }
): Promise<T> {
  const {
    showToast = true,
    autoRefresh = true,
    refreshDelay = 2000,
    onError,
  } = options || {}

  if (!response.ok) {
    const errorData: ApiErrorResponse = await response.json().catch(() => ({
      success: false,
      error: 'Failed to parse error response',
      code: 'PARSE_ERROR',
    }))

    // Handle deployment mismatch
    if (errorData.requiresRefresh || response.headers.get('X-Requires-Refresh') === 'true') {
      if (showToast) {
        toast.info('App updated. Refreshing page...', {
          duration: refreshDelay,
          description: errorData.details || 'A new version was deployed',
        })
      }

      if (autoRefresh) {
        setTimeout(() => {
          window.location.reload()
        }, refreshDelay)
      }

      throw new Error(errorData.error)
    }

    // Handle other errors
    if (showToast) {
      toast.error(errorData.error, {
        description: errorData.details,
        action: errorData.retryable ? {
          label: 'Retry',
          onClick: () => {
            // The caller should handle retry logic
          },
        } : undefined,
      })
    }

    onError?.(errorData)
    throw new Error(errorData.error)
  }

  return response.json()
}

/**
 * Wrapper for fetch that handles deployment errors automatically
 */
export async function safeFetch<T = any>(
  url: string,
  options?: RequestInit & {
    showToast?: boolean
    autoRefresh?: boolean
    refreshDelay?: number
    onError?: (error: ApiErrorResponse) => void
  }
): Promise<T> {
  const {
    showToast,
    autoRefresh,
    refreshDelay,
    onError,
    ...fetchOptions
  } = options || {}

  try {
    const response = await fetch(url, fetchOptions)
    return handleApiResponse<T>(response, {
      showToast,
      autoRefresh,
      refreshDelay,
      onError,
    })
  } catch (error) {
    // Network errors
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      if (showToast !== false) {
        toast.error('Network error', {
          description: 'Please check your internet connection',
        })
      }
    }
    throw error
  }
}

