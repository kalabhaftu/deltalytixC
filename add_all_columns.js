const { PrismaClient } = require('@prisma/client');

async function addColumnWithNewConnection(columnDefinition) {
  const prisma = new PrismaClient();
  try {
    const query = `ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS ${columnDefinition};`;
    const result = await prisma.$executeRawUnsafe(query);
    console.log(`Successfully added column: ${columnDefinition}`);
    return true;
  } catch (error) {
    if (error.code === 'P2022') {
      console.log(`Column already exists: ${columnDefinition}`);
    } else {
      console.error(`Error adding column ${columnDefinition}:`, error.message);
    }
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  try {
    console.log('Attempting to add all missing columns to the Account table...');
    
    const columns = [
      '"name" TEXT',
      '"dailyDrawdownAmount" DOUBLE PRECISION',
      '"dailyDrawdownType" "DrawdownType" DEFAULT \'percent\'',
      '"maxDrawdownAmount" DOUBLE PRECISION',
      '"maxDrawdownType" "DrawdownType" DEFAULT \'percent\'',
      '"drawdownModeMax" "DrawdownMode" DEFAULT \'static\'',
      '"evaluationType" "EvaluationType" DEFAULT \'two_step\'',
      '"timezone" TEXT DEFAULT \'UTC\'',
      '"dailyResetTime" TEXT DEFAULT \'00:00\'',
      '"status" "AccountStatus" DEFAULT \'active\'',
      '"ddIncludeOpenPnl" BOOLEAN DEFAULT false',
      '"progressionIncludeOpenPnl" BOOLEAN DEFAULT false',
      '"allowManualPhaseOverride" BOOLEAN DEFAULT false',
      '"profitSplitPercent" DOUBLE PRECISION DEFAULT 80',
      '"payoutCycleDays" INTEGER DEFAULT 14',
      '"minDaysToFirstPayout" INTEGER DEFAULT 4',
      '"payoutEligibilityMinProfit" DOUBLE PRECISION',
      '"resetOnPayout" BOOLEAN DEFAULT false',
      '"reduceBalanceByPayout" BOOLEAN DEFAULT true',
      '"fundedResetBalance" DOUBLE PRECISION'
    ];
    
    for (const column of columns) {
      await addColumnWithNewConnection(column);
      // Add a small delay to avoid connection issues
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log('Finished adding all missing columns to the Account table');
  } catch (error) {
    console.error('Error in main process:', error);
  }
}

main();