import { streamText } from "ai";
import { NextRequest } from "next/server";
import { z } from "zod";
import { openai } from "@/lib/ai-sdk-wrapper";
import { executeWithModelFallback, ModelConfig } from "@/lib/ai-model-fallback";
import { withRateLimit } from "@/lib/rate-limiting";
import { getFinancialNews } from "./tools/get-financial-news";
import { getJournalEntries } from "./tools/get-journal-entries";
import { getMostTradedInstruments } from "./tools/get-most-traded-instruments";
import { getLastTradesData } from "./tools/get-last-trade-data";
import { getTradesDetails } from "./tools/get-trades-details";
import { getTradesSummary } from "./tools/get-trades-summary";
import { getCurrentWeekSummary } from "./tools/get-current-week-summary";
import { getPreviousWeekSummary } from "./tools/get-previous-week-summary";
import { getWeekSummaryForDate } from "./tools/get-week-summary-for-date";
import { getPreviousConversation } from "./tools/get-previous-conversation";
import { startOfWeek, endOfWeek, subWeeks, format } from "date-fns";

export const maxDuration = 30;

export const POST = withRateLimit(async (req: NextRequest) => {
  try {
    console.log('[Chat API] Request received')
    
    // Check if OPENAI_API_KEY exists
    if (!process.env.OPENAI_API_KEY) {
      console.error('[Chat API] Missing OPENAI_API_KEY environment variable')
      return new Response(JSON.stringify({ 
        error: 'AI service not configured',
        code: 'CONFIG_ERROR'
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      })
    }
    
    // Add request body validation
    let body
    try {
      body = await req.json()
    } catch (parseError) {
      console.error('[Chat API] Failed to parse request body:', parseError)
      return new Response(JSON.stringify({ 
        error: 'Invalid request body',
        code: 'PARSE_ERROR'
      }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }
    
    const { messages, username, locale, timezone } = body
    
    // Validate required fields
    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ 
        error: 'Messages array is required',
        code: 'VALIDATION_ERROR'
      }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }
    
    console.log('[Chat API] Request validated:', { 
      messageCount: messages.length, 
      username, 
      locale, 
      timezone 
    })

    // Calculate current week and previous week boundaries in user's timezone
    const now = new Date();
    const currentWeekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday start
    const currentWeekEnd = endOfWeek(now, { weekStartsOn: 1 });
    const previousWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
    const previousWeekEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });

    console.log('[Chat API] Starting model fallback execution')
    
    const result = await executeWithModelFallback(
      async (modelConfig: ModelConfig) => {
        console.log(`[Chat] Using model: ${modelConfig.displayName}`)
        
        try {
          return streamText({
            model: openai(modelConfig.name),
            maxTokens: modelConfig.maxTokens,
            temperature: modelConfig.temperature,
            
            system: `# ROLE & PERSONA
You are a supportive trading psychology coach with expertise in behavioral finance and trader development. You create natural, engaging conversations that show genuine interest in the trader's journey and well-being.

## COMMUNICATION LANGUAGE
- You MUST respond in ${locale} language or follow the user's conversation language
- ALWAYS use English trading jargon even when responding in other languages
- Keep these terms in English: Short, Long, Call, Put, Bull, Bear, Stop Loss, Take Profit, Entry, Exit, Bullish, Bearish, Scalping, Swing Trading, Day Trading, Position, Leverage, Margin, Pip, Spread, Breakout, Support, Resistance
- Example: In French, say "J'ai pris une position Short" instead of "J'ai pris une position courte"

## CONTEXT & TIMING
Trader Information:
${username ? `- Trader: ${username}` : '- Anonymous Trader'}
- Current Date (UTC): ${new Date().toUTCString()}
- User Timezone: ${timezone}

DATE CONTEXT - CRITICAL FOR ACCURATE DATA REFERENCES:
- CURRENT WEEK: ${format(currentWeekStart, 'yyyy-MM-dd')} to ${format(currentWeekEnd, 'yyyy-MM-dd')} (${format(currentWeekStart, 'MMM d')} - ${format(currentWeekEnd, 'MMM d, yyyy')})
- PREVIOUS WEEK: ${format(previousWeekStart, 'yyyy-MM-dd')} to ${format(previousWeekEnd, 'yyyy-MM-dd')} (${format(previousWeekStart, 'MMM d')} - ${format(previousWeekEnd, 'MMM d, yyyy')})

CRITICAL: When referencing data periods, you MUST use the exact date ranges above and clarify which specific week you're discussing.

## RESPONSE FORMATTING REQUIREMENTS

MANDATORY FORMATTING RULES:
1. Use Markdown extensively for clear structure and readability
2. Create visual breaks with spacing between sections
3. Use headings (##, ###) to organize information
4. Use bullet points (-) and numbered lists for clarity
5. Use bold formatting for emphasis on important points
6. Use line breaks generously to avoid wall-of-text responses
7. Format time references in the user's timezone
8. Structure responses with clear sections when discussing multiple topics

DATA PRESENTATION FORMATTING:
- Present trading statistics in clear, scannable format
- Use bullet points for multiple data points
- Bold key metrics like P&L, win rates, etc.
- Create visual separation between different accounts or time periods
- Use tables or structured lists for comparing periods

CONVERSATION FLOW FORMATTING:
- Start with a warm, personalized greeting
- Use transition phrases between topics
- Space out different conversation elements:
  - Personal check-in
  - Data insights  
  - Questions or observations
  - Encouragement or advice

## TOOL USAGE & DATA GATHERING

CONVERSATION INITIALIZATION:
- ALWAYS start by calling getCurrentWeekSummary() to get current week trading data
- ALWAYS check journal entries and conversation history for the last 7 days using getJournalEntries()
- Use getPreviousConversation() to understand context

PREFERRED TOOLS FOR WEEKLY DATA:
- getCurrentWeekSummary() for current week data (automatically gets correct dates)
- getPreviousWeekSummary() for previous week data (automatically gets correct dates)  
- getWeekSummaryForDate(date) for any specific week (pass any date, calculates week boundaries)
- getTradesSummary() only for custom date ranges

TOOL USAGE RESTRICTIONS:
- NEVER start conversations with getTradesDetails() or getLastTradesData()
- ALWAYS use specific weekly tools rather than manual date calculations
- UPDATE data between messages to ensure latest information

## CONVERSATION STYLE & APPROACH

CORE OBJECTIVES:
- Create engaging, supportive interactions that feel natural and helpful
- Understand the trader's emotional state and trading patterns
- Provide insights without overwhelming with information
- Validate experiences while offering gentle guidance

RESPONSE VARIETY (Choose Appropriately):
- Share observations about trading patterns with supporting data
- Offer gentle insights when patterns emerge
- Ask thoughtful questions to encourage reflection
- Acknowledge and validate experiences and emotions
- Provide supportive comments that encourage growth
- Reference specific trades or patterns when relevant

TONE & ENGAGEMENT:
- Conversational and empathetic - avoid being overly formal
- Use emojis sparingly and only when they enhance understanding
- Don't force questions into every response
- Vary response length based on context and data richness
- Be genuinely interested in the trader's development

EXAMPLE RESPONSE STRUCTURE:
Always structure responses with:
- Clear headings (## Hello [Name]!)
- Data sections (### This Week's Overview)
- Bullet points for key metrics
- Personal observations (### What I'm Noticing) 
- Reflection questions (### Reflection)
- Encouraging closing statements

Remember: Clarity and structure create better conversations. Use this formatting framework to ensure every response is easy to read and genuinely helpful.`,
      toolCallStreaming: true,
      messages: messages,
      maxSteps: 5, // Reduced from 10 to prevent complexity issues
      tools: {
        // server-side tool with execute function
        getJournalEntries,
        getPreviousConversation,
        getMostTradedInstruments,
        getLastTradesData,
        getTradesDetails,
        getTradesSummary,
        getCurrentWeekSummary,
        getPreviousWeekSummary,
        getWeekSummaryForDate,
        getFinancialNews,
        // client-side tool that is automatically executed on the client
        // askForConfirmation,
        // askForLocation,
      },
          })
        } catch (modelError) {
          console.error(`[Chat] Model ${modelConfig.displayName} failed:`, modelError)
          throw modelError
        }
      },
      ['chat', 'reasoning'], // Required capabilities
      3 // Max attempts with different models
    )
    
    console.log('[Chat API] Successfully created stream response')
    
    // Add error handling for streaming response
    try {
      return result.toDataStreamResponse();
    } catch (streamError) {
      console.error('[Chat API] Error creating data stream response:', streamError)
      return new Response(JSON.stringify({ 
        error: "Failed to create streaming response",
        code: "STREAM_ERROR"
      }), {
        status: 500,
        headers: { 
          "Content-Type": "application/json",
          "Connection": "close"
        },
      });
    }
  } catch (error: any) {
    console.error('[Chat API] Error occurred:', error)
    
    // Handle timeout and other errors gracefully
    if (error?.name === 'AbortError') {
      console.error("[Chat API] Request timed out");
      return new Response(JSON.stringify({ 
        error: "Request timed out. Please try again.",
        code: "TIMEOUT"
      }), {
        status: 408,
        headers: { 
          "Content-Type": "application/json",
          "Connection": "close" // Prevent connection reuse
        },
      });
    }
    
    if (error instanceof z.ZodError) {
      console.error("[Chat API] Validation error:", error.errors);
      return new Response(JSON.stringify({ 
        error: "Validation failed",
        details: error.errors,
        code: "VALIDATION_ERROR"
      }), {
        status: 400,
        headers: { 
          "Content-Type": "application/json",
          "Connection": "close"
        },
      });
    }
    
    // Handle AI SDK specific errors
    if (error?.status || error?.statusCode) {
      console.error("[Chat API] AI SDK error:", {
        status: error.status || error.statusCode,
        message: error.message,
        code: error.code
      });
      
      return new Response(JSON.stringify({ 
        error: "AI service error. Please try again.",
        code: "AI_ERROR"
      }), {
        status: 503,
        headers: { 
          "Content-Type": "application/json",
          "Connection": "close"
        },
      });
    }
    
    // Generic error handler
    console.error("[Chat API] Unexpected error:", error);
    return new Response(JSON.stringify({ 
      error: "An unexpected error occurred. Please try again.",
      code: "INTERNAL_ERROR"
    }), {
      status: 500,
      headers: { 
        "Content-Type": "application/json",
        "Connection": "close"
      },
    });
  }
}, 'ai') 