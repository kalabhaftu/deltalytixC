import { NextRequest, NextResponse } from 'next/server'
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
    const accountId = params.id

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
    const accountId = params.id
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
    const accountId = params.id

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

    // Delete account (this will cascade delete related data)
    await prisma.account.delete({
      where: {
        id: accountId,
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Account deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting account:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete account' },
      { status: 500 }
    )
  }
}


