/**
 * Integration tests for GET /api/v1/trades
 * Requires authenticated request context (mocked in tests)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock auth and prisma before imports
vi.mock('@/server/auth', () => ({
  getUserId: vi.fn().mockResolvedValue('test-auth-user-id'),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn().mockResolvedValue({ id: 'internal-user-id' }),
    },
    trade: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    account: {
      findMany: vi.fn().mockResolvedValue([]),
    },
  },
}))

vi.mock('@/lib/rate-limiter', () => ({
  applyRateLimit: vi.fn().mockResolvedValue(null),
  apiLimiter: {},
}))

describe('GET /api/v1/trades', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when user is not authenticated', async () => {
    const { getUserId } = await import('@/server/auth')
    vi.mocked(getUserId).mockRejectedValueOnce(new Error('not authenticated'))

    const { GET } = await import('@/app/api/v1/trades/route')
    const request = { nextUrl: new URL('http://localhost/api/v1/trades') } as any
    const response = await GET(request)

    expect(response.status).toBe(401)
  })

  it('returns 404 when user is not found in database', async () => {
    const { prisma } = await import('@/lib/prisma')
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null)

    const { GET } = await import('@/app/api/v1/trades/route')
    const request = { nextUrl: new URL('http://localhost/api/v1/trades') } as any
    const response = await GET(request)

    expect(response.status).toBe(404)
  })

  it('returns trades with statistics and calendarData when includeStats and includeCalendar are true', async () => {
    const { prisma } = await import('@/lib/prisma')
    vi.mocked(prisma.trade.findMany).mockResolvedValueOnce([
      {
        id: 't1',
        userId: 'internal-user-id',
        accountNumber: '123',
        instrument: 'EURUSD',
        entryPrice: '1.1',
        closePrice: '1.11',
        entryDate: '2024-01-01',
        closeDate: '2024-01-01',
        pnl: 100,
        commission: 0,
        timeInPosition: 3600,
        quantity: 1,
        side: 'BUY',
        stopLoss: null,
        takeProfit: null,
        TradingModel: { id: 'm1', name: 'Model 1' },
      } as any,
    ])
    vi.mocked(prisma.account.findMany).mockResolvedValueOnce([
      { id: 'a1', number: '123', _count: { Trade: 1 } } as any,
    ])

    const { GET } = await import('@/app/api/v1/trades/route')
    const url = new URL('http://localhost/api/v1/trades')
    const request = { nextUrl: url } as any
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toHaveProperty('trades')
    expect(data).toHaveProperty('total')
    expect(data).toHaveProperty('statistics')
    expect(data).toHaveProperty('calendarData')
    expect(Array.isArray(data.trades)).toBe(true)
    expect(data.total).toBe(1)
  })

  it('applies account filter when accounts param is provided', async () => {
    const { prisma } = await import('@/lib/prisma')
    vi.mocked(prisma.trade.findMany).mockResolvedValueOnce([])

    const { GET } = await import('@/app/api/v1/trades/route')
    const url = new URL('http://localhost/api/v1/trades?accounts=123,456')
    const request = { nextUrl: url } as any
    await GET(request)

    expect(prisma.trade.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            { accountNumber: { in: ['123', '456'] } },
            { phaseAccountId: { in: ['123', '456'] } },
          ]),
        }),
      })
    )
  })
})
