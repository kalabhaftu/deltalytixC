'use server'
import { getCurrentLocale } from '@/locales/server'
import { createClient, ensureUserInDatabase } from '@/server/auth'
import { NextResponse } from 'next/server'
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
    console.log('OAuth Error:', { error_code, error_description })
    const isLocalEnv = process.env.NODE_ENV === 'development'
    const baseUrl = isLocalEnv ? 'http://localhost:3000' : origin
    
    if (error_code === 'bad_oauth_state') {
      // OAuth state mismatch - redirect to authentication to retry
      return NextResponse.redirect(`${baseUrl}/authentication?error=oauth_retry`)
    }
    
    return NextResponse.redirect(`${baseUrl}/authentication?error=oauth_failed`)
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
        // Ensure user exists in database
        try {
          const locale = await getCurrentLocale()
          await ensureUserInDatabase(data.user, locale)
        } catch (dbError) {
          console.error('Failed to ensure user in database:', dbError)
          // Continue with redirect - user authentication succeeded
        }

        // Handle identity linking redirect
        if (action === 'link') {
          const forwardedHost = request.headers.get('x-forwarded-host')
          const isLocalEnv = process.env.NODE_ENV === 'development'
          const baseUrl = isLocalEnv 
            ? `${origin}/dashboard/settings` 
            : `https://${forwardedHost || origin}/dashboard/settings`
          const redirectUrl = `${baseUrl}?linked=true`
          return NextResponse.redirect(redirectUrl)
        }

        const forwardedHost = request.headers.get('x-forwarded-host') // original origin before load balancer
        const isLocalEnv = process.env.NODE_ENV === 'development'
        
        // Always use localhost:3000 in development
        if (isLocalEnv) {
          const baseUrl = 'http://localhost:3000'
          if (decodedNext) {
            return NextResponse.redirect(new URL(decodedNext, baseUrl))
          }
          return NextResponse.redirect(`${baseUrl}/dashboard`)
        } else if (forwardedHost) {
          if (decodedNext) {
            return NextResponse.redirect(new URL(decodedNext, `https://${forwardedHost}`))
          }
          return NextResponse.redirect(`https://${forwardedHost}/dashboard`)
        } else {
          if (decodedNext) {
            return NextResponse.redirect(new URL(decodedNext, origin))
          }
          return NextResponse.redirect(`${origin}/dashboard`)
        }
      }
      console.log('Auth exchange error:', error)
      
      // Handle specific auth errors
      const isLocalEnv = process.env.NODE_ENV === 'development'
      const baseUrl = isLocalEnv ? 'http://localhost:3000' : origin
      
      if (error?.message?.includes('timeout') || error?.message?.includes('fetch failed')) {
        return NextResponse.redirect(`${baseUrl}/authentication?error=connection_timeout`)
      }
      
      return NextResponse.redirect(`${baseUrl}/authentication?error=auth_failed`)
    } catch (networkError) {
      console.log('Network error during auth exchange:', networkError)
      const isLocalEnv = process.env.NODE_ENV === 'development'
      const baseUrl = isLocalEnv ? 'http://localhost:3000' : origin
      return NextResponse.redirect(`${baseUrl}/authentication?error=network_error`)
    }
  }

  // return the user to the authentication page
  const isLocalEnv = process.env.NODE_ENV === 'development'
  const baseUrl = isLocalEnv ? 'http://localhost:3000' : origin
  return NextResponse.redirect(`${baseUrl}/authentication`)
}
