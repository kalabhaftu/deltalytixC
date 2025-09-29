'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function SharedWidgetCanvas() {
  return (
    <div className="p-4 space-y-6">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Shared Dashboard Coming Soon</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto bg-muted rounded-lg flex items-center justify-center">
              <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
              </svg>
            </div>
            <div>
              <h3 className="font-medium text-foreground">Modern Shared Dashboard Coming Soon</h3>
              <p className="text-sm text-muted-foreground">Advanced sharing features will be implemented</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}