import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserId } from '@/server/auth'
import { AccountFilterSettings, DEFAULT_FILTER_SETTINGS } from '@/types/account-filter-settings'

// GET /api/settings/account-filters - Get user's account filter settings
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId()

    // Try to get existing settings
    const existingSettings = await prisma.user.findUnique({
      where: { id: userId },
      select: { accountFilterSettings: true }
    })

    let settings: AccountFilterSettings
    
    if (existingSettings?.accountFilterSettings) {
      try {
        settings = JSON.parse(existingSettings.accountFilterSettings as string)
        console.log('[API/account-filters] Parsed settings from DB:', settings)
      } catch (error) {
        console.error('Failed to parse account filter settings, using defaults:', error)
        settings = DEFAULT_FILTER_SETTINGS
      }
    } else {
      console.log('[API/account-filters] No existing settings, using defaults')
      settings = DEFAULT_FILTER_SETTINGS
    }

    console.log('[API/account-filters] Returning settings:', settings)

    return NextResponse.json({
      success: true,
      data: settings
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
    const settings: AccountFilterSettings = await request.json()

    // Add timestamp
    settings.updatedAt = new Date().toISOString()

    // Save settings to user record
    await prisma.user.update({
      where: { id: userId },
      data: {
        accountFilterSettings: JSON.stringify(settings)
      }
    })

    return NextResponse.json({
      success: true,
      data: settings
    })

  } catch (error) {
    console.error('Error saving account filter settings:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to save settings' },
      { status: 500 }
    )
  }
}
