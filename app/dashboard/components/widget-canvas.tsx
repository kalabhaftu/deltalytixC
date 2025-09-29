"use client"

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useData } from '@/context/data-provider'
import { getWidgetComponent } from '../config/widget-registry'

export default function WidgetCanvas() {
  const { user, dashboardLayout: layouts } = useData()

  // Simple layout - just show calendar widget for now
  const hasCalendarWidget = layouts?.desktop?.some(widget => widget.type === 'calendarWidget')

  return (
    <div className="p-4 space-y-6">
      {hasCalendarWidget ? (
        <div className="w-full">
          {getWidgetComponent('calendarWidget', 'extra-large')}
        </div>
      ) : (
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Modern Dashboard Coming Soon</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center h-64">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-muted rounded-lg flex items-center justify-center">
                <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 00-2-2z" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-foreground">Advanced Grid System Coming Soon</h3>
                <p className="text-sm text-muted-foreground">Modern widget layout system will replace the old grid</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
