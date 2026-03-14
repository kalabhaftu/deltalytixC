/**
 * Cron route authentication
 * Validates CRON_SECRET via Authorization: Bearer <secret> or x-cron-secret header.
 * In development, allows unauthenticated requests when CRON_SECRET is not set.
 */

import { NextRequest, NextResponse } from 'next/server'

export function validateCronRequest(request: NextRequest): NextResponse | null {
  const secret = process.env.CRON_SECRET

  // In development, if CRON_SECRET is not set, allow unauthenticated requests
  if (!secret && process.env.NODE_ENV === 'development') {
    return null
  }

  // In production without CRON_SECRET, reject (cron must be explicitly secured)
  if (!secret && process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Forbidden', message: 'CRON_SECRET must be set in production' },
      { status: 403 }
    )
  }

  const authHeader = request.headers.get('authorization')
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  const headerSecret = request.headers.get('x-cron-secret')
  const providedSecret = bearerToken || headerSecret

  if (!providedSecret || providedSecret !== secret) {
    return NextResponse.json(
      { error: 'Unauthorized', message: 'Invalid or missing cron secret' },
      { status: 401 }
    )
  }

  return null
}
