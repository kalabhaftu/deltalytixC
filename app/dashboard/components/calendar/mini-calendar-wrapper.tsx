'use client'

import React from "react"
import MiniCalendar from "./mini-calendar"
import { useData } from "@/context/data-provider"

/**
 * Mini Calendar - Dedicated component for compact Mon-Fri calendar
 * Shows monthly view with weekly summary on the right
 */
export default function MiniCalendarWrapper() {
  const { calendarData } = useData()

  return <MiniCalendar calendarData={calendarData} />
}

