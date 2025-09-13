const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createTransitionDemo() {
  try {
    console.log('🎭 Creating Phase Transition Demo Account...');
    
    const TEST_USER_ID = 'demo-user-123';
    
    // Create a demo user
    let user;
    try {
      user = await prisma.user.create({
        data: {
          id: TEST_USER_ID,
          auth_user_id: TEST_USER_ID + '-auth',
          email: 'demo@example.com',
          firstName: 'Demo',
          lastName: 'User'
        }
      });
      console.log('✅ Created demo user');
    } catch (error) {
      if (error.code === 'P2002') {
        user = await prisma.user.findUnique({ where: { id: TEST_USER_ID } });
        console.log('✅ Using existing demo user');
      } else {
        throw error;
      }
    }
    
    // Create a demo account
    const demoAccount = await prisma.account.create({
      data: {
        number: 'DEMO' + Date.now(),
        name: 'Demo Phase 1 Success',
        propfirm: 'Demo Prop Firm',
        status: 'active',
        startingBalance: 5000,
        evaluationType: 'two_step',
        dailyDrawdownAmount: 4,
        dailyDrawdownType: 'percent',
        maxDrawdownAmount: 8,
        maxDrawdownType: 'percent',
        drawdownModeMax: 'trailing',
        timezone: 'UTC',
        dailyResetTime: '00:00',
        userId: user.id
      }
    });
    
    console.log('✅ Created demo account:', demoAccount.number);
    
    // Create Phase 1 with successful completion
    const phase1 = await prisma.accountPhase.create({
      data: {
        accountId: demoAccount.id,
        phaseType: 'phase_1',
        phaseStatus: 'active', // This will trigger transition dialog
        phaseStartAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        currentBalance: 5450, // $450 profit
        currentEquity: 5450,
        profitTarget: 400, // 8% of $5000
        netProfitSincePhaseStart: 450, // Exceeds target!
        highestEquitySincePhaseStart: 5450,
        totalTrades: 5,
        winningTrades: 4
      }
    });
    
    console.log('✅ Created Phase 1 (ready for transition)');
    
    // Add some successful trades to Phase 1
    const trades = [
      { symbol: 'EURUSD', pnl: 150, entryDate: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000) },
      { symbol: 'GBPUSD', pnl: 120, entryDate: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000) },
      { symbol: 'XAUUSD', pnl: 180, entryDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000) },
      { symbol: 'US100', pnl: -50, entryDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) },
      { symbol: 'XAUUSD', pnl: 50, entryDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) }
    ];
    
    for (const trade of trades) {
      await prisma.trade.create({
        data: {
          accountId: demoAccount.id,
          phaseId: phase1.id,
          accountNumber: demoAccount.number,
          symbol: trade.symbol,
          instrument: trade.symbol,
          pnl: trade.pnl,
          realizedPnl: trade.pnl,
          quantity: 0.1,
          entryDate: trade.entryDate.toISOString().split('T')[0],
          entryTime: trade.entryDate,
          closeDate: trade.entryDate.toISOString().split('T')[0],
          exitTime: trade.entryDate,
          side: trade.pnl > 0 ? 'BUY' : 'SELL',
          entryPrice: "1.0000",
          closePrice: trade.pnl > 0 ? "1.0100" : "0.9950",
          userId: user.id
        }
      });
    }
    
    console.log('✅ Added 5 demo trades to Phase 1');
    
    console.log('\n🎯 Demo Account Created Successfully!');
    console.log('📋 Account Details:');
    console.log('  - Account ID:', demoAccount.id);
    console.log('  - Account Number:', demoAccount.number);
    console.log('  - Status:', demoAccount.status);
    console.log('  - Phase 1 Profit:', '$450 (Target: $400) ✅');
    console.log('  - Should Show Transition Dialog: YES');
    console.log('  - Next Phase: Phase 2');
    
    console.log('\n🔗 Test URL:');
    console.log(`http://localhost:3000/dashboard/prop-firm/accounts/${demoAccount.id}`);
    
    console.log('\n💡 What should happen:');
    console.log('1. Visit the URL above');
    console.log('2. The page should automatically show the Phase Transition Dialog');
    console.log('3. The dialog will ask for your Phase 2 account ID');
    console.log('4. Enter a new account ID (e.g., "DEMO789012")');
    console.log('5. Click "Advance to Phase 2"');
    console.log('6. Account will transition with new account number');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

createTransitionDemo();
