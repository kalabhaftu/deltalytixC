import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserId } from '@/server/auth'
import { AccountFilterSettings, DEFAULT_FILTER_SETTINGS } from '@/types/account-filter-settings'
import { unstable_cache } from 'next/cache'

// GET /api/settings/account-filters - Get user's account filter settings
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId()
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Cache the settings query
    const getCachedSettings = unstable_cache(
      async (uid: string) => {
        const user = await prisma.user.findUnique({
          where: { id: uid },
          select: { accountFilterSettings: true }
        })
        
        if (user?.accountFilterSettings) {
          try {
            return JSON.parse(user.accountFilterSettings) as AccountFilterSettings
          } catch {
            return DEFAULT_FILTER_SETTINGS
          }
        }
        return DEFAULT_FILTER_SETTINGS
      },
      [`account-filters-${userId}`],
      {
        tags: [`account-filters-${userId}`],
        revalidate: 60 // Cache for 60 seconds
      }
    )

    const settings = await getCachedSettings(userId)

    return NextResponse.json({
      success: true,
      data: settings
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120'
      }
    })

  } catch (error) {
    console.error('Error fetching account filter settings:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch settings' },
      { status: 500 }
    )
  }
}

// POST /api/settings/account-filters - Update user's account filter settings
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId()
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const settings: AccountFilterSettings = await request.json()
    settings.updatedAt = new Date().toISOString()

    // Save to database
    await prisma.user.update({
      where: { id: userId },
      data: {
        accountFilterSettings: JSON.stringify(settings)
      }
    })

    // Invalidate cache
    const { revalidateTag } = await import('next/cache')
    revalidateTag(`account-filters-${userId}`)

    return NextResponse.json({
      success: true,
      data: settings
    })

  } catch (error) {
    console.error('Error processing account filter settings:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to save settings' },
      { status: 500 }
    )
  }
}
