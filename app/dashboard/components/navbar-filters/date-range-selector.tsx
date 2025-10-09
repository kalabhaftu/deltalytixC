"use client"

import * as React from "react"
import { useState } from "react"
import { format, subDays, subMonths, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar as CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { useData } from "@/context/data-provider"
import { toast } from "sonner"
import { CustomDateRangePicker } from "@/components/ui/custom-date-range-picker"

export interface DateRange {
  from: Date | undefined
  to: Date | undefined
}

interface DateRangeSelectorProps {
  onSave?: () => void
}

const DATE_PRESETS = [
  {
    label: "Today",
    getValue: () => ({
      from: new Date(),
      to: new Date()
    })
  },
  {
    label: "Yesterday",
    getValue: () => ({
      from: subDays(new Date(), 1),
      to: subDays(new Date(), 1)
    })
  },
  {
    label: "Last 7 days",
    getValue: () => ({
      from: subDays(new Date(), 6),
      to: new Date()
    })
  },
  {
    label: "Last 30 days",
    getValue: () => ({
      from: subDays(new Date(), 29),
      to: new Date()
    })
  },
  {
    label: "This month",
    getValue: () => ({
      from: startOfMonth(new Date()),
      to: endOfMonth(new Date())
    })
  },
  {
    label: "Last month",
    getValue: () => {
      const lastMonth = subMonths(new Date(), 1)
      return {
        from: startOfMonth(lastMonth),
        to: endOfMonth(lastMonth)
      }
    }
  },
  {
    label: "This year",
    getValue: () => ({
      from: startOfYear(new Date()),
      to: endOfYear(new Date())
    })
  },
  {
    label: "All time",
    getValue: () => ({
      from: undefined,
      to: undefined
    })
  }
]

export function DateRangeSelector({ onSave }: DateRangeSelectorProps) {
  const { dateRange, setDateRange } = useData()
  const [startDate, setStartDate] = useState<Date | null>(dateRange?.from || null)
  const [endDate, setEndDate] = useState<Date | null>(dateRange?.to || null)
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false)

  const handlePresetClick = (preset: typeof DATE_PRESETS[0]) => {
    const range = preset.getValue()
    setStartDate(range.from || null)
    setEndDate(range.to || null)

    // Auto-apply presets immediately
    const newRange = range.from && range.to ? { from: range.from, to: range.to } : undefined
    setDateRange(newRange)
    setIsDatePickerOpen(false)

    if (!range.from && !range.to) {
      toast.success("Showing all dates")
    } else if (range.from && range.to) {
      toast.success(
        `Date range: ${format(range.from, 'MMM d, yyyy')} - ${format(range.to, 'MMM d, yyyy')}`
      )
    }

    onSave?.()
  }

  const handleApply = () => {
    const newRange = startDate && endDate ? { from: startDate, to: endDate } : undefined
    setDateRange(newRange)
    setIsDatePickerOpen(false)

    if (!startDate && !endDate) {
      toast.success("Showing all dates")
    } else if (startDate && endDate) {
      toast.success(
        `Date range: ${format(startDate, 'MMM d, yyyy')} - ${format(endDate, 'MMM d, yyyy')}`
      )
    } else if (startDate) {
      toast.success(`Starting from: ${format(startDate, 'MMM d, yyyy')}`)
    }

    onSave?.()
  }

  const handleClear = () => {
    setStartDate(null)
    setEndDate(null)
    setDateRange(undefined)
    setIsDatePickerOpen(false)
    toast.success("Date filter cleared")
    onSave?.()
  }


  return (
    <div className="w-full min-w-[280px] sm:min-w-[320px] max-w-[360px] sm:max-w-[400px] p-3 sm:p-4 space-y-3 sm:space-y-4">
      <div className="space-y-2">
        <h4 className="font-semibold text-sm sm:text-base">Date Range Filter</h4>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Filter trades by date range
        </p>
      </div>

      {/* Presets */}
      <div className="grid grid-cols-2 gap-1 sm:gap-1.5">
        {DATE_PRESETS.map((preset) => (
          <Button
            key={preset.label}
            variant="ghost"
            size="sm"
            onClick={() => handlePresetClick(preset)}
            className={cn(
              "justify-start text-xs h-8 sm:h-9 font-normal",
              !startDate && !endDate && preset.label === "All time" && "bg-accent font-medium"
            )}
          >
            {preset.label}
          </Button>
        ))}
      </div>

      <Separator />

      {/* Custom Date Range Picker */}
      <div className="flex flex-col gap-2">
        <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-start text-left font-normal h-10 sm:h-11 text-sm border-border bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
              <span className="text-foreground">
                {startDate && endDate
                  ? `${format(startDate, 'MMM d, yyyy')} - ${format(endDate, 'MMM d, yyyy')}`
                  : startDate
                  ? `From ${format(startDate, 'MMM d, yyyy')}`
                  : "Select date range"}
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <CustomDateRangePicker
              selected={{ from: startDate || undefined, to: endDate || undefined }}
              onSelect={(range) => {
                if (range) {
                  setStartDate(range.from || null)
                  setEndDate(range.to || null)
                  
                  // Auto-apply when both dates are selected
                  if (range.from && range.to) {
                    const newRange = { from: range.from, to: range.to }
                    setDateRange(newRange)
                    toast.success(
                      `Date range: ${format(range.from, 'MMM d, yyyy')} - ${format(range.to, 'MMM d, yyyy')}`
                    )
                    setIsDatePickerOpen(false)
                    onSave?.()
                  }
                } else {
                  setStartDate(null)
                  setEndDate(null)
                  setDateRange(undefined)
                }
              }}
              className="w-fit"
            />
          </PopoverContent>
        </Popover>
      </div>

      <Separator />

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleClear}
          className="flex-1 h-8 sm:h-9 text-sm"
        >
          Clear
        </Button>
        <Button
          size="sm"
          onClick={handleApply}
          className="flex-1 h-8 sm:h-9 text-sm"
        >
          Apply
        </Button>
      </div>
    </div>
  )
}
