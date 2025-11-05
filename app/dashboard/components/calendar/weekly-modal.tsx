'use client'

import React, { useState } from "react"
import { format, startOfWeek, endOfWeek } from "date-fns"
import { enUS } from 'date-fns/locale'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CalendarData } from "@/app/dashboard/types/calendar"
import { Charts } from "./charts"
import { Trade } from '@prisma/client'
import { groupTradesByExecution } from '@/lib/utils'

interface WeeklyModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: Date | null;
  calendarData: CalendarData;
  isLoading: boolean;
}

export function WeeklyModal({
  isOpen,
  onOpenChange,
  selectedDate,
  calendarData,
  isLoading,
}: WeeklyModalProps) {
  const locale = 'en' // Default to English since i18n was removed
  const dateLocale = enUS
  const [activeTab, setActiveTab] = useState("charts")

  // Aggregate weekly data
  const weeklyData = React.useMemo(() => {
    if (!selectedDate) return { trades: [], tradeNumber: 0, pnl: 0, longNumber: 0, shortNumber: 0 }

    const trades: any[] = []
    let weekStart = startOfWeek(selectedDate)
    let weekEnd = endOfWeek(selectedDate)

    // Collect all trades for the week
    for (const [dateString, dayData] of Object.entries(calendarData)) {
      const date = new Date(dateString)
      if (date >= weekStart && date <= weekEnd && dayData.trades) {
        trades.push(...(dayData.trades as any[]))
      }
    }

    // CRITICAL: Group trades to show correct execution count
    const groupedTrades = groupTradesByExecution(trades)

    // Calculate long and short numbers from grouped trades
    const longNumber = groupedTrades.filter(trade => trade.side?.toLowerCase() === 'long' || trade.side?.toUpperCase() === 'BUY').length
    const shortNumber = groupedTrades.filter(trade => trade.side?.toLowerCase() === 'short' || trade.side?.toUpperCase() === 'SELL').length

    return {
      trades: groupedTrades,
      tradeNumber: groupedTrades.length,
      pnl: groupedTrades.reduce((sum, trade) => sum + trade.pnl, 0),
      longNumber,
      shortNumber,
    }
  }, [selectedDate, calendarData])

  if (!selectedDate || !isOpen) return null;

  // Get start and end of week
  const weekStart = startOfWeek(selectedDate)
  const weekEnd = endOfWeek(selectedDate)
  const dateRange = `${format(weekStart, 'MMMM d', { locale: dateLocale })} - ${format(weekEnd, 'MMMM d, yyyy', { locale: dateLocale })}`

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-full h-[100dvh] sm:h-[90vh] p-0 flex flex-col">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle>{dateRange}</DialogTitle>
          <DialogDescription>
            Detailed analysis for the selected week
          </DialogDescription>
        </DialogHeader>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-grow flex flex-col overflow-hidden">
          <TabsList className="px-6 bg-background border border-border rounded-md">
            <TabsTrigger 
              value="charts"
              className="data-[state=active]:bg-muted data-[state=active]:shadow-sm hover:bg-muted/50"
            >
              Charts
            </TabsTrigger>
          </TabsList>
          <TabsContent value="charts" className="flex-grow overflow-auto p-6 pt-2">
            <Charts dayData={weeklyData} isWeekly={true} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
} 