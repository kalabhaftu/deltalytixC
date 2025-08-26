/**
 * Prop Firm Evaluation System Types
 * Types for account phases, drawdown tracking, and evaluation logic
 */

import type { DatabaseRecord } from './api'

// Enums from Prisma schema
export type AccountStatus = 'active' | 'failed' | 'passed' | 'funded'
export type PhaseType = 'phase_1' | 'phase_2' | 'funded'
export type PhaseStatus = 'active' | 'passed' | 'failed'
export type DrawdownType = 'absolute' | 'percent'
export type DrawdownMode = 'static' | 'trailing'
export type EvaluationType = 'one_step' | 'two_step'
export type BreachType = 'daily_drawdown' | 'max_drawdown'

/**
 * Extended Account Types for Prop Firm Evaluation
 */
export interface PropFirmAccount extends DatabaseRecord {
  // Basic account info
  number: string
  name?: string
  propfirm: string
  startingBalance: number
  status: AccountStatus
  userId: string
  
  // Drawdown configuration
  dailyDrawdownAmount?: number
  dailyDrawdownType: DrawdownType
  maxDrawdownAmount?: number
  maxDrawdownType: DrawdownType
  drawdownModeMax: DrawdownMode
  
  // Evaluation settings
  evaluationType: EvaluationType
  timezone: string
  dailyResetTime: string
  
  // Config flags for business rules
  ddIncludeOpenPnl: boolean
  progressionIncludeOpenPnl: boolean
  allowManualPhaseOverride: boolean
  
  // Funded account payout configuration
  profitSplitPercent?: number
  payoutCycleDays?: number
  minDaysToFirstPayout?: number
  payoutEligibilityMinProfit?: number
  resetOnPayout: boolean
  reduceBalanceByPayout: boolean
  fundedResetBalance?: number

  // Relations
  phases?: AccountPhase[]
  currentPhase?: AccountPhase
  breaches?: Breach[]
  dailyAnchors?: DailyAnchor[]
  recentEquitySnapshots?: EquitySnapshot[]
}

/**
 * Account Phase Management
 */
export interface AccountPhase extends DatabaseRecord {
  accountId: string
  phaseType: PhaseType
  phaseStatus: PhaseStatus
  profitTarget?: number
  phaseStartAt: Date
  phaseEndAt?: Date
  
  // Running stats snapshot for fast rendering
  currentEquity: number
  currentBalance: number
  netProfitSincePhaseStart: number
  highestEquitySincePhaseStart: number
  totalTrades: number
  winningTrades: number
  totalCommission: number
  
  // Relations
  account?: PropFirmAccount
  trades?: PropFirmTrade[]
  breaches?: Breach[]
  equitySnapshots?: EquitySnapshot[]
}

/**
 * Enhanced Trade with Phase Attribution
 */
export interface PropFirmTrade extends DatabaseRecord {
  // Legacy fields for compatibility
  accountNumber: string
  quantity: number
  instrument: string
  entryPrice: string
  closePrice: string
  entryDate: string
  closeDate: string
  pnl: number
  commission: number
  side?: string
  comment?: string
  tags: string[]
  userId: string
  
  // New prop firm fields
  phaseId?: string
  accountId?: string
  symbol?: string
  strategy?: string
  fees: number
  realizedPnl?: number
  entryTime?: Date
  exitTime?: Date
  equityAtOpen?: number
  equityAtClose?: number
  rawBrokerId?: string
  
  // Relations
  phase?: AccountPhase
  account?: PropFirmAccount
}

/**
 * Enhanced Payout Management
 */
export interface PropFirmPayout extends DatabaseRecord {
  accountId: string
  accountNumber: string
  
  // Legacy fields (migrated)
  amount: number // Will be mapped to amountRequested
  date: Date     // Will be mapped to requestedAt
  
  // New payout fields
  amountRequested?: number
  amountPaid?: number
  requestedAt?: Date
  paidAt?: Date
  notes?: string
  status: string
  
  // Relations
  account?: PropFirmAccount
}

/**
 * Drawdown Breach Tracking
 */
export interface Breach extends DatabaseRecord {
  accountId: string
  phaseId?: string
  breachType: BreachType
  breachAmount: number
  breachThreshold: number
  equity: number
  breachTime: Date
  description?: string
  
  // Relations
  account?: PropFirmAccount
  phase?: AccountPhase
}

/**
 * Daily Equity Anchors for Drawdown Calculation
 */
export interface DailyAnchor extends DatabaseRecord {
  accountId: string
  date: Date
  anchorEquity: number
  computedAt: Date
  
  // Relations
  account?: PropFirmAccount
}

/**
 * Equity Snapshots for Charts and Tracking
 */
export interface EquitySnapshot extends DatabaseRecord {
  accountId: string
  phaseId?: string
  timestamp: Date
  equity: number
  balance: number
  openPnl: number
  
  // Relations
  account?: PropFirmAccount
  phase?: AccountPhase
}

/**
 * Account Phase Transitions Audit Trail
 */
export interface AccountTransition extends DatabaseRecord {
  accountId: string
  fromPhaseId?: string
  toPhaseId?: string
  fromStatus?: AccountStatus
  toStatus?: AccountStatus
  reason?: string
  triggeredBy?: string
  transitionTime: Date
  metadata: Record<string, any>
  
  // Relations
  account?: PropFirmAccount
  fromPhase?: AccountPhase
  toPhase?: AccountPhase
}

/**
 * Business Logic Types
 */
export interface DrawdownCalculation {
  dailyDrawdownRemaining: number
  maxDrawdownRemaining: number
  currentEquity: number
  dailyStartBalance: number
  highestEquity: number
  isBreached: boolean
  breachType?: BreachType
  breachAmount?: number
}

export interface PhaseProgress {
  currentPhase: AccountPhase
  profitProgress: number
  profitTarget?: number
  daysInPhase: number
  canProgress: boolean
  nextPhaseType?: PhaseType
}

export interface PayoutEligibility {
  isEligible: boolean
  daysSinceFunded: number
  daysSinceLastPayout: number
  netProfitSinceLastPayout: number
  minDaysRequired: number
  minProfitRequired?: number
  blockers: string[]
  maxPayoutAmount?: number
  profitSplitAmount?: number
  nextEligibleDate?: Date
}

/**
 * Dashboard Display Types
 */
export interface AccountDashboardData {
  account: PropFirmAccount
  currentPhase: AccountPhase
  drawdown: DrawdownCalculation
  progress: PhaseProgress
  payoutEligibility?: PayoutEligibility
  recentTrades: PropFirmTrade[]
  equityChart: EquitySnapshot[]
  breaches: Breach[]
}

export interface AccountSummary {
  id: string
  number: string
  name?: string
  status: AccountStatus
  currentPhase: PhaseType
  balance: number
  equity: number
  dailyDrawdownRemaining: number
  maxDrawdownRemaining: number
  profitTargetProgress: number
  nextPayoutDate?: Date
  actions: string[] // Available actions: 'view', 'addTrade', 'requestPayout', 'reset'
}

/**
 * API Request/Response Types
 */
export interface CreateAccountRequest {
  number: string
  name?: string
  propfirm: string
  startingBalance: number
  dailyDrawdownAmount?: number
  dailyDrawdownType: DrawdownType
  maxDrawdownAmount?: number
  maxDrawdownType: DrawdownType
  drawdownModeMax: DrawdownMode
  evaluationType: EvaluationType
  timezone: string
  dailyResetTime: string
  profitTarget?: number
}

export interface UpdateAccountRequest extends Partial<CreateAccountRequest> {
  status?: AccountStatus
  ddIncludeOpenPnl?: boolean
  progressionIncludeOpenPnl?: boolean
  allowManualPhaseOverride?: boolean
}

export interface CreateTradeRequest {
  accountId: string
  symbol: string
  side: 'long' | 'short'
  quantity: number
  entryPrice: number
  exitPrice?: number
  entryTime: Date
  exitTime?: Date
  fees?: number
  commission?: number
  strategy?: string
  comment?: string
  tags?: string[]
}

export interface RequestPayoutRequest {
  accountId: string
  amountRequested: number
  notes?: string
}

export interface ResetAccountRequest {
  accountId: string
  reason: string
  clearTrades?: boolean
}

export interface AccountStatsResponse {
  account: PropFirmAccount
  phases: AccountPhase[]
  totalTrades: number
  totalPnl: number
  winRate: number
  avgWin: number
  avgLoss: number
  maxDrawdownHit: number
  daysSinceStart: number
  currentStreak: number
}

/**
 * Filter Types for Queries
 */
export interface AccountFilter {
  status?: AccountStatus[]
  phaseType?: PhaseType[]
  propfirm?: string[]
  evaluationType?: EvaluationType[]
}

export interface TradeFilter {
  accountId?: string
  phaseId?: string
  symbol?: string[]
  strategy?: string[]
  side?: string[]
  dateRange?: {
    start: Date
    end: Date
  }
  pnlRange?: {
    min?: number
    max?: number
  }
}

/**
 * Background Job Types
 */
export interface DailyAnchorJob {
  accountId: string
  targetDate: Date
  timezone: string
  resetTime: string
}

export interface BreachCheckJob {
  accountId: string
  phaseId: string
  currentEquity: number
  includeOpenPnl: boolean
}

export interface PayoutEligibilityJob {
  accountId: string
  checkDate: Date
}


