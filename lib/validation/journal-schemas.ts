import { z } from 'zod'

/**
 * Schema for daily journal entries
 */
export const dailyNoteInputSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  note: z.string().min(1, 'Note cannot be empty').max(10000, 'Note is too long'),
  emotion: z.string().max(50).optional().nullable(),
  accountId: z.string().uuid().optional().nullable(),
})

/**
 * Schema for querying daily notes
 */
export const dailyNoteQuerySchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  accountId: z.string().uuid().optional(),
})

export type DailyNoteInput = z.infer<typeof dailyNoteInputSchema>
export type DailyNoteQuery = z.infer<typeof dailyNoteQuerySchema>

