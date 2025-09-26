const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function processNewTradesAndEvaluate() {
  try {
    console.log('🔄 Processing new trades and evaluating MasterAccount/PhaseAccount...');
    
    // NOTE: Update this ID to match your actual MasterAccount ID
    const masterAccountId = '520960bc-4304-4ae7-9d4a-bdea73d5bd25';
    
    // Get the master account with active phase
    const masterAccount = await prisma.masterAccount.findFirst({
      where: { id: masterAccountId },
      include: {
        phases: {
          where: { status: 'active' },
          orderBy: { phaseNumber: 'asc' },
          take: 1
        }
      }
    });
    
    if (!masterAccount) {
      console.log('❌ MasterAccount not found');
      return;
    }
    
    const currentPhase = masterAccount.phases[0];
    if (!currentPhase) {
      console.log('❌ No active phase found');
      return;
    }
    
    console.log(`📋 Processing account: ${masterAccount.accountName}`);
    console.log(`📍 Current Phase: ${currentPhase.phaseNumber} (${currentPhase.phaseId || 'No ID'})`);
    
    // Get unlinked trades (trades without phaseAccountId)
    const unlinkedTrades = await prisma.trade.findMany({
      where: { 
        // Match by account number from phase ID or look for trades that need linking
        accountNumber: currentPhase.phaseId || masterAccount.accountName,
        phaseAccountId: null
      },
      orderBy: { entryDate: 'asc' }
    });
    
    console.log('📊 Found', unlinkedTrades.length, 'unlinked trades');
    
    if (unlinkedTrades.length === 0) {
      console.log('✅ No new trades to process');
      return;
    }
    
    // Link trades to current phase using NEW phaseAccountId field
    for (const trade of unlinkedTrades) {
      await prisma.trade.update({
        where: { id: trade.id },
        data: {
          phaseAccountId: currentPhase.id,  // ✅ NEW: Use phaseAccountId instead of phaseId
          symbol: trade.instrument,
          realizedPnl: trade.pnl,
          fees: trade.commission || 0,
          entryTime: trade.entryDate ? new Date(trade.entryDate) : null,
          exitTime: trade.closeDate ? new Date(trade.closeDate) : null
        }
      });
    }
    
    console.log(`🔗 Linked ${unlinkedTrades.length} trades to Phase ${currentPhase.phaseNumber}`);
    
    // Calculate new metrics
    const totalNewPnL = unlinkedTrades.reduce((sum, trade) => sum + trade.pnl, 0);
    const currentEquity = masterAccount.accountSize + totalNewPnL;
    
    console.log('💰 Financial Impact:');
    console.log('  - Account Size:', masterAccount.accountSize);
    console.log('  - New Trades P&L:', totalNewPnL.toFixed(2));
    console.log('  - Current Equity:', currentEquity.toFixed(2));
    
    // Calculate drawdown limits from phase rules
    const dailyDDLimit = (currentPhase.dailyDrawdownPercent / 100) * masterAccount.accountSize;
    const maxDDLimit = (currentPhase.maxDrawdownPercent / 100) * masterAccount.accountSize;
    
    // For failure-first evaluation, check drawdowns first
    const dailyLoss = totalNewPnL < 0 ? Math.abs(totalNewPnL) : 0;
    const totalDrawdown = masterAccount.accountSize - currentEquity;
    
    console.log('⚖️  Drawdown Analysis (FAILURE-FIRST):');
    console.log('  - Daily DD Limit:', dailyDDLimit.toFixed(2));
    console.log('  - Daily Loss:', dailyLoss.toFixed(2));
    console.log('  - Max DD Limit:', maxDDLimit.toFixed(2));  
    console.log('  - Total Drawdown:', totalDrawdown.toFixed(2));
    
    let accountFailed = false;
    let breachType = null;
    let breachAmount = 0;
    
    // FAILURE-FIRST: Check drawdown breaches before profit targets
    if (dailyLoss > dailyDDLimit) {
      console.log('🚨 DAILY DRAWDOWN BREACH DETECTED!');
      accountFailed = true;
      breachType = 'daily_drawdown';
      breachAmount = dailyLoss;
    }
    
    if (totalDrawdown > maxDDLimit) {
      console.log('🚨 MAX DRAWDOWN BREACH DETECTED!');
      accountFailed = true;
      if (!breachType) { // Only set if not already set
        breachType = 'max_drawdown';
        breachAmount = totalDrawdown;
      }
    }
    
    if (accountFailed) {
      console.log('💀 ACCOUNT FAILED - Updating status...');
      
      // Mark master account as inactive
      await prisma.masterAccount.update({
        where: { id: masterAccount.id },
        data: { isActive: false }
      });
      
      // Mark current phase as failed
      await prisma.phaseAccount.update({
        where: { id: currentPhase.id },
        data: { 
          status: 'failed',
          endDate: new Date()
        }
      });
      
      console.log(`✅ Account marked as FAILED due to ${breachType} breach`);
      
    } else {
      console.log('✅ No drawdown breaches detected, account remains active');
      
      // Check if profit target met for advancement
      const profitTargetAmount = (currentPhase.profitTargetPercent / 100) * masterAccount.accountSize;
      const currentProfit = currentEquity - masterAccount.accountSize;
      
      if (currentProfit >= profitTargetAmount) {
        console.log('🎯 PROFIT TARGET REACHED! Ready for phase advancement');
        console.log(`  - Target: ${profitTargetAmount.toFixed(2)}`);
        console.log(`  - Achieved: ${currentProfit.toFixed(2)}`);
      } else {
        console.log('📈 Progress towards profit target:');
        console.log(`  - Target: ${profitTargetAmount.toFixed(2)}`);
        console.log(`  - Current: ${currentProfit.toFixed(2)}`);
        console.log(`  - Progress: ${((currentProfit / profitTargetAmount) * 100).toFixed(1)}%`);
      }
    }
    
    console.log('🎉 Evaluation completed successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

processNewTradesAndEvaluate();
