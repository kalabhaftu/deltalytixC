/**
 * Prop Firm System Tests
 * Comprehensive test suite for business rules and calculations
 */

import { PropFirmBusinessRules } from '../business-rules'
import { PropFirmAccount, AccountPhase, PropFirmTrade } from '@/types/prop-firm'

// Test data
const testAccountData: Partial<PropFirmAccount> = {
  id: 'test-account-1',
  number: 'TEST001',
  propfirm: 'Test Firm',
  startingBalance: 100000,
  dailyDrawdownAmount: 5, // 5%
  dailyDrawdownType: 'percent',
  maxDrawdownAmount: 10, // 10%
  maxDrawdownType: 'percent',
  drawdownModeMax: 'static',
  evaluationType: 'two_step',
  timezone: 'UTC',
  dailyResetTime: '00:00',
  status: 'active',
  profitSplitPercent: 80,
  payoutCycleDays: 14,
  minDaysToFirstPayout: 4,
  resetOnPayout: false,
  reduceBalanceByPayout: true,
}

const testPhaseData: Partial<AccountPhase> = {
  id: 'test-phase-1',
  accountId: 'test-account-1',
  phaseType: 'phase_1',
  phaseStatus: 'active',
  profitTarget: 8000, // 8% of 100k
  phaseStartAt: new Date('2024-01-01'),
  currentEquity: 100000,
  currentBalance: 100000,
  netProfitSincePhaseStart: 0,
  highestEquitySincePhaseStart: 100000,
  totalTrades: 0,
  winningTrades: 0,
  totalCommission: 0,
}

const testTradeData: Partial<PropFirmTrade> = {
  id: 'test-trade-1',
  accountId: 'test-account-1',
  phaseId: 'test-phase-1',
  symbol: 'ES',
  side: 'long',
  quantity: 1,
  entryPrice: 5000,
  exitPrice: 5100,
  entryTime: new Date('2024-01-01T10:00:00Z'),
  exitTime: new Date('2024-01-01T11:00:00Z'),
  realizedPnl: 100,
  fees: 5,
  commission: 2,
}

describe('Prop Firm Business Rules', () => {
  describe('Drawdown Calculations', () => {
    it('should calculate daily drawdown correctly', () => {
      const account = testAccountData as PropFirmAccount
      const phase = testPhaseData as AccountPhase
      const currentEquity = 95000 // 5k loss
      const dailyStartBalance = 100000
      const highestEquity = 100000

      const drawdown = PropFirmBusinessRules.calculateDrawdown(
        account,
        phase,
        currentEquity,
        dailyStartBalance,
        highestEquity
      )

      expect(drawdown.dailyDrawdownRemaining).toBe(0) // At limit
      expect(drawdown.isBreached).toBe(true)
      expect(drawdown.breachType).toBe('daily_drawdown')
    })

    it('should calculate max drawdown correctly', () => {
      const account = testAccountData as PropFirmAccount
      const phase = testPhaseData as AccountPhase
      const currentEquity = 85000 // 15k loss
      const dailyStartBalance = 100000
      const highestEquity = 100000

      const drawdown = PropFirmBusinessRules.calculateDrawdown(
        account,
        phase,
        currentEquity,
        dailyStartBalance,
        highestEquity
      )

      expect(drawdown.maxDrawdownRemaining).toBe(0) // At limit
      expect(drawdown.isBreached).toBe(true)
      expect(drawdown.breachType).toBe('max_drawdown')
    })

    it('should handle trailing drawdown correctly', () => {
      const account = {
        ...testAccountData,
        drawdownModeMax: 'trailing' as const,
        maxDrawdownAmount: 5, // 5%
        maxDrawdownType: 'percent' as const,
      } as PropFirmAccount

      const phase = testPhaseData as AccountPhase
      const currentEquity = 95000
      const dailyStartBalance = 100000
      const highestEquity = 110000 // Trailing from 110k

      const drawdown = PropFirmBusinessRules.calculateDrawdown(
        account,
        phase,
        currentEquity,
        dailyStartBalance,
        highestEquity
      )

      // Should be 5% of 110k = 5500, current DD = 15000, remaining = 0
      expect(drawdown.maxDrawdownRemaining).toBe(0)
      expect(drawdown.isBreached).toBe(true)
    })

    it('should handle invalid numbers gracefully', () => {
      const account = testAccountData as PropFirmAccount
      const phase = testPhaseData as AccountPhase
      const currentEquity = NaN
      const dailyStartBalance = null as any
      const highestEquity = undefined as any

      const drawdown = PropFirmBusinessRules.calculateDrawdown(
        account,
        phase,
        currentEquity,
        dailyStartBalance,
        highestEquity
      )

      expect(drawdown.currentEquity).toBe(100000) // Default to starting balance
      expect(drawdown.dailyStartBalance).toBe(100000)
      expect(drawdown.highestEquity).toBe(100000)
      expect(drawdown.isBreached).toBe(false)
    })
  })

  describe('Phase Progression', () => {
    it('should calculate phase progress correctly', () => {
      const account = testAccountData as PropFirmAccount
      const phase = testPhaseData as AccountPhase
      const netProfit = 4000 // 50% of 8000 target

      const progress = PropFirmBusinessRules.calculatePhaseProgress(
        account,
        phase,
        netProfit
      )

      expect(progress.profitProgress).toBe(50)
      expect(progress.canProgress).toBe(false)
    })

    it('should allow progression when target is met', () => {
      const account = testAccountData as PropFirmAccount
      const phase = testPhaseData as AccountPhase
      const netProfit = 8000 // 100% of target

      const progress = PropFirmBusinessRules.calculatePhaseProgress(
        account,
        phase,
        netProfit
      )

      expect(progress.profitProgress).toBe(100)
      expect(progress.canProgress).toBe(true)
      expect(progress.nextPhaseType).toBe('phase_2')
    })

    it('should handle one-step evaluation correctly', () => {
      const account = {
        ...testAccountData,
        evaluationType: 'one_step' as const,
      } as PropFirmAccount

      const phase = testPhaseData as AccountPhase
      const netProfit = 8000

      const progress = PropFirmBusinessRules.calculatePhaseProgress(
        account,
        phase,
        netProfit
      )

      expect(progress.canProgress).toBe(true)
      expect(progress.nextPhaseType).toBe('funded')
    })

    it('should handle funded phase correctly', () => {
      const account = testAccountData as PropFirmAccount
      const phase = {
        ...testPhaseData,
        phaseType: 'funded' as const,
        profitTarget: undefined,
      } as AccountPhase

      const progress = PropFirmBusinessRules.calculatePhaseProgress(
        account,
        phase,
        10000
      )

      expect(progress.profitProgress).toBe(100)
      expect(progress.canProgress).toBe(false) // Already at final phase
    })

    it('should handle invalid profit values', () => {
      const account = testAccountData as PropFirmAccount
      const phase = testPhaseData as AccountPhase
      const netProfit = NaN

      const progress = PropFirmBusinessRules.calculatePhaseProgress(
        account,
        phase,
        netProfit
      )

      expect(progress.profitProgress).toBe(0)
      expect(progress.canProgress).toBe(false)
    })
  })

  describe('Payout Eligibility', () => {
    it('should calculate payout eligibility correctly', () => {
      const account = testAccountData as PropFirmAccount
      const phase = {
        ...testPhaseData,
        phaseType: 'funded' as const,
      } as AccountPhase
      const daysSinceFunded = 10
      const daysSinceLastPayout = 20
      const netProfitSinceLastPayout = 5000
      const hasActiveBreaches = false

      const eligibility = PropFirmBusinessRules.calculatePayoutEligibility(
        account,
        phase,
        daysSinceFunded,
        daysSinceLastPayout,
        netProfitSinceLastPayout,
        hasActiveBreaches
      )

      expect(eligibility.isEligible).toBe(true)
      expect(eligibility.maxPayoutAmount).toBe(4000) // 80% of 5000
    })

    it('should block payout with active breaches', () => {
      const account = testAccountData as PropFirmAccount
      const phase = {
        ...testPhaseData,
        phaseType: 'funded' as const,
      } as AccountPhase
      const hasActiveBreaches = true

      const eligibility = PropFirmBusinessRules.calculatePayoutEligibility(
        account,
        phase,
        10,
        20,
        5000,
        hasActiveBreaches
      )

      expect(eligibility.isEligible).toBe(false)
      expect(eligibility.blockers).toContain('Active rule violations prevent payout')
    })

    it('should block payout before minimum days', () => {
      const account = testAccountData as PropFirmAccount
      const phase = {
        ...testPhaseData,
        phaseType: 'funded' as const,
      } as AccountPhase
      const daysSinceFunded = 2 // Less than 4 required

      const eligibility = PropFirmBusinessRules.calculatePayoutEligibility(
        account,
        phase,
        daysSinceFunded,
        20,
        5000,
        false
      )

      expect(eligibility.isEligible).toBe(false)
      expect(eligibility.blockers).toContain('Must wait 2 more days since funded')
    })

    it('should block payout before cycle completion', () => {
      const account = testAccountData as PropFirmAccount
      const phase = {
        ...testPhaseData,
        phaseType: 'funded' as const,
      } as AccountPhase
      const daysSinceLastPayout = 7 // Less than 14 required

      const eligibility = PropFirmBusinessRules.calculatePayoutEligibility(
        account,
        phase,
        10,
        daysSinceLastPayout,
        5000,
        false
      )

      expect(eligibility.isEligible).toBe(false)
      expect(eligibility.blockers).toContain('Must wait 7 more days since last payout')
    })

    it('should handle minimum profit requirements', () => {
      const account = {
        ...testAccountData,
        payoutEligibilityMinProfit: 10000,
      } as PropFirmAccount

      const phase = {
        ...testPhaseData,
        phaseType: 'funded' as const,
      } as AccountPhase

      const eligibility = PropFirmBusinessRules.calculatePayoutEligibility(
        account,
        phase,
        10,
        20,
        5000, // Less than 10000 required
        false
      )

      expect(eligibility.isEligible).toBe(false)
      expect(eligibility.blockers).toContain('Minimum profit requirement not met')
    })

    it('should handle invalid profit values', () => {
      const account = testAccountData as PropFirmAccount
      const phase = {
        ...testPhaseData,
        phaseType: 'funded' as const,
      } as AccountPhase
      const netProfitSinceLastPayout = NaN

      const eligibility = PropFirmBusinessRules.calculatePayoutEligibility(
        account,
        phase,
        10,
        20,
        netProfitSinceLastPayout,
        false
      )

      expect(eligibility.isEligible).toBe(true)
      expect(eligibility.maxPayoutAmount).toBe(0)
    })
  })

  describe('Risk Metrics', () => {
    it('should calculate risk metrics correctly', () => {
      const account = testAccountData as PropFirmAccount
      const trades = [
        { ...testTradeData, realizedPnl: 100 } as PropFirmTrade,
        { ...testTradeData, id: 'trade-2', realizedPnl: -50 } as PropFirmTrade,
        { ...testTradeData, id: 'trade-3', realizedPnl: 200 } as PropFirmTrade,
      ]
      const currentEquity = 100250

      const metrics = PropFirmBusinessRules.calculateRiskMetrics(
        account,
        trades,
        currentEquity
      )

      expect(metrics.totalTrades).toBe(3)
      expect(metrics.winRate).toBe(66.67) // 2 wins out of 3
      expect(metrics.avgWin).toBe(150) // (100 + 200) / 2
      expect(metrics.avgLoss).toBe(50) // abs(-50)
      expect(metrics.profitFactor).toBe(3) // 300 / 100
      expect(metrics.currentStreak).toBe(1) // Last trade was a win
    })

    it('should handle empty trades array', () => {
      const account = testAccountData as PropFirmAccount
      const trades: PropFirmTrade[] = []
      const currentEquity = 100000

      const metrics = PropFirmBusinessRules.calculateRiskMetrics(
        account,
        trades,
        currentEquity
      )

      expect(metrics.totalTrades).toBe(0)
      expect(metrics.winRate).toBe(0)
      expect(metrics.avgWin).toBe(0)
      expect(metrics.avgLoss).toBe(0)
      expect(metrics.profitFactor).toBe(0)
      expect(metrics.currentStreak).toBe(0)
      expect(metrics.riskOfRuin).toBe(1)
    })

    it('should handle invalid trade PnL values', () => {
      const account = testAccountData as PropFirmAccount
      const trades = [
        { ...testTradeData, realizedPnl: NaN } as PropFirmTrade,
        { ...testTradeData, id: 'trade-2', realizedPnl: null as any } as PropFirmTrade,
        { ...testTradeData, id: 'trade-3', realizedPnl: 100 } as PropFirmTrade,
      ]
      const currentEquity = 100100

      const metrics = PropFirmBusinessRules.calculateRiskMetrics(
        account,
        trades,
        currentEquity
      )

      expect(metrics.totalTrades).toBe(3)
      expect(metrics.winRate).toBe(100) // Only valid trade was a win
      expect(metrics.avgWin).toBe(100)
      expect(metrics.avgLoss).toBe(0)
    })

    it('should calculate max drawdown correctly', () => {
      const account = testAccountData as PropFirmAccount
      const trades = [
        { ...testTradeData, realizedPnl: -1000 } as PropFirmTrade,
        { ...testTradeData, id: 'trade-2', realizedPnl: 500 } as PropFirmTrade,
        { ...testTradeData, id: 'trade-3', realizedPnl: -2000 } as PropFirmTrade,
      ]
      const currentEquity = 97500

      const metrics = PropFirmBusinessRules.calculateRiskMetrics(
        account,
        trades,
        currentEquity
      )

      // Starting: 100000, after -1000: 99000, after +500: 99500, after -2000: 97500
      // Peak: 100000, Max DD: 100000 - 97500 = 2500
      expect(metrics.maxDrawdownEncountered).toBe(2500)
    })
  })

  describe('Payout Effects', () => {
    it('should calculate balance reduction correctly', () => {
      const account = {
        ...testAccountData,
        resetOnPayout: false,
        reduceBalanceByPayout: true,
      } as PropFirmAccount

      const effects = PropFirmBusinessRules.calculatePayoutEffects(
        account,
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
      } as PropFirmAccount

      const effects = PropFirmBusinessRules.calculatePayoutEffects(
        account,
        300000,
        50000
      )

      expect(effects.newBalance).toBe(250000) // Reset to funded reset balance
      expect(effects.shouldReset).toBe(true)
      expect(effects.resetAnchors).toBe(true)
    })

    it('should handle invalid balance values', () => {
      const account = testAccountData as PropFirmAccount
      const currentBalance = NaN
      const payoutAmount = null as any

      const effects = PropFirmBusinessRules.calculatePayoutEffects(
        account,
        currentBalance,
        payoutAmount
      )

      expect(effects.newBalance).toBe(100000) // Default to starting balance
      expect(effects.shouldReset).toBe(false)
    })
  })

  describe('Account Configuration Validation', () => {
    it('should validate correct configuration', () => {
      const account = {
        number: 'TEST001',
        startingBalance: 100000,
        propfirm: 'Test Firm',
        dailyDrawdownAmount: 5,
        maxDrawdownAmount: 10,
      }

      const validation = PropFirmBusinessRules.validateAccountConfiguration(account)

      expect(validation.valid).toBe(true)
      expect(validation.errors).toHaveLength(0)
    })

    it('should catch missing required fields', () => {
      const account = {
        startingBalance: 100000,
        // Missing number and propfirm
      }

      const validation = PropFirmBusinessRules.validateAccountConfiguration(account)

      expect(validation.valid).toBe(false)
      expect(validation.errors).toContain('Account number is required')
      expect(validation.errors).toContain('Prop firm name is required')
    })

    it('should validate drawdown amounts', () => {
      const account = {
        number: 'TEST001',
        startingBalance: 100000,
        propfirm: 'Test Firm',
        dailyDrawdownAmount: 0, // Invalid
        maxDrawdownAmount: -5, // Invalid
      }

      const validation = PropFirmBusinessRules.validateAccountConfiguration(account)

      expect(validation.valid).toBe(false)
      expect(validation.errors).toContain('Daily drawdown amount must be greater than 0')
      expect(validation.errors).toContain('Maximum drawdown amount must be greater than 0')
    })

    it('should validate percentage limits', () => {
      const account = {
        number: 'TEST001',
        startingBalance: 100000,
        propfirm: 'Test Firm',
        dailyDrawdownType: 'percent' as const,
        dailyDrawdownAmount: 150, // Over 100%
        maxDrawdownType: 'percent' as const,
        maxDrawdownAmount: 200, // Over 100%
      }

      const validation = PropFirmBusinessRules.validateAccountConfiguration(account)

      expect(validation.valid).toBe(false)
      expect(validation.errors).toContain('Daily drawdown percentage cannot exceed 100%')
      expect(validation.errors).toContain('Maximum drawdown percentage cannot exceed 100%')
    })
  })

  describe('Phase Transition Validation', () => {
    it('should validate allowed transitions', () => {
      const account = testAccountData as PropFirmAccount
      const fromPhase = testPhaseData as AccountPhase
      const toPhaseType = 'phase_2' as const
      const netProfit = 8000 // Meets target

      const validation = PropFirmBusinessRules.validatePhaseTransition(
        account,
        fromPhase,
        toPhaseType,
        netProfit
      )

      expect(validation.valid).toBe(true)
    })

    it('should block invalid transitions', () => {
      const account = testAccountData as PropFirmAccount
      const fromPhase = {
        ...testPhaseData,
        phaseType: 'funded' as const,
      } as AccountPhase
      const toPhaseType = 'phase_2' as const

      const validation = PropFirmBusinessRules.validatePhaseTransition(
        account,
        fromPhase,
        toPhaseType,
        10000
      )

      expect(validation.valid).toBe(false)
      expect(validation.reason).toBe('Cannot transition from funded phase')
    })

    it('should validate profit target requirements', () => {
      const account = testAccountData as PropFirmAccount
      const fromPhase = testPhaseData as AccountPhase
      const toPhaseType = 'phase_2' as const
      const netProfit = 4000 // Below 8000 target

      const validation = PropFirmBusinessRules.validatePhaseTransition(
        account,
        fromPhase,
        toPhaseType,
        netProfit
      )

      expect(validation.valid).toBe(false)
      expect(validation.reason).toBe('Profit target not met')
    })

    it('should handle invalid profit values', () => {
      const account = testAccountData as PropFirmAccount
      const fromPhase = testPhaseData as AccountPhase
      const toPhaseType = 'phase_2' as const
      const netProfit = NaN

      const validation = PropFirmBusinessRules.validatePhaseTransition(
        account,
        fromPhase,
        toPhaseType,
        netProfit
      )

      expect(validation.valid).toBe(false)
      expect(validation.reason).toBe('Profit target not met')
    })
  })

  describe('Default Profit Targets', () => {
    it('should return undefined for funded phase', () => {
      const target = PropFirmBusinessRules.getDefaultProfitTarget(
        'funded',
        100000,
        'two_step'
      )

      expect(target).toBeUndefined()
    })

    it('should calculate one-step targets correctly', () => {
      const target = PropFirmBusinessRules.getDefaultProfitTarget(
        'phase_1',
        100000,
        'one_step'
      )

      expect(target).toBe(8000) // 8% of 100k
    })

    it('should calculate two-step targets correctly', () => {
      const phase1Target = PropFirmBusinessRules.getDefaultProfitTarget(
        'phase_1',
        100000,
        'two_step'
      )
      const phase2Target = PropFirmBusinessRules.getDefaultProfitTarget(
        'phase_2',
        100000,
        'two_step'
      )

      expect(phase1Target).toBe(8000) // 8% of 100k
      expect(phase2Target).toBe(5000) // 5% of 100k
    })

    it('should handle invalid starting balance', () => {
      const target = PropFirmBusinessRules.getDefaultProfitTarget(
        'phase_1',
        NaN,
        'two_step'
      )

      expect(target).toBe(0) // 8% of 0
    })
  })
})

