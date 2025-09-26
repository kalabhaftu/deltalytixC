/**
 * Comprehensive Unit Tests for Phase Evaluation Engine
 * Tests critical evaluation logic scenarios including failure-first priority
 */

import { PhaseEvaluationEngine } from '@/lib/prop-firm/phase-evaluation-engine'
import { PrismaClient } from '@prisma/client'

// Mock Prisma Client
jest.mock('@prisma/client')
const mockPrisma = {
  phaseAccount: {
    findFirst: jest.fn()
  },
  dailyAnchor: {
    findFirst: jest.fn(),
    create: jest.fn()
  }
}

// Mock the prisma instance
jest.mock('@/lib/prop-firm/phase-evaluation-engine', () => {
  const actual = jest.requireActual('@/lib/prop-firm/phase-evaluation-engine')
  return {
    ...actual,
    prisma: mockPrisma
  }
})

describe('PhaseEvaluationEngine', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Set to development mode for testing
    process.env.NODE_ENV = 'development'
  })

  afterEach(() => {
    // Reset environment
    delete process.env.NODE_ENV
  })

  const createMockPhaseAccount = (overrides = {}) => ({
    id: 'phase-123',
    phaseNumber: 1,
    status: 'active',
    profitTargetPercent: 10,
    dailyDrawdownPercent: 5,
    maxDrawdownPercent: 10,
    maxDrawdownType: 'static',
    minTradingDays: 4,
    timeLimitDays: 30,
    consistencyRulePercent: 0,
    startDate: new Date('2024-01-01'),
    masterAccount: {
      id: 'master-123',
      accountSize: 100000,
      user: {
        timezone: 'UTC'
      }
    },
    trades: [],
    dailyAnchors: [],
    ...overrides
  })

  const createMockTrade = (pnl: number, exitTime: string = '2024-01-15T10:00:00Z') => ({
    id: `trade-${Math.random()}`,
    pnl,
    commission: 0,
    exitTime: new Date(exitTime),
    createdAt: new Date(exitTime)
  })

  describe('Successful Phase Pass Scenario', () => {
    it('should correctly pass a phase when profit target is met and no rules breached', async () => {
      // SCENARIO: Account hits profit target with no drawdown violations
      const mockPhaseAccount = createMockPhaseAccount({
        trades: [
          createMockTrade(5000),  // 5% profit
          createMockTrade(3000),  // Additional 3% profit
          createMockTrade(2500),  // Total: 10.5% profit (above 10% target)
        ]
      })

      mockPrisma.phaseAccount.findFirst.mockResolvedValue(mockPhaseAccount)
      mockPrisma.dailyAnchor.findFirst.mockResolvedValue({
        anchorEquity: 100000 // Starting balance
      })

      const result = await PhaseEvaluationEngine.evaluatePhase('master-123', 'phase-123')

      expect(result.isFailed).toBe(false)
      expect(result.isPassed).toBe(true)
      expect(result.canAdvance).toBe(true)
      expect(result.nextAction).toBe('advance')
      expect(result.progress.profitTargetPercent).toBeGreaterThanOrEqual(100)
      expect(result.drawdown.isBreached).toBe(false)
    })
  })

  describe('Daily Drawdown Failure Scenario', () => {
    it('should correctly fail when daily drawdown limit is breached', async () => {
      // SCENARIO: Account breaches daily drawdown (5% = $5000) but has profit target met
      const mockPhaseAccount = createMockPhaseAccount({
        trades: [
          createMockTrade(15000), // +15% profit (meets target)
          createMockTrade(-6000), // -6% loss (breaches 5% daily DD)
        ]
      })

      mockPrisma.phaseAccount.findFirst.mockResolvedValue(mockPhaseAccount)
      mockPrisma.dailyAnchor.findFirst.mockResolvedValue({
        anchorEquity: 115000 // Start of day balance after profit
      })

      const result = await PhaseEvaluationEngine.evaluatePhase('master-123', 'phase-123')

      // FAILURE-FIRST: Should fail despite profit target being met
      expect(result.isFailed).toBe(true)
      expect(result.isPassed).toBe(false)
      expect(result.canAdvance).toBe(false)
      expect(result.nextAction).toBe('fail')
      expect(result.drawdown.isBreached).toBe(true)
      expect(result.drawdown.breachType).toBe('daily_drawdown')
      expect(result.progress.profitTargetPercent).toBeGreaterThanOrEqual(100) // Target met but irrelevant
    })
  })

  describe('Max Trailing Drawdown Failure Scenario', () => {
    it('should correctly fail when max trailing drawdown limit is breached', async () => {
      // SCENARIO: Account breaches max trailing drawdown but has profit target met
      const mockPhaseAccount = createMockPhaseAccount({
        maxDrawdownType: 'trailing',
        trades: [
          createMockTrade(15000), // +15% profit (meets target, new high-water mark: $115k)
          createMockTrade(-12000), // -12% loss (breaches 10% trailing DD from $115k)
        ]
      })

      mockPrisma.phaseAccount.findFirst.mockResolvedValue(mockPhaseAccount)
      mockPrisma.dailyAnchor.findFirst.mockResolvedValue({
        anchorEquity: 100000 // Daily anchor at starting balance
      })

      const result = await PhaseEvaluationEngine.evaluatePhase('master-123', 'phase-123')

      // FAILURE-FIRST: Should fail despite profit target being met
      expect(result.isFailed).toBe(true)
      expect(result.isPassed).toBe(false)
      expect(result.canAdvance).toBe(false)
      expect(result.nextAction).toBe('fail')
      expect(result.drawdown.isBreached).toBe(true)
      expect(result.drawdown.breachType).toBe('max_drawdown')
      expect(result.progress.profitTargetPercent).toBeGreaterThanOrEqual(100) // Target met but irrelevant
    })
  })

  describe('Failure-First Priority Test', () => {
    it('should prioritize failure over success when both profit target and drawdown breach occur', async () => {
      // CRITICAL TEST: Account that both hits profit target AND breaches rules
      const mockPhaseAccount = createMockPhaseAccount({
        trades: [
          createMockTrade(12000), // +12% profit (exceeds 10% target)
          createMockTrade(-6000), // -6% loss (breaches 5% daily DD)
        ]
      })

      mockPrisma.phaseAccount.findFirst.mockResolvedValue(mockPhaseAccount)
      mockPrisma.dailyAnchor.findFirst.mockResolvedValue({
        anchorEquity: 112000 // Start of day after profit
      })

      const result = await PhaseEvaluationEngine.evaluatePhase('master-123', 'phase-123')

      // FAILURE-FIRST PRIORITY: Must fail despite profit target being exceeded
      expect(result.isFailed).toBe(true)
      expect(result.isPassed).toBe(false)
      expect(result.canAdvance).toBe(false)
      expect(result.nextAction).toBe('fail')
      expect(result.drawdown.isBreached).toBe(true)
      expect(result.progress.profitTargetPercent).toBeGreaterThan(100) // Confirms target was met
    })
  })

  describe('Edge Cases and Validation', () => {
    it('should handle missing phase account gracefully', async () => {
      mockPrisma.phaseAccount.findFirst.mockResolvedValue(null)

      await expect(
        PhaseEvaluationEngine.evaluatePhase('master-123', 'phase-123')
      ).rejects.toThrow('Phase account not found')
    })

    it('should handle empty trades array', async () => {
      const mockPhaseAccount = createMockPhaseAccount({
        trades: []
      })

      mockPrisma.phaseAccount.findFirst.mockResolvedValue(mockPhaseAccount)
      mockPrisma.dailyAnchor.findFirst.mockResolvedValue({
        anchorEquity: 100000
      })

      const result = await PhaseEvaluationEngine.evaluatePhase('master-123', 'phase-123')

      expect(result.isFailed).toBe(false)
      expect(result.isPassed).toBe(false) // No profit target met
      expect(result.nextAction).toBe('continue')
      expect(result.progress.currentPnL).toBe(0)
      expect(result.drawdown.isBreached).toBe(false)
    })

    it('should handle instant account type (0% profit target)', async () => {
      const mockPhaseAccount = createMockPhaseAccount({
        profitTargetPercent: 0, // Instant account
        trades: [
          createMockTrade(1000) // Any profit should pass
        ]
      })

      mockPrisma.phaseAccount.findFirst.mockResolvedValue(mockPhaseAccount)
      mockPrisma.dailyAnchor.findFirst.mockResolvedValue({
        anchorEquity: 100000
      })

      const result = await PhaseEvaluationEngine.evaluatePhase('master-123', 'phase-123')

      expect(result.isFailed).toBe(false)
      expect(result.isPassed).toBe(true) // Should pass with 0% target
      expect(result.progress.profitTargetPercent).toBe(100) // 100% of 0% target
    })

    it('should handle minimum trading days requirement', async () => {
      const mockPhaseAccount = createMockPhaseAccount({
        minTradingDays: 5,
        trades: [
          createMockTrade(10000, '2024-01-01T10:00:00Z'), // Day 1
          createMockTrade(1000, '2024-01-02T10:00:00Z'),  // Day 2
          createMockTrade(500, '2024-01-03T10:00:00Z'),   // Day 3
          // Only 3 trading days, needs 5
        ]
      })

      mockPrisma.phaseAccount.findFirst.mockResolvedValue(mockPhaseAccount)
      mockPrisma.dailyAnchor.findFirst.mockResolvedValue({
        anchorEquity: 100000
      })

      const result = await PhaseEvaluationEngine.evaluatePhase('master-123', 'phase-123')

      expect(result.isFailed).toBe(false)
      expect(result.isPassed).toBe(false) // Profit target met but min days not met
      expect(result.progress.tradingDaysCompleted).toBe(3)
      expect(result.progress.minTradingDaysRequired).toBe(5)
    })
  })

  describe('Daily Anchor Fallback Logic', () => {
    it('should create daily anchor when missing and use it for calculation', async () => {
      const mockPhaseAccount = createMockPhaseAccount({
        trades: [
          createMockTrade(5000) // 5% profit
        ]
      })

      // No existing daily anchor
      mockPrisma.dailyAnchor.findFirst.mockResolvedValue(null)
      
      // Mock successful anchor creation
      mockPrisma.dailyAnchor.create.mockResolvedValue({
        anchorEquity: 105000 // Starting balance + existing profit
      })

      mockPrisma.phaseAccount.findFirst.mockResolvedValue(mockPhaseAccount)

      const result = await PhaseEvaluationEngine.evaluatePhase('master-123', 'phase-123')

      // Verify anchor creation was attempted
      expect(mockPrisma.dailyAnchor.create).toHaveBeenCalledWith({
        data: {
          phaseAccountId: 'phase-123',
          date: expect.any(Date),
          anchorEquity: 105000
        }
      })

      expect(result.drawdown.dailyStartBalance).toBe(105000)
    })
  })
})

