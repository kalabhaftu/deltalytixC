import { NextResponse } from 'next/server'

/**
 * Standardized API error response format
 */
export interface ApiErrorResponse {
  success: false
  error: string
  details?: string
  code?: string
  retryable?: boolean
  requiresRefresh?: boolean
}

/**
 * Standardized API success response format
 */
export interface ApiSuccessResponse<T = any> {
  success: true
  data?: T
  message?: string
}

/**
 * Detects if an error requires a client refresh (deployment mismatch)
 */
export function isDeploymentMismatchError(error: unknown): boolean {
  if (!error) return false
  
  const errorMessage = error instanceof Error ? error.message : String(error)
  
  return (
    errorMessage.includes('Failed to find Server Action') ||
    errorMessage.includes('This request might be from an older or newer deployment') ||
    errorMessage.includes('ChunkLoadError') ||
    errorMessage.includes('BUILD_ID mismatch')
  )
}

/**
 * Handles common API errors and returns appropriate NextResponse
 */
export function handleApiError(error: unknown, context?: string): NextResponse<ApiErrorResponse> {

  // Deployment mismatch errors
  if (isDeploymentMismatchError(error)) {
    return NextResponse.json(
      {
        success: false,
        error: 'Application version mismatch',
        details: 'The application was recently updated. Please refresh your browser.',
        code: 'DEPLOYMENT_MISMATCH',
        retryable: false,
        requiresRefresh: true,
      },
      { 
        status: 409, // Conflict
        headers: {
          'X-Requires-Refresh': 'true',
        }
      }
    )
  }

  // Database connection errors
  if (error instanceof Error && (
    error.message.includes('P1001') ||
    error.message.includes("Can't reach database server") ||
    error.message.includes('Connection timeout') ||
    error.message.includes('ECONNREFUSED') ||
    error.message.includes('ENOTFOUND')
  )) {
    return NextResponse.json(
      {
        success: false,
        error: 'Database connection failed',
        details: 'Unable to connect to the database. Please try again.',
        code: 'DATABASE_CONNECTION_ERROR',
        retryable: true,
      },
      { status: 503 } // Service Unavailable
    )
  }

  // Transaction timeout errors
  if (error instanceof Error && (
    error.message.includes('P2028') ||
    error.message.includes('Transaction already closed') ||
    error.message.includes('timeout')
  )) {
    return NextResponse.json(
      {
        success: false,
        error: 'Request timeout',
        details: 'The request took too long to complete. Please try again.',
        code: 'REQUEST_TIMEOUT',
        retryable: true,
      },
      { status: 408 } // Request Timeout
    )
  }

  // Authentication errors
  if (error instanceof Error && (
    error.message.includes('Unauthorized') ||
    error.message.includes('Authentication') ||
    error.message.includes('Invalid token') ||
    error.message.includes('Token expired')
  )) {
    return NextResponse.json(
      {
        success: false,
        error: 'Authentication failed',
        details: 'Your session has expired. Please log in again.',
        code: 'AUTHENTICATION_ERROR',
        retryable: false,
      },
      { status: 401 } // Unauthorized
    )
  }

  // Validation errors
  if (error instanceof Error && (
    error.message.includes('Validation') ||
    error.message.includes('Invalid') ||
    error.message.includes('Required')
  )) {
    return NextResponse.json(
      {
        success: false,
        error: 'Validation error',
        details: error.message,
        code: 'VALIDATION_ERROR',
        retryable: false,
      },
      { status: 400 } // Bad Request
    )
  }

  // Generic error
  const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred'
  
  return NextResponse.json(
    {
      success: false,
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? errorMessage : 'Something went wrong',
      code: 'INTERNAL_ERROR',
      retryable: true,
    },
    { status: 500 }
  )
}

/**
 * Wraps an API route handler with error handling
 */
export function withApiErrorHandling<T = any>(
  handler: () => Promise<NextResponse<T>>,
  context?: string
): Promise<NextResponse<T | ApiErrorResponse>> {
  return handler().catch((error) => handleApiError(error, context))
}

/**
 * Creates a success response
 */
export function apiSuccess<T = any>(
  data?: T,
  message?: string,
  status = 200
): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      message,
    },
    { status }
  )
}

/**
 * Creates an error response
 */
export function apiError(
  error: string,
  details?: string,
  code?: string,
  status = 500,
  retryable = false
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    {
      success: false,
      error,
      details,
      code,
      retryable,
    },
    { status }
  )
}

