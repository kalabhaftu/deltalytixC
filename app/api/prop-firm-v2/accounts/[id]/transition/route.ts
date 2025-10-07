/**
 * Phase Transition API
 * POST /api/prop-firm-v2/accounts/[id]/transition - Transition to the next phase
 */

import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getUserId } from '@/server/auth-utils'
import { z } from 'zod'

const prisma = new PrismaClient()

interface RouteParams {
  params: Promise<{ id: string }>
}

// Validation schema for phase transition
const PhaseTransitionSchema = z.object({
  nextPhaseId: z.string().min(1, 'Next phase ID is required')
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
    // NO PARSING NEEDED - phase transition receives pure masterAccountId, not composite ID
    const body = await request.json()
    const { nextPhaseId } = PhaseTransitionSchema.parse(body)

    console.log(`[PHASE_TRANSITION] Looking for master account:`, {
      masterAccountId,
      userId,
      nextPhaseId
    })

    // Verify the master account belongs to the user
    const masterAccount = await prisma.masterAccount.findFirst({
      where: {
        id: masterAccountId,
        userId,
        isActive: true
      },
      include: {
        phases: {
          orderBy: { phaseNumber: 'asc' }
        }
      }
    })

    console.log(`[PHASE_TRANSITION] Master account lookup result:`, {
      found: !!masterAccount,
      accountId: masterAccount?.id,
      currentPhase: masterAccount?.currentPhase,
      phasesCount: masterAccount?.phases?.length
    })

    if (!masterAccount) {
      // Debug: Check if account exists without userId filter
      const anyAccount = await prisma.masterAccount.findUnique({
        where: { id: masterAccountId },
        select: { id: true, userId: true, accountName: true, isActive: true }
      })
      console.log(`[PHASE_TRANSITION] Account exists (no userId filter):`, anyAccount)
      
      return NextResponse.json(
        { success: false, error: 'Master account not found or unauthorized' },
        { status: 404 }
      )
    }

    // Find the current active phase
    const currentPhase = masterAccount.phases.find(phase => 
      phase.phaseNumber === masterAccount.currentPhase && phase.status === 'active'
    )

    if (!currentPhase) {
      return NextResponse.json(
        { success: false, error: 'No active phase found to transition from' },
        { status: 400 }
      )
    }

    // Determine the next phase number
    const nextPhaseNumber = masterAccount.currentPhase + 1
    
    // Find the next phase
    const nextPhase = masterAccount.phases.find(phase => 
      phase.phaseNumber === nextPhaseNumber
    )

    if (!nextPhase) {
      return NextResponse.json(
        { success: false, error: 'Next phase not found' },
        { status: 400 }
      )
    }

    // Perform the transition in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Mark the current phase as passed (not archived)
      await tx.phaseAccount.update({
        where: { id: currentPhase.id },
        data: {
          status: 'passed',
          endDate: new Date()
        }
      })

      // Activate the next phase and set its phaseId
      const updatedNextPhase = await tx.phaseAccount.update({
        where: { id: nextPhase.id },
        data: {
          status: 'active',
          phaseId: nextPhaseId,
          startDate: new Date()
        }
      })

      // Update the master account's current phase
      const updatedMasterAccount = await tx.masterAccount.update({
        where: { id: masterAccountId },
        data: {
          currentPhase: nextPhaseNumber
        }
      })

      return {
        masterAccount: updatedMasterAccount,
        previousPhase: currentPhase,
        currentPhase: updatedNextPhase
      }
    })

    return NextResponse.json({
      success: true,
      data: result,
      message: `Successfully transitioned to Phase ${nextPhaseNumber}`
    })

  } catch (error) {
    console.error('Error transitioning phase:', error)
    
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
        error: 'Failed to transition phase' 
      },
      { status: 500 }
    )
  }
}