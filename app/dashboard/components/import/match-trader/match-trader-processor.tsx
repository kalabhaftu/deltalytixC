'use client'

import { Trade } from '@prisma/client'
import { useEffect, useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { useUserStore } from '@/store/user-store'

interface MatchTraderProcessorProps {
  csvData: string[][]
  headers: string[]
  setProcessedTrades: React.Dispatch<React.SetStateAction<Trade[]>>
  accountNumber: string
}

const MatchTraderProcessor = ({
  csvData,
  headers,
  setProcessedTrades,
  accountNumber
}: MatchTraderProcessorProps) => {
  const user = useUserStore(state => state.user)
  const supabaseUser = useUserStore(state => state.supabaseUser)
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    const processData = async () => {
      const currentUser = user || supabaseUser
      if (!currentUser?.id) {
        return
      }

      setIsProcessing(true)

      const trades: Trade[] = []

      for (const row of csvData) {
        // Handle Match Trader CSV format
        const entryDateStr = row[headers.indexOf('Open time')]
        const closeDateStr = row[headers.indexOf('Close time')]
        
        if (!entryDateStr || !closeDateStr) {
          return null // Skip invalid rows
        }

        const entryDate = new Date(entryDateStr)
        const closeDate = new Date(closeDateStr)

        // Calculate time in position in seconds
        const timeInPosition = Math.round((closeDate.getTime() - entryDate.getTime()) / 1000)

        // Parse prices and handle potential string/number conversion
        const entryPrice = parseFloat(row[headers.indexOf('Open price')] || '0')
        const closePrice = parseFloat(row[headers.indexOf('Close Price')] || '0')
        const quantity = parseFloat(row[headers.indexOf('Volume')] || '0')
        const pnl = parseFloat(row[headers.indexOf('Profit')] || '0')
        const commission = parseFloat(row[headers.indexOf('Commission')] || '0')
        const swap = parseFloat(row[headers.indexOf('Swap')] || '0')

        // Get instrument and side
        const instrument = row[headers.indexOf('Symbol')] || ''
        const side = row[headers.indexOf('Side')] || ''
        const tradeId = row[headers.indexOf('ID')] || ''
        const reason = row[headers.indexOf('Reason')] || ''
        
        // Don't use trade ID as account - account number comes from selection step

        const trade = {
          id: uuidv4(),
          accountNumber,
          instrument,
          entryId: tradeId,
          closeId: null,
          quantity: Math.abs(quantity), // Ensure positive quantity
          entryPrice: entryPrice.toString(),
          closePrice: closePrice.toString(),
          entryDate: entryDate.toISOString(),
          closeDate: closeDate.toISOString(),
          pnl: pnl + swap, // Include swap in PnL
          timeInPosition,
          side: side.toUpperCase(), // Normalize to uppercase (BUY/SELL)
          commission,
          phaseAccountId: null, // Will be set by automatic linking during save
          userId: currentUser.id,
          createdAt: new Date(),
          comment: null, // Don't set reason as comment - reasons should be displayed separately
          closeReason: reason || null, // Store close reason in dedicated field
          videoUrl: null,
          tags: [],
          imageBase64: null,
          imageBase64Second: null,
          imageBase64Third: null,
          imageBase64Fourth: null,
          imageBase64Fifth: null,
          imageBase64Sixth: null,
          cardPreviewImage: null,
          tradingModel: null,
          groupId: null,
          // Prisma optional fields
          symbol: null,
          entryTime: null,
          exitTime: null,
          fees: 0,
          realizedPnl: null,
          equityAtOpen: null,
          equityAtClose: null,
          rawBrokerId: null,
          accountId: null,
          strategy: null,
        } as Trade

        trades.push(trade)
      }

      setProcessedTrades(trades)
      setIsProcessing(false)
    }

    processData()
  }, [csvData, headers, setProcessedTrades, accountNumber, user, supabaseUser])

  return null
}

export default MatchTraderProcessor