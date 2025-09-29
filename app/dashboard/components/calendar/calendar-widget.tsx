'use client'

import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function CalendarPnl() {
  return (
    <Card className="w-full h-full">
      <CardHeader>
        <CardTitle>Calendar Widget</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center justify-center h-64">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-muted rounded-lg flex items-center justify-center">
            <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h3 className="font-medium text-foreground">Modern Calendar Coming Soon</h3>
            <p className="text-sm text-muted-foreground">Advanced calendar widget will be implemented</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}