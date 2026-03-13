'use client'

import { useParams, useRouter } from 'next/navigation'
import { useData } from '@/context/data-provider'
import { TradeDetailContent } from '@/app/dashboard/components/tables/trade-detail-content'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from '@phosphor-icons/react'

export default function TradeDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const { formattedTrades, isLoading } = useData()

  const trade = formattedTrades.find((t) => (t as any).id === id)

  if (isLoading) {
    return (
      <div className="p-4 sm:p-8">
        <Skeleton className="h-[80vh] w-full rounded-2xl" />
      </div>
    )
  }

  if (!trade) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-4 text-center">
        <div className="space-y-2">
          <h2 className="text-3xl font-black uppercase tracking-tighter">Trade Not Found</h2>
          <p className="text-muted-foreground font-medium max-w-md">
            The trade execution data could not be retrieved. It may have been deleted or shifted to another account.
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => router.back()}
          className="gap-2 rounded-xl font-bold uppercase tracking-widest text-[10px]"
        >
          <ArrowLeft className="h-4 w-4" />
          Return to Journal
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <TradeDetailContent trade={trade} />
    </div>
  )
}
