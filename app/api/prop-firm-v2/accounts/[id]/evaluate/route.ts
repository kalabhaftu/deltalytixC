/**
 * Phase Evaluation API
 * POST /api/prop-firm-v2/accounts/[id]/evaluate - Evaluate current phase status
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUserId } from '@/server/auth-utils'
import { PhaseEvaluationEngine } from '@/lib/prop-firm/phase-evaluation-engine'
import { revalidateTag } from 'next/cache'
import { prisma } from '@/lib/prisma'

interface RouteParams {
  params: Promise<{ id: string }>
}

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

    // Verify the master account belongs to the user
    const masterAccount = await prisma.masterAccount.findFirst({
      where: {
        id: masterAccountId,
        userId,
        isActive: true
      },
      include: {
        PhaseAccount: {
          where: { status: 'active' },
          orderBy: { phaseNumber: 'asc' },
          take: 1
        }
      }
    })

    if (!masterAccount) {
      return NextResponse.json(
        { success: false, error: 'Master account not found or unauthorized' },
        { status: 404 }
      )
    }

    const activePhase = masterAccount.PhaseAccount[0]
    if (!activePhase) {
      return NextResponse.json(
        { success: false, error: 'No active phase found' },
        { status: 400 }
      )
    }

    // Evaluate the current phase using the new engine
    const evaluation = await PhaseEvaluationEngine.evaluatePhase(
      masterAccountId,
      activePhase.id
    )

    // If the phase failed, update the account status
    if (evaluation.isFailed) {
      await prisma.$transaction(async (tx) => {
        // Mark phase as failed
        await tx.phaseAccount.update({
          where: { id: activePhase.id },
          data: {
            status: 'failed',
            endDate: new Date()
          }
        })

        // Mark master account as inactive
        await tx.masterAccount.update({
          where: { id: masterAccountId },
          data: {
            isActive: false
          }
        })
      })
      
      // Invalidate cache when account status changes
      revalidateTag(`accounts-${userId}`)
    }

    return NextResponse.json({
      success: true,
      data: {
        masterAccountId,
        phaseAccountId: activePhase.id,
        phaseNumber: activePhase.phaseNumber,
        evaluation
      }
    })

  } catch (error) {
    console.error('Error evaluating phase:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to evaluate phase',
        details: error instanceof Error ? error.message : 'Unknown error'
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

    // Get the current evaluation status without triggering updates
    const masterAccount = await prisma.masterAccount.findFirst({
      where: {
        id: masterAccountId,
        userId
      },
      include: {
        PhaseAccount: {
          where: { status: 'active' },
          orderBy: { phaseNumber: 'asc' },
          take: 1
        }
      }
    })

    if (!masterAccount) {
      return NextResponse.json(
        { success: false, error: 'Master account not found' },
        { status: 404 }
      )
    }

    const activePhase = masterAccount.PhaseAccount[0]
    if (!activePhase) {
      return NextResponse.json(
        { success: false, error: 'No active phase found' },
        { status: 400 }
      )
    }

    // Evaluate the current phase using the new engine
    const evaluation = await PhaseEvaluationEngine.evaluatePhase(
      masterAccountId,
      activePhase.id
    )

    return NextResponse.json({
      success: true,
      data: {
        masterAccountId,
        phaseAccountId: activePhase.id,
        phaseNumber: activePhase.phaseNumber,
        evaluation
      }
    })

  } catch (error) {
    console.error('Error getting evaluation status:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to get evaluation status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
