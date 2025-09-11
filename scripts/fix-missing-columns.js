#!/usr/bin/env node

/**
 * Emergency script to fix missing database columns
 * Run this if Prisma migrations are failing
 */

const { PrismaClient } = require('@prisma/client');

async function fixMissingColumns() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Checking database schema...');
    
    // Test if the Account table has the required columns
    const result = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'Account' AND table_schema = 'public'
    `;
    
    const existingColumns = result.map(row => row.column_name);
    console.log('📋 Existing columns:', existingColumns);
    
    const requiredColumns = ['name', 'broker', 'dailyDrawdownAmount', 'maxDrawdownAmount'];
    const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));
    
    if (missingColumns.length > 0) {
      console.log('❌ Missing columns:', missingColumns);
      console.log('⚠️  You need to run: npx prisma db push');
      console.log('⚠️  If that fails, check your database connection in .env.local');
    } else {
      console.log('✅ All required columns exist');
    }
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.log('\n🔧 To fix this:');
    console.log('1. Create .env.local file with your database credentials');
    console.log('2. Copy the template from ENV_SETUP.md');
    console.log('3. Replace with your actual Supabase credentials');
    console.log('4. Run: npx prisma db push');
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  fixMissingColumns().catch(console.error);
}

module.exports = { fixMissingColumns };


