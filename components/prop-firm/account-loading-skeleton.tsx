'use client'

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface AccountLoadingSkeletonProps {
  className?: string
}

export function AccountLoadingState({ className }: AccountLoadingSkeletonProps) {
  return (
    <div className={cn("space-y-6", className)} style={{ minHeight: '800px' }}>
      {/* Header Skeleton - FIXED: Set exact dimensions to match actual header */}
      <div className="flex items-center justify-between" style={{ height: '72px' }}>
        <div className="flex items-center gap-4">
          <Skeleton className="h-9 w-16" /> {/* Back button - exact size */}
          <div className="space-y-2">
            <Skeleton className="h-7 w-64" /> {/* Account name - exact size */}
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-16" /> {/* Status badge */}
              <Skeleton className="h-5 w-20" /> {/* Phase badge */}
              <Skeleton className="h-5 w-12" /> {/* Live indicator */}
              <Skeleton className="h-4 w-24" /> {/* Prop firm name */}
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Skeleton className="h-9 w-20" /> {/* Refresh button - exact size */}
          <Skeleton className="h-4 w-32" /> {/* Last updated */}
        </div>
      </div>

      {/* Metrics Cards Skeleton - FIXED: Match actual card dimensions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" style={{ minHeight: '140px' }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="h-[140px]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 h-[44px]">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent className="h-[96px] flex flex-col justify-center">
              <Skeleton className="h-8 w-24 mb-2" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Progress Section Skeleton - FIXED: Set exact height */}
      <Card className="h-[200px]">
        <CardHeader className="h-[60px]">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-16" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4 h-[140px] flex flex-col justify-center">
          <Skeleton className="h-2 w-full" /> {/* Progress bar - proper height */}
          <div className="flex justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-24" />
          </div>
        </CardContent>
      </Card>

      {/* Tabs Skeleton - FIXED: Better layout representation */}
      <div className="space-y-4">
        <div className="flex space-x-1 border-b h-[44px] items-end">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className={cn("h-10 w-20", i === 0 && "bg-muted-foreground/20")} />
          ))}
        </div>
        
        {/* Tab Content Skeleton - FIXED: Realistic content layout */}
        <div className="space-y-6">
          {/* Account Cards Grid - More realistic for accounts page */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="h-[180px]">
                <CardHeader className="h-[60px]">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-5 w-20" />
                    <Skeleton className="h-4 w-12" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 h-[120px] flex flex-col justify-center">
                  <div className="flex justify-between">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                  <div className="flex justify-between">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                  <Skeleton className="h-2 w-full" /> {/* Progress bar */}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export function AccountMetricsLoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" style={{ minHeight: '140px' }}>
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="h-[140px]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 h-[44px]">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-4" />
          </CardHeader>
          <CardContent className="h-[96px] flex flex-col justify-center">
            <Skeleton className="h-8 w-20 mb-2" />
            <Skeleton className="h-3 w-32" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export function TradeListLoadingSkeleton() {
  return (
    <div className="space-y-3" style={{ minHeight: '640px' }}>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center justify-between p-4 border rounded-lg h-[76px]">
          <div className="flex items-center gap-4">
            <Skeleton className="h-6 w-6" />
            <div className="space-y-1">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
      ))}
    </div>
  )
}
