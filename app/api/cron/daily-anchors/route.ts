/**
 * Daily Anchors Cron Job
 * Creates daily equity anchors for drawdown calculations
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { PropFirmBusinessRules } from '@/lib/prop-firm/business-rules'
import { addDays, startOfDay, endOfDay } from 'date-fns'

export async function POST(request: NextRequest) {
  try {
    console.log('[Daily Anchors Cron] Starting daily anchor computation')

    // Get all active accounts
    const accounts = await prisma.account.findMany({
      where: {
        status: { in: ['active', 'funded'] }
      },
      include: {
        phases: {
          where: { phaseStatus: 'active' },
          orderBy: { createdAt: 'desc' },
          take: 1
        },
        equitySnapshots: {
          orderBy: { timestamp: 'desc' },
          take: 1
        }
      }
    })

    const results = {
      accountsProcessed: 0,
      anchorsCreated: 0,
      breachesDetected: 0,
      errors: 0
    }

    for (const account of accounts) {
      try {
        const currentPhase = account.phases[0]
        if (!currentPhase) {
          console.log(`[Daily Anchors Cron] Account ${account.number} has no active phase, skipping`)
          continue
        }

        results.accountsProcessed++

        // Get account timezone and daily reset time
        const timezone = account.timezone || 'UTC'
        const dailyResetTime = account.dailyResetTime || '00:00'
        
        // Calculate today's reset time in account timezone
        const today = new Date()
        const todayReset = startOfDay(today)
        
        // Check if we already have an anchor for today
        const existingAnchor = await prisma.dailyAnchor.findFirst({
          where: {
            accountId: account.id,
            date: {
              gte: startOfDay(today),
              lte: endOfDay(today)
            }
          }
        })

        if (existingAnchor) {
          console.log(`[Daily Anchors Cron] Account ${account.number} already has anchor for today`)
          continue
        }

        // Get current equity from latest snapshot or phase
        const latestSnapshot = account.equitySnapshots[0]
        const currentEquity = latestSnapshot?.equity || currentPhase.currentEquity

        // Ensure current equity is valid
        if (isNaN(currentEquity) || !isFinite(currentEquity)) {
          console.warn(`[Daily Anchors Cron] Invalid equity for account ${account.number}: ${currentEquity}`)
          continue
        }

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

          // Ensure daily start balance is valid
          if (isNaN(dailyStartBalance) || !isFinite(dailyStartBalance)) {
            console.warn(`[Daily Anchors Cron] Invalid daily start balance for account ${account.number}: ${dailyStartBalance}`)
            return
          }

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
            // Check if we already have a recent breach for this account
            const recentBreach = await tx.breach.findFirst({
              where: {
                accountId: account.id,
                breachTime: {
                  gte: addDays(today, -1) // Only check for breaches in the last 24 hours
                },
                breachType: drawdown.breachType
              }
            })

            if (!recentBreach) {
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
                  description: `${drawdown.breachType} breach detected during daily anchor computation`
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

              console.log(`[Daily Anchors Cron] Breach detected for account ${account.number}: ${drawdown.breachType}`)
              results.breachesDetected++
            } else {
              console.log(`[Daily Anchors Cron] Recent breach already exists for account ${account.number}, skipping`)
            }
          }
        })

      } catch (error) {
        console.error(`[Daily Anchors Cron] Error processing account ${account.number}:`, error)
        results.errors++
      }
    }

    console.log(`[Daily Anchors Cron] Completed:`, results)

    return NextResponse.json({
      success: true,
      results
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

