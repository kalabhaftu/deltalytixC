'use server'

import { NextResponse } from 'next/server'
import { runStartupMigrations } from '@/lib/db-migration'

export async function POST() {
  try {
    console.log('[API] Running database initialization...')
    const result = await runStartupMigrations()
    
    return NextResponse.json({
      success: result.success,
      message: result.success 
        ? 'Database initialized successfully'
        : 'Database initialization failed, but app will continue',
    })
  } catch (error) {
    console.error('[API] Database initialization error:', error)
    return NextResponse.json({
      success: false,
      message: 'Database initialization failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}
