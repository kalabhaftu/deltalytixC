import { NextRequest, NextResponse } from 'next/server'
import { PropFirmAccountEvaluator } from '@/lib/prop-firm/account-evaluation'
import { logger } from '@/lib/logger'

/**
 * GET /api/cron/daily-anchors - Automated daily anchor creation
 * This endpoint should be called by a cron job every day at midnight UTC
 * to create daily anchors for all active prop firm accounts in their respective timezones
 */
export async function GET(request: NextRequest) {
  try {
    // Verify this is a legitimate cron request
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      logger.warn('Unauthorized cron job attempt', { 
        authHeader: authHeader ? 'provided' : 'missing',
        userAgent: request.headers.get('user-agent')
      }, 'CronJob')
      
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    logger.info('Starting automated daily anchor creation', {}, 'CronJob')
    
    const startTime = Date.now()
    
    // Create daily anchors for all users (timezone-aware)
    const anchorsCreated = await PropFirmAccountEvaluator.createDailyAnchors()
    
    const executionTime = Date.now() - startTime
    
    logger.info('Automated daily anchor creation completed', {
      anchorsCreated,
      executionTimeMs: executionTime
    }, 'CronJob')
    
    return NextResponse.json({
      success: true,
      message: `Created ${anchorsCreated} daily anchors`,
      anchorsCreated,
      executionTimeMs: executionTime,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    logger.error('Automated daily anchor creation failed', error, 'CronJob')
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Daily anchor creation failed', 
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/cron/daily-anchors - Manual trigger for testing
 * Allows manual execution of the daily anchor creation process
 */
export async function POST(request: NextRequest) {
  try {
    // Check authorization for manual trigger
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const { forceDate } = body // Optional: force a specific date for testing

    logger.info('Manual daily anchor creation triggered', { forceDate }, 'CronJob')
    
    const startTime = Date.now()
    const anchorsCreated = await PropFirmAccountEvaluator.createDailyAnchors(undefined, forceDate)
    const executionTime = Date.now() - startTime
    
    return NextResponse.json({
      success: true,
      message: `Manually created ${anchorsCreated} daily anchors`,
      anchorsCreated,
      executionTimeMs: executionTime,
      forceDate: forceDate || null,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    logger.error('Manual daily anchor creation failed', error, 'CronJob')
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Manual daily anchor creation failed', 
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}
