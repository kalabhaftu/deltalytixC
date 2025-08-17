/**
 * API Response Types
 * Standardized response types for all API endpoints
 */

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
  timestamp: string
}

export interface ApiError {
  code: string
  message: string
  details?: unknown
  statusCode: number
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrevious: boolean
  }
}

/**
 * User Types
 */
export interface User {
  id: string
  email: string
  name?: string
  avatar?: string
  createdAt: Date
  updatedAt: Date
  subscription?: Subscription
  preferences: UserPreferences
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system'
  language: string
  timezone: string
  currency: string
  dateFormat: string
  notifications: NotificationSettings
}

export interface NotificationSettings {
  email: boolean
  push: boolean
  marketing: boolean
  updates: boolean
}

/**
 * Subscription Types
 */
export interface Subscription {
  id: string
  userId: string
  plan: SubscriptionPlan
  status: SubscriptionStatus
  currentPeriodStart: Date
  currentPeriodEnd: Date
  cancelAtPeriodEnd: boolean
  trialEnd?: Date
}

export type SubscriptionPlan = 'free' | 'basic' | 'pro' | 'enterprise'
export type SubscriptionStatus = 'active' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'past_due' | 'trialing' | 'unpaid'

/**
 * Trade Types
 */
export interface Trade {
  id: string
  userId: string
  accountNumber: string
  instrument: string
  side: 'long' | 'short'
  quantity: number
  entryPrice: number
  exitPrice?: number
  entryDate: Date
  exitDate?: Date
  pnl?: number
  commission?: number
  tags?: string[]
  comment?: string
  videoUrl?: string
  images?: string[]
  positionTime?: number
  executionTime?: Date
  tradeGroup?: string
  sessionData?: TradeSessionData
}

export interface TradeSessionData {
  openTime: Date
  closeTime: Date
  duration: number
  slippage?: number
  marketConditions?: string
  volatility?: number
}

/**
 * Account Types
 */
export interface Account {
  id: string
  userId: string
  accountNumber: string
  accountName?: string
  broker?: string
  accountType: 'live' | 'demo' | 'paper'
  currency: string
  balance?: number
  equity?: number
  margin?: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  rules?: AccountRules
}

export interface AccountRules {
  maxDailyLoss?: number
  maxDrawdown?: number
  profitTarget?: number
  maxPosition?: number
  allowedInstruments?: string[]
  tradingHours?: TradingHours
}

export interface TradingHours {
  start: string // HH:mm format
  end: string   // HH:mm format
  timezone: string
  weekdays: number[] // 0-6, Sunday = 0
}

/**
 * Widget Types
 */
export interface WidgetData {
  id: string
  type: string
  title: string
  data: unknown
  lastUpdated: Date
  isLoading?: boolean
  error?: string
}

/**
 * Chart Data Types
 */
export interface ChartDataPoint {
  x: string | number | Date
  y: number
  label?: string
  color?: string
  metadata?: Record<string, unknown>
}

export interface TimeSeriesDataPoint extends ChartDataPoint {
  x: Date
  volume?: number
  open?: number
  high?: number
  low?: number
  close?: number
}

/**
 * Filter Types
 */
export interface DateFilter {
  start?: Date
  end?: Date
  period?: 'day' | 'week' | 'month' | 'quarter' | 'year'
  relative?: 'today' | 'yesterday' | 'last7days' | 'last30days' | 'last90days'
}

export interface AccountFilter {
  accountIds?: string[]
  accountTypes?: ('live' | 'demo' | 'paper')[]
  brokers?: string[]
}

export interface InstrumentFilter {
  instruments?: string[]
  categories?: string[]
  exchanges?: string[]
}

export interface TradeFilter extends DateFilter, AccountFilter, InstrumentFilter {
  sides?: ('long' | 'short')[]
  tags?: string[]
  minPnl?: number
  maxPnl?: number
  minQuantity?: number
  maxQuantity?: number
  hasComment?: boolean
  hasVideo?: boolean
  hasImages?: boolean
}

/**
 * Analysis Types
 */
export interface PerformanceMetrics {
  totalTrades: number
  winningTrades: number
  losingTrades: number
  winRate: number
  averageWin: number
  averageLoss: number
  profitFactor: number
  totalPnl: number
  maxDrawdown: number
  maxProfit: number
  sharpeRatio?: number
  sortinoRatio?: number
}

export interface TimeBasedMetrics {
  hourOfDay: Record<string, PerformanceMetrics>
  dayOfWeek: Record<string, PerformanceMetrics>
  monthOfYear: Record<string, PerformanceMetrics>
}

/**
 * Import Types
 */
export interface ImportJob {
  id: string
  userId: string
  status: ImportStatus
  type: ImportType
  fileName?: string
  fileSize?: number
  progress: number
  totalRecords?: number
  processedRecords?: number
  errors?: ImportError[]
  createdAt: Date
  updatedAt: Date
  completedAt?: Date
}

export type ImportStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
export type ImportType = 'csv' | 'excel' | 'api' | 'manual'

export interface ImportError {
  row?: number
  column?: string
  message: string
  code?: string
}

/**
 * Event Types
 */
export interface SystemEvent {
  id: string
  type: EventType
  userId?: string
  data: Record<string, unknown>
  timestamp: Date
  source: string
}

export type EventType = 
  | 'user.created'
  | 'user.updated'
  | 'trade.created'
  | 'trade.updated'
  | 'trade.deleted'
  | 'account.created'
  | 'account.updated'
  | 'import.started'
  | 'import.completed'
  | 'import.failed'
  | 'subscription.created'
  | 'subscription.updated'
  | 'subscription.cancelled'

/**
 * WebSocket Types
 */
export interface WebSocketMessage<T = unknown> {
  type: string
  data: T
  timestamp: Date
  id?: string
}

export interface WebSocketError {
  code: number
  message: string
  reconnect?: boolean
}

/**
 * Form Types
 */
export interface FormField {
  name: string
  label: string
  type: 'text' | 'email' | 'password' | 'number' | 'date' | 'select' | 'checkbox' | 'textarea'
  required?: boolean
  placeholder?: string
  validation?: ValidationRule[]
  options?: SelectOption[]
}

export interface ValidationRule {
  type: 'required' | 'email' | 'min' | 'max' | 'pattern'
  value?: string | number
  message: string
}

export interface SelectOption {
  label: string
  value: string | number
  disabled?: boolean
}

/**
 * Utility Types
 */
export type Nullable<T> = T | null
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

/**
 * Database Types
 */
export interface DatabaseRecord {
  id: string
  createdAt: Date
  updatedAt: Date
}

export interface SoftDeleteRecord extends DatabaseRecord {
  deletedAt?: Date
}

/**
 * File Upload Types
 */
export interface FileUpload {
  file: File
  progress: number
  status: 'pending' | 'uploading' | 'completed' | 'error'
  error?: string
  url?: string
}

export interface UploadResponse {
  url: string
  fileName: string
  fileSize: number
  contentType: string
}
