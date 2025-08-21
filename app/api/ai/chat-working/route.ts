import { streamText } from "ai";
import { NextRequest } from "next/server";
import { openai } from "@ai-sdk/openai";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    console.log('[Working Chat API] Request received')
    
    // Check if OPENAI_API_KEY exists
    if (!process.env.OPENAI_API_KEY) {
      console.error('[Working Chat API] Missing OPENAI_API_KEY environment variable')
      return new Response('AI service not configured', { status: 500 })
    }
    
    const { messages, username, locale } = await req.json()
    
    console.log('[Working Chat API] Request validated')

    // Wait 25 seconds first to let rate limit reset
    console.log('[Working Chat API] Waiting for rate limit to reset...')
    await new Promise(resolve => setTimeout(resolve, 25000))
    
    console.log('[Working Chat API] Creating streamText with gpt-4o-mini after wait')
    
    const result = await streamText({
      model: openai('gpt-4o-mini'),
      maxTokens: 500, // Very conservative
      temperature: 0.7,
      system: `You are a helpful trading psychology coach. Keep responses brief and supportive. Respond in ${locale || 'English'}.`,
      messages: messages || [],
    });
    
    console.log('[Working Chat API] Stream created successfully')
    return result.toDataStreamResponse();
    
  } catch (error: any) {
    console.error('[Working Chat API] Error occurred:', error)
    
    // Return a simple error response that won't break streaming
    return new Response('Error: ' + error.message, { 
      status: 500,
      headers: { 'Content-Type': 'text/plain' }
    })
  }
}
