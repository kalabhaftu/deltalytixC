'use client'

import React, { useState, useEffect, useCallback } from "react"
import { format } from "date-fns"
import { enUS } from 'date-fns/locale'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { BarChart3, BookOpen, Edit2, Save, X } from "lucide-react"
import { cn, parsePositionTime, formatCurrency, formatNumber } from "@/lib/utils"
import { Trade } from "@prisma/client"
import { CalendarEntry } from "@/app/dashboard/types/calendar"
import { DailyStats } from "./daily-stats"
import { EmotionPicker, getEmotionIcon, emotions, type EmotionType } from "../journal/emotion-picker"
import { useUserStore } from "@/store/user-store"
import { useData } from "@/context/data-provider"
import { toast } from "sonner"

interface CalendarModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: Date | null;
  dayData: CalendarEntry | undefined;
  isLoading: boolean;
}

interface GroupedTrades {
  [accountNumber: string]: Trade[];
}

function groupTradesByAccount(trades: Trade[]): GroupedTrades {
  return trades.reduce((acc: GroupedTrades, trade) => {
    const account = trade.accountNumber || 'Unknown Account';
    if (!acc[account]) {
      acc[account] = [];
    }
    acc[account].push(trade);
    return acc;
  }, {});
}

export function CalendarModal({
  isOpen,
  onOpenChange,
  selectedDate,
  dayData,
  isLoading,
}: CalendarModalProps) {
  const locale = 'en'
  const timezone = useUserStore(state => state.timezone)
  const dateLocale = enUS
  const [formattedDate, setFormattedDate] = useState<string>("")
  const { accounts } = useData()
  
  // Journal state
  const [note, setNote] = useState('')
  const [selectedEmotion, setSelectedEmotion] = useState<EmotionType | null>(null)
  const [isEditMode, setIsEditMode] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoadingJournal, setIsLoadingJournal] = useState(false)
  const [journalId, setJournalId] = useState<string | null>(null)
  const [hasExistingJournal, setHasExistingJournal] = useState(false)
  const [hasLoadedJournal, setHasLoadedJournal] = useState(false)

  const currentAccountId = accounts && accounts.length === 1 ? accounts[0].id : null

  React.useEffect(() => {
    if (selectedDate) {
      setFormattedDate(format(selectedDate, 'MMMM d, yyyy', { locale: dateLocale }))
    }
  }, [selectedDate, dateLocale])

  const fetchJournalData = useCallback(async () => {
    if (!selectedDate || hasLoadedJournal) return

    setIsLoadingJournal(true)
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd')
      const params = new URLSearchParams({ date: dateStr })
      if (currentAccountId) {
        params.append('accountId', currentAccountId)
      }

      const response = await fetch(`/api/journal/daily?${params}`)
      if (response.ok) {
        const data = await response.json()
        if (data.journal) {
          setNote(data.journal.note || '')
          setSelectedEmotion(data.journal.emotion || null)
          setJournalId(data.journal.id)
          setHasExistingJournal(true)
          setIsEditMode(false) // Start in view mode if journal exists
        } else {
          // No journal exists, start in edit mode
          setNote('')
          setSelectedEmotion(null)
          setJournalId(null)
          setHasExistingJournal(false)
          setIsEditMode(true)
        }
        setHasLoadedJournal(true)
      }
    } catch (error) {
      // Error fetching journal
    } finally {
      setIsLoadingJournal(false)
    }
  }, [selectedDate, currentAccountId, hasLoadedJournal])

  // Reset journal state when modal opens with new date
  useEffect(() => {
    if (isOpen && selectedDate) {
      setHasLoadedJournal(false)
    }
  }, [isOpen, selectedDate])

  // Fetch journal data only when switching to journal tab
  const handleTabChange = (value: string) => {
    if (value === 'journal' && !hasLoadedJournal) {
      fetchJournalData()
    }
  }

  const handleSaveJournal = async () => {
    if (!selectedDate) return

    setIsSaving(true)
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd')

      if (journalId) {
        // Update existing journal
        const response = await fetch(`/api/journal/daily/${journalId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            note,
            emotion: selectedEmotion,
          }),
        })

        if (!response.ok) throw new Error('Failed to update journal')
        toast.success('Journal updated successfully')
      } else {
        // Create new journal
        const response = await fetch('/api/journal/daily', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date: dateStr,
            note,
            emotion: selectedEmotion,
            accountId: currentAccountId,
          }),
        })

        if (!response.ok) throw new Error('Failed to save journal')
        const data = await response.json()
        setJournalId(data.journal.id)
        setHasExistingJournal(true)
        toast.success('Journal saved successfully')
      }

      setIsEditMode(false)
    } catch (error) {
      toast.error('Failed to save journal')
    } finally {
      setIsSaving(false)
    }
  }

  if (!selectedDate) return null;

  const tradesForDay = dayData?.trades || []

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-full h-[100dvh] sm:h-[90vh] p-0 flex flex-col">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle>{formattedDate}</DialogTitle>
          <DialogDescription>
            Daily performance overview with statistics, trades, and journal
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="trades" onValueChange={handleTabChange} className="flex-1 flex flex-col overflow-hidden">
          <div className="px-6 pb-4">
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="trades" className="gap-2">
                <BarChart3 className="h-4 w-4" />
                Trades & Stats
              </TabsTrigger>
              <TabsTrigger value="journal" className="gap-2">
                <BookOpen className="h-4 w-4" />
                Journal
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Trades Tab */}
          <TabsContent value="trades" className="flex-1 overflow-auto m-0 px-6 pb-6">
            <ScrollArea className="h-full">
              <div className="space-y-6">
                <DailyStats dayData={dayData} isWeekly={false} />

                {/* Trades Table */}
                {tradesForDay.length > 0 && (
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Instrument</TableHead>
                          <TableHead>Side</TableHead>
                          <TableHead className="text-right">P&L</TableHead>
                          <TableHead className="text-right">Time</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {tradesForDay.map((trade: Trade) => (
                          <TableRow key={trade.id}>
                            <TableCell className="font-medium">{trade.instrument}</TableCell>
                            <TableCell>
                              <span className={cn(
                                'inline-flex items-center px-2 py-1 rounded text-xs font-medium',
                                trade.side === 'BUY' ? 'bg-green-500/10 text-green-600 dark:text-green-400' : 'bg-red-500/10 text-red-600 dark:text-red-400'
                              )}>
                                {trade.side || 'UNKNOWN'}
                              </span>
                            </TableCell>
                            <TableCell className={cn(
                              'text-right font-medium',
                              (trade.pnl - (trade.commission || 0)) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                            )}>
                              {formatCurrency(trade.pnl - (trade.commission || 0))}
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground text-sm">
                              {parsePositionTime(trade.timeInPosition)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Journal Tab */}
          <TabsContent value="journal" className="flex-1 overflow-auto m-0 px-6 pb-6">
            {isLoadingJournal ? (
              <div className="flex items-center justify-center h-full min-h-[300px]">
                <div className="text-center space-y-2">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="text-sm text-muted-foreground">Loading journal...</p>
                </div>
              </div>
            ) : (
              <ScrollArea className="h-full">
                <div className="space-y-4">
                {/* Trades Summary for Context */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Trades Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Total: </span>
                        <span className="font-medium">{tradesForDay.length}</span>
                      </div>
                       <div>
                         <span className="text-muted-foreground">P&L: </span>
                         <span className={cn(
                           "font-medium",
                           (dayData?.pnl || 0) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                         )}>
                           {formatCurrency(dayData?.pnl || 0)}
                         </span>
                       </div>
                    </div>
                  </CardContent>
                </Card>

                {/* View Mode */}
                {!isEditMode && hasExistingJournal && (
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle className="text-sm">Your Journal Entry</CardTitle>
                      <Button
                        onClick={() => setIsEditMode(true)}
                        variant="outline"
                        size="sm"
                        className="gap-2"
                      >
                        <Edit2 className="h-3 w-3" />
                        Edit
                      </Button>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {selectedEmotion && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-2">Emotion</p>
                          <div className="flex items-center gap-2">
                           {(() => {
                             const emotion = emotions.find(e => e.id === selectedEmotion)
                             if (!emotion) return null
                             const Icon = emotion.icon
                             return (
                               <>
                                 <Icon className={cn("h-5 w-5", emotion.color)} />
                                 <span className="text-sm font-medium">{emotion.label}</span>
                               </>
                             )
                           })()}
                          </div>
                        </div>
                      )}
                      {note && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-2">Notes</p>
                          <div className="text-sm whitespace-pre-wrap bg-muted/30 rounded-md p-3">
                            {note}
                          </div>
                        </div>
                      )}
                      {!note && !selectedEmotion && (
                        <p className="text-sm text-muted-foreground">No journal entry yet.</p>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Edit Mode */}
                {isEditMode && (
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle className="text-sm">
                        {hasExistingJournal ? 'Edit Journal Entry' : 'Create Journal Entry'}
                      </CardTitle>
                      {hasExistingJournal && (
                        <Button
                          onClick={() => setIsEditMode(false)}
                          variant="ghost"
                          size="sm"
                          className="gap-2"
                        >
                          <X className="h-3 w-3" />
                          Cancel
                        </Button>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">How did you feel?</label>
                        <EmotionPicker
                          selectedEmotion={selectedEmotion}
                          onChange={setSelectedEmotion}
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-2 block">Your Notes</label>
                        <Textarea
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                          placeholder="Reflect on today's trading... What went well? What could be improved?"
                          className="min-h-[200px] resize-none"
                        />
                      </div>

                      <Button
                        onClick={handleSaveJournal}
                        disabled={isSaving || (!note.trim() && !selectedEmotion)}
                        className="w-full gap-2"
                      >
                        {isSaving ? (
                          <>Saving...</>
                        ) : (
                          <>
                            <Save className="h-4 w-4" />
                            Save Journal
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                 )}
               </div>
             </ScrollArea>
            )}
           </TabsContent>
         </Tabs>
      </DialogContent>
    </Dialog>
  )
}

