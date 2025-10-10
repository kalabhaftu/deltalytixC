'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'
import { Download, FileSpreadsheet, FileText, Image, Settings, Loader2 } from 'lucide-react'
import { exportTradesToPDF, exportTradesToExcel, exportChartToPDF, ExportOptions, TradeData, AnalyticsData } from '@/lib/export/export-utils'

interface ExportDialogProps {
  trades: TradeData[]
  analytics: AnalyticsData
  trigger?: React.ReactNode
  chartElements?: { [key: string]: HTMLElement }
}

export function ExportDialog({ trades, analytics, trigger, chartElements = {} }: ExportDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [exportType, setExportType] = useState<'pdf' | 'excel' | 'chart'>('pdf')
  const [selectedChart, setSelectedChart] = useState<string>('')
  const [isExporting, setIsExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)
  
  const [options, setOptions] = useState<ExportOptions>({
    filename: '',
    title: 'Trading Report',
    subtitle: '',
    includeCharts: true,
    includeLogo: true,
    pageOrientation: 'portrait',
    pageFormat: 'a4',
  })
  

  const handleExport = async () => {
    if (!options.filename) {
      toast.error('Error', {
        description: 'Please enter a filename',
      })
      return
    }

    setIsExporting(true)
    setExportProgress(0)

    try {
      const progressInterval = setInterval(() => {
        setExportProgress(prev => Math.min(prev + 10, 90))
      }, 200)

      switch (exportType) {
        case 'pdf':
          await exportTradesToPDF(trades, analytics, {
            ...options,
            filename: options.filename.endsWith('.pdf') ? options.filename : `${options.filename}.pdf`,
          })
          break
          
        case 'excel':
          await exportTradesToExcel(trades, analytics, {
            ...options,
            filename: options.filename.endsWith('.xlsx') ? options.filename : `${options.filename}.xlsx`,
          })
          break
          
        case 'chart':
          if (!selectedChart || !chartElements[selectedChart]) {
            throw new Error('Please select a chart to export')
          }
          await exportChartToPDF(chartElements[selectedChart], options.title || 'Chart Export', {
            ...options,
            filename: options.filename.endsWith('.pdf') ? options.filename : `${options.filename}.pdf`,
          })
          break
      }

      clearInterval(progressInterval)
      setExportProgress(100)
      
      toast.success('Export successful', {
        description: `Your ${exportType.toUpperCase()} file has been downloaded`,
      })
      
      setIsOpen(false)
    } catch (error) {
      console.error('Export failed:', error)
      toast.error('Export failed', {
        description: error instanceof Error ? error.message : 'Unknown error occurred',
      })
    } finally {
      setIsExporting(false)
      setExportProgress(0)
    }
  }

  const updateOption = (key: keyof ExportOptions, value: any) => {
    setOptions(prev => ({
      ...prev,
      [key]: value,
    }))
  }

  const getDefaultFilename = () => {
    const date = new Date().toISOString().split('T')[0]
    switch (exportType) {
      case 'pdf':
        return `deltalytix-report-${date}`
      case 'excel':
        return `deltalytix-data-${date}`
      case 'chart':
        return `deltalytix-chart-${date}`
      default:
        return `deltalytix-export-${date}`
    }
  }

  // Update filename when export type changes
  const handleExportTypeChange = (type: 'pdf' | 'excel' | 'chart') => {
    setExportType(type)
    if (!options.filename) {
      updateOption('filename', getDefaultFilename())
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        )}
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Download className="h-5 w-5" />
            <span>Export Data</span>
          </DialogTitle>
          <DialogDescription>
            Export your trading data in various formats for analysis or reporting.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Export Type Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Export Format</CardTitle>
              <CardDescription>Choose the format for your export</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card 
                  className={`cursor-pointer transition-colors ${
                    exportType === 'pdf' ? 'ring-2 ring-foreground bg-muted/30' : 'hover:bg-muted/50'
                  }`}
                  onClick={() => handleExportTypeChange('pdf')}
                >
                  <CardContent className="p-4 text-center">
                    <FileText className="h-8 w-8 mx-auto mb-2 text-red-600" />
                    <h3 className="font-medium">PDF Report</h3>
                    <p className="text-sm text-gray-500">Complete trading report with charts</p>
                    <Badge variant="outline" className="mt-2">Recommended</Badge>
                  </CardContent>
                </Card>

                <Card 
                  className={`cursor-pointer transition-colors ${
                    exportType === 'excel' ? 'ring-2 ring-foreground bg-muted/30' : 'hover:bg-muted/50'
                  }`}
                  onClick={() => handleExportTypeChange('excel')}
                >
                  <CardContent className="p-4 text-center">
                    <FileSpreadsheet className="h-8 w-8 mx-auto mb-2 text-green-600" />
                    <h3 className="font-medium">Excel Spreadsheet</h3>
                    <p className="text-sm text-gray-500">Raw data for further analysis</p>
                  </CardContent>
                </Card>

                <Card 
                  className={`cursor-pointer transition-colors ${
                    exportType === 'chart' ? 'ring-2 ring-foreground bg-muted/30' : 'hover:bg-muted/50'
                  }`}
                  onClick={() => handleExportTypeChange('chart')}
                >
                  <CardContent className="p-4 text-center">
                    <Image className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                    <h3 className="font-medium">Chart Export</h3>
                    <p className="text-sm text-gray-500">Export specific charts as PDF</p>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>

          {/* Chart Selection (for chart export) */}
          {exportType === 'chart' && Object.keys(chartElements).length > 0 && (
            <div>
              <Label>Select Chart</Label>
              <Select value={selectedChart} onValueChange={setSelectedChart}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a chart to export" />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(chartElements).map((chartKey) => (
                    <SelectItem key={chartKey} value={chartKey}>
                      {chartKey.charAt(0).toUpperCase() + chartKey.slice(1).replace(/([A-Z])/g, ' $1')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Basic Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="filename">Filename</Label>
              <Input
                id="filename"
                value={options.filename}
                onChange={(e) => updateOption('filename', e.target.value)}
                placeholder={getDefaultFilename()}
              />
            </div>

            <div>
              <Label htmlFor="title">Report Title</Label>
              <Input
                id="title"
                value={options.title}
                onChange={(e) => updateOption('title', e.target.value)}
                placeholder="Trading Report"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="subtitle">Subtitle (optional)</Label>
            <Input
              id="subtitle"
              value={options.subtitle}
              onChange={(e) => updateOption('subtitle', e.target.value)}
              placeholder="Analysis period or description"
            />
          </div>

          {/* PDF-specific options */}
          {(exportType === 'pdf' || exportType === 'chart') && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center space-x-2">
                  <Settings className="h-4 w-4" />
                  <span>PDF Options</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Page Orientation</Label>
                    <Select
                      value={options.pageOrientation}
                      onValueChange={(value: 'portrait' | 'landscape') =>
                        updateOption('pageOrientation', value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="portrait">Portrait</SelectItem>
                        <SelectItem value="landscape">Landscape</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Page Format</Label>
                    <Select
                      value={options.pageFormat}
                      onValueChange={(value: 'a4' | 'letter' | 'legal') =>
                        updateOption('pageFormat', value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="a4">A4</SelectItem>
                        <SelectItem value="letter">Letter</SelectItem>
                        <SelectItem value="legal">Legal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="include-logo"
                      checked={options.includeLogo}
                      onCheckedChange={(checked) => updateOption('includeLogo', checked)}
                    />
                    <Label htmlFor="include-logo">Include Logo</Label>
                  </div>

                  {exportType === 'pdf' && (
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="include-charts"
                        checked={options.includeCharts}
                        onCheckedChange={(checked) => updateOption('includeCharts', checked)}
                      />
                      <Label htmlFor="include-charts">Include Charts</Label>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Export Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Export Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-sm text-gray-500">Trades</p>
                  <p className="text-2xl font-bold">{trades.length}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total PnL</p>
                  <p className="text-2xl font-bold">${analytics.totalPnL.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Win Rate</p>
                  <p className="text-2xl font-bold">{analytics.winRate.toFixed(1)}%</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Format</p>
                  <p className="text-2xl font-bold">{exportType.toUpperCase()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Export Progress */}
          {isExporting && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Exporting your data...</p>
                    <Progress value={exportProgress} className="mt-2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isExporting}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={isExporting}>
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Export {exportType.toUpperCase()}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
