import { z } from 'zod'

/**
 * Schema for creating/updating an account
 */
export const accountInputSchema = z.object({
  number: z.string().min(1, 'Account number is required'),
  name: z.string().max(100).optional().nullable(),
  broker: z.string().max(100).optional().nullable(),
  startingBalance: z.number().nonnegative().default(0),
  groupId: z.string().uuid().optional().nullable(),
})

/**
 * Schema for prop firm phase account
 */
export const phaseAccountInputSchema = z.object({
  masterAccountId: z.string().uuid(),
  phaseNumber: z.number().int().positive(),
  profitTargetPercent: z.number().positive().max(100),
  dailyDrawdownPercent: z.number().positive().max(100),
  maxDrawdownPercent: z.number().positive().max(100),
  maxDrawdownType: z.enum(['static', 'trailing']).default('static'),
  minTradingDays: z.number().int().nonnegative().default(0),
  timeLimitDays: z.number().int().positive().optional().nullable(),
  consistencyRulePercent: z.number().nonnegative().max(100).default(0),
  profitSplitPercent: z.number().positive().max(100).optional().nullable(),
  payoutCycleDays: z.number().int().positive().optional().nullable(),
})

/**
 * Schema for master account (prop firm evaluation)
 */
export const masterAccountInputSchema = z.object({
  accountName: z.string().min(1, 'Account name is required').max(100),
  propFirmName: z.string().min(1, 'Prop firm name is required').max(100),
  accountSize: z.number().positive(),
  evaluationType: z.string().min(1, 'Evaluation type is required'),
  currentPhase: z.number().int().positive().default(1),
  isActive: z.boolean().default(true),
  isArchived: z.boolean().default(false),
})

export type AccountInput = z.infer<typeof accountInputSchema>
export type PhaseAccountInput = z.infer<typeof phaseAccountInputSchema>
export type MasterAccountInput = z.infer<typeof masterAccountInputSchema>

