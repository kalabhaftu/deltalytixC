const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Attempting to create enum types...');
    
    // Execute raw SQL to create enum types
    const enumQueries = [
      `CREATE TYPE IF NOT EXISTS "AccountStatus" AS ENUM ('active', 'failed', 'passed', 'funded');`,
      `CREATE TYPE IF NOT EXISTS "PhaseType" AS ENUM ('phase_1', 'phase_2', 'funded');`,
      `CREATE TYPE IF NOT EXISTS "PhaseStatus" AS ENUM ('active', 'passed', 'failed');`,
      `CREATE TYPE IF NOT EXISTS "DrawdownType" AS ENUM ('absolute', 'percent');`,
      `CREATE TYPE IF NOT EXISTS "DrawdownMode" AS ENUM ('static', 'trailing');`,
      `CREATE TYPE IF NOT EXISTS "EvaluationType" AS ENUM ('one_step', 'two_step');`,
      `CREATE TYPE IF NOT EXISTS "BreachType" AS ENUM ('daily_drawdown', 'max_drawdown');`
    ];
    
    for (const query of enumQueries) {
      try {
        const result = await prisma.$executeRawUnsafe(query);
        console.log(`Successfully created enum: ${query.split('CREATE TYPE')[1].split('AS')[0].trim()}`);
      } catch (error) {
        console.log(`Enum already exists or error creating: ${query.split('CREATE TYPE')[1].split('AS')[0].trim()}`);
      }
    }
    
    console.log('Finished creating enum types');
  } catch (error) {
    console.error('Error creating enums:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();