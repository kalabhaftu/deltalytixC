/**
 * Comprehensive Prop Firm Types for Rebuilt System
 * Based on research of industry standards and best practices
 */

// Base database record type
export interface DatabaseRecord {
  id: string
  createdAt: Date
  updatedAt?: Date
}

// Prop firm types enum
export type PropFirmType = 
  | 'FTMO' 
  | 'MyForexFunds' 
  | 'FundedNext' 
  | 'TheForexFirm' 
  | 'TopTierTrader' 
  | 'SurgeTrader' 
  | 'TrueForexFunds' 
  | 'FundingTraders' 
  | 'E8Funding' 
  | 'FastTrackTrading'
  | 'Other'

// Account status types
export type AccountStatus = 'active' | 'failed' | 'passed' | 'funded'

// Phase types
export type PhaseType = 'phase_1' | 'phase_2' | 'funded'

// Phase status types  
export type PhaseStatus = 'active' | 'passed' | 'failed' | 'pending'

// Drawdown types
export type DrawdownType = 'absolute' | 'percent'

// Breach types
export type BreachType = 'daily_drawdown' | 'max_drawdown'

/**
 * Main Prop Firm Account Interface
 * Contains all account-level configuration and metadata
 */
export interface PropFirmAccount extends DatabaseRecord {
  // Basic identification
  userId: string
  name?: string
  firmType: PropFirmType
  accountSize: number
  currency: string
  leverage: number
  isDemo: boolean
  
  // Multiple account IDs for different phases
  phase1AccountId?: string
  phase2AccountId?: string
  fundedAccountId?: string
  
  // Login credentials for each phase
  phase1Login?: string
  phase2Login?: string
  fundedLogin?: string
  phase1Password?: string
  phase2Password?: string
  fundedPassword?: string
  
  // Server information for each phase
  phase1Server?: string
  phase2Server?: string
  fundedServer?: string
  tradingPlatform?: string
  serverInfo?: string
  
  // Important dates
  purchaseDate?: Date
  challengeStartDate?: Date
  challengeEndDate?: Date
  fundedDate?: Date
  
  // Phase 1 Configuration
  phase1ProfitTarget: number // percentage (e.g., 10 for 10%)
  phase1MaxDrawdown: number  // percentage (e.g., 10 for 10%)
  phase1DailyDrawdown: number // percentage (e.g., 5 for 5%)
  minTradingDaysPhase1: number
  maxTradingDaysPhase1?: number
  
  // Phase 2 Configuration
  phase2ProfitTarget: number // percentage (e.g., 5 for 5%)
  phase2MaxDrawdown: number  // percentage (e.g., 10 for 10%)
  phase2DailyDrawdown: number // percentage (e.g., 5 for 5%)
  minTradingDaysPhase2: number
  maxTradingDaysPhase2?: number
  
  // Funded Phase Configuration
  fundedMaxDrawdown: number    // percentage (e.g., 5 for 5%)
  fundedDailyDrawdown: number  // percentage (e.g., 3 for 3%)
  trailingDrawdownEnabled: boolean
  
  // Payout Configuration
  initialProfitSplit: number           // percentage (e.g., 80 for 80%)
  maxProfitSplit: number              // percentage (e.g., 90 for 90%)
  profitSplitIncrementPerPayout: number // percentage (e.g., 5 for 5%)
  minPayoutAmount: number             // dollar amount
  maxPayoutAmount?: number            // dollar amount
  payoutFrequencyDays: number         // days between payouts
  minDaysBeforeFirstPayout: number    // minimum days before first payout
  resetOnPayout: boolean
  scaleOnPayout: boolean
  
  // Trading Rules
  newsTradinAllowed: boolean
  weekendHoldingAllowed: boolean
  hedgingAllowed: boolean
  eaAllowed: boolean
  martingaleAllowed: boolean
  maxLotSize?: number
  maxDailyLossStreak?: number
  maxPositions: number
  consistencyRule: number // percentage (e.g., 30 for 30%)
  maxSimultaneousAccounts: number
  
  // Sync and tracking
  lastSyncAt?: Date
  syncEnabled: boolean
  notes?: string
  
  // Current state
  status: AccountStatus
  
  // Relations
  phases?: PropFirmPhase[]
  currentPhase?: PropFirmPhase
  payouts?: PayoutRequest[]
  breaches?: DrawdownBreach[]
  dailySnapshots?: DailyEquitySnapshot[]
}

/**
 * Phase Management Interface
 * Each account can have multiple phases (Phase 1, Phase 2, Funded)
 */
export interface PropFirmPhase extends DatabaseRecord {
  // Relationships
  accountId: string
  account?: PropFirmAccount
  
  // Phase identification
  phaseType: PhaseType
  status: PhaseStatus
  
  // Broker account details for this specific phase
  brokerAccountId: string  // The actual MT4/MT5 account number
  brokerLogin?: string
  brokerPassword?: string
  brokerServer?: string
  
  // Financial state
  startingBalance: number
  currentBalance: number
  currentEquity: number
  highWaterMark: number  // Highest equity reached in this phase
  
  // Phase targets and limits (absolute amounts)
  profitTarget: number        // absolute dollar amount
  profitTargetPercent: number // percentage for reference
  maxDrawdownAmount: number   // absolute dollar amount
  maxDrawdownPercent: number  // percentage for reference
  dailyDrawdownAmount: number // absolute dollar amount
  dailyDrawdownPercent: number // percentage for reference
  
  // Time tracking
  startedAt?: Date
  completedAt?: Date
  failedAt?: Date
  daysTraded: number
  minTradingDays: number
  maxTradingDays?: number
  
  // Trading statistics
  totalTrades: number
  winningTrades: number
  losingTrades: number
  totalVolume: number
  totalCommission: number
  totalSwap: number
  bestTrade: number
  worstTrade: number
  currentStreak: number
  bestStreak: number
  worstStreak: number
  
  // Risk metrics
  maxDrawdownEncountered: number
  maxDailyLoss: number
  avgTradeSize: number
  profitFactor: number
  winRate: number
  riskRewardRatio: number
  
  // Relations
  trades?: PropFirmTrade[]
  dailySnapshots?: DailyEquitySnapshot[]
  breaches?: DrawdownBreach[]
  payouts?: PayoutRequest[]
}

/**
 * Enhanced Trade Interface for Prop Firms
 */
export interface PropFirmTrade extends DatabaseRecord {
  // Relationships
  phaseId: string
  accountId: string
  userId: string
  phase?: PropFirmPhase
  account?: PropFirmAccount
  
  // Trade identification
  symbol: string
  instrument?: string // for backwards compatibility
  side: 'long' | 'short'
  
  // Trade details
  quantity: number
  entryPrice: number
  exitPrice?: number
  entryTime: Date
  exitTime?: Date
  
  // Financial details
  commission: number
  swap: number
  fees: number
  realizedPnl?: number
  unrealizedPnl?: number
  
  // Account state at trade
  equityAtOpen: number
  equityAtClose?: number
  balanceAtOpen?: number
  balanceAtClose?: number
  
  // Additional metadata
  comment?: string
  strategy?: string
  tags: string[]
  closeReason?: string
  rawBrokerId?: string // Original broker trade ID
  
  // Legacy fields for compatibility
  accountNumber?: string
  entryId?: string
  closeId?: string
  entryDate?: string
  closeDate?: string
  timeInPosition?: number
  pnl?: number
  videoUrl?: string
  imageBase64?: string
  imageBase64Second?: string
  imageBase64Third?: string
  imageBase64Fourth?: string
}

/**
 * Daily Equity Snapshot for Detailed Tracking
 */
export interface DailyEquitySnapshot extends DatabaseRecord {
  // Relationships
  phaseId: string
  accountId: string
  phase?: PropFirmPhase
  account?: PropFirmAccount
  
  // Date and balances
  date: Date
  openingBalance: number
  closingBalance: number
  highWaterMark: number
  
  // Daily metrics
  dailyPnL: number
  floatingPnL: number
  commission: number
  swap: number
  volume: number
  trades: number
  
  // Drawdown tracking
  maxDrawdownFromHWM: number   // Maximum drawdown from high water mark
  dailyDrawdownUsed: number    // How much daily drawdown was used
  maxDrawdownUsed: number      // How much max drawdown was used
  
  // Breach information
  isBreached: boolean
  breachType?: string
  breachAmount?: number
}

/**
 * Drawdown Breach Tracking
 */
export interface DrawdownBreach extends DatabaseRecord {
  // Relationships
  phaseId: string
  accountId: string
  phase?: PropFirmPhase
  account?: PropFirmAccount
  
  // Breach details
  breachType: BreachType
  breachAmount: number
  limitAmount: number
  equityAtBreach: number
  balanceAtBreach: number
  tradeIdTrigger?: string
  
  // Timing
  breachedAt: Date
  resolvedAt?: Date
  isActive: boolean
  
  // Additional info
  notes?: string
}

/**
 * Payout Request Management
 */
export interface PayoutRequest extends DatabaseRecord {
  // Relationships
  phaseId: string
  accountId: string
  userId: string
  phase?: PropFirmPhase
  account?: PropFirmAccount
  
  // Payout amounts
  requestedAmount: number
  eligibleAmount: number
  profitSplitPercent: number
  traderShare: number
  firmShare: number
  
  // Status tracking
  status: 'pending' | 'approved' | 'paid' | 'rejected' | 'cancelled'
  requestedAt: Date
  processedAt?: Date
  paidAt?: Date
  rejectedAt?: Date
  rejectionReason?: string
  
  // Payment details
  paymentMethod?: string
  paymentDetails?: any // JSON object with payment-specific details
  notes?: string
}

/**
 * Drawdown Calculation Result
 */
export interface DrawdownCalculation {
  // Current state
  currentEquity: number
  dailyStartBalance: number
  highWaterMark: number
  
  // Daily drawdown
  dailyDrawdownUsed: number
  dailyDrawdownLimit: number
  dailyDrawdownRemaining: number
  dailyDrawdownPercent: number
  
  // Max drawdown
  maxDrawdownUsed: number
  maxDrawdownLimit: number
  maxDrawdownRemaining: number
  maxDrawdownPercent: number
  
  // Breach status
  isBreached: boolean
  breachType?: BreachType
  breachAmount?: number
  breachTime?: Date
}

/**
 * Phase Progress Tracking
 */
export interface PhaseProgress {
  // Current phase info
  currentPhase: PropFirmPhase
  
  // Profit progress
  profitProgress: number
  profitProgressPercent: number
  
  // Time progress
  daysRemaining?: number
  tradingDaysComplete: number
  minTradingDaysMet: boolean
  
  // Rule compliance
  consistencyMet: boolean
  readyToAdvance: boolean
  failureReasons: string[]
}

/**
 * Payout Eligibility Calculation
 */
export interface PayoutEligibility {
  // Eligibility
  isEligible: boolean
  eligibleAmount: number
  
  // Profit split
  profitSplitPercent: number
  traderShare: number
  firmShare: number
  
  // Timing
  nextPayoutDate?: Date
  daysUntilNextPayout?: number
  
  // Reasons for eligibility/ineligibility
  reasons: string[]
}

/**
 * Account Status Update Information
 */
export interface AccountStatusUpdate {
  oldStatus: AccountStatus
  newStatus: AccountStatus
  reason: string
  triggeredBy?: string
  metadata?: any
}

/**
 * Phase Transition Information
 */
export interface PhaseTransition {
  fromPhase?: PropFirmPhase
  toPhase?: PropFirmPhase
  transitionType: 'advance' | 'fail' | 'reset'
  reason: string
  triggeredAt: Date
  metadata?: any
}

/**
 * Risk Metrics Interface
 */
export interface RiskMetrics {
  totalTrades: number
  winRate: number
  avgWin: number
  avgLoss: number
  profitFactor: number
  currentStreak: number
  bestStreak: number
  worstStreak: number
  riskRewardRatio: number
  maxDrawdownEncountered: number
  avgTradeSize: number
  largestWin: number
  largestLoss: number
  consecutiveWins: number
  consecutiveLosses: number
}

/**
 * Trading Statistics Summary
 */
export interface TradingStatistics {
  // Basic stats
  totalTrades: number
  winningTrades: number
  losingTrades: number
  breakEvenTrades: number
  
  // Performance metrics
  totalPnL: number
  totalCommission: number
  totalSwap: number
  netPnL: number
  
  // Risk metrics
  winRate: number
  profitFactor: number
  avgWin: number
  avgLoss: number
  riskRewardRatio: number
  
  // Volume and sizing
  totalVolume: number
  avgTradeSize: number
  largestPosition: number
  
  // Time-based metrics
  avgTimeInTrade: number
  tradingDays: number
  tradesPerDay: number
  
  // Streaks
  currentStreak: number
  longestWinStreak: number
  longestLossStreak: number
  
  // Drawdown metrics
  maxDrawdown: number
  currentDrawdown: number
  recoveryFactor: number
}

/**
 * Account Filter Interface for UI
 */
export interface AccountFilter {
  status?: AccountStatus[]
  phaseType?: PhaseType[]
  firmType?: PropFirmType[]
  accountSize?: {
    min?: number
    max?: number
  }
  createdDate?: {
    from?: Date
    to?: Date
  }
  includeFailed?: boolean
  includeDemo?: boolean
  search?: string
}

/**
 * Pagination Interface
 */
export interface PaginationParams {
  page: number
  limit: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

/**
 * API Response Interfaces
 */
export interface PropFirmAccountResponse {
  account: PropFirmAccount
  currentPhase?: PropFirmPhase
  drawdown?: DrawdownCalculation
  progress?: PhaseProgress
  payoutEligibility?: PayoutEligibility
  statistics?: TradingStatistics
  riskMetrics?: RiskMetrics
}

export interface PropFirmAccountListResponse {
  accounts: PropFirmAccount[]
  total: number
  page: number
  limit: number
  totalPages: number
}

/**
 * Validation Schemas Types
 */
export interface CreateAccountRequest {
  firmType: PropFirmType
  accountSize: number
  phase1AccountId?: string
  phase2AccountId?: string
  fundedAccountId?: string
  // ... other required fields
}

export interface UpdateAccountRequest {
  name?: string
  phase1AccountId?: string
  phase2AccountId?: string
  fundedAccountId?: string
  // ... other updatable fields
}

export interface CreateTradeRequest {
  symbol: string
  side: 'long' | 'short'
  quantity: number
  entryPrice: number
  exitPrice?: number
  entryTime: Date
  exitTime?: Date
  commission?: number
  swap?: number
  fees?: number
  comment?: string
  strategy?: string
}

export interface CreatePayoutRequest {
  requestedAmount: number
  paymentMethod?: string
  notes?: string
}
