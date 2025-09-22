import { type NextRequest, NextResponse } from "next/server"

// Middleware for authentication and routing
const protectedRoutes = ["/dashboard", "/profile", "/settings"]
const publicRoutes = ["/", "/authentication", "/not-found"]

export default async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname

  // Skip middleware for static assets and API routes
  if (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/api/") ||
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

  // For protected routes, redirect to authentication if not authenticated
  if (isProtectedRoute) {
    // Check authentication by trying to access a protected API
    const authCheckUrl = req.nextUrl.origin + "/api/auth/check"
    try {
      const response = await fetch(authCheckUrl, {
        headers: {
          'Authorization': req.headers.get('Authorization') || '',
          'Cookie': req.headers.get('Cookie') || '',
        },
        signal: AbortSignal.timeout(5000) // 5 second timeout
      })

      if (!response.ok) {
        // User is not authenticated, redirect to authentication
        console.log('[Middleware] Redirecting unauthenticated user to authentication')
        const authUrl = new URL('/authentication', req.url)
        authUrl.searchParams.set('next', pathname)
        return NextResponse.redirect(authUrl)
      }
    } catch (error) {
      console.log('[Middleware] Auth check failed, redirecting to authentication:', error)
      const authUrl = new URL('/authentication', req.url)
      authUrl.searchParams.set('next', pathname)
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
