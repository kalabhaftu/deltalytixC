import { RateLimiterMemory } from 'rate-limiter-flexible'
import { NextRequest, NextResponse } from 'next/server'

// Rate limiters for different endpoint types
export const apiLimiter = new RateLimiterMemory({
  points: 100, // Number of requests
  duration: 60, // Per 60 seconds
})

export const authLimiter = new RateLimiterMemory({
  points: 10, // More restrictive for auth
  duration: 60,
})

export const aiLimiter = new RateLimiterMemory({
  points: 20, // AI requests are expensive
  duration: 60,
})

export const importLimiter = new RateLimiterMemory({
  points: 10, // Data import operations
  duration: 60,
})

export const uploadLimiter = new RateLimiterMemory({
  points: 30, // Image uploads
  duration: 60,
})

/**
 * Get identifier for rate limiting
 * Uses IP address or user ID if available
 */
export function getRateLimitIdentifier(req: NextRequest): string {
  // Try to get user ID from headers (set by middleware)
  const userId = req.headers.get('x-user-id')
  if (userId) {
    return `user:${userId}`
  }

  // Fallback to IP address
  const forwarded = req.headers.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(',')[0] : req.headers.get('x-real-ip') || 'unknown'
  return `ip:${ip}`
}

/**
 * Apply rate limiting to a request
 * Returns null if allowed, or a NextResponse with 429 if rate limited
 */
export async function applyRateLimit(
  req: NextRequest,
  limiter: RateLimiterMemory = apiLimiter
): Promise<NextResponse | null> {
  const identifier = getRateLimitIdentifier(req)

  try {
    await limiter.consume(identifier)
    return null // Allowed
  } catch (rateLimitError) {
    // Rate limit exceeded
    return NextResponse.json(
      {
        success: false,
        error: 'Too many requests',
        details: 'Please wait a moment before trying again',
        code: 'RATE_LIMIT_EXCEEDED',
        retryable: true,
      },
      {
        status: 429,
        headers: {
          'Retry-After': '60',
          'X-RateLimit-Limit': String(limiter.points),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Date.now() + (limiter.duration * 1000)),
        },
      }
    )
  }
}

/**
 * Wrapper for API route handlers with rate limiting
 */
export function withRateLimit(
  handler: (req: NextRequest) => Promise<NextResponse>,
  limiter: RateLimiterMemory = apiLimiter
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    // Apply rate limit
    const rateLimitResponse = await applyRateLimit(req, limiter)
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    // If not rate limited, proceed with handler
    return handler(req)
  }
}

