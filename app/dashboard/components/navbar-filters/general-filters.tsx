"use client"

import * as React from "react"
import { useState, useMemo, useEffect } from "react"
import { Search, X, Filter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { useData } from "@/context/data-provider"
import { toast } from "sonner"

interface GeneralFiltersProps {
  onSave?: () => void
}

export function GeneralFilters({ onSave }: GeneralFiltersProps) {
  const { formattedTrades, instruments, setInstruments } = useData()
  const [selectedInstruments, setSelectedInstruments] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState("")

  // Initialize from context
  useEffect(() => {
    if (instruments && instruments.length > 0) {
      setSelectedInstruments(instruments)
    }
  }, [instruments])

  // Get all unique instruments from trades
  const availableInstruments = useMemo(() => {
    const instrumentSet = new Set<string>()
    if (formattedTrades && Array.isArray(formattedTrades)) {
      formattedTrades.forEach(trade => {
        if (trade.symbol) instrumentSet.add(trade.symbol)
        else if (trade.instrument) instrumentSet.add(trade.instrument)
      })
    }
    return Array.from(instrumentSet).sort()
  }, [formattedTrades])

  // Count trades per instrument
  const instrumentCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    if (formattedTrades && Array.isArray(formattedTrades)) {
      formattedTrades.forEach(trade => {
        const inst = trade.symbol || trade.instrument
        if (inst) {
          counts[inst] = (counts[inst] || 0) + 1
        }
      })
    }
    return counts
  }, [formattedTrades])

  // Filter instruments by search
  const filteredInstruments = useMemo(() => {
    if (!searchQuery) return availableInstruments
    const query = searchQuery.toLowerCase()
    return availableInstruments.filter(inst => inst.toLowerCase().includes(query))
  }, [availableInstruments, searchQuery])

  const handleToggleInstrument = (instrument: string) => {
    setSelectedInstruments(prev =>
      prev.includes(instrument)
        ? prev.filter(i => i !== instrument)
        : [...prev, instrument]
    )
  }

  const handleSelectAll = () => {
    setSelectedInstruments([])
  }

  const handleClearAll = () => {
    setSelectedInstruments(availableInstruments)
  }

  const handleApply = () => {
    setInstruments(selectedInstruments)
    
    if (selectedInstruments.length === 0) {
      toast.success("Showing all instruments")
    } else {
      toast.success(
        `Filtering ${selectedInstruments.length} instrument${selectedInstruments.length > 1 ? 's' : ''}`
      )
    }
    
    onSave?.()
  }

  const handleClear = () => {
    setSelectedInstruments([])
    setInstruments([])
    toast.success("Instrument filter cleared")
    onSave?.()
  }

  const totalInstruments = availableInstruments.length
  const displayedCount = selectedInstruments.length === 0 ? totalInstruments : selectedInstruments.length

  return (
    <div className="w-full min-w-[300px] sm:min-w-[380px] max-w-[400px] sm:max-w-[480px] p-3 sm:p-4 space-y-2 sm:space-y-3">
      <div className="space-y-1 sm:space-y-2">
        <h4 className="font-semibold text-sm sm:text-base">Instrument Filter</h4>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Filter trades by instruments or symbols
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search instruments..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 h-8 sm:h-9 text-sm"
        />
      </div>

      {/* Quick Actions */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleSelectAll}
          disabled={selectedInstruments.length === 0}
          className="flex-1 h-8 sm:h-9 text-xs sm:text-sm"
        >
          All
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleClearAll}
          disabled={selectedInstruments.length === totalInstruments && totalInstruments > 0}
          className="flex-1 h-8 sm:h-9 text-xs sm:text-sm"
        >
          None
        </Button>
      </div>

      <Separator />

      {/* Instrument List */}
      <ScrollArea className="h-[200px] sm:h-[280px] pr-3">
        {totalInstruments === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 sm:py-12 text-center">
            <Filter className="h-8 w-8 sm:h-12 sm:w-12 text-muted-foreground/30 mb-2 sm:mb-3" />
            <p className="text-xs sm:text-sm text-muted-foreground">No instruments available</p>
            <p className="text-xs text-muted-foreground mt-1">Import trades to see instruments</p>
          </div>
        ) : filteredInstruments.length > 0 ? (
          <div className="space-y-1.5">
            {filteredInstruments.map((instrument) => {
              const tradeCount = instrumentCounts[instrument] || 0

              return (
                <div key={instrument} className="flex items-center gap-2 py-1">
                  <Checkbox
                    id={`instrument-${instrument}`}
                    checked={selectedInstruments.includes(instrument) || selectedInstruments.length === 0}
                    onCheckedChange={() => handleToggleInstrument(instrument)}
                  />
                  <Label
                    htmlFor={`instrument-${instrument}`}
                    className="flex-1 text-xs sm:text-sm cursor-pointer flex items-center justify-between"
                  >
                    <span className="font-medium truncate">{instrument}</span>
                    <Badge variant="secondary" className="text-xs h-4 sm:h-5 px-1.5 sm:px-2">
                      {tradeCount}
                    </Badge>
                  </Label>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-6 sm:py-8 text-muted-foreground text-xs sm:text-sm">
            No instruments match "{searchQuery}"
          </div>
        )}
      </ScrollArea>

      <Separator />

      {/* Selected Summary & Apply */}
      <div className="space-y-2 sm:space-y-3">
        <div className="flex items-center justify-between text-xs sm:text-sm">
          <span className="text-muted-foreground">
            {selectedInstruments.length === 0
              ? `All ${totalInstruments} instruments`
              : `${selectedInstruments.length} of ${totalInstruments} instruments`}
          </span>
          {selectedInstruments.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSelectAll}
              className="h-6 text-xs px-2"
            >
              Reset
            </Button>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleClear}
            disabled={totalInstruments === 0}
            className="flex-1 h-7 sm:h-8 text-xs sm:text-sm"
          >
            Clear
          </Button>
          <Button
            onClick={handleApply}
            disabled={totalInstruments === 0}
            className="flex-1 h-7 sm:h-8 text-xs sm:text-sm"
          >
            Apply
          </Button>
        </div>
      </div>
    </div>
  )
}
