const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function processNewTradesAndEvaluate() {
  try {
    console.log('🔄 Processing new trades and evaluating account...');
    
    // Get the account
    const account = await prisma.account.findFirst({
      where: { id: '520960bc-4304-4ae7-9d4a-bdea73d5bd25' },
      include: {
        phases: {
          where: { phaseStatus: 'active' },
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });
    
    if (!account) {
      console.log('❌ Account not found');
      return;
    }
    
    const currentPhase = account.phases[0];
    if (!currentPhase) {
      console.log('❌ No active phase found');
      return;
    }
    
    // Get unlinked trades
    const unlinkedTrades = await prisma.trade.findMany({
      where: { 
        accountNumber: account.number,
        accountId: null
      },
      orderBy: { entryDate: 'asc' }
    });
    
    console.log('📊 Found', unlinkedTrades.length, 'unlinked trades');
    
    if (unlinkedTrades.length === 0) {
      console.log('✅ No new trades to process');
      return;
    }
    
    // Link trades to current phase
    for (const trade of unlinkedTrades) {
      await prisma.trade.update({
        where: { id: trade.id },
        data: {
          accountId: account.id,
          phaseId: currentPhase.id,
          symbol: trade.instrument,
          realizedPnl: trade.pnl,
          fees: trade.commission || 0,
          entryTime: trade.entryDate ? new Date(trade.entryDate) : null,
          exitTime: trade.closeDate ? new Date(trade.closeDate) : null
        }
      });
    }
    
    console.log('🔗 Linked', unlinkedTrades.length, 'trades to Phase 2');
    
    // Calculate new metrics
    const totalNewPnL = unlinkedTrades.reduce((sum, trade) => sum + trade.pnl, 0);
    const currentBalance = currentPhase.currentBalance;
    const newBalance = currentBalance + totalNewPnL;
    
    console.log('💰 Financial Impact:');
    console.log('  - Previous Balance:', currentBalance);
    console.log('  - New Trades P&L:', totalNewPnL.toFixed(2));
    console.log('  - New Balance:', newBalance.toFixed(2));
    
    // Check drawdown rules for Phase 2
    const dailyDDLimit = account.startingBalance * 0.04; // 4% = $200
    const maxDDLimit = account.startingBalance * 0.08;   // 8% = $400
    
    const dailyLoss = Math.abs(totalNewPnL); // Assuming all losses in one day
    const totalLossFromStart = account.startingBalance - newBalance;
    
    console.log('⚖️  Drawdown Analysis:');
    console.log('  - Daily DD Limit:', dailyDDLimit);
    console.log('  - Daily Loss:', dailyLoss.toFixed(2));
    console.log('  - Max DD Limit:', maxDDLimit);  
    console.log('  - Total Loss from Start:', totalLossFromStart.toFixed(2));
    
    let accountFailed = false;
    let breachType = null;
    let breachAmount = 0;
    
    if (dailyLoss > dailyDDLimit) {
      console.log('🚨 DAILY DRAWDOWN BREACH DETECTED!');
      accountFailed = true;
      breachType = 'daily_drawdown';
      breachAmount = dailyLoss;
    }
    
    if (totalLossFromStart > maxDDLimit) {
      console.log('🚨 MAX DRAWDOWN BREACH DETECTED!');
      accountFailed = true;
      if (!breachType) { // Only set if not already set
        breachType = 'max_drawdown';
        breachAmount = totalLossFromStart;
      }
    }
    
    if (accountFailed) {
      console.log('💀 ACCOUNT FAILED - Updating status...');
      
      // Mark account as failed
      await prisma.account.update({
        where: { id: account.id },
        data: { status: 'failed' }
      });
      
      // Mark current phase as failed
      await prisma.accountPhase.update({
        where: { id: currentPhase.id },
        data: { 
          phaseStatus: 'failed',
          phaseEndAt: new Date(),
          currentEquity: newBalance,
          currentBalance: newBalance,
          netProfitSincePhaseStart: totalNewPnL
        }
      });
      
      // Record the breach
      await prisma.breach.create({
        data: {
          accountId: account.id,
          phaseId: currentPhase.id,
          breachType: breachType,
          breachAmount: breachAmount,
          breachThreshold: breachType === 'daily_drawdown' ? dailyDDLimit : maxDDLimit,
          equity: newBalance,
          breachTime: new Date(),
          description: `${breachType} breach: ${breachAmount.toFixed(2)} exceeds ${breachType === 'daily_drawdown' ? dailyDDLimit : maxDDLimit}`
        }
      });
      
      console.log('✅ Account marked as FAILED due to', breachType, 'breach');
      
    } else {
      // Update phase metrics (no breach)
      await prisma.accountPhase.update({
        where: { id: currentPhase.id },
        data: {
          currentEquity: newBalance,
          currentBalance: newBalance,
          netProfitSincePhaseStart: currentPhase.netProfitSincePhaseStart + totalNewPnL
        }
      });
      
      console.log('✅ Updated phase metrics, account still active');
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
