/**
 * Phase Account Trades API
 * POST /api/prop-firm-v2/accounts/[id]/trades - Add a trade to the current active phase
 * GET /api/prop-firm-v2/accounts/[id]/trades - Get all trades for the master account
 */

import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getUserId } from '@/server/auth-utils'
import { z } from 'zod'

const prisma = new PrismaClient()

interface RouteParams {
  params: { id: string }
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
  tags: z.array(z.string()).default([]),
  symbol: z.string().optional(),
  strategy: z.string().optional(),
  fees: z.number().default(0),
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

    const masterAccountId = params.id
    const body = await request.json()
    const tradeData = AddTradeSchema.parse(body)

    // Get the master account with its phases
    const masterAccount = await prisma.masterAccount.findFirst({
      where: {
        id: masterAccountId,
        userId
      },
      include: {
        phases: true
      }
    })

    if (!masterAccount) {
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
        { 
          success: false, 
          error: 'No active phase found. Please ensure you have an active trading phase.' 
        },
        { status: 400 }
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
        ...tradeData,
        userId,
        phaseAccountId: currentPhase.id,
        accountNumber: currentPhase.phaseId, // Use the phase account ID as account number
        entryTime: tradeData.entryTime ? new Date(tradeData.entryTime) : null,
        exitTime: tradeData.exitTime ? new Date(tradeData.exitTime) : null,
        realizedPnl: tradeData.pnl
      }
    })

    return NextResponse.json({
      success: true,
      data: trade,
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

    const masterAccountId = params.id

    // Verify the master account exists and belongs to the user
    const masterAccount = await prisma.masterAccount.findFirst({
      where: {
        id: masterAccountId,
        userId
      },
      include: {
        phases: {
          include: {
            trades: {
              orderBy: {
                entryTime: 'desc'
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

    // Flatten all trades from all phases
    const allTrades = masterAccount.phases.flatMap(phase => 
      phase.trades.map(trade => ({
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
        trades: allTrades
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