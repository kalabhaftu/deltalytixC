'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Database } from "lucide-react"

interface TradeTableProps {
  trades?: any[]
  className?: string
}

export function TradeTable({ trades = [], className }: TradeTableProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Recent Trades
        </CardTitle>
      </CardHeader>
      <CardContent>
        {trades.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Symbol</TableHead>
                <TableHead>Side</TableHead>
                <TableHead>P&L</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trades.slice(0, 5).map((trade, index) => (
                <TableRow key={index}>
                  <TableCell>{trade.symbol || trade.instrument || 'N/A'}</TableCell>
                  <TableCell>{trade.side || 'N/A'}</TableCell>
                  <TableCell className={trade.pnl >= 0 ? 'text-green-600' : 'text-red-600'}>
                    ${trade.pnl?.toFixed(2) || '0.00'}
                  </TableCell>
                  <TableCell>{trade.entryDate || 'N/A'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="flex items-center justify-center h-32 text-muted-foreground">
            <div className="text-center">
              <Database className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No trades to display</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default TradeTable

