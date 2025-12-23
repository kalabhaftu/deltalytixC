'use server'

import YahooFinance from 'yahoo-finance2'

const yahooFinance = new YahooFinance()

export interface CandleData {
    time: string
    open: number
    high: number
    low: number
    close: number
}

export async function getMarketData(
    symbol: string,
    interval: '1m' | '5m' | '15m' | '1d' = '5m',
    startDate?: Date,
    endDate?: Date
): Promise<{ data: CandleData[], error?: string }> {
    try {
        console.log(`Fetching data for ${symbol}...`)

        // Map common symbols to Yahoo Finance tickers
        let querySymbol = symbol.toUpperCase()

        // Indices / Futures
        if (querySymbol === 'NQ' || querySymbol === 'NAS100' || querySymbol === 'US100') querySymbol = 'NQ=F'
        else if (querySymbol === 'ES' || querySymbol === 'US500' || querySymbol === 'SPX500') querySymbol = 'ES=F'
        else if (querySymbol === 'YM' || querySymbol === 'US30' || querySymbol === 'DJI') querySymbol = 'YM=F'
        else if (querySymbol === 'RTY' || querySymbol === 'US2000') querySymbol = 'RTY=F'
        else if (querySymbol === 'CL' || querySymbol === 'USOIL' || querySymbol === 'WTI') querySymbol = 'CL=F'
        else if (querySymbol === 'GC' || querySymbol === 'GOLD' || querySymbol === 'XAUUSD') querySymbol = 'GC=F'

        // Forex (Yahoo usually uses format "EURUSD=X")
        const forexPairs = ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'USDCHF', 'NZDUSD']
        if (querySymbol.length === 6 && forexPairs.includes(querySymbol)) {
            querySymbol = `${querySymbol}=X`
        }

        // Crypto
        if (querySymbol.endsWith('USDT')) querySymbol = `${querySymbol.replace('USDT', '-USD')}`
        else if (querySymbol === 'BTC') querySymbol = 'BTC-USD'
        else if (querySymbol === 'ETH') querySymbol = 'ETH-USD'


        // SMART INTERVAL LOGIC
        // Yahoo Limits: 1m: 7d, 5m: 60d.
        const now = new Date()
        const diffDays = (now.getTime() - (startDate?.getTime() || now.getTime())) / (1000 * 60 * 60 * 24)

        let intervalsToTry: ('1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d')[] = ['5m', '15m', '30m', '1h', '4h', '1d']

        if (diffDays < 7) {
            intervalsToTry = ['1m', '5m', '15m', '30m', '1h', '4h', '1d']
        } else if (diffDays >= 60) {
            // After 60 days, try 15m or higher
            intervalsToTry = ['15m', '30m', '1h', '4h', '1d']
        }

        let lastError = ''
        for (const queryInterval of intervalsToTry) {
            try {
                let period1 = startDate ? new Date(startDate.getTime() - 24 * 60 * 60 * 1000) : new Date('2024-01-01')
                if (queryInterval === '1h' || queryInterval === '4h' || queryInterval === '1d') {
                    period1 = startDate ? new Date(startDate.getTime() - 30 * 24 * 60 * 60 * 1000) : period1
                }

                const queryOptions: any = {
                    period1,
                    period2: endDate ? new Date(endDate.getTime() + 24 * 60 * 60 * 1000) : new Date(),
                    interval: queryInterval
                }

                console.log(`Trying interval: ${queryInterval} for ${querySymbol}`)
                const result = await yahooFinance.chart(querySymbol, queryOptions) as any

                if (result && result.quotes && result.quotes.length > 2) {
                    const candles = result.quotes.map((q: any) => ({
                        time: Math.floor(new Date(q.date).getTime() / 1000),
                        open: q.open,
                        high: q.high,
                        low: q.low,
                        close: q.close,
                    })).filter((c: any) => c.open != null && c.close != null)

                    return { data: candles }
                }
            } catch (e: any) {
                lastError = e.message
                continue
            }
        }

        return { data: [], error: lastError || 'No market data found' }

    } catch (e: any) {
        console.error('Yahoo Finance API Error:', e)
        return { data: [], error: e.message || 'Failed to fetch market data' }
    }
}
