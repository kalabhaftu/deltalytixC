#!/usr/bin/env node

/**
 * Environment setup script to fix database connection issues
 * This script helps configure the correct Supabase connection strings
 */

const fs = require('fs');
const path = require('path');

const envTemplate = `# Database Connection - CRITICAL: Use the correct Supabase URLs
# Get these from: https://supabase.com/dashboard/project/YOUR_PROJECT/settings/database
DIRECT_URL="postgresql://postgres.[YOUR_PROJECT_REF]:[YOUR_PASSWORD]@aws-1-eu-north-1.pooler.supabase.com:6543/postgres?schema=public"
DATABASE_URL="postgresql://postgres.[YOUR_PROJECT_REF]:[YOUR_PASSWORD]@aws-1-eu-north-1.pooler.supabase.com:6543/postgres?schema=public&pgbouncer=true&connection_limit=1"

# Supabase Configuration - Get these from: https://supabase.com/dashboard/project/YOUR_PROJECT/settings/api
NEXT_PUBLIC_SUPABASE_URL="https://[YOUR_PROJECT_REF].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key-from-supabase"

# Authentication - Generate with: openssl rand -base64 32
NEXTAUTH_SECRET="your-secret-here"
NEXTAUTH_URL="http://localhost:3000"

# AI/Chat Features (Optional but recommended)
OPENAI_API_KEY="sk-proj-your-openai-key"
PERPLEXITY_API_KEY="pplx-your-perplexity-key"

# Email (Optional)
RESEND_API_KEY="re_your-resend-key"

# Discord Integration (Optional)
DISCORD_CLIENT_ID="your-discord-client-id"
DISCORD_CLIENT_SECRET="your-discord-client-secret"

# Environment
NODE_ENV="development"

# IMPORTANT NOTES:
# 1. Replace [YOUR_PROJECT_REF] with your actual Supabase project reference
# 2. Replace [YOUR_PASSWORD] with your actual database password  
# 3. Ensure you're using port 6543 (connection pooler) not 5432 (direct connection)
# 4. The connection_limit=1 is important for development to prevent pool exhaustion
`;

function createEnvFile() {
  const envPath = path.join(process.cwd(), '.env');
  
  if (fs.existsSync(envPath)) {
    console.log('⚠️  .env already exists. Creating .env.backup and updating .env');
    fs.copyFileSync(envPath, path.join(process.cwd(), '.env.backup'));
    fs.writeFileSync(envPath, envTemplate);
    console.log('✅ Updated .env (backup saved as .env.backup)');
  } else {
    fs.writeFileSync(envPath, envTemplate);
    console.log('✅ Created .env template');
  }
  console.log('🔧 Please edit .env with your actual Supabase credentials');
  
  console.log('\n📝 Setup Instructions:');
  console.log('1. Go to https://supabase.com/dashboard');
  console.log('2. Select your project');
  console.log('3. Go to Settings > Database');
  console.log('4. Copy the "Connection string" for "Connection pooler"');
  console.log('5. Replace [YOUR_PROJECT_REF] and [YOUR_PASSWORD] in your .env');
  console.log('6. Go to Settings > API and copy your anon key');
  console.log('7. Run: npm run dev');
  
  console.log('\n⚠️  CRITICAL: Make sure you use the CONNECTION POOLER URL (port 6543)');
  console.log('   NOT the direct connection URL (port 5432)');
}

if (require.main === module) {
  createEnvFile();
}

module.exports = { createEnvFile };


