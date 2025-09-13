import { NextRequest, NextResponse } from 'next/server'
import { PropFirmAccountEvaluator } from '@/lib/prop-firm/account-evaluation'
import { logger } from '@/lib/logger'

/**
 * Daily Anchor Creation Cron Job
 * This endpoint should be called daily (e.g., at 00:00 UTC) to create daily anchors
 * for all prop firm accounts. Daily anchors are used for daily drawdown calculations.
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      logger.warn('Unauthorized daily anchor cron attempt', { 
        authHeader: authHeader ? 'present' : 'missing',
        cronSecret: cronSecret ? 'configured' : 'missing'
      }, 'DailyAnchorCron')
      
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const startTime = Date.now()
    
    // Create daily anchors for all prop firm accounts
    const count = await PropFirmAccountEvaluator.createDailyAnchors()
    
    const duration = Date.now() - startTime
    
    logger.info('Daily anchor cron completed', {
      anchorsCreated: count,
      duration: `${duration}ms`,
      date: new Date().toISOString().split('T')[0]
    }, 'DailyAnchorCron')

    return NextResponse.json({
      success: true,
      message: `Daily anchor creation completed`,
      anchorsCreated: count,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    logger.error('Daily anchor cron failed', error, 'DailyAnchorCron')
    
        return NextResponse.json(
      { 
        error: 'Daily anchor creation failed', 
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

// Also support POST for manual triggering
export async function POST(request: NextRequest) {
  return GET(request)
}