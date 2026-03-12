import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserId } from '@/server/auth'
import { AccountFilterGear, DEFAULT_FILTER_Gear } from '@/types/account-filter-Gear'

// GET /api/Gear/account-filters - Get user's account filter Gear
export async function GET(request: NextRequest) {
  try {
    const authUserId = await getUserId()
    if (!authUserId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { auth_user_id: authUserId },
      select: { accountFilterSettings: true }
    })
    
    let Gear = DEFAULT_FILTER_Gear
    if (user?.accountFilterSettings) {
      try {
        const savedGear = JSON.parse(user.accountFilterSettings) as Partial<AccountFilterGear>
        Gear = {
          ...DEFAULT_FILTER_Gear,
          ...savedGear
        }
      } catch (error) {
        // Parse error, use defaults
      }
    }

    return NextResponse.json({
      success: true,
      data: Gear
    }, {
      headers: {
        'Cache-Control': 'private, max-age=10, stale-while-revalidate=30'
      }
    })

  } catch (error) {
    // Return defaults on error to prevent UI blocking
    return NextResponse.json({
      success: true,
      data: DEFAULT_FILTER_Gear
    }, {
      status: 200, // Return 200 with defaults rather than erroring
      headers: {
        'Cache-Control': 'no-store' // Don't cache errors
      }
    })
  }
}

// POST /api/Gear/account-filters - Update user's account filter Gear
export async function POST(request: NextRequest) {
  try {
    const authUserId = await getUserId()
    if (!authUserId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const Gear: AccountFilterGear = await request.json()
    Gear.updatedAt = new Date().toISOString()

    // Save to database - Prisma handles connection timeout
    await prisma.user.update({
      where: { auth_user_id: authUserId },
      data: {
        accountFilterSettings: JSON.stringify(Gear)
      }
    })

    return NextResponse.json({
      success: true,
      data: Gear
    }, {
      headers: {
        'Cache-Control': 'no-store' // Don't cache POST responses
      }
    })

  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to save Gear' },
      { status: 500 }
    )
  }
}
