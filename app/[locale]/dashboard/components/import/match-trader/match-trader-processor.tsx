import { Trade } from '@prisma/client'
import { useEffect } from 'react'
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

  useEffect(() => {
    const processData = () => {
      const currentUser = user || supabaseUser
      if (!currentUser?.id) {
        return
      }

      const trades: Trade[] = csvData.map((row) => {
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

        return {
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
          userId: currentUser.id,
          createdAt: new Date(),
          comment: reason !== 'User' ? reason : null, // Add close reason as comment if not 'User'
          videoUrl: null,
          tags: [],
          imageBase64: null,
          imageBase64Second: null,
          imageBase64Third: null,
          imageBase64Fourth: null,
          groupId: null,
        } as Trade
      }).filter(trade => trade !== null) // Remove invalid trades

      setProcessedTrades(trades)
    }

    processData()
  }, [csvData, headers, setProcessedTrades, accountNumber, user, supabaseUser])

  return null
}

export default MatchTraderProcessor