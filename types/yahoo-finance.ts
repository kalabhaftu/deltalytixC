
export interface YahooFinanceQuote {
    date: Date | string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume?: number;
    adjClose?: number;
}

export interface YahooFinanceChartResult {
    meta: any;
    timestamp: number[];
    indicators: {
        quote: Array<{
            open: (number | null)[];
            high: (number | null)[];
            low: (number | null)[];
            close: (number | null)[];
            volume: (number | null)[];
        }>;
        adjclose?: Array<{
            adjclose: (number | null)[];
        }>;
    };
}

// Simplified result type often returned by yahoo-finance2 wrapper
export interface YahooFinanceResult {
    quotes: YahooFinanceQuote[];
}
