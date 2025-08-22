const { Pool } = require('pg');
require('dotenv').config();

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// SQL to add accountId column
const sql = `
  DO $$
  BEGIN
      -- Add accountId column if it doesn't exist
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Trade' AND column_name = 'accountId') THEN
          ALTER TABLE "Trade" ADD COLUMN "accountId" TEXT;
          
          -- Add foreign key constraint if Account table exists
          IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Account') THEN
              ALTER TABLE "Trade" ADD CONSTRAINT "Trade_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
          END IF;
          
          -- Create index for better performance
          CREATE INDEX "Trade_accountId_idx" ON "Trade"("accountId");
          
          RAISE NOTICE 'accountId column added to Trade table successfully';
      ELSE
          RAISE NOTICE 'accountId column already exists in Trade table';
      END IF;
      
      -- Add other missing columns from the prop firm evaluation system migration
      -- Add symbol column
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Trade' AND column_name = 'symbol') THEN
          ALTER TABLE "Trade" ADD COLUMN "symbol" TEXT;
          CREATE INDEX "Trade_symbol_idx" ON "Trade"("symbol");
          RAISE NOTICE 'symbol column added to Trade table successfully';
      END IF;
      
      -- Add strategy column
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Trade' AND column_name = 'strategy') THEN
          ALTER TABLE "Trade" ADD COLUMN "strategy" TEXT;
          RAISE NOTICE 'strategy column added to Trade table successfully';
      END IF;
      
      -- Add fees column
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Trade' AND column_name = 'fees') THEN
          ALTER TABLE "Trade" ADD COLUMN "fees" DOUBLE PRECISION DEFAULT 0;
          RAISE NOTICE 'fees column added to Trade table successfully';
      END IF;
      
      -- Add realizedPnl column
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Trade' AND column_name = 'realizedPnl') THEN
          ALTER TABLE "Trade" ADD COLUMN "realizedPnl" DOUBLE PRECISION;
          RAISE NOTICE 'realizedPnl column added to Trade table successfully';
      END IF;
      
      -- Add entryTime column
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Trade' AND column_name = 'entryTime') THEN
          ALTER TABLE "Trade" ADD COLUMN "entryTime" TIMESTAMP(3);
          CREATE INDEX "Trade_entryTime_idx" ON "Trade"("entryTime");
          RAISE NOTICE 'entryTime column added to Trade table successfully';
      END IF;
      
      -- Add exitTime column
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Trade' AND column_name = 'exitTime') THEN
          ALTER TABLE "Trade" ADD COLUMN "exitTime" TIMESTAMP(3);
          RAISE NOTICE 'exitTime column added to Trade table successfully';
      END IF;
      
      -- Add equityAtOpen column
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Trade' AND column_name = 'equityAtOpen') THEN
          ALTER TABLE "Trade" ADD COLUMN "equityAtOpen" DOUBLE PRECISION;
          RAISE NOTICE 'equityAtOpen column added to Trade table successfully';
      END IF;
      
      -- Add equityAtClose column
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Trade' AND column_name = 'equityAtClose') THEN
          ALTER TABLE "Trade" ADD COLUMN "equityAtClose" DOUBLE PRECISION;
          RAISE NOTICE 'equityAtClose column added to Trade table successfully';
      END IF;
      
      -- Add rawBrokerId column
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Trade' AND column_name = 'rawBrokerId') THEN
          ALTER TABLE "Trade" ADD COLUMN "rawBrokerId" TEXT;
          RAISE NOTICE 'rawBrokerId column added to Trade table successfully';
      END IF;
  END $$;
`;

async function main() {
  try {
    console.log('Connecting to database...');
    const client = await pool.connect();
    
    console.log('Executing SQL to add missing columns to Trade table...');
    const result = await client.query(sql);
    
    console.log('SQL executed successfully');
    console.log(result.rows);
    
    client.release();
    await pool.end();
    
    console.log('Database connection closed');
  } catch (error) {
    console.error('Error executing SQL:', error);
    process.exit(1);
  }
}

main();