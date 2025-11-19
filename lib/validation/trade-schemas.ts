import { z } from 'zod'

/**
 * Schema for creating/updating a trade
 */
export const tradeInputSchema = z.object({
  instrument: z.string().min(1, 'Instrument is required'),
  entryPrice: z.union([z.number().positive(), z.string()]),
  closePrice: z.union([z.number().positive(), z.string()]),
  quantity: z.number(),
  pnl: z.number(),
  commission: z.number().default(0),
  entryDate: z.string().datetime().or(z.string()),
  closeDate: z.string().datetime().or(z.string()),
  side: z.enum(['long', 'short', 'Long', 'Short']).optional(),
  stopLoss: z.union([z.number(), z.string()]).optional().nullable(),
  takeProfit: z.union([z.number(), z.string()]).optional().nullable(),
  comment: z.string().max(5000).optional().nullable(),
  accountId: z.string().uuid().optional().nullable(),
  phaseAccountId: z.string().uuid().optional().nullable(),
  tradingModel: z.enum(['ICT_2022', 'MSNR', 'TTFM', 'PRICE_ACTION']).optional().nullable(),
  tags: z.string().optional().nullable(),
})

/**
 * Schema for trade query parameters
 */
export const tradeQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(1000).default(50),
  accountId: z.string().uuid().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  instrument: z.string().optional(),
})

/**
 * Schema for deleting a trade
 */
export const tradeDeleteSchema = z.object({
  tradeId: z.string().uuid('Invalid trade ID'),
})

export type TradeInput = z.infer<typeof tradeInputSchema>
export type TradeQuery = z.infer<typeof tradeQuerySchema>
export type TradeDelete = z.infer<typeof tradeDeleteSchema>

