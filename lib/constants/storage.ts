/**
 * Centralized storage bucket constants
 * Prevents hardcoded bucket strings scattered across the codebase
 */

export const STORAGE_BUCKETS = {
  TRADES: 'trade-images', // For main trade screenshots
  GENERAL: 'images',      // For other assets
} as const;

