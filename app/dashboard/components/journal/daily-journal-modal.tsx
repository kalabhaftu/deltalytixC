'use client'

import { useEffect, useState, useCallback } from 'react'
import { format } from 'date-fns'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { EmotionPicker, EmotionType, getEmotionIcon } from './emotion-picker'
import { toast } from 'sonner'
import { Loader2, BookOpen, Save, X } from 'lucide-react'
import { cn, formatCurrency, BREAK_EVEN_THRESHOLD } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface Trade {
  id: string
  instrument: string
  side: string
  pnl: number
  entryDate: string
  comment?: string
}

interface DailyJournal {
  id?: string
  date: string
  note: string
  emotion?: EmotionType | null
  accountId?: string | null
}

interface DailyJournalModalProps {
  isOpen: boolean
  onClose: () => void
  selectedDate: Date | null
  accountId?: string | null
  existingJournal?: DailyJournal | null
  trades?: Trade[]
}

export function DailyJournalModal({
  isOpen,
  onClose,
  selectedDate,
  accountId,
  existingJournal,
  trades = []
}: DailyJournalModalProps) {
  const [note, setNote] = useState('')
  const [emotion, setEmotion] = useState<EmotionType | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [showConfirmClose, setShowConfirmClose] = useState(false)

  // Load existing journal data
  useEffect(() => {
    if (isOpen && selectedDate) {
      setIsLoading(true)
      fetchJournalData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, selectedDate, accountId])

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setNote('')
      setEmotion(null)
      setHasChanges(false)
      setShowConfirmClose(false)
    }
  }, [isOpen])

  // Track changes
  useEffect(() => {
    if (existingJournal) {
      const changed =
        note !== (existingJournal.note || '') ||
        emotion !== (existingJournal.emotion || null)
      setHasChanges(changed)
    } else {
      setHasChanges(note.trim() !== '' || emotion !== null)
    }
  }, [note, emotion, existingJournal])

  const fetchJournalData = async () => {
    if (!selectedDate) return

    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd')
      const params = new URLSearchParams({
        date: dateStr,
        ...(accountId && { accountId })
      })

      const response = await fetch(`/api/journal/daily?${params}`)

      if (response.ok) {
        const data = await response.json()
        if (data.journal) {
          setNote(data.journal.note || '')
          setEmotion(data.journal.emotion || null)
        }
      }
    } catch (error) {
      // Error fetching journal
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    if (!selectedDate) return

    setIsSaving(true)

    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd')
      const journalData = {
        date: dateStr,
        note: note.trim(),
        emotion: emotion || null,
        accountId: accountId || null
      }

      const method = existingJournal?.id ? 'PUT' : 'POST'
      const url = existingJournal?.id
        ? `/api/journal/daily/${existingJournal.id}`
        : '/api/journal/daily'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(journalData)
      })

      if (!response.ok) throw new Error('Failed to save journal')

      toast.success('Journal saved successfully')
      setHasChanges(false)
      onClose()
    } catch (error) {
      toast.error('Failed to save journal entry')
    } finally {
      setIsSaving(false)
    }
  }

  const handleClose = () => {
    if (hasChanges) {
      setShowConfirmClose(true)
    } else {
      onClose()
    }
  }

  const confirmClose = () => {
    setShowConfirmClose(false)
    onClose()
  }

  const cancelClose = () => {
    setShowConfirmClose(false)
  }

  if (!selectedDate) return null

  const formattedDate = format(selectedDate, 'EEEE, MMMM d, yyyy')
  const totalPnL = trades.reduce((sum, trade) => sum + trade.pnl, 0)
  const winningTrades = trades.filter(t => t.pnl > BREAK_EVEN_THRESHOLD).length
  const losingTrades = trades.filter(t => t.pnl < -BREAK_EVEN_THRESHOLD).length
  const selectedEmotionData = getEmotionIcon(emotion)

  return (
    <>
      <Dialog open={isOpen && !showConfirmClose} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              <DialogTitle>Daily Journal</DialogTitle>
            </div>
            <DialogDescription className="text-base font-medium">
              {formattedDate}
            </DialogDescription>
          </DialogHeader>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Trades Summary */}
              {trades.length > 0 && (
                <Card>
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold">Trading Summary</h4>
                        <div className="flex items-center gap-2">
                          <Badge variant={totalPnL >= 0 ? 'default' : 'destructive'} className="text-xs">
                            {totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(2)}
                          </Badge>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="text-center p-2 rounded-md bg-muted/50">
                          <div className="text-muted-foreground">Total Trades</div>
                          <div className="text-lg font-semibold mt-1">{trades.length}</div>
                        </div>
                        <div className="text-center p-2 rounded-md bg-green-500/10">
                          <div className="text-muted-foreground">Winners</div>
                          <div className="text-lg font-semibold mt-1 text-green-600 dark:text-green-400">
                            {winningTrades}
                          </div>
                        </div>
                        <div className="text-center p-2 rounded-md bg-red-500/10">
                          <div className="text-muted-foreground">Losers</div>
                          <div className="text-lg font-semibold mt-1 text-red-600 dark:text-red-400">
                            {losingTrades}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {trades.map((trade) => (
                          <div
                            key={trade.id}
                            className="flex items-center justify-between p-2 rounded-md bg-muted/30 text-xs"
                          >
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-[10px]">
                                {trade.side}
                              </Badge>
                              <span className="font-medium">{trade.instrument}</span>
                            </div>
                            <span className={cn(
                              "font-semibold",
                              trade.pnl >= 0
                                ? "text-green-600 dark:text-green-400"
                                : "text-red-600 dark:text-red-400"
                            )}>
                              {trade.pnl >= 0 ? '+' : ''}${trade.pnl.toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Emotion Picker */}
              <EmotionPicker
                selectedEmotion={emotion}
                onChange={setEmotion}
              />

              {/* Journal Note */}
              <div className="space-y-2">
                <label htmlFor="journal-note" className="text-sm font-medium">
                  Journal Entry
                </label>
                <Textarea
                  id="journal-note"
                  placeholder="What happened today? Any lessons learned, mistakes made, or insights gained?"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="min-h-[200px] resize-none"
                />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {note.length} characters
                  </span>
                  {hasChanges && (
                    <span className="text-orange-600 dark:text-orange-400">
                      • Unsaved changes
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex items-center justify-between sm:justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSaving}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving || !hasChanges}
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Journal
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmClose} onOpenChange={setShowConfirmClose}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Unsaved Changes</DialogTitle>
            <DialogDescription>
              You have unsaved changes in your journal entry. Are you sure you want to close without saving?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={cancelClose}>
              Continue Editing
            </Button>
            <Button variant="destructive" onClick={confirmClose}>
              Discard Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

