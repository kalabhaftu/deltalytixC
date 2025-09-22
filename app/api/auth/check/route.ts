/**
 * Authentication check API for middleware
 * GET /api/auth/check - Check if user is authenticated
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  // Set a shorter timeout for auth checks to prevent slow responses
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 3000) // 3 second timeout

  try {
    const cookieStore = await cookies()
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: 'Supabase configuration error' },
        { status: 500 }
      )
    }

    const supabase = createServerClient(
      supabaseUrl,
      supabaseKey,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
        },
      }
    )

    // Check if user is authenticated with timeout
    const authPromise = supabase.auth.getUser()
    const { data: { user }, error } = await authPromise

    clearTimeout(timeoutId)

    if (error) {
      // Don't log timeout errors as they're expected in some cases
      if (!error.message.includes('AbortError') && !error.message.includes('timeout')) {
        console.log('[Auth Check] Supabase error:', error.message)
      }
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

    // Fast response without unnecessary logging
    return NextResponse.json(
      { authenticated: true, userId: user.id },
      { status: 200 }
    )

  } catch (error) {
    clearTimeout(timeoutId)

    // Handle specific error types
    if (error instanceof Error) {
      if (error.name === 'AbortError' || error.message.includes('timeout')) {
        // Timeout - return unauthenticated rather than error
        return NextResponse.json(
          { error: 'Authentication timeout' },
          { status: 401 }
        )
      }

      if (error.message.includes('fetch failed') || error.message.includes('ConnectTimeoutError')) {
        // Network issues - return unauthenticated
        return NextResponse.json(
          { error: 'Network error during auth check' },
          { status: 401 }
        )
      }
    }

    console.error('[Auth Check] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Authentication check failed' },
      { status: 500 }
    )
  }
}
