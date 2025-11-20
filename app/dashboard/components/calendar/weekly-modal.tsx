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
import { Loader2, Upload, ImageIcon, TrendingUp, TrendingDown, Activity, CheckCircle2, XCircle } from "lucide-react"
import { toast } from "sonner"
import imageCompression from 'browser-image-compression'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"

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
  const [reviewData, setReviewData] = useState<any>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoadingReview, setIsLoadingReview] = useState(false)

  // Image upload setup
  const { onUpload, files, setFiles, isSuccess: isUploadSuccess, loading: isUploading } = useSupabaseUpload({
    bucketName: 'images',
    path: 'weekly-calendars',
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

      // Session Stats (approximate by hour)
      const hour = new Date(trade.entryDate).getHours()
      let session = 'Other'
      if (hour >= 8 && hour < 16) session = 'New York' // 8am-4pm EST approx
      else if (hour >= 3 && hour < 11) session = 'London' // 3am-11am EST approx
      else if (hour >= 18 || hour < 2) session = 'Asian' // 6pm-2am EST approx
      
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
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      
      try {
        // Compress image to WebP
        const options = {
          maxSizeMB: 1,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
          fileType: 'image/webp'
        }
        
        const compressedFile = await imageCompression(file, options)
        const newFile = new File([compressedFile], `weekly-calendar-${Date.now()}.webp`, { type: 'image/webp' })
        
        // Create a file object with the required properties for the upload hook
        const fileWithPreview = Object.assign(newFile, {
          preview: URL.createObjectURL(newFile),
          errors: []
        })
        
        // Use the hook to set file state
        setFiles([fileWithPreview as any])
        
        toast.info("Image prepared. Click Save to upload.")
        
      } catch (error) {
        console.error("Image compression error:", error)
        toast.error("Failed to process image")
      }
    }
  }

  const handleSave = async () => {
    if (!selectedDate) return
    setIsSaving(true)

    try {
      let imageUrl = reviewData?.calendarImage

      // Upload new image if exists
      if (files.length > 0) {
        await onUpload()
        // Construct public URL (assuming public bucket)
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        if (supabaseUrl) {
          imageUrl = `${supabaseUrl}/storage/v1/object/public/images/weekly-calendars/${files[0].name}`
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
        setFiles([]) // Clear uploaded files
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
                  <div className="relative">
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="absolute inset-0 opacity-0 cursor-pointer" 
                      onChange={handleImageUpload}
                    />
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <Upload className="h-4 w-4" />
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <div className="bg-muted/50 relative min-h-[300px] group w-full flex items-center justify-center">
                {reviewData?.calendarImage || (files.length > 0 && files[0].preview) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img 
                    src={files.length > 0 ? (files[0] as any).preview : reviewData.calendarImage} 
                    alt="Economic Calendar" 
                    className="w-full h-full object-contain max-h-[500px]"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-muted-foreground py-12">
                    <ImageIcon className="mx-auto h-12 w-12 opacity-20 mb-3" />
                    <span className="text-sm font-medium">Upload weekly calendar screenshot</span>
                    <span className="text-xs opacity-70 mt-1">Supports drag & drop or click to upload</span>
                  </div>
                )}
              </div>
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
