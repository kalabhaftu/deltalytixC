import { getTradesAction } from "@/server/database";
import { tool } from "ai";
import { z } from "zod";


export const getMostTradedInstruments = tool({
    description: 'Get the most traded instruments',
    inputSchema: z.object({}),
})

export async function executeGetMostTradedInstruments() {
    const trades = await getTradesAction()
    const instruments = trades.map((trade: { instrument: string | null }) => trade.instrument).filter((i): i is string => !!i)
    const instrumentCount = instruments.reduce<Record<string, number>>((acc, instrument) => {
        acc[instrument] = (acc[instrument] || 0) + 1
        return acc
    }, {})

    return Object.entries(instrumentCount)
        .sort((a, b) => b[1] - a[1])
        .map(([instrument, count]) => ({ instrument, count }))
}