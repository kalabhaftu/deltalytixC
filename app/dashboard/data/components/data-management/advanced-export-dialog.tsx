'use client'

import { useState, useEffect, useMemo } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Download, Loader2, Database } from 'lucide-react'
import { Checkbox } from "@/components/ui/checkbox"
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

  // Selection states
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([])
  const [selectedInstruments, setSelectedInstruments] = useState<string[]>([])
  const [selectAllAccounts, setSelectAllAccounts] = useState(true)
  const [selectAllInstruments, setSelectAllInstruments] = useState(true)
  const [dateRange, setDateRange] = useState<DateRange>({ from: undefined, to: undefined })
  const [isAllTime, setIsAllTime] = useState(true)

  // Get unique accounts
  const accountsList = useMemo(() => {
    if (!allAccounts || accountsLoading) return []
    return allAccounts.map(account => ({
      id: account.id,
      name: account.displayName || account.name || account.number,
      number: account.number
    }))
  }, [allAccounts, accountsLoading])

  // Get instruments from TRADES (filtering by selected accounts)
  const instrumentsList = useMemo(() => {
    // If specific accounts selected, filter trades first
    const relevantTrades = (!selectAllAccounts && selectedAccounts.length > 0)
      ? formattedTrades.filter(t => {
        const tradeAccount = allAccounts?.find(acc =>
          acc.number === t.accountNumber || acc.id === t.accountId
        )
        return tradeAccount && selectedAccounts.includes(tradeAccount.id)
      })
      : formattedTrades

    // Extract unique instruments
    return Array.from(new Set(relevantTrades.map(t => t.instrument).filter(Boolean))).sort()
  }, [formattedTrades, selectedAccounts, selectAllAccounts, allAccounts])

  // Initialize selections when lists load
  useEffect(() => {
    if (accountsList.length > 0 && selectedAccounts.length === 0 && selectAllAccounts) {
      setSelectedAccounts(accountsList.map(a => a.id))
    }
  }, [accountsList, selectAllAccounts, selectedAccounts.length])

  useEffect(() => {
    if (instrumentsList.length > 0 && selectedInstruments.length === 0 && selectAllInstruments) {
      setSelectedInstruments(instrumentsList)
    }
  }, [instrumentsList, selectAllInstruments, selectedInstruments.length])

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
      toast.info('Preparing system export...', {
        id: 'export',
        description: 'Generating comprehensive backup archive...',
        duration: Infinity
      })

      const filters = {
        accountIds: selectAllAccounts ? undefined : selectedAccounts,
        instruments: selectAllInstruments ? undefined : selectedInstruments,
        from: !isAllTime && dateRange.from ? dateRange.from.toISOString() : undefined,
        to: !isAllTime && dateRange.to ? dateRange.to.toISOString() : undefined
      }

      const response = await fetch('/api/data/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(filters)
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.error || 'Export failed')
      }

      // Download the file
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `deltalytix-system-backup-${new Date().toISOString().split('T')[0]}.zip`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast.success('System Backup Complete', {
        id: 'export',
        description: 'Your data has been successfully exported.'
      })
      setIsOpen(false)
    } catch (error) {
      console.error(error)
      toast.error('Export Failed', {
        id: 'export',
        description: 'Could not generate backup. Please try again.'
      })
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Database className="mr-2 h-4 w-4" /> System Backup
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>System Data Export</DialogTitle>
          <DialogDescription>
            Create a full backup of your trading history, accounts, and images.
            Select specific filters below or export everything (recommended).
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4">

            {/* Filter Controls */}
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
                    <label htmlFor="allTime" className="text-sm font-medium cursor-pointer">
                      Export all history (Full System Backup)
                    </label>
                  </div>

                  {!isAllTime && (
                    <div className="flex justify-start pt-2">
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

            {/* Accounts Selection */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex justify-between items-center">
                  <span>Accounts</span>
                  <span className="text-xs font-normal text-muted-foreground">{selectedAccounts.length} selected</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center space-x-2 border-b pb-2">
                    <Checkbox
                      id="selectAllAccounts"
                      checked={selectAllAccounts}
                      onCheckedChange={handleSelectAllAccounts}
                    />
                    <label htmlFor="selectAllAccounts" className="text-sm font-medium cursor-pointer">
                      Select All
                    </label>
                  </div>
                  <ScrollArea className="h-[200px] pr-4">
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
                          <label htmlFor={`account-${account.id}`} className="text-sm cursor-pointer truncate">
                            {account.name} <span className="text-xs text-muted-foreground">({account.number})</span>
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
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex justify-between items-center">
                  <span>Instruments</span>
                  <span className="text-xs font-normal text-muted-foreground">{selectedInstruments.length} selected</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center space-x-2 border-b pb-2">
                    <Checkbox
                      id="selectAllInstruments"
                      checked={selectAllInstruments}
                      onCheckedChange={handleSelectAllInstruments}
                    />
                    <label htmlFor="selectAllInstruments" className="text-sm font-medium cursor-pointer">
                      Select All
                    </label>
                  </div>
                  <ScrollArea className="h-[200px] pr-4">
                    {instrumentsList.length === 0 ? (
                      <div className="text-center py-8 text-sm text-muted-foreground">
                        No instruments available
                      </div>
                    ) : (
                      instrumentsList.map(instrument => (
                        <div key={instrument} className="flex items-center space-x-2 mb-2">
                          <Checkbox
                            id={`instrument-${instrument}`}
                            checked={selectedInstruments.includes(instrument)}
                            onCheckedChange={() => handleInstrumentChange(instrument)}
                          />
                          <label htmlFor={`instrument-${instrument}`} className="text-sm cursor-pointer">
                            {instrument}
                          </label>
                        </div>
                      ))
                    )}
                  </ScrollArea>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="p-4 bg-background border-t mt-auto">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Click Export to download your backup archive.
            </div>
            <Button
              onClick={handleExport}
              disabled={(selectedAccounts.length === 0 && !selectAllAccounts) || isExporting}
            >
              {isExporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Archive...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Download Backup
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
