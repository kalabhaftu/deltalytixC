import { NextRequest, NextResponse } from 'next/server'
import { getUserId } from '@/server/auth'
import { prisma } from '@/lib/prisma'

// POST /api/prop-firm/daily-anchors - Create missing daily anchors for today
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const today = new Date()
    const todayStr = today.toISOString().split('T')[0] // YYYY-MM-DD format

    // Get all prop firm accounts for this user
    const accounts = await prisma.account.findMany({
      where: {
        userId,
        propfirm: { not: '' } // Only prop firm accounts
      },
      include: {
        phases: {
          where: { phaseStatus: 'active' },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            currentEquity: true,
            currentBalance: true
          }
        },
        dailyAnchors: {
          where: { date: new Date(todayStr) },
          select: { id: true }
        }
      }
    })

    // Filter accounts that don't have today's anchor
    const accountsNeedingAnchors = accounts.filter(account => 
      account.dailyAnchors.length === 0
    )

    if (accountsNeedingAnchors.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'All accounts already have daily anchors for today',
        created: 0
      })
    }

    // Create daily anchors for accounts that need them
    const anchorsToCreate = accountsNeedingAnchors.map(account => {
      const currentPhase = account.phases[0]
      const anchorEquity = currentPhase?.currentEquity || account.startingBalance

      return {
        accountId: account.id,
        date: new Date(todayStr),
        anchorEquity
      }
    })

    const createdAnchors = await prisma.dailyAnchor.createMany({
      data: anchorsToCreate,
      skipDuplicates: true
    })

    return NextResponse.json({
      success: true,
      message: `Created ${createdAnchors.count} daily anchors for today`,
      created: createdAnchors.count,
      date: todayStr
    })

  } catch (error) {
    console.error('[Daily Anchors API] Error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create daily anchors',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    )
  }
}

// GET /api/prop-firm/daily-anchors - Get daily anchors for user's accounts
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0]

    const anchors = await prisma.dailyAnchor.findMany({
      where: {
        account: { userId },
        date: new Date(date)
      },
      include: {
        account: {
          select: {
            id: true,
            number: true,
            name: true
          }
        }
      },
      orderBy: { account: { number: 'asc' } }
    })

    return NextResponse.json({
      success: true,
      data: anchors,
      date
    })

  } catch (error) {
    console.error('[Daily Anchors API] Error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch daily anchors',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    )
  }
}
