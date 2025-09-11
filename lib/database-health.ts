/**
 * Database Health Check Utility
 * Provides functions to test and monitor database connectivity
 */

import { prisma } from '@/lib/prisma'

export interface DatabaseHealthStatus {
  isHealthy: boolean
  latency: number | null
  error: string | null
  timestamp: Date
  details: {
    connectionPool: boolean
    basicQuery: boolean
    complexQuery: boolean
  }
}

/**
 * Performs a comprehensive database health check
 */
export async function checkDatabaseHealth(): Promise<DatabaseHealthStatus> {
  const startTime = Date.now()
  const result: DatabaseHealthStatus = {
    isHealthy: false,
    latency: null,
    error: null,
    timestamp: new Date(),
    details: {
      connectionPool: false,
      basicQuery: false,
      complexQuery: false
    }
  }

  try {
    // Test 1: Basic connection pool check
    try {
      await prisma.$queryRaw`SELECT 1 as test`
      result.details.connectionPool = true
    } catch (error) {
      result.error = `Connection pool error: ${error instanceof Error ? error.message : 'Unknown'}`
      return result
    }

    // Test 2: Basic query test
    try {
      await prisma.$queryRaw`SELECT current_timestamp as now`
      result.details.basicQuery = true
    } catch (error) {
      result.error = `Basic query error: ${error instanceof Error ? error.message : 'Unknown'}`
      return result
    }

    // Test 3: Complex query test (optional)
    try {
      const accountCount = await prisma.account.count()
      result.details.complexQuery = true
    } catch (error) {
      // Complex query failure is not critical for health status
      console.warn('[Database Health] Complex query failed:', error)
    }

    result.latency = Date.now() - startTime
    result.isHealthy = result.details.connectionPool && result.details.basicQuery

  } catch (error) {
    result.error = error instanceof Error ? error.message : 'Unknown database error'
    result.latency = Date.now() - startTime
  }

  return result
}

/**
 * Quick database connectivity test with timeout
 */
export async function quickHealthCheck(timeoutMs = 5000): Promise<boolean> {
  try {
    const healthPromise = checkDatabaseHealth()
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Health check timeout')), timeoutMs)
    )

    const result = await Promise.race([healthPromise, timeoutPromise]) as DatabaseHealthStatus
    return result.isHealthy
  } catch (error) {
    console.warn('[Database Health] Quick check failed:', error)
    return false
  }
}

/**
 * Attempt to reconnect to the database
 */
export async function attemptReconnection(): Promise<boolean> {
  try {
    console.log('[Database Health] Attempting reconnection...')
    
    // Disconnect existing connections
    await prisma.$disconnect()
    
    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Test new connection
    await prisma.$queryRaw`SELECT 1`
    
    console.log('[Database Health] Reconnection successful')
    return true
  } catch (error) {
    console.error('[Database Health] Reconnection failed:', error)
    return false
  }
}

/**
 * Get database connection statistics
 */
export async function getDatabaseStats() {
  try {
    // Get basic database info
    const result = await prisma.$queryRaw`
      SELECT 
        current_database() as database_name,
        current_user as user_name,
        version() as postgres_version,
        current_timestamp as server_time
    ` as any[]

    return {
      success: true,
      data: result[0] || {},
      timestamp: new Date()
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date()
    }
  }
}
