const { Pool } = require('pg');
require('dotenv').config();

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// SQL to add phaseId column
const sql = `
  DO $$
  BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Trade' AND column_name = 'phaseId') THEN
          ALTER TABLE "Trade" ADD COLUMN "phaseId" TEXT;
          
          -- Add foreign key constraint if AccountPhase table exists
          IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'AccountPhase') THEN
              ALTER TABLE "Trade" ADD CONSTRAINT "Trade_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES "AccountPhase"("id") ON DELETE SET NULL ON UPDATE CASCADE;
          END IF;
          
          -- Create index for better performance
          CREATE INDEX "Trade_phaseId_idx" ON "Trade"("phaseId");
          
          RAISE NOTICE 'phaseId column added to Trade table successfully';
      ELSE
          RAISE NOTICE 'phaseId column already exists in Trade table';
      END IF;
  END $$;
`;

async function main() {
  try {
    console.log('Connecting to database...');
    const client = await pool.connect();
    
    console.log('Executing SQL to add phaseId column...');
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