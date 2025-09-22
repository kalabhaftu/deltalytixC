/**
 * Authentication check API for middleware
 * GET /api/auth/check - Check if user is authenticated
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()

    // Check if user is authenticated
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error) {
      console.log('[Auth Check] Supabase error:', error.message)
      return NextResponse.json(
        { error: 'Authentication check failed' },
        { status: 401 }
      )
    }

    if (!user) {
      console.log('[Auth Check] No authenticated user')
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    console.log('[Auth Check] User authenticated:', user.id)
    return NextResponse.json(
      { authenticated: true, userId: user.id },
      { status: 200 }
    )

  } catch (error) {
    console.error('[Auth Check] Error:', error)
    return NextResponse.json(
      { error: 'Authentication check failed' },
      { status: 500 }
    )
  }
}
