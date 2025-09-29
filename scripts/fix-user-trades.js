const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixUserTrades() {
  try {
    console.log('🔄 Fixing trade linking for user MasterAccount...\n');

    // Use the actual MasterAccount ID from the user's account
    const masterAccountId = 'd1185703-571c-4966-8688-65b1246495e3';

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

    console.log(`📋 Account: ${masterAccount.accountName}`);
    console.log(`📍 Phase: ${currentPhase.phaseNumber} (${currentPhase.phaseId || 'No ID'})`);

    // Get unlinked trades that should belong to this account
    const unlinkedTrades = await prisma.trade.findMany({
      where: {
        accountNumber: currentPhase.phaseId || masterAccount.accountName,
        phaseAccountId: null
      },
      orderBy: { entryDate: 'asc' }
    });

    console.log(`📊 Found ${unlinkedTrades.length} unlinked trades`);

    if (unlinkedTrades.length === 0) {
      console.log('✅ No trades to link');
      return;
    }

    // Link trades to current phase
    let linkedCount = 0;
    for (const trade of unlinkedTrades) {
      await prisma.trade.update({
        where: { id: trade.id },
        data: {
          phaseAccountId: currentPhase.id,
          symbol: trade.instrument,
          realizedPnl: trade.pnl,
          fees: trade.commission || 0,
          entryTime: trade.entryDate ? new Date(trade.entryDate) : null,
          exitTime: trade.closeDate ? new Date(trade.closeDate) : null
        }
      });
      linkedCount++;
    }

    console.log(`🔗 Successfully linked ${linkedCount} trades to Phase ${currentPhase.phaseNumber}`);

    // Calculate new metrics
    const totalPnL = unlinkedTrades.reduce((sum, trade) => sum + trade.pnl, 0);
    const currentEquity = masterAccount.accountSize + totalPnL;
    const currentProfit = currentEquity - masterAccount.accountSize;

    console.log('\n💰 Financial Impact:');
    console.log(`- Account Size: $${masterAccount.accountSize}`);
    console.log(`- Total P&L: $${totalPnL.toFixed(2)}`);
    console.log(`- Current Equity: $${currentEquity.toFixed(2)}`);
    console.log(`- Current Profit: $${currentProfit.toFixed(2)}`);

    // Check profit target
    const profitTargetAmount = (currentPhase.profitTargetPercent / 100) * masterAccount.accountSize;
    const profitProgress = profitTargetAmount > 0 ? (currentProfit / profitTargetAmount) * 100 : 0;

    console.log('\n🎯 Profit Target Analysis:');
    console.log(`- Target Amount: $${profitTargetAmount.toFixed(2)}`);
    console.log(`- Progress: ${profitProgress.toFixed(1)}%`);

    // Check drawdown limits
    const dailyDDLimit = (currentPhase.dailyDrawdownPercent / 100) * masterAccount.accountSize;
    const maxDDLimit = (currentPhase.maxDrawdownPercent / 100) * masterAccount.accountSize;
    const currentDrawdown = masterAccount.accountSize - currentEquity;

    console.log('\n⚖️ Drawdown Check:');
    console.log(`- Daily DD Limit: $${dailyDDLimit.toFixed(2)}`);
    console.log(`- Max DD Limit: $${maxDDLimit.toFixed(2)}`);
    console.log(`- Current Drawdown: $${currentDrawdown.toFixed(2)}`);

    if (currentDrawdown > maxDDLimit) {
      console.log('🚨 MAX DRAWDOWN BREACH! Account failed.');

      // Mark account and phase as failed
      await prisma.masterAccount.update({
        where: { id: masterAccount.id },
        data: { isActive: false }
      });

      await prisma.phaseAccount.update({
        where: { id: currentPhase.id },
        data: {
          status: 'failed',
          endDate: new Date()
        }
      });

      console.log('✅ Account marked as FAILED due to drawdown breach');
    } else if (currentProfit >= profitTargetAmount && profitTargetAmount > 0) {
      console.log('🎉 PROFIT TARGET MET! Ready for phase advancement');
    } else {
      console.log('✅ Account remains active and healthy');
    }

    console.log('\n🎉 Trade linking completed successfully!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

fixUserTrades();

