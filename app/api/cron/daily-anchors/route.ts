/**
 * Daily Anchors Cron Job
 * Processes daily equity anchors for drawdown calculation
 * Runs daily to update anchor points at each account's daily reset time
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { PropFirmBusinessRules } from '@/lib/prop-firm/business-rules'
import { format, parseISO, addDays } from 'date-fns'
import { toZonedTime, fromZonedTime } from 'date-fns-tz'

// POST /api/cron/daily-anchors - Process daily anchors
export async function POST(request: NextRequest) {
  try {
    // Verify this is a cron job (check for authorization header in production)
    const authHeader = request.headers.get('authorization')
    if (process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log('[Daily Anchors Cron] Starting daily anchor processing...')

    // Get all active accounts that need daily anchor processing
    const accounts = await prisma.account.findMany({
      where: {
        status: { in: ['active', 'funded'] }
      },
      include: {
        phases: {
          where: { phaseStatus: 'active' },
          take: 1
        },
        dailyAnchors: {
          orderBy: { date: 'desc' },
          take: 1
        },
        equitySnapshots: {
          orderBy: { timestamp: 'desc' },
          take: 1
        }
      }
    })

    console.log(`[Daily Anchors Cron] Found ${accounts.length} accounts to process`)

    const results = {
      processed: 0,
      anchorsCreated: 0,
      breachesDetected: 0,
      errors: [] as string[]
    }

    // Process each account
    for (const account of accounts) {
      try {
        const currentPhase = account.phases[0]
        if (!currentPhase) {
          console.log(`[Daily Anchors Cron] Skipping account ${account.number} - no active phase`)
          continue
        }

        // Calculate when daily reset should occur in account's timezone
        const accountTimezone = account.timezone || 'UTC'
        const resetTime = account.dailyResetTime || '00:00'
        const [hours, minutes] = resetTime.split(':').map(Number)

        // Get current time in account's timezone
        const now = new Date()
        const nowInAccountTz = toZonedTime(now, accountTimezone)
        
        // Create reset time for today in account's timezone
        const todayReset = new Date(nowInAccountTz)
        todayReset.setHours(hours, minutes, 0, 0)

        // Check if we've passed the reset time today
        const shouldCreateAnchor = nowInAccountTz >= todayReset

        // Check if we already have an anchor for today
        const latestAnchor = account.dailyAnchors[0]
        const todayDate = format(todayReset, 'yyyy-MM-dd')
        const hasAnchorForToday = latestAnchor && 
          format(latestAnchor.date, 'yyyy-MM-dd') === todayDate

        if (!shouldCreateAnchor || hasAnchorForToday) {
          console.log(`[Daily Anchors Cron] Skipping account ${account.number} - not time yet or already processed`)
          continue
        }

        // Get current equity from latest snapshot or calculate from phase
        const latestSnapshot = account.equitySnapshots[0]
        const currentEquity = latestSnapshot?.equity || currentPhase.currentEquity

        // Create daily anchor
        await prisma.$transaction(async (tx) => {
          // Create the daily anchor
          await tx.dailyAnchor.create({
            data: {
              accountId: account.id,
              date: todayReset,
              anchorEquity: currentEquity,
            }
          })

          console.log(`[Daily Anchors Cron] Created anchor for account ${account.number}: ${currentEquity}`)
          results.anchorsCreated++

          // Check for breaches with the new anchor
          const yesterdayAnchor = await tx.dailyAnchor.findFirst({
            where: {
              accountId: account.id,
              date: {
                lt: todayReset,
                gte: addDays(todayReset, -1)
              }
            },
            orderBy: { date: 'desc' }
          })

          const dailyStartBalance = yesterdayAnchor?.anchorEquity || account.startingBalance

          // Calculate drawdown
          const drawdown = PropFirmBusinessRules.calculateDrawdown(
            account as any,
            currentPhase as any,
            currentEquity,
            dailyStartBalance,
            currentPhase.highestEquitySincePhaseStart || account.startingBalance
          )

          // Create breach if detected
          if (drawdown.isBreached) {
            console.log(`[Daily Anchors Cron] Breach detected for account ${account.number}`)

            await tx.breach.create({
              data: {
                accountId: account.id,
                phaseId: currentPhase.id,
                breachType: drawdown.breachType!,
                breachAmount: drawdown.breachAmount!,
                breachThreshold: drawdown.breachType === 'daily_drawdown' 
                  ? (account.dailyDrawdownAmount || 0)
                  : (account.maxDrawdownAmount || 0),
                equity: currentEquity,
                description: `Daily anchor check breach: ${drawdown.breachType}`
              }
            })

            // Mark account and phase as failed
            await tx.account.update({
              where: { id: account.id },
              data: { status: 'failed' }
            })

            await tx.accountPhase.update({
              where: { id: currentPhase.id },
              data: { 
                phaseStatus: 'failed',
                phaseEndAt: new Date()
              }
            })

            // Create transition record
            await tx.accountTransition.create({
              data: {
                accountId: account.id,
                fromPhaseId: currentPhase.id,
                fromStatus: 'active',
                toStatus: 'failed',
                reason: `Automatic breach detection: ${drawdown.breachType}`,
                metadata: {
                  breachType: drawdown.breachType,
                  breachAmount: drawdown.breachAmount,
                  anchorEquity: currentEquity,
                  dailyStartBalance,
                  automaticDetection: true
                }
              }
            })

            results.breachesDetected++
          }

          // Update phase with latest equity
          await tx.accountPhase.update({
            where: { id: currentPhase.id },
            data: {
              currentEquity,
              // Update highest equity if applicable
              highestEquitySincePhaseStart: Math.max(
                currentPhase.highestEquitySincePhaseStart || 0,
                currentEquity
              )
            }
          })
        })

        results.processed++

      } catch (error) {
        console.error(`[Daily Anchors Cron] Error processing account ${account.number}:`, error)
        results.errors.push(`Account ${account.number}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    console.log(`[Daily Anchors Cron] Processing complete:`, results)

    return NextResponse.json({
      success: true,
      data: results,
      message: `Processed ${results.processed} accounts, created ${results.anchorsCreated} anchors, detected ${results.breachesDetected} breaches`
    })

  } catch (error) {
    console.error('[Daily Anchors Cron] Fatal error:', error)
    return NextResponse.json(
      { error: 'Failed to process daily anchors' },
      { status: 500 }
    )
  }
}

// GET /api/cron/daily-anchors - Get cron job status (for monitoring)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('accountId')

    if (accountId) {
      // Get status for specific account
      const account = await prisma.account.findUnique({
        where: { id: accountId },
        include: {
          dailyAnchors: {
            orderBy: { date: 'desc' },
            take: 7
          },
          phases: {
            where: { phaseStatus: 'active' },
            take: 1
          }
        }
      })

      if (!account) {
        return NextResponse.json(
          { error: 'Account not found' },
          { status: 404 }
        )
      }

      const currentPhase = account.phases[0]
      const latestAnchor = account.dailyAnchors[0]

      // Calculate next anchor time
      const resetTime = account.dailyResetTime || '00:00'
      const [hours, minutes] = resetTime.split(':').map(Number)
      const now = new Date()
      const todayReset = new Date(now)
      todayReset.setHours(hours, minutes, 0, 0)
      
      const nextAnchor = now > todayReset 
        ? addDays(todayReset, 1)
        : todayReset

      return NextResponse.json({
        success: true,
        data: {
          account: {
            id: account.id,
            number: account.number,
            timezone: account.timezone,
            resetTime: account.dailyResetTime
          },
          currentPhase: currentPhase ? {
            id: currentPhase.id,
            type: currentPhase.phaseType,
            status: currentPhase.phaseStatus,
            equity: currentPhase.currentEquity
          } : null,
          latestAnchor: latestAnchor ? {
            date: latestAnchor.date,
            equity: latestAnchor.anchorEquity,
            computedAt: latestAnchor.computedAt
          } : null,
          nextAnchorTime: nextAnchor,
          anchorsLast7Days: account.dailyAnchors.map(anchor => ({
            date: anchor.date,
            equity: anchor.anchorEquity
          }))
        }
      })
    } else {
      // Get overall status
      const stats = await prisma.$queryRaw`
        SELECT 
          COUNT(*) as total_accounts,
          COUNT(CASE WHEN status IN ('active', 'funded') THEN 1 END) as active_accounts,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_accounts
        FROM "public"."Account"
      ` as { total_accounts: bigint, active_accounts: bigint, failed_accounts: bigint }[]

      const anchorStats = await prisma.$queryRaw`
        SELECT 
          COUNT(*) as total_anchors,
          COUNT(CASE WHEN date = CURRENT_DATE THEN 1 END) as todays_anchors,
          MAX(date) as latest_anchor_date
        FROM "public"."DailyAnchor"
      ` as { total_anchors: bigint, todays_anchors: bigint, latest_anchor_date: Date }[]

      return NextResponse.json({
        success: true,
        data: {
          accounts: {
            total: Number(stats[0]?.total_accounts || 0),
            active: Number(stats[0]?.active_accounts || 0),
            failed: Number(stats[0]?.failed_accounts || 0)
          },
          anchors: {
            total: Number(anchorStats[0]?.total_anchors || 0),
            today: Number(anchorStats[0]?.todays_anchors || 0),
            latestDate: anchorStats[0]?.latest_anchor_date
          },
          lastRunTime: new Date()
        }
      })
    }

  } catch (error) {
    console.error('[Daily Anchors Status] Error:', error)
    return NextResponse.json(
      { error: 'Failed to get cron status' },
      { status: 500 }
    )
  }
}

