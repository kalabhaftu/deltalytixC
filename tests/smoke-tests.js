#!/usr/bin/env node

/**
 * Critical smoke tests for key application flows
 * Run before deployment to ensure core functionality works
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function smokeTests() {
  console.log('🔥 Running smoke tests...\n');
  
  const results = {
    database: false,
    accounts: false,
    trades: false,
    auth: false
  };

  try {
    // Test 1: Database Connection
    console.log('1️⃣  Testing database connection...');
    await prisma.$queryRaw`SELECT 1 as test`;
    results.database = true;
    console.log('✅ Database connection: PASS\n');
  } catch (error) {
    console.log('❌ Database connection: FAIL');
    console.log(`   Error: ${error.message}\n`);
  }

  try {
    // Test 2: Account Creation/Fetching  
    console.log('2️⃣  Testing account operations...');
    const accountCount = await prisma.account.count();
    console.log(`   Found ${accountCount} accounts in database`);
    
    // Test account schema integrity
    const sampleAccount = await prisma.account.findFirst({
      select: {
        id: true,
        number: true,
        name: true, // This should exist after migration
        userId: true,
        createdAt: true
      }
    });
    
    if (sampleAccount || accountCount === 0) {
      results.accounts = true;
      console.log('✅ Account operations: PASS\n');
    } else {
      throw new Error('Account schema validation failed');
    }
  } catch (error) {
    console.log('❌ Account operations: FAIL');
    console.log(`   Error: ${error.message}`);
    if (error.message.includes('column') && error.message.includes('does not exist')) {
      console.log('   💡 Hint: Run database migration to add missing columns');
    }
    console.log('');
  }

  try {
    // Test 3: Trade Operations
    console.log('3️⃣  Testing trade operations...');
    const tradeCount = await prisma.trade.count();
    console.log(`   Found ${tradeCount} trades in database`);
    results.trades = true;
    console.log('✅ Trade operations: PASS\n');
  } catch (error) {
    console.log('❌ Trade operations: FAIL');
    console.log(`   Error: ${error.message}\n`);
  }

  try {
    // Test 4: User Authentication Schema
    console.log('4️⃣  Testing user schema...');
    const userCount = await prisma.user.count();
    console.log(`   Found ${userCount} users in database`);
    results.auth = true;
    console.log('✅ User schema: PASS\n');
  } catch (error) {
    console.log('❌ User schema: FAIL');
    console.log(`   Error: ${error.message}\n`);
  }

  // Summary
  const passed = Object.values(results).filter(Boolean).length;
  const total = Object.keys(results).length;
  
  console.log('📊 SMOKE TEST SUMMARY');
  console.log('='.repeat(30));
  console.log(`Passed: ${passed}/${total}`);
  console.log(`Database: ${results.database ? '✅' : '❌'}`);
  console.log(`Accounts: ${results.accounts ? '✅' : '❌'}`);
  console.log(`Trades: ${results.trades ? '✅' : '❌'}`);
  console.log(`Auth: ${results.auth ? '✅' : '❌'}`);
  
  if (passed === total) {
    console.log('\n🎉 All smoke tests passed! Ready for deployment.');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some smoke tests failed. Check issues before deployment.');
    process.exit(1);
  }

  } catch (globalError) {
    console.error('💥 Smoke tests crashed:', globalError.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }

if (require.main === module) {
  smokeTests();
}

module.exports = { smokeTests };
