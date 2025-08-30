#!/usr/bin/env node

/**
 * AI Setup Checker
 * Validates that all AI-related environment variables and dependencies are properly configured
 */

console.log('🔍 Checking AI Setup Configuration...\n')

// Check environment variables
console.log('📋 Environment Variables:')
const requiredEnvVars = [
  { name: 'ZAI_API_KEY', required: false, description: 'zAI API key (recommended)' },
  { name: 'OPENAI_API_KEY', required: false, description: 'OpenAI API key (fallback)' },
]

const optionalEnvVars = [
  { name: 'PERPLEXITY_API_KEY', description: 'Perplexity API key' },
  { name: 'DATABASE_URL', description: 'Database connection string' },
  { name: 'NEXT_PUBLIC_SUPABASE_URL', description: 'Supabase project URL' },
]

let hasAnyAIKey = false

requiredEnvVars.forEach(envVar => {
  const value = process.env[envVar.name]
  const status = value ? '✅ Set' : '❌ Missing'
  console.log(`  ${envVar.name}: ${status} - ${envVar.description}`)
  
  if (value) hasAnyAIKey = true
})

console.log('\n📋 Optional Environment Variables:')
optionalEnvVars.forEach(envVar => {
  const value = process.env[envVar.name]
  const status = value ? '✅ Set' : '⚠️  Not set'
  console.log(`  ${envVar.name}: ${status} - ${envVar.description}`)
})

// Check critical configuration
console.log('\n🔧 Configuration Status:')
if (!hasAnyAIKey) {
  console.log('❌ CRITICAL: No AI provider API keys configured!')
  console.log('   You need at least one of: ZAI_API_KEY or OPENAI_API_KEY')
} else {
  console.log('✅ AI provider configuration is valid')
}

// Check package dependencies
console.log('\n📦 Checking Dependencies:')
const requiredPackages = [
  '@ai-sdk/openai',
  '@ai-sdk/react', 
  'ai',
  'zod',
  'next'
]

let missingPackages = []

requiredPackages.forEach(pkg => {
  try {
    require.resolve(pkg)
    console.log(`  ✅ ${pkg}`)
  } catch (error) {
    console.log(`  ❌ ${pkg} - MISSING`)
    missingPackages.push(pkg)
  }
})

// Check API route files
console.log('\n📁 Checking API Routes:')
const fs = require('fs')
const path = require('path')

const apiRoutes = [
  'app/api/ai/chat/route.ts',
  'app/api/ai/analysis/route.ts',
  'lib/ai-providers.ts',
  'lib/ai-model-fallback.ts',
  'lib/api-response-wrapper.ts'
]

apiRoutes.forEach(route => {
  const fullPath = path.join(process.cwd(), route)
  if (fs.existsSync(fullPath)) {
    console.log(`  ✅ ${route}`)
  } else {
    console.log(`  ❌ ${route} - MISSING`)
  }
})

// Summary and recommendations
console.log('\n📊 Summary:')
if (missingPackages.length > 0) {
  console.log(`❌ Missing ${missingPackages.length} required packages`)
  console.log('   Run: npm install ' + missingPackages.join(' '))
}

if (!hasAnyAIKey) {
  console.log('❌ No AI provider keys configured')
  console.log('   Add to .env.local:')
  console.log('   ZAI_API_KEY=your_zai_api_key_here')
  console.log('   OPENAI_API_KEY=your_openai_api_key_here')
} else {
  console.log('✅ AI configuration looks good!')
}

console.log('\n🚀 Next Steps:')
console.log('1. Ensure at least one AI provider API key is set')
console.log('2. Test AI responses in the application')
console.log('3. Check browser console for any remaining JSON parsing errors')
console.log('4. Monitor API responses for proper JSON format')

console.log('\n🔧 Testing API Response Format:')
console.log('Expected success response:')
console.log(JSON.stringify({
  success: true,
  data: {
    section: "global",
    analysis: "Your trading analysis...",
    timestamp: new Date().toISOString(),
    locale: "en"
  }
}, null, 2))

console.log('\nExpected error response:')
console.log(JSON.stringify({
  success: false,
  error: "An error occurred",
  code: "ERROR_CODE"
}, null, 2))

console.log('\n✨ AI Setup Check Complete!')

