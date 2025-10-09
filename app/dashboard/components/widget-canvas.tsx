"use client"

import React from 'react'
import { getWidgetComponent } from '../config/widget-registry'

export default function WidgetCanvas() {
  // Default KPI widgets for upper section
  const defaultKpiWidgets = [
    'accountBalancePnl',
    'tradeWinRate', 
    'dayWinRate',
    'profitFactor',
    'avgWinLoss'
  ] as const

  // Default: show calendar widget
  const hasCalendarWidget = true

  return (
    <div className="space-y-6">
      {/* Upper Section - KPI Widgets Row */}
      <div className="px-4 pt-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {defaultKpiWidgets.map((widgetType) => (
            <div key={widgetType} className="w-full">
              {getWidgetComponent(widgetType, 'kpi')}
      </div>
          ))}
            </div>
          </div>

      {/* Main Content Section */}
      <div className="px-4 pb-4">
        {hasCalendarWidget ? (
          <div className="w-full">
            {getWidgetComponent('calendarAdvanced', 'extra-large')}
          </div>
        ) : null}
          </div>
    </div>
  )
}
