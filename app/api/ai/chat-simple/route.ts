import { streamText } from "ai";
import { NextRequest } from "next/server";
import { openai } from "@ai-sdk/openai";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    console.log('[Simple Chat API] Request received')
    
    // Check if OPENAI_API_KEY exists
    if (!process.env.OPENAI_API_KEY) {
      console.error('[Simple Chat API] Missing OPENAI_API_KEY environment variable')
      return new Response(JSON.stringify({ 
        error: 'AI service not configured',
        code: 'CONFIG_ERROR'
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      })
    }
    
    let body;
    try {
      body = await req.json();
    } catch (parseError) {
      console.error('[Simple Chat API] Failed to parse request body:', parseError);
      return new Response(JSON.stringify({ 
        error: 'Invalid request body',
        code: 'PARSE_ERROR'
      }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    
    const { messages, username, locale } = body;
    
    // Validate messages
    if (!messages || !Array.isArray(messages)) {
      console.error('[Simple Chat API] Invalid messages array:', messages);
      return new Response(JSON.stringify({ 
        error: 'Messages array is required',
        code: 'VALIDATION_ERROR'
      }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    
    console.log('[Simple Chat API] Request validated:', { 
      messageCount: messages?.length, 
      username, 
      locale 
    })

    // Model fallback hierarchy - only use models that are likely to work
    // Based on testing: gpt-3.5-turbo and gpt-4o require payment, gpt-4o-mini has rate limits
    const modelFallbacks = [
      { name: 'gpt-4o-mini', maxTokens: 800 }, // Primary model, but might be rate limited
      // Other models require payment plan, so we'll implement a wait strategy for gpt-4o-mini
    ];
    
    let result;
    let lastError;
    
    for (const modelConfig of modelFallbacks) {
      try {
        console.log(`[Simple Chat API] Trying model: ${modelConfig.name}`)
        
        result = await streamText({
          model: openai(modelConfig.name),
          maxTokens: modelConfig.maxTokens,
          temperature: 0.7,
          system: `You are a helpful trading psychology coach. Respond in ${locale || 'English'} language. 
          
          Keep responses concise and supportive. Help traders with their emotional and psychological challenges.
          
          Trader: ${username || 'Anonymous'}`,
          messages: messages || [],
        });
        
        console.log(`[Simple Chat API] Successfully created stream with model: ${modelConfig.name}`)
        break; // Success! Exit the loop
        
      } catch (modelError: any) {
        console.log(`[Simple Chat API] Model ${modelConfig.name} failed:`, modelError.message)
        lastError = modelError;
        
        // Check if it's a rate limit error vs quota exceeded
        if (modelError.message?.includes('rate limit') || modelError.message?.includes('Rate limit')) {
          console.log(`[Simple Chat API] Rate limit hit for ${modelConfig.name}`)
          
          // For rate limits, we could wait and retry the same model, but for now continue to next
          if (modelConfig.name === 'gpt-4o-mini') {
            // gpt-4o-mini is rate limited, but other models need payment
            // Better to inform user about the 20-second wait
            const rateLimitError = new Error('Rate limit reached for gpt-4o-mini. Please wait 20 seconds and try again, or upgrade your account to access other models.');
            rateLimitError.name = 'RateLimitError';
            throw rateLimitError;
          }
          continue; // Try next model
        } else if (modelError.message?.includes('quota') || modelError.message?.includes('exceeded your current quota')) {
          console.log(`[Simple Chat API] Quota exceeded for ${modelConfig.name}, trying next model...`)
          continue; // Try next model
        } else {
          // If it's not a rate limit or quota error, don't try other models
          throw modelError;
        }
      }
    }
    
    // If we get here and result is undefined, all models failed
    if (!result) {
      console.error('[Simple Chat API] All models failed, throwing last error')
      throw lastError;
    }

    console.log('[Simple Chat API] Stream created successfully')
    return result.toDataStreamResponse();
    
  } catch (error: any) {
    console.error('[Simple Chat API] Error occurred:', error)
    
    // Handle rate limit and quota errors specifically
    if (error.name === 'RateLimitError' || error.message?.includes('Rate limit reached for gpt-4o-mini')) {
      return new Response(JSON.stringify({ 
        error: "Rate limit reached for gpt-4o-mini.",
        code: "RATE_LIMIT_MINI",
        details: "Please wait 20 seconds and try again, or upgrade your OpenAI account to access other models with higher limits."
      }), {
        status: 429,
        headers: { 
          "Content-Type": "application/json",
          "Connection": "close"
        },
      });
    }
    
    if (error.message?.includes('rate limit') || error.message?.includes('Rate limit')) {
      return new Response(JSON.stringify({ 
        error: "Rate limit reached.",
        code: "RATE_LIMIT_ERROR",
        details: "Please wait a few minutes and try again."
      }), {
        status: 429,
        headers: { 
          "Content-Type": "application/json",
          "Connection": "close"
        },
      });
    }
    
    if (error.message?.includes('quota') || error.message?.includes('exceeded your current quota')) {
      return new Response(JSON.stringify({ 
        error: "API quota exceeded.",
        code: "QUOTA_EXCEEDED",
        details: "Please upgrade your OpenAI account at https://platform.openai.com/account/billing to access additional models."
      }), {
        status: 402,
        headers: { 
          "Content-Type": "application/json",
          "Connection": "close"
        },
      });
    }
    
    return new Response(JSON.stringify({ 
      error: "An unexpected error occurred. Please try again.",
      code: "INTERNAL_ERROR",
      details: error.message
    }), {
      status: 500,
      headers: { 
        "Content-Type": "application/json",
        "Connection": "close"
      },
    });
  }
}
