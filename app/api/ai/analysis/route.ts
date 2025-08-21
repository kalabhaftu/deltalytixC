import { streamText } from "ai";
import { NextRequest } from "next/server";
import { z } from "zod";
import { openai } from "@ai-sdk/openai";

// Global Analysis Tools
import { getOverallPerformanceMetrics } from "../chat/tools/get-overall-performance-metrics";
import { getPerformanceTrends } from "../chat/tools/get-performance-trends";

// Instrument Analysis Tools
import { getInstrumentPerformance } from "../chat/tools/get-instrument-performance";
import { getMostTradedInstruments } from "../chat/tools/get-most-traded-instruments";

// Account Analysis Tools
import { getAccountPerformance } from "../chat/tools/get-account-performance";

// Time of Day Analysis Tools
import { getTimeOfDayPerformance } from "../chat/tools/get-time-of-day-performance";

// Fallback tools
import { getCurrentWeekSummary } from "../chat/tools/get-current-week-summary";
import { getPreviousWeekSummary } from "../chat/tools/get-previous-week-summary";
import { getTradesSummary } from "../chat/tools/get-trades-summary";

export const maxDuration = 30;

const analysisSchema = z.object({
  section: z.enum(['global', 'instrument', 'accounts', 'timeOfDay']),
  username: z.string().optional(),
  locale: z.string().default('en'),
  timezone: z.string().default('UTC'),
});

function getToolsForSection(section: string) {
  const baseTools = {
    getTradesSummary,
    getCurrentWeekSummary,
    getPreviousWeekSummary,
    getMostTradedInstruments
  };

  switch (section) {
    case 'global':
      return {
        ...baseTools,
        getOverallPerformanceMetrics,
        getPerformanceTrends
      };
    case 'instrument':
      return {
        ...baseTools,
        getInstrumentPerformance
      };
    case 'accounts':
      return {
        ...baseTools,
        getAccountPerformance
      };
    case 'timeOfDay':
      return {
        ...baseTools,
        getTimeOfDayPerformance
      };
    default:
      return baseTools;
  }
}

function getLanguageInstructions(locale: string) {
  return `- You MUST respond in English
- All content must be in English
- Use clear, professional English throughout your response`;
}

function getBaseSystemPrompt(locale: string) {
  return `# ROLE & PERSONA
You are an expert trading analyst with deep knowledge of quantitative analysis, risk management, and trading psychology. You provide detailed, actionable insights based on trading data.

## COMMUNICATION LANGUAGE
${getLanguageInstructions(locale)}
- ALWAYS use English trading jargon even when responding in other languages
- Keep these terms in English: Short, Long, Call, Put, Bull, Bear, Stop Loss, Take Profit, Entry, Exit, Bullish, Bearish, Scalping, Swing Trading, Day Trading, Position, Leverage, Margin, Pip, Spread, Breakout, Support, Resistance

## RESPONSE FORMAT
Return ONLY valid JSON in the following format:

{
  "title": "Section Title",
  "description": "Brief description of what this analysis covers",
  "insights": [
    {
      "type": "positive|negative|neutral",
      "message": "Detailed insight message",
      "metric": "Optional metric value"
    }
  ],
  "score": 85,
  "trend": "up|down|neutral",
  "recommendations": [
    "Specific actionable recommendation 1",
    "Specific actionable recommendation 2",
    "Specific actionable recommendation 3"
  ]
}

## DATA PRESENTATION
- Use specific metrics and percentages from the tools
- Provide actionable recommendations based on the data
- Include both positive and negative insights
- Score should be 0-100 based on performance analysis
- Trend should reflect recent performance direction
- Reference actual data points from the tool responses

Return ONLY valid JSON in the specified format. No additional text or explanations.`;
}

function getGlobalAnalysisPrompt(locale: string) {
  return `${getBaseSystemPrompt(locale)}

## GLOBAL TRADING ANALYSIS

You are analyzing overall trading performance across all accounts and instruments. Focus on:

### KEY METRICS TO ANALYZE
- Use getOverallPerformanceMetrics to get comprehensive statistics
- Use getPerformanceTrends to identify patterns over time
- Overall win rate and profit factor analysis
- Risk-adjusted returns and drawdown metrics
- Trading consistency and performance stability

### ANALYSIS FOCUS AREAS
- **Performance Evaluation**: Overall profitability, win rate trends, and risk metrics
- **Risk Management**: Maximum drawdown, risk-reward ratios, and position sizing effectiveness
- **Trading Consistency**: Performance stability over time and variance analysis
- **Behavioral Patterns**: Trading frequency, average trade duration, and psychological factors
- **Trend Analysis**: Month-over-month and week-over-week performance evolution

### RECOMMENDATIONS SHOULD COVER
- Risk management improvements
- Trading strategy optimization
- Consistency enhancement techniques
- Performance maximization strategies`;
}

function getInstrumentAnalysisPrompt(locale: string) {
  return `${getBaseSystemPrompt(locale)}

## INSTRUMENT TRADING ANALYSIS

You are analyzing performance across different trading instruments. Focus on:

### KEY METRICS TO ANALYZE
- Use getInstrumentPerformance to get detailed metrics per instrument
- Use getMostTradedInstruments for volume and frequency analysis
- Performance comparison between different instruments
- Risk-adjusted returns by instrument type

### ANALYSIS FOCUS AREAS
- **Instrument Performance**: Best and worst performing instruments with specific metrics
- **Trading Volume**: Most and least traded instruments and their profitability
- **Risk Analysis**: Volatility and drawdown patterns by instrument
- **Specialization Opportunities**: Instruments showing consistent performance
- **Diversification Assessment**: Portfolio allocation effectiveness across instruments

### RECOMMENDATIONS SHOULD COVER
- Instrument allocation optimization
- Focus area identification for skill development
- Diversification improvements
- Instrument-specific trading strategies`;
}

function getAccountAnalysisPrompt(locale: string) {
  return `${getBaseSystemPrompt(locale)}

## ACCOUNT TRADING ANALYSIS

You are analyzing performance across different trading accounts. Focus on:

### KEY METRICS TO ANALYZE
- Use getAccountPerformance to compare performance across accounts
- Individual account profitability and risk metrics
- Account-specific trading patterns and behaviors
- Risk distribution and management across accounts

### ANALYSIS FOCUS AREAS
- **Account Comparison**: Performance ranking and metrics comparison
- **Risk Distribution**: How risk is managed across different accounts
- **Trading Patterns**: Different strategies or behaviors per account
- **Capital Allocation**: Effectiveness of capital distribution
- **Account Management**: Overall portfolio management effectiveness

### RECOMMENDATIONS SHOULD COVER
- Account consolidation or expansion strategies
- Capital reallocation opportunities
- Account-specific improvement areas
- Portfolio optimization across accounts`;
}

function getTimeOfDayAnalysisPrompt(locale: string, timezone: string) {
  return `${getBaseSystemPrompt(locale)}

## TIME-BASED TRADING ANALYSIS

You are analyzing performance based on time patterns and trading sessions in the user's timezone (${timezone}). Focus on:

### KEY METRICS TO ANALYZE
- Use getTimeOfDayPerformance for comprehensive time-based analysis (properly timezone-adjusted)
- Performance by specific hours, days, and trading sessions
- Time-based profitability patterns and trends
- Session-specific win rates and risk metrics

### ANALYSIS FOCUS AREAS
- **Optimal Trading Hours**: Best and worst performing time periods in ${timezone} timezone
- **Session Analysis**: Performance during different market sessions (Asian, European, US) adjusted for ${timezone}
- **Day-of-Week Patterns**: Weekly performance variations in user's timezone
- **Time-Based Risk**: Volatility and drawdown patterns by time
- **Market Condition Correlation**: Performance vs market opening/closing times relative to ${timezone}

### IMPORTANT TIMEZONE CONTEXT
- All time analysis is performed in ${timezone} timezone
- Trading sessions and hourly breakdowns reflect the user's local time
- Day-of-week analysis accounts for timezone differences
- Recommendations should consider the user's timezone when suggesting optimal trading windows

### RECOMMENDATIONS SHOULD COVER
- Optimal trading schedule optimization in ${timezone}
- Time-based strategy adjustments
- Session-specific trading improvements
- Calendar-based trading planning considering ${timezone} market hours`;
}

function getSystemPromptForSection(section: string, locale: string, timezone: string = 'UTC') {
  switch (section) {
    case 'global':
      return getGlobalAnalysisPrompt(locale);
    case 'instrument':
      return getInstrumentAnalysisPrompt(locale);
    case 'accounts':
      return getAccountAnalysisPrompt(locale);
    case 'timeOfDay':
      return getTimeOfDayAnalysisPrompt(locale, timezone);
    default:
      return getBaseSystemPrompt(locale);
  }
}

export async function POST(req: NextRequest) {
  try {
    // Add request timeout handling
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 25000) // 25 second timeout (less than maxDuration)

    try {
      const { section, username, locale, timezone } = await req.json();
      
      // Add debugging to see what locale is being received
      console.log('Analysis API received:', { section, username, locale, timezone });
      
      // Validate the request
      const validatedData = analysisSchema.parse({ section, username, locale, timezone });
      console.log('Validated data:', validatedData);

      const result = streamText({
        model: openai("gpt-4o-mini"),
        system: getSystemPromptForSection(validatedData.section, validatedData.locale, validatedData.timezone),
        toolCallStreaming: true,
        messages: [
          {
            role: "user",
            content: `Analyze my ${validatedData.section} trading performance and provide detailed insights in ${validatedData.locale} language.`
          }
        ],
        maxSteps: 5,
        tools: getToolsForSection(validatedData.section),
        abortSignal: controller.signal,
      });

      clearTimeout(timeoutId)
      return result.toDataStreamResponse();
    } catch (timeoutError) {
      clearTimeout(timeoutId)
      if (timeoutError.name === 'AbortError') {
        console.error("Analysis request timed out");
        return new Response(JSON.stringify({ 
          error: "Request timed out. Please try again.",
          code: "TIMEOUT"
        }), {
          status: 408,
          headers: { "Content-Type": "application/json" },
        });
      }
      throw timeoutError
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("Validation error:", error.errors);
      return new Response(JSON.stringify({ 
        error: "Invalid request parameters", 
        details: error.errors,
        code: "VALIDATION_ERROR"
      }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    
    console.error("Error in analysis route:", error);
    
    // Provide more specific error messages
    let errorMessage = "Failed to process analysis"
    let statusCode = 500
    
    if (error.message?.includes('OpenAI')) {
      errorMessage = "AI service temporarily unavailable. Please try again."
      statusCode = 503
    } else if (error.message?.includes('rate limit')) {
      errorMessage = "Too many requests. Please wait a moment and try again."
      statusCode = 429
    } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
      errorMessage = "Network error. Please check your connection and try again."
      statusCode = 502
    }
    
    return new Response(JSON.stringify({ 
      error: errorMessage,
      code: "SERVER_ERROR"
    }), {
      status: statusCode,
      headers: { "Content-Type": "application/json" },
    });
  }
}