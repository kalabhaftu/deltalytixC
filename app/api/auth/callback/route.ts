'use server'
import { createClient, ensureUserInDatabase } from '@/server/auth'
import { NextResponse } from 'next/server'

// Helper function to determine if we're in local development
function isLocalDevelopment() {
  const isVercel = process.env.VERCEL === '1'
  return process.env.NODE_ENV === 'development' && !isVercel
}
// The client you created from the Server-Side Auth instructions

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const error_code = searchParams.get('error_code')
  const error_description = searchParams.get('error_description')
  // if "next" is in param, use it as the redirect URL
  const next = searchParams.get('next')
  const action = searchParams.get('action')

  // Handle OAuth errors from the provider
  if (error_code) {
    const baseUrl = isLocalDevelopment() ? 'http://localhost:3000' : origin
    
    if (error_code === 'bad_oauth_state') {
      // OAuth state mismatch - redirect to authentication to retry
      return NextResponse.redirect(new URL('/', origin))
    }
    
    return NextResponse.redirect(new URL('/dashboard', origin))
  }

   // Redirect to the decoded 'next' URL if it exists, otherwise to the homepage
   let decodedNext: string | null = null;
   if (next) {
    decodedNext = decodeURIComponent(next)
  }
  
  if (code) {
    try {
      const supabase = await createClient()
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)

      if (!error && data.user) {
        // Ensure user exists in database and preload dashboard layout
        try {
          // const locale = await getCurrentLocale()
          await ensureUserInDatabase(data.user, 'en')

          // Note: Dashboard layout moved to DashboardTemplate model
          // Template is now auto-created on first dashboard visit
        } catch (dbError) {
          // Continue with redirect - user authentication succeeded
        }

        // Handle identity linking redirect
        if (action === 'link') {
          const forwardedHost = request.headers.get('host')
          const baseUrl = isLocalDevelopment()
            ? `${origin}/dashboard/settings`
            : `https://${forwardedHost || origin}/dashboard/settings`
          return NextResponse.redirect(new URL('/dashboard/settings?linked=true', baseUrl))
        }

        const baseUrl = isLocalDevelopment() ? 'http://localhost:3000' : origin

        // Redirect to dashboard after successful authentication
        const redirectPath = decodedNext || '/dashboard'
        return NextResponse.redirect(new URL(redirectPath, baseUrl))
      }
      
      // Handle specific auth errors
      const baseUrl = isLocalDevelopment() ? 'http://localhost:3000' : origin

      if (error?.message?.includes('timeout') || error?.message?.includes('fetch failed')) {
        return NextResponse.redirect(new URL('/', baseUrl))
      }

      return NextResponse.redirect(new URL('/', baseUrl))
    } catch (networkError) {
      const baseUrl = isLocalDevelopment() ? 'http://localhost:3000' : origin
      return NextResponse.redirect(new URL('/', baseUrl))
    }
  }

  // return the user to the authentication page
  const baseUrl = isLocalDevelopment() ? 'http://localhost:3000' : origin
  return NextResponse.redirect(new URL('/', baseUrl))
}
