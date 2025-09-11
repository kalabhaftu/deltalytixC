#!/usr/bin/env node

/**
 * Connectivity Test Script
 * Run this script to diagnose database and auth connectivity issues
 * 
 * Usage: node scripts/test-connectivity.js
 */

const { PrismaClient } = require('@prisma/client')

async function testDatabaseConnectivity() {
  console.log('🔍 Testing Database Connectivity...\n')
  
  const prisma = new PrismaClient({
    errorFormat: 'pretty',
    log: ['error', 'warn', 'info'],
  })

  try {
    // Test 1: Basic connection
    console.log('1️⃣ Testing basic connection...')
    const startTime = Date.now()
    await prisma.$queryRaw`SELECT 1 as test`
    const latency = Date.now() - startTime
    console.log(`   ✅ Basic connection successful (${latency}ms)\n`)

    // Test 2: Database info
    console.log('2️⃣ Getting database information...')
    const dbInfo = await prisma.$queryRaw`
      SELECT 
        current_database() as database_name,
        current_user as user_name,
        version() as postgres_version,
        current_timestamp as server_time
    `
    console.log('   ✅ Database info:', dbInfo[0])
    console.log('')

    // Test 3: Sequential connection tests (better for Supabase)
    console.log('3️⃣ Testing sequential connections...')
    for (let i = 0; i < 3; i++) {
      await prisma.$queryRaw`SELECT ${i} as connection_test`
      // Small delay between connections
      await new Promise(resolve => setTimeout(resolve, 500))
    }
    console.log('   ✅ Sequential connection test successful\n')

    // Test 4: Account table access
    console.log('4️⃣ Testing account table access...')
    const accountCount = await prisma.account.count()
    console.log(`   ✅ Account table accessible (${accountCount} accounts found)\n`)

    // Test 5: Complex query
    console.log('5️⃣ Testing complex query...')
    const complexQuery = await prisma.account.findMany({
      take: 1,
      select: {
        id: true,
        number: true,
        _count: {
          select: {
            trades: true
          }
        }
      }
    })
    console.log('   ✅ Complex query successful\n')

    console.log('🎉 All database tests passed!')
    
  } catch (error) {
    console.error('❌ Database test failed:')
    console.error('   Error:', error.message)
    
    if (error.message.includes("Can't reach database server")) {
      console.error('\n💡 Suggestions:')
      console.error('   - Check your DATABASE_URL environment variable')
      console.error('   - Ensure your database server is running')
      console.error('   - Check your network connection')
      console.error('   - Verify firewall settings')
    }
    
    if (error.message.includes('connection pool timeout')) {
      console.error('\n💡 Suggestions:')
      console.error('   - Increase connection timeout settings')
      console.error('   - Check for connection leaks in your application')
      console.error('   - Consider reducing concurrent connections')
    }
  } finally {
    await prisma.$disconnect()
  }
}

async function testEnvironmentVariables() {
  console.log('\n🔧 Checking Environment Variables...\n')
  
  const requiredVars = [
    'DATABASE_URL',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY'
  ]
  
  let allPresent = true
  
  for (const varName of requiredVars) {
    const value = process.env[varName]
    if (!value) {
      console.error(`❌ Missing: ${varName}`)
      allPresent = false
    } else if (value.includes('[YOUR_') || value.includes('your-anon-key')) {
      console.error(`❌ Placeholder value: ${varName}`)
      allPresent = false
    } else {
      // Mask sensitive parts
      const maskedValue = varName.includes('KEY') || varName.includes('URL') 
        ? value.substring(0, 20) + '...' 
        : value
      console.log(`✅ ${varName}: ${maskedValue}`)
    }
  }
  
  if (allPresent) {
    console.log('\n🎉 All required environment variables are present!')
  } else {
    console.log('\n❌ Some environment variables are missing or invalid.')
    console.log('   Please check your .env file or environment configuration.')
  }
}

async function testNetworkConnectivity() {
  console.log('\n🌐 Testing Network Connectivity...\n')
  
  const testUrls = [
    'https://api.supabase.com/health',
    'https://www.google.com',
  ]
  
  for (const url of testUrls) {
    try {
      console.log(`Testing ${url}...`)
      const response = await fetch(url, { 
        method: 'HEAD',
        signal: AbortSignal.timeout(5000)
      })
      console.log(`✅ ${url} - Status: ${response.status}`)
    } catch (error) {
      console.error(`❌ ${url} - Error: ${error.message}`)
    }
  }
}

async function main() {
  console.log('🚀 Deltalytix Connectivity Test\n')
  console.log('=' .repeat(50))
  
  try {
    await testEnvironmentVariables()
    await testNetworkConnectivity()
    await testDatabaseConnectivity()
    
    console.log('\n' + '=' .repeat(50))
    console.log('✅ Connectivity test completed successfully!')
    console.log('\nIf you\'re still experiencing issues, please check:')
    console.log('1. Your internet connection')
    console.log('2. Firewall settings')
    console.log('3. Database server status')
    console.log('4. Supabase project status')
    
  } catch (error) {
    console.error('\n' + '=' .repeat(50))
    console.error('❌ Connectivity test failed!')
    console.error('Error:', error.message)
    process.exit(1)
  }
}

// Run the test
main().catch(console.error)
