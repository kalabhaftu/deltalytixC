'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { toast } from 'sonner'
import { Trade } from '@prisma/client'
import { generateTradeHash } from '@/lib/utils'
import { useUserStore } from '@/store/user-store'
import { v4 as uuidv4 } from 'uuid'

interface TradezellaProcessorProps {
  headers: string[];
  csvData: string[][];
  setProcessedTrades: React.Dispatch<React.SetStateAction<Trade[]>>;
}

const newMappings: { [key: string]: string } = {
  "Account Name": "accountNumber",
  "Close Date": "closeDate",
  "Close Time": "closeTime",
  "Commission": "commission",
  "Duration": "timeInPosition",
  "Entry Price": "entryPrice",
  "Open Date": "entryDate",
  "Open Time": "entryTime",
  "Exit Price": "closePrice",
  "Fee": "commission",
  "Gross P&L": "pnl",
  "Instrument": "instrument",
  "Quantity": "quantity",
  "Side": "side",
  "Symbol": "instrument",
  "Adjusted Cost": "entryId",
  "Adjusted Proceeds": "closeId",
}



export default function TradezellaProcessor({ headers, csvData, setProcessedTrades }: TradezellaProcessorProps) {
  const [trades, setTrades] = useState<Trade[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const user = useUserStore(state => state.user)
  const supabaseUser = useUserStore(state => state.supabaseUser)



  // Account Name: "accountNumber"
  // Close Date: "closeDate"
  // Commission: "commission"
  // Duration: "timeInPosition"
  // Entry Price: "entryPrice"
  // Exit Price: "closePrice"
  // Fee: "commission"
  // Gross P&L: "pnl"
  // Instrument: "instrument"
  // Open Date: "entryDate"
  // Quantity: "quantity"
  // Side: "side"
  // Symbol: "instrument"
  // Adjusted Cost: "entryId"
  // Adjusted Proceeds: "closeId"
  const processTrades = useCallback(async () => {
    const currentUser = user || supabaseUser
    if (!currentUser?.id) {
      return
    }

    setIsProcessing(true)
    const newTrades: Trade[] = [];
    //TODO: Ask user for account number using account selection component
    const accountNumber = 'default-account';

    csvData.forEach(row => {
      const item: Partial<Trade> = {};
      let quantity = 0;
      let entryTime = '';
      let closeTime = '';
      headers.forEach((header, index) => {
        if (newMappings[header]) {
          const key = newMappings[header];
          const cellValue = row[index];
          switch (key) {
            case 'entryTime':
              entryTime = cellValue as any;
              break;
            case 'closeTime':
              closeTime = cellValue as any;
              break;
            case 'pnl':
              item.pnl = parseFloat(cellValue)
              break;
            case 'commission':
              item.commission = parseFloat(cellValue)
              break;
            case 'quantity':
              item.quantity = parseFloat(cellValue)
              break;
            case 'timeInPosition':
              item.timeInPosition = parseFloat(cellValue)
              break;
            default:
              item[key as keyof Trade] = cellValue as any;
          }
        }
      });
      // If item contains undefined values then skip the row
      if (Object.values(item).some(value => value === undefined)) {
        return
      }


      // Compute entryDate and closeDate with the time from entryTime and closeTime
      if (entryTime && closeTime) {
        item.entryDate = new Date(`${item.entryDate} ${entryTime.slice(0, 8)}`).toISOString();
        item.closeDate = new Date(`${item.closeDate} ${closeTime.slice(0, 8)}`).toISOString();
      }

      // Create complete Trade object with all required fields
      const completeTrade: Trade = {
        id: uuidv4(),
        accountNumber: item.accountNumber || accountNumber,
        quantity: item.quantity || 1,
        entryId: item.entryId || null,
        closeId: item.closeId || null,
        instrument: item.instrument || '',
        entryPrice: item.entryPrice || '',
        closePrice: item.closePrice || '',
        entryDate: item.entryDate || '',
        closeDate: item.closeDate || '',
        pnl: item.pnl || 0,
        timeInPosition: item.timeInPosition || 0,
        userId: currentUser.id,
        side: item.side || '',
        commission: item.commission || 0,
        createdAt: new Date(),
        comment: null,
        imageBase64: null,
        imageBase64Second: null,
        imageBase64Third: null,
        imageBase64Fourth: null,
        imageBase64Fifth: null,
        imageBase64Sixth: null,
        cardPreviewImage: null,
        tradingModel: null,
        groupId: null,
        symbol: null,
        entryTime: null,
        exitTime: null,
        phaseAccountId: null, // Will be set by automatic linking during save
        accountId: null,
        closeReason: null,
        stopLoss: null,
        takeProfit: null,
      }

      newTrades.push(completeTrade);
    })

    setTrades(newTrades);
    setProcessedTrades(newTrades);
    setIsProcessing(false);
  }, [csvData, headers, setProcessedTrades, user, supabaseUser]);

  useEffect(() => {
    processTrades();
  }, [processTrades]);

  const totalPnL = useMemo(() => trades.reduce((sum, trade) => sum + (trade.pnl || 0), 0), [trades]);
  const totalCommission = useMemo(() => trades.reduce((sum, trade) => sum + (trade.commission || 0), 0), [trades]);
  const uniqueInstruments = useMemo(() => Array.from(new Set(trades.map(trade => trade.instrument))), [trades]);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold mb-2">Processed Trades</h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Instrument</TableHead>
              <TableHead>Side</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Entry Price</TableHead>
              <TableHead>Close Price</TableHead>
              <TableHead>Entry Date</TableHead>
              <TableHead>Close Date</TableHead>
              <TableHead>PnL</TableHead>
              <TableHead>Time in Position</TableHead>
              <TableHead>Commission</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {trades.map((trade) => (
              <TableRow key={trade.id}>
                <TableCell>{trade.instrument}</TableCell>
                <TableCell>{trade.side}</TableCell>
                <TableCell>{Number(trade.quantity).toFixed(2)}</TableCell>
                <TableCell>{trade.entryPrice}</TableCell>
                <TableCell>{trade.closePrice || '-'}</TableCell>
                <TableCell>{new Date(trade.entryDate).toLocaleString()}</TableCell>
                <TableCell>{trade.closeDate ? new Date(trade.closeDate).toLocaleString() : '-'}</TableCell>
                <TableCell>{trade.pnl?.toFixed(2)}</TableCell>
                <TableCell>{`${Math.floor((trade.timeInPosition || 0) / 60)}m ${Math.floor((trade.timeInPosition || 0) % 60)}s`}</TableCell>
                <TableCell>{trade.commission?.toFixed(2)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="flex justify-between">
        <div>
          <h3 className="text-base font-semibold mb-2">Total PnL</h3>
          <p className={`text-xl font-bold ${totalPnL >= 0 ? 'text-green-600 dark:text-green-400' : 'text-destructive'}`}>
            {totalPnL.toFixed(2)}
          </p>
        </div>
        <div>
          <h3 className="text-base font-semibold mb-2">Total Commission</h3>
          <p className="text-xl font-bold text-foreground">
            {totalCommission.toFixed(2)}
          </p>
        </div>
      </div>
      <div>
        <h3 className="text-lg font-semibold mb-2">Instruments Traded</h3>
        <div className="flex flex-wrap gap-2">
          {uniqueInstruments.map((instrument) => (
            <Button
              key={instrument}
              variant="outline"
              onClick={() => toast.info("Instrument Information", {
                description: `You traded ${instrument}. For more details, please check the trades table.`
              })}
            >
              {instrument}
            </Button>
          ))}
        </div>
      </div>
    </div>
  )
}