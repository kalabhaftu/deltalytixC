'use client'

import React, { useState, useEffect, useMemo, useRef } from "react"
import { format, startOfWeek, endOfWeek, parseISO } from "date-fns"
import { enUS } from 'date-fns/locale'
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { CalendarData } from "@/app/dashboard/types/calendar"
import { groupTradesByExecution } from '@/lib/utils'
import { Button } from "@/components/ui/button"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Area, AreaChart } from 'recharts'
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useSupabaseUpload } from "@/hooks/use-supabase-upload"
import { saveWeeklyReview, getWeeklyReview } from "@/server/weekly-review"
import { useAuth } from "@/context/auth-provider"
import { Loader2, Upload, ImageIcon, TrendingUp, TrendingDown, Activity, CheckCircle2, XCircle, X, Trash2, BarChart3, Clock, Target, Percent, Calendar as CalendarIcon } from "lucide-react"
import { toast } from "sonner"
import imageCompression from 'browser-image-compression'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { getTradingSession } from '@/lib/time-utils'
import { cn } from "@/lib/utils"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface WeeklyModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: Date | null;
  calendarData: CalendarData;
  isLoading: boolean;
}

type WeeklyExpectation = 'BULLISH_EXPANSION' | 'BEARISH_EXPANSION' | 'CONSOLIDATION'

// Metric Card Component
function MetricCard({ 
  icon: Icon, 
  label, 
  value, 
  subValue, 
  trend, 
  className 
}: { 
  icon: any; 
  label: string; 
  value: string | number; 
  subValue?: string; 
  trend?: 'up' | 'down' | 'neutral';
  className?: string;
}) {
  const trendColor = trend === 'up' ? 'text-long' : trend === 'down' ? 'text-short' : 'text-muted-foreground'
  
  return (
    <div className={cn("p-4 rounded-xl border bg-card", className)}>
      <div className="flex items-center gap-2 mb-2">
        <div className="p-1.5 rounded-lg bg-primary/10">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      </div>
      <div className={cn("text-xl font-bold", trendColor)}>
        {value}
      </div>
      {subValue && (
        <div className="text-xs text-muted-foreground mt-0.5">{subValue}</div>
      )}
    </div>
  )
}

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
  const [activeTab, setActiveTab] = useState('overview')
  
  // Track the latest save request to prevent race conditions
  const saveRequestRef = useRef<number>(0)
  // Track the latest reviewData to avoid stale values in rapid changes
  const reviewDataRef = useRef<any>(null)
  
  // Keep ref in sync with state
  useEffect(() => {
    reviewDataRef.current = reviewData
  }, [reviewData])

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
    // Validate selectedDate before opening
    if (isOpen && selectedDate && selectedDate instanceof Date && !isNaN(selectedDate.getTime())) {
      const loadReview = async () => {
        setIsLoadingReview(true)
        const data = await getWeeklyReview(selectedDate)
        setReviewData(data)
        setIsLoadingReview(false)
      }
      loadReview()
    } else if (isOpen && (!selectedDate || !(selectedDate instanceof Date) || isNaN(selectedDate.getTime()))) {
      // If modal is open but date is invalid, close it
      onOpenChange(false)
    }
  }, [isOpen, selectedDate, onOpenChange])

  // Aggregate weekly data
  const weeklyData = useMemo(() => {
    if (!selectedDate) return { trades: [], tradeNumber: 0, pnl: 0, longNumber: 0, shortNumber: 0, winRate: 0, avgWin: 0, avgLoss: 0, winningTrades: 0, losingTrades: 0 }

    const trades: any[] = []
    const weekStart = startOfWeek(selectedDate)
    const weekEnd = endOfWeek(selectedDate)
    
    // Format week boundaries as YYYY-MM-DD strings for consistent comparison
    // This avoids timezone issues when comparing against dateString keys
    const weekStartStr = format(weekStart, 'yyyy-MM-dd')
    const weekEndStr = format(weekEnd, 'yyyy-MM-dd')

    // Collect all trades for the week using string comparison
    for (const [dateString, dayData] of Object.entries(calendarData)) {
      // Compare date strings directly to avoid timezone parsing issues
      if (dateString >= weekStartStr && dateString <= weekEndStr && dayData.trades) {
        trades.push(...(dayData.trades as any[]))
      }
    }

    // CRITICAL: Group trades to show correct execution count
    const groupedTrades = groupTradesByExecution(trades)

    // Calculate long and short numbers from grouped trades
    const longNumber = groupedTrades.filter(trade => trade.side?.toLowerCase() === 'long' || trade.side?.toUpperCase() === 'BUY').length
    const shortNumber = groupedTrades.filter(trade => trade.side?.toLowerCase() === 'short' || trade.side?.toUpperCase() === 'SELL').length

    // Calculate win rate
    const winningTrades = groupedTrades.filter(t => t.pnl > 0).length
    const losingTrades = groupedTrades.filter(t => t.pnl < 0).length
    const winRate = groupedTrades.length > 0 ? (winningTrades / groupedTrades.length) * 100 : 0

    // Calculate average win/loss
    const avgWin = winningTrades > 0 ? groupedTrades.filter(t => t.pnl > 0).reduce((sum, t) => sum + t.pnl, 0) / winningTrades : 0
    const avgLoss = losingTrades > 0 ? Math.abs(groupedTrades.filter(t => t.pnl < 0).reduce((sum, t) => sum + t.pnl, 0)) / losingTrades : 0

    return {
      trades: groupedTrades,
      tradeNumber: groupedTrades.length,
      pnl: groupedTrades.reduce((sum, trade) => sum + trade.pnl, 0),
      longNumber,
      shortNumber,
      winRate,
      avgWin,
      avgLoss,
      winningTrades,
      losingTrades
    }
  }, [selectedDate, calendarData])

  // Calculate derived stats
  const stats = useMemo(() => {
    if (weeklyData.trades.length === 0) return null

    const dayStats: Record<string, { pnl: number; trades: number }> = {}
    const pairStats: Record<string, { pnl: number; trades: number; wins: number }> = {}
    const sessionStats: Record<string, { pnl: number; trades: number }> = {}

    weeklyData.trades.forEach((trade: any) => {
      // Day Stats
      const day = format(new Date(trade.entryDate), 'EEEE')
      const netPnL = trade.pnl - (trade.commission || 0)
      if (!dayStats[day]) dayStats[day] = { pnl: 0, trades: 0 }
      dayStats[day].pnl += netPnL
      dayStats[day].trades += 1

      // Pair Stats
      const pair = trade.instrument || 'Unknown'
      if (!pairStats[pair]) pairStats[pair] = { pnl: 0, trades: 0, wins: 0 }
      pairStats[pair].pnl += netPnL
      pairStats[pair].trades += 1
      if (netPnL > 0) pairStats[pair].wins += 1

      // Session Stats (proper timezone handling)
      const session = getTradingSession(trade.entryDate)
      if (!sessionStats[session]) sessionStats[session] = { pnl: 0, trades: 0 }
      sessionStats[session].pnl += netPnL
      sessionStats[session].trades += 1
    })

    const sortedDays = Object.entries(dayStats).sort((a, b) => b[1].pnl - a[1].pnl)
    const sortedPairs = Object.entries(pairStats).sort((a, b) => b[1].pnl - a[1].pnl)
    const sortedSessions = Object.entries(sessionStats).sort((a, b) => b[1].pnl - a[1].pnl)

    // Profit factor (use net P&L after commission for consistency with other stats)
    const grossProfit = weeklyData.trades
      .map(t => t.pnl - (t.commission || 0))
      .filter(netPnl => netPnl > 0)
      .reduce((sum, netPnl) => sum + netPnl, 0)
    const grossLoss = Math.abs(weeklyData.trades
      .map(t => t.pnl - (t.commission || 0))
      .filter(netPnl => netPnl < 0)
      .reduce((sum, netPnl) => sum + netPnl, 0))
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0

    return {
      bestDay: sortedDays[0],
      worstDay: sortedDays[sortedDays.length - 1],
      bestPair: sortedPairs[0],
      worstPair: sortedPairs[sortedPairs.length - 1],
      bestSession: sortedSessions[0],
      dayStats,
      pairStats: sortedPairs,
      sessionStats: sortedSessions,
      profitFactor,
      grossProfit,
      grossLoss
    }
  }, [weeklyData])

  // Chart data for cumulative P&L
  const chartData = useMemo(() => {
    if (!selectedDate) return []
    
    const weekStart = startOfWeek(selectedDate)
    const weekEnd = endOfWeek(selectedDate)
    
    // Format week boundaries as YYYY-MM-DD strings for consistent comparison
    const weekStartStr = format(weekStart, 'yyyy-MM-dd')
    const weekEndStr = format(weekEnd, 'yyyy-MM-dd')
    
    const dailyData: Record<string, number> = {}
    for (const [dateString, dayData] of Object.entries(calendarData)) {
      // Compare date strings directly to avoid timezone parsing issues
      if (dateString >= weekStartStr && dateString <= weekEndStr) {
        dailyData[dateString] = dayData.pnl || 0
      }
    }
    
    const sortedDates = Object.keys(dailyData).sort()
    let cumulative = 0
    
    return sortedDates.map((date) => {
      cumulative += dailyData[date]
      return { 
        date, 
        balance: cumulative,
        daily: dailyData[date],
        // Use parseISO to treat YYYY-MM-DD as local midnight, avoiding timezone shifts
        label: format(parseISO(date), 'EEE', { locale: enUS })
      }
    })
  }, [selectedDate, calendarData])

  // Handle Image Upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    try {
      const loadingToast = toast.loading("Compressing image...")
      
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
      
      toast.dismiss(loadingToast)
      toast.success("Image prepared. Click Save to upload.")
      
    } catch (error) {
      toast.error("Failed to process image")
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
      setActiveTab('overview')
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
        
        // Close modal after successful save
        onOpenChange(false)
      } else {
        toast.error("Failed to save review")
      }
    } catch (error) {
      toast.error("An error occurred while saving")
    } finally {
      setIsSaving(false)
    }
  }

  if (!selectedDate || !isOpen) return null;

  const weekStart = startOfWeek(selectedDate)
  const weekEnd = endOfWeek(selectedDate)
  const dateRange = `${format(weekStart, 'MMM d', { locale: dateLocale })} - ${format(weekEnd, 'MMM d, yyyy', { locale: dateLocale })}`

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl w-full h-[90vh] p-0 flex flex-col overflow-hidden">
        <DialogTitle className="sr-only">Weekly Review for {dateRange}</DialogTitle>
        
        {/* Hidden file input for replacement */}
        <input 
          id="weekly-calendar-upload"
          type="file" 
          accept="image/*" 
          className="hidden" 
          onChange={handleImageUpload}
        />
        
        {/* Header */}
        <div className="px-6 py-4 border-b shrink-0 bg-card">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <CalendarIcon className="h-5 w-5 text-primary" />
              </div>
            <div>
                <h2 className="text-lg font-semibold">{dateRange}</h2>
                <p className="text-sm text-muted-foreground">Weekly Performance Review</p>
              </div>
            </div>
              <Button onClick={handleSave} disabled={isSaving || isUploading}>
                {isSaving || isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save Review
              </Button>
            </div>
          </div>

        {/* Tabs Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <div className="px-6 border-b bg-muted/30">
            <TabsList className="h-12 bg-transparent border-0 p-0 gap-6">
              <TabsTrigger 
                value="overview" 
                className="h-12 px-1 border-0 bg-transparent data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
              >
                Overview
              </TabsTrigger>
              <TabsTrigger 
                value="analysis" 
                className="h-12 px-1 border-0 bg-transparent data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
              >
                Analysis
              </TabsTrigger>
              <TabsTrigger 
                value="calendar" 
                className="h-12 px-1 border-0 bg-transparent data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
              >
                Calendar Image
              </TabsTrigger>
              <TabsTrigger 
                value="notes" 
                className="h-12 px-1 border-0 bg-transparent data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
              >
                Notes
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto">
            {/* Overview Tab */}
            <TabsContent value="overview" className="m-0 p-6 space-y-6">
              {/* Key Metrics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                <MetricCard 
                  icon={BarChart3} 
                  label="Total P&L" 
                  value={`$${weeklyData.pnl.toFixed(2)}`}
                  trend={weeklyData.pnl > 0 ? 'up' : weeklyData.pnl < 0 ? 'down' : 'neutral'}
                />
                <MetricCard 
                  icon={Target} 
                  label="Trades" 
                  value={weeklyData.tradeNumber}
                  subValue={`${weeklyData.longNumber}L / ${weeklyData.shortNumber}S`}
                />
                <MetricCard 
                  icon={Percent} 
                  label="Win Rate" 
                  value={`${weeklyData.winRate.toFixed(1)}%`}
                  subValue={`${weeklyData.winningTrades}W / ${weeklyData.losingTrades}L`}
                  trend={weeklyData.winRate >= 50 ? 'up' : 'down'}
                />
                <MetricCard 
                  icon={TrendingUp} 
                  label="Avg Win" 
                  value={`$${weeklyData.avgWin.toFixed(2)}`}
                  trend="up"
                />
                <MetricCard 
                  icon={TrendingDown} 
                  label="Avg Loss" 
                  value={`$${weeklyData.avgLoss.toFixed(2)}`}
                  trend="down"
                />
                <MetricCard 
                  icon={Activity} 
                  label="Profit Factor" 
                  value={stats?.profitFactor === Infinity ? '∞' : stats?.profitFactor?.toFixed(2) || '0.00'}
                  trend={stats && stats.profitFactor >= 1 ? 'up' : 'down'}
                />
              </div>

              {/* Chart Section */}
              <Card>
              <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-primary" />
                    Cumulative P&L
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ left: 0, right: 0, top: 10, bottom: 5 }}>
                        <defs>
                          <linearGradient id="colorPnl" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} vertical={false} />
                        <XAxis
                          dataKey="label"
                          tickLine={false}
                          axisLine={false}
                          tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                        />
                        <YAxis
                          tickLine={false}
                          axisLine={false}
                          tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                          tickFormatter={(value) => `$${value >= 1000 || value <= -1000 ? (value / 1000).toFixed(1) + 'k' : value.toFixed(0)}`}
                          width={50}
                        />
                        <Tooltip
                          content={({ active, payload }: any) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload
                              return (
                                <div className="rounded-lg border bg-background p-3 shadow-lg">
                                  <div className="text-xs text-muted-foreground mb-1">
                                    {format(new Date(data.date + 'T00:00:00Z'), 'EEEE, MMM d', { locale: enUS })}
                                  </div>
                                  <div className="flex flex-col gap-1">
                                    <div className="text-sm">
                                      <span className="text-muted-foreground">Daily: </span>
                                      <span className={cn("font-semibold", data.daily >= 0 ? 'text-long' : 'text-short')}>
                                        ${data.daily?.toFixed(2)}
                                      </span>
                                    </div>
                                    <div className="text-sm">
                                      <span className="text-muted-foreground">Cumulative: </span>
                                      <span className={cn("font-semibold", data.balance >= 0 ? 'text-long' : 'text-short')}>
                                        ${data.balance?.toFixed(2)}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              )
                            }
                            return null
                          }}
                        />
                        <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" opacity={0.5} />
                        <Area
                          type="monotone"
                          dataKey="balance"
                          stroke="hsl(var(--primary))"
                          strokeWidth={2}
                          fill="url(#colorPnl)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Stats */}
              {stats && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="h-4 w-4 text-long" />
                      <span className="text-sm font-medium">Best Day</span>
                    </div>
                    <div className="text-lg font-bold">{stats.bestDay ? stats.bestDay[0] : 'N/A'}</div>
                    <div className="text-sm text-long">
                      {stats.bestDay ? `+$${stats.bestDay[1].pnl.toFixed(2)}` : '$0.00'}
                    </div>
                  </Card>

                  <Card className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingDown className="h-4 w-4 text-short" />
                      <span className="text-sm font-medium">Worst Day</span>
                    </div>
                    <div className="text-lg font-bold">{stats.worstDay ? stats.worstDay[0] : 'N/A'}</div>
                    <div className="text-sm text-short">
                      {stats.worstDay ? `$${stats.worstDay[1].pnl.toFixed(2)}` : '$0.00'}
                    </div>
                  </Card>

                  <Card className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">Top Instrument</span>
                    </div>
                    <div className="text-lg font-bold">{stats.bestPair ? stats.bestPair[0] : 'N/A'}</div>
                    <div className="text-sm text-muted-foreground">
                      {stats.bestPair ? `$${stats.bestPair[1].pnl.toFixed(2)} (${stats.bestPair[1].trades} trades)` : '0 trades'}
                    </div>
                  </Card>

                  <Card className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">Best Session</span>
                    </div>
                    <div className="text-lg font-bold">{stats.bestSession ? stats.bestSession[0] : 'N/A'}</div>
                    <div className="text-sm text-muted-foreground">
                      {stats.bestSession ? `$${stats.bestSession[1].pnl.toFixed(2)} (${stats.bestSession[1].trades} trades)` : '0 trades'}
                    </div>
                  </Card>
                </div>
              )}
            </TabsContent>

            {/* Analysis Tab */}
            <TabsContent value="analysis" className="m-0 p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Weekly Expectation */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Activity className="h-4 w-4 text-primary" />
                      Weekly Expectation
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <RadioGroup 
                      value={reviewData?.expectation || ''} 
                      onValueChange={(val) => {
                        if (!selectedDate) return
                        
                        // Create updated review data object with new expectation
                        // This ensures we use the latest values, not stale closure values
                        const updatedReviewData = {
                          ...(reviewData || {}),
                          expectation: val as WeeklyExpectation
                        }
                        
                        // Update local state immediately for instant feedback
                        setReviewData(updatedReviewData)
                        
                        // Auto-save expectation immediately for better UX
                        // Use a request counter to prevent race conditions
                        const currentRequest = ++saveRequestRef.current
                        const savedExpectation = val as WeeklyExpectation
                        const saveExpectation = async () => {
                          try {
                            // Read latest state from ref to avoid stale values from rapid changes
                            // This ensures we always save the most current state, not the state at change time
                            const latestReviewData = reviewDataRef.current
                            
                            const result = await saveWeeklyReview({
                              startDate: startOfWeek(selectedDate),
                              endDate: endOfWeek(selectedDate),
                              expectation: savedExpectation, // Use the saved expectation value
                              actualOutcome: latestReviewData?.actualOutcome,
                              isCorrect: latestReviewData?.isCorrect,
                              notes: latestReviewData?.notes,
                              calendarImage: latestReviewData?.calendarImage
                            })
                            
                            // Only update state if this is still the latest request
                            // This prevents older saves from overwriting newer selections
                            if (result.success && result.data && currentRequest === saveRequestRef.current) {
                              const savedData = result.data
                              // Merge server response with current state to preserve concurrent local changes
                              // Only update the field that was auto-saved (expectation), preserve other local changes
                              setReviewData((prev: any) => {
                                if (!prev) {
                                  // If no previous state, use server response
                                  return { ...savedData, expectation: savedExpectation }
                                }
                                
                                // Merge: use server data as base, but preserve local changes for non-saved fields
                                // Check if property exists in prev (not just truthy) to preserve falsy values
                                return {
                                  ...savedData,
                                  expectation: savedExpectation, // Always use the saved value
                                  // Preserve local changes if they exist in prev (including falsy values)
                                  actualOutcome: 'actualOutcome' in prev ? prev.actualOutcome : (savedData?.actualOutcome ?? undefined),
                                  isCorrect: 'isCorrect' in prev ? prev.isCorrect : (savedData?.isCorrect ?? undefined),
                                  notes: 'notes' in prev ? prev.notes : (savedData?.notes ?? undefined),
                                  calendarImage: 'calendarImage' in prev ? prev.calendarImage : (savedData?.calendarImage ?? undefined)
                                }
                              })
                            }
                          } catch (error) {
                            // Silent fail - will be saved when user clicks save button
                            console.error('Failed to auto-save expectation:', error)
                          }
                        }
                        saveExpectation()
                      }}
                      className="space-y-3"
                    >
                      <label className={cn(
                        "relative flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all",
                        reviewData?.expectation === 'BULLISH_EXPANSION' 
                          ? "border-long bg-long/10 shadow-md ring-2 ring-long/20" 
                          : "border-border hover:border-long/50 hover:bg-muted/30"
                      )}>
                        <RadioGroupItem value="BULLISH_EXPANSION" id="bullish" className="sr-only" />
                        <div className={cn(
                          "p-2 rounded-lg transition-all",
                          reviewData?.expectation === 'BULLISH_EXPANSION' 
                            ? "bg-long/20" 
                            : "bg-long/10"
                        )}>
                          <TrendingUp className="h-4 w-4 text-long" />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">Bullish Expansion</div>
                          <div className="text-xs text-muted-foreground">Expecting upward price movement</div>
                        </div>
                        {reviewData?.expectation === 'BULLISH_EXPANSION' && (
                          <CheckCircle2 className="h-5 w-5 text-long" />
                        )}
                      </label>
                      
                      <label className={cn(
                        "relative flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all",
                        reviewData?.expectation === 'BEARISH_EXPANSION' 
                          ? "border-short bg-short/10 shadow-md ring-2 ring-short/20" 
                          : "border-border hover:border-short/50 hover:bg-muted/30"
                      )}>
                        <RadioGroupItem value="BEARISH_EXPANSION" id="bearish" className="sr-only" />
                        <div className={cn(
                          "p-2 rounded-lg transition-all",
                          reviewData?.expectation === 'BEARISH_EXPANSION' 
                            ? "bg-short/20" 
                            : "bg-short/10"
                        )}>
                          <TrendingDown className="h-4 w-4 text-short" />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">Bearish Expansion</div>
                          <div className="text-xs text-muted-foreground">Expecting downward price movement</div>
                        </div>
                        {reviewData?.expectation === 'BEARISH_EXPANSION' && (
                          <CheckCircle2 className="h-5 w-5 text-short" />
                        )}
                      </label>
                      
                      <label className={cn(
                        "relative flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all",
                        reviewData?.expectation === 'CONSOLIDATION' 
                          ? "border-primary bg-primary/10 shadow-md ring-2 ring-primary/20" 
                          : "border-border hover:border-primary/50 hover:bg-muted/30"
                      )}>
                        <RadioGroupItem value="CONSOLIDATION" id="consolidation" className="sr-only" />
                        <div className={cn(
                          "p-2 rounded-lg transition-all",
                          reviewData?.expectation === 'CONSOLIDATION' 
                            ? "bg-primary/20" 
                            : "bg-primary/10"
                        )}>
                          <Activity className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">Consolidation</div>
                          <div className="text-xs text-muted-foreground">Expecting range-bound movement</div>
                        </div>
                        {reviewData?.expectation === 'CONSOLIDATION' && (
                          <CheckCircle2 className="h-5 w-5 text-primary" />
                        )}
                      </label>
                    </RadioGroup>
                  </CardContent>
                </Card>

                {/* Actual Outcome */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Target className="h-4 w-4 text-primary" />
                      Actual Outcome
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Was expectation correct?</Label>
                      <div className="flex gap-3">
                        <Button 
                          type="button"
                          variant={reviewData?.isCorrect === true ? "default" : "outline"}
                          className={cn(
                            "flex-1 h-12",
                            reviewData?.isCorrect === true && "bg-long hover:bg-long/90 border-long"
                          )}
                          onClick={() => setReviewData({...reviewData, isCorrect: true})}
                        >
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Correct
                        </Button>
                        <Button 
                          type="button"
                          variant={reviewData?.isCorrect === false ? "destructive" : "outline"}
                          className="flex-1 h-12"
                          onClick={() => setReviewData({...reviewData, isCorrect: false})}
                        >
                          <XCircle className="mr-2 h-4 w-4" />
                          Incorrect
                        </Button>
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Actual Market Behavior</Label>
                      <Select 
                        value={reviewData?.actualOutcome || ''} 
                        onValueChange={(val) => setReviewData({...reviewData, actualOutcome: val})}
                      >
                        <SelectTrigger className="h-12">
                          <SelectValue placeholder="Select actual outcome" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="BULLISH_EXPANSION">
                            <div className="flex items-center gap-2">
                              <TrendingUp className="h-4 w-4 text-long" />
                              Bullish Expansion
                            </div>
                          </SelectItem>
                          <SelectItem value="BEARISH_EXPANSION">
                            <div className="flex items-center gap-2">
                              <TrendingDown className="h-4 w-4 text-short" />
                              Bearish Expansion
                            </div>
                          </SelectItem>
                          <SelectItem value="CONSOLIDATION">
                            <div className="flex items-center gap-2">
                              <Activity className="h-4 w-4 text-primary" />
                              Consolidation
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Instrument Breakdown */}
              {stats && stats.pairStats.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Instrument Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {stats.pairStats.map(([pair, data]) => (
                        <div key={pair} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                          <div className="flex items-center gap-3">
                            <div className="font-medium">{pair}</div>
                            <Badge variant="secondary" className="text-xs">
                              {data.trades} trades
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-xs text-muted-foreground">
                              {((data.wins / data.trades) * 100).toFixed(0)}% WR
                            </span>
                            <span className={cn(
                              "font-semibold",
                              data.pnl >= 0 ? 'text-long' : 'text-short'
                            )}>
                              {data.pnl >= 0 ? '+' : ''}${data.pnl.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Calendar Image Tab */}
            <TabsContent value="calendar" className="m-0 p-6">
              <Card>
                <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <ImageIcon className="h-4 w-4 text-primary" />
                      Economic Calendar Screenshot
                    </span>
                  <div className="flex items-center gap-2">
                    {(reviewData?.calendarImage || imagePreview) && (
                      <>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={handleRemoveImage}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 px-3"
                          onClick={handleReplaceImage}
                        >
                          <Upload className="h-4 w-4 mr-1" />
                          Replace
                        </Button>
                      </>
                    )}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                  <div className="bg-muted/30 relative min-h-[400px] flex items-center justify-center">
                  {(imagePreview || reviewData?.calendarImage) && !imageLoadError ? (
                    <div className="relative w-full h-full flex items-center justify-center p-4">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img 
                        src={imagePreview || reviewData?.calendarImage} 
                        alt="Economic Calendar" 
                        className="w-full h-full object-contain max-h-[500px] rounded-md"
                        onError={(e) => {
                          setImageLoadError(true)
                          toast.error("Failed to load saved image. Please upload a new one.")
                        }}
                      />
                      {imagePreview && (
                        <div className="absolute top-6 left-6">
                            <Badge className="bg-primary text-primary-foreground">
                              New Upload (Click Save)
                          </Badge>
                        </div>
                      )}
                    </div>
                  ) : imageLoadError ? (
                      <div className="flex flex-col items-center justify-center text-muted-foreground py-12">
                      <XCircle className="h-12 w-12 text-destructive mb-4" />
                      <p className="text-sm font-medium mb-2">Failed to load saved image</p>
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
                        className="flex flex-col items-center justify-center text-muted-foreground py-16 cursor-pointer hover:bg-muted/50 transition-colors w-full h-full"
                      >
                        <div className="p-4 rounded-full bg-muted mb-4">
                          <ImageIcon className="h-8 w-8 opacity-50" />
                        </div>
                        <span className="text-sm font-medium mb-1">Upload weekly calendar screenshot</span>
                        <span className="text-xs opacity-70">Click to browse or drag and drop</span>
                      <span className="text-xs opacity-50 mt-2">Supports: JPG, PNG, WebP (Max 1MB)</span>
                    </label>
                  )}
                </div>
              </CardContent>
            </Card>
            </TabsContent>

            {/* Notes Tab */}
            <TabsContent value="notes" className="m-0 p-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Target className="h-4 w-4 text-primary" />
                    Weekly Notes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    placeholder="Write your weekly notes, observations, lessons learned..."
                    className="min-h-[300px] resize-none"
                    value={reviewData?.notes || ''}
                    onChange={(e) => setReviewData({...reviewData, notes: e.target.value})}
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Document key takeaways, mistakes to avoid, and strategies that worked well this week.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
