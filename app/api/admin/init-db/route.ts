import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    console.log('[init-db] Starting database initialization...')

    // Test database connection
    await prisma.$connect()
    console.log('[init-db] Database connection successful')

    // Run any necessary database migrations or initialization
    // This is a placeholder - you can add specific initialization logic here
    const result = await prisma.$queryRaw`
      SELECT 1 as test_connection
    `

    console.log('[init-db] Database initialization completed successfully')

    return NextResponse.json({
      success: true,
      message: 'Database initialized successfully',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('[init-db] Database initialization failed:', error)

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Database initialization endpoint',
    methods: ['POST'],
    description: 'Initialize database connection and run setup tasks'
  })
}
