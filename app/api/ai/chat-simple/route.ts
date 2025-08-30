import { NextRequest } from "next/server";
import { executeWithProviderFallback } from "@/lib/ai-model-fallback";
import { createClient } from '@/server/auth';
import { prisma } from '@/lib/prisma';

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    console.log('[Simple Chat API] Request received')
    
    // Check if at least one AI provider is configured
    if (!process.env.OPENAI_API_KEY && !process.env.ZAI_API_KEY) {
      console.error('[Simple Chat API] No AI provider API keys configured')
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

    // Get user ID from auth for provider preference
    let userId: string | undefined
    try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.id) {
        // Find user in our database
        const dbUser = await prisma.user.findUnique({
          where: { auth_user_id: user.id },
          select: { id: true }
        })
        userId = dbUser?.id
      }
    } catch (error) {
      console.warn('[Simple Chat API] Failed to get user ID for AI provider preference:', error)
    }

    console.log('[Simple Chat API] Starting provider fallback execution')
    
    const result = await executeWithProviderFallback({
      messages: messages || [],
      maxTokens: 800,
      temperature: 0.7,
      requiredCapabilities: ['chat', 'fast-response'],
      system: `You are a helpful trading psychology coach. Respond in ${locale || 'English'} language. 
      
      Keep responses concise and supportive. Help traders with their emotional and psychological challenges.
      
      Trader: ${username || 'Anonymous'}`,
    }, userId, 3)
    
    console.log('[Simple Chat API] Successfully created stream response')
    return result
    
  } catch (error: any) {
    console.error('[Simple Chat API] Error occurred:', error)
    
    // Handle rate limit errors
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
    
    // Handle quota errors
    if (error.message?.includes('quota') || error.message?.includes('exceeded your current quota')) {
      return new Response(JSON.stringify({ 
        error: "API quota exceeded.",
        code: "QUOTA_EXCEEDED",
        details: "Please check your AI provider account billing."
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
