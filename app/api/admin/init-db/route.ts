import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    console.log('[init-db] Starting database initialization...')

    // Test database connection with timeout
    const connectionPromise = prisma.$connect()
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Database connection timeout')), 15000)
    )

    await Promise.race([connectionPromise, timeoutPromise])
    console.log('[init-db] Database connection successful')

    // Run any necessary database migrations or initialization
    // This is a placeholder - you can add specific initialization logic here
    const result = await Promise.race([
      prisma.$queryRaw`SELECT 1 as test_connection`,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Database query timeout')), 10000)
      )
    ])

    console.log('[init-db] Database initialization completed successfully')

    return NextResponse.json({
      success: true,
      message: 'Database initialized successfully',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('[init-db] Database initialization failed:', error)

    // Provide specific error messages based on error type
    let errorMessage = 'Unknown error'
    let statusCode = 500

    if (error instanceof Error) {
      if (error.message.includes('Database connection timeout')) {
        errorMessage = 'Database connection timeout - server may be temporarily unavailable'
        statusCode = 503 // Service Unavailable
      } else if (error.message.includes('Database query timeout')) {
        errorMessage = 'Database query timeout - operation took too long'
        statusCode = 408 // Request Timeout
      } else if (error.message.includes('Can\'t reach database server')) {
        errorMessage = 'Database server unreachable - please check your internet connection'
        statusCode = 503 // Service Unavailable
      } else {
        errorMessage = error.message
      }
    }

    return NextResponse.json({
      success: false,
      error: errorMessage,
      timestamp: new Date().toISOString()
    }, { status: statusCode })
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Database initialization endpoint',
    methods: ['POST'],
    description: 'Initialize database connection and run setup tasks'
  })
}
