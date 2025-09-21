import { CalendarIcon, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { useData } from "@/context/data-provider"
import { useState } from "react"
import { useMediaQuery } from "@/hooks/use-media-query"
import { cn } from "@/lib/utils"
import { DateRange as ReactDayPickerDateRange } from "react-day-picker"

type DateRange = {
  from: Date
  to: Date
} | undefined
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, subMonths, startOfDay, endOfDay } from "date-fns"

import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"

export default function DateCalendarFilter() {
  const { dateRange, setDateRange } = useData()
  const [calendarOpen, setCalendarOpen] = useState(false)
  const isMobile = useMediaQuery('(max-width: 768px)')

  const formatDateRange = (range: DateRange | undefined) => {
    if (!range?.from) return "Pick Date"

    if (range.to && range.from.getTime() !== range.to.getTime()) {
      // Range selection
      const today = new Date()
      const yesterday = subDays(today, 1)
      const thisWeek = { from: startOfWeek(today), to: endOfWeek(today) }
      const thisMonth = { from: startOfMonth(today), to: endOfMonth(today) }

      // Check for common ranges
      if (range.from.getTime() === thisWeek.from.getTime() && range.to.getTime() === thisWeek.to.getTime()) {
        return "This Week"
      }
      if (range.from.getTime() === thisMonth.from.getTime() && range.to.getTime() === thisMonth.to.getTime()) {
        return "This Month"
      }
      if (range.from.getTime() === yesterday.getTime() && range.to.getTime() === yesterday.getTime()) {
        return "Yesterday"
      }

      return `${format(range.from, "MMM d")} - ${format(range.to, "MMM d")}`
    }

    return format(range.from, "MMM d, yyyy")
  }

  const quickDateOptions = [
    { label: "Today", range: { from: startOfDay(new Date()), to: endOfDay(new Date()) } },
    { label: "Yesterday", range: { from: startOfDay(subDays(new Date(), 1)), to: endOfDay(subDays(new Date(), 1)) } },
    { label: "Last 7 days", range: { from: startOfDay(subDays(new Date(), 6)), to: endOfDay(new Date()) } },
    { label: "This Week", range: { from: startOfWeek(new Date()), to: endOfWeek(new Date()) } },
    { label: "This Month", range: { from: startOfMonth(new Date()), to: endOfMonth(new Date()) } },
    { label: "Last 30 days", range: { from: startOfDay(subDays(new Date(), 29)), to: endOfDay(new Date()) } },
  ];

  const handleQuickSelect = (range: DateRange) => {
    setDateRange(range)
    setCalendarOpen(false)
  }

  const handleClearDate = () => {
    setDateRange(undefined)
    setCalendarOpen(false)
  }

  const DateButton = (
    <Button
      id="date"
      variant="outline"
      className={cn(
        "justify-between text-left font-normal min-w-[160px]",
        !dateRange && "text-muted-foreground"
      )}
      onClick={() => setCalendarOpen(true)}
    >
      <span className="flex items-center">
        <CalendarIcon className="h-4 w-4 mr-2" />
        {formatDateRange(dateRange)}
      </span>
      <ChevronDown className="h-4 w-4 opacity-50" />
    </Button>
  );

  const CalendarContent = (
    <div className="p-0">
      {/* Quick Select Options */}
      <div className="p-4 border-b bg-muted/50">
        <div className="space-y-2">
          {quickDateOptions.map((option) => (
          <Button
              key={option.label}
              variant={dateRange?.from?.getTime() === option.range.from.getTime() &&
                      dateRange?.to?.getTime() === option.range.to.getTime()
                      ? "default" : "ghost"}
              className="w-full justify-start text-sm"
              onClick={() => handleQuickSelect(option.range)}
            >
              {option.label}
              </Button>
            ))}
          </div>
      </div>

      {/* Clear Date Option */}
      {dateRange && (
        <>
          <Separator />
          <div className="p-4">
              <Button
              variant="destructive"
                className="w-full"
              onClick={handleClearDate}
            >
              Clear Date Filter
              </Button>
          </div>
        </>
      )}

      {/* Calendar */}
      <div className="p-4">
          <Calendar
            initialFocus
            mode="range"
          defaultMonth={dateRange?.from || new Date()}
            selected={dateRange}
          onSelect={(range) => {
            setDateRange(range as DateRange)
            // Close on mobile after selection
            if (isMobile && range?.from && range?.to) {
              setTimeout(() => setCalendarOpen(false), 100)
            }
          }}
            numberOfMonths={isMobile ? 1 : 2}
          className="rounded-md border-0"
          />
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={calendarOpen} onOpenChange={setCalendarOpen}>
        <SheetTrigger asChild>
          {DateButton}
        </SheetTrigger>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-lg">
          <SheetHeader className="pb-4">
            <SheetTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              Select Date Range
            </SheetTitle>
          </SheetHeader>
          <div className="overflow-auto">
            {CalendarContent}
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
      <PopoverTrigger asChild>
        {DateButton}
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="start">
        {CalendarContent}
      </PopoverContent>
    </Popover>
  );
}