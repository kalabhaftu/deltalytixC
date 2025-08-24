const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Attempting to add remaining enum columns to the Account table...');
    
    // Execute raw SQL to add the remaining columns that use enum types
    const queries = [
      `ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "dailyDrawdownType" "DrawdownType" DEFAULT 'percent';`,
      `ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "maxDrawdownType" "DrawdownType" DEFAULT 'percent';`,
      `ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "drawdownModeMax" "DrawdownMode" DEFAULT 'static';`,
      `ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "evaluationType" "EvaluationType" DEFAULT 'two_step';`,
      `ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "status" "AccountStatus" DEFAULT 'active';`
    ];
    
    for (const query of queries) {
      try {
        const result = await prisma.$executeRawUnsafe(query);
        console.log(`Successfully executed: ${query.split('ADD COLUMN')[1]}`);
      } catch (error) {
        if (error.code === 'P2022') {
          console.log(`Column already exists for: ${query.split('ADD COLUMN')[1]}`);
        } else {
          console.error(`Error executing query: ${query}`, error);
        }
      }
    }
    
    console.log('Finished adding remaining enum columns to the Account table');
  } catch (error) {
    console.error('Error adding columns:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();