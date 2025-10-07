/**
 * Payout Management API
 * GET /api/prop-firm-v2/accounts/[id]/payouts - Get payout eligibility and history
 */

import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getUserId } from '@/server/auth-utils'

const prisma = new PrismaClient()

interface RouteParams {
  params: Promise<{ id: string }>
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
        phases: {
          where: { status: { in: ['active', 'passed', 'archived'] } },
          include: { 
            trades: {
              select: {
                pnl: true,
                commission: true,
                fees: true,
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
    const currentPhase = masterAccount.phases.find(p => p.phaseNumber === masterAccount.currentPhase)
    const isFunded = currentPhase?.phaseNumber >= 3

    let eligibility = null
    
    if (isFunded && currentPhase) {
      // Calculate basic eligibility
      const fundedDate = currentPhase.startDate
      const daysSinceFunded = Math.floor((Date.now() - fundedDate.getTime()) / (1000 * 60 * 60 * 24))
      
      // Calculate net profit since funded
      const netProfit = currentPhase.trades.reduce((sum, trade) => 
        sum + (trade.pnl || 0) - (trade.commission || 0) - (trade.fees || 0), 0
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
    console.error('Error fetching payouts:', error)
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