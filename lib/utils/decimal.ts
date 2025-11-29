/**
 * Decimal Conversion Utilities
 * Shared utilities for handling Prisma Decimal types
 */

/**
 * Convert Prisma Decimal or any object with toString to a primitive value
 * This handles Decimal.js objects returned by Prisma
 * 
 * @param value - The value to convert (may be Decimal, string, number, or null)
 * @returns The converted value as string or the original value if not a Decimal
 */
export function convertDecimal<T>(value: T): T | string {
  if (value && typeof value === 'object' && 'toString' in value) {
    return (value as any).toString()
  }
  return value
}

/**
 * Convert Prisma Decimal to number
 * Useful when you need numeric operations
 * 
 * @param value - The value to convert
 * @returns Number value or 0 if invalid
 */
export function decimalToNumber(value: unknown): number {
  if (value === null || value === undefined) {
    return 0
  }
  
  if (typeof value === 'number') {
    return value
  }
  
  if (typeof value === 'string') {
    const parsed = parseFloat(value)
    return isNaN(parsed) ? 0 : parsed
  }
  
  if (typeof value === 'object' && 'toString' in value) {
    const parsed = parseFloat((value as any).toString())
    return isNaN(parsed) ? 0 : parsed
  }
  
  return 0
}

/**
 * Convert all Decimal fields in a trade object
 * Handles the common pattern of converting trade price fields
 * 
 * @param trade - Trade object with potential Decimal fields
 * @returns Trade object with converted fields
 */
export function convertTradeDecimals<T extends Record<string, unknown>>(trade: T): T {
  return {
    ...trade,
    entryPrice: convertDecimal(trade.entryPrice),
    closePrice: convertDecimal(trade.closePrice),
    stopLoss: convertDecimal(trade.stopLoss),
    takeProfit: convertDecimal(trade.takeProfit),
  }
}

/**
 * Batch convert all trades' Decimal fields
 * 
 * @param trades - Array of trade objects
 * @returns Array with converted Decimal fields
 */
export function convertTradesDecimals<T extends Record<string, unknown>>(trades: T[]): T[] {
  return trades.map(convertTradeDecimals)
}

/**
 * Safe numeric addition that handles Decimal types
 * 
 * @param a - First value
 * @param b - Second value
 * @returns Sum as number
 */
export function safeAdd(a: unknown, b: unknown): number {
  return decimalToNumber(a) + decimalToNumber(b)
}

/**
 * Safe numeric subtraction that handles Decimal types
 * 
 * @param a - First value (minuend)
 * @param b - Second value (subtrahend)
 * @returns Difference as number
 */
export function safeSubtract(a: unknown, b: unknown): number {
  return decimalToNumber(a) - decimalToNumber(b)
}

/**
 * Format a decimal value to a specific number of decimal places
 * 
 * @param value - The value to format
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted string
 */
export function formatDecimal(value: unknown, decimals: number = 2): string {
  const num = decimalToNumber(value)
  return num.toFixed(decimals)
}

