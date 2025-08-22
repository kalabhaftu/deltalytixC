/**
 * Comprehensive Prop Firm System Tests
 * Tests business rules, API endpoints, and integration scenarios
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { prisma } from '@/lib/prisma'
import { PropFirmBusinessRules } from '../business-rules'
import { PropFirmSchemas } from '@/lib/validation/prop-firm-schemas'
import { AccountStatus, PhaseType, DrawdownType, DrawdownMode, EvaluationType } from '@/types/prop-firm'

// Test data setup
const testUserId = 'test-user-123'
const testAccountData = {
  number: 'TEST001',
  name: 'Test Account',
  propfirm: 'Test Firm',
  startingBalance: 100000,
  dailyDrawdownAmount: 5,
  dailyDrawdownType: 'percent' as DrawdownType,
  maxDrawdownAmount: 10,
  maxDrawdownType: 'percent' as DrawdownType,
  drawdownModeMax: 'static' as DrawdownMode,
  evaluationType: 'two_step' as EvaluationType,
  timezone: 'UTC',
  dailyResetTime: '00:00',
  profitTarget: 8000, // 8% of 100k
}

describe('Prop Firm Business Rules', () => {
  describe('Drawdown Calculations', () => {
    it('should calculate static drawdown correctly', () => {
      const account = {
        ...testAccountData,
        startingBalance: 100000,
        dailyDrawdownAmount: 5000, // $5000 absolute
        dailyDrawdownType: 'absolute' as DrawdownType,
        maxDrawdownAmount: 10000, // $10000 absolute
        maxDrawdownType: 'absolute' as DrawdownType,
        drawdownModeMax: 'static' as DrawdownMode,
      }

      const currentPhase = {
        highestEquitySincePhaseStart: 100000,
      }

      // Test daily drawdown
      const drawdown = PropFirmBusinessRules.calculateDrawdown(
        account as any,
        currentPhase as any,
        95500, // Current equity
        100000, // Daily start balance
        100000 // Highest equity
      )

      expect(drawdown.dailyDrawdownRemaining).toBe(500) // 5000 - 4500 = 500
      expect(drawdown.maxDrawdownRemaining).toBe(5500) // 10000 - 4500 = 5500
      expect(drawdown.isBreached).toBe(false)
    })

    it('should detect daily drawdown breach', () => {
      const account = {
        ...testAccountData,
        dailyDrawdownAmount: 5, // 5%
        dailyDrawdownType: 'percent' as DrawdownType,
      }

      const currentPhase = {
        highestEquitySincePhaseStart: 100000,
      }

      const drawdown = PropFirmBusinessRules.calculateDrawdown(
        account as any,
        currentPhase as any,
        94500, // 5.5% down from daily start
        100000, // Daily start balance
        100000
      )

      expect(drawdown.isBreached).toBe(true)
      expect(drawdown.breachType).toBe('daily_drawdown')
      expect(drawdown.breachAmount).toBe(5500)
    })

    it('should calculate trailing drawdown correctly', () => {
      const account = {
        ...testAccountData,
        maxDrawdownAmount: 10, // 10%
        maxDrawdownType: 'percent' as DrawdownType,
        drawdownModeMax: 'trailing' as DrawdownMode,
      }

      const currentPhase = {
        highestEquitySincePhaseStart: 110000, // Account gained 10k
      }

      const drawdown = PropFirmBusinessRules.calculateDrawdown(
        account as any,
        currentPhase as any,
        101000, // 9k drawdown from peak
        100000,
        110000
      )

      expect(drawdown.maxDrawdownRemaining).toBe(2000) // 11000 - 9000 = 2000
      expect(drawdown.isBreached).toBe(false)
    })

    it('should detect max drawdown breach in trailing mode', () => {
      const account = {
        ...testAccountData,
        maxDrawdownAmount: 10, // 10%
        maxDrawdownType: 'percent' as DrawdownType,
        drawdownModeMax: 'trailing' as DrawdownMode,
      }

      const currentPhase = {
        highestEquitySincePhaseStart: 110000,
      }

      const drawdown = PropFirmBusinessRules.calculateDrawdown(
        account as any,
        currentPhase as any,
        98000, // 12k drawdown from peak (more than 10%)
        100000,
        110000
      )

      expect(drawdown.isBreached).toBe(true)
      expect(drawdown.breachType).toBe('max_drawdown')
    })
  })

  describe('Phase Progression', () => {
    it('should calculate phase progress correctly', () => {
      const account = {
        ...testAccountData,
        evaluationType: 'two_step' as EvaluationType,
      }

      const currentPhase = {
        phaseType: 'phase_1' as PhaseType,
        phaseStartAt: new Date('2024-01-01'),
        profitTarget: 8000,
      }

      const progress = PropFirmBusinessRules.calculatePhaseProgress(
        account as any,
        currentPhase as any,
        6000 // $6k profit
      )

      expect(progress.profitProgress).toBe(75) // 6000/8000 * 100
      expect(progress.canProgress).toBe(false)
      expect(progress.nextPhaseType).toBeUndefined()
    })

    it('should allow progression when profit target is reached', () => {
      const account = {
        ...testAccountData,
        evaluationType: 'two_step' as EvaluationType,
      }

      const currentPhase = {
        phaseType: 'phase_1' as PhaseType,
        phaseStartAt: new Date('2024-01-01'),
        profitTarget: 8000,
      }

      const progress = PropFirmBusinessRules.calculatePhaseProgress(
        account as any,
        currentPhase as any,
        8500 // Above target
      )

      expect(progress.profitProgress).toBeGreaterThan(100)
      expect(progress.canProgress).toBe(true)
      expect(progress.nextPhaseType).toBe('phase_2')
    })

    it('should progress to funded in one-step evaluation', () => {
      const account = {
        ...testAccountData,
        evaluationType: 'one_step' as EvaluationType,
      }

      const currentPhase = {
        phaseType: 'phase_1' as PhaseType,
        phaseStartAt: new Date('2024-01-01'),
        profitTarget: 10000,
      }

      const progress = PropFirmBusinessRules.calculatePhaseProgress(
        account as any,
        currentPhase as any,
        10500
      )

      expect(progress.canProgress).toBe(true)
      expect(progress.nextPhaseType).toBe('funded')
    })
  })

  describe('Payout Eligibility', () => {
    it('should calculate payout eligibility correctly', () => {
      const account = {
        ...testAccountData,
        minDaysToFirstPayout: 4,
        payoutCycleDays: 14,
        payoutEligibilityMinProfit: 1000,
      }

      const currentPhase = {
        phaseType: 'funded' as PhaseType,
      }

      const eligibility = PropFirmBusinessRules.calculatePayoutEligibility(
        account as any,
        currentPhase as any,
        10, // Days since funded
        20, // Days since last payout
        2500, // Net profit since last payout
        false // No active breaches
      )

      expect(eligibility.isEligible).toBe(true)
      expect(eligibility.blockers).toHaveLength(0)
    })

    it('should block payout for insufficient waiting period', () => {
      const account = {
        ...testAccountData,
        minDaysToFirstPayout: 4,
        payoutCycleDays: 14,
      }

      const currentPhase = {
        phaseType: 'funded' as PhaseType,
      }

      const eligibility = PropFirmBusinessRules.calculatePayoutEligibility(
        account as any,
        currentPhase as any,
        2, // Only 2 days since funded
        2,
        1000,
        false
      )

      expect(eligibility.isEligible).toBe(false)
      expect(eligibility.blockers).toContain('Must wait 4 days since funding')
    })

    it('should block payout for active breaches', () => {
      const account = {
        ...testAccountData,
        minDaysToFirstPayout: 4,
        payoutCycleDays: 14,
      }

      const currentPhase = {
        phaseType: 'funded' as PhaseType,
      }

      const eligibility = PropFirmBusinessRules.calculatePayoutEligibility(
        account as any,
        currentPhase as any,
        10,
        20,
        2000,
        true // Has active breaches
      )

      expect(eligibility.isEligible).toBe(false)
      expect(eligibility.blockers).toContain('Cannot request payout with active rule violations')
    })
  })

  describe('Payout Effects', () => {
    it('should calculate balance reduction correctly', () => {
      const account = {
        ...testAccountData,
        resetOnPayout: false,
        reduceBalanceByPayout: true,
      }

      const effects = PropFirmBusinessRules.calculatePayoutEffects(
        account as any,
        150000, // Current balance
        50000 // Payout amount
      )

      expect(effects.newBalance).toBe(100000)
      expect(effects.shouldReset).toBe(false)
      expect(effects.resetAnchors).toBe(false)
    })

    it('should calculate reset on payout correctly', () => {
      const account = {
        ...testAccountData,
        resetOnPayout: true,
        reduceBalanceByPayout: false,
        fundedResetBalance: 250000,
      }

      const effects = PropFirmBusinessRules.calculatePayoutEffects(
        account as any,
        300000,
        50000
      )

      expect(effects.newBalance).toBe(250000) // Reset to funded reset balance
      expect(effects.shouldReset).toBe(true)
      expect(effects.resetAnchors).toBe(true)
    })
  })

  describe('Account Configuration Validation', () => {
    it('should validate correct configuration', () => {
      const validation = PropFirmBusinessRules.validateAccountConfiguration(testAccountData)
      
      expect(validation.valid).toBe(true)
      expect(validation.errors).toHaveLength(0)
    })

    it('should reject invalid percentage values', () => {
      const invalidConfig = {
        ...testAccountData,
        dailyDrawdownAmount: 150, // Invalid: > 100%
        profitSplitPercent: 110, // Invalid: > 100%
      }

      const validation = PropFirmBusinessRules.validateAccountConfiguration(invalidConfig)
      
      expect(validation.valid).toBe(false)
      expect(validation.errors).toContain('Daily drawdown percentage cannot exceed 100%')
      expect(validation.errors).toContain('Profit split percentage cannot exceed 100%')
    })

    it('should reject negative values', () => {
      const invalidConfig = {
        ...testAccountData,
        payoutCycleDays: -1,
        minDaysToFirstPayout: -5,
      }

      const validation = PropFirmBusinessRules.validateAccountConfiguration(invalidConfig)
      
      expect(validation.valid).toBe(false)
      expect(validation.errors).toContain('Payout cycle must be at least 1 day')
      expect(validation.errors).toContain('Minimum days to first payout cannot be negative')
    })
  })

  describe('Risk Metrics', () => {
    it('should calculate risk metrics correctly', () => {
      const account = {
        ...testAccountData,
        startingBalance: 100000,
      }

      const trades = [
        { realizedPnl: 1000, pnl: 1000 },
        { realizedPnl: -500, pnl: -500 },
        { realizedPnl: 1500, pnl: 1500 },
        { realizedPnl: -200, pnl: -200 },
        { realizedPnl: 800, pnl: 800 },
      ]

      const metrics = PropFirmBusinessRules.calculateRiskMetrics(
        account as any,
        trades as any,
        102600 // Current equity
      )

      expect(metrics.totalTrades).toBe(5)
      expect(metrics.winRate).toBe(60) // 3 wins out of 5
      expect(metrics.avgWin).toBe(1100) // (1000 + 1500 + 800) / 3
      expect(metrics.avgLoss).toBe(350) // (500 + 200) / 2
      expect(metrics.profitFactor).toBeCloseTo(4.71, 1) // 3300 / 700
      expect(metrics.currentStreak).toBe(1) // Last trade was a win
    })

    it('should handle edge cases', () => {
      const account = {
        ...testAccountData,
        startingBalance: 100000,
      }

      // No trades
      const metricsEmpty = PropFirmBusinessRules.calculateRiskMetrics(
        account as any,
        [],
        100000
      )

      expect(metricsEmpty.totalTrades).toBe(0)
      expect(metricsEmpty.winRate).toBe(0)
      expect(metricsEmpty.avgWin).toBe(0)
      expect(metricsEmpty.currentStreak).toBe(0)

      // Only winning trades
      const winsOnly = [
        { realizedPnl: 1000, pnl: 1000 },
        { realizedPnl: 500, pnl: 500 },
      ]

      const metricsWins = PropFirmBusinessRules.calculateRiskMetrics(
        account as any,
        winsOnly as any,
        101500
      )

      expect(metricsWins.winRate).toBe(100)
      expect(metricsWins.avgLoss).toBe(0)
      expect(metricsWins.profitFactor).toBe(0) // Division by zero handled
    })
  })
})

describe('Prop Firm Validation Schemas', () => {
  describe('Account Creation', () => {
    it('should validate correct account data', () => {
      const result = PropFirmSchemas.CreateAccount.safeParse(testAccountData)
      expect(result.success).toBe(true)
    })

    it('should reject invalid account numbers', () => {
      const invalidData = {
        ...testAccountData,
        number: 'INVALID ACCOUNT!', // Contains space and special char
      }

      const result = PropFirmSchemas.CreateAccount.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should validate drawdown constraints', () => {
      const invalidPercent = {
        ...testAccountData,
        dailyDrawdownType: 'percent' as DrawdownType,
        dailyDrawdownAmount: 150, // > 100%
      }

      const result = PropFirmSchemas.CreateAccount.safeParse(invalidPercent)
      expect(result.success).toBe(false)
    })

    it('should validate absolute drawdown against balance', () => {
      const invalidAbsolute = {
        ...testAccountData,
        dailyDrawdownType: 'absolute' as DrawdownType,
        dailyDrawdownAmount: 150000, // > starting balance
        startingBalance: 100000,
      }

      const result = PropFirmSchemas.CreateAccount.safeParse(invalidAbsolute)
      expect(result.success).toBe(false)
    })
  })

  describe('Trade Creation', () => {
    it('should validate correct trade data', () => {
      const tradeData = {
        accountId: 'account-123',
        symbol: 'ES',
        side: 'long',
        quantity: 1,
        entryPrice: 4500,
        exitPrice: 4520,
        entryTime: new Date('2024-01-01T10:00:00Z'),
        exitTime: new Date('2024-01-01T11:00:00Z'),
        fees: 5.5,
        strategy: 'momentum',
        tags: ['scalp', 'morning'],
      }

      const result = PropFirmSchemas.CreateTrade.safeParse(tradeData)
      expect(result.success).toBe(true)
    })

    it('should reject invalid symbol formats', () => {
      const invalidTrade = {
        accountId: 'account-123',
        symbol: 'INVALID SYMBOL!',
        side: 'long',
        quantity: 1,
        entryPrice: 4500,
        entryTime: new Date(),
      }

      const result = PropFirmSchemas.CreateTrade.safeParse(invalidTrade)
      expect(result.success).toBe(false)
    })

    it('should validate time relationships', () => {
      const invalidTrade = {
        accountId: 'account-123',
        symbol: 'ES',
        side: 'long',
        quantity: 1,
        entryPrice: 4500,
        exitPrice: 4520,
        entryTime: new Date('2024-01-01T11:00:00Z'),
        exitTime: new Date('2024-01-01T10:00:00Z'), // Before entry
      }

      const result = PropFirmSchemas.CreateTrade.safeParse(invalidTrade)
      expect(result.success).toBe(false)
    })
  })

  describe('Payout Requests', () => {
    it('should validate correct payout request', () => {
      const payoutData = {
        accountId: 'account-123',
        amountRequested: 5000,
        notes: 'Monthly payout request',
      }

      const result = PropFirmSchemas.RequestPayout.safeParse(payoutData)
      expect(result.success).toBe(true)
    })

    it('should reject amounts below minimum', () => {
      const invalidPayout = {
        accountId: 'account-123',
        amountRequested: 25, // Below $50 minimum
      }

      const result = PropFirmSchemas.RequestPayout.safeParse(invalidPayout)
      expect(result.success).toBe(false)
    })

    it('should reject amounts above maximum', () => {
      const invalidPayout = {
        accountId: 'account-123',
        amountRequested: 150000, // Above $100k maximum
      }

      const result = PropFirmSchemas.RequestPayout.safeParse(invalidPayout)
      expect(result.success).toBe(false)
    })
  })
})

describe('Phase Transition Logic', () => {
  it('should validate successful phase transitions', () => {
    const account = {
      ...testAccountData,
      status: 'active' as AccountStatus,
      evaluationType: 'two_step' as EvaluationType,
    }

    const fromPhase = {
      phaseType: 'phase_1' as PhaseType,
      profitTarget: 8000,
    }

    const validation = PropFirmBusinessRules.validatePhaseTransition(
      account as any,
      fromPhase as any,
      'phase_2',
      8500 // Above target
    )

    expect(validation.valid).toBe(true)
  })

  it('should reject transitions with insufficient profit', () => {
    const account = {
      ...testAccountData,
      status: 'active' as AccountStatus,
    }

    const fromPhase = {
      phaseType: 'phase_1' as PhaseType,
      profitTarget: 8000,
    }

    const validation = PropFirmBusinessRules.validatePhaseTransition(
      account as any,
      fromPhase as any,
      'phase_2',
      6000 // Below target
    )

    expect(validation.valid).toBe(false)
    expect(validation.reason).toBe('Profit target not reached')
  })

  it('should reject transitions from failed accounts', () => {
    const account = {
      ...testAccountData,
      status: 'failed' as AccountStatus,
    }

    const fromPhase = {
      phaseType: 'phase_1' as PhaseType,
      profitTarget: 8000,
    }

    const validation = PropFirmBusinessRules.validatePhaseTransition(
      account as any,
      fromPhase as any,
      'phase_2',
      10000
    )

    expect(validation.valid).toBe(false)
    expect(validation.reason).toBe('Account is in failed status')
  })

  it('should enforce evaluation type progression rules', () => {
    const account = {
      ...testAccountData,
      status: 'active' as AccountStatus,
      evaluationType: 'one_step' as EvaluationType,
    }

    const fromPhase = {
      phaseType: 'phase_1' as PhaseType,
      profitTarget: 10000,
    }

    // Should not allow phase_2 in one-step evaluation
    const validation = PropFirmBusinessRules.validatePhaseTransition(
      account as any,
      fromPhase as any,
      'phase_2',
      12000
    )

    expect(validation.valid).toBe(false)
    expect(validation.reason).toBe('One-step evaluation must go directly to funded')
  })
})

// Helper function to clean up test data
async function cleanupTestData() {
  try {
    await prisma.trade.deleteMany({
      where: { userId: testUserId }
    })
    await prisma.equitySnapshot.deleteMany({
      where: { account: { userId: testUserId } }
    })
    await prisma.dailyAnchor.deleteMany({
      where: { account: { userId: testUserId } }
    })
    await prisma.breach.deleteMany({
      where: { account: { userId: testUserId } }
    })
    await prisma.accountTransition.deleteMany({
      where: { account: { userId: testUserId } }
    })
    await prisma.accountPhase.deleteMany({
      where: { account: { userId: testUserId } }
    })
    await prisma.payout.deleteMany({
      where: { account: { userId: testUserId } }
    })
    await prisma.account.deleteMany({
      where: { userId: testUserId }
    })
  } catch (error) {
    console.error('Cleanup error:', error)
  }
}

// Integration tests would require database setup
describe.skip('Integration Tests', () => {
  beforeEach(async () => {
    await cleanupTestData()
  })

  afterEach(async () => {
    await cleanupTestData()
  })

  it('should create account with initial phase', async () => {
    // These tests would require actual database operations
    // and proper test environment setup
  })
})

