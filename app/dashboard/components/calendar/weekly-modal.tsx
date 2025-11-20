'use client'

import React, { useState, useEffect, useMemo } from "react"
import { format, startOfWeek, endOfWeek } from "date-fns"
import { enUS } from 'date-fns/locale'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { CalendarData } from "@/app/dashboard/types/calendar"
import { groupTradesByExecution } from '@/lib/utils'
import { Button } from "@/components/ui/button"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useSupabaseUpload } from "@/hooks/use-supabase-upload"
import { saveWeeklyReview, getWeeklyReview } from "@/server/weekly-review"
import { useAuth } from "@/context/auth-provider"
import { Loader2, Upload, ImageIcon, TrendingUp, TrendingDown, Activity, CheckCircle2, XCircle, X, Trash2 } from "lucide-react"
import { toast } from "sonner"
import imageCompression from 'browser-image-compression'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { getTradingSession } from '@/lib/time-utils'

interface WeeklyModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: Date | null;
  calendarData: CalendarData;
  isLoading: boolean;
}

type WeeklyExpectation = 'BULLISH_EXPANSION' | 'BEARISH_EXPANSION' | 'CONSOLIDATION'

export function WeeklyModal({
  isOpen,
  onOpenChange,
  selectedDate,
  calendarData,
  isLoading,
}: WeeklyModalProps) {
  const dateLocale = enUS
  const { user } = useAuth()
  const [reviewData, setReviewData] = useState<any>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoadingReview, setIsLoadingReview] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [imageLoadError, setImageLoadError] = useState(false)

  // Generate organized path: userId/week-start-date (YYYY-MM-DD)
  const weekStartDate = selectedDate ? format(startOfWeek(selectedDate), 'yyyy-MM-dd') : ''
  const uploadPath = user?.id ? `${user.id}/${weekStartDate}` : ''

  // Image upload setup - dedicated bucket for weekly calendars
  const { onUpload, files, setFiles, isSuccess: isUploadSuccess, loading: isUploading } = useSupabaseUpload({
    bucketName: 'weekly-calendars',
    path: uploadPath,
    allowedMimeTypes: ['image/*'],
    maxFiles: 1,
    upsert: true
  })

  // Load review data when modal opens
  useEffect(() => {
    if (isOpen && selectedDate) {
      const loadReview = async () => {
        setIsLoadingReview(true)
        const data = await getWeeklyReview(selectedDate)
        setReviewData(data)
        setIsLoadingReview(false)
      }
      loadReview()
    }
  }, [isOpen, selectedDate])

  // Aggregate weekly data
  const weeklyData = useMemo(() => {
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

  // Calculate derived stats
  const stats = useMemo(() => {
    if (weeklyData.trades.length === 0) return null

    const dayStats: Record<string, number> = {}
    const pairStats: Record<string, number> = {}
    const sessionStats: Record<string, number> = {}

    weeklyData.trades.forEach((trade: any) => {
      // Day Stats
      const day = format(new Date(trade.entryDate), 'EEEE')
      const netPnL = trade.pnl - (trade.commission || 0)
      dayStats[day] = (dayStats[day] || 0) + netPnL

      // Pair Stats
      const pair = trade.instrument || 'Unknown'
      pairStats[pair] = (pairStats[pair] || 0) + netPnL

      // Session Stats (proper timezone handling)
      const session = getTradingSession(trade.entryDate)
      sessionStats[session] = (sessionStats[session] || 0) + netPnL
    })

    const sortedDays = Object.entries(dayStats).sort((a, b) => b[1] - a[1])
    const sortedPairs = Object.entries(pairStats).sort((a, b) => b[1] - a[1])
    const sortedSessions = Object.entries(sessionStats).sort((a, b) => b[1] - a[1])

    return {
      bestDay: sortedDays[0],
      worstDay: sortedDays[sortedDays.length - 1],
      bestPair: sortedPairs[0],
      bestSession: sortedSessions[0]
    }
  }, [weeklyData])

  // Handle Image Upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    try {
      toast.loading("Compressing image...", { id: 'image-compress' })
      
      // Compress image to WebP
      const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
        fileType: 'image/webp'
      }
      
      const compressedFile = await imageCompression(file, options)
      const newFile = new File([compressedFile], `weekly-calendar-${Date.now()}.webp`, { type: 'image/webp' })
      
      // Create preview URL from the compressed file
      const preview = URL.createObjectURL(compressedFile)
      setImagePreview(preview)
      setUploadedFile(newFile)
      
      // Prepare file for upload hook
      const fileWithPreview = Object.assign(newFile, {
        preview: preview,
        errors: []
      })
      setFiles([fileWithPreview as any])
      
      toast.success("Image prepared. Click Save to upload.", { id: 'image-compress' })
      
    } catch (error) {
      console.error("Image compression error:", error)
      toast.error("Failed to process image", { id: 'image-compress' })
    }
  }

  // Handle Image Removal
  const handleRemoveImage = () => {
    // Clear preview
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview)
      setImagePreview(null)
    }
    setUploadedFile(null)
    setFiles([])
    
    // Clear the saved image from review data
    setReviewData({...reviewData, calendarImage: null})
    toast.info("Image removed")
  }

  // Handle Image Replacement
  const handleReplaceImage = () => {
    // Clear current preview
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview)
      setImagePreview(null)
    }
    setUploadedFile(null)
    setFiles([])
    
    // Trigger file input
    const fileInput = document.getElementById('weekly-calendar-upload') as HTMLInputElement
    if (fileInput) {
      fileInput.value = ''
      fileInput.click()
    }
  }

  // Cleanup preview URL when modal closes or unmounts
  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview)
      }
    }
  }, [imagePreview])

  // Reset preview when modal closes
  useEffect(() => {
    if (!isOpen) {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview)
      }
      setImagePreview(null)
      setUploadedFile(null)
      setFiles([])
      setImageLoadError(false)
    }
  }, [isOpen, imagePreview, setFiles])

  const handleSave = async () => {
    if (!selectedDate) return
    setIsSaving(true)

    try {
      let imageUrl = reviewData?.calendarImage

      // Upload new image if exists
      if (uploadedFile && files.length > 0) {
        await onUpload()
        // Construct public URL for weekly-calendars bucket with organized path
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        if (supabaseUrl && user?.id) {
          imageUrl = `${supabaseUrl}/storage/v1/object/public/weekly-calendars/${user.id}/${weekStartDate}/${files[0].name}`
        }
      }

      const result = await saveWeeklyReview({
        startDate: startOfWeek(selectedDate),
        endDate: endOfWeek(selectedDate),
        calendarImage: imageUrl,
        expectation: reviewData?.expectation,
        actualOutcome: reviewData?.actualOutcome,
        isCorrect: reviewData?.isCorrect,
        notes: reviewData?.notes
      })

      if (result.success) {
        setReviewData(result.data)
        toast.success("Weekly review saved")
        
        // Clear upload state after successful save
        if (imagePreview) {
          URL.revokeObjectURL(imagePreview)
          setImagePreview(null)
        }
        setUploadedFile(null)
        setFiles([])
      } else {
        toast.error("Failed to save review")
      }
    } catch (error) {
      console.error("Save error:", error)
      toast.error("An error occurred")
    } finally {
      setIsSaving(false)
    }
  }

  if (!selectedDate || !isOpen) return null;

  const weekStart = startOfWeek(selectedDate)
  const weekEnd = endOfWeek(selectedDate)
  const dateRange = `${format(weekStart, 'MMMM d', { locale: dateLocale })} - ${format(weekEnd, 'MMMM d, yyyy', { locale: dateLocale })}`

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-full h-[95vh] p-0 flex flex-col overflow-hidden">
        {/* Hidden file input for replacement */}
        <input 
          id="weekly-calendar-upload"
          type="file" 
          accept="image/*" 
          className="hidden" 
          onChange={handleImageUpload}
        />
        
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl">{dateRange}</DialogTitle>
              <DialogDescription>Weekly Analysis & Review</DialogDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
              <Button onClick={handleSave} disabled={isSaving || isUploading}>
                {isSaving || isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save Review
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-grow overflow-y-auto p-6 space-y-6">
            {/* Top Section: Economic Calendar - Full Width */}
            <Card className="overflow-hidden flex flex-col w-full">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center justify-between">
                  <span>Economic Calendar</span>
                  <div className="flex items-center gap-2">
                    {(reviewData?.calendarImage || imagePreview) && (
                      <>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={handleRemoveImage}
                          title="Remove image"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 px-3"
                          onClick={handleReplaceImage}
                          title="Replace image"
                        >
                          <Upload className="h-4 w-4 mr-1" />
                          Replace
                        </Button>
                      </>
                    )}
                    {!reviewData?.calendarImage && !imagePreview && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 px-3"
                        onClick={() => document.getElementById('weekly-calendar-upload')?.click()}
                      >
                        <Upload className="h-4 w-4 mr-1" />
                        Upload
                      </Button>
                    )}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="bg-muted/50 relative min-h-[300px] group w-full flex items-center justify-center">
                  {(imagePreview || reviewData?.calendarImage) && !imageLoadError ? (
                    <div className="relative w-full h-full flex items-center justify-center p-4">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img 
                        src={imagePreview || reviewData?.calendarImage} 
                        alt="Economic Calendar" 
                        className="w-full h-full object-contain max-h-[500px] rounded-md"
                        onError={(e) => {
                          console.error("Image failed to load:", imagePreview || reviewData?.calendarImage)
                          setImageLoadError(true)
                          toast.error("Failed to load saved image. Please upload a new one.")
                        }}
                      />
                      {imagePreview && (
                        <div className="absolute top-6 left-6">
                          <Badge variant="secondary" className="bg-blue-500/90 text-white">
                            New Upload - Click Save
                          </Badge>
                        </div>
                      )}
                    </div>
                  ) : imageLoadError ? (
                    <div className="flex flex-col items-center justify-center text-muted-foreground py-12 w-full h-full">
                      <XCircle className="h-12 w-12 text-destructive mb-4" />
                      <p className="text-sm font-medium mb-2">Failed to load saved image</p>
                      <p className="text-xs text-center max-w-[300px] mb-4">
                        The previous image could not be loaded. Please upload a new calendar image.
                      </p>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setImageLoadError(false)
                          setReviewData({...reviewData, calendarImage: null})
                          document.getElementById('weekly-calendar-upload')?.click()
                        }}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Upload New Image
                      </Button>
                    </div>
                  ) : (
                    <label 
                      htmlFor="weekly-calendar-upload"
                      className="flex flex-col items-center justify-center text-muted-foreground py-12 cursor-pointer hover:bg-muted/70 transition-colors w-full h-full"
                    >
                      <ImageIcon className="mx-auto h-12 w-12 opacity-20 mb-3" />
                      <span className="text-sm font-medium">Upload weekly calendar screenshot</span>
                      <span className="text-xs opacity-70 mt-1">Click to browse or drag & drop</span>
                      <span className="text-xs opacity-50 mt-2">Supports: JPG, PNG, WebP (Max 1MB)</span>
                    </label>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Middle Section: Expectation & Outcome - Side by Side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Weekly Expectation</CardTitle>
                </CardHeader>
                <CardContent>
                  <RadioGroup 
                    value={reviewData?.expectation || ''} 
                    onValueChange={(val) => setReviewData({...reviewData, expectation: val})}
                    className="grid grid-cols-1 gap-3"
                  >
                    <div className="flex items-center space-x-2 border p-3 rounded-md hover:bg-muted/50 transition-colors cursor-pointer">
                      <RadioGroupItem value="BULLISH_EXPANSION" id="bullish" />
                      <Label htmlFor="bullish" className="flex items-center gap-2 cursor-pointer w-full">
                        <TrendingUp className="h-4 w-4 text-green-500" />
                        Bullish Expansion
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 border p-3 rounded-md hover:bg-muted/50 transition-colors cursor-pointer">
                      <RadioGroupItem value="BEARISH_EXPANSION" id="bearish" />
                      <Label htmlFor="bearish" className="flex items-center gap-2 cursor-pointer w-full">
                        <TrendingDown className="h-4 w-4 text-red-500" />
                        Bearish Expansion
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 border p-3 rounded-md hover:bg-muted/50 transition-colors cursor-pointer">
                      <RadioGroupItem value="CONSOLIDATION" id="consolidation" />
                      <Label htmlFor="consolidation" className="flex items-center gap-2 cursor-pointer w-full">
                        <Activity className="h-4 w-4 text-blue-500" />
                        Consolidation
                      </Label>
                    </div>
                  </RadioGroup>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Actual Outcome</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">Was expectation correct?</Label>
                    <div className="flex gap-3">
                      <Button 
                        size="sm" 
                        variant={reviewData?.isCorrect === true ? "default" : "outline"}
                        className={`flex-1 ${reviewData?.isCorrect === true ? "bg-green-600 hover:bg-green-700" : ""}`}
                        onClick={() => setReviewData({...reviewData, isCorrect: true})}
                      >
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Yes
                      </Button>
                      <Button 
                        size="sm" 
                        variant={reviewData?.isCorrect === false ? "destructive" : "outline"}
                        className="flex-1"
                        onClick={() => setReviewData({...reviewData, isCorrect: false})}
                      >
                        <XCircle className="mr-2 h-4 w-4" />
                        No
                      </Button>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-3">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">Actual Market Behavior</Label>
                    <Select 
                      value={reviewData?.actualOutcome || ''} 
                      onValueChange={(val) => setReviewData({...reviewData, actualOutcome: val})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select actual outcome" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BULLISH_EXPANSION">Bullish Expansion</SelectItem>
                        <SelectItem value="BEARISH_EXPANSION">Bearish Expansion</SelectItem>
                        <SelectItem value="CONSOLIDATION">Consolidation</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Stats + Chart Section */}
            <div className="flex flex-col gap-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="py-4 pb-2">
                    <CardTitle className="text-xs font-medium text-muted-foreground">Best Day</CardTitle>
                  </CardHeader>
                  <CardContent className="pb-4">
                    <div className="text-lg font-bold">{stats?.bestDay ? stats.bestDay[0] : '-'}</div>
                    <div className="text-xs text-green-500">
                      {stats?.bestDay ? `+$${stats.bestDay[1].toFixed(2)}` : '$0.00'}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="py-4 pb-2">
                    <CardTitle className="text-xs font-medium text-muted-foreground">Worst Day</CardTitle>
                  </CardHeader>
                  <CardContent className="pb-4">
                    <div className="text-lg font-bold">{stats?.worstDay ? stats.worstDay[0] : '-'}</div>
                    <div className="text-xs text-red-500">
                      {stats?.worstDay ? `$${stats.worstDay[1].toFixed(2)}` : '$0.00'}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="py-4 pb-2">
                    <CardTitle className="text-xs font-medium text-muted-foreground">Top Instrument</CardTitle>
                  </CardHeader>
                  <CardContent className="pb-4">
                    <div className="text-lg font-bold">{stats?.bestPair ? stats.bestPair[0] : '-'}</div>
                    <div className="text-xs text-muted-foreground">
                      {stats?.bestPair ? `$${stats.bestPair[1].toFixed(2)}` : '$0.00'}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="py-4 pb-2">
                    <CardTitle className="text-xs font-medium text-muted-foreground">Top Session</CardTitle>
                  </CardHeader>
                  <CardContent className="pb-4">
                    <div className="text-lg font-bold">{stats?.bestSession ? stats.bestSession[0] : '-'}</div>
                    <div className="text-xs text-muted-foreground">
                      {stats?.bestSession ? `$${stats.bestSession[1].toFixed(2)}` : '$0.00'}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Simple Weekly Balance Line Chart - Bottom, full width */}
              <div className="w-full border-t pt-6">
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart
                    data={(() => {
                      if (!selectedDate) return []
                      
                      const weekStart = startOfWeek(selectedDate)
                      const weekEnd = endOfWeek(selectedDate)
                      
                      const dailyData: Record<string, number> = {}
                      for (const [dateString, dayData] of Object.entries(calendarData)) {
                        const date = new Date(dateString)
                        if (date >= weekStart && date <= weekEnd) {
                          dailyData[dateString] = dayData.pnl || 0
                        }
                      }
                      
                      const sortedDates = Object.keys(dailyData).sort()
                      let cumulative = 0
                      
                      return sortedDates.map((date) => {
                        cumulative += dailyData[date]
                        return { date, balance: cumulative }
                      })
                    })()}
                    margin={{ left: 0, right: 0, top: 10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.2} vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 11 }}
                      tickFormatter={(value) => {
                        const date = new Date(value + 'T00:00:00Z')
                        return date.toLocaleDateString("en-US", {
                          weekday: 'short',
                          timeZone: 'UTC'
                        })
                      }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 11 }}
                      tickFormatter={(value) => `$${value >= 1000 || value <= -1000 ? (value / 1000).toFixed(1) + 'k' : value.toFixed(0)}`}
                      width={60}
                    />
                    <Tooltip
                      content={({ active, payload }: any) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload
                          return (
                            <div className="rounded-lg border bg-background p-2 shadow-sm">
                              <div className="text-xs text-muted-foreground">
                                {format(new Date(data.date + 'T00:00:00Z'), 'EEE, MMM d', { locale: enUS })}
                              </div>
                              <div className="font-bold">${data.balance?.toFixed(2) || '0.00'}</div>
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                    <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" opacity={0.5} />
                    <Line
                      type="monotone"
                      dataKey="balance"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
      </DialogContent>
    </Dialog>
  )
}
