/**
 * AI Provider Abstraction Layer
 * Supports multiple AI providers with consistent interface
 */

import { openai as originalOpenai } from '@ai-sdk/openai'
import { streamText, generateText, StreamTextResult, GenerateTextResult } from 'ai'

export type AIProvider = 'openai' | 'zai'

export interface ProviderConfig {
  name: string
  displayName: string
  models: ModelConfig[]
  apiKey: string
  baseURL?: string
}

export interface ModelConfig {
  name: string
  displayName: string
  maxTokens?: number
  temperature?: number
  costLevel: number // 1 = most expensive, 5 = cheapest
  capabilities: string[]
}

// OpenAI Models Configuration
const OPENAI_MODELS: ModelConfig[] = [
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

// zAI Models Configuration
const ZAI_MODELS: ModelConfig[] = [
  {
    name: 'glm-4.5',
    displayName: 'GLM-4.5',
    maxTokens: 8192,
    temperature: 0.6,
    costLevel: 1,
    capabilities: ['reasoning', 'analysis', 'chat', 'fast-response', 'complex-reasoning']
  }
]

// Provider configurations
const PROVIDERS: Record<AIProvider, ProviderConfig> = {
  openai: {
    name: 'openai',
    displayName: 'OpenAI',
    models: OPENAI_MODELS,
    apiKey: process.env.OPENAI_API_KEY || '',
    baseURL: 'https://api.openai.com/v1'
  },
  zai: {
    name: 'zai',
    displayName: 'zAI',
    models: ZAI_MODELS,
    apiKey: process.env.ZAI_API_KEY || '',
    baseURL: 'https://api.z.ai/api/paas/v4/'
  }
}

// Get provider configuration
export function getProviderConfig(provider: AIProvider): ProviderConfig {
  return PROVIDERS[provider]
}

// Get all available models for a provider
export function getProviderModels(provider: AIProvider): ModelConfig[] {
  return PROVIDERS[provider].models
}

// Get the best model for a provider based on capabilities
export function getBestModel(provider: AIProvider, requiredCapabilities: string[] = []): ModelConfig {
  const models = getProviderModels(provider)
  
  // Filter models that support required capabilities
  const suitableModels = models.filter(model => 
    requiredCapabilities.every(cap => model.capabilities.includes(cap))
  )
  
  if (suitableModels.length === 0) {
    // Return the cheapest model if no suitable models found
    return models[models.length - 1]
  }
  
  // Return the cheapest suitable model (lowest costLevel)
  return suitableModels.reduce((best, current) => 
    current.costLevel < best.costLevel ? current : best
  )
}



// Create provider instance
function createProviderInstance(provider: AIProvider) {
  const config = getProviderConfig(provider)
  
  if (!config.apiKey) {
    throw new Error(`${config.displayName} API key not configured`)
  }

  switch (provider) {
    case 'openai':
      return {
        createModel: (modelName: string) => {
          const model = originalOpenai(modelName) as any
          return {
            ...model,
            specificationVersion: 'v1' as const,
            defaultObjectGenerationMode: 'json' as const,
          }
        }
      }
    case 'zai':
      // Use direct OpenAI client with zAI endpoint (your exact approach)
      return {
        createModel: (modelName: string) => {
          // Import OpenAI client dynamically
          const OpenAI = require('openai')
          const client = new OpenAI({
            apiKey: config.apiKey,
            baseURL: config.baseURL,
          })
          
          // Create AI SDK compatible model
          return {
            modelId: modelName,
            specificationVersion: 'v2' as const,
            provider: 'zai-direct',
            defaultObjectGenerationMode: 'json' as const,
            
            doGenerate: async (options: any) => {
              const response = await client.chat.completions.create({
                model: modelName,
                messages: options.prompt.messages,
                max_tokens: options.maxTokens,
                temperature: options.temperature || 0.7
              })
              
              return {
                text: response.choices[0].message.content,
                usage: {
                  promptTokens: response.usage.prompt_tokens,
                  completionTokens: response.usage.completion_tokens
                }
              }
            },
            
            doStream: async (options: any) => {
              const response = await client.chat.completions.create({
                model: modelName,
                messages: options.prompt.messages,
                max_tokens: options.maxTokens,
                temperature: options.temperature || 0.7,
                stream: true
              })
              
              return {
                stream: response,
                rawCall: { rawPrompt: null, rawSettings: {} }
              }
            }
          }
        }
      }
    default:
      throw new Error(`Unsupported provider: ${provider}`)
  }
}

// Main interface for AI operations
export interface AIStreamOptions {
  provider: AIProvider
  model?: string
  messages: any[]
  system?: string
  maxTokens?: number
  temperature?: number
  tools?: any
  toolCallStreaming?: boolean
  maxSteps?: number
  requiredCapabilities?: string[]
}

export interface AIGenerateOptions extends Omit<AIStreamOptions, 'toolCallStreaming' | 'maxSteps'> {}

// Unified streaming function
export async function createAIStream(options: AIStreamOptions): Promise<StreamTextResult<any, any>> {
  const { provider, model: modelName, requiredCapabilities = [], ...streamOptions } = options
  
  // Get the best model if none specified
  const selectedModel = modelName || getBestModel(provider, requiredCapabilities).name
  const providerInstance = createProviderInstance(provider)
  const model = providerInstance.createModel(selectedModel)

  return streamText({
    model,
    ...streamOptions
  } as any)
}

// Unified generation function
export async function generateAIText(options: AIGenerateOptions): Promise<GenerateTextResult<any, any>> {
  const { provider, model: modelName, requiredCapabilities = [], ...generateOptions } = options
  
  // Debug logging removed for performance
  
  // Get the best model if none specified
  const selectedModel = modelName || getBestModel(provider, requiredCapabilities).name
  const providerInstance = createProviderInstance(provider)
  const model = providerInstance.createModel(selectedModel)

  return generateText({
    model,
    ...generateOptions
  } as any)
}

// Legacy compatibility - maintain existing openai function
export function openai(modelName: string) {
  const openaiProvider = createProviderInstance('openai')
  return openaiProvider.createModel(modelName)
}

// Get user's preferred provider from database
export async function getUserAIProvider(userId: string): Promise<AIProvider> {
  try {
    const { prisma } = await import('@/lib/prisma')
    const user = await (prisma.$queryRaw`
      SELECT "aiProvider" FROM "public"."User" WHERE id = ${userId}
    ` as Promise<{ aiProvider: string }[]>)
    
    return (user[0]?.aiProvider as AIProvider) || 'zai' // Default to zAI
  } catch (error) {
    console.error('Error getting user AI provider:', error)
    return 'zai' // Default fallback
  }
}

// Update user's preferred provider
export async function updateUserAIProvider(userId: string, provider: AIProvider): Promise<void> {
  try {
    const { prisma } = await import('@/lib/prisma')
    await prisma.$queryRaw`
      UPDATE "public"."User" SET "aiProvider" = ${provider} WHERE id = ${userId}
    `
  } catch (error) {
    console.error('Error updating user AI provider:', error)
    throw error
  }
}
