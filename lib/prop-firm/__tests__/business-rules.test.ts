/**
 * Unit Tests for Prop Firm Business Rules
 * Tests all calculation methods and edge cases
 */

import { PropFirmBusinessRules } from '../business-rules'
import { PropFirmAccount, AccountPhase, PropFirmTrade } from '@/types/prop-firm'

describe('PropFirmBusinessRules', () => {
  const mockAccount: PropFirmAccount = {
    id: '1',
    number: 'TEST001',
    name: 'Test Account',
    propfirm: 'Test Firm',
    startingBalance: 10000,
    status: 'active',
    userId: 'user1',
    dailyDrawdownAmount: 5, // 5%
    dailyDrawdownType: 'percent',
    maxDrawdownAmount: 10, // 10%
    maxDrawdownType: 'percent',
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
    payoutEligibilityMinProfit: 100,
    resetOnPayout: false,
    reduceBalanceByPayout: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const mockPhase: AccountPhase = {
    id: 'phase1',
    accountId: '1',
    phaseType: 'phase_1',
    phaseStatus: 'active',
    profitTarget: 800, // 8% of 10000
    phaseStartAt: new Date('2024-01-01'),
    currentEquity: 10500,
    currentBalance: 10500,
    netProfitSincePhaseStart: 500,
    highestEquitySincePhaseStart: 10600,
    totalTrades: 10,
    winningTrades: 7,
    totalCommission: 50,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  describe('calculateDrawdown', () => {
    it('should calculate drawdown correctly with valid inputs', () => {
      const result = PropFirmBusinessRules.calculateDrawdown(
        mockAccount,
        mockPhase,
        10500, // current equity
        10000, // daily start balance
        10600  // highest equity
      )

      expect(result.currentEquity).toBe(10500)
      expect(result.dailyStartBalance).toBe(10000)
      expect(result.highestEquity).toBe(10600)
      expect(result.isBreached).toBe(false)
      expect(result.dailyDrawdownRemaining).toBeGreaterThan(0)
      expect(result.maxDrawdownRemaining).toBeGreaterThan(0)
    })

    it('should handle negative equity gracefully', () => {
      const result = PropFirmBusinessRules.calculateDrawdown(
        mockAccount,
        mockPhase,
        -1000, // negative equity
        10000,
        10600
      )

      expect(result.currentEquity).toBe(10000) // Should default to starting balance
      expect(result.isBreached).toBe(false)
    })

    it('should handle NaN values gracefully', () => {
      const result = PropFirmBusinessRules.calculateDrawdown(
        mockAccount,
        mockPhase,
        NaN,
        10000,
        10600
      )

      expect(result.currentEquity).toBe(10000) // Should default to starting balance
      expect(result.isBreached).toBe(false)
    })

    it('should detect daily drawdown breach', () => {
      const result = PropFirmBusinessRules.calculateDrawdown(
        mockAccount,
        mockPhase,
        9400, // 6% loss from daily start
        10000,
        10600
      )

      expect(result.isBreached).toBe(true)
      expect(result.breachType).toBe('daily_drawdown')
      expect(result.breachAmount).toBe(600)
    })

    it('should detect max drawdown breach', () => {
      const result = PropFirmBusinessRules.calculateDrawdown(
        mockAccount,
        mockPhase,
        8900, // 11% loss from starting balance
        10000,
        10600
      )

      expect(result.isBreached).toBe(true)
      expect(result.breachType).toBe('max_drawdown')
      expect(result.breachAmount).toBe(1100)
    })
  })

  describe('calculatePhaseProgress', () => {
    it('should calculate progress correctly', () => {
      const result = PropFirmBusinessRules.calculatePhaseProgress(
        mockAccount,
        mockPhase,
        500 // net profit
      )

      expect(result.profitProgress).toBe((500 / 800) * 100)
      expect(result.canProgress).toBe(false)
      expect(result.daysInPhase).toBeGreaterThan(0)
    })

    it('should allow progression when target is met', () => {
      const result = PropFirmBusinessRules.calculatePhaseProgress(
        mockAccount,
        mockPhase,
        800 // exactly at target
      )

      expect(result.profitProgress).toBe(100)
      expect(result.canProgress).toBe(true)
      expect(result.nextPhaseType).toBe('phase_2')
    })

    it('should handle negative profit gracefully', () => {
      const result = PropFirmBusinessRules.calculatePhaseProgress(
        mockAccount,
        mockPhase,
        -100
      )

      expect(result.profitProgress).toBe(0)
      expect(result.canProgress).toBe(false)
    })

    it('should handle NaN profit gracefully', () => {
      const result = PropFirmBusinessRules.calculatePhaseProgress(
        mockAccount,
        mockPhase,
        NaN
      )

      expect(result.profitProgress).toBe(0)
      expect(result.canProgress).toBe(false)
    })

    it('should handle one-step evaluation', () => {
      const oneStepAccount = { ...mockAccount, evaluationType: 'one_step' }
      const result = PropFirmBusinessRules.calculatePhaseProgress(
        oneStepAccount,
        mockPhase,
        800
      )

      expect(result.canProgress).toBe(true)
      expect(result.nextPhaseType).toBe('funded')
    })

    it('should handle funded phase correctly', () => {
      const fundedPhase = { ...mockPhase, phaseType: 'funded', profitTarget: undefined }
      const result = PropFirmBusinessRules.calculatePhaseProgress(
        mockAccount,
        fundedPhase,
        1000
      )

      expect(result.profitProgress).toBe(100)
      expect(result.canProgress).toBe(false)
    })
  })

  describe('calculatePayoutEligibility', () => {
    const fundedPhase: AccountPhase = {
      ...mockPhase,
      phaseType: 'funded',
      profitTarget: undefined,
    }

    it('should calculate eligibility correctly', () => {
      const result = PropFirmBusinessRules.calculatePayoutEligibility(
        mockAccount,
        fundedPhase,
        10, // days since funded
        20, // days since last payout
        500, // net profit
        false // no active breaches
      )

      expect(result.isEligible).toBe(true)
      expect(result.maxPayoutAmount).toBe(400) // 80% of 500
    })

    it('should block payout with active breaches', () => {
      const result = PropFirmBusinessRules.calculatePayoutEligibility(
        mockAccount,
        fundedPhase,
        10,
        20,
        500,
        true // active breaches
      )

      expect(result.isEligible).toBe(false)
      expect(result.blockers).toContain('Active rule violations prevent payout')
    })

    it('should block payout before minimum days', () => {
      const result = PropFirmBusinessRules.calculatePayoutEligibility(
        mockAccount,
        fundedPhase,
        2, // less than 4 days
        20,
        500,
        false
      )

      expect(result.isEligible).toBe(false)
      expect(result.blockers).toContain('Must wait 2 more days since funded')
    })

    it('should block payout before cycle completion', () => {
      const result = PropFirmBusinessRules.calculatePayoutEligibility(
        mockAccount,
        fundedPhase,
        10,
        10, // less than 14 days
        500,
        false
      )

      expect(result.isEligible).toBe(false)
      expect(result.blockers).toContain('Must wait 4 more days since last payout')
    })

    it('should block payout below minimum profit', () => {
      const result = PropFirmBusinessRules.calculatePayoutEligibility(
        mockAccount,
        fundedPhase,
        10,
        20,
        50, // less than 100 minimum
        false
      )

      expect(result.isEligible).toBe(false)
      expect(result.blockers).toContain('Minimum profit requirement not met')
    })

    it('should handle negative days gracefully', () => {
      const result = PropFirmBusinessRules.calculatePayoutEligibility(
        mockAccount,
        fundedPhase,
        -5,
        -10,
        500,
        false
      )

      expect(result.isEligible).toBe(false)
      expect(result.blockers).toContain('Must wait 9 more days since funded')
    })
  })

  describe('calculateRiskMetrics', () => {
    const mockTrades: PropFirmTrade[] = [
      {
        id: '1',
        accountNumber: 'TEST001',
        quantity: 100,
        entryPrice: '100',
        closePrice: '110',
        entryDate: '2024-01-01',
        closeDate: '2024-01-01',
        pnl: 1000,
        timeInPosition: 1,
        userId: 'user1',
        side: 'long',
        commission: 10,
        createdAt: new Date(),
        realizedPnl: 990,
      },
      {
        id: '2',
        accountNumber: 'TEST001',
        quantity: 100,
        entryPrice: '100',
        closePrice: '90',
        entryDate: '2024-01-02',
        closeDate: '2024-01-02',
        pnl: -1000,
        timeInPosition: 1,
        userId: 'user1',
        side: 'long',
        commission: 10,
        createdAt: new Date(),
        realizedPnl: -1010,
      },
    ]

    it('should calculate risk metrics correctly', () => {
      const result = PropFirmBusinessRules.calculateRiskMetrics(
        mockAccount,
        mockTrades,
        10500
      )

      expect(result.totalTrades).toBe(2)
      expect(result.winRate).toBe(50)
      expect(result.avgWin).toBe(990)
      expect(result.avgLoss).toBe(1010)
      expect(result.profitFactor).toBeGreaterThan(0)
    })

    it('should handle empty trades array', () => {
      const result = PropFirmBusinessRules.calculateRiskMetrics(
        mockAccount,
        [],
        10000
      )

      expect(result.totalTrades).toBe(0)
      expect(result.winRate).toBe(0)
      expect(result.avgWin).toBe(0)
      expect(result.avgLoss).toBe(0)
      expect(result.profitFactor).toBe(0)
      expect(result.riskOfRuin).toBe(1)
    })

    it('should handle trades with NaN PnL', () => {
      const tradesWithNaN = [
        {
          ...mockTrades[0],
          pnl: NaN,
          realizedPnl: NaN,
        }
      ]

      const result = PropFirmBusinessRules.calculateRiskMetrics(
        mockAccount,
        tradesWithNaN,
        10000
      )

      expect(result.totalTrades).toBe(1)
      expect(result.avgWin).toBe(0)
    })
  })

  describe('getDefaultProfitTarget', () => {
    it('should return correct target for one-step evaluation', () => {
      const result = PropFirmBusinessRules.getDefaultProfitTarget(
        'phase_1',
        10000,
        'one_step'
      )

      expect(result).toBe(800) // 8% of 10000
    })

    it('should return correct target for two-step evaluation', () => {
      const phase1Target = PropFirmBusinessRules.getDefaultProfitTarget(
        'phase_1',
        10000,
        'two_step'
      )
      const phase2Target = PropFirmBusinessRules.getDefaultProfitTarget(
        'phase_2',
        10000,
        'two_step'
      )

      expect(phase1Target).toBe(800) // 8% of 10000
      expect(phase2Target).toBe(500) // 5% of 10000
    })

    it('should return undefined for funded phase', () => {
      const result = PropFirmBusinessRules.getDefaultProfitTarget(
        'funded',
        10000,
        'two_step'
      )

      expect(result).toBeUndefined()
    })
  })

  describe('validateAccountConfiguration', () => {
    it('should validate correct configuration', () => {
      const result = PropFirmBusinessRules.validateAccountConfiguration(mockAccount)

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject missing account number', () => {
      const invalidAccount = { ...mockAccount, number: '' }
      const result = PropFirmBusinessRules.validateAccountConfiguration(invalidAccount)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Account number is required')
    })

    it('should reject invalid starting balance', () => {
      const invalidAccount = { ...mockAccount, startingBalance: 0 }
      const result = PropFirmBusinessRules.validateAccountConfiguration(invalidAccount)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Starting balance must be greater than 0')
    })

    it('should reject invalid drawdown percentages', () => {
      const invalidAccount = { 
        ...mockAccount, 
        dailyDrawdownAmount: 150, // > 100%
        dailyDrawdownType: 'percent'
      }
      const result = PropFirmBusinessRules.validateAccountConfiguration(invalidAccount)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Daily drawdown percentage cannot exceed 100%')
    })
  })

  describe('calculateEquity', () => {
    it('should include open PnL when configured', () => {
      const accountWithOpenPnl = { ...mockAccount, ddIncludeOpenPnl: true }
      const result = PropFirmBusinessRules.calculateEquity(
        10000, // balance
        500,   // open PnL
        accountWithOpenPnl,
        'drawdown'
      )

      expect(result).toBe(10500)
    })

    it('should exclude open PnL when not configured', () => {
      const result = PropFirmBusinessRules.calculateEquity(
        10000, // balance
        500,   // open PnL
        mockAccount,
        'drawdown'
      )

      expect(result).toBe(10000)
    })
  })

  describe('calculatePayoutEffects', () => {
    it('should calculate reset effects correctly', () => {
      const accountWithReset = { ...mockAccount, resetOnPayout: true, fundedResetBalance: 8000 }
      const result = PropFirmBusinessRules.calculatePayoutEffects(
        accountWithReset,
        10500, // current balance
        1000   // payout amount
      )

      expect(result.shouldReset).toBe(true)
      expect(result.newBalance).toBe(8000)
      expect(result.resetAnchors).toBe(true)
    })

    it('should calculate balance reduction correctly', () => {
      const result = PropFirmBusinessRules.calculatePayoutEffects(
        mockAccount,
        10500, // current balance
        1000   // payout amount
      )

      expect(result.shouldReset).toBe(false)
      expect(result.newBalance).toBe(9500)
      expect(result.resetAnchors).toBe(false)
    })
  })
})

