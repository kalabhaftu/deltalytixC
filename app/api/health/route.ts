"use server"

import { NextRequest, NextResponse } from 'next/server'
import { checkDatabaseHealth } from '@/lib/db-health-check'

// GET /api/health - Check database and service health
export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    console.log('[Health Check] Starting database health check...')
    
    // Test database connection with shorter timeout for health checks
    const dbHealth = await checkDatabaseHealth(5000)
    
    const totalTime = Date.now() - startTime
    
    return NextResponse.json({
      status: dbHealth.success ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      services: {
        database: {
          status: dbHealth.success ? 'up' : 'down',
          latency: dbHealth.latency,
          error: dbHealth.error || null
        }
      },
      responseTime: totalTime
    }, {
      status: dbHealth.success ? 200 : 503
    })

  } catch (error) {
    const totalTime = Date.now() - startTime
    console.error('[Health Check] Unexpected error:', error)
    
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      services: {
        database: {
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      },
      responseTime: totalTime
    }, {
      status: 500
    })
  }
}
