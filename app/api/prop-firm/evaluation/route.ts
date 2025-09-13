import { NextRequest, NextResponse } from 'next/server'
import { getUserId } from '@/server/auth'
import { PropFirmAccountEvaluator } from '@/lib/prop-firm/account-evaluation'
import { logger } from '@/lib/logger'

/**
 * POST /api/prop-firm/evaluation - Manually trigger account evaluation
 * This endpoint allows manual re-evaluation of all prop firm accounts for a user
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const { accountId } = body

    if (accountId) {
      // Evaluate specific account
      const statusUpdate = await PropFirmAccountEvaluator.updateAccountStatus(accountId)
      
      return NextResponse.json({
        success: true,
        message: 'Account evaluation completed',
        statusUpdate
      })
    } else {
      // This would require implementing a method to evaluate all user accounts
      // For now, return an error asking for specific accountId
      return NextResponse.json({
        error: 'accountId is required for manual evaluation'
      }, { status: 400 })
    }

  } catch (error) {
    logger.error('Manual account evaluation failed', error, 'PropFirmEvaluation')
    
    return NextResponse.json(
      { 
        error: 'Evaluation failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/prop-firm/evaluation/daily-anchors - Create daily anchors for today
 * This endpoint is used by cron jobs to create daily anchors
 */
export async function GET(request: NextRequest) {
  try {
    // Check if this is a cron job or authenticated user
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    let userId: string | undefined
    
    if (authHeader === `Bearer ${cronSecret}` && cronSecret) {
      // Cron job - process all users
      userId = undefined
    } else {
      // Regular user request - only process their accounts
      userId = await getUserId()
      if (!userId) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      }
    }

    const count = await PropFirmAccountEvaluator.createDailyAnchors(userId)
    
    return NextResponse.json({
      success: true,
      message: `Created ${count} daily anchors`,
      count
    })

  } catch (error) {
    logger.error('Daily anchor creation failed', error, 'PropFirmEvaluation')
    
    return NextResponse.json(
      { 
        error: 'Daily anchor creation failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}
