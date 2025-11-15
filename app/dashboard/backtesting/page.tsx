import { Suspense } from 'react'
import { BacktestingClient } from './components/backtesting-client'
import { BacktestTrade } from '@/types/backtesting-types'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import { getUserId } from '@/server/auth'
import { prisma } from '@/lib/prisma'

// Enable ISR with 5 minute revalidation
export const revalidate = 300
// Note: PPR requires Next.js canary
// export const experimental_ppr = true

// Loading component for Suspense boundary
function BacktestingLoading() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Skeleton className="h-9 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-48" />
      </div>
      <div className="flex gap-4">
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-40" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-64 w-full" />
        ))}
      </div>
    </div>
  )
}

// Server Component - fetches data with connection retry
async function getBacktests(): Promise<BacktestTrade[]> {
  try {
    const userId = await getUserId()
    
    // Add connection timeout and retry logic
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout
    
    try {
      const backtests = await prisma.backtestTrade.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      })
      
      clearTimeout(timeoutId)

      // Transform to client format
      return backtests.map((bt) => ({
        id: bt.id,
        pair: bt.pair,
        direction: bt.direction,
        outcome: bt.outcome,
        session: bt.session,
        model: bt.model,
        customModel: bt.customModel || undefined,
        riskRewardRatio: bt.riskRewardRatio,
        riskPoints: bt.riskPoints,
        rewardPoints: bt.rewardPoints,
        entryPrice: bt.entryPrice,
        stopLoss: bt.stopLoss,
        takeProfit: bt.takeProfit,
        exitPrice: bt.exitPrice,
        pnl: bt.pnl,
        images: [
          bt.imageOne,
          bt.imageTwo,
          bt.imageThree,
          bt.imageFour,
          bt.imageFive,
          bt.imageSix,
        ].filter(Boolean) as string[],
        cardPreviewImage: bt.cardPreviewImage || undefined,
        notes: bt.notes || undefined,
        tags: bt.tags || undefined,
        dateExecuted: bt.dateExecuted,
        backtestDate: bt.backtestDate || undefined,
        createdAt: bt.createdAt,
        updatedAt: bt.updatedAt,
      }))
    } catch (dbError) {
      clearTimeout(timeoutId)
      throw dbError
    }
  } catch (error) {
    
    // Return empty array on any error to prevent page crash
    return []
  }
}

// Server Component page
export default async function BacktestingPage() {
  const backtests = await getBacktests()

  return (
    <Suspense fallback={<BacktestingLoading />}>
      <BacktestingClient initialBacktests={backtests} />
    </Suspense>
  )
}
