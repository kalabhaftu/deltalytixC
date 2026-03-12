'use client'

import React from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { useData } from '@/context/data-provider'
import TradeEditDialog from './tables/trade-edit-dialog'
import { TradeDetailView } from './tables/trade-detail-view'
import { ensureExtendedTrade } from '@/lib/utils'

export function GlobalTradeController() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const { formattedTrades, updateTrades } = useData()

  const action = searchParams.get('action')
  const tradeId = searchParams.get('tradeId')

  const handleClose = () => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('action')
    params.delete('tradeId')
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  const handleSave = async (updatedTrade: any) => {
    if (tradeId) {
      await updateTrades([tradeId], updatedTrade)
      handleClose()
    }
  }

  if (!action || !tradeId) return null

  const trade = formattedTrades.find((t: any) => t.id === tradeId)

  if (!trade) return null

  if (action === 'edit') {
    return (
      <TradeEditDialog 
        isOpen={true} 
        onClose={handleClose} 
        trade={ensureExtendedTrade(trade)} 
        onSave={handleSave} 
      />
    )
  }

  if (action === 'view') {
    return (
      <TradeDetailView 
        isOpen={true} 
        onClose={handleClose} 
        trade={trade} 
      />
    )
  }

  return null
}
