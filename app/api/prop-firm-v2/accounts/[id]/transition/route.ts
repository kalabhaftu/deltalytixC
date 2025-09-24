/**
 * Prop Firm Account Transition API
 * POST /api/prop-firm-v2/accounts/[id]/transition - Transition account to next phase
 */

import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getUserId } from '@/server/auth-utils'

const prisma = new PrismaClient()

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getUserId()
    const resolvedParams = await params
    const accountId = resolvedParams.id

    // Parse request body
    const { reason, forceTransition } = await request.json()

    // Get the account with current phase
    const account = await prisma.account.findFirst({
      where: {
        id: accountId,
        userId,
        propfirm: { not: '' } // Only prop firm accounts
      },
      include: {
        phases: {
          where: { phaseStatus: 'active' },
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    })

    if (!account) {
      return NextResponse.json(
        { error: 'Account not found or access denied' },
        { status: 404 }
      )
    }

    const currentPhase = account.phases?.[0]

    // Simple phase transition logic
    if (!currentPhase) {
      return NextResponse.json(
        { error: 'No active phase found for this account' },
        { status: 400 }
      )
    }

    // Get next phase type
    let nextPhaseType: 'phase_1' | 'phase_2' | 'funded' = 'phase_1'
    if (currentPhase.phaseType === 'phase_1') {
      nextPhaseType = 'phase_2'
    } else if (currentPhase.phaseType === 'phase_2') {
      nextPhaseType = 'funded'
    } else {
      return NextResponse.json(
        { error: 'Account is already in funded phase' },
        { status: 400 }
      )
    }

    // Create next phase
    const nextPhase = await prisma.accountPhase.create({
      data: {
        accountId: account.id,
        phaseType: nextPhaseType,
        phaseStatus: 'active',
        profitTarget: nextPhaseType === 'phase_2' || nextPhaseType === 'funded'
          ? (account.startingBalance * 0.05) // 5% for phase 2 and funded
          : (account.startingBalance * 0.1), // 10% for phase 1
        currentEquity: account.startingBalance,
        currentBalance: account.startingBalance,
        netProfitSincePhaseStart: 0,
        highestEquitySincePhaseStart: account.startingBalance,
        totalTrades: 0,
        winningTrades: 0,
        totalCommission: 0,
      }
    })

    // Update current phase to completed
    await prisma.accountPhase.update({
      where: { id: currentPhase.id },
      data: {
        phaseStatus: 'passed',
        phaseEndAt: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      message: `Account transitioned from ${currentPhase.phaseType} to ${nextPhaseType}`,
      newPhase: nextPhase,
      updatedAccount: account
    })

  } catch (error) {
    console.error('Error transitioning prop firm account:', error)
    return NextResponse.json(
      { error: 'Failed to transition account', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}
