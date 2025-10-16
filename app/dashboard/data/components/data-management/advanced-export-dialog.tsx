'use client'

import { useState, useEffect, useMemo } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Download, Loader2 } from 'lucide-react'
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { CustomDateRangePicker, DateRange } from "@/components/ui/custom-date-range-picker"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { useData } from '@/context/data-provider'
import { useAccounts } from '@/hooks/use-accounts'

export function AdvancedExportDialog() {
  const { formattedTrades } = useData()
  const { accounts: allAccounts, isLoading: accountsLoading } = useAccounts()
  const [isOpen, setIsOpen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  // Get unique accounts and instruments - use the same structure as data management card
  const accountsList = useMemo(() => {
    if (!allAccounts || accountsLoading) return []
    return allAccounts.map(account => ({
      id: account.id,
      name: account.displayName || account.name || account.number,
      number: account.number
    }))
  }, [allAccounts, accountsLoading])

  const instrumentsList = useMemo(() => {
    return Array.from(new Set(formattedTrades.map(t => t.instrument).filter(Boolean)))
  }, [formattedTrades])

  // Selection states
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([])
  const [selectedInstruments, setSelectedInstruments] = useState<string[]>([])
  const [selectAllAccounts, setSelectAllAccounts] = useState(true)
  const [selectAllInstruments, setSelectAllInstruments] = useState(true)
  const [dateRange, setDateRange] = useState<DateRange>({ from: undefined, to: undefined })
  const [isAllTime, setIsAllTime] = useState(true)

  // Initialize selections
  useEffect(() => {
    if (selectAllAccounts) {
      setSelectedAccounts(accountsList.map(a => a.id))
    }
  }, [selectAllAccounts, accountsList])

  useEffect(() => {
    if (selectAllInstruments) {
      setSelectedInstruments(instrumentsList)
    }
  }, [selectAllInstruments, instrumentsList])

  const handleAccountChange = (accountId: string) => {
    setSelectedAccounts(prev => {
      const newSelection = prev.includes(accountId) 
        ? prev.filter(a => a !== accountId) 
        : [...prev, accountId]
      setSelectAllAccounts(newSelection.length === accountsList.length)
      return newSelection
    })
  }

  const handleInstrumentChange = (instrument: string) => {
    setSelectedInstruments(prev => {
      const newSelection = prev.includes(instrument) 
        ? prev.filter(i => i !== instrument) 
        : [...prev, instrument]
      setSelectAllInstruments(newSelection.length === instrumentsList.length)
      return newSelection
    })
  }

  const handleSelectAllAccounts = () => {
    if (selectAllAccounts) {
      setSelectedAccounts([])
      setSelectAllAccounts(false)
    } else {
      setSelectedAccounts(accountsList.map(a => a.id))
      setSelectAllAccounts(true)
    }
  }

  const handleSelectAllInstruments = () => {
    if (selectAllInstruments) {
      setSelectedInstruments([])
      setSelectAllInstruments(false)
    } else {
      setSelectedInstruments(instrumentsList)
      setSelectAllInstruments(true)
    }
  }

  const handleExport = async () => {
    try {
      setIsExporting(true)
      toast.info('Preparing export...', { 
        id: 'export',
        description: 'Please wait while your data is being prepared for export.',
        duration: Infinity
      })

      const filters = {
        accountIds: selectAllAccounts ? undefined : selectedAccounts,
        instruments: selectAllInstruments ? undefined : selectedInstruments,
        dateFrom: !isAllTime && dateRange.from ? dateRange.from.toISOString() : undefined,
        dateTo: !isAllTime && dateRange.to ? dateRange.to.toISOString() : undefined
      }

      const response = await fetch('/api/data/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ filters })
      })

      if (!response.ok) {
        throw new Error('Export failed')
      }

      // Download the file
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `deltalytix-export-${new Date().toISOString().split('T')[0]}.zip`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast.success('Export completed successfully!', { id: 'export' })
      setIsOpen(false)
    } catch (error) {
      console.error('Export error:', error)
      toast.error('Failed to export data', { id: 'export' })
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="default">
          <Download className="mr-2 h-4 w-4" /> Export Data
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Advanced Export</DialogTitle>
          <DialogDescription>
            Export all your data (trades, accounts, backtests, notes, etc.) to a ZIP file that can be re-imported later.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4">
            {/* Accounts Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Accounts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="selectAllAccounts" 
                      checked={selectAllAccounts} 
                      onCheckedChange={handleSelectAllAccounts}
                    />
                    <label htmlFor="selectAllAccounts" className="text-sm font-medium">
                      Select All ({accountsList.length})
                    </label>
                  </div>
                  <ScrollArea className="h-[200px] rounded border p-3">
                    {accountsLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : accountsList.length === 0 ? (
                      <div className="text-center py-8 text-sm text-muted-foreground">
                        No accounts found
                      </div>
                    ) : (
                      accountsList.map(account => (
                        <div key={account.id} className="flex items-center space-x-2 mb-2">
                          <Checkbox 
                            id={`account-${account.id}`} 
                            checked={selectedAccounts.includes(account.id)}
                            onCheckedChange={() => handleAccountChange(account.id)}
                          />
                          <label htmlFor={`account-${account.id}`} className="text-sm cursor-pointer">
                            {account.name}
                          </label>
                        </div>
                      ))
                    )}
                  </ScrollArea>
                </div>
              </CardContent>
            </Card>

            {/* Instruments Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Instruments</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="selectAllInstruments" 
                      checked={selectAllInstruments} 
                      onCheckedChange={handleSelectAllInstruments}
                    />
                    <label htmlFor="selectAllInstruments" className="text-sm font-medium">
                      Select All ({instrumentsList.length})
                    </label>
                  </div>
                  <ScrollArea className="h-[200px] rounded border p-3">
                    {instrumentsList.map(instrument => (
                      <div key={instrument} className="flex items-center space-x-2 mb-2">
                        <Checkbox 
                          id={`instrument-${instrument}`} 
                          checked={selectedInstruments.includes(instrument)}
                          onCheckedChange={() => handleInstrumentChange(instrument)}
                        />
                        <label htmlFor={`instrument-${instrument}`} className="text-sm">
                          {instrument}
                        </label>
                      </div>
                    ))}
                  </ScrollArea>
                </div>
              </CardContent>
            </Card>

            {/* Date Range Selection */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Date Range</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="allTime" 
                      checked={isAllTime} 
                      onCheckedChange={(checked) => setIsAllTime(checked as boolean)}
                    />
                    <label htmlFor="allTime" className="text-sm font-medium">
                      Export all time (recommended)
                    </label>
                  </div>
                  
                  {!isAllTime && (
                    <div className="flex justify-start">
                      <CustomDateRangePicker
                        selected={dateRange}
                        onSelect={(range) => setDateRange(range || { from: undefined, to: undefined })}
                        className="w-fit"
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="p-4 bg-background border-t mt-auto">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {selectedAccounts.length > 0 && selectedInstruments.length > 0 ? (
                <>
                  Ready to export {selectedAccounts.length} account(s) and {selectedInstruments.length} instrument(s)
                  {isAllTime && " (All Time)"}
                </>
              ) : (
                "Please select at least one account and instrument"
              )}
            </div>
            <Button 
              onClick={handleExport} 
              disabled={selectedAccounts.length === 0 || selectedInstruments.length === 0 || isExporting}
            >
              {isExporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" /> 
                  Export
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

