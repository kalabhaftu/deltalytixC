/**
 * Business Rules Tests
 * Tests for prop firm evaluation business logic
 * 
 * Note: These tests can be run with Node.js or any test framework
 * They demonstrate the correctness of the business logic calculations
 */

import { PropFirmBusinessRules } from '../business-rules'
import { PropFirmAccount, AccountPhase, PropFirmTrade } from '@/types/prop-firm'

// Mock data helpers
const createMockAccount = (overrides: Partial<PropFirmAccount> = {}): PropFirmAccount => ({
  id: 'test-account',
  number: 'TEST001',
  name: 'Test Account',
  propfirm: 'Test Firm',
  startingBalance: 50000,
  status: 'active',
  userId: 'test-user',
  dailyDrawdownAmount: 2500, // 5% of 50k
  dailyDrawdownType: 'absolute',
  maxDrawdownAmount: 5000, // 10% of 50k  
  maxDrawdownType: 'absolute',
  drawdownModeMax: 'static',
  evaluationType: 'two_step',
  timezone: 'UTC',
  dailyResetTime: '00:00',
  ddIncludeOpenPnl: false,
  progressionIncludeOpenPnl: false,
  allowManualPhaseOverride: false,
  profitSplitPercent: 80,
  payoutCycleDays: 14,
  minDaysToFirstPayout: 4,
  resetOnPayout: false,
  reduceBalanceByPayout: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides
})

const createMockPhase = (overrides: Partial<AccountPhase> = {}): AccountPhase => ({
  id: 'test-phase',
  accountId: 'test-account',
  phaseType: 'phase_1',
  phaseStatus: 'active',
  profitTarget: 4000, // 8% of 50k
  phaseStartAt: new Date(),
  currentEquity: 50000,
  currentBalance: 50000,
  netProfitSincePhaseStart: 0,
  highestEquitySincePhaseStart: 50000,
  totalTrades: 0,
  winningTrades: 0,
  totalCommission: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides
})

const createMockTrade = (overrides: Partial<PropFirmTrade> = {}): PropFirmTrade => ({
  id: 'test-trade',
  accountNumber: 'TEST001',
  quantity: 1,
  instrument: 'ES',
  entryPrice: '4500',
  closePrice: '4550',
  entryDate: '2024-01-15',
  closeDate: '2024-01-15',
  pnl: 250,
  commission: 5,
  side: 'long',
  userId: 'test-user',
  fees: 5,
  realizedPnl: 245,
  accountId: 'test-account',
  phaseId: 'test-phase',
  symbol: 'ES',
  tags: [],
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides
})

// Test cases
describe('PropFirmBusinessRules', () => {
  describe('calculateDrawdown', () => {
    test('should calculate static drawdown correctly', () => {
      const account = createMockAccount({
        dailyDrawdownAmount: 2500,
        dailyDrawdownType: 'absolute',
        maxDrawdownAmount: 5000,
        maxDrawdownType: 'absolute',
        drawdownModeMax: 'static'
      })
      
      const phase = createMockPhase()
      const currentEquity = 48000 // Lost $2000
      const dailyStartBalance = 50000
      const highestEquity = 50000

      const result = PropFirmBusinessRules.calculateDrawdown(
        account,
        phase,
        currentEquity,
        dailyStartBalance,
        highestEquity
      )

      expect(result.dailyDrawdownRemaining).toBe(500) // 2500 - 2000 = 500
      expect(result.maxDrawdownRemaining).toBe(3000) // 5000 - 2000 = 3000
      expect(result.isBreached).toBe(false)
    })

    test('should detect daily drawdown breach', () => {
      const account = createMockAccount({
        dailyDrawdownAmount: 2500,
        dailyDrawdownType: 'absolute'
      })
      
      const phase = createMockPhase()
      const currentEquity = 47000 // Lost $3000, exceeds daily limit
      const dailyStartBalance = 50000
      const highestEquity = 50000

      const result = PropFirmBusinessRules.calculateDrawdown(
        account,
        phase,
        currentEquity,
        dailyStartBalance,
        highestEquity
      )

      expect(result.isBreached).toBe(true)
      expect(result.breachType).toBe('daily_drawdown')
      expect(result.breachAmount).toBe(3000)
    })

    test('should calculate trailing drawdown correctly', () => {
      const account = createMockAccount({
        maxDrawdownAmount: 5000,
        maxDrawdownType: 'absolute',
        drawdownModeMax: 'trailing'
      })
      
      const phase = createMockPhase()
      const currentEquity = 52000 // Up $2000 from start
      const dailyStartBalance = 50000
      const highestEquity = 55000 // Peaked at $55k

      const result = PropFirmBusinessRules.calculateDrawdown(
        account,
        phase,
        currentEquity,
        dailyStartBalance,
        highestEquity
      )

      // Trailing DD from highest: 55000 - 5000 = 50000 floor
      // Current equity 52000 > 50000, so remaining = 2000
      expect(result.maxDrawdownRemaining).toBe(2000)
      expect(result.isBreached).toBe(false)
    })

    test('should calculate percentage-based drawdown', () => {
      const account = createMockAccount({
        dailyDrawdownAmount: 5, // 5%
        dailyDrawdownType: 'percent',
        maxDrawdownAmount: 10, // 10%
        maxDrawdownType: 'percent'
      })
      
      const phase = createMockPhase()
      const currentEquity = 48000 // Lost $2000
      const dailyStartBalance = 50000
      const highestEquity = 50000

      const result = PropFirmBusinessRules.calculateDrawdown(
        account,
        phase,
        currentEquity,
        dailyStartBalance,
        highestEquity
      )

      // Daily: 50000 * 0.05 = 2500 limit, lost 2000, remaining 500
      expect(result.dailyDrawdownRemaining).toBe(500)
      // Max: 50000 * 0.10 = 5000 limit, lost 2000, remaining 3000
      expect(result.maxDrawdownRemaining).toBe(3000)
    })
  })

  describe('calculatePhaseProgress', () => {
    test('should calculate progress toward profit target', () => {
      const account = createMockAccount()
      const phase = createMockPhase({
        profitTarget: 4000,
        netProfitSincePhaseStart: 2000
      })

      const result = PropFirmBusinessRules.calculatePhaseProgress(
        account,
        phase,
        2000
      )

      expect(result.profitProgress).toBe(50) // 2000/4000 * 100
      expect(result.canProgress).toBe(false)
      expect(result.nextPhaseType).toBeUndefined()
    })

    test('should detect when phase can progress', () => {
      const account = createMockAccount({ evaluationType: 'two_step' })
      const phase = createMockPhase({
        profitTarget: 4000,
        phaseType: 'phase_1'
      })

      const result = PropFirmBusinessRules.calculatePhaseProgress(
        account,
        phase,
        4000 // Reached target
      )

      expect(result.profitProgress).toBe(100)
      expect(result.canProgress).toBe(true)
      expect(result.nextPhaseType).toBe('phase_2')
    })

    test('should handle one-step evaluation', () => {
      const account = createMockAccount({ evaluationType: 'one_step' })
      const phase = createMockPhase({
        profitTarget: 5000,
        phaseType: 'phase_1'
      })

      const result = PropFirmBusinessRules.calculatePhaseProgress(
        account,
        phase,
        5000
      )

      expect(result.canProgress).toBe(true)
      expect(result.nextPhaseType).toBe('funded')
    })
  })

  describe('calculatePayoutEligibility', () => {
    test('should require funded phase for payout', () => {
      const account = createMockAccount()
      const phase = createMockPhase({ phaseType: 'phase_1' })

      const result = PropFirmBusinessRules.calculatePayoutEligibility(
        account,
        phase,
        10, // days since funded
        10, // days since last payout
        1000, // profit since last payout
        false // no breaches
      )

      expect(result.isEligible).toBe(false)
      expect(result.blockers).toContain('Account must be in funded phase')
    })

    test('should check minimum days requirement', () => {
      const account = createMockAccount({ minDaysToFirstPayout: 7 })
      const phase = createMockPhase({ phaseType: 'funded' })

      const result = PropFirmBusinessRules.calculatePayoutEligibility(
        account,
        phase,
        3, // Only 3 days since funded
        3,
        1000,
        false
      )

      expect(result.isEligible).toBe(false)
      expect(result.blockers).toContain('Must wait 7 days since funding')
    })

    test('should check payout cycle', () => {
      const account = createMockAccount({ 
        minDaysToFirstPayout: 4,
        payoutCycleDays: 14 
      })
      const phase = createMockPhase({ phaseType: 'funded' })

      const result = PropFirmBusinessRules.calculatePayoutEligibility(
        account,
        phase,
        10, // 10 days since funded
        5,  // Only 5 days since last payout (need 14)
        1000,
        false
      )

      expect(result.isEligible).toBe(false)
      expect(result.blockers).toContain('Must wait 14 days since last payout')
    })

    test('should allow eligible payout', () => {
      const account = createMockAccount({ 
        minDaysToFirstPayout: 4,
        payoutCycleDays: 14,
        payoutEligibilityMinProfit: 500
      })
      const phase = createMockPhase({ phaseType: 'funded' })

      const result = PropFirmBusinessRules.calculatePayoutEligibility(
        account,
        phase,
        10, // 10 days since funded
        15, // 15 days since last payout
        1000, // $1000 profit (> $500 minimum)
        false
      )

      expect(result.isEligible).toBe(true)
      expect(result.blockers).toHaveLength(0)
    })
  })

  describe('validatePhaseTransition', () => {
    test('should prevent transition without profit target', () => {
      const account = createMockAccount()
      const fromPhase = createMockPhase({ profitTarget: 4000 })

      const result = PropFirmBusinessRules.validatePhaseTransition(
        account,
        fromPhase,
        'phase_2',
        3000 // Less than target
      )

      expect(result.valid).toBe(false)
      expect(result.reason).toBe('Profit target not reached')
    })

    test('should allow valid transition', () => {
      const account = createMockAccount({ evaluationType: 'two_step' })
      const fromPhase = createMockPhase({ 
        phaseType: 'phase_1',
        profitTarget: 4000 
      })

      const result = PropFirmBusinessRules.validatePhaseTransition(
        account,
        fromPhase,
        'phase_2',
        4000 // Reached target
      )

      expect(result.valid).toBe(true)
    })

    test('should prevent invalid evaluation progression', () => {
      const account = createMockAccount({ evaluationType: 'one_step' })
      const fromPhase = createMockPhase({ phaseType: 'phase_1' })

      const result = PropFirmBusinessRules.validatePhaseTransition(
        account,
        fromPhase,
        'phase_2', // Invalid for one-step
        4000
      )

      expect(result.valid).toBe(false)
      expect(result.reason).toBe('One-step evaluation must go directly to funded')
    })
  })

  describe('calculateRiskMetrics', () => {
    test('should calculate basic risk metrics', () => {
      const account = createMockAccount()
      const trades = [
        createMockTrade({ realizedPnl: 250 }),
        createMockTrade({ realizedPnl: -100 }),
        createMockTrade({ realizedPnl: 300 }),
        createMockTrade({ realizedPnl: -150 })
      ]

      const result = PropFirmBusinessRules.calculateRiskMetrics(
        account,
        trades,
        50300 // Current equity
      )

      expect(result.totalTrades).toBe(4)
      expect(result.winRate).toBe(50) // 2 winners out of 4
      expect(result.avgWin).toBe(275) // (250 + 300) / 2
      expect(result.avgLoss).toBe(125) // (100 + 150) / 2
      expect(result.profitFactor).toBe(2.2) // 550 gross profit / 250 gross loss
    })

    test('should handle winning streak', () => {
      const account = createMockAccount()
      const trades = [
        createMockTrade({ realizedPnl: 100 }),
        createMockTrade({ realizedPnl: 200 }),
        createMockTrade({ realizedPnl: 150 }) // Last trade is winner
      ]

      const result = PropFirmBusinessRules.calculateRiskMetrics(
        account,
        trades,
        50450
      )

      expect(result.currentStreak).toBe(3) // 3 consecutive wins
    })

    test('should handle losing streak', () => {
      const account = createMockAccount()
      const trades = [
        createMockTrade({ realizedPnl: 100 }),
        createMockTrade({ realizedPnl: -50 }),
        createMockTrade({ realizedPnl: -75 }) // Last trade is loss
      ]

      const result = PropFirmBusinessRules.calculateRiskMetrics(
        account,
        trades,
        49975
      )

      expect(result.currentStreak).toBe(-2) // 2 consecutive losses
    })
  })
})

// Simple test runner for Node.js (if no test framework is available)
if (typeof describe === 'undefined') {
  console.log('Running prop firm business rules tests...')
  
  // Simple test implementation
  const tests: { name: string; fn: () => void }[] = []
  const describes: { name: string; tests: typeof tests }[] = []
  let currentDescribe: typeof describes[0] | null = null
  
  global.describe = (name: string, fn: () => void) => {
    const describe = { name, tests: [] }
    describes.push(describe)
    currentDescribe = describe
    fn()
    currentDescribe = null
  }
  
  global.test = (name: string, fn: () => void) => {
    if (currentDescribe) {
      currentDescribe.tests.push({ name, fn })
    }
  }
  
  global.expect = (actual: any) => ({
    toBe: (expected: any) => {
      if (actual !== expected) {
        throw new Error(`Expected ${expected}, got ${actual}`)
      }
    },
    toHaveLength: (length: number) => {
      if (actual.length !== length) {
        throw new Error(`Expected length ${length}, got ${actual.length}`)
      }
    },
    toContain: (item: any) => {
      if (!actual.includes(item)) {
        throw new Error(`Expected array to contain ${item}`)
      }
    },
    toBeUndefined: () => {
      if (actual !== undefined) {
        throw new Error(`Expected undefined, got ${actual}`)
      }
    }
  })
  
  // Run tests
  let totalTests = 0
  let passedTests = 0
  
  describes.forEach(describe => {
    console.log(`\n${describe.name}:`)
    describe.tests.forEach(test => {
      totalTests++
      try {
        test.fn()
        console.log(`  ✓ ${test.name}`)
        passedTests++
      } catch (error) {
        console.log(`  ✗ ${test.name}: ${error.message}`)
      }
    })
  })
  
  console.log(`\nTests: ${passedTests}/${totalTests} passed`)
  
  if (passedTests === totalTests) {
    console.log('🎉 All tests passed!')
  } else {
    console.log('❌ Some tests failed')
    process.exit(1)
  }
}

