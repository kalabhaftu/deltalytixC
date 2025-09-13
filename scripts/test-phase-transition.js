const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testPhaseTransition() {
  try {
    console.log('🧪 Testing Phase Transition System...');
    
    // Check current account state
    const account = await prisma.account.findFirst({
      where: { id: '520960bc-4304-4ae7-9d4a-bdea73d5bd25' },
      include: {
        phases: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });
    
    if (!account) {
      console.log('❌ Account not found');
      return;
    }
    
    console.log('📊 Current Account State:');
    console.log('  - Account Status:', account.status);
    console.log('  - Account Number:', account.number);
    
    console.log('\n📋 Phase History:');
    account.phases.forEach((phase, index) => {
      console.log(`  ${index + 1}. ${phase.phaseType.toUpperCase()}`);
      console.log(`     Status: ${phase.phaseStatus}`);
      console.log(`     Balance: $${phase.currentBalance}`);
      console.log(`     Net Profit: $${phase.netProfitSincePhaseStart || 0}`);
      if (phase.profitTarget) {
        console.log(`     Target: $${phase.profitTarget}`);
      }
      console.log(`     Created: ${phase.createdAt.toISOString().split('T')[0]}`);
      if (phase.phaseEndAt) {
        console.log(`     Ended: ${phase.phaseEndAt.toISOString().split('T')[0]}`);
      }
      console.log('');
    });
    
    // Simulate what the frontend logic would do
    const activePhase = account.phases.find(p => p.phaseStatus === 'active');
    const passedPhase = account.phases.find(p => p.phaseStatus === 'passed');
    
    console.log('🔍 Transition Analysis:');
    
    if (account.status === 'failed') {
      console.log('  ❌ Account is FAILED - no transition possible');
    } else if (activePhase) {
      console.log(`  ✅ Active Phase: ${activePhase.phaseType}`);
      
      // Check if profit target is met
      const profitTarget = activePhase.profitTarget || 0;
      const currentProfit = activePhase.netProfitSincePhaseStart || 0;
      
      if (profitTarget > 0 && currentProfit >= profitTarget) {
        console.log(`  🎯 Profit target MET! (${currentProfit} >= ${profitTarget})`);
        
        let nextPhaseType = null;
        if (activePhase.phaseType === 'phase_1') {
          nextPhaseType = 'phase_2';
        } else if (activePhase.phaseType === 'phase_2') {
          nextPhaseType = 'funded';
        }
        
        if (nextPhaseType) {
          console.log(`  🚀 SHOULD SHOW TRANSITION DIALOG: ${activePhase.phaseType} → ${nextPhaseType}`);
        }
      } else {
        console.log(`  📈 Profit target not yet met (${currentProfit} / ${profitTarget})`);
      }
    } else if (passedPhase) {
      console.log('  ✅ Has passed phase but no active phase - might need manual transition');
    } else {
      console.log('  ❓ No clear phase state detected');
    }
    
    console.log('\n✨ Test completed!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testPhaseTransition();
