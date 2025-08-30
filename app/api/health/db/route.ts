/**
 * Database Health Check API Endpoint
 * Provides quick database connectivity testing
 */

import { NextRequest, NextResponse } from 'next/server'
import { checkDatabaseHealth, validateDatabaseConfig } from '@/lib/db-health-check'

export async function GET(request: NextRequest) {
  try {
    // First validate configuration
    const configCheck = validateDatabaseConfig()
    
    if (!configCheck.valid) {
      return NextResponse.json({
        success: false,
        status: 'configuration_error',
        issues: configCheck.issues,
        timestamp: new Date().toISOString()
      }, { status: 500 })
    }
    
    // Test database connection
    const healthResult = await checkDatabaseHealth()
    
    if (healthResult.success) {
      return NextResponse.json({
        success: true,
        status: 'healthy',
        latency: healthResult.latency,
        timestamp: healthResult.timestamp.toISOString()
      })
    } else {
      return NextResponse.json({
        success: false,
        status: 'unhealthy',
        error: healthResult.error,
        latency: healthResult.latency,
        timestamp: healthResult.timestamp.toISOString()
      }, { status: 503 })
    }
    
  } catch (error) {
    console.error('Database health check failed:', error)
    
    return NextResponse.json({
      success: false,
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
