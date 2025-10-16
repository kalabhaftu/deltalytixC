'use client'

import { Trade } from '@prisma/client'
import { useEffect, useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { useUserStore } from '@/store/user-store'
import { ImportLoading } from '../components/import-loading'

interface ExnessProcessorProps {
  csvData: string[][]
  headers: string[]
  setProcessedTrades: React.Dispatch<React.SetStateAction<Trade[]>>
  accountNumber: string
}

const ExnessProcessor = ({
  csvData,
  headers,
  setProcessedTrades,
  accountNumber
}: ExnessProcessorProps) => {
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
        // Handle Exness CSV format: ticket,opening_time_utc,closing_time_utc,type,lots,original_position_size,symbol,opening_price,closing_price,stop_loss,take_profit,commission_usd,swap_usd,profit_usd,equity_usd,margin_level,close_reason
        const entryDateStr = row[headers.indexOf('opening_time_utc')]
        const closeDateStr = row[headers.indexOf('closing_time_utc')]
        
        if (!entryDateStr || !closeDateStr) {
          continue // Skip invalid rows
        }

        // Exness timestamps are already in UTC format - parse them correctly
        // Note: 'opening_time_utc' and 'closing_time_utc' already include timezone info
        const entryDate = entryDateStr.endsWith('Z') ? new Date(entryDateStr) : new Date(entryDateStr + 'Z')
        const closeDate = closeDateStr.endsWith('Z') ? new Date(closeDateStr) : new Date(closeDateStr + 'Z')

        // Calculate time in position in seconds
        const timeInPosition = Math.round((closeDate.getTime() - entryDate.getTime()) / 1000)

        // Extract data from CSV
        const quantity = parseFloat(row[headers.indexOf('lots')]) || 0
        const entryPrice = parseFloat(row[headers.indexOf('opening_price')]) || 0
        const closePrice = parseFloat(row[headers.indexOf('closing_price')]) || 0
        const commission = parseFloat(row[headers.indexOf('commission_usd')]) || 0
        const swap = parseFloat(row[headers.indexOf('swap_usd')]) || 0
        const pnl = parseFloat(row[headers.indexOf('profit_usd')]) || 0
        
        // Handle stop loss and take profit (can be empty)
        const stopLossRaw = row[headers.indexOf('stop_loss')]
        const takeProfitRaw = row[headers.indexOf('take_profit')]
        const stopLoss = stopLossRaw && parseFloat(stopLossRaw) !== 0 ? stopLossRaw : null
        const takeProfit = takeProfitRaw && parseFloat(takeProfitRaw) !== 0 ? takeProfitRaw : null

        // Get instrument and side
        const instrument = row[headers.indexOf('symbol')] || ''
        const side = row[headers.indexOf('type')] || ''
        const tradeId = row[headers.indexOf('ticket')] || ''
        const reason = row[headers.indexOf('close_reason')] || ''
        
        // Convert side to uppercase and normalize
        const normalizedSide = side.toLowerCase() === 'buy' ? 'BUY' : 'SELL'

        const trade = {
          id: uuidv4(),
          accountNumber,
          instrument,
          entryId: tradeId,
          quantity: Math.abs(quantity), // Ensure positive quantity
          entryPrice: entryPrice.toString(),
          closePrice: closePrice.toString(),
          entryDate: entryDate.toISOString(),
          closeDate: closeDate.toISOString(),
          pnl: pnl + swap, // Include swap in PnL
          timeInPosition,
          side: normalizedSide,
          commission,
          phaseAccountId: null, // Will be set by automatic linking during save
          userId: currentUser.id,
          createdAt: new Date(),
          comment: null, // Don't set reason as comment - reasons should be displayed separately
          closeReason: reason || null, // Store close reason in dedicated field
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
          symbol: instrument, // Same as instrument for Exness
          entryTime: entryDate, // Set actual entry time
          exitTime: closeDate, // Set actual exit time for historical breach detection
          accountId: null,
          stopLoss: stopLoss,
          takeProfit: takeProfit,
        } as Trade

        trades.push(trade)
      }

      setProcessedTrades(trades)
      setIsProcessing(false)
    }

    processData()
  }, [csvData, headers, accountNumber, user, supabaseUser, setProcessedTrades])

  if (isProcessing) {
    return <ImportLoading />
  }

  return <div className="text-center text-sm text-muted-foreground">Exness trades processed successfully!</div>
}

export default ExnessProcessor
