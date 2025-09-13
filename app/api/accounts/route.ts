"use server"

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserId } from '@/server/auth'

// GET /api/accounts - Simplified and optimized accounts fetching
export async function GET(request: NextRequest) {
  try {
    // Get user ID using the proper auth function
    const currentUserId = await getUserId()

    // Simplified query - only fetch essential data for current user
    const accounts = await prisma.account.findMany({
      where: {
        userId: currentUserId
      },
      select: {
        id: true,
        number: true,
        name: true,
        propfirm: true,
        broker: true,
        startingBalance: true,
        createdAt: true,
        userId: true,
        groupId: true,
        group: {
          select: {
            id: true,
            name: true
          }
        },
        user: {
          select: {
            id: true,
            email: true
          }
        },
        // Simplified - only get trade count, phases loaded separately if needed
        _count: {
          select: {
            trades: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Transform accounts with minimal processing
    const transformedAccounts = accounts.map(account => ({
      id: account.id,
      number: account.number,
      name: account.name,
      propfirm: account.propfirm,
      broker: account.broker,
      startingBalance: account.startingBalance,
      createdAt: account.createdAt,
      userId: account.userId,
      groupId: account.groupId,
      group: account.group,
      accountType: account.propfirm ? 'prop-firm' : 'live',
      displayName: account.name || account.number,
      tradeCount: account._count.trades,
      owner: account.user,
      isOwner: currentUserId === account.userId,
      // Simplified - phases loaded separately for performance
      currentPhase: null
    }))

    return NextResponse.json({
      success: true,
      data: transformedAccounts
    })

  } catch (error) {
    console.error('Error fetching accounts:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch accounts' },
      { status: 500 }
    )
  }
}

// POST /api/accounts - Create a new live account
export async function POST(request: NextRequest) {
  try {
    // Get user ID using the proper auth function
    const userId = await getUserId()

    const body = await request.json()

    const { name, number, startingBalance, broker } = body

    // Validate required fields
    if (!name || !number || !startingBalance || !broker) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: name, number, startingBalance, broker' },
        { status: 400 }
      )
    }

    // Check if account number already exists for this user
    const existingAccount = await prisma.account.findFirst({
      where: {
        number,
        userId,
      }
    })

    if (existingAccount) {
      return NextResponse.json(
        { success: false, error: 'Account number already exists' },
        { status: 409 }
      )
    }

    // Create live account
    const account = await prisma.account.create({
      data: {
        number,
        name,
        startingBalance: parseFloat(startingBalance),
        broker,
        userId,
        propfirm: '', // Empty string indicates it's a live account
        // Set default values for live accounts
        drawdownThreshold: 0,
        profitTarget: 0,
        isPerformance: false,
        payoutCount: 0,
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        ...account,
        accountType: 'live',
        displayName: account.name || account.number
      }
    })

  } catch (error) {
    console.error('Error creating live account:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create account' },
      { status: 500 }
    )
  }
}
