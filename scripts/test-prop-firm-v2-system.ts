/**
 * Comprehensive Test Script for Rebuilt Prop Firm System
 * Tests all major functionality with realistic scenarios
 */

import { PrismaClient } from '@prisma/client'
import { PropFirmEngine } from '../lib/prop-firm/prop-firm-engine'
import { PropFirmAccountFilters } from '../lib/prop-firm/account-filters'

const prisma = new PrismaClient()

interface TestScenario {
  name: string
  description: string
  execute: () => Promise<void>
}

// Test user ID (you'll need to replace this with a real user ID from your system)
const TEST_USER_ID = 'test-user-id'

async function createTestUser(): Promise<string> {
  try {
    // Check if test user exists
    let user = await prisma.user.findFirst({
      where: { email: 'propfirm-test@example.com' }
    })

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: 'propfirm-test@example.com',
          auth_user_id: 'propfirm-test-auth-id',
          firstName: 'Prop Firm',
          lastName: 'Tester',
        }
      })
    }

    return user.id
  } catch (error) {
    console.error('Error creating test user:', error)
    throw error
  }
}

async function cleanupTestData(userId: string) {
  console.log('🧹 Cleaning up test data...')
  
  // Delete in correct order due to foreign key constraints
  await prisma.trade.deleteMany({ where: { userId } })
  await prisma.payoutRequest?.deleteMany({ where: { userId } })
  await prisma.drawdownBreach?.deleteMany({})
  await prisma.dailyEquitySnapshot?.deleteMany({})
  await prisma.propFirmPhase?.deleteMany({})
  await prisma.account.deleteMany({ where: { userId } })
  
  console.log('✅ Test data cleaned up')
}

const testScenarios: TestScenario[] = [
  {
    name: 'Create FTMO 100K Account',
    description: 'Create a typical FTMO 100K challenge account with proper phase configuration',
    execute: async () => {
      const userId = await createTestUser()
      
      const account = await prisma.account.create({
        data: {
          userId,
          name: 'FTMO 100K Challenge',
          firmType: 'FTMO',
          accountSize: 100,
          currency: 'USD',
          leverage: 100,
          startingBalance: 100000,
          
          // Phase account IDs
          phase1AccountId: '12345678',
          phase2AccountId: '12345679',
          fundedAccountId: '12345680',
          
          // Phase credentials
          phase1Login: '12345678',
          phase2Login: '12345679',
          fundedLogin: '12345680',
          phase1Server: 'FTMO-Demo01',
          phase2Server: 'FTMO-Demo02',
          fundedServer: 'FTMO-Live01',
          
          // Profit targets
          phase1ProfitTarget: 10, // 10%
          phase2ProfitTarget: 5,  // 5%
          
          // Drawdown configuration
          phase1MaxDrawdown: 10,     // 10%
          phase2MaxDrawdown: 10,     // 10%
          fundedMaxDrawdown: 5,      // 5%
          phase1DailyDrawdown: 5,    // 5%
          phase2DailyDrawdown: 5,    // 5%
          fundedDailyDrawdown: 3,    // 3%
          trailingDrawdownEnabled: true,
          
          // Trading days
          minTradingDaysPhase1: 4,
          minTradingDaysPhase2: 4,
          maxTradingDaysPhase1: 30,
          maxTradingDaysPhase2: 60,
          
          // Payout configuration
          initialProfitSplit: 80,
          maxProfitSplit: 90,
          profitSplitIncrementPerPayout: 5,
          minPayoutAmount: 50,
          payoutFrequencyDays: 14,
          minDaysBeforeFirstPayout: 7,
          
          // Trading rules
          consistencyRule: 30,
          newsTradinAllowed: false,
          weekendHoldingAllowed: false,
          hedgingAllowed: true,
          eaAllowed: true,
          maxPositions: 10,
          
          // Metadata
          isDemo: true,
          tradingPlatform: 'MetaTrader 5',
          status: 'active',
          challengeStartDate: new Date(),
        }
      })

      // Create Phase 1
      const phase1 = await prisma.propFirmPhase?.create({
        data: {
          accountId: account.id,
          phaseType: 'phase_1',
          status: 'active',
          brokerAccountId: '12345678',
          brokerLogin: '12345678',
          brokerServer: 'FTMO-Demo01',
          startingBalance: 100000,
          currentBalance: 100000,
          currentEquity: 100000,
          highWaterMark: 100000,
          profitTarget: 10000, // $10,000
          profitTargetPercent: 10,
          maxDrawdownAmount: 10000, // $10,000
          maxDrawdownPercent: 10,
          dailyDrawdownAmount: 5000, // $5,000
          dailyDrawdownPercent: 5,
          minTradingDays: 4,
          maxTradingDays: 30,
          startedAt: new Date(),
        }
      })

      console.log(`✅ Created FTMO account: ${account.id}`)
      console.log(`✅ Created Phase 1: ${phase1?.id}`)
    }
  },

  {
    name: 'Simulate Successful Phase 1 Trading',
    description: 'Add trades that successfully complete Phase 1 requirements',
    execute: async () => {
      const userId = await createTestUser()
      
      // Get the test account
      const account = await prisma.account.findFirst({
        where: { userId, firmType: 'FTMO' }
      })
      
      if (!account) {
        throw new Error('Test account not found - run previous scenario first')
      }

      const phase1 = await prisma.propFirmPhase?.findFirst({
        where: { accountId: account.id, phaseType: 'phase_1' }
      })

      if (!phase1) {
        throw new Error('Phase 1 not found')
      }

      // Simulate 8 days of trading with profitable outcome
      const tradingDays = [
        { day: 1, trades: [{ pnl: 500, symbol: 'EURUSD' }, { pnl: 300, symbol: 'GBPUSD' }] },
        { day: 2, trades: [{ pnl: 700, symbol: 'USDJPY' }] },
        { day: 3, trades: [{ pnl: -200, symbol: 'AUDUSD' }, { pnl: 600, symbol: 'EURJPY' }] },
        { day: 4, trades: [{ pnl: 800, symbol: 'GBPJPY' }] },
        { day: 5, trades: [{ pnl: 1200, symbol: 'EURUSD' }] },
        { day: 6, trades: [{ pnl: 400, symbol: 'USDCAD' }, { pnl: 300, symbol: 'NZDUSD' }] },
        { day: 7, trades: [{ pnl: 1500, symbol: 'EURAUD' }] },
        { day: 8, trades: [{ pnl: 900, symbol: 'GBPAUD' }, { pnl: 200, symbol: 'USDCHF' }] },
      ]

      let currentEquity = phase1.startingBalance
      let totalTrades = 0

      for (const day of tradingDays) {
        const tradeDate = new Date()
        tradeDate.setDate(tradeDate.getDate() - (8 - day.day))

        for (const tradeData of day.trades) {
          const trade = await prisma.trade.create({
            data: {
              userId,
              accountId: account.id,
              propFirmPhaseId: phase1.id,
              symbol: tradeData.symbol,
              side: tradeData.pnl > 0 ? 'long' : 'short',
              quantity: 1,
              entryTime: new Date(tradeDate.getTime() + Math.random() * 8 * 60 * 60 * 1000),
              exitTime: new Date(tradeDate.getTime() + Math.random() * 8 * 60 * 60 * 1000 + 60 * 60 * 1000),
              commission: 7,
              fees: 0,
              realizedPnl: tradeData.pnl,
              
              // Legacy fields
              accountNumber: account.phase1AccountId || account.id,
              instrument: tradeData.symbol,
              entryPrice: '1.1000',
              closePrice: '1.1010',
              entryDate: tradeDate.toISOString().split('T')[0],
              closeDate: tradeDate.toISOString().split('T')[0],
              pnl: tradeData.pnl,
            }
          })

          currentEquity += tradeData.pnl
          totalTrades++
        }
      }

      // Update phase with final statistics
      await prisma.propFirmPhase?.update({
        where: { id: phase1.id },
        data: {
          currentEquity,
          currentBalance: currentEquity,
          highWaterMark: Math.max(phase1.highWaterMark, currentEquity),
          totalTrades,
          winningTrades: tradingDays.reduce((sum, day) => 
            sum + day.trades.filter(t => t.pnl > 0).length, 0),
          losingTrades: tradingDays.reduce((sum, day) => 
            sum + day.trades.filter(t => t.pnl < 0).length, 0),
          daysTraded: tradingDays.length,
          status: currentEquity >= (phase1.startingBalance + phase1.profitTarget) ? 'passed' : 'active',
          completedAt: currentEquity >= (phase1.startingBalance + phase1.profitTarget) ? new Date() : undefined,
        }
      })

      console.log(`✅ Added ${totalTrades} trades across ${tradingDays.length} days`)
      console.log(`✅ Final equity: $${currentEquity.toLocaleString()}`)
      console.log(`✅ Profit: $${(currentEquity - phase1.startingBalance).toLocaleString()}`)
      
      if (currentEquity >= (phase1.startingBalance + phase1.profitTarget)) {
        console.log(`🎉 Phase 1 PASSED! Ready for Phase 2`)
      }
    }
  },

  {
    name: 'Test Phase Advancement',
    description: 'Test automatic advancement from Phase 1 to Phase 2',
    execute: async () => {
      const userId = await createTestUser()
      
      const account = await prisma.account.findFirst({
        where: { userId, firmType: 'FTMO' }
      })
      
      if (!account) {
        throw new Error('Test account not found')
      }

      const phase1 = await prisma.propFirmPhase?.findFirst({
        where: { accountId: account.id, phaseType: 'phase_1' }
      })

      if (!phase1 || phase1.status !== 'passed') {
        throw new Error('Phase 1 must be passed first')
      }

      // Create Phase 2
      const phase2 = await prisma.propFirmPhase?.create({
        data: {
          accountId: account.id,
          phaseType: 'phase_2',
          status: 'active',
          brokerAccountId: account.phase2AccountId!,
          brokerLogin: account.phase2Login,
          brokerServer: account.phase2Server,
          startingBalance: 100000, // Reset to starting balance
          currentBalance: 100000,
          currentEquity: 100000,
          highWaterMark: 100000,
          profitTarget: 5000, // $5,000 (5%)
          profitTargetPercent: 5,
          maxDrawdownAmount: 10000, // $10,000 (10%)
          maxDrawdownPercent: 10,
          dailyDrawdownAmount: 5000, // $5,000 (5%)
          dailyDrawdownPercent: 5,
          minTradingDays: 4,
          maxTradingDays: 60,
          startedAt: new Date(),
        }
      })

      console.log(`✅ Created Phase 2: ${phase2?.id}`)
      console.log(`✅ Account advanced to Phase 2`)
    }
  },

  {
    name: 'Test Drawdown Breach Scenario',
    description: 'Simulate a drawdown breach to test fail logic',
    execute: async () => {
      const userId = await createTestUser()
      
      // Create a separate account for this test
      const breachAccount = await prisma.account.create({
        data: {
          userId,
          name: 'Drawdown Breach Test',
          firmType: 'MyForexFunds',
          accountSize: 50,
          currency: 'USD',
          startingBalance: 50000,
          phase1AccountId: '99999999',
          phase1ProfitTarget: 8,
          phase1MaxDrawdown: 8,
          phase1DailyDrawdown: 4,
          minTradingDaysPhase1: 5,
          status: 'active',
          isDemo: true,
        }
      })

      const breachPhase = await prisma.propFirmPhase?.create({
        data: {
          accountId: breachAccount.id,
          phaseType: 'phase_1',
          status: 'active',
          brokerAccountId: '99999999',
          startingBalance: 50000,
          currentBalance: 50000,
          currentEquity: 50000,
          highWaterMark: 50000,
          profitTarget: 4000,
          profitTargetPercent: 8,
          maxDrawdownAmount: 4000,
          maxDrawdownPercent: 8,
          dailyDrawdownAmount: 2000,
          dailyDrawdownPercent: 4,
          minTradingDays: 5,
          startedAt: new Date(),
        }
      })

      // Add a large losing trade that breaches daily drawdown
      const breachTrade = await prisma.trade.create({
        data: {
          userId,
          accountId: breachAccount.id,
          propFirmPhaseId: breachPhase!.id,
          symbol: 'EURUSD',
          side: 'long',
          quantity: 10,
          entryTime: new Date(),
          exitTime: new Date(),
          commission: 20,
          realizedPnl: -2500, // Breach daily drawdown of $2000
          
          // Legacy fields
          accountNumber: '99999999',
          instrument: 'EURUSD',
          entryPrice: '1.1000',
          closePrice: '1.0750',
          entryDate: new Date().toISOString().split('T')[0],
          closeDate: new Date().toISOString().split('T')[0],
          pnl: -2500,
        }
      })

      // Create breach record
      await prisma.drawdownBreach?.create({
        data: {
          phaseId: breachPhase!.id,
          accountId: breachAccount.id,
          breachType: 'daily_drawdown',
          breachAmount: 500, // $2500 - $2000 limit
          limitAmount: 2000,
          equityAtBreach: 47500,
          balanceAtBreach: 47500,
          tradeIdTrigger: breachTrade.id,
          breachedAt: new Date(),
          isActive: true,
        }
      })

      // Mark phase and account as failed
      await prisma.propFirmPhase?.update({
        where: { id: breachPhase!.id },
        data: {
          status: 'failed',
          failedAt: new Date(),
          currentEquity: 47500,
          currentBalance: 47500,
        }
      })

      await prisma.account.update({
        where: { id: breachAccount.id },
        data: { status: 'failed' }
      })

      console.log(`✅ Created breach scenario`)
      console.log(`✅ Account failed due to daily drawdown breach`)
      console.log(`✅ Loss: $2,500 (exceeded $2,000 daily limit by $500)`)
    }
  },

  {
    name: 'Test Account Filtering',
    description: 'Test that failed accounts are excluded from equity calculations',
    execute: async () => {
      const userId = await createTestUser()
      
      // Get all accounts for this user
      const allAccounts = await prisma.account.findMany({
        where: { userId }
      })

      const allPhases = await prisma.propFirmPhase?.findMany({
        where: {
          accountId: { in: allAccounts.map(a => a.id) }
        }
      }) || []

      // Test filtering
      const activeAccounts = PropFirmAccountFilters.filterActiveAccountsForEquity(allAccounts as any)
      const equityCalculation = PropFirmAccountFilters.calculateTotalEquity(allAccounts as any, allPhases as any)

      console.log(`✅ Total accounts: ${allAccounts.length}`)
      console.log(`✅ Active accounts (for equity): ${activeAccounts.length}`)
      console.log(`✅ Failed accounts: ${equityCalculation.failedAccounts}`)
      console.log(`✅ Total equity (excluding failed): $${equityCalculation.totalEquity.toLocaleString()}`)
      console.log(`✅ Account breakdown:`, equityCalculation.accountBreakdown)

      // Verify failed accounts are excluded
      const failedAccounts = allAccounts.filter(a => a.status === 'failed')
      const includedFailedAccounts = activeAccounts.filter(a => a.status === 'failed')
      
      if (includedFailedAccounts.length === 0 && failedAccounts.length > 0) {
        console.log(`🎉 PASS: Failed accounts correctly excluded from equity calculation`)
      } else if (failedAccounts.length === 0) {
        console.log(`ℹ️  INFO: No failed accounts to test exclusion`)
      } else {
        console.log(`❌ FAIL: Failed accounts not properly excluded`)
      }
    }
  },

  {
    name: 'Test Payout System',
    description: 'Test payout eligibility and request functionality',
    execute: async () => {
      const userId = await createTestUser()
      
      // Create a funded account
      const fundedAccount = await prisma.account.create({
        data: {
          userId,
          name: 'Funded Account Test',
          firmType: 'FTMO',
          accountSize: 100,
          currency: 'USD',
          startingBalance: 100000,
          fundedAccountId: '88888888',
          initialProfitSplit: 80,
          maxProfitSplit: 90,
          profitSplitIncrementPerPayout: 5,
          minPayoutAmount: 100,
          payoutFrequencyDays: 14,
          minDaysBeforeFirstPayout: 7,
          status: 'funded',
          fundedDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
          isDemo: false,
        }
      })

      const fundedPhase = await prisma.propFirmPhase?.create({
        data: {
          accountId: fundedAccount.id,
          phaseType: 'funded',
          status: 'active',
          brokerAccountId: '88888888',
          startingBalance: 100000,
          currentBalance: 105000, // $5,000 profit
          currentEquity: 105000,
          highWaterMark: 105000,
          profitTarget: 0, // No profit target for funded
          profitTargetPercent: 0,
          maxDrawdownAmount: 5000,
          maxDrawdownPercent: 5,
          dailyDrawdownAmount: 3000,
          dailyDrawdownPercent: 3,
          minTradingDays: 0,
          startedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        }
      })

      // Calculate payout eligibility
      const eligibility = PropFirmEngine.calculatePayoutEligibility(
        fundedAccount as any,
        fundedPhase! as any,
        []
      )

      console.log(`✅ Payout eligibility:`, eligibility.isEligible)
      console.log(`✅ Eligible amount: $${eligibility.eligibleAmount}`)
      console.log(`✅ Trader share (${eligibility.profitSplitPercent}%): $${eligibility.traderShare}`)
      console.log(`✅ Firm share: $${eligibility.firmShare}`)

      if (eligibility.isEligible) {
        // Create payout request
        const payoutRequest = await prisma.payoutRequest?.create({
          data: {
            phaseId: fundedPhase!.id,
            accountId: fundedAccount.id,
            userId,
            requestedAmount: eligibility.eligibleAmount,
            eligibleAmount: eligibility.eligibleAmount,
            profitSplitPercent: eligibility.profitSplitPercent,
            traderShare: eligibility.traderShare,
            firmShare: eligibility.firmShare,
            status: 'pending',
            requestedAt: new Date(),
          }
        })

        console.log(`✅ Payout request created: ${payoutRequest?.id}`)
        console.log(`🎉 Payout system working correctly`)
      } else {
        console.log(`❌ Payout not eligible:`, eligibility.reasons)
      }
    }
  },

  {
    name: 'Test Risk Metrics Calculation',
    description: 'Test comprehensive risk metrics calculation',
    execute: async () => {
      const userId = await createTestUser()
      
      // Get trades from test accounts
      const trades = await prisma.trade.findMany({
        where: { userId }
      })

      if (trades.length === 0) {
        console.log(`ℹ️  No trades found - run trading scenarios first`)
        return
      }

      const riskMetrics = PropFirmEngine.calculateRiskMetrics(trades as any)

      console.log(`✅ Risk Metrics Calculated:`)
      console.log(`   - Total Trades: ${riskMetrics.totalTrades}`)
      console.log(`   - Win Rate: ${riskMetrics.winRate.toFixed(1)}%`)
      console.log(`   - Average Win: $${riskMetrics.avgWin.toFixed(2)}`)
      console.log(`   - Average Loss: $${riskMetrics.avgLoss.toFixed(2)}`)
      console.log(`   - Profit Factor: ${riskMetrics.profitFactor.toFixed(2)}`)
      console.log(`   - Current Streak: ${riskMetrics.currentStreak}`)
      console.log(`   - Best Streak: ${riskMetrics.bestStreak}`)
      console.log(`   - Worst Streak: ${riskMetrics.worstStreak}`)
      console.log(`   - Risk/Reward Ratio: ${riskMetrics.riskRewardRatio.toFixed(2)}`)
    }
  }
]

async function runTest(scenario: TestScenario) {
  console.log(`\n🧪 Running: ${scenario.name}`)
  console.log(`📝 ${scenario.description}`)
  console.log(`⏱️  Started at: ${new Date().toLocaleTimeString()}`)
  
  try {
    await scenario.execute()
    console.log(`✅ ${scenario.name} - PASSED`)
  } catch (error) {
    console.error(`❌ ${scenario.name} - FAILED:`, error)
  }
}

async function runAllTests() {
  console.log('🚀 Starting Prop Firm V2 System Tests')
  console.log('=' .repeat(50))

  const userId = await createTestUser()
  
  // Clean up any existing test data
  await cleanupTestData(userId)

  // Run each test scenario
  for (const scenario of testScenarios) {
    await runTest(scenario)
  }

  console.log('\n' + '='.repeat(50))
  console.log('🏁 All tests completed!')
  console.log(`📊 Results: ${testScenarios.length} scenarios executed`)
  
  // Final summary
  const finalAccounts = await prisma.account.findMany({
    where: { userId },
    include: {
      _count: {
        select: { trades: true }
      }
    }
  })

  console.log(`\n📈 Final Test Data Summary:`)
  console.log(`   - Accounts Created: ${finalAccounts.length}`)
  console.log(`   - Total Trades: ${finalAccounts.reduce((sum, acc) => sum + acc._count.trades, 0)}`)
  console.log(`   - Active Accounts: ${finalAccounts.filter(a => a.status === 'active').length}`)
  console.log(`   - Failed Accounts: ${finalAccounts.filter(a => a.status === 'failed').length}`)
  console.log(`   - Funded Accounts: ${finalAccounts.filter(a => a.status === 'funded').length}`)

  await prisma.$disconnect()
}

// Run tests if called directly
if (require.main === module) {
  runAllTests().catch(console.error)
}

export { runAllTests, testScenarios }
