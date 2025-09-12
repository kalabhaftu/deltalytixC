"use server"

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserId } from '@/server/auth'

// GET /api/accounts - Get all accounts (both prop firm and live) - universally accessible
export async function GET(request: NextRequest) {
  try {
    // Add timeout for the entire operation
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), 8000) // 8 second timeout
    })

    const operationPromise = async () => {
      // Try to get user ID but don't fail if not authenticated since accounts are now universally accessible
      let currentUserId: string | null = null
      try {
        currentUserId = await getUserId()
      } catch (error) {
        // Continue without authentication - accounts are universally accessible
        console.log('No authentication provided, continuing with universal access')
      }

      // Fetch all accounts - made universally accessible to all users
      const accounts = await prisma.account.findMany({
        select: {
          id: true,
          number: true,
          name: true,
          propfirm: true,
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
          phases: {
            where: { phaseStatus: 'active' },
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: {
              id: true,
              phaseType: true,
              phaseStatus: true,
              profitTarget: true,
              phaseStartAt: true,
              currentEquity: true,
              currentBalance: true
            }
          },
          _count: {
            select: {
              trades: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      })

    // Transform accounts to include account type and ownership info
    const transformedAccounts = accounts.map(account => ({
      ...account,
      accountType: account.propfirm ? 'prop-firm' : 'live',
      displayName: account.name || account.number,
      currentPhase: account.phases[0] || null,
      tradeCount: account._count.trades,
      owner: account.user,
      isOwner: currentUserId === account.userId
    }))

      return NextResponse.json({
        success: true,
        data: transformedAccounts
      })
    }

    // Race between operation and timeout
    return await Promise.race([operationPromise(), timeoutPromise])

  } catch (error) {
    console.error('Error fetching accounts:', error)
    
    if (error instanceof Error && error.message === 'Request timeout') {
      return NextResponse.json(
        { success: false, error: 'Request timeout - please try again' },
        { status: 408 }
      )
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to fetch accounts' },
      { status: 500 }
    )
  }
}

// POST /api/accounts - Create a new live account
export async function POST(request: NextRequest) {
  try {
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
        // broker, // Temporarily disabled until database migration is complete
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
