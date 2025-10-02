'use client'

import React from "react"
import DesktopCalendarPnl from "./desktop-calendar"
import { useData } from "@/context/data-provider"

/**
 * Mini Calendar - Simplified version without Daily/Weekly toggle
 * Always shows daily view with month navigation and weekly summary
 */
export default function MiniCalendarWrapper() {
  const { calendarData } = useData()

  return <DesktopCalendarPnl calendarData={calendarData} isMini={true} />
}

