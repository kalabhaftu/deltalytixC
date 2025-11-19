import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserId } from '@/server/auth'

// POST /api/live-accounts/[id]/transactions - Create deposit or withdrawal
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId()
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id: accountId } = await params
    const body = await request.json()
    const { type, amount, description } = body

    // Validate input
    if (!type || !amount) {
      return NextResponse.json(
        { success: false, error: 'Type and amount are required' },
        { status: 400 }
      )
    }

    if (!['DEPOSIT', 'WITHDRAWAL'].includes(type)) {
      return NextResponse.json(
        { success: false, error: 'Type must be DEPOSIT or WITHDRAWAL' },
        { status: 400 }
      )
    }

    const numericAmount = parseFloat(amount)
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Amount must be a positive number' },
        { status: 400 }
      )
    }

    // Validate minimum amounts
    if (type === 'DEPOSIT' && numericAmount < 5) {
      return NextResponse.json(
        { success: false, error: 'Minimum deposit amount is $5' },
        { status: 400 }
      )
    }

    if (type === 'WITHDRAWAL' && numericAmount < 10) {
      return NextResponse.json(
        { success: false, error: 'Minimum withdrawal amount is $10' },
        { status: 400 }
      )
    }

    // Verify account belongs to user
    const account = await prisma.account.findFirst({
      where: {
        id: accountId,
        userId
      }
    })

    if (!account) {
      return NextResponse.json(
        { success: false, error: 'Account not found' },
        { status: 404 }
      )
    }

    // For withdrawals, check if account has sufficient balance
    if (type === 'WITHDRAWAL') {
      // Calculate current balance including trades and previous transactions
      const trades = await prisma.trade.findMany({
        where: { accountNumber: account.number }
      })

      const transactions = await prisma.liveAccountTransaction.findMany({
        where: { accountId }
      })

      const totalPnL = trades.reduce((sum, trade) => sum + (trade.pnl - trade.commission), 0)
      const totalTransactions = transactions.reduce((sum, tx) => sum + tx.amount, 0)
      const currentBalance = account.startingBalance + totalPnL + totalTransactions

      if (currentBalance < numericAmount) {
        return NextResponse.json(
          { success: false, error: `Insufficient balance. Current balance: $${currentBalance.toFixed(2)}` },
          { status: 400 }
        )
      }
    }

    // Create transaction
    const transactionAmount = type === 'DEPOSIT' ? numericAmount : -numericAmount

    const transaction = await prisma.liveAccountTransaction.create({
      data: {
        id: crypto.randomUUID(),
        accountId,
        userId,
        type: type as 'DEPOSIT' | 'WITHDRAWAL',
        amount: transactionAmount,
        description: description || null
      }
    })

    return NextResponse.json({
      success: true,
      data: transaction
    })

  } catch (error) {
    console.error('Error creating transaction:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET /api/live-accounts/[id]/transactions - Get transaction history
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId()
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id: accountId } = await params

    // Verify account belongs to user
    const account = await prisma.account.findFirst({
      where: {
        id: accountId,
        userId
      }
    })

    if (!account) {
      return NextResponse.json(
        { success: false, error: 'Account not found' },
        { status: 404 }
      )
    }

    // Get transactions
    const transactions = await prisma.liveAccountTransaction.findMany({
      where: { accountId },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({
      success: true,
      data: transactions
    })

  } catch (error) {
    console.error('Error fetching transactions:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
