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
            Trade: true
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
        entryDate: true,
      },
      orderBy: {
        entryDate: 'desc'
      }
    })

    // Fetch transactions (deposits/withdrawals)
    const transactions = await prisma.liveAccountTransaction.findMany({
      where: {
        accountId: account.id,
      },
      select: {
        amount: true,
      }
    })

    // Calculate profitLoss (net of commissions)
    const profitLoss = trades.reduce((sum, trade) => {
      const netPnL = trade.pnl - (trade.commission || 0)
      return sum + netPnL
    }, 0)

    // Calculate total transactions (deposits are positive, withdrawals are negative)
    const totalTransactions = transactions.reduce((sum, tx) => sum + tx.amount, 0)

    // Calculate current equity including transactions
    const currentEquity = account.startingBalance + profitLoss + totalTransactions

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
      tradeCount: account._count.Trade,
      lastTradeDate,
      createdAt: account.createdAt,
    }

    return NextResponse.json({
      success: true,
      data: transformedAccount
    })

  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch account' },
      { status: 500 }
    )
  }
}

// PATCH /api/accounts/[id] - Update account (edit details or archive/unarchive)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = await getUserId()
    const resolvedParams = await params
    const accountId = resolvedParams.id
    const body = await request.json()

    const { name, broker, isArchived } = body

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

    // Build update data object
    const updateData: any = {}
    
    // If archiving/unarchiving (isArchived is explicitly provided)
    if (typeof isArchived === 'boolean') {
      updateData.isArchived = isArchived
    }
    
    // If updating name/broker (for edit account)
    if (name !== undefined || broker !== undefined) {
      // Validate required fields for account edit
      if (!name || !broker) {
        return NextResponse.json(
          { success: false, error: 'Name and broker are required for account updates' },
          { status: 400 }
        )
      }
      updateData.name = name.trim()
      updateData.broker = broker.trim()
    }

    // Update account
    const updatedAccount = await prisma.account.update({
      where: {
        id: accountId,
      },
      data: updateData
    })

    // Invalidate caches after archiving/unarchiving to refresh dashboard
    if (typeof isArchived === 'boolean') {
      const { invalidateUserCaches } = await import('@/server/accounts')
      await invalidateUserCaches(userId)
    }

    return NextResponse.json({
      success: true,
      data: {
        id: updatedAccount.id,
        number: updatedAccount.number,
        name: updatedAccount.name,
        broker: updatedAccount.broker,
        displayName: updatedAccount.name || updatedAccount.number,
        startingBalance: updatedAccount.startingBalance,
        isArchived: updatedAccount.isArchived,
      }
    })

  } catch (error) {
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
    return NextResponse.json(
      { success: false, error: 'Failed to delete account' },
      { status: 500 }
    )
  }
}


