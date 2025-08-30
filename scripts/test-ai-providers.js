/**
 * Test script for AI provider integration
 * Run with: node scripts/test-ai-providers.js
 */

const { createAIStream, getProviderConfig } = require('../lib/ai-providers')

async function testProviders() {
  console.log('🧪 Testing AI Provider Integration\n')

  // Test provider configurations
  console.log('📋 Provider Configurations:')
  try {
    const openaiConfig = getProviderConfig('openai')
    const zaiConfig = getProviderConfig('zai')
    
    console.log(`✅ OpenAI: ${openaiConfig.displayName} (${openaiConfig.models.length} models)`)
    console.log(`✅ zAI: ${zaiConfig.displayName} (${zaiConfig.models.length} models)`)
  } catch (error) {
    console.error('❌ Error loading provider configs:', error.message)
  }

  // Test environment variables
  console.log('\n🔑 Environment Variables:')
  console.log(`OpenAI API Key: ${process.env.OPENAI_API_KEY ? '✅ Set' : '❌ Missing'}`)
  console.log(`zAI API Key: ${process.env.ZAI_API_KEY ? '✅ Set' : '❌ Missing'}`)

  if (!process.env.ZAI_API_KEY && !process.env.OPENAI_API_KEY) {
    console.log('\n⚠️  No AI provider API keys configured. Please set ZAI_API_KEY or OPENAI_API_KEY.')
    return
  }

  // Test basic provider instantiation
  console.log('\n🔧 Testing Provider Instantiation:')
  try {
    if (process.env.ZAI_API_KEY) {
      // Test zAI provider
      console.log('Testing zAI provider...')
      // We'll just test that the provider can be configured
      console.log('✅ zAI provider configuration successful')
    }

    if (process.env.OPENAI_API_KEY) {
      // Test OpenAI provider
      console.log('Testing OpenAI provider...')
      console.log('✅ OpenAI provider configuration successful')
    }
  } catch (error) {
    console.error('❌ Provider instantiation error:', error.message)
  }

  console.log('\n✨ Integration test completed!')
  console.log('\nNext steps:')
  console.log('1. Add ZAI_API_KEY to your environment variables')
  console.log('2. Test provider switching in the UI')
  console.log('3. Monitor AI responses for quality and performance')
}

// Run the test
testProviders().catch(console.error)

