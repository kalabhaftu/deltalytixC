import { RateLimiterMemory } from 'rate-limiter-flexible'
import { NextRequest, NextResponse } from 'next/server'

// Different rate limiters for different endpoints
const rateLimiters = {
  // General API rate limiter
  api: new RateLimiterMemory({
    keyGen: (req: NextRequest) => req.ip || 'anonymous',
    points: 100, // Number of requests
    duration: 900, // Per 15 minutes
    blockDuration: 900, // Block for 15 minutes if exceeded
  }),

  // Authentication endpoints (stricter)
  auth: new RateLimiterMemory({
    keyGen: (req: NextRequest) => req.ip || 'anonymous',
    points: 5, // Number of requests
    duration: 900, // Per 15 minutes
    blockDuration: 3600, // Block for 1 hour if exceeded
  }),

  // AI/Chat endpoints (moderate)
  ai: new RateLimiterMemory({
    keyGen: (req: NextRequest) => req.ip || 'anonymous',
    points: 20, // Number of requests
    duration: 60, // Per minute
    blockDuration: 300, // Block for 5 minutes if exceeded
  }),

  // File upload endpoints (very strict)
  upload: new RateLimiterMemory({
    keyGen: (req: NextRequest) => req.ip || 'anonymous',
    points: 10, // Number of requests
    duration: 3600, // Per hour
    blockDuration: 3600, // Block for 1 hour if exceeded
  }),

  // Data export endpoints
  export: new RateLimiterMemory({
    keyGen: (req: NextRequest) => req.ip || 'anonymous',
    points: 5, // Number of requests
    duration: 3600, // Per hour
    blockDuration: 3600, // Block for 1 hour if exceeded
  }),
}

export type RateLimiterType = keyof typeof rateLimiters

export async function applyRateLimit(
  request: NextRequest,
  type: RateLimiterType = 'api'
): Promise<NextResponse | null> {
  try {
    const rateLimiter = rateLimiters[type]
    
    if (!rateLimiter) {
      console.warn(`Rate limiter type "${type}" not found, using default`)
      return null
    }

    await rateLimiter.consume(request)
    return null // No rate limit exceeded
  } catch (rejRes) {
    // Rate limit exceeded
    const msBeforeNext = rejRes.msBeforeNext || 60000
    const totalHits = rejRes.totalHits || 0
    const remainingPoints = rejRes.remainingPoints || 0

    return NextResponse.json(
      {
        error: 'Rate limit exceeded',
        retryAfter: Math.round(msBeforeNext / 1000),
        totalRequests: totalHits,
        remainingRequests: remainingPoints,
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.round(msBeforeNext / 1000)),
          'X-RateLimit-Limit': String(rateLimiter.points),
          'X-RateLimit-Remaining': String(remainingPoints),
          'X-RateLimit-Reset': String(new Date(Date.now() + msBeforeNext)),
        },
      }
    )
  }
}

// Middleware wrapper for easy use in API routes
export function withRateLimit(
  handler: (req: NextRequest) => Promise<NextResponse>,
  type: RateLimiterType = 'api'
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    // Apply rate limiting
    const rateLimitResponse = await applyRateLimit(req, type)
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    // Continue with the original handler
    return handler(req)
  }
}

// Rate limit checker (doesn't consume points)
export async function checkRateLimit(
  request: NextRequest,
  type: RateLimiterType = 'api'
): Promise<{
  allowed: boolean
  remaining: number
  resetTime: Date
}> {
  try {
    const rateLimiter = rateLimiters[type]
    const res = await rateLimiter.get(request)
    
    return {
      allowed: res.remainingPoints > 0,
      remaining: res.remainingPoints || rateLimiter.points,
      resetTime: new Date(Date.now() + (res.msBeforeNext || 0)),
    }
  } catch (error) {
    // If there's an error, assume rate limit not exceeded
    return {
      allowed: true,
      remaining: rateLimiters[type].points,
      resetTime: new Date(Date.now() + rateLimiters[type].duration * 1000),
    }
  }
}

// IP-based rate limiting for authenticated users
export class UserRateLimiter {
  private static limiters = new Map<string, RateLimiterMemory>()

  static getUserLimiter(userId: string, config?: {
    points?: number
    duration?: number
    blockDuration?: number
  }) {
    if (!this.limiters.has(userId)) {
      this.limiters.set(
        userId,
        new RateLimiterMemory({
          keyGen: () => userId,
          points: config?.points || 200, // Higher limit for authenticated users
          duration: config?.duration || 900, // Per 15 minutes
          blockDuration: config?.blockDuration || 600, // Block for 10 minutes
        })
      )
    }
    return this.limiters.get(userId)!
  }

  static async applyUserRateLimit(
    userId: string,
    config?: {
      points?: number
      duration?: number
      blockDuration?: number
    }
  ): Promise<{ allowed: boolean; remaining: number; resetTime: Date }> {
    try {
      const limiter = this.getUserLimiter(userId, config)
      await limiter.consume(userId)
      
      const res = await limiter.get(userId)
      return {
        allowed: true,
        remaining: res.remainingPoints || 0,
        resetTime: new Date(Date.now() + (res.msBeforeNext || 0)),
      }
    } catch (rejRes) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: new Date(Date.now() + (rejRes.msBeforeNext || 60000)),
      }
    }
  }
}

// Sliding window rate limiter for premium features
export class SlidingWindowRateLimiter {
  private windows = new Map<string, number[]>()
  
  constructor(
    private limit: number,
    private windowMs: number
  ) {}

  isAllowed(key: string): boolean {
    const now = Date.now()
    const window = this.windows.get(key) || []
    
    // Remove expired entries
    const validEntries = window.filter(time => now - time < this.windowMs)
    
    if (validEntries.length >= this.limit) {
      return false
    }
    
    // Add current request
    validEntries.push(now)
    this.windows.set(key, validEntries)
    
    return true
  }

  getRemaining(key: string): number {
    const now = Date.now()
    const window = this.windows.get(key) || []
    const validEntries = window.filter(time => now - time < this.windowMs)
    
    return Math.max(0, this.limit - validEntries.length)
  }
}
