/**
 * Asset Classification System for Pip/Handle/Tick Counting
 * Based on the provided CSV data and trading standards
 */

export type CountingUnit = 'pip' | 'handle';
export type AssetType = 'forex' | 'commodity' | 'index' | 'crypto';

export interface AssetClassification {
  type: AssetType;
  countingUnit: CountingUnit;
  smallestMove: number;
  displayName: string;
}

// Asset classification patterns
const ASSET_PATTERNS: Record<string, AssetClassification> = {
  // Forex Major Pairs
  'EURUSD': { type: 'forex', countingUnit: 'pip', smallestMove: 0.0001, displayName: 'EUR/USD' },
  'GBPUSD': { type: 'forex', countingUnit: 'pip', smallestMove: 0.0001, displayName: 'GBP/USD' },
  'USDJPY': { type: 'forex', countingUnit: 'pip', smallestMove: 0.01, displayName: 'USD/JPY' },
  'AUDUSD': { type: 'forex', countingUnit: 'pip', smallestMove: 0.0001, displayName: 'AUD/USD' },
  'USDCAD': { type: 'forex', countingUnit: 'pip', smallestMove: 0.0001, displayName: 'USD/CAD' },
  'NZDUSD': { type: 'forex', countingUnit: 'pip', smallestMove: 0.0001, displayName: 'NZD/USD' },
  'USDCHF': { type: 'forex', countingUnit: 'pip', smallestMove: 0.0001, displayName: 'USD/CHF' },
  
  // Forex Cross Pairs
  'EURGBP': { type: 'forex', countingUnit: 'pip', smallestMove: 0.0001, displayName: 'EUR/GBP' },
  'EURJPY': { type: 'forex', countingUnit: 'pip', smallestMove: 0.01, displayName: 'EUR/JPY' },
  'GBPJPY': { type: 'forex', countingUnit: 'pip', smallestMove: 0.01, displayName: 'GBP/JPY' },
  'AUDJPY': { type: 'forex', countingUnit: 'pip', smallestMove: 0.01, displayName: 'AUD/JPY' },
  'GBPAUD': { type: 'forex', countingUnit: 'pip', smallestMove: 0.0001, displayName: 'GBP/AUD' },
  
  // Commodities
  'XAUUSD': { type: 'commodity', countingUnit: 'pip', smallestMove: 0.01, displayName: 'Gold (XAU/USD)' },
  'XAGUSD': { type: 'commodity', countingUnit: 'pip', smallestMove: 0.01, displayName: 'Silver (XAG/USD)' },
  'USOIL': { type: 'commodity', countingUnit: 'pip', smallestMove: 0.01, displayName: 'WTI Oil' },
  'UKOIL': { type: 'commodity', countingUnit: 'pip', smallestMove: 0.01, displayName: 'Brent Oil' },
  
  // US Indices
  'US100': { type: 'index', countingUnit: 'handle', smallestMove: 1.0, displayName: 'NASDAQ 100' },
  'US500': { type: 'index', countingUnit: 'handle', smallestMove: 1.0, displayName: 'S&P 500' },
  'US30': { type: 'index', countingUnit: 'handle', smallestMove: 1.0, displayName: 'Dow Jones' },
  'SPX': { type: 'index', countingUnit: 'handle', smallestMove: 1.0, displayName: 'S&P 500' },
  'NDX': { type: 'index', countingUnit: 'handle', smallestMove: 1.0, displayName: 'NASDAQ 100' },
  'DJI': { type: 'index', countingUnit: 'handle', smallestMove: 1.0, displayName: 'Dow Jones' },
  
  // European Indices
  'GER40': { type: 'index', countingUnit: 'handle', smallestMove: 1.0, displayName: 'DAX' },
  'UK100': { type: 'index', countingUnit: 'handle', smallestMove: 1.0, displayName: 'FTSE 100' },
  'FRA40': { type: 'index', countingUnit: 'handle', smallestMove: 1.0, displayName: 'CAC 40' },
  'DAX': { type: 'index', countingUnit: 'handle', smallestMove: 1.0, displayName: 'DAX' },
  'FTSE': { type: 'index', countingUnit: 'handle', smallestMove: 1.0, displayName: 'FTSE 100' },
  'CAC': { type: 'index', countingUnit: 'handle', smallestMove: 1.0, displayName: 'CAC 40' },
};

/**
 * Classify an asset symbol and return its counting unit and properties
 */
export function classifyAsset(symbol: string): AssetClassification {
  const normalizedSymbol = symbol.toUpperCase().replace(/[^A-Z0-9]/g, '');
  
  // Direct match
  if (ASSET_PATTERNS[normalizedSymbol]) {
    return ASSET_PATTERNS[normalizedSymbol];
  }
  
  // Pattern matching for variations
  for (const [pattern, classification] of Object.entries(ASSET_PATTERNS)) {
    if (normalizedSymbol.includes(pattern) || pattern.includes(normalizedSymbol)) {
      return classification;
    }
  }
  
  // Default classification based on common patterns
  if (normalizedSymbol.includes('USD') || normalizedSymbol.includes('EUR') || 
      normalizedSymbol.includes('GBP') || normalizedSymbol.includes('JPY') ||
      normalizedSymbol.includes('AUD') || normalizedSymbol.includes('CAD') ||
      normalizedSymbol.includes('NZD') || normalizedSymbol.includes('CHF')) {
    return { type: 'forex', countingUnit: 'pip', smallestMove: 0.0001, displayName: symbol };
  }
  
  if (normalizedSymbol.includes('XAU') || normalizedSymbol.includes('XAG') || 
      normalizedSymbol.includes('OIL') || normalizedSymbol.includes('GOLD') || 
      normalizedSymbol.includes('SILVER')) {
    return { type: 'commodity', countingUnit: 'pip', smallestMove: 0.01, displayName: symbol };
  }
  
  if (normalizedSymbol.includes('US') || normalizedSymbol.includes('SPX') || 
      normalizedSymbol.includes('NDX') || normalizedSymbol.includes('DJI') ||
      normalizedSymbol.includes('GER') || normalizedSymbol.includes('UK') || 
      normalizedSymbol.includes('FRA') || normalizedSymbol.includes('DAX') ||
      normalizedSymbol.includes('FTSE') || normalizedSymbol.includes('CAC')) {
    return { type: 'index', countingUnit: 'handle', smallestMove: 1.0, displayName: symbol };
  }
  
  // Default fallback
  return { type: 'forex', countingUnit: 'pip', smallestMove: 0.0001, displayName: symbol };
}

/**
 * Calculate pip/tick/handle count for a price movement
 */
export function calculateMovementCount(
  entryPrice: number,
  exitPrice: number,
  assetClassification: AssetClassification
): number {
  const priceDifference = Math.abs(exitPrice - entryPrice);
  return Math.round(priceDifference / assetClassification.smallestMove);
}

/**
 * Calculate TP and SL counts for a trade
 */
export function calculateTradeCounts(
  entryPrice: number,
  closePrice: number,
  stopLoss: number,
  takeProfit: number,
  assetClassification: AssetClassification
): {
  tpCount: number | null;
  slCount: number | null;
  actualCount: number;
  isWin: boolean;
} {
  const actualCount = calculateMovementCount(entryPrice, closePrice, assetClassification);
  const isWin = closePrice > entryPrice;
  
  let tpCount: number | null = null;
  let slCount: number | null = null;
  
  if (stopLoss > 0) {
    slCount = calculateMovementCount(entryPrice, stopLoss, assetClassification);
  }
  
  if (takeProfit > 0) {
    tpCount = calculateMovementCount(entryPrice, takeProfit, assetClassification);
  }
  
  return {
    tpCount,
    slCount,
    actualCount,
    isWin
  };
}

/**
 * Get display unit based on user preference and asset type
 */
export function getDisplayUnit(
  assetClassification: AssetClassification
): CountingUnit {
  // Forex always uses pips
  if (assetClassification.type === 'forex') {
    return 'pip';
  }
  
  // Commodities use pips
  if (assetClassification.type === 'commodity') {
    return 'pip';
  }
  
  // Indices always use handles
  if (assetClassification.type === 'index') {
    return 'handle';
  }
  
  // Default to pip
  return 'pip';
}

/**
 * Format count with appropriate unit
 */
export function formatCount(count: number, unit: CountingUnit): string {
  const sign = count >= 0 ? '+' : '';
  const unitSymbol = unit === 'pip' ? 'p' : 'h';
  return `${sign}${count}${unitSymbol}`;
}
