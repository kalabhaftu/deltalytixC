'use client'

import React, { useState, useEffect, useCallback } from "react"
import { format } from "date-fns"
import { enUS } from 'date-fns/locale'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { BarChart3, BookOpen, Edit2, Save, X } from "lucide-react"
import { cn, parsePositionTime, formatCurrency } from "@/lib/utils"
import { Trade } from "@prisma/client"
import { CalendarEntry } from "@/app/dashboard/types/calendar"
import { DailyStats } from "./daily-stats"
import { EmotionPicker, emotions, type EmotionType } from "../journal/emotion-picker"
import { useUserStore } from "@/store/user-store"
import { useData } from "@/context/data-provider"
import { toast } from "sonner"
import { PNL_TEXT_STYLES } from "@/app/dashboard/constants/calendar-styles"

interface CalendarModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: Date | null;
  dayData: CalendarEntry | undefined;
  isLoading: boolean;
}

export function CalendarModal({
  isOpen,
  onOpenChange,
  selectedDate,
  dayData,
  isLoading,
}: CalendarModalProps) {
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
      setFormattedDate(format(selectedDate, 'EEEE, MMMM d, yyyy', { locale: dateLocale }))
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
          setIsEditMode(false)
        } else {
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

  useEffect(() => {
    if (isOpen && selectedDate) {
      setHasLoadedJournal(false)
    }
  }, [isOpen, selectedDate])

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
        const response = await fetch(`/api/journal/daily/${journalId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ note, emotion: selectedEmotion }),
        })
        if (!response.ok) throw new Error('Failed to update journal')
        toast.success('Journal updated successfully')
      } else {
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

  // Safe Close Logic
  const [showUnsavedAlert, setShowUnsavedAlert] = useState(false)
  const [initialNote, setInitialNote] = useState('')
  const [initialEmotion, setInitialEmotion] = useState<EmotionType | null>(null)

  // Update initial state when data is loaded/saved
  useEffect(() => {
    if (hasLoadedJournal) {
      // If we just loaded, current note/emotion are the initial values
      setInitialNote(note)
      setInitialEmotion(selectedEmotion)
    }
  }, [hasLoadedJournal]) // Only on load. For saves, we handle in handleSaveJournal

  const handleCloseAttempt = (open: boolean) => {
    if (!open) {
      const hasUnsavedChanges = note !== initialNote || selectedEmotion !== initialEmotion
      if (hasUnsavedChanges && isEditMode) { // Only check if in edit mode
        setShowUnsavedAlert(true)
      } else {
        onOpenChange(false)
      }
    } else {
      onOpenChange(true)
    }
  }

  // Update save handler to sync initial state
  const handleSaveJournalWrapped = async () => {
    await handleSaveJournal()
    // handleSaveJournal sets hasExistingJournal=true and isEditMode=false on success
    // We should also update initial state to match current, so if they edit again, baseline is new data
    setInitialNote(note)
    setInitialEmotion(selectedEmotion)
  }

  if (!selectedDate) return null

  const tradesForDay = dayData?.trades || []

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleCloseAttempt}>
        <DialogContent className="max-w-4xl w-full h-[100dvh] sm:h-[90vh] p-0 flex flex-col overflow-hidden">
          {/* Header - Simple */}
          <div className="flex items-center justify-between p-4 border-b bg-card">
            <div>
              <DialogTitle className="text-lg font-bold">{formattedDate}</DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                Daily performance overview
              </DialogDescription>
            </div>
          </div>

          <Tabs defaultValue="trades" onValueChange={handleTabChange} className="flex-1 flex flex-col overflow-hidden">
            <div className="px-4 border-b">
              <TabsList className="h-10 bg-transparent border-0 p-0 gap-1">
                <TabsTrigger value="trades" className="data-[state=active]:bg-muted rounded-md px-3 py-1.5 text-sm gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Trades & Stats
                </TabsTrigger>
                <TabsTrigger value="journal" className="data-[state=active]:bg-muted rounded-md px-3 py-1.5 text-sm gap-2">
                  <BookOpen className="h-4 w-4" />
                  Journal
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Trades Tab */}
            <TabsContent value="trades" className="flex-1 overflow-auto m-0 px-4 pb-4">
              <ScrollArea className="h-full">
                <div className="space-y-4 py-4">
                  <DailyStats dayData={dayData} isWeekly={false} />

                  {/* Trades Table */}
                  {tradesForDay.length > 0 ? (
                    <div className="rounded-lg border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/30">
                            <TableHead className="font-semibold">Instrument</TableHead>
                            <TableHead className="font-semibold">Side</TableHead>
                            <TableHead className="text-right font-semibold">P&L</TableHead>
                            <TableHead className="text-right font-semibold">Duration</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {tradesForDay.map((trade) => (
                            <TableRow key={trade.id} className="cursor-pointer hover:bg-muted/50">
                              <TableCell>
                                <div className="flex flex-col">
                                  <span className="font-bold">{trade.instrument}</span>
                                  <span className="text-xs text-muted-foreground">{trade.entryTime ? format(new Date(trade.entryTime), 'HH:mm') : '-'}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant={trade.side === 'BUY' ? 'default' : 'destructive'} className={cn("text-[10px] uppercase", trade.side === "BUY" ? "bg-long hover:bg-long/90" : "bg-short hover:bg-short/90")}>
                                  {trade.side}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <span className={cn("font-mono font-bold", (trade.pnl - (trade.commission || 0)) >= 0 ? "text-long" : "text-short")}>
                                  {formatCurrency(trade.pnl - (trade.commission || 0))}
                                </span>
                              </TableCell>
                              <TableCell className="text-right">
                                {parsePositionTime(trade.timeInPosition)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center space-y-3 border rounded-lg border-dashed bg-muted/5">
                      <div className="p-3 bg-muted rounded-full">
                        <BarChart3 className="w-6 h-6 text-muted-foreground" />
                      </div>
                      <div className="space-y-1">
                        <p className="font-medium">No trades recorded</p>
                        <p className="text-sm text-muted-foreground">No trades found for this day.</p>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Journal Tab */}
            <TabsContent value="journal" className="flex-1 overflow-auto m-0 px-4 pb-4">
              {isLoadingJournal ? (
                <div className="flex flex-col gap-4 p-4 min-h-[200px]">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-10 w-10 rounded-full" />)}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-24 w-full rounded-lg" />
                  </div>
                  <Skeleton className="h-10 w-full rounded-lg" />
                </div>
              ) : (
                <ScrollArea className="h-full">
                  <div className="space-y-4 py-4">
                    {/* View Mode */}
                    {!isEditMode && hasExistingJournal && (
                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between py-3 px-4">
                          <CardTitle className="text-sm font-semibold">Your Journal Entry</CardTitle>
                          <Button
                            onClick={() => setIsEditMode(true)}
                            variant="outline"
                            size="sm"
                            className="gap-2"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                            Edit
                          </Button>
                        </CardHeader>
                        <CardContent className="space-y-3 px-4 pb-4">
                          {selectedEmotion && (
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Emotion</p>
                              <div className="flex items-center gap-2">
                                {(() => {
                                  const emotion = emotions.find(e => e.id === selectedEmotion)
                                  if (!emotion) return null
                                  const Icon = emotion.icon
                                  return (
                                    <>
                                      <Icon className={cn("h-4 w-4", emotion.color)} />
                                      <span className="text-sm font-medium">{emotion.label}</span>
                                    </>
                                  )
                                })()}
                              </div>
                            </div>
                          )}
                          {note && (
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Notes</p>
                              <div className="text-sm whitespace-pre-wrap bg-muted/30 rounded-lg p-3">
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
                        <CardHeader className="flex flex-row items-center justify-between py-3 px-4">
                          <CardTitle className="text-sm font-semibold">
                            {hasExistingJournal ? 'Edit Journal Entry' : 'Create Journal Entry'}
                          </CardTitle>
                          {hasExistingJournal && (
                            <Button
                              onClick={() => {
                                // Reset to initial values on cancel
                                setNote(initialNote)
                                setSelectedEmotion(initialEmotion)
                                setIsEditMode(false)
                              }}
                              variant="ghost"
                              size="sm"
                              className="gap-2"
                            >
                              <X className="h-3.5 w-3.5" />
                              Cancel
                            </Button>
                          )}
                        </CardHeader>
                        <CardContent className="space-y-4 px-4 pb-4">
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
                              placeholder="Reflect on today's trading..."
                              className="min-h-[120px] resize-none"
                            />
                          </div>

                          <Button
                            onClick={handleSaveJournalWrapped}
                            disabled={isSaving || (!note.trim() && !selectedEmotion)}
                            className="w-full gap-2"
                          >
                            {isSaving ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
                                Saving...
                              </>
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

      <AlertDialog open={showUnsavedAlert} onOpenChange={setShowUnsavedAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes in your journal entry. Are you sure you want to discard them?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Editing</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowUnsavedAlert(false)
                // Reset to initial values
                setNote(initialNote)
                setSelectedEmotion(initialEmotion)
                onOpenChange(false)
              }}
              className="bg-destructive hover:bg-destructive/90"
            >
              Discard Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
