/**
 * Phase Transition API
 * POST /api/prop-firm/accounts/[id]/transition - Transition to the next phase
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUserId } from '@/server/auth-utils'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { revalidateTag } from 'next/cache'
// NOTE: Do NOT import triggerDataRefresh here - it's a client-only module ('use client')
// Use revalidateTag for cache invalidation instead

interface RouteParams {
  params: Promise<{ id: string }>
}

// Validation schema for phase transition
const PhaseTransitionSchema = z.object({
  nextPhaseId: z.string().min(1, 'Next phase ID is required')
})

/**
 * Helper function to determine if a phase number represents the funded stage
 * based on the evaluation type.
 */
function isFundedPhase(evaluationType: string, phaseNumber: number): boolean {
  switch (evaluationType) {
    case 'Two Step':
      return phaseNumber >= 3
    case 'One Step':
      return phaseNumber >= 2
    case 'Instant':
      return phaseNumber >= 1
    default:
      return phaseNumber >= 3 // Default to Two Step behavior
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const authUserId = await getUserId()
    if (!authUserId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // getUserId() returns Supabase auth_user_id, but MasterAccount.userId references User.id
    const user = await prisma.user.findUnique({
      where: { auth_user_id: authUserId },
      select: { id: true }
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    const { id: masterAccountId } = await params
    // NO PARSING NEEDED - phase transition receives pure masterAccountId, not composite ID
    const body = await request.json()
    const { nextPhaseId } = PhaseTransitionSchema.parse(body)


    // Verify the master account belongs to the user
    const masterAccount = await prisma.masterAccount.findFirst({
      where: {
        id: masterAccountId,
        userId: user.id,
        status: { not: 'failed' }
      },
      include: {
        PhaseAccount: {
          orderBy: { phaseNumber: 'asc' }
        }
      }
    })


    if (!masterAccount) {
      return NextResponse.json(
        { success: false, error: 'Master account not found or unauthorized' },
        { status: 404 }
      )
    }

    // Find the current phase (can be 'active' or 'pending_approval' if profit target was met)
    const currentPhase = masterAccount.PhaseAccount.find(phase => 
      phase.phaseNumber === masterAccount.currentPhase && 
      (phase.status === 'active' || phase.status === 'pending_approval')
    )

    if (!currentPhase) {
      return NextResponse.json(
        { success: false, error: 'No active or pending approval phase found to transition from' },
        { status: 400 }
      )
    }

    // Determine the next phase number
    const nextPhaseNumber = masterAccount.currentPhase + 1
    
    // Find the next phase
    const nextPhase = masterAccount.PhaseAccount.find(phase => 
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

      // Determine if the next phase is the funded phase based on evaluation type
      const isTransitioningToFunded = isFundedPhase(masterAccount.evaluationType, nextPhaseNumber)

      // Update the master account's current phase and status
      const updatedMasterAccount = await tx.masterAccount.update({
        where: { id: masterAccountId },
        data: {
          currentPhase: nextPhaseNumber,
          // Set status to 'funded' if transitioning to funded phase
          ...(isTransitioningToFunded && { status: 'funded' })
        }
      })

      return {
        masterAccount: updatedMasterAccount,
        previousPhase: currentPhase,
        currentPhase: updatedNextPhase
      }
    })

    // Determine display name for the next phase
    const nextPhaseName = isFundedPhase(masterAccount.evaluationType, nextPhaseNumber)
      ? 'Funded'
      : `Phase ${nextPhaseNumber}`

    // Invalidate cache so UI updates on refresh
    revalidateTag(`accounts-${user.id}`)
    // NOTE: Real-time refresh is handled client-side via polling or manual refresh
    // triggerDataRefresh cannot be used here as it's a client-only module

    return NextResponse.json({
      success: true,
      data: result,
      message: `Successfully transitioned to ${nextPhaseName}`
    })

  } catch (error) {
    console.error('Phase transition error:', error)
    
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
        error: error instanceof Error ? error.message : 'Failed to transition phase' 
      },
      { status: 500 }
    )
  }
}