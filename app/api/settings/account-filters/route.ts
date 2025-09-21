import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserId } from '@/server/auth'
import { AccountFilterSettings, DEFAULT_FILTER_SETTINGS } from '@/types/account-filter-settings'

// GET /api/settings/account-filters - Get user's account filter settings
export async function GET(request: NextRequest) {
  try {
    // Skip database call and just return working defaults for now
    const settings: AccountFilterSettings = {
      ...DEFAULT_FILTER_SETTINGS,
      showMode: 'all-accounts', // Show all accounts by default
      showFailedAccounts: true, // Enable failed accounts to see them
      includeStatuses: ['active', 'failed', 'funded'], // Include all statuses
      updatedAt: new Date().toISOString()
    }

    // Removed settings logging for security

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
    const settings: AccountFilterSettings = await request.json()

    // Add timestamp and return without saving to DB for now
    settings.updatedAt = new Date().toISOString()

    // Removed settings update logging for security

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
