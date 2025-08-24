const { Pool } = require('pg');

// Get database URL from environment variables
const databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres.sdosmkttvxogghyuvypl:bnalM3ApXIEnV6ta@aws-1-eu-north-1.pooler.supabase.com:6543/postgres';

const pool = new Pool({
  connectionString: databaseUrl,
});

async function createEnums() {
  const client = await pool.connect();
  try {
    console.log('Connected to PostgreSQL database');
    
    const enums = [
      { name: 'AccountStatus', sql: 'CREATE TYPE "AccountStatus" AS ENUM (\'active\', \'failed\', \'passed\', \'funded\');' },
      { name: 'PhaseType', sql: 'CREATE TYPE "PhaseType" AS ENUM (\'phase_1\', \'phase_2\', \'funded\');' },
      { name: 'PhaseStatus', sql: 'CREATE TYPE "PhaseStatus" AS ENUM (\'active\', \'passed\', \'failed\');' },
      { name: 'DrawdownType', sql: 'CREATE TYPE "DrawdownType" AS ENUM (\'absolute\', \'percent\');' },
      { name: 'DrawdownMode', sql: 'CREATE TYPE "DrawdownMode" AS ENUM (\'static\', \'trailing\');' },
      { name: 'EvaluationType', sql: 'CREATE TYPE "EvaluationType" AS ENUM (\'one_step\', \'two_step\');' },
      { name: 'BreachType', sql: 'CREATE TYPE "BreachType" AS ENUM (\'daily_drawdown\', \'max_drawdown\');' }
    ];
    
    for (const enumDef of enums) {
      try {
        // First check if the enum exists
        const checkQuery = `SELECT 1 FROM pg_type WHERE typname = '${enumDef.name}'`;
        const checkResult = await client.query(checkQuery);
        
        if (checkResult.rows.length === 0) {
          console.log(`Executing: ${enumDef.sql}`);
          await client.query(enumDef.sql);
          console.log(`Successfully created enum: ${enumDef.name}`);
        } else {
          console.log(`Enum ${enumDef.name} already exists`);
        }
      } catch (error) {
        console.error(`Error creating enum ${enumDef.name}:`, error.message);
      }
    }
    
    console.log('Finished creating all enum types');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

createEnums();