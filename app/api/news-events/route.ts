/**
 * News Events API (server-only data)
 * Returns major economic news events. Data is loaded server-side only;
 * client components must fetch via this endpoint (never import lib/major-news-events).
 */

import { NextResponse } from 'next/server'
import { MAJOR_NEWS_EVENTS } from '@/lib/major-news-events'
import { CacheHeaders } from '@/lib/api-cache-headers'

export async function GET() {
  const response = NextResponse.json(MAJOR_NEWS_EVENTS, {
    headers: CacheHeaders.medium, // Semi-static data
  })
  return response
}
