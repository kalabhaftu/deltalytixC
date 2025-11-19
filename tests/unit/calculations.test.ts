import { describe, it, expect } from 'vitest'
import { calculateStatistics, groupTradesByExecution } from '@/lib/utils'
import { calculateMetricsFromTrades } from '@/lib/zella-score'
import type { Trade } from '@prisma/client'

// Helper to create mock trades
function createMockTrade(overrides: Partial<Trade> = {}): Trade {
  // Generate unique entryId to prevent unwanted grouping
  const uniqueId = Math.random().toString(36).substring(7);
  return {
    id: `test-id-${uniqueId}`,
    accountNumber: 'TEST123',
    quantity: 1,
    entryId: `entry-${uniqueId}`,
    instrument: 'EURUSD',
    entryPrice: '1.1000' as any,
    closePrice: '1.1050' as any,
    entryDate: '2024-01-01T10:00:00Z',
    closeDate: '2024-01-01T11:00:00Z',
    pnl: 100,
    timeInPosition: 3600,
    userId: 'user-1',
    side: 'long',
    commission: 0,
    createdAt: new Date(),
    comment: null,
    groupId: null,
    cardPreviewImage: null,
    accountId: null,
    phaseAccountId: null,
    symbol: null,
    entryTime: new Date('2024-01-01T10:00:00Z'),
    exitTime: new Date('2024-01-01T11:00:00Z'),
    closeReason: null,
    stopLoss: null,
    takeProfit: null,
    tradingModel: null,
    tags: null,
    ...overrides,
  }
}

describe('Financial Calculations - Profit Factor', () => {
  it('should calculate profit factor correctly with wins and losses', () => {
    const trades = [
      createMockTrade({ pnl: 200, commission: 0 }), // Win
      createMockTrade({ pnl: 300, commission: 0 }), // Win
      createMockTrade({ pnl: -100, commission: 0 }), // Loss
      createMockTrade({ pnl: -50, commission: 0 }), // Loss
    ]

    // Gross profits: 500
    // Gross losses: 150
    // Profit Factor: 500 / 150 = 3.33
    const stats = calculateStatistics(trades, [])
    expect(stats.profitFactor).toBeCloseTo(3.33, 2)
  })

  it('should handle profit factor with only wins (no losses)', () => {
    const trades = [
      createMockTrade({ pnl: 100, commission: 0 }),
      createMockTrade({ pnl: 200, commission: 0 }),
    ]

    // No losses means infinite profit factor, but we should return a high number
    const stats = calculateStatistics(trades, [])
    expect(stats.profitFactor).toBeGreaterThan(0)
  })

  it('should handle profit factor with only losses (no wins)', () => {
    const trades = [
      createMockTrade({ pnl: -100, commission: 0 }),
      createMockTrade({ pnl: -200, commission: 0 }),
    ]

    const stats = calculateStatistics(trades, [])
    expect(stats.profitFactor).toBe(0)
  })

  it('should calculate profit factor net of commissions', () => {
    const trades = [
      createMockTrade({ pnl: 100, commission: 20 }), // Net: 80
      createMockTrade({ pnl: 200, commission: 30 }), // Net: 170
      createMockTrade({ pnl: -100, commission: 10 }), // Net: -110
    ]

    // Gross profits: 250 (80 + 170)
    // Gross losses: 110
    // Profit Factor: 250 / 110 ≈ 2.27
    const stats = calculateStatistics(trades, [])
    expect(stats.profitFactor).toBeCloseTo(2.27, 2)
  })
})

describe('Financial Calculations - Win Rate', () => {
  it('should calculate win rate correctly', () => {
    const trades = [
      createMockTrade({ pnl: 100, commission: 0 }), // Win
      createMockTrade({ pnl: 200, commission: 0 }), // Win
      createMockTrade({ pnl: -100, commission: 0 }), // Loss
      createMockTrade({ pnl: 50, commission: 0 }), // Win
    ]

    // 3 wins out of 4 trades = 75%
    const stats = calculateStatistics(trades, [])
    expect(stats.winRate).toBe(75)
  })

  it('should exclude break-even trades from win rate calculation', () => {
    const trades = [
      createMockTrade({ pnl: 100, commission: 0 }), // Win
      createMockTrade({ pnl: 0, commission: 0 }), // Break-even (excluded)
      createMockTrade({ pnl: -100, commission: 0 }), // Loss
    ]

    // 1 win out of 2 tradable trades (excluding break-even) = 50%
    const stats = calculateStatistics(trades, [])
    expect(stats.winRate).toBe(50)
  })

  it('should calculate win rate net of commissions', () => {
    const trades = [
      createMockTrade({ pnl: 100, commission: 50 }), // Net: 50 (Win)
      createMockTrade({ pnl: 30, commission: 30 }), // Net: 0 (Break-even, excluded)
      createMockTrade({ pnl: -50, commission: 10 }), // Net: -60 (Loss)
      createMockTrade({ pnl: 200, commission: 50 }), // Net: 150 (Win)
    ]

    // 2 wins out of 3 tradable trades = 66.67%
    const stats = calculateStatistics(trades, [])
    expect(stats.winRate).toBeCloseTo(66.67, 2)
  })

  it('should handle 100% win rate', () => {
    const trades = [
      createMockTrade({ pnl: 100, commission: 0 }),
      createMockTrade({ pnl: 200, commission: 0 }),
      createMockTrade({ pnl: 50, commission: 0 }),
    ]

    const stats = calculateStatistics(trades, [])
    expect(stats.winRate).toBe(100)
  })

  it('should handle 0% win rate', () => {
    const trades = [
      createMockTrade({ pnl: -100, commission: 0 }),
      createMockTrade({ pnl: -200, commission: 0 }),
    ]

    const stats = calculateStatistics(trades, [])
    expect(stats.winRate).toBe(0)
  })
})

describe('Financial Calculations - Average Win/Loss', () => {
  it('should calculate average win and average loss correctly', () => {
    const trades = [
      createMockTrade({ pnl: 200, commission: 0 }), // Win
      createMockTrade({ pnl: 400, commission: 0 }), // Win
      createMockTrade({ pnl: -100, commission: 0 }), // Loss
      createMockTrade({ pnl: -200, commission: 0 }), // Loss
    ]

    // Avg Win: (200 + 400) / 2 = 300
    // Avg Loss: (100 + 200) / 2 = 150
    const stats = calculateStatistics(trades, [])
    expect(stats.averageWin).toBe(300)
    expect(stats.averageLoss).toBe(150)
  })

  it('should calculate average win/loss net of commissions', () => {
    const trades = [
      createMockTrade({ pnl: 200, commission: 50 }), // Net: 150 (Win)
      createMockTrade({ pnl: 400, commission: 100 }), // Net: 300 (Win)
      createMockTrade({ pnl: -100, commission: 20 }), // Net: -120 (Loss)
    ]

    // Avg Win: (150 + 300) / 2 = 225
    // Avg Loss: 120
    const stats = calculateStatistics(trades, [])
    expect(stats.averageWin).toBe(225)
    expect(stats.averageLoss).toBe(120)
  })

  it('should handle trades with only wins', () => {
    const trades = [
      createMockTrade({ pnl: 100, commission: 0 }),
      createMockTrade({ pnl: 200, commission: 0 }),
    ]

    const stats = calculateStatistics(trades, [])
    expect(stats.averageWin).toBe(150)
    expect(stats.averageLoss).toBe(0)
  })

  it('should handle trades with only losses', () => {
    const trades = [
      createMockTrade({ pnl: -100, commission: 0 }),
      createMockTrade({ pnl: -300, commission: 0 }),
    ]

    const stats = calculateStatistics(trades, [])
    expect(stats.averageWin).toBe(0)
    expect(stats.averageLoss).toBe(200)
  })
})

describe('Financial Calculations - Net P&L', () => {
  it('should calculate total net P&L correctly', () => {
    const trades = [
      createMockTrade({ pnl: 200, commission: 0 }),
      createMockTrade({ pnl: -100, commission: 0 }),
      createMockTrade({ pnl: 300, commission: 0 }),
    ]

    // Total: 200 - 100 + 300 = 400
    const stats = calculateStatistics(trades, [])
    expect(stats.totalPnL).toBe(400)
  })

  it('should calculate net P&L after commissions', () => {
    const trades = [
      createMockTrade({ pnl: 200, commission: 20 }), // Net: 180
      createMockTrade({ pnl: -100, commission: 10 }), // Net: -110
      createMockTrade({ pnl: 300, commission: 30 }), // Net: 270
    ]

    // Total: 180 - 110 + 270 = 340
    const stats = calculateStatistics(trades, [])
    expect(stats.totalPnL).toBe(340)
  })

  it('should handle negative total P&L', () => {
    const trades = [
      createMockTrade({ pnl: 100, commission: 0 }),
      createMockTrade({ pnl: -300, commission: 0 }),
      createMockTrade({ pnl: -200, commission: 0 }),
    ]

    // Total: 100 - 300 - 200 = -400
    const stats = calculateStatistics(trades, [])
    expect(stats.totalPnL).toBe(-400)
  })
})

describe('Financial Calculations - Trade Grouping (Partial Closes)', () => {
  it('should group trades by entryId for partial closes', () => {
    const trades = [
      createMockTrade({ entryId: 'E1', pnl: 50, quantity: 1 }),
      createMockTrade({ entryId: 'E1', pnl: 100, quantity: 1 }), // Partial close
      createMockTrade({ entryId: 'E2', pnl: 200, quantity: 2 }),
    ]

    const grouped = groupTradesByExecution(trades)
    
    // Should have 2 groups (E1 and E2)
    expect(grouped.length).toBe(2)
    
    // E1 group should have combined PnL of 150
    const e1Group = grouped.find(g => g.entryId === 'E1')
    expect(e1Group?.pnl).toBe(150)
  })

  it('should calculate win rate correctly with partial closes', () => {
    const trades = [
      createMockTrade({ entryId: 'E1', pnl: 50, commission: 0 }), // Part 1
      createMockTrade({ entryId: 'E1', pnl: 100, commission: 0 }), // Part 2 (combined: +150 Win)
      createMockTrade({ entryId: 'E2', pnl: -100, commission: 0 }), // Loss
    ]

    // After grouping: 1 win (E1: 150), 1 loss (E2: -100)
    // Win rate: 50%
    const stats = calculateStatistics(trades, [])
    expect(stats.winRate).toBe(50)
  })
})

describe('Financial Calculations - Zella Score Metrics', () => {
  it('should calculate metrics correctly for Zella Score', () => {
    const trades = [
      { pnl: 200, commission: 0, entryDate: '2024-01-01T10:00:00Z' },
      { pnl: 300, commission: 0, entryDate: '2024-01-02T10:00:00Z' },
      { pnl: -100, commission: 0, entryDate: '2024-01-03T10:00:00Z' },
      { pnl: -50, commission: 0, entryDate: '2024-01-04T10:00:00Z' },
    ]

    const metrics = calculateMetricsFromTrades(trades)
    
    expect(metrics).not.toBeNull()
    expect(metrics?.profitFactor).toBeCloseTo(3.33, 2)
    expect(metrics?.tradeWinPercentage).toBe(50) // 2 wins, 2 losses
  })

  it('should return null for empty trades array', () => {
    const metrics = calculateMetricsFromTrades([])
    expect(metrics).toBeNull()
  })
})

describe('Financial Calculations - Edge Cases', () => {
  it('should handle empty trades array', () => {
    const stats = calculateStatistics([], [])
    expect(stats.totalPnL).toBe(0)
    expect(stats.winRate).toBe(0)
    expect(stats.profitFactor).toBe(0)
    expect(stats.nbWin).toBe(0)
    expect(stats.nbLoss).toBe(0)
  })

  it('should handle trades with zero P&L', () => {
    const trades = [
      createMockTrade({ pnl: 0, commission: 0 }),
      createMockTrade({ pnl: 0, commission: 0 }),
    ]

    const stats = calculateStatistics(trades, [])
    expect(stats.totalPnL).toBe(0)
    expect(stats.winRate).toBe(0) // No tradable trades
    expect(stats.profitFactor).toBe(0)
  })

  it('should handle very large numbers', () => {
    const trades = [
      createMockTrade({ pnl: 1000000, commission: 0 }),
      createMockTrade({ pnl: -500000, commission: 0 }),
    ]

    const stats = calculateStatistics(trades, [])
    expect(stats.totalPnL).toBe(500000)
    expect(stats.profitFactor).toBe(2)
  })

  it('should handle very small decimal numbers', () => {
    const trades = [
      createMockTrade({ pnl: 0.01, commission: 0 }),
      createMockTrade({ pnl: -0.005, commission: 0 }),
    ]

    const stats = calculateStatistics(trades, [])
    expect(stats.totalPnL).toBeCloseTo(0.005, 3)
  })
})

describe('Financial Calculations - Decimal Precision', () => {
  it('should preserve decimal precision in P&L calculations', () => {
    const trades = [
      createMockTrade({ pnl: 123.456, commission: 0 }),
      createMockTrade({ pnl: -45.678, commission: 0 }),
    ]

    const stats = calculateStatistics(trades, [])
    expect(stats.totalPnL).toBeCloseTo(77.778, 3)
  })

  it('should handle commission with decimal precision', () => {
    const trades = [
      createMockTrade({ pnl: 100.50, commission: 2.25 }), // Net: 98.25
      createMockTrade({ pnl: -50.75, commission: 1.50 }), // Net: -52.25
    ]

    const stats = calculateStatistics(trades, [])
    expect(stats.totalPnL).toBeCloseTo(46.00, 2)
  })
})

