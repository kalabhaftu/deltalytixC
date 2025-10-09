"use server"

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserId } from '@/server/auth'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/accounts/[id]/trades - Get all trades for a specific account
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = await getUserId()
    const resolvedParams = await params
    const accountId = resolvedParams.id

    // Verify account ownership
    const account = await prisma.account.findFirst({
      where: {
        id: accountId,
        userId,
      },
      select: {
        id: true,
        number: true
      }
    })

    if (!account) {
      return NextResponse.json(
        { success: false, error: 'Account not found' },
        { status: 404 }
      )
    }

    // Get all trades for this account
    const trades = await prisma.trade.findMany({
      where: {
        accountId: account.id,
      },
      select: {
        id: true,
        pnl: true,
        commission: true,
        entryDate: true,
        closeDate: true,
        instrument: true,
        side: true,
        quantity: true,
        entryPrice: true,
        closePrice: true,
        createdAt: true,
      },
      orderBy: {
        entryDate: 'desc'
      }
    })

    return NextResponse.json({
      success: true,
      data: trades
    })

  } catch (error) {
    console.error('Error fetching account trades:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch trades' },
      { status: 500 }
    )
  }
}

