import { z } from 'zod';

export const mappingSchema = z.object({
  instrument: z
    .string()
    .describe("The PRIMARY trading instrument/pair (e.g., EURUSD, XAUUSD, AAPL) - this is the main field used throughout the app"),
  entryId: z
    .string()
    .optional()
    .describe("The unique identifier for the trade transaction (often labeled as 'ID' in CSV)"),
  quantity: z
    .string()
    .describe("The number of units traded"),
  entryPrice: z
    .string()
    .describe("The price at which the instrument was bought"),
  closePrice: z
    .string()
    .describe("The price at which the instrument was sold"),
  entryDate: z
    .string()
    .describe("The date when the entry / buy (if no side is provided) transaction occurred"),
  closeDate: z
    .string()
    .describe("The date when the close / sell (if no side is provided) transaction occurred"),
  pnl: z
    .string()
    .describe("The profit or loss from the trade brut or gross pnl when there is commission"),
  timeInPosition: z
    .string()
    .optional()
    .describe("The duration for which the position was held"),
  side: z
    .string()
    .optional()
    .describe("The entry side of the trade (e.g., BUY, SELL, buy, sell)"),
  commission: z
    .string()
    .optional()
    .describe("The commission charged for the trade"),
  stopLoss: z
    .string()
    .optional()
    .describe("The stop loss price set for the trade"),
  takeProfit: z
    .string()
    .optional()
    .describe("The take profit price set for the trade"),
  closeReason: z
    .string()
    .optional()
    .describe("The reason for closing the trade (e.g., User, Stop Loss, Take Profit)"),
  symbol: z
    .string()
    .optional()
    .describe("The original symbol from the CSV (for reference only) - usually not needed if instrument is mapped"),
}); 