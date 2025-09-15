#!/usr/bin/env node

/**
 * Fix Prisma Studio Issues Script
 * This script resolves common Prisma Studio problems including:
 * - Locked query engine files
 * - Database connection issues
 * - Client generation errors
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

async function fixPrismaStudioIssues() {
  console.log('🔧 Fixing Prisma Studio Issues...\n');

  try {
    // Step 1: Stop any running Prisma Studio processes
    console.log('1. Stopping Prisma Studio processes...');
    try {
      if (process.platform === 'win32') {
        execSync('taskkill /F /IM node.exe /FI "WINDOWTITLE eq npx*prisma*studio*"', { stdio: 'ignore' });
      } else {
        execSync('pkill -f "prisma studio"', { stdio: 'ignore' });
      }
      console.log('   ✅ Stopped running processes');
    } catch (error) {
      console.log('   ⚠️  No running processes found');
    }

    // Step 2: Clean up locked Prisma client files
    console.log('\n2. Cleaning up Prisma client files...');
    const prismaClientPath = path.join(process.cwd(), 'node_modules', '.prisma');
    if (fs.existsSync(prismaClientPath)) {
      try {
        fs.rmSync(prismaClientPath, { recursive: true, force: true });
        console.log('   ✅ Removed corrupted Prisma client');
      } catch (error) {
        console.log('   ⚠️  Could not remove Prisma client:', error.message);
      }
    }

    // Step 3: Clean up any .tmp files that might be causing locks
    console.log('\n3. Cleaning temporary files...');
    const nodeModulesPath = path.join(process.cwd(), 'node_modules');
    try {
      const findTmpFiles = (dir) => {
        const files = fs.readdirSync(dir, { withFileTypes: true });
        files.forEach(file => {
          const filePath = path.join(dir, file.name);
          if (file.isDirectory() && file.name !== '.git') {
            try {
              findTmpFiles(filePath);
            } catch (err) {
              // Skip directories we can't access
            }
          } else if (file.name.includes('.tmp') || file.name.includes('.lock')) {
            try {
              fs.unlinkSync(filePath);
              console.log(`   🗑️  Removed: ${file.name}`);
            } catch (err) {
              // Skip files we can't delete
            }
          }
        });
      };
      
      if (fs.existsSync(nodeModulesPath)) {
        findTmpFiles(nodeModulesPath);
      }
      console.log('   ✅ Cleaned temporary files');
    } catch (error) {
      console.log('   ⚠️  Could not clean all temporary files');
    }

    // Step 4: Regenerate Prisma client
    console.log('\n4. Regenerating Prisma client...');
    try {
      execSync('npx prisma generate', { stdio: 'inherit' });
      console.log('   ✅ Prisma client regenerated successfully');
    } catch (error) {
      console.log('   ❌ Failed to regenerate Prisma client:', error.message);
      
      // Try alternative approach
      console.log('   🔄 Trying alternative approach...');
      try {
        execSync('npm run postinstall', { stdio: 'inherit' });
        console.log('   ✅ Prisma client regenerated via postinstall');
      } catch (error2) {
        console.log('   ❌ Alternative approach failed:', error2.message);
        throw error2;
      }
    }

    // Step 5: Test database connection
    console.log('\n5. Testing database connection...');
    try {
      execSync('node scripts/test-connectivity.js', { stdio: 'inherit' });
      console.log('   ✅ Database connection test passed');
    } catch (error) {
      console.log('   ⚠️  Database connection test failed - check your .env file');
      console.log('   💡 Run: npm run setup-env to configure database');
    }

    console.log('\n🎉 Prisma Studio fix completed!\n');
    console.log('📋 Next steps:');
    console.log('1. Start Prisma Studio: npx prisma studio');
    console.log('2. If issues persist, check your .env file configuration');
    console.log('3. Ensure your database is accessible and running');
    
  } catch (error) {
    console.error('\n❌ Failed to fix Prisma Studio issues:', error.message);
    console.log('\n🔧 Manual steps to try:');
    console.log('1. Close any open Prisma Studio windows');
    console.log('2. Restart your terminal/IDE');
    console.log('3. Run: npm install');
    console.log('4. Run: npx prisma generate');
    console.log('5. Run: npx prisma studio');
    process.exit(1);
  }
}

// Utility function to wait
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

if (require.main === module) {
  fixPrismaStudioIssues();
}

module.exports = { fixPrismaStudioIssues };


