'use client'

import dynamic from 'next/dynamic'
import { useSearchParams, useRouter } from 'next/navigation'
import { useData } from '@/context/data-provider'
import TradeReplay from '../components/trades/trade-replay'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { Suspense } from 'react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

// Lazy load the trade table component
const TradeTableReview = dynamic(
  () => import('../components/tables/trade-table-review').then(mod => ({ default: mod.TradeTableReview })),
  { ssr: false }
)

function TableView() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { formattedTrades = [] } = useData()

  const view = searchParams.get('view')
  const tradeId = searchParams.get('tradeId')

  if (view === 'replay' && tradeId) {
    const trade = formattedTrades.find((t: any) => t.id === tradeId)

    if (trade) {
      const isLong = trade.side?.toLowerCase() === 'long' || trade.side?.toLowerCase() === 'buy'
      const isProfit = trade.pnl > 0

      return (
        <div className="flex flex-col h-[calc(100vh-120px)] bg-background border border-border/40 rounded-xl overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-3 py-2 border-b shrink-0 bg-muted/30 backdrop-blur">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/dashboard/table')}
                className="h-8 px-2 text-xs hover:bg-accent/50"
              >
                <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                Back
              </Button>
              <div className="h-4 w-px bg-border/60" />
              <h1 className="text-xs font-bold tracking-tight uppercase text-muted-foreground mr-2">
                {trade.instrument}
              </h1>
              <Badge variant={isLong ? 'default' : 'destructive'} className="text-[10px] px-1.5 py-0 h-4 uppercase font-bold">
                {isLong ? 'Buy' : 'Sell'}
              </Badge>
            </div>

            <div className="flex items-center gap-6">
              <div className="flex flex-col items-end">
                <span className="text-[9px] uppercase font-bold text-muted-foreground leading-none mb-1">Entry / Exit</span>
                <span className="text-[11px] font-mono font-medium leading-none">
                  ${Number(trade.entryPrice).toFixed(2)} → ${trade.closePrice ? Number(trade.closePrice).toFixed(2) : 'OPEN'}
                </span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[9px] uppercase font-bold text-muted-foreground leading-none mb-1">Size</span>
                <span className="text-[11px] font-mono font-medium leading-none">{trade.quantity}</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[9px] uppercase font-bold text-muted-foreground leading-none mb-1">P&L</span>
                <span className={cn(
                  "text-[11px] font-mono font-bold leading-none",
                  isProfit ? "text-green-500" : "text-red-500"
                )}>
                  {isProfit ? '+' : ''}${trade.pnl.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-hidden relative bg-card">
            <TradeReplay trade={trade} />
          </div>
        </div>
      )
    }
  }

  return <TradeTableReview />
}

export default function TablePage() {
  const searchParams = useSearchParams()
  const isReplay = searchParams.get('view') === 'replay'

  return (
    <div className="w-full px-3 sm:px-4 md:px-6 py-4">
      <Suspense fallback={<div className="flex items-center justify-center h-64 text-muted-foreground font-medium">Synchronizing Data...</div>}>
        <TableView />
      </Suspense>
    </div>
  )
}
