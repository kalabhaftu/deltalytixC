'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { CalendarEntry } from "@/app/dashboard/types/calendar"

interface DailyCommentProps {
  dayData: CalendarEntry | undefined
  selectedDate: Date
}

export function DailyComment({ dayData, selectedDate }: DailyCommentProps) {
  const { toast } = useToast()
  const [comment, setComment] = React.useState<string>("")
  const [isSavingComment, setIsSavingComment] = React.useState(false)

  // Load comment from localStorage on mount
  React.useEffect(() => {
    const dateKey = selectedDate.toISOString().split('T')[0]
    const storageKey = `daily_comment_${dateKey}`
    const storedComment = localStorage.getItem(storageKey)
    if (storedComment) {
      setComment(storedComment)
    } else {
      setComment('')
    }
  }, [selectedDate])

  const handleSaveComment = async () => {
    setIsSavingComment(true)
    
    try {
      // Save to localStorage (server functionality removed)
      const dateKey = selectedDate.toISOString().split('T')[0]
      const storageKey = `daily_comment_${dateKey}`
      localStorage.setItem(storageKey, comment)

      toast({
        title: "Success",
        description: 'Comment saved locally',
      })
    } catch (error) {
      console.error('Error saving comment:', error)
      toast({
        title: "Error",
        description: 'Failed to save comment',
        variant: "destructive",
      })
    } finally {
      setIsSavingComment(false)
    }
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-medium">
              Daily Notes
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              Add your trading notes for {selectedDate.toLocaleDateString()}
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