'use client'

import { useState } from 'react'
import { Calendar, ChevronDown, Clock, CalendarDays } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import { DateRange as DayPickerDateRange } from 'react-day-picker'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, subMonths, startOfDay, endOfDay } from 'date-fns'

interface ImprovedDatePickerProps {
  onDateRangeChange?: (range: DayPickerDateRange | undefined) => void
  className?: string
}

export default function ImprovedDatePicker({ onDateRangeChange, className }: ImprovedDatePickerProps) {
  const [date, setDate] = useState<DayPickerDateRange>()
  const [isOpen, setIsOpen] = useState(false)

  const handleDateSelect = (range: DayPickerDateRange) => {
    setDate(range || undefined)
    onDateRangeChange?.(range || undefined)
    if (range?.from && range?.to) {
      setIsOpen(false)
    }
  }

  const quickSelectors = [
    {
      label: 'Today',
      getRange: () => {
        const today = new Date()
        return { from: startOfDay(today), to: endOfDay(today) }
      }
    },
    {
      label: 'Yesterday',
      getRange: () => {
        const yesterday = subDays(new Date(), 1)
        return { from: startOfDay(yesterday), to: endOfDay(yesterday) }
      }
    },
    {
      label: 'This Week',
      getRange: () => {
        const now = new Date()
        return { from: startOfWeek(now), to: endOfWeek(now) }
      }
    },
    {
      label: 'Last Week',
      getRange: () => {
        const now = new Date()
        const lastWeek = subDays(now, 7)
        return { from: startOfWeek(lastWeek), to: endOfWeek(lastWeek) }
      }
    },
    {
      label: 'This Month',
      getRange: () => {
        const now = new Date()
        return { from: startOfMonth(now), to: endOfMonth(now) }
      }
    },
    {
      label: 'Last Month',
      getRange: () => {
        const now = new Date()
        const lastMonth = subMonths(now, 1)
        return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) }
      }
    }
  ]

  const formatDateRange = (range: DayPickerDateRange) => {
    if (!range?.from) return 'Pick Date'
    if (!range.to) return format(range.from, 'MMM d, yyyy')
    return `${format(range.from, 'MMM d')} - ${format(range.to, 'MMM d, yyyy')}`
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "h-9 px-3 text-sm font-normal bg-background/50 hover:bg-background/80 border-border/50 hover:border-border transition-all duration-200 hover:shadow-md",
            !date && "text-muted-foreground",
            className
          )}
        >
          <Calendar className="mr-2 h-4 w-4" />
          <span className="hidden sm:inline">{date ? formatDateRange(date) : 'Pick Date'}</span>
          <span className="sm:hidden">Date</span>
          <ChevronDown className="ml-2 h-3 w-3 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 bg-background/95 backdrop-blur-xl border border-border/50 shadow-2xl" align="start">
        <div className="flex">
          {/* Quick Selectors */}
          <div className="flex flex-col border-r border-border/50">
            <div className="p-3 border-b border-border/50">
              <h4 className="text-sm font-medium text-foreground">Quick Select</h4>
            </div>
            <div className="p-2 space-y-1 min-w-[140px]">
              {quickSelectors.map((selector) => (
                <Button
                  key={selector.label}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-xs h-8 hover:bg-muted/50 transition-colors duration-200"
                  onClick={() => {
                    const range = selector.getRange()
                    handleDateSelect(range)
                  }}
                >
                  <Clock className="mr-2 h-3 w-3" />
                  {selector.label}
                </Button>
              ))}
            </div>
          </div>
          
          {/* Calendar */}
          <div className="p-3">
            <div className="mb-3">
              <h4 className="text-sm font-medium text-foreground">Custom Range</h4>
            </div>
            <CalendarComponent
              mode="range"
              required
              defaultMonth={date?.from}
              selected={date}
              onSelect={handleDateSelect}
              numberOfMonths={1}
              className="rounded-md border-0"
            />
            
            {/* Selected Range Display */}
            {date?.from && (
              <div className="mt-3 pt-3 border-t border-border/50">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Selected:</span>
                </div>
                <div className="mt-1">
                  <Badge variant="secondary" className="text-xs">
                    {formatDateRange(date)}
                  </Badge>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-2 h-7 text-xs"
                  onClick={() => {
                    setDate(undefined)
                    onDateRangeChange?.(undefined)
                    setIsOpen(false)
                  }}
                >
                  Clear Selection
                </Button>
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
