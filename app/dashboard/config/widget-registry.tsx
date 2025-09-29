import React from 'react'
import { WidgetType, WidgetSize } from '../types/dashboard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { WidgetErrorBoundary } from '@/components/error-boundary'

// Calendar component (only remaining widget)
import CalendarPnl from '../components/calendar/calendar-widget'

export interface WidgetConfig {
  type: WidgetType
  defaultSize: WidgetSize
  allowedSizes: WidgetSize[]
  category: 'charts' | 'statistics' | 'tables' | 'other'
  requiresFullWidth?: boolean
  minWidth?: number
  minHeight?: number
  previewHeight?: number
  getComponent: (props: { size: WidgetSize }) => React.ReactElement
  getPreview: () => React.ReactElement
}

function CreateCalendarPreview() {
  const weekdays = [
    'Sun',
    'Mon',
    'Tue',
    'Wed',
    'Thu',
    'Fri',
    'Sat'
  ] as const

  return (
    <Card className="w-full h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Calendar</CardTitle>
      </CardHeader>
      <CardContent className="p-2">
        <div className="space-y-1">
          <div className="grid grid-cols-7 gap-1 text-xs text-muted-foreground">
            {weekdays.map(day => (
              <div key={day} className="text-center p-1">{day}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 35 }, (_, i) => (
              <div
                key={i}
                className="aspect-square text-xs flex items-center justify-center rounded hover:bg-muted"
              >
                {i % 7 === 0 ? Math.floor(i / 7) + 1 : ''}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export const WIDGET_REGISTRY: Record<WidgetType, WidgetConfig> = {
  calendarWidget: {
    type: 'calendarWidget',
    defaultSize: 'extra-large',
    allowedSizes: ['large', 'extra-large'],
    category: 'other',
    previewHeight: 500,
    getComponent: () => <CalendarPnl />,
    getPreview: () => <CreateCalendarPreview />
  },
}

export function getWidgetsByCategory(category: WidgetConfig['category']) {
  return Object.values(WIDGET_REGISTRY).filter(widget => widget.category === category)
}

export function isValidWidgetSize(type: WidgetType, size: WidgetSize): boolean {
  return WIDGET_REGISTRY[type].allowedSizes.includes(size)
}

export function requiresFullWidth(type: WidgetType): boolean {
  return WIDGET_REGISTRY[type].requiresFullWidth || false
}

export function getWidgetComponent(type: WidgetType, size: WidgetSize): React.ReactElement {
  return (
    <WidgetErrorBoundary widgetType={type}>
      {WIDGET_REGISTRY[type].getComponent({ size })}
    </WidgetErrorBoundary>
  )
}

export function getWidgetPreview(type: WidgetType): React.ReactElement {
  return WIDGET_REGISTRY[type].getPreview()
}