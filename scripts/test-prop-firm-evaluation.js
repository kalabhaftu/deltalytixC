/**
 * Test Script for Prop Firm Account Evaluation System
 * This script tests the complete flow:
 * 1. Creates a test prop firm account
 * 2. Imports sample trades
 * 3. Verifies account status updates
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

// Test data
const TEST_USER_ID = 'test-user-prop-firm'
const TEST_ACCOUNT_NUMBER = 'PROP-TEST-001'

const sampleTrades = [
  {
    accountNumber: TEST_ACCOUNT_NUMBER,
    instrument: 'ES',
    quantity: 1,
    entryPrice: '4500.00',
    closePrice: '4510.00',
    entryDate: '2024-01-01T09:00:00.000Z',
    closeDate: '2024-01-01T10:00:00.000Z',
    pnl: 500, // $500 profit
    commission: 4.5,
    side: 'LONG',
    userId: TEST_USER_ID
  },
  {
    accountNumber: TEST_ACCOUNT_NUMBER,
    instrument: 'ES',
    quantity: 1,
    entryPrice: '4510.00',
    closePrice: '4520.00',
    entryDate: '2024-01-01T11:00:00.000Z',
    closeDate: '2024-01-01T12:00:00.000Z',
    pnl: 500, // Another $500 profit
    commission: 4.5,
    side: 'LONG',
    userId: TEST_USER_ID
  },
  {
    accountNumber: TEST_ACCOUNT_NUMBER,
    instrument: 'ES',
    quantity: 2,
    entryPrice: '4520.00',
    closePrice: '4515.00',
    entryDate: '2024-01-02T09:00:00.000Z',
    closeDate: '2024-01-02T10:00:00.000Z',
    pnl: -1000, // $1000 loss (should trigger daily DD if limit is 5%)
    commission: 9,
    side: 'LONG',
    userId: TEST_USER_ID
  }
]

async function createTestUser() {
  // Create or update test user
  await prisma.user.upsert({
    where: { id: TEST_USER_ID },
    update: {},
    create: {
      id: TEST_USER_ID,
      email: 'test-prop-firm@example.com',
      name: 'Test Prop Firm User'
    }
  })
  console.log('✓ Test user created/updated')
}

async function createTestPropFirmAccount() {
  // Delete existing test account if it exists
  await prisma.account.deleteMany({
    where: { number: TEST_ACCOUNT_NUMBER, userId: TEST_USER_ID }
  })

  // Create test prop firm account with typical rules
  const account = await prisma.account.create({
    data: {
      number: TEST_ACCOUNT_NUMBER,
      name: 'Test Prop Firm Account',
      propfirm: 'Test Prop Firm',
      userId: TEST_USER_ID,
      startingBalance: 10000, // $10,000 starting balance
      status: 'active',
      
      // Drawdown rules
      dailyDrawdownAmount: 5, // 5% daily DD limit ($500)
      dailyDrawdownType: 'percent',
      maxDrawdownAmount: 10, // 10% max DD limit ($1,000)
      maxDrawdownType: 'percent',
      drawdownModeMax: 'static',
      
      // Evaluation settings
      evaluationType: 'two_step',
      timezone: 'UTC',
      dailyResetTime: '00:00',
      
      // Business rule flags
      ddIncludeOpenPnl: false,
      progressionIncludeOpenPnl: false,
      allowManualPhaseOverride: false,
      
      // Payout settings
      profitSplitPercent: 80,
      payoutCycleDays: 14,
      minDaysToFirstPayout: 4,
      resetOnPayout: false,
      reduceBalanceByPayout: true
    }
  })

  // Create initial Phase 1 with 8% profit target ($800)
  const phase1 = await prisma.accountPhase.create({
    data: {
      accountId: account.id,
      phaseType: 'phase_1',
      phaseStatus: 'active',
      profitTarget: 800, // 8% of $10,000
      currentEquity: 10000,
      currentBalance: 10000,
      highestEquitySincePhaseStart: 10000,
      netProfitSincePhaseStart: 0,
    }
  })

  // Create initial daily anchor
  await prisma.dailyAnchor.create({
    data: {
      accountId: account.id,
      date: new Date('2024-01-01'),
      anchorEquity: 10000
    }
  })

  // Create daily anchor for day 2
  await prisma.dailyAnchor.create({
    data: {
      accountId: account.id,
      date: new Date('2024-01-02'),
      anchorEquity: 11000 // After day 1 profits
    }
  })

  console.log('✓ Test prop firm account created:', {
    accountId: account.id,
    number: account.number,
    startingBalance: account.startingBalance,
    phaseId: phase1.id
  })

  return { account, phase1 }
}

async function importTestTrades() {
  // Import trades using the same method as the CSV import
  const tradesWithIds = sampleTrades.map(trade => ({
    ...trade,
    id: `test-trade-${Math.random().toString(36).substr(2, 9)}`,
    createdAt: new Date(),
    entryId: null,
    closeId: null,
    comment: null,
    videoUrl: null,
    tags: [],
    imageBase64: null,
    imageBase64Second: null,
    imageBase64Third: null,
    imageBase64Fourth: null,
    groupId: null,
    timeInPosition: 1, // 1 hour
    
    // Prop firm fields
    symbol: null,
    strategy: null,
    fees: 0,
    realizedPnl: null,
    entryTime: null,
    exitTime: null,
    equityAtOpen: null,
    equityAtClose: null,
    rawBrokerId: null,
    phaseId: null,
    accountId: null,
    closeReason: null
  }))

  const result = await prisma.trade.createMany({
    data: tradesWithIds,
    skipDuplicates: true
  })

  console.log('✓ Test trades imported:', result.count)
  return tradesWithIds
}

async function testAccountEvaluation() {
  console.log('\n🧪 Testing Account Evaluation System...\n')

  try {
    // Import and use the evaluation system
    const { PropFirmAccountEvaluator } = await import('../lib/prop-firm/account-evaluation.js')
    
    // Get the imported trades
    const trades = await prisma.trade.findMany({
      where: { userId: TEST_USER_ID, accountNumber: TEST_ACCOUNT_NUMBER },
      orderBy: { entryDate: 'asc' }
    })

    console.log('📊 Running evaluation on', trades.length, 'trades...')

    // Test the evaluation system
    const evaluationResult = await PropFirmAccountEvaluator.linkTradesAndEvaluate(
      trades,
      TEST_USER_ID
    )

    console.log('📈 Evaluation Results:')
    console.log('  - Linked Trades:', evaluationResult.linkedTrades.length)
    console.log('  - Status Updates:', evaluationResult.statusUpdates.length)
    console.log('  - Errors:', evaluationResult.errors.length)

    if (evaluationResult.errors.length > 0) {
      console.log('❌ Errors:')
      evaluationResult.errors.forEach(error => console.log('  -', error))
    }

    if (evaluationResult.statusUpdates.length > 0) {
      console.log('🔄 Status Updates:')
      evaluationResult.statusUpdates.forEach(update => {
        console.log(`  - Account ${update.accountId}: ${update.previousStatus} → ${update.newStatus}`)
        console.log(`    Reason: ${update.reason}`)
        if (update.breachDetails) {
          console.log(`    Breach: ${update.breachDetails.type} - ${update.breachDetails.amount} > ${update.breachDetails.threshold}`)
        }
      })
    }

    // Check final account state
    const finalAccount = await prisma.account.findFirst({
      where: { number: TEST_ACCOUNT_NUMBER, userId: TEST_USER_ID },
      include: {
        phases: {
          orderBy: { createdAt: 'desc' }
        },
        breaches: true,
        trades: {
          where: { accountId: { not: null } },
          orderBy: { entryDate: 'asc' }
        }
      }
    })

    console.log('\n📋 Final Account State:')
    console.log('  - Status:', finalAccount?.status)
    console.log('  - Current Phase:', finalAccount?.phases[0]?.phaseType, '(', finalAccount?.phases[0]?.phaseStatus, ')')
    console.log('  - Linked Trades:', finalAccount?.trades.length)
    console.log('  - Breaches:', finalAccount?.breaches.length)

    if (finalAccount?.breaches.length > 0) {
      console.log('⚠️  Breaches:')
      finalAccount.breaches.forEach(breach => {
        console.log(`    - ${breach.breachType}: ${breach.breachAmount} > ${breach.breachThreshold}`)
      })
    }

    // Calculate expected results
    const totalPnL = sampleTrades.reduce((sum, trade) => sum + trade.pnl, 0)
    const day1PnL = sampleTrades.filter(t => t.entryDate.includes('2024-01-01')).reduce((sum, trade) => sum + trade.pnl, 0)
    const day2PnL = sampleTrades.filter(t => t.entryDate.includes('2024-01-02')).reduce((sum, trade) => sum + trade.pnl, 0)

    console.log('\n📊 Trade Analysis:')
    console.log('  - Total P&L:', totalPnL)
    console.log('  - Day 1 P&L:', day1PnL, '(should be fine)')
    console.log('  - Day 2 P&L:', day2PnL, '(should trigger 5% daily DD breach)')
    console.log('  - Expected Result: Account should be FAILED due to daily drawdown breach')

  } catch (error) {
    console.error('❌ Evaluation test failed:', error.message)
    console.error(error.stack)
  }
}

async function cleanup() {
  // Clean up test data
  await prisma.trade.deleteMany({
    where: { userId: TEST_USER_ID }
  })
  
  await prisma.account.deleteMany({
    where: { userId: TEST_USER_ID }
  })
  
  await prisma.user.delete({
    where: { id: TEST_USER_ID }
  }).catch(() => {}) // Ignore if doesn't exist
  
  console.log('\n🧹 Test data cleaned up')
}

async function runTest() {
  console.log('🚀 Starting Prop Firm Evaluation System Test\n')

  try {
    await createTestUser()
    await createTestPropFirmAccount()
    await importTestTrades()
    await testAccountEvaluation()
    
    console.log('\n✅ Test completed successfully!')
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
    console.error(error.stack)
  } finally {
    await cleanup()
    await prisma.$disconnect()
  }
}

// Run the test
if (require.main === module) {
  runTest()
}

module.exports = { runTest }
