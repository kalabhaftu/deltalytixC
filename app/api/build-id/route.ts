import { NextResponse } from 'next/server'

// Edge Runtime for faster response times
export const runtime = 'edge'

/**
 * API endpoint to return the current build ID
 * Used by deployment detection to identify when a new version is deployed
 */
export async function GET() {
  // Next.js generates a BUILD_ID file during build
  // We can use a combination of deployment timestamp and a hash
  const buildId = process.env.NEXT_BUILD_ID || process.env.VERCEL_DEPLOYMENT_ID || 'local-dev'
  
  return NextResponse.json(
    { buildId },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    }
  )
}

// Support OPTIONS for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Cache-Control': 'no-store',
    },
  })
}

export const dynamic = 'force-dynamic'

