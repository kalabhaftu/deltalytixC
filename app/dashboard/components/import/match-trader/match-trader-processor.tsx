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

      // Create case-insensitive header lookup helper
      const findHeaderIndex = (possibleNames: string[]) => {
        const normalizedHeaders = headers.map(h => h.toLowerCase().trim())
        for (const name of possibleNames) {
          const index = normalizedHeaders.indexOf(name.toLowerCase().trim())
          if (index !== -1) return index
        }
        return -1
      }

      // Parse date in multiple formats (ISO and DD/MM/YYYY)
      const parseDate = (dateStr: string): Date => {
        if (!dateStr) return new Date()
        
        // Try ISO format first (2025-11-05T14:59:06.38)
        if (dateStr.includes('T')) {
          const date = new Date(dateStr + 'Z') // Add 'Z' to indicate UTC
          if (!isNaN(date.getTime())) return date
        }
        
        // Try DD/MM/YYYY HH:MM:SS format (05/11/2025 14:59:06)
        const ddmmyyyyMatch = dateStr.match(/(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})/)
        if (ddmmyyyyMatch) {
          const [, day, month, year, hour, minute, second] = ddmmyyyyMatch
          // Create UTC date from components
          return new Date(Date.UTC(
            parseInt(year), 
            parseInt(month) - 1, // Month is 0-indexed
            parseInt(day),
            parseInt(hour),
            parseInt(minute),
            parseInt(second)
          ))
        }
        
        // Fallback to direct parsing
        return new Date(dateStr)
      }

      // PERFORMANCE FIX: Calculate header indices ONCE before the loop (not for every row!)
      const openTimeIdx = findHeaderIndex(['Open time', 'Open Time'])
      const closeTimeIdx = findHeaderIndex(['Close time', 'Close Time'])
      const openPriceIdx = findHeaderIndex(['Open price', 'Open Price'])
      const closePriceIdx = findHeaderIndex(['Close Price', 'Close price'])
      const stopLossIdx = findHeaderIndex(['Stop loss', 'Stop Loss'])
      const takeProfitIdx = findHeaderIndex(['Take profit', 'Take Profit'])
      const volumeIdx = findHeaderIndex(['Volume'])
      const profitIdx = findHeaderIndex(['Profit'])
      const commissionIdx = findHeaderIndex(['Commission'])
      const swapIdx = findHeaderIndex(['Swap'])
      const symbolIdx = findHeaderIndex(['Symbol'])
      const sideIdx = findHeaderIndex(['Side'])
      const idIdx = findHeaderIndex(['ID'])
      const reasonIdx = findHeaderIndex(['Reason'])

      for (const row of csvData) {

        // Get values from row
        const entryDateStr = openTimeIdx !== -1 ? row[openTimeIdx] : null
        const closeDateStr = closeTimeIdx !== -1 ? row[closeTimeIdx] : null
        
        if (!entryDateStr || !closeDateStr) {
          continue // Skip invalid rows (not return null!)
        }

        // Parse dates using smart parser
        const entryDate = parseDate(entryDateStr)
        const closeDate = parseDate(closeDateStr)

        // Validate dates
        if (isNaN(entryDate.getTime()) || isNaN(closeDate.getTime())) {
          continue
        }

        // Calculate time in position in seconds
        const timeInPosition = Math.round((closeDate.getTime() - entryDate.getTime()) / 1000)

        // Parse prices and handle potential string/number conversion
        const entryPrice = parseFloat(openPriceIdx !== -1 ? row[openPriceIdx] : '0') || 0
        const closePrice = parseFloat(closePriceIdx !== -1 ? row[closePriceIdx] : '0') || 0
        const quantity = parseFloat(volumeIdx !== -1 ? row[volumeIdx] : '0') || 0
        const pnl = parseFloat(profitIdx !== -1 ? row[profitIdx] : '0') || 0
        const commission = parseFloat(commissionIdx !== -1 ? row[commissionIdx] : '0') || 0
        const swap = parseFloat(swapIdx !== -1 ? row[swapIdx] : '0') || 0
        
        // Parse Stop Loss and Take Profit (treat 0.00 as null/incomplete)
        const stopLossRaw = stopLossIdx !== -1 ? row[stopLossIdx] : null
        const takeProfitRaw = takeProfitIdx !== -1 ? row[takeProfitIdx] : null
        const stopLoss = stopLossRaw && parseFloat(stopLossRaw) !== 0 ? stopLossRaw : null
        const takeProfit = takeProfitRaw && parseFloat(takeProfitRaw) !== 0 ? takeProfitRaw : null

        // Get instrument and side
        const instrument = symbolIdx !== -1 ? row[symbolIdx] : ''
        const side = sideIdx !== -1 ? row[sideIdx] : ''
        const tradeId = idIdx !== -1 ? row[idIdx] : ''
        const reason = reasonIdx !== -1 ? row[reasonIdx] : ''

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
          cardPreviewImage: null,
          tradingModel: null,
          groupId: null,
          tags: null,
          // Prisma optional fields
          symbol: null,
          entryTime: entryDate, // CRITICAL FIX: Set actual entry time
          exitTime: closeDate, // CRITICAL FIX: Set actual exit time for historical breach detection
          accountId: null,
          stopLoss: stopLoss,
          takeProfit: takeProfit,
        } as any

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
