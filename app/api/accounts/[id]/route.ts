import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { getUserId } from '@/server/auth'

interface RouteParams {
  params: {
    id: string
  }
}

// GET /api/accounts/[id] - Get specific account
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = await getUserId()
    const resolvedParams = await params
    const accountId = resolvedParams.id

    const account = await prisma.account.findFirst({
      where: {
        id: accountId,
        userId,
      }
    })

    if (!account) {
      return NextResponse.json(
        { success: false, error: 'Account not found' },
        { status: 404 }
      )
    }

    // Transform account data
    const transformedAccount = {
      id: account.id,
      number: account.number,
      name: account.name,
      broker: account.broker,
      propfirm: account.propfirm,
      accountType: account.propfirm ? 'prop-firm' : 'live',
      displayName: account.name || account.number,
      startingBalance: account.startingBalance,
      status: 'active',
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

    // Delete account and clean up orphaned trades in a transaction
    await prisma.$transaction(async (tx) => {
      // First, delete any orphaned trades that might only be linked by accountNumber
      // but not by accountId (to handle legacy data)
      await tx.trade.deleteMany({
        where: {
          accountNumber: existingAccount.number,
          userId: userId,
        }
      })

      // Then delete the account (this will cascade delete trades linked by accountId)
      await tx.account.delete({
        where: {
          id: accountId,
        }
      })
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


