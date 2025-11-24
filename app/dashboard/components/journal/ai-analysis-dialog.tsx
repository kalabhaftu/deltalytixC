'use client'

import { useState } from 'react'
import { format, subDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'
import { Loader2, Sparkles, Calendar as CalendarIcon, TrendingUp, Brain, AlertTriangle, Target, Lightbulb } from 'lucide-react'
import { cn } from '@/lib/utils'

import { CustomDateRangePicker } from '@/components/ui/custom-date-range-picker'

interface DateRangeTemplate {
  id: string
  label: string
  getValue: () => { from: Date; to: Date }
}

const dateRangeTemplates: DateRangeTemplate[] = [
  {
    id: 'last-7-days',
    label: 'Last 7 Days',
    getValue: () => ({
      from: subDays(new Date(), 7),
      to: new Date()
    })
  },
  {
    id: 'last-30-days',
    label: 'Last 30 Days',
    getValue: () => ({
      from: subDays(new Date(), 30),
      to: new Date()
    })
  },
  {
    id: 'this-week',
    label: 'This Week',
    getValue: () => ({
      from: startOfWeek(new Date()),
      to: endOfWeek(new Date())
    })
  },
  {
    id: 'this-month',
    label: 'This Month',
    getValue: () => ({
      from: startOfMonth(new Date()),
      to: endOfMonth(new Date())
    })
  },
  {
    id: 'last-month',
    label: 'Last Month',
    getValue: () => {
      const lastMonth = new Date()
      lastMonth.setMonth(lastMonth.getMonth() - 1)
      return {
        from: startOfMonth(lastMonth),
        to: endOfMonth(lastMonth)
      }
    }
  }
]

interface AIAnalysisDialogProps {
  isOpen: boolean
  onClose: () => void
  accountId?: string | null
}

interface AnalysisResult {
  summary: string
  emotionalPatterns: string[]
  performanceInsights: string[]
  recommendations: string[]
  strengths: string[]
  weaknesses: string[]
}

export function AIAnalysisDialog({ isOpen, onClose, accountId }: AIAnalysisDialogProps) {
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: subDays(new Date(), 30),
    to: new Date()
  })
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false)

  const handleTemplateSelect = (template: DateRangeTemplate) => {
    setDateRange(template.getValue())
    setAnalysis(null) // Clear previous analysis
  }

  const handleAnalyze = async () => {
    setIsAnalyzing(true)
    
    try {
      const params = new URLSearchParams({
        startDate: format(dateRange.from, 'yyyy-MM-dd'),
        endDate: format(dateRange.to, 'yyyy-MM-dd'),
      })

      if (accountId) {
        params.append('accountId', accountId)
      }

      const response = await fetch(`/api/journal/ai-analysis?${params}`)
      
      if (!response.ok) {
        throw new Error('Failed to generate analysis')
      }

      const data = await response.json()
      setAnalysis(data.analysis)
      toast.success('Analysis complete!')
    } catch (error) {
      toast.error('Failed to generate AI analysis')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const formatDateRange = () => {
    return `${format(dateRange.from, 'MMM d, yyyy')} - ${format(dateRange.to, 'MMM d, yyyy')}`
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <DialogTitle>AI Trading Psychology Analysis</DialogTitle>
          </div>
          <DialogDescription>
            Get insights into your trading psychology, emotional patterns, and performance based on your journal entries and trades
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 min-h-0">
          <div className="space-y-6">
            {/* Date Range Selection */}
            <div className="space-y-3">
              <label className="text-sm font-medium">Select Date Range</label>
              
              {/* Templates */}
              <div className="flex flex-wrap gap-2">
                {dateRangeTemplates.map((template) => (
                  <Button
                    key={template.id}
                    variant="outline"
                    size="sm"
                    onClick={() => handleTemplateSelect(template)}
                    className="text-xs"
                  >
                    {template.label}
                  </Button>
                ))}
                
                <Popover open={showCustomDatePicker} onOpenChange={setShowCustomDatePicker}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="text-xs gap-2">
                      <CalendarIcon className="h-3 w-3" />
                      Custom Range
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CustomDateRangePicker
                      selected={{ from: dateRange.from, to: dateRange.to }}
                      onSelect={(range) => {
                        if (range?.from && range?.to) {
                          setDateRange({ from: range.from, to: range.to })
                          setAnalysis(null)
                          setShowCustomDatePicker(false)
                        }
                      }}
                      className="w-fit"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Selected Range Display */}
              <div className="flex items-center gap-2 p-3 rounded-md bg-muted/50">
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{formatDateRange()}</span>
              </div>
            </div>

            {/* Analysis Results */}
            {analysis ? (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Summary */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Brain className="h-5 w-5 text-primary mt-0.5" />
                      <div className="space-y-2 flex-1">
                        <h3 className="font-semibold text-sm">Summary</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {analysis.summary}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Emotional Patterns */}
                {analysis.emotionalPatterns.length > 0 && (
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                        <div className="space-y-2 flex-1">
                          <h3 className="font-semibold text-sm">Emotional Patterns</h3>
                          <ul className="space-y-2">
                            {analysis.emotionalPatterns.map((pattern, index) => (
                              <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                                <span className="text-blue-600 dark:text-blue-400 mt-0.5">•</span>
                                <span className="flex-1">{pattern}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Performance Insights */}
                {analysis.performanceInsights.length > 0 && (
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Target className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                        <div className="space-y-2 flex-1">
                          <h3 className="font-semibold text-sm">Performance Insights</h3>
                          <ul className="space-y-2">
                            {analysis.performanceInsights.map((insight, index) => (
                              <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                                <span className="text-green-600 dark:text-green-400 mt-0.5">•</span>
                                <span className="flex-1">{insight}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Strengths & Weaknesses */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {analysis.strengths.length > 0 && (
                    <Card>
                      <CardContent className="p-4">
                        <div className="space-y-2">
                          <h3 className="font-semibold text-sm flex items-center gap-2">
                            <Badge variant="default" className="text-xs">Strengths</Badge>
                          </h3>
                          <ul className="space-y-1.5">
                            {analysis.strengths.map((strength, index) => (
                              <li key={index} className="text-xs text-muted-foreground flex items-start gap-2">
                                <span className="text-green-600 dark:text-green-400">✓</span>
                                <span className="flex-1">{strength}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {analysis.weaknesses.length > 0 && (
                    <Card>
                      <CardContent className="p-4">
                        <div className="space-y-2">
                          <h3 className="font-semibold text-sm flex items-center gap-2">
                            <Badge variant="destructive" className="text-xs">Areas to Improve</Badge>
                          </h3>
                          <ul className="space-y-1.5">
                            {analysis.weaknesses.map((weakness, index) => (
                              <li key={index} className="text-xs text-muted-foreground flex items-start gap-2">
                                <AlertTriangle className="h-3 w-3 text-orange-600 dark:text-orange-400 mt-0.5" />
                                <span className="flex-1">{weakness}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Recommendations */}
                {analysis.recommendations.length > 0 && (
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Lightbulb className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                        <div className="space-y-2 flex-1">
                          <h3 className="font-semibold text-sm">Recommendations</h3>
                          <ul className="space-y-2">
                            {analysis.recommendations.map((rec, index) => (
                              <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                                <span className="text-yellow-600 dark:text-yellow-400 mt-0.5">→</span>
                                <span className="flex-1">{rec}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center min-h-[300px]">
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                    <Sparkles className="h-8 w-8 text-primary" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Ready to Analyze</p>
                    <p className="text-xs text-muted-foreground max-w-sm">
                      Select a date range and click &ldquo;Generate Analysis&rdquo; to get AI-powered insights into your trading psychology
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="p-6 pt-4 border-t shrink-0 bg-muted/10">
          <div className="flex items-center justify-between w-full">
            <Button variant="outline" onClick={onClose} disabled={isAnalyzing}>
              Close
            </Button>
            <Button onClick={handleAnalyze} disabled={isAnalyzing}>
              {isAnalyzing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Analysis
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
