import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * Create daily anchor for a specific phase account
 */
async function createDailyAnchor(phaseAccountId: string, timezone: string, forceDate?: Date) {
  const today = forceDate || new Date()
  
  // Get the date at midnight in the user's timezone
  const dateString = today.toLocaleDateString('en-CA', { timeZone: timezone }) // YYYY-MM-DD format
  const anchorDate = new Date(dateString + 'T00:00:00.000Z')

  // Check if anchor already exists for today
  const existingAnchor = await prisma.dailyAnchor.findUnique({
    where: {
      phaseAccountId_date: {
        phaseAccountId,
        date: anchorDate
      }
    }
  })

  if (existingAnchor) {
    return { created: false, reason: 'already_exists', anchor: existingAnchor }
  }

  // Get phase account with trades
  const phaseAccount = await prisma.phaseAccount.findFirst({
    where: { id: phaseAccountId },
    include: {
      MasterAccount: true,
      Trade: {
        where: { phaseAccountId },
        select: { pnl: true, commission: true }
      }
    }
  })

  if (!phaseAccount) {
    return { created: false, reason: 'phase_not_found' }
  }

  // Calculate current equity for anchor
  const totalPnL = phaseAccount.Trade.reduce((sum, trade) => {
    return sum + (trade.pnl - (trade.commission || 0))
  }, 0)
  const anchorEquity = phaseAccount.MasterAccount.accountSize + totalPnL

  // Create the anchor
  const anchor = await prisma.dailyAnchor.create({
    data: {
      id: crypto.randomUUID(),
      phaseAccountId,
      date: anchorDate,
      anchorEquity
    }
  })

  return { created: true, anchor }
}

/**
 * GET /api/cron/daily-anchors - Automated daily anchor creation
 * Creates daily anchors for all active prop firm phase accounts
 * Should be called daily via cron job (e.g., Vercel Cron at 00:01 UTC)
 */
export async function GET(request: NextRequest) {
  try {
    // Get all active phase accounts
    const activePhases = await prisma.phaseAccount.findMany({
      where: {
        status: 'active'
      },
      include: {
        MasterAccount: {
          include: {
            User: {
              select: {
                id: true,
                timezone: true
              }
            }
          }
        }
      }
    })

    let anchorsCreated = 0
    let anchorsSkipped = 0
    const errors: string[] = []

    // Create anchors for each active phase
    for (const phase of activePhases) {
      try {
        const timezone = phase.MasterAccount.User.timezone || 'UTC'
        const result = await createDailyAnchor(phase.id, timezone)
        
        if (result.created) {
          anchorsCreated++
        } else {
          anchorsSkipped++
        }
      } catch (error) {
        const errorMsg = `Phase ${phase.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
        errors.push(errorMsg)
        console.error('[DAILY_ANCHORS]', errorMsg)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Daily anchors created successfully`,
      anchorsCreated,
      anchorsSkipped,
      totalPhases: activePhases.length,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('[DAILY_ANCHORS] Fatal error:', error)
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
 * Allows manual execution with optional date override
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { forceDate, phaseAccountId } = body

    const targetDate = forceDate ? new Date(forceDate) : undefined

    // If specific phase provided, create for that phase only
    if (phaseAccountId) {
      const phaseAccount = await prisma.phaseAccount.findFirst({
        where: { id: phaseAccountId },
        include: {
          MasterAccount: {
            include: {
              User: { select: { timezone: true } }
            }
          }
        }
      })

      if (!phaseAccount) {
        return NextResponse.json(
          { success: false, error: 'Phase account not found' },
          { status: 404 }
        )
      }

      const timezone = phaseAccount.MasterAccount.User.timezone || 'UTC'
      const result = await createDailyAnchor(phaseAccountId, timezone, targetDate)

      return NextResponse.json({
        success: true,
        result,
        timestamp: new Date().toISOString()
      })
    }

    // Otherwise, trigger full cron run
    const cronResponse = await GET(request)
    return cronResponse

  } catch (error) {
    console.error('[DAILY_ANCHORS] Manual trigger error:', error)
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
