import { Suspense } from 'react'
import { JournalClient } from './components/journal-client'
import { Trade } from '@/types/trade-types'
import { Skeleton } from '@/components/ui/skeleton'
import { getUserId } from '@/server/auth'
import { prisma } from '@/lib/prisma'
import { getCanonicalAssetName } from '@/lib/asset-aliases'

// Enable ISR with 5 minute revalidation
export const revalidate = 300
// Note: PPR requires Next.js canary
// export const experimental_ppr = true

// Loading component
function JournalLoading() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-9 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-9 w-24" />
      </div>
      <div className="flex gap-4">
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className="h-64 w-full" />
        ))}
      </div>
    </div>
  )
}

// Server Component - fetches data
async function getTrades(): Promise<Trade[]> {
  try {
    const userId = await getUserId()
    
    const trades = await prisma.trade.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 500, // Limit for performance
    })

    // Transform to client format
    return trades.map((trade) => ({
      ...trade,
      symbol: trade.symbol ? getCanonicalAssetName(trade.symbol) : trade.instrument,
      entryTime: trade.entryTime || undefined,
      exitTime: trade.exitTime || undefined,
    })) as Trade[]
  } catch (error) {
    console.error('Error fetching trades:', error)
    return []
  }
}

// Server Component page
export default async function JournalPage() {
  const trades = await getTrades()

  return (
    <Suspense fallback={<JournalLoading />}>
      <JournalClient initialTrades={trades} />
    </Suspense>
  )
}
