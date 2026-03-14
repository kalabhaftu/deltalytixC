/**
 * Report Statistics API (v1)
 * 
 * POST /api/v1/reports/stats
 * 
 * Replaces all client-side report calculations with a single server endpoint.
 * Accepts filter parameters and returns pre-computed report DTOs.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUserId } from '@/server/auth'
import { calculateReportStatistics, type ReportStatsFilters } from '@/lib/statistics/report-statistics'
import { CacheHeaders } from '@/lib/api-cache-headers'
import { applyRateLimit, apiLimiter } from '@/lib/rate-limiter'
import { logger } from '@/lib/logger'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  const rateLimitRes = await applyRateLimit(request, apiLimiter)
  if (rateLimitRes) return rateLimitRes

  const start = Date.now()
  try {
    const authUserId = await getUserId()

    // Map auth user ID to internal user ID (Trade.userId uses internal id)
    const userLookup = await prisma.user.findUnique({
      where: { auth_user_id: authUserId },
      select: { id: true },
    })

    if (!userLookup?.id) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const body = await request.json()
    const filters: ReportStatsFilters = {
      userId: userLookup.id,
      accountId: body.accountId || undefined,
      accountNumbers: body.accountNumbers || undefined,
      dateFrom: body.dateFrom || undefined,
      dateTo: body.dateTo || undefined,
      symbol: body.symbol || undefined,
      session: body.session || undefined,
      outcome: body.outcome || undefined,
      strategy: body.strategy || undefined,
      ruleBroken: body.ruleBroken || undefined,
    }

    const result = await calculateReportStatistics(filters)

    const response = NextResponse.json(result)
    Object.entries(CacheHeaders.privateShort).forEach(([k, v]) => response.headers.set(k, v))
    logger.info('POST /api/v1/reports/stats', { latencyMs: Date.now() - start }, 'api')
    return response
  } catch (error: any) {
    logger.error('POST /api/v1/reports/stats failed', { error: error?.message, latencyMs: Date.now() - start }, 'api')
    if (error.message?.includes('not authenticated') || error.message?.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    )
  }
}
