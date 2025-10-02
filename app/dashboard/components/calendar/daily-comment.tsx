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

  // Ensure we have a valid Date object
  const validDate = selectedDate && selectedDate instanceof Date ? selectedDate : new Date()

  // Load comment from localStorage on mount
  React.useEffect(() => {
    if (!validDate) return
    
    const dateKey = validDate.toISOString().split('T')[0]
    const storageKey = `daily_comment_${dateKey}`
    const storedComment = localStorage.getItem(storageKey)
    if (storedComment) {
      setComment(storedComment)
    } else {
      setComment('')
    }
  }, [validDate])

  const handleSaveComment = async () => {
    if (!validDate) return
    
    setIsSavingComment(true)
    
    try {
      // Save to localStorage (server functionality removed)
      const dateKey = validDate.toISOString().split('T')[0]
      const storageKey = `daily_comment_${dateKey}`
      localStorage.setItem(storageKey, comment)

      toast.success("Success", {
        description: 'Comment saved locally',
      })
    } catch (error) {
      console.error('Error saving comment:', error)
      toast.error("Error", {
        description: 'Failed to save comment',
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
              Add your trading notes for {validDate.toLocaleDateString()}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Add your daily trading notes here..."
            className="min-h-[120px] resize-none"
          />
        </div>
        
        <div className="flex justify-end">
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
      </CardContent>
    </Card>
  )
}