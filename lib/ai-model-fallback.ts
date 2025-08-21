/**
 * AI Model Fallback System
 * Automatically switches to cheaper/smaller models when rate limits are hit
 */

import { aiUsageMonitor } from './ai-usage-monitor'

export interface ModelConfig {
  name: string
  displayName: string
  maxTokens?: number
  temperature?: number
  costLevel: number // 1 = most expensive, 5 = cheapest
  capabilities: string[]
}

// Model hierarchy from most capable/expensive to least capable/cheapest
// Starting with cheaper models for free tier users
export const MODEL_HIERARCHY: ModelConfig[] = [
  {
    name: 'gpt-4o-mini',
    displayName: 'GPT-4o Mini',
    maxTokens: 16384,
    temperature: 0,
    costLevel: 1,
    capabilities: ['reasoning', 'analysis', 'chat', 'fast-response']
  },
  {
    name: 'gpt-3.5-turbo',
    displayName: 'GPT-3.5 Turbo',
    maxTokens: 4096,
    temperature: 0,
    costLevel: 2,
    capabilities: ['chat', 'basic-analysis', 'fast-response']
  },
  {
    name: 'gpt-3.5-turbo-0125',
    displayName: 'GPT-3.5 Turbo (0125)',
    maxTokens: 4096,
    temperature: 0,
    costLevel: 3,
    capabilities: ['chat', 'basic-analysis', 'fast-response']
  },
  {
    name: 'gpt-4o',
    displayName: 'GPT-4o',
    maxTokens: 4096,
    temperature: 0,
    costLevel: 4,
    capabilities: ['complex-reasoning', 'code-generation', 'analysis', 'chat']
  },
  {
    name: 'gpt-4-turbo',
    displayName: 'GPT-4 Turbo',
    maxTokens: 4096,
    temperature: 0,
    costLevel: 5,
    capabilities: ['reasoning', 'analysis', 'chat']
  }
]

// Track failed models to avoid immediate retry
const failedModels = new Map<string, number>() // model -> timestamp of failure
const FAILURE_COOLDOWN = 60000 // 1 minute cooldown

export function getNextAvailableModel(currentModel?: string, requiredCapabilities: string[] = []): ModelConfig {
  const currentIndex = currentModel 
    ? MODEL_HIERARCHY.findIndex(m => m.name === currentModel)
    : -1

  // Start from the next model in hierarchy (or first if no current model)
  const startIndex = currentIndex >= 0 ? currentIndex + 1 : 0

  for (let i = startIndex; i < MODEL_HIERARCHY.length; i++) {
    const model = MODEL_HIERARCHY[i]
    
    // Check if model is in cooldown
    const failureTime = failedModels.get(model.name)
    if (failureTime && Date.now() - failureTime < FAILURE_COOLDOWN) {
      continue
    }

    // Check if model supports required capabilities
    if (requiredCapabilities.length > 0) {
      const hasAllCapabilities = requiredCapabilities.every(cap => 
        model.capabilities.includes(cap)
      )
      if (!hasAllCapabilities) {
        continue
      }
    }

    return model
  }

  // If no suitable model found, return the cheapest one
  return MODEL_HIERARCHY[MODEL_HIERARCHY.length - 1]
}

export function markModelAsFailed(modelName: string) {
  failedModels.set(modelName, Date.now())
}

export function clearModelFailure(modelName: string) {
  failedModels.delete(modelName)
}

export function isRateLimitError(error: any): boolean {
  // Check various ways rate limit errors can appear
  const status429 = error?.status === 429 || error?.statusCode === 429
  const codeMatch = error?.code === 'rate_limit_exceeded'
  const messageMatch = typeof error?.message === 'string' && 
    error.message.toLowerCase().includes('rate limit')
  
  // Check nested error objects (common in AI SDK)
  const nestedError = error?.error || error?.data?.error
  const nestedStatus = nestedError?.status === 429 || nestedError?.statusCode === 429
  const nestedCode = nestedError?.code === 'rate_limit_exceeded'
  const nestedMessage = typeof nestedError?.message === 'string' && 
    nestedError.message.toLowerCase().includes('rate limit')
  
  // Check response body for rate limit indicators
  const bodyMatch = typeof error?.responseBody === 'string' &&
    error.responseBody.toLowerCase().includes('rate limit')
  
  return status429 || codeMatch || messageMatch || nestedStatus || nestedCode || nestedMessage || bodyMatch
}

export function shouldRetryWithDifferentModel(error: any): boolean {
  return isRateLimitError(error) || 
         error?.status === 503 || 
         error?.statusCode === 503
}

export function getRetryDelayFromError(error: any): number {
  // Check for retry-after header
  if (error?.responseHeaders?.['retry-after']) {
    const retryAfter = parseInt(error.responseHeaders['retry-after'])
    if (!isNaN(retryAfter)) {
      return retryAfter * 1000 // Convert to milliseconds
    }
  }

  // Check for retry-after-ms header
  if (error?.responseHeaders?.['retry-after-ms']) {
    const retryAfterMs = parseInt(error.responseHeaders['retry-after-ms'])
    if (!isNaN(retryAfterMs)) {
      return retryAfterMs
    }
  }

  // Default fallback delays based on error type
  if (isRateLimitError(error)) {
    return 20000 // 20 seconds for rate limit
  }

  return 5000 // 5 seconds default
}

export interface ModelFallbackResult {
  model: ModelConfig
  attempt: number
  previousErrors: string[]
  isLastResort: boolean
}

export async function executeWithModelFallback<T>(
  operation: (model: ModelConfig) => Promise<T>,
  requiredCapabilities: string[] = [],
  maxAttempts: number = 3
): Promise<T> {
  const errors: string[] = []
  let currentModel: string | undefined
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const model = getNextAvailableModel(currentModel, requiredCapabilities)
    currentModel = model.name
    
    try {
      const result = await operation(model)
      
      // Success! Clear any previous failures for this model and record success
      clearModelFailure(model.name)
      aiUsageMonitor.recordRequest(model.name, true)
      
      return result
    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown error'
      errors.push(`${model.displayName}: ${errorMessage}`)
      
      // Enhanced error logging for debugging
      console.warn(`Model ${model.displayName} failed (attempt ${attempt}/${maxAttempts}):`, errorMessage)
      console.warn('Full error details:', {
        status: error?.status,
        statusCode: error?.statusCode,
        code: error?.code,
        type: error?.type,
        isRateLimit: isRateLimitError(error),
        shouldRetry: shouldRetryWithDifferentModel(error)
      })
      
      // Record failure
      aiUsageMonitor.recordRequest(model.name, false)
      
      // Mark model as failed if it's a rate limit or service error
      if (shouldRetryWithDifferentModel(error)) {
        markModelAsFailed(model.name)
        
        // If we have more attempts, try next model
        if (attempt < maxAttempts) {
          const delay = getRetryDelayFromError(error)
          console.log(`Waiting ${delay}ms before trying next model...`)
          await new Promise(resolve => setTimeout(resolve, Math.min(delay, 5000))) // Cap at 5 seconds
          continue
        }
      }
      
      // If this is the last attempt or not a retryable error, throw
      if (attempt === maxAttempts || !shouldRetryWithDifferentModel(error)) {
        console.error('All model fallback attempts failed:', errors)
        throw error
      }
    }
  }
  
  // This should never be reached, but just in case
  throw new Error(`All ${maxAttempts} model attempts failed: ${errors.join('; ')}`)
}
