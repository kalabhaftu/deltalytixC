import { z } from "zod";

export const tradeSchema = z.object({
  quantity: z.number().describe("The number of units traded - preserve negative values exactly"),
  pnl: z.number().describe("The profit or loss from the trade"),
  commission: z.number().describe("The commission charged for the trade or 0 if not available"),
  timeInPosition: z.number().describe("The duration for which the position was held in seconds"),
  side: z.enum(["long", "short"]).describe("The direction of the trade"),
  entryDate: z.string().describe("The ISO string date when the entry transaction occurred"),
  closeDate: z.string().describe("The ISO string date when the close transaction occurred"),
  instrument: z.string().describe("The trading instrument (e.g. MES, ES, NG, ZN, ZB, XAUUSD, EURUSD, US100, etc.)"),
  entryPrice: z.string().describe("The price at which the instrument was bought"),
  closePrice: z.string().describe("The price at which the instrument was sold"),
  entryId: z.string().optional().describe("The unique identifier for the entry transaction"),
  stopLoss: z.string().optional().describe("The stop loss price set for the trade"),
  takeProfit: z.string().optional().describe("The take profit price set for the trade"),
  closeReason: z.string().optional().describe("The reason for closing the trade (e.g., User, Stop Loss, Take Profit, Partial Close)"),
  symbol: z.string().optional().describe("The original symbol from the CSV file"),
});
