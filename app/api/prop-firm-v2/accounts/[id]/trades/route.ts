/**
 * Phase Account Trades API
 * POST /api/prop-firm-v2/accounts/[id]/trades - Add a trade to the current active phase
 * GET /api/prop-firm-v2/accounts/[id]/trades - Get all trades for the master account
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUserId } from '@/server/auth-utils'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

interface RouteParams {
  params: Promise<{ id: string }>
}

// Validation schema for adding a trade
const AddTradeSchema = z.object({
  accountNumber: z.string(),
  quantity: z.number(),
  instrument: z.string(),
  entryPrice: z.string(),
  closePrice: z.string(),
  entryDate: z.string(),
  closeDate: z.string(),
  pnl: z.number(),
  commission: z.number().default(0),
  side: z.string().optional(),
  comment: z.string().optional(),
  symbol: z.string().optional(),
  entryTime: z.string().optional(),
  exitTime: z.string().optional()
})

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = await getUserId()
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id: masterAccountId } = await params
    // ID is pure masterAccountId (UUID), not composite
    const body = await request.json()
    const tradeData = AddTradeSchema.parse(body)

    // Get the master account with its phases
    const masterAccount = await prisma.masterAccount.findFirst({
      where: {
        id: masterAccountId,
        userId
      },
      include: {
        PhaseAccount: true
      }
    })

    if (!masterAccount) {
      return NextResponse.json(
        { success: false, error: 'Master account not found or unauthorized' },
        { status: 404 }
      )
    }

    // Find the current phase (regardless of status)
    const currentPhase = masterAccount.PhaseAccount.find(phase => 
      phase.phaseNumber === masterAccount.currentPhase
    )

    if (!currentPhase) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'No phase found for the current phase number. Please check your account configuration.' 
        },
        { status: 400 }
      )
    }
    
    // Don't allow adding trades to failed or archived phases
    if (currentPhase.status === 'failed' || currentPhase.status === 'archived') {
      return NextResponse.json(
        { 
          success: false, 
          error: `Cannot add trades to a ${currentPhase.status} phase. This phase is no longer active.` 
        },
        { status: 403 }
      )
    }

    // Check if the phase account has a phaseId set
    if (!currentPhase.phaseId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Please set the ID for the current phase before adding trades.' 
        },
        { status: 403 }
      )
    }

    // Create the trade
    const trade = await prisma.trade.create({
      data: {
        id: crypto.randomUUID(),
        ...tradeData,
        userId,
        phaseAccountId: currentPhase.id,
        accountNumber: currentPhase.phaseId, // Use the phase account ID as account number
        entryTime: tradeData.entryTime ? new Date(tradeData.entryTime) : null,
        exitTime: tradeData.exitTime ? new Date(tradeData.exitTime) : null
      }
    })

    // CRITICAL: Evaluate phase after trade is added and WAIT for result
    // This ensures client gets updated phase status immediately
    let evaluationResult = null
    try {
      const { PhaseEvaluationEngine } = await import('@/lib/prop-firm/phase-evaluation-engine')
      
      // Await evaluation to get result before sending response
      evaluationResult = await PhaseEvaluationEngine.evaluatePhase(masterAccountId, currentPhase.id)
      
      if (evaluationResult.isFailed) {
        console.log(`[TRADES_API] Phase failed after trade added - updating status`)
        
        await prisma.$transaction(async (tx) => {
          await tx.phaseAccount.update({
            where: { id: currentPhase.id },
            data: { status: 'failed', endDate: new Date() }
          })
          await tx.masterAccount.update({
            where: { id: masterAccountId },
            data: { isActive: false }
          })
        })
        
        // Invalidate cache
        const { revalidateTag } = await import('next/cache')
        revalidateTag(`accounts-${userId}`)
      }
    } catch (evalError) {
      console.error('[TRADES_API] Error evaluating phase:', evalError)
      // Don't fail the trade creation if evaluation fails
    }

    return NextResponse.json({
      success: true,
      data: trade,
      evaluation: evaluationResult ? {
        passed: !evaluationResult.isFailed,
        status: evaluationResult.isFailed ? 'failed' : 'active',
        drawdown: {
          isBreached: evaluationResult.drawdown.isBreached,
          breachType: evaluationResult.drawdown.breachType,
          dailyDrawdownPercent: evaluationResult.drawdown.dailyDrawdownPercent,
          maxDrawdownPercent: evaluationResult.drawdown.maxDrawdownPercent
        },
        progress: {
          profitTargetPercent: evaluationResult.progress.profitTargetPercent,
          canPassPhase: evaluationResult.progress.canPassPhase
        }
      } : null,
      message: 'Trade added successfully'
    })

  } catch (error) {
    console.error('Error adding trade:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Validation failed',
          details: error.errors
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to add trade' 
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = await getUserId()
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id: masterAccountId } = await params
    // ID is pure masterAccountId (UUID), not composite
    const { searchParams } = new URL(request.url)
    
    // ✅ NEW: Support phase filtering via query params
    // ?phase=current (default) - only active phase
    // ?phase=all - all phases
    // ?phase=1 - specific phase number
    // ?phase=archived - only archived phases
    const phaseFilter = searchParams.get('phase') || 'current'

    // Verify the master account exists and belongs to the user
    const masterAccount = await prisma.masterAccount.findFirst({
      where: {
        id: masterAccountId,
        userId
      },
      include: {
        PhaseAccount: {
          include: {
            Trade: {
              orderBy: {
                exitTime: 'desc'
              }
            }
          }
        }
      }
    })

    if (!masterAccount) {
      return NextResponse.json(
        { success: false, error: 'Master account not found or unauthorized' },
        { status: 404 }
      )
    }

    // ✅ FIXED: Filter phases based on query parameter
    let phasesToInclude = masterAccount.PhaseAccount
    
    if (phaseFilter === 'current') {
      // Only show trades from the current phase (regardless of status: active, passed, or failed)
      phasesToInclude = masterAccount.PhaseAccount.filter(phase => 
        phase.phaseNumber === masterAccount.currentPhase
      )
    } else if (phaseFilter === 'archived') {
      // Only show trades from archived phases
      phasesToInclude = masterAccount.PhaseAccount.filter(phase => phase.status === 'archived')
    } else if (phaseFilter !== 'all') {
      // Specific phase number requested
      const requestedPhaseNumber = parseInt(phaseFilter)
      if (!isNaN(requestedPhaseNumber)) {
        phasesToInclude = masterAccount.PhaseAccount.filter(phase => phase.phaseNumber === requestedPhaseNumber)
      }
    }
    // else: phaseFilter === 'all', use all phases

    // Flatten trades from filtered phases
    const trades = phasesToInclude.flatMap(phase => 
      phase.Trade.map(trade => ({
        ...trade,
        phase: {
          id: phase.id,
          phaseNumber: phase.phaseNumber,
          phaseId: phase.phaseId,
          status: phase.status
        }
      }))
    )

    return NextResponse.json({
      success: true,
      data: {
        masterAccount: {
          id: masterAccount.id,
          accountName: masterAccount.accountName,
          propFirmName: masterAccount.propFirmName,
          currentPhase: masterAccount.currentPhase
        },
        trades,
        filter: {
          applied: phaseFilter,
          availablePhases: masterAccount.PhaseAccount.map(p => ({
            phaseNumber: p.phaseNumber,
            status: p.status,
            tradeCount: p.Trade.length
          }))
        }
      }
    })

  } catch (error) {
    console.error('Error fetching trades:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch trades' 
      },
      { status: 500 }
    )
  }
}