import { NextRequest, NextResponse } from 'next/server'
import { PhaseEvaluationEngine } from '@/lib/prop-firm/phase-evaluation-engine'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/cron/evaluate-phases - Background evaluation for all active phases
 * Evaluates all active prop firm phase accounts and updates their status
 * Should be called hourly via cron job
 */
export async function GET(request: NextRequest) {
  try {

    // Get all active phase accounts
    const activePhases = await prisma.phaseAccount.findMany({
      where: {
        status: 'active',
        masterAccount: {
          isActive: true
        }
      },
      include: {
        masterAccount: {
          select: {
            id: true,
            accountName: true,
            isActive: true
          }
        }
      }
    })

    let evaluated = 0
    let failed = 0
    let passed = 0
    let errors: string[] = []

    // Evaluate each active phase
    for (const phase of activePhases) {
      try {
        const evaluation = await PhaseEvaluationEngine.evaluatePhase(
          phase.masterAccountId,
          phase.id
        )

        evaluated++

        // If account failed, mark phase and master account as failed, and record breach
        if (evaluation.isFailed) {
          await prisma.$transaction([
            prisma.phaseAccount.update({
              where: { id: phase.id },
              data: {
                status: 'failed',
                endDate: new Date()
              }
            }),
            prisma.masterAccount.update({
              where: { id: phase.masterAccountId },
              data: { isActive: false }
            }),
            prisma.breachRecord.create({
              data: {
                phaseAccountId: phase.id,
                breachType: evaluation.drawdown.breachType || 'unknown',
                breachAmount: evaluation.drawdown.breachAmount || 0,
                breachTime: new Date(),
                currentEquity: evaluation.drawdown.currentEquity,
                accountSize: evaluation.drawdown.dailyStartBalance || 0,
                dailyStartBalance: evaluation.drawdown.dailyStartBalance,
                highWaterMark: evaluation.drawdown.highWaterMark,
                notes: `Auto-detected breach during background evaluation. ${evaluation.drawdown.breachType?.replace('_', ' ')} exceeded by $${evaluation.drawdown.breachAmount?.toFixed(2)}`
              }
            })
          ])

          failed++
        }

        // If account passed (profit target met), mark for manual phase progression
        // We don't auto-advance phases - user needs to manually provide next phase ID
        if (evaluation.isPassed && !evaluation.isFailed) {
          passed++
        }

      } catch (error) {
        const errorMsg = `Phase ${phase.id} (${phase.masterAccount.accountName}): ${error instanceof Error ? error.message : 'Unknown error'}`
        errors.push(errorMsg)
        console.error('[BACKGROUND_EVAL]', errorMsg)
      }
    }

    const result = {
      success: true,
      message: 'Background evaluation completed',
      totalPhases: activePhases.length,
      evaluated,
      failed,
      passed,
      active: evaluated - failed - passed,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString()
    }


    return NextResponse.json(result)

  } catch (error) {
    console.error('[BACKGROUND_EVAL] Fatal error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Background evaluation failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/cron/evaluate-phases - Manual trigger for testing
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { phaseAccountId, masterAccountId } = body

    // If specific phase/account provided, evaluate that only
    if (phaseAccountId && masterAccountId) {
      const evaluation = await PhaseEvaluationEngine.evaluatePhase(
        masterAccountId,
        phaseAccountId
      )

      // Update status if failed and record breach
      if (evaluation.isFailed) {
        await prisma.$transaction([
          prisma.phaseAccount.update({
            where: { id: phaseAccountId },
            data: {
              status: 'failed',
              endDate: new Date()
            }
          }),
          prisma.masterAccount.update({
            where: { id: masterAccountId },
            data: { isActive: false }
          }),
          prisma.breachRecord.create({
            data: {
              phaseAccountId,
              breachType: evaluation.drawdown.breachType || 'unknown',
              breachAmount: evaluation.drawdown.breachAmount || 0,
              breachTime: new Date(),
              currentEquity: evaluation.drawdown.currentEquity,
              accountSize: evaluation.drawdown.dailyStartBalance || 0,
              dailyStartBalance: evaluation.drawdown.dailyStartBalance,
              highWaterMark: evaluation.drawdown.highWaterMark,
              notes: `Manual evaluation triggered breach detection.`
            }
          })
        ])
      }

      return NextResponse.json({
        success: true,
        evaluation,
        timestamp: new Date().toISOString()
      })
    }

    // Otherwise, trigger full evaluation run
    const cronResponse = await GET(request)
    return cronResponse

  } catch (error) {
    console.error('[BACKGROUND_EVAL] Manual trigger error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Manual evaluation failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

