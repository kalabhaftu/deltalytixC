#!/usr/bin/env node

/**
 * Database migration script for missing columns
 * Use this if regular Prisma migrations fail
 */

const { PrismaClient } = require('@prisma/client');

async function migrateDatabase() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔄 Starting database migration...\n');

    // Check current schema
    console.log('📋 Checking existing columns...');
    const accountColumns = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'Account' AND table_schema = 'public'
    `;
    
    const existingCols = accountColumns.map(row => row.column_name);
    console.log('   Existing columns:', existingCols.length);

    // Required columns that might be missing
    const requiredColumns = [
      { name: 'name', type: 'TEXT' },
      { name: 'broker', type: 'TEXT' },
      { name: 'dailyDrawdownAmount', type: 'DOUBLE PRECISION' },
      { name: 'maxDrawdownAmount', type: 'DOUBLE PRECISION' }
    ];

    console.log('\n🔧 Adding missing columns...');
    
    for (const col of requiredColumns) {
      if (!existingCols.includes(col.name)) {
        try {
          await prisma.$executeRawUnsafe(`
            ALTER TABLE "Account" 
            ADD COLUMN "${col.name}" ${col.type}
          `);
          console.log(`✅ Added column: ${col.name}`);
        } catch (error) {
          if (error.message.includes('already exists')) {
            console.log(`⚠️  Column ${col.name} already exists`);
          } else {
            console.log(`❌ Failed to add ${col.name}: ${error.message}`);
          }
        }
      } else {
        console.log(`✅ Column ${col.name} already exists`);
      }
    }

    // Check for enum types
    console.log('\n🎭 Checking enum types...');
    const enumTypes = [
      'AccountStatus', 'PhaseType', 'PhaseStatus', 
      'DrawdownType', 'DrawdownMode', 'EvaluationType', 'BreachType'
    ];

    for (const enumType of enumTypes) {
      try {
        const result = await prisma.$queryRaw`
          SELECT EXISTS (
            SELECT 1 FROM pg_type WHERE typname = ${enumType.toLowerCase()}
          ) as exists
        `;
        
        if (result[0].exists) {
          console.log(`✅ Enum ${enumType} exists`);
        } else {
          console.log(`⚠️  Enum ${enumType} missing - need to run full migration`);
        }
      } catch (error) {
        console.log(`❌ Error checking enum ${enumType}: ${error.message}`);
      }
    }

    console.log('\n✅ Migration completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('   1. Run: npx prisma db push (to apply remaining schema changes)');
    console.log('   2. Run: npm run smoke-test (to verify everything works)');
    
  } catch (error) {
    console.error('💥 Migration failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Check your database connection in .env.local');
    console.log('   2. Ensure you have write permissions to the database');
    console.log('   3. Try running: npx prisma migrate reset (CAUTION: deletes data)');
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  migrateDatabase().catch(console.error);
}

module.exports = { migrateDatabase };


