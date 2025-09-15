'use client'

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface AccountLoadingSkeletonProps {
  className?: string
}

export function AccountLoadingState({ className }: AccountLoadingSkeletonProps) {
  return (
    <div className={cn("space-y-6", className)}>
      {/* Header Skeleton */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Skeleton className="h-8 w-16" /> {/* Back button */}
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" /> {/* Account name */}
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-16" /> {/* Status badge */}
              <Skeleton className="h-6 w-20" /> {/* Phase badge */}
              <Skeleton className="h-6 w-12" /> {/* Live indicator */}
              <Skeleton className="h-4 w-24" /> {/* Prop firm name */}
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Skeleton className="h-8 w-20" /> {/* Refresh button */}
          <Skeleton className="h-4 w-32" /> {/* Last updated */}
        </div>
      </div>

      {/* Metrics Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-20" /> {/* Card title */}
              <Skeleton className="h-4 w-4" /> {/* Icon */}
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-24 mb-2" /> {/* Main value */}
              <Skeleton className="h-3 w-32" /> {/* Subtitle */}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Progress Section Skeleton */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-32" /> {/* Progress title */}
            <Skeleton className="h-4 w-16" /> {/* Percentage */}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-3 w-full" /> {/* Progress bar */}
          <div className="flex justify-between">
            <Skeleton className="h-4 w-24" /> {/* Current value */}
            <Skeleton className="h-4 w-24" /> {/* Target value */}
          </div>
        </CardContent>
      </Card>

      {/* Tabs Skeleton */}
      <div className="space-y-4">
        <div className="flex space-x-1">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-20" />
          ))}
        </div>
        
        {/* Tab Content Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="space-y-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex justify-between">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-40" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full" /> {/* Chart placeholder */}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export function AccountMetricsLoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="animate-pulse">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-4" />
          </CardHeader>
          <CardContent>
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
    <div className="space-y-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center justify-between p-4 border rounded-lg animate-pulse">
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
