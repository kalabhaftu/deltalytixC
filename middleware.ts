import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Middleware for authentication and routing
const protectedRoutes = ["/dashboard", "/profile", "/settings", "/api/trades", "/api/settings"]
const publicRoutes = ["/", "/not-found", "/api/auth"]

export default async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname

  // Skip middleware for static assets but handle API routes for auth
  if (
    pathname.startsWith("/_next/") ||
    pathname.includes(".") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    pathname.includes("/opengraph-image") ||
    pathname.includes("/twitter-image") ||
    pathname.includes("/icon")
  ) {
    return NextResponse.next()
  }

  // Check if this is a protected route
  const isProtectedRoute = protectedRoutes.some(route =>
    pathname === route || pathname.startsWith(route + "/")
  )

  // Check if this is a public route
  const isPublicRoute = publicRoutes.some(route =>
    pathname === route || pathname.startsWith(route + "/")
  )

  // Allow authenticated users to see the root page with "Already Logged In" UI
  // The page itself will show the logged-in state instead of redirecting immediately
  // This provides better UX by showing the user they're logged in with a clear CTA

  // For protected routes, check authentication directly
  if (isProtectedRoute) {
    // Check if this might be a post-authentication request
    const referrer = req.headers.get('referer')
    const url = req.nextUrl
    const isPostAuthRequest = referrer && (
      referrer.includes('/api/auth/callback') ||
      referrer.includes('/auth/callback') ||
      url.searchParams.has('code') ||
      url.searchParams.has('error')
    )

    // Skip auth check for post-authentication requests
    if (isPostAuthRequest) {
      return NextResponse.next()
    }

    try {
      // Direct auth check instead of API call to avoid circular dependencies
      const cookieStore = await cookies()
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      if (!supabaseUrl || !supabaseKey) {
        // Configuration error - redirect to login (don't allow through)
        const authUrl = new URL('/', req.url)
        authUrl.searchParams.set('error', 'config')
        return NextResponse.redirect(authUrl)
      }

      const supabase = createServerClient(
        supabaseUrl,
        supabaseKey,
        {
          cookies: {
            getAll() {
              return cookieStore.getAll()
            },
            setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
              try {
                cookiesToSet.forEach(({ name, value, options }) =>
                  cookieStore.set(name, value, options)
                )
              } catch {
                // Ignore cookie setting errors in middleware context
              }
            },
          },
        }
      )

      // Get user session from Supabase
      const { data: { user }, error } = await supabase.auth.getUser()

      if (error || !user) {
        // User not authenticated, redirect to authentication
        const authUrl = new URL('/', req.url)
        authUrl.searchParams.set('next', pathname)
        return NextResponse.redirect(authUrl)
      }

      // Add user info to headers for server components
      const response = NextResponse.next()
      response.headers.set('x-user-id', user.id)
      response.headers.set('x-user-authenticated', 'authenticated')
      if (user.email) {
        response.headers.set('x-user-email', user.email)
      }
      return response

    } catch (middlewareError) {
      // If middleware auth check fails, redirect to login (don't allow through)
      const authUrl = new URL('/', req.url)
      authUrl.searchParams.set('error', 'auth')
      return NextResponse.redirect(authUrl)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api routes
     * - opengraph-image (Open Graph image generation)
     * - public files with extensions
     */
    "/((?!_next/static|_next/image|favicon.ico|api|opengraph-image|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
