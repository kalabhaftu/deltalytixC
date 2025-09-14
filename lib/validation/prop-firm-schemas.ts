/**
 * Validation Schemas for Prop Firm Evaluation System
 * Zod schemas for validating API inputs and business logic
 */

import { z } from 'zod'

// Enum schemas
export const AccountStatusSchema = z.enum(['active', 'failed', 'passed', 'funded'])
export const PhaseTypeSchema = z.enum(['phase_1', 'phase_2', 'funded'])
export const PhaseStatusSchema = z.enum(['active', 'passed', 'failed'])
export const DrawdownTypeSchema = z.enum(['absolute', 'percent'])
export const DrawdownModeSchema = z.enum(['static', 'trailing'])
export const EvaluationTypeSchema = z.enum(['one_step', 'two_step'])
export const BreachTypeSchema = z.enum(['daily_drawdown', 'max_drawdown'])

// Base validation schemas
export const TimezoneSchema = z.string().min(1).max(50).regex(/^[A-Za-z_/]+$/, {
  message: "Invalid timezone format"
})

export const TimeSchema = z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, {
  message: "Time must be in HH:mm format"
})

export const PositiveNumberSchema = z.number().min(0)
export const PositiveIntegerSchema = z.number().int().min(0)
export const PercentageSchema = z.number().min(0).max(100)
export const AccountNumberSchema = z.string().min(1).max(50).regex(/^[A-Za-z0-9-_]+$/, {
  message: "Account number can only contain letters, numbers, hyphens, and underscores"
})

// Account creation and update schemas
export const BaseAccountSchema = z.object({
  number: AccountNumberSchema,
  name: z.string().min(1).max(100).optional(),
  propfirm: z.string().min(1).max(50),
  startingBalance: z.number().min(1000).max(10000000), // Min $1k, max $10M
  
  // Drawdown configuration
  dailyDrawdownAmount: z.number().min(0).optional(),
  dailyDrawdownType: DrawdownTypeSchema.default('percent'),
  maxDrawdownAmount: z.number().min(0).optional(),
  maxDrawdownType: DrawdownTypeSchema.default('percent'),
  drawdownModeMax: DrawdownModeSchema.default('static'),
  
  // Evaluation settings
  evaluationType: EvaluationTypeSchema.default('two_step'),
  timezone: TimezoneSchema.default('UTC'),
  dailyResetTime: TimeSchema.default('00:00'),
  
  // Phase 1 profit target (required for evaluation accounts)
  profitTarget: z.number().min(0).optional(),
})

export const CreateAccountSchema = BaseAccountSchema
.refine((data) => {
  // Validate drawdown amounts based on type
  if (data.dailyDrawdownType === 'percent' && data.dailyDrawdownAmount !== undefined) {
    return data.dailyDrawdownAmount <= 100
  }
  if (data.dailyDrawdownType === 'absolute' && data.dailyDrawdownAmount !== undefined) {
    return data.dailyDrawdownAmount <= data.startingBalance
  }
  return true
}, {
  message: "Daily drawdown amount invalid for selected type",
  path: ["dailyDrawdownAmount"]
})
.refine((data) => {
  // Validate max drawdown amounts based on type
  if (data.maxDrawdownType === 'percent' && data.maxDrawdownAmount !== undefined) {
    return data.maxDrawdownAmount <= 100
  }
  if (data.maxDrawdownType === 'absolute' && data.maxDrawdownAmount !== undefined) {
    return data.maxDrawdownAmount <= data.startingBalance
  }
  return true
}, {
  message: "Max drawdown amount invalid for selected type",
  path: ["maxDrawdownAmount"]
})

export const UpdateAccountSchema = BaseAccountSchema.partial().extend({
  status: AccountStatusSchema.optional(),
  ddIncludeOpenPnl: z.boolean().default(false),
  progressionIncludeOpenPnl: z.boolean().default(false),
  allowManualPhaseOverride: z.boolean().optional(),
  
  // Funded account payout configuration
  profitSplitPercent: PercentageSchema.default(80),
  payoutCycleDays: PositiveIntegerSchema.min(1).max(365).default(14),
  minDaysToFirstPayout: PositiveIntegerSchema.max(365).default(4),
  payoutEligibilityMinProfit: PositiveNumberSchema.optional(),
  resetOnPayout: z.boolean().default(false),
  reduceBalanceByPayout: z.boolean().default(true),
  fundedResetBalance: PositiveNumberSchema.optional(),
})

// Trade schemas
export const BaseTradeSchema = z.object({
  accountId: z.string().uuid(),
  symbol: z.string().min(1).max(20).regex(/^[A-Z0-9./-]+$/, {
    message: "Symbol contains invalid characters"
  }),
  side: z.enum(['long', 'short']),
  quantity: z.number().int().min(1).max(1000000),
  entryPrice: z.number().min(0.0001).max(1000000),
  exitPrice: z.number().min(0.0001).max(1000000).optional(),
  entryTime: z.coerce.date(),
  exitTime: z.coerce.date().optional(),
  fees: PositiveNumberSchema.optional(),
  commission: PositiveNumberSchema.optional(),
  strategy: z.string().min(1).max(50).optional(),
  comment: z.string().max(1000).optional(),
  tags: z.array(z.string().min(1).max(30)).max(10).default([]),
})

export const CreateTradeSchema = BaseTradeSchema
.refine((data) => {
  // If exitTime is provided, it must be after entryTime
  if (data.exitTime && data.entryTime) {
    return data.exitTime >= data.entryTime
  }
  return true
}, {
  message: "Exit time must be after entry time",
  path: ["exitTime"]
})
.refine((data) => {
  // If exitPrice is provided, exitTime should also be provided
  if (data.exitPrice !== undefined && data.exitTime === undefined) {
    return false
  }
  return true
}, {
  message: "Exit time is required when exit price is provided",
  path: ["exitTime"]
})

export const UpdateTradeSchema = BaseTradeSchema.partial().extend({
  phaseId: z.string().uuid().optional(),
  realizedPnl: z.number().optional(),
  equityAtOpen: PositiveNumberSchema.optional(),
  equityAtClose: PositiveNumberSchema.optional(),
  rawBrokerId: z.string().max(100).optional(),
})

// Phase management schemas
export const CreatePhaseSchema = z.object({
  accountId: z.string().uuid(),
  phaseType: PhaseTypeSchema,
  profitTarget: PositiveNumberSchema.optional(),
  phaseStartAt: z.coerce.date().default(() => new Date()),
})

export const UpdatePhaseSchema = z.object({
  phaseStatus: PhaseStatusSchema.optional(),
  profitTarget: PositiveNumberSchema.optional(),
  phaseEndAt: z.coerce.date().optional(),
  
  // Stats updates
  currentEquity: PositiveNumberSchema.optional(),
  currentBalance: PositiveNumberSchema.optional(),
  netProfitSincePhaseStart: z.number().optional(),
  highestEquitySincePhaseStart: PositiveNumberSchema.optional(),
  totalTrades: PositiveIntegerSchema.optional(),
  winningTrades: PositiveIntegerSchema.optional(),
  totalCommission: PositiveNumberSchema.optional(),
})

// Payout schemas
export const RequestPayoutSchema = z.object({
  accountId: z.string().uuid(),
  amountRequested: z.number().min(50).max(100000), // Min $50, max $100k
  notes: z.string().max(500).optional(),
})

export const UpdatePayoutSchema = z.object({
  amountPaid: PositiveNumberSchema.optional(),
  paidAt: z.coerce.date().optional(),
  notes: z.string().max(500).optional(),
  status: z.enum(['PENDING', 'APPROVED', 'PAID', 'REJECTED']).optional(),
})

// Breach tracking schemas
export const CreateBreachSchema = z.object({
  accountId: z.string().uuid(),
  phaseId: z.string().uuid().optional(),
  breachType: BreachTypeSchema,
  breachAmount: z.number(),
  breachThreshold: z.number(),
  equity: z.number(),
  description: z.string().max(500).optional(),
})

// Daily anchor schemas
export const CreateDailyAnchorSchema = z.object({
  accountId: z.string().uuid(),
  date: z.coerce.date(),
  anchorEquity: z.number(),
})

// Equity snapshot schemas
export const CreateEquitySnapshotSchema = z.object({
  accountId: z.string().uuid(),
  phaseId: z.string().uuid().optional(),
  timestamp: z.coerce.date().default(() => new Date()),
  equity: z.number(),
  balance: z.number(),
  openPnl: z.number().default(0),
})

// Account transition schemas
export const CreateTransitionSchema = z.object({
  accountId: z.string().uuid(),
  fromPhaseId: z.string().uuid().optional(),
  toPhaseId: z.string().uuid().optional(),
  fromStatus: AccountStatusSchema.optional(),
  toStatus: AccountStatusSchema.optional(),
  reason: z.string().max(500).optional(),
  triggeredBy: z.string().uuid().optional(),
  metadata: z.record(z.any()).default({}),
})

// Reset account schema
export const ResetAccountSchema = z.object({
  accountId: z.string().uuid(),
  reason: z.string().min(1).max(500),
  clearTrades: z.boolean().default(false),
})

// Filter schemas
export const AccountFilterSchema = z.object({
  status: z.array(AccountStatusSchema).optional(),
  phaseType: z.array(PhaseTypeSchema).optional(),
  propfirm: z.array(z.string().min(1).max(50)).max(10).optional(),
  evaluationType: z.array(EvaluationTypeSchema).optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
})

export const TradeFilterSchema = z.object({
  accountId: z.string().uuid().optional(),
  phaseId: z.string().uuid().optional(),
  symbol: z.array(z.string().min(1).max(20)).max(20).optional(),
  strategy: z.array(z.string().min(1).max(50)).max(10).optional(),
  side: z.array(z.enum(['long', 'short'])).optional(),
  dateRange: z.object({
    start: z.coerce.date(),
    end: z.coerce.date(),
  }).refine(data => data.start <= data.end, {
    message: "Start date must be before end date",
  }).optional(),
  pnlRange: z.object({
    min: z.number().optional(),
    max: z.number().optional(),
  }).refine(data => {
    if (data.min !== undefined && data.max !== undefined) {
      return data.min <= data.max
    }
    return true
  }, {
    message: "Min PnL must be less than or equal to max PnL",
  }).optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(50),
})

// Background job schemas
export const DailyAnchorJobSchema = z.object({
  accountId: z.string().uuid(),
  targetDate: z.coerce.date(),
  timezone: TimezoneSchema,
  resetTime: TimeSchema,
})

export const BreachCheckJobSchema = z.object({
  accountId: z.string().uuid(),
  phaseId: z.string().uuid(),
  currentEquity: z.number(),
  includeOpenPnl: z.boolean().default(false),
})

export const PayoutEligibilityJobSchema = z.object({
  accountId: z.string().uuid(),
  checkDate: z.coerce.date(),
})

// Payout filter schema
export const PayoutFilterSchema = z.object({
  accountId: z.string().uuid().optional(),
  status: z.array(z.enum(['PENDING', 'APPROVED', 'PAID', 'REJECTED'])).optional(),
  dateRange: z.object({
    start: z.coerce.date(),
    end: z.coerce.date(),
  }).refine(data => data.start <= data.end, {
    message: "Start date must be before end date",
  }).optional(),
  amountRange: z.object({
    min: z.number().optional(),
    max: z.number().optional(),
  }).refine(data => {
    if (data.min !== undefined && data.max !== undefined) {
      return data.min <= data.max
    }
    return true
  }, {
    message: "Min amount must be less than or equal to max amount",
  }).optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
})

// Bulk operations schemas
export const BulkImportTradesSchema = z.object({
  accountId: z.string().uuid(),
  trades: z.array(CreateTradeSchema).min(1).max(1000),
  attributeToCurrentPhase: z.boolean().default(true),
})

export const BulkUpdateAccountsSchema = z.object({
  accountIds: z.array(z.string().uuid()).min(1).max(100),
  updates: UpdateAccountSchema,
})

// Export all schemas for easy access
export const PropFirmSchemas = {
  // Account schemas
  CreateAccount: CreateAccountSchema,
  UpdateAccount: UpdateAccountSchema,
  AccountFilter: AccountFilterSchema,
  
  // Trade schemas
  CreateTrade: CreateTradeSchema,
  UpdateTrade: UpdateTradeSchema,
  TradeFilter: TradeFilterSchema,
  BulkImportTrades: BulkImportTradesSchema,
  
  // Phase schemas
  CreatePhase: CreatePhaseSchema,
  UpdatePhase: UpdatePhaseSchema,
  
  // Payout schemas
  RequestPayout: RequestPayoutSchema,
  UpdatePayout: UpdatePayoutSchema,
  PayoutFilter: PayoutFilterSchema,
  
  // Breach and tracking schemas
  CreateBreach: CreateBreachSchema,
  CreateDailyAnchor: CreateDailyAnchorSchema,
  CreateEquitySnapshot: CreateEquitySnapshotSchema,
  CreateTransition: CreateTransitionSchema,
  
  // Action schemas
  ResetAccount: ResetAccountSchema,
  BulkUpdateAccounts: BulkUpdateAccountsSchema,
  
  // Job schemas
  DailyAnchorJob: DailyAnchorJobSchema,
  BreachCheckJob: BreachCheckJobSchema,
  PayoutEligibilityJob: PayoutEligibilityJobSchema,
}

// Type inference helpers
export type CreateAccountInput = z.infer<typeof CreateAccountSchema>
export type UpdateAccountInput = z.infer<typeof UpdateAccountSchema>
export type CreateTradeInput = z.infer<typeof CreateTradeSchema>
export type UpdateTradeInput = z.infer<typeof UpdateTradeSchema>
export type RequestPayoutInput = z.infer<typeof RequestPayoutSchema>
export type ResetAccountInput = z.infer<typeof ResetAccountSchema>
export type AccountFilterInput = z.infer<typeof AccountFilterSchema>
export type TradeFilterInput = z.infer<typeof TradeFilterSchema>
