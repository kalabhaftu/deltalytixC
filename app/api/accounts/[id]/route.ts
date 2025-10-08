import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { getUserId } from '@/server/auth'

interface RouteParams {
  params: {
    id: string
  }
}

// GET /api/accounts/[id] - Get specific account with calculated metrics
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = await getUserId()
    const resolvedParams = await params
    const accountId = resolvedParams.id

    const account = await prisma.account.findFirst({
      where: {
        id: accountId,
        userId,
      },
      include: {
        _count: {
          select: {
            trades: true
          }
        }
      }
    })

    if (!account) {
      return NextResponse.json(
        { success: false, error: 'Account not found' },
        { status: 404 }
      )
    }

    // Fetch trades to calculate profitLoss and currentEquity
    const trades = await prisma.trade.findMany({
      where: {
        accountId: account.id,
      },
      select: {
        pnl: true,
        commission: true,
        swap: true,
        entryDate: true,
      },
      orderBy: {
        entryDate: 'desc'
      }
    })

    // Calculate profitLoss (net of commissions and swap)
    const profitLoss = trades.reduce((sum, trade) => {
      const netPnL = trade.pnl - (trade.commission || 0) - (trade.swap || 0)
      return sum + netPnL
    }, 0)

    // Calculate current equity
    const currentEquity = account.startingBalance + profitLoss

    // Get last trade date
    const lastTradeDate = trades.length > 0 ? trades[0].entryDate : null

    // Transform account data
    const transformedAccount = {
      id: account.id,
      number: account.number,
      name: account.name,
      broker: account.broker,
      accountType: 'live',
      displayName: account.name || account.number,
      startingBalance: account.startingBalance,
      currentEquity,
      profitLoss,
      status: 'active',
      tradeCount: account._count.trades,
      lastTradeDate,
      createdAt: account.createdAt,
    }

    return NextResponse.json({
      success: true,
      data: transformedAccount
    })

  } catch (error) {
    console.error('Error fetching account:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch account' },
      { status: 500 }
    )
  }
}

// PATCH /api/accounts/[id] - Update account
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = await getUserId()
    const resolvedParams = await params
    const accountId = resolvedParams.id
    const body = await request.json()

    const { name, broker } = body

    // Validate required fields
    if (!name || !broker) {
      return NextResponse.json(
        { success: false, error: 'Name and broker are required' },
        { status: 400 }
      )
    }

    // Check if account exists and belongs to user
    const existingAccount = await prisma.account.findFirst({
      where: {
        id: accountId,
        userId,
      }
    })

    if (!existingAccount) {
      return NextResponse.json(
        { success: false, error: 'Account not found' },
        { status: 404 }
      )
    }

    // Update account
    const updatedAccount = await prisma.account.update({
      where: {
        id: accountId,
      },
      data: {
        name: name.trim(),
        broker: broker.trim(),
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        id: updatedAccount.id,
        number: updatedAccount.number,
        name: updatedAccount.name,
        broker: updatedAccount.broker,
        displayName: updatedAccount.name || updatedAccount.number,
        startingBalance: updatedAccount.startingBalance,
      }
    })

  } catch (error) {
    console.error('Error updating account:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update account' },
      { status: 500 }
    )
  }
}

// DELETE /api/accounts/[id] - Delete account
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = await getUserId()
    const resolvedParams = await params
    const accountId = resolvedParams.id

    // Check if account exists and belongs to user
    const existingAccount = await prisma.account.findFirst({
      where: {
        id: accountId,
        userId,
      }
    })

    if (!existingAccount) {
      return NextResponse.json(
        { success: false, error: 'Account not found' },
        { status: 404 }
      )
    }

    // Delete account - Prisma cascade will automatically delete all linked trades
    await prisma.account.delete({
      where: {
        id: accountId,
      }
    })

    // Invalidate all cache tags to ensure fresh data
    const { invalidateUserCaches } = await import('@/server/accounts')
    await invalidateUserCaches(userId)

    return NextResponse.json({
      success: true,
      message: 'Account and all associated trades deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting account:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete account' },
      { status: 500 }
    )
  }
}


