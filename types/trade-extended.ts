import { Trade } from '@prisma/client'

export interface ExtendedTrade extends Trade {
    tags: string[] | any; // Handling the array/string ambiguity from the audit report
    selectedNews: string | null;
    selectedRules: string[] | null;
    chartLinks: string | null;
    marketBias: MarketBias | null;
    // Add other specific overrides if necessary
}

export type MarketBias = 'BULLISH' | 'BEARISH' | 'UNDECIDED'
