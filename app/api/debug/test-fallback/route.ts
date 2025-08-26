import { NextRequest, NextResponse } from 'next/server'
import { executeWithModelFallback, ModelConfig } from '@/lib/ai-model-fallback'
import { openai } from "@/lib/ai-sdk-wrapper"
import { streamText } from "ai"

export async function GET(req: NextRequest) {
  try {
    console.log('Testing model fallback system...')
    
    const result = await executeWithModelFallback(
      async (modelConfig: ModelConfig) => {
        console.log(`Testing with model: ${modelConfig.displayName}`)
        
        // Simulate a simple completion to test the model
        const completion = await streamText({
          model: openai(modelConfig.name),
          maxTokens: 50,
          temperature: 0,
          messages: [
            {
              role: "user",
              content: "Say 'Hello from " + modelConfig.displayName + "'"
            }
          ]
        })
        
        return completion
      },
      ['chat'], // Required capabilities
      3 // Max attempts
    )
    
    return result.toDataStreamResponse()
  } catch (error: any) {
    console.error('Fallback test failed:', error)
    return NextResponse.json({
      error: 'Fallback test failed',
      details: error?.message || 'Unknown error'
    }, { status: 500 })
  }
}
