const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function linkAndEvaluate() {
  try {
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
      console.log('Account not found');
      return;
    }
    
    const currentPhase = account.phases[0];
    if (!currentPhase) {
      console.log('No active phase found');
      return;
    }
    
    console.log('Account:', account.number, 'Phase:', currentPhase.phaseType);
    
    // Get unlinked trades for this account
    const unlinkedTrades = await prisma.trade.findMany({
      where: { 
        accountNumber: account.number,
        accountId: null
      },
      orderBy: { entryDate: 'asc' }
    });
    
    console.log('Found', unlinkedTrades.length, 'unlinked trades');
    
    if (unlinkedTrades.length === 0) {
      console.log('No trades to link');
      return;
    }
    
    // Link trades to account and phase
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
    
    console.log('Linked', unlinkedTrades.length, 'trades to account');
    
    // Calculate metrics
    const totalPnL = unlinkedTrades.reduce((sum, trade) => sum + trade.pnl, 0);
    const newBalance = account.startingBalance + totalPnL;
    const newEquity = newBalance;
    const highWaterMark = Math.max(newEquity, account.startingBalance);
    
    console.log('Metrics:');
    console.log('- Starting Balance:', account.startingBalance);
    console.log('- Total P&L:', totalPnL);
    console.log('- New Balance:', newBalance);
    console.log('- High Water Mark:', highWaterMark);
    
    // Check profit target (8% for phase 1 = $400)
    const profitTarget = currentPhase.profitTarget || 400;
    const profitProgress = (totalPnL / profitTarget) * 100;
    
    console.log('- Profit Target:', profitTarget);
    console.log('- Profit Progress:', profitProgress.toFixed(1) + '%');
    
    // Check if profit target is met
    if (totalPnL >= profitTarget) {
      console.log('🎉 PROFIT TARGET MET! Should progress to Phase 2');
      
      // Mark current phase as passed
      await prisma.accountPhase.update({
        where: { id: currentPhase.id },
        data: {
          phaseStatus: 'passed',
          phaseEndAt: new Date(),
          currentEquity: newEquity,
          currentBalance: newBalance,
          highestEquitySincePhaseStart: highWaterMark,
          netProfitSincePhaseStart: totalPnL
        }
      });
      
      // Create Phase 2 with 5% profit target ($250)
      const phase2ProfitTarget = account.startingBalance * 0.05; // 5% = $250
      
      await prisma.accountPhase.create({
        data: {
          accountId: account.id,
          phaseType: 'phase_2',
          phaseStatus: 'active',
          profitTarget: phase2ProfitTarget,
          currentEquity: account.startingBalance, // Reset to starting balance
          currentBalance: account.startingBalance,
          highestEquitySincePhaseStart: account.startingBalance,
          netProfitSincePhaseStart: 0 // Reset for new phase
        }
      });
      
      console.log('✅ Created Phase 2 with target:', phase2ProfitTarget);
      
      // Update account status
      await prisma.account.update({
        where: { id: account.id },
        data: { status: 'active' } // Still active, just in phase 2
      });
      
    } else {
      // Update current phase metrics
      await prisma.accountPhase.update({
        where: { id: currentPhase.id },
        data: {
          currentEquity: newEquity,
          currentBalance: newBalance,
          highestEquitySincePhaseStart: highWaterMark,
          netProfitSincePhaseStart: totalPnL
        }
      });
      
      console.log('📊 Updated phase metrics, still in Phase 1');
    }
    
    console.log('✅ Evaluation completed successfully!');
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

linkAndEvaluate();
