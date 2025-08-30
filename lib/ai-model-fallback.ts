/**
 * AI Model Fallback System
 * Automatically switches to cheaper/smaller models when rate limits are hit
 * Updated to support multiple AI providers
 */

import { aiUsageMonitor } from './ai-usage-monitor'
import { 
  AIProvider, 
  ModelConfig, 
  getProviderModels, 
  getUserAIProvider,
  createAIStream,
  AIStreamOptions 
} from './ai-providers'

// Legacy ModelConfig export for backward compatibility
export type { ModelConfig }

// Get all models from all providers in fallback order
function getAllModelsInFallbackOrder(preferredProvider?: AIProvider): ModelConfig[] {
  const allModels: ModelConfig[] = []
  
  // If we have a preferred provider, start with its models
  if (preferredProvider) {
    allModels.push(...getProviderModels(preferredProvider))
  }
  
  // Add models from other providers
  const providers: AIProvider[] = ['zai', 'openai']
  
  for (const provider of providers) {
    if (provider !== preferredProvider) {
      allModels.push(...getProviderModels(provider))
    }
  }
  
  // Sort by cost level (cheapest first)
  return allModels.sort((a, b) => a.costLevel - b.costLevel)
}

// Legacy export for backward compatibility
export const MODEL_HIERARCHY = getAllModelsInFallbackOrder('zai')

// Track failed models to avoid immediate retry
const failedModels = new Map<string, number>() // model -> timestamp of failure
const FAILURE_COOLDOWN = 60000 // 1 minute cooldown

export function getNextAvailableModel(
  currentModel?: string, 
  requiredCapabilities: string[] = [],
  preferredProvider?: AIProvider
): ModelConfig {
  const hierarchy = getAllModelsInFallbackOrder(preferredProvider)
  const currentIndex = currentModel 
    ? hierarchy.findIndex(m => m.name === currentModel)
    : -1

  // Start from the next model in hierarchy (or first if no current model)
  const startIndex = currentIndex >= 0 ? currentIndex + 1 : 0

  for (let i = startIndex; i < hierarchy.length; i++) {
    const model = hierarchy[i]
    
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
  return hierarchy[hierarchy.length - 1]
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

// Enhanced executeWithModelFallback that supports provider preferences
export async function executeWithModelFallback<T>(
  operation: (model: ModelConfig) => Promise<T>,
  requiredCapabilities: string[] = [],
  maxAttempts: number = 3,
  userId?: string
): Promise<T> {
  const errors: string[] = []
  let currentModel: string | undefined
  
  // Get user's preferred provider if userId is provided
  let preferredProvider: AIProvider | undefined
  if (userId) {
    try {
      preferredProvider = await getUserAIProvider(userId)
    } catch (error) {
      console.warn('Failed to get user AI provider preference, using default')
    }
  }
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const model = getNextAvailableModel(currentModel, requiredCapabilities, preferredProvider)
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

// New function that uses the AI provider abstraction
export async function executeWithProviderFallback<T>(
  options: Omit<AIStreamOptions, 'provider'>,
  userId?: string,
  maxAttempts: number = 3
): Promise<T> {
  // Get user's preferred provider
  let preferredProvider: AIProvider = 'zai' // Default to zAI
  if (userId) {
    try {
      preferredProvider = await getUserAIProvider(userId)
    } catch (error) {
      console.warn('Failed to get user AI provider preference, using default')
    }
  }

  const errors: string[] = []
  let currentProvider = preferredProvider
  let currentModel: string | undefined

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      // Check if we want streaming or non-streaming response
      if (options.toolCallStreaming === false) {
        // Use generateAIText for non-streaming responses
        const { generateAIText } = await import('@/lib/ai-providers')
        const result = await generateAIText({
          ...options,
          provider: currentProvider,
          model: currentModel
        })
        return result as T
      } else {
        // Use createAIStream for streaming responses
        const result = await createAIStream({
          ...options,
          provider: currentProvider,
          model: currentModel
        })
        return result as T
      }
    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown error'
      errors.push(`${currentProvider} (${currentModel || 'auto'}): ${errorMessage}`)
      
      console.warn(`Provider ${currentProvider} failed (attempt ${attempt}/${maxAttempts}):`, errorMessage)
      
      // If rate limited or service error, try different provider
      if (shouldRetryWithDifferentModel(error) && attempt < maxAttempts) {
        // Switch to the other provider
        currentProvider = currentProvider === 'openai' ? 'zai' : 'openai'
        currentModel = undefined // Reset model selection
        
        const delay = getRetryDelayFromError(error)
        console.log(`Switching to ${currentProvider} provider after ${delay}ms delay...`)
        await new Promise(resolve => setTimeout(resolve, Math.min(delay, 5000)))
        continue
      }
      
      // If this is the last attempt, throw
      if (attempt === maxAttempts) {
        console.error('All provider fallback attempts failed:', errors)
        throw error
      }
    }
  }
  
  throw new Error(`All ${maxAttempts} provider attempts failed: ${errors.join('; ')}`)
}
