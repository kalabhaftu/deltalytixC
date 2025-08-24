const { Pool } = require('pg');

// Get database URL from environment variables
const databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres.sdosmkttvxogghyuvypl:bnalM3ApXIEnV6ta@aws-1-eu-north-1.pooler.supabase.com:6543/postgres';

const pool = new Pool({
  connectionString: databaseUrl,
});

async function addColumns() {
  const client = await pool.connect();
  try {
    console.log('Connected to PostgreSQL database');
    
    const columns = [
      { name: 'name', type: 'TEXT' },
      { name: 'dailyDrawdownAmount', type: 'DOUBLE PRECISION' },
      { name: 'dailyDrawdownType', type: '"DrawdownType" DEFAULT \'percent\'' },
      { name: 'maxDrawdownAmount', type: 'DOUBLE PRECISION' },
      { name: 'maxDrawdownType', type: '"DrawdownType" DEFAULT \'percent\'' },
      { name: 'drawdownModeMax', type: '"DrawdownMode" DEFAULT \'static\'' },
      { name: 'evaluationType', type: '"EvaluationType" DEFAULT \'two_step\'' },
      { name: 'timezone', type: 'TEXT DEFAULT \'UTC\'' },
      { name: 'dailyResetTime', type: 'TEXT DEFAULT \'00:00\'' },
      { name: 'status', type: '"AccountStatus" DEFAULT \'active\'' },
      { name: 'ddIncludeOpenPnl', type: 'BOOLEAN DEFAULT false' },
      { name: 'progressionIncludeOpenPnl', type: 'BOOLEAN DEFAULT false' },
      { name: 'allowManualPhaseOverride', type: 'BOOLEAN DEFAULT false' },
      { name: 'profitSplitPercent', type: 'DOUBLE PRECISION DEFAULT 80' },
      { name: 'payoutCycleDays', type: 'INTEGER DEFAULT 14' },
      { name: 'minDaysToFirstPayout', type: 'INTEGER DEFAULT 4' },
      { name: 'payoutEligibilityMinProfit', type: 'DOUBLE PRECISION' },
      { name: 'resetOnPayout', type: 'BOOLEAN DEFAULT false' },
      { name: 'reduceBalanceByPayout', type: 'BOOLEAN DEFAULT true' },
      { name: 'fundedResetBalance', type: 'DOUBLE PRECISION' }
    ];
    
    for (const column of columns) {
      try {
        const query = `ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "${column.name}" ${column.type};`;
        console.log(`Executing: ${query}`);
        await client.query(query);
        console.log(`Successfully added column: ${column.name}`);
      } catch (error) {
        if (error.code === '42701') {
          console.log(`Column ${column.name} already exists`);
        } else {
          console.error(`Error adding column ${column.name}:`, error.message);
        }
      }
    }
    
    console.log('Finished adding all columns to the Account table');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

addColumns();