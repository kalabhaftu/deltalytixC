"use client"

import * as React from "react"
import { useState } from "react"
import { Calendar as CalendarIcon } from "lucide-react"
import { format, subDays, subMonths, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { useData } from "@/context/data-provider"
import { toast } from "sonner"
import DatePicker from "react-datepicker"
import "react-datepicker/dist/react-datepicker.css"
import "./datepicker-styles.css"

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

  const handlePresetClick = (preset: typeof DATE_PRESETS[0]) => {
    const range = preset.getValue()
    setStartDate(range.from || null)
    setEndDate(range.to || null)
    
    // Auto-apply presets immediately
    const newRange = range.from && range.to ? { from: range.from, to: range.to } : undefined
    setDateRange(newRange)
    
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
    toast.success("Date filter cleared")
    onSave?.()
  }

  const onDateChange = (dates: [Date | null, Date | null]) => {
    const [start, end] = dates
    setStartDate(start)
    setEndDate(end)
    
    // Auto-apply when both dates are selected
    if (start && end) {
      const newRange = { from: start, to: end }
      setDateRange(newRange)
      toast.success(
        `Date range: ${format(start, 'MMM d, yyyy')} - ${format(end, 'MMM d, yyyy')}`
      )
      // Don't close popover here, let user see the selection
    }
  }

  return (
    <div className="w-full min-w-[340px] max-w-[420px] p-4 space-y-4">
      <div className="space-y-2">
        <h4 className="font-semibold text-base">Date Range Filter</h4>
        <p className="text-sm text-muted-foreground">
          Filter trades by date range
        </p>
      </div>

      {/* Presets */}
      <div className="grid grid-cols-2 gap-1.5">
        {DATE_PRESETS.map((preset) => (
          <Button
            key={preset.label}
            variant="ghost"
            size="sm"
            onClick={() => handlePresetClick(preset)}
            className={cn(
              "justify-start text-xs h-8 font-normal",
              !startDate && !endDate && preset.label === "All time" && "bg-accent font-medium"
            )}
          >
            {preset.label}
          </Button>
        ))}
      </div>

      <Separator />

      {/* Date Picker */}
      <div className="flex flex-col gap-2">
        <DatePicker
          selected={startDate}
          onChange={onDateChange}
          startDate={startDate}
          endDate={endDate}
          selectsRange
          inline
          monthsShown={1}
          calendarClassName="custom-datepicker"
        />
      </div>

      <Separator />

      {/* Selected Range Display */}
      <div className="space-y-3">
        <div className="text-xs text-muted-foreground min-h-[20px] flex items-center">
          {startDate && endDate
            ? `${format(startDate, 'MMM d, yyyy')} - ${format(endDate, 'MMM d, yyyy')}`
            : startDate
            ? `From ${format(startDate, 'MMM d, yyyy')}`
            : "No date selected"}
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleClear}
            className="flex-1 h-9"
          >
            Clear
          </Button>
          <Button
            size="sm"
            onClick={handleApply}
            className="flex-1 h-9"
          >
            Apply
          </Button>
        </div>
      </div>
    </div>
  )
}
