'use client'

import dynamic from 'next/dynamic'

// Lazy load the trade table component
const TradeTableReview = dynamic(
  () => import('../components/tables/trade-table-review').then(mod => ({ default: mod.TradeTableReview })),
  { ssr: false }
)

export default function TablePage() {
  return (
    <div className="w-full">
      <TradeTableReview />
    </div>
  )
}
