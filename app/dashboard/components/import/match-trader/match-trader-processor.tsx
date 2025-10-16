'use client'

import { Trade } from '@prisma/client'
import { useEffect, useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { useUserStore } from '@/store/user-store'
import { ImportLoading } from '../components/import-loading'

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

        // MatchTrader timestamps are in UTC - parse them correctly
        const entryDate = new Date(entryDateStr + 'Z') // Add 'Z' to indicate UTC
        const closeDate = new Date(closeDateStr + 'Z') // Add 'Z' to indicate UTC

        // Calculate time in position in seconds
        const timeInPosition = Math.round((closeDate.getTime() - entryDate.getTime()) / 1000)

        // Parse prices and handle potential string/number conversion
        const entryPrice = parseFloat(row[headers.indexOf('Open price')] || '0')
        const closePrice = parseFloat(row[headers.indexOf('Close Price')] || '0')
        const quantity = parseFloat(row[headers.indexOf('Volume')] || '0')
        const pnl = parseFloat(row[headers.indexOf('Profit')] || '0')
        const commission = parseFloat(row[headers.indexOf('Commission')] || '0')
        const swap = parseFloat(row[headers.indexOf('Swap')] || '0')
        
        // Parse Stop Loss and Take Profit (treat 0.00 as null/incomplete)
        const stopLossRaw = row[headers.indexOf('Stop loss')] || null
        const takeProfitRaw = row[headers.indexOf('Take profit')] || null
        const stopLoss = stopLossRaw && parseFloat(stopLossRaw) !== 0 ? stopLossRaw : null
        const takeProfit = takeProfitRaw && parseFloat(takeProfitRaw) !== 0 ? takeProfitRaw : null

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
          entryTime: entryDate, // CRITICAL FIX: Set actual entry time
          exitTime: closeDate, // CRITICAL FIX: Set actual exit time for historical breach detection
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
  }, [csvData, headers, setProcessedTrades, accountNumber, user, supabaseUser])

  // Show processing message when initially processing
  if (isProcessing) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-foreground border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Processing your trades...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center space-y-4 max-w-md">
        <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
          <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Trades Processed Successfully</h3>
          <p className="text-sm text-muted-foreground">
            {csvData.length} {csvData.length === 1 ? 'trade' : 'trades'} ready to import
          </p>
          <p className="text-xs text-muted-foreground">
            Click &ldquo;Save&rdquo; to import your trades
          </p>
        </div>
      </div>
    </div>
  )
}

export default MatchTraderProcessor