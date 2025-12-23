import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"

type ViewMode = "daily" | "weekly"
type DisplayMetric = "pnl" | "rMultiple" | "ticks" | "percent"

interface CalendarViewState {
  viewMode: ViewMode
  setViewMode: (mode: ViewMode) => void
  displayMetric: DisplayMetric
  setDisplayMetric: (metric: DisplayMetric) => void
  selectedDate: Date | null
  setSelectedDate: (date: Date | null) => void
  selectedWeekDate: Date | null
  setSelectedWeekDate: (date: Date | null) => void
}

export const useCalendarViewStore = create<CalendarViewState>()(
  persist(
    (set) => ({
      viewMode: "daily",
      setViewMode: (mode) => set({ viewMode: mode }),
      displayMetric: "pnl",
      setDisplayMetric: (metric) => set({ displayMetric: metric }),
      selectedDate: null,
      setSelectedDate: (date) => set({ selectedDate: date }),
      selectedWeekDate: null,
      setSelectedWeekDate: (date) => set({ selectedWeekDate: date })
    }),
    {
      name: "calendar-view-store",
      storage: createJSONStorage(() => localStorage),
    }
  )
)

export type { DisplayMetric }