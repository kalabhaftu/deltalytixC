'use client'

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface AccountLoadingSkeletonProps {
  className?: string
}

export function AccountLoadingState({ className }: AccountLoadingSkeletonProps) {
  return (
    <div className={cn("space-y-6", className)} style={{ minHeight: 'calc(100vh - 200px)' }}>
      {/* Header Skeleton - Optimized for faster perceived loading */}
      <div className="flex items-center justify-between h-[72px]">
        <div className="flex items-center gap-4">
          <Skeleton className="h-9 w-16 rounded-md" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-64 rounded-md" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-5 w-12 rounded-full" />
              <Skeleton className="h-4 w-24 rounded-md" />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-16 rounded-md" />
          <Skeleton className="h-8 w-20 rounded-md" />
          <Skeleton className="h-4 w-32 rounded-md" />
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
        
        {/* Tab Content Skeleton - Optimized layout */}
        <div className="space-y-6">
          {/* Account Cards Grid - Better performance and UX */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="h-full flex flex-col">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Skeleton className="h-4 w-4 rounded" />
                        <Skeleton className="h-5 w-32 rounded-md" />
                      </div>
                      <Skeleton className="h-3 w-24 rounded-md" />
                    </div>
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 flex-1">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Skeleton className="h-3 w-20 rounded-md" />
                      <Skeleton className="h-5 w-16 rounded-md" />
                    </div>
                    <div className="space-y-2">
                      <Skeleton className="h-3 w-12 rounded-md" />
                      <Skeleton className="h-5 w-8 rounded-md" />
                    </div>
                  </div>
                  <div className="min-h-[120px] space-y-3">
                    <Skeleton className="h-4 w-full rounded-md" />
                    <Skeleton className="h-4 w-3/4 rounded-md" />
                    <Skeleton className="h-6 w-full rounded-md" />
                  </div>
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
