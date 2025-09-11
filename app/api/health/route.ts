import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Simple health check endpoint for monitoring API performance
export async function GET(request: NextRequest) {
  const start = Date.now()
  
  try {
    // Quick database ping
    await prisma.$queryRaw`SELECT 1`
    
    const dbLatency = Date.now() - start
    
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      latency: {
        database: `${dbLatency}ms`
      },
      environment: process.env.NODE_ENV
    })
  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 503 })
  }
}