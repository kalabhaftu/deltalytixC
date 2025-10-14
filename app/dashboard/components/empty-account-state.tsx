'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Filter, TrendingUp, BarChart3 } from "lucide-react"

interface EmptyAccountStateProps {
  onOpenAccountSelector?: () => void
}

export function EmptyAccountState({ onOpenAccountSelector }: EmptyAccountStateProps) {
  return (
    <div className="flex items-center justify-center min-h-[500px] p-4">
      <Card className="max-w-md w-full border-dashed">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Filter className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Select Accounts to View Data</CardTitle>
          <CardDescription className="text-base mt-2">
            Choose which trading accounts you&apos;d like to analyze. Your widgets will display data from your selected accounts.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-start gap-3 text-sm text-muted-foreground">
              <TrendingUp className="h-5 w-5 mt-0.5 flex-shrink-0" />
              <p>View performance metrics, charts, and statistics for your trading activity</p>
            </div>
            <div className="flex items-start gap-3 text-sm text-muted-foreground">
              <BarChart3 className="h-5 w-5 mt-0.5 flex-shrink-0" />
              <p>Filter by specific accounts, date ranges, or trading instruments</p>
            </div>
          </div>
          
          <Button 
            onClick={onOpenAccountSelector}
            className="w-full mt-4"
            size="lg"
          >
            <Filter className="h-4 w-4 mr-2" />
            Select Accounts
          </Button>
          
          <p className="text-xs text-center text-muted-foreground mt-4">
            Tip: Click the filter icon in the navigation bar to manage account selections
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

