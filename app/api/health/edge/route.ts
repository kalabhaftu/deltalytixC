import { NextRequest, NextResponse } from 'next/server'

// Edge Runtime for global distribution and faster cold starts
export const runtime = 'edge'

export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'healthy',
    runtime: 'edge',
    timestamp: new Date().toISOString(),
    region: process.env.VERCEL_REGION || 'unknown',
  }, {
    headers: {
      'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=30',
    }
  })
}
