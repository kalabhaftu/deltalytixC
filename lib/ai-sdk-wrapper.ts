/**
 * AI SDK v4 Compatibility Wrapper
 * Provides compatibility layer for OpenAI models to work with the current AI SDK version
 */

import { openai as originalOpenai } from '@ai-sdk/openai'

// Create a wrapper that provides v1 compatibility for v2 models
export function openai(modelName: string) {
  const model = originalOpenai(modelName) as any
  
  // Force v1 compatibility
  return {
    ...model,
    specificationVersion: 'v1' as const,
    defaultObjectGenerationMode: 'json' as const,
  }
}

// Re-export other providers with compatibility wrappers if needed
export { perplexity } from '@ai-sdk/perplexity'
export { openrouter } from '@openrouter/ai-sdk-provider'
