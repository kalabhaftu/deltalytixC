import { NextRequest, NextResponse } from 'next/server'
import { PropFirmAccountEvaluator } from '@/lib/prop-firm/account-evaluation'

/**
 * GET /api/cron/daily-anchors - Simple daily anchor creation
 * Creates daily anchors for all active prop firm accounts
 */
export async function GET(request: NextRequest) {
  try {
    // Create daily anchors for all users
    const anchorsCreated = await PropFirmAccountEvaluator.createDailyAnchors()

    return NextResponse.json({
      success: true,
      message: `Created ${anchorsCreated} daily anchors`,
      anchorsCreated,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
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
    const body = await request.json().catch(() => ({}))
    const { forceDate } = body // Optional: force a specific date for testing

    const anchorsCreated = await PropFirmAccountEvaluator.createDailyAnchors(undefined, forceDate)

    return NextResponse.json({
      success: true,
      message: `Manually created ${anchorsCreated} daily anchors`,
      anchorsCreated,
      forceDate: forceDate || null,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
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
