/**
 * Database health check utilities
 * Provides robust database connection testing and monitoring
 */

import { prisma } from '@/lib/prisma'

export interface HealthCheckResult {
  success: boolean
  latency?: number
  error?: string
  timestamp: Date
}

/**
 * Performs a quick database health check
 * @param timeoutMs - Timeout in milliseconds (default: 8000)
 * @returns Promise<HealthCheckResult>
 */
export async function checkDatabaseHealth(timeoutMs = 8000): Promise<HealthCheckResult> {
  const startTime = Date.now()
  
  try {
    const healthCheck = Promise.race([
      // Simple query to test connection
      prisma.$queryRaw`SELECT 1 as health_check`,
      // Timeout promise
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database health check timeout')), timeoutMs)
      )
    ])
    
    await healthCheck
    const latency = Date.now() - startTime
    
    return {
      success: true,
      latency,
      timestamp: new Date()
    }
  } catch (error) {
    const latency = Date.now() - startTime
    
    return {
      success: false,
      latency,
      error: error instanceof Error ? error.message : 'Unknown database error',
      timestamp: new Date()
    }
  }
}

/**
 * Checks if database connection string is properly configured
 */
export function validateDatabaseConfig(): { valid: boolean; issues: string[] } {
  const issues: string[] = []
  
  // Check for required environment variables
  if (!process.env.DATABASE_URL && !process.env.DIRECT_URL) {
    issues.push('Missing DATABASE_URL or DIRECT_URL environment variable')
  }
  
  // Check for common configuration issues
  const dbUrl = process.env.DATABASE_URL || process.env.DIRECT_URL || ''
  
  if (dbUrl && dbUrl.includes(':5432')) {
    issues.push('Using direct connection port 5432 instead of pooler port 6543')
  }
  
  if (dbUrl && !dbUrl.includes('supabase.com') && !dbUrl.includes('localhost')) {
    issues.push('Database URL format may be incorrect')
  }
  
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    issues.push('Missing NEXT_PUBLIC_SUPABASE_URL environment variable')
  }
  
  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    issues.push('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable')
  }
  
  return {
    valid: issues.length === 0,
    issues
  }
}

/**
 * Attempts to reconnect to database with exponential backoff
 */
export async function attemptDatabaseReconnection(
  maxAttempts = 3,
  baseDelayMs = 1000
): Promise<HealthCheckResult> {
  let lastError = ''
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const result = await checkDatabaseHealth()
    
    if (result.success) {
      return result
    }
    
    lastError = result.error || 'Unknown error'
    
    if (attempt < maxAttempts) {
      const delay = baseDelayMs * Math.pow(2, attempt - 1)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  
  return {
    success: false,
    error: `Failed to reconnect after ${maxAttempts} attempts. Last error: ${lastError}`,
    timestamp: new Date()
  }
}

/**
 * Enhanced database connection wrapper with retry logic
 */
export async function withDatabaseRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 2
): Promise<T> {
  let lastError: Error | null = null
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error')
      
      // Check if it's a connection error that might benefit from retry
      const isConnectionError = 
        lastError.message.includes("Can't reach database server") ||
        lastError.message.includes('Connection timeout') ||
        lastError.message.includes('P1001') ||
        lastError.message.includes('ECONNREFUSED')
      
      if (!isConnectionError || attempt === maxRetries) {
        throw lastError
      }
      
      // Wait before retry with exponential backoff
      const delay = 1000 * Math.pow(2, attempt)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  
  throw lastError
}
