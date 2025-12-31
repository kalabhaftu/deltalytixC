'use server'

import YahooFinance from 'yahoo-finance2'
import { YAHOO_FINANCE_SYMBOL_MAP, FOREX_PAIRS } from '@/lib/constants'
import { YahooFinanceQuote } from '@/types/yahoo-finance'
import { getUserId } from '@/server/auth'

const yahooFinance = new YahooFinance()

export interface CandleData {
    time: number
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
        await getUserId()
        console.log(`Fetching data for ${symbol}...`)

        // Map common symbols to Yahoo Finance tickers
        let querySymbol = symbol.toUpperCase()

        if (YAHOO_FINANCE_SYMBOL_MAP[querySymbol]) {
            querySymbol = YAHOO_FINANCE_SYMBOL_MAP[querySymbol]
        }

        // Forex
        if (querySymbol.length === 6 && FOREX_PAIRS.includes(querySymbol)) {
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

        let intervalsToTry: ('1m' | '5m' | '15m' | '30m' | '1h' | '1d')[] = ['5m', '15m', '30m', '1h', '1d']

        if (diffDays < 7) {
            intervalsToTry = ['1m', '5m', '15m', '30m', '1h', '1d']
        } else if (diffDays >= 60) {
            // After 60 days, try 15m or higher
            intervalsToTry = ['15m', '30m', '1h', '1d']
        }

        let lastError = ''
        for (const queryInterval of intervalsToTry) {
            try {
                let period1 = startDate ? new Date(startDate.getTime() - 24 * 60 * 60 * 1000) : new Date('2024-01-01')
                if (queryInterval === '1h' || queryInterval === '1d') {
                    period1 = startDate ? new Date(startDate.getTime() - 30 * 24 * 60 * 60 * 1000) : period1
                }

                const queryOptions = {
                    period1,
                    period2: endDate ? new Date(endDate.getTime() + 24 * 60 * 60 * 1000) : new Date(),
                    interval: queryInterval
                }

                console.log(`Trying interval: ${queryInterval} for ${querySymbol}`)
                // @ts-ignore - yahoo-finance2 types might not be perfectly aligned with chart result
                const result = await yahooFinance.chart(querySymbol, queryOptions) as unknown as import('@/types/yahoo-finance').YahooFinanceResult

                if (result && result.quotes && result.quotes.length > 0) {
                    const candles = result.quotes.map((q: YahooFinanceQuote) => ({
                        time: Math.floor(new Date(q.date).getTime() / 1000),
                        open: q.open,
                        high: q.high,
                        low: q.low,
                        close: q.close,
                    })).filter((c: { open: number | null, close: number | null }) => c.open != null && c.close != null)

                    return { data: candles }
                } else {
                    console.warn(`Empty result for ${queryInterval} on ${querySymbol}`)
                }
            } catch (e: any) {
                console.error(`Error fetching ${queryInterval} for ${querySymbol}:`, e.message)

                // If Rate Limited, don't hammer the API
                if (e.message.includes('Too Many Requests') || e.message.includes('429')) {
                    console.error('Aborting retries due to Rate Limit')
                    lastError = 'Rate Limit Exceeded. Please try again later.'
                    break
                }

                lastError = e.message
                // Add a small delay before next retry to be polite
                await new Promise(resolve => setTimeout(resolve, 1000))
                continue
            }
        }

        return { data: [], error: lastError || 'No market data found' }

    } catch (e: any) {
        console.error('Yahoo Finance API Error:', e)
        return { data: [], error: e.message || 'Failed to fetch market data' }
    }
}
