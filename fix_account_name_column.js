const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Attempting to add missing columns to the Account table...');
    
    // Execute raw SQL to add all missing columns from the prop firm evaluation system migration
    const queries = [
      `ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "name" TEXT;`,
      `ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "dailyDrawdownAmount" DOUBLE PRECISION;`,
      `ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "dailyDrawdownType" "DrawdownType" DEFAULT 'percent';`,
      `ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "maxDrawdownAmount" DOUBLE PRECISION;`,
      `ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "maxDrawdownType" "DrawdownType" DEFAULT 'percent';`,
      `ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "drawdownModeMax" "DrawdownMode" DEFAULT 'static';`,
      `ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "evaluationType" "EvaluationType" DEFAULT 'two_step';`,
      `ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "timezone" TEXT DEFAULT 'UTC';`,
      `ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "dailyResetTime" TEXT DEFAULT '00:00';`,
      `ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "status" "AccountStatus" DEFAULT 'active';`,
      `ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "ddIncludeOpenPnl" BOOLEAN DEFAULT false;`,
      `ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "progressionIncludeOpenPnl" BOOLEAN DEFAULT false;`,
      `ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "allowManualPhaseOverride" BOOLEAN DEFAULT false;`,
      `ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "profitSplitPercent" DOUBLE PRECISION DEFAULT 80;`,
      `ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "payoutCycleDays" INTEGER DEFAULT 14;`,
      `ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "minDaysToFirstPayout" INTEGER DEFAULT 4;`,
      `ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "payoutEligibilityMinProfit" DOUBLE PRECISION;`,
      `ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "resetOnPayout" BOOLEAN DEFAULT false;`,
      `ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "reduceBalanceByPayout" BOOLEAN DEFAULT true;`,
      `ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "fundedResetBalance" DOUBLE PRECISION;`
    ];
    
    for (const query of queries) {
      try {
        const result = await prisma.$executeRawUnsafe(query);
        console.log(`Successfully executed: ${query.split('ADD COLUMN')[1]}`);
      } catch (error) {
        if (error.code === 'P2022') {
          console.log(`Column already exists or enum not found for: ${query.split('ADD COLUMN')[1]}`);
        } else {
          console.error(`Error executing query: ${query}`, error);
        }
      }
    }
    
    console.log('Finished adding missing columns to the Account table');
  } catch (error) {
    console.error('Error adding columns:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();