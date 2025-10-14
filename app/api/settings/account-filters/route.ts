import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserId } from '@/server/auth'
import { AccountFilterSettings, DEFAULT_FILTER_SETTINGS } from '@/types/account-filter-settings'
import { unstable_cache } from 'next/cache'

// GET /api/settings/account-filters - Get user's account filter settings
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
    
    let settings = DEFAULT_FILTER_SETTINGS
    if (user?.accountFilterSettings) {
      try {
        const savedSettings = JSON.parse(user.accountFilterSettings) as Partial<AccountFilterSettings>
        settings = {
          ...DEFAULT_FILTER_SETTINGS,
          ...savedSettings
        }
      } catch (error) {
        console.error('[API /account-filters] Parse error:', error)
      }
    }

    return NextResponse.json({
      success: true,
      data: settings
    }, {
      headers: {
        'Cache-Control': 'private, max-age=10, stale-while-revalidate=30'
      }
    })

  } catch (error) {
    console.error('Error fetching account filter settings:', error)
    
    // Return defaults on error to prevent UI blocking
    return NextResponse.json({
      success: true,
      data: DEFAULT_FILTER_SETTINGS
    }, {
      status: 200, // Return 200 with defaults rather than erroring
      headers: {
        'Cache-Control': 'no-store' // Don't cache errors
      }
    })
  }
}

// POST /api/settings/account-filters - Update user's account filter settings
export async function POST(request: NextRequest) {
  try {
    const authUserId = await getUserId()
    if (!authUserId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const settings: AccountFilterSettings = await request.json()
    settings.updatedAt = new Date().toISOString()

    // Save to database - Prisma handles connection timeout
    await prisma.user.update({
      where: { auth_user_id: authUserId },
      data: {
        accountFilterSettings: JSON.stringify(settings)
      }
    })

    return NextResponse.json({
      success: true,
      data: settings
    }, {
      headers: {
        'Cache-Control': 'no-store' // Don't cache POST responses
      }
    })

  } catch (error) {
    console.error('Error processing account filter settings:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to save settings' },
      { status: 500 }
    )
  }
}
