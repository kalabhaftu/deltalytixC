import { createOpenAI } from "@ai-sdk/openai";
import { streamObject } from "ai";
import { NextRequest } from "next/server";
import { tradeSchema } from "./schema";
import { z } from "zod";
import { applyRateLimit, aiLimiter } from "@/lib/rate-limiter";

export const maxDuration = 30;

// Initialize xAI provider (OpenAI-compatible)
const xai = createOpenAI({
  apiKey: process.env.XAI_API_KEY,
  baseURL: process.env.XAI_BASE_URL || 'https://api.x.ai/v1',
});

const requestSchema = z.object({
  headers: z.array(z.string()),
  rows: z.array(z.array(z.string())).max(100, "Too many rows to process")
});

export async function POST(req: NextRequest) {
  // Apply rate limiting
  const rateLimitResult = await applyRateLimit(req, aiLimiter);
  if (rateLimitResult) return rateLimitResult;

  try {
    const body = await req.json();
    const { headers, rows } = requestSchema.parse(body);

    const result = streamObject({
      model: xai(process.env.XAI_MODEL || "grok-3"),
      schema: tradeSchema,
      output: 'array',
      system:`
      You are a trading expert AI assistant.
      You are given a list of trade data and you need to format it according to the schema.
      Rules for formatting:
      Do not make up any information.
      1. Instrument names:
        - Most common instruments: ES, NQ, NG, ZN, ZB, XAUUSD, EURUSD, GBPUSD, US100, US500, US30, etc.
        - Remove expiration dates (H5, Z4, etc.), ESH does not exist
        - Remove exchange (e.g. MESH5@CME becomes MES, MESH5@CME becomes ES, ZN@CME becomes ZN, etc.)
        - Keep forex pairs as-is (XAUUSD, EURUSD, GBPUSD, etc.)
      2. Convert all numeric values to numbers (remove currency symbols, commas)
      3. Convert dates to ISO strings (handle formats like "2025-06-03T13:33:12.172")
      4. Determine trade side based on:
         - If side is provided: use it directly (normalize 'BUY'/'buy'/'long'/'b' to 'long', 'SELL'/'sell'/'short'/'s' to 'short')
         - If not provided: determine from entry/close dates and prices when available
      5. Convert time in position to seconds (calculate from entry and close timestamps)
      6. Handle missing values appropriately:
        - Omit missing fields until they can be filled
      7. IMPORTANT - Quantity/Volume handling:
        - Preserve negative quantities exactly as they appear
        - Do not round, floor, or add trailing zeros
        - Negative quantities are valid and should be maintained
      8. Extract optional fields if available:
        - stopLoss (string) - the stop loss price
        - takeProfit (string) - the take profit price
        - closeReason (string) - reason for closing (User, Stop Loss, Take Profit, Partial Close, etc.)
        - symbol (string) - the original symbol from CSV
        - entryId (string) - unique identifier for the entry transaction (often labeled as "ID" in CSV)
      9. Ensure all required fields are populated:
        - entryPrice (string)
        - closePrice (string)
        - commission (number) can be 0 if not available
        - quantity (number, preserve negative values exactly)
        - pnl (number)
        - side (string)
        - entryDate (ISO string)
        - closeDate (ISO string)
        - instrument (string)
      10. CRITICAL - DO NOT extract or include accountNumber:
        - Account linking is handled separately by the import system
        - The user selects which account to import trades into
        - Never try to extract account numbers from the CSV
      `,
      prompt:  `
      Format the following ${rows.length} trades data.
      Headers: ${headers.join(", ")}
      Rows:
      ${rows.map((row: string[]) => row.join(", ")).join("\n")}
    `,
    temperature: 0.1,
  });

  return result.toTextStreamResponse();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response(JSON.stringify({ error: error.errors }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ error: "Invalid request format" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
}