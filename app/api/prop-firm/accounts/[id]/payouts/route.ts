/**
 * Payout Management API
 * GET /api/prop-firm/accounts/[id]/payouts - Get payout eligibility and history
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUserId } from '@/server/auth-utils'
import { prisma } from '@/lib/prisma'

interface RouteParams {
  params: Promise<{ id: string }>
}

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

    // Get account and calculate eligibility
    const masterAccount = await prisma.masterAccount.findFirst({
      where: { id: masterAccountId, userId },
      include: {
        PhaseAccount: {
          where: { status: { in: ['active', 'passed', 'archived'] } },
          include: { 
            Trade: {
              select: {
                pnl: true,
                commission: true,
                exitTime: true
              }
            }
          },
          orderBy: { phaseNumber: 'asc' }
        }
      }
    })

    if (!masterAccount) {
      return NextResponse.json(
        { success: false, error: 'Account not found' },
        { status: 404 }
      )
    }

    // Get current phase
    const currentPhase = masterAccount.PhaseAccount.find(p => p.phaseNumber === masterAccount.currentPhase)
    const isFunded = currentPhase && isFundedPhase(masterAccount.evaluationType, currentPhase.phaseNumber)

    let eligibility = null
    
    if (isFunded && currentPhase) {
      // Calculate basic eligibility
      const fundedDate = currentPhase.startDate
      const daysSinceFunded = Math.floor((Date.now() - fundedDate.getTime()) / (1000 * 60 * 60 * 24))
      
      // Calculate net profit since funded
      const netProfit = currentPhase.Trade.reduce((sum, trade) => 
        sum + (trade.pnl || 0) - (trade.commission || 0), 0
      )
      
      // Basic eligibility rules (customize as needed)
      const minDaysRequired = 14
      const minProfit = 100 // Minimum profit for payout
      const isEligible = daysSinceFunded >= minDaysRequired && netProfit >= minProfit
      
      // Calculate profit split amount (assuming 80% trader split)
      const profitSplitPercent = currentPhase.profitSplitPercent || 80
      const profitSplitAmount = netProfit * (profitSplitPercent / 100)

      eligibility = {
        isEligible,
        daysSinceFunded,
        daysSinceLastPayout: daysSinceFunded, // Simplified - would track actual last payout
        netProfitSinceLastPayout: netProfit,
        minDaysRequired,
        profitSplitAmount,
        blockers: !isEligible ? [
          ...(daysSinceFunded < minDaysRequired ? [`Must wait ${minDaysRequired - daysSinceFunded} more days`] : []),
          ...(netProfit < minProfit ? [`Need $${minProfit - netProfit} more profit`] : [])
        ] : []
      }
    }

    // Fetch actual payout history from database
    const payoutHistory = currentPhase ? await prisma.payout.findMany({
      where: {
        phaseAccountId: currentPhase.id
      },
      orderBy: {
        requestDate: 'desc'
      }
    }) : []

    return NextResponse.json({
      success: true,
      data: {
        eligibility,
        history: payoutHistory
      }
    })

  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch payout data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}