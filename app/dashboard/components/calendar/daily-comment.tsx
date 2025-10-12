'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { CalendarEntry } from "@/app/dashboard/types/calendar"

interface DailyCommentProps {
  dayData: CalendarEntry | undefined
  selectedDate: Date | null
}

export function DailyComment({ dayData, selectedDate }: DailyCommentProps) {
  const [comment, setComment] = React.useState<string>("")
  const [isSavingComment, setIsSavingComment] = React.useState(false)
  const [isEditing, setIsEditing] = React.useState(false)
  const [hasExistingNote, setHasExistingNote] = React.useState(false)
  const [isLoadingNote, setIsLoadingNote] = React.useState(true)

  // Ensure we have a valid Date object
  const validDate = selectedDate && selectedDate instanceof Date ? selectedDate : new Date()

  // Load comment from database on mount
  React.useEffect(() => {
    if (!validDate) return
    
    setIsLoadingNote(true)
    const fetchComment = async () => {
      try {
        const response = await fetch('/api/calendar/notes')
        if (response.ok) {
          const data = await response.json()
          const dateKey = validDate.toISOString().split('T')[0]
          const note = data.notes.find((n: any) => {
            const noteDate = new Date(n.date).toISOString().split('T')[0]
            return noteDate === dateKey
          })
          const noteContent = note?.note || ''
          setComment(noteContent)
          setHasExistingNote(noteContent.trim().length > 0)
          setIsEditing(noteContent.trim().length === 0) // Start in edit mode if no note exists
        }
      } catch (error) {
        console.error('Error loading comment:', error)
        setIsEditing(true) // Default to edit mode on error
      } finally {
        setIsLoadingNote(false)
      }
    }
    
    fetchComment()
  }, [validDate])

  const handleSaveComment = async () => {
    if (!validDate) return
    
    setIsSavingComment(true)
    
    try {
      const dateKey = validDate.toISOString().split('T')[0]
      
      const response = await fetch('/api/calendar/notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date: dateKey,
          note: comment,
        }),
      })

      if (response.ok) {
        toast.success("Success", {
          description: 'Note saved successfully',
        })
        // Trigger a refresh of the calendar to update the icon
        window.dispatchEvent(new CustomEvent('notesSaved'))
        // Exit edit mode and update state
        setIsEditing(false)
        setHasExistingNote(comment.trim().length > 0)
      } else {
        throw new Error('Failed to save note')
      }
    } catch (error) {
      console.error('Error saving comment:', error)
      toast.error("Error", {
        description: 'Failed to save note',
      })
    } finally {
      setIsSavingComment(false)
    }
  }
  
  // Don't render if no valid date
  if (!selectedDate) return null

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-medium">
              Daily Notes
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              {isEditing ? 'Add your trading notes for' : 'Your trading notes for'} {validDate.toLocaleDateString()}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoadingNote ? (
          <div className="min-h-[120px] flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : isEditing ? (
          <>
            <div className="space-y-2">
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Add your daily trading notes here..."
                className="min-h-[120px] resize-none"
              />
            </div>
            
            <div className="flex justify-end gap-2">
              {hasExistingNote && (
                <Button
                  onClick={() => {
                    setIsEditing(false)
                    // Reset to original comment if canceling
                    const fetchComment = async () => {
                      const response = await fetch('/api/calendar/notes')
                      if (response.ok) {
                        const data = await response.json()
                        const dateKey = validDate.toISOString().split('T')[0]
                        const note = data.notes.find((n: any) => {
                          const noteDate = new Date(n.date).toISOString().split('T')[0]
                          return noteDate === dateKey
                        })
                        setComment(note?.note || '')
                      }
                    }
                    fetchComment()
                  }}
                  variant="outline"
                  size="sm"
                  className="min-w-[80px]"
                >
                  Cancel
                </Button>
              )}
              <Button
                onClick={handleSaveComment}
                disabled={isSavingComment}
                size="sm"
                className="min-w-[80px]"
              >
                {isSavingComment ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Save'
                )}
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="min-h-[120px] p-3 rounded-md border bg-muted/50 whitespace-pre-wrap">
              {comment || 'No notes added yet.'}
            </div>
            
            <div className="flex justify-end">
              <Button
                onClick={() => setIsEditing(true)}
                variant="outline"
                size="sm"
                className="min-w-[80px]"
              >
                Edit
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}