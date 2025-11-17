import React from 'react'
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

// Unified skeleton system for all dashboard components
// Matches actual component dimensions and structure

interface DashboardSkeletonProps {
  variant?: 'kpi' | 'chart' | 'calendar' | 'table' | 'list'
  className?: string
  count?: number
}

export function DashboardSkeleton({ 
  variant = 'kpi', 
  className,
  count = 1 
}: DashboardSkeletonProps) {
  const skeletons = Array.from({ length: count }, (_, i) => i)

  switch (variant) {
    case 'kpi':
      return (
        <>
          {skeletons.map((i) => (
            <Card key={i} className={cn("h-[120px]", className)}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between h-full">
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-6 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                  <div className="h-12 w-12 rounded-full">
                    <Skeleton className="h-full w-full rounded-full" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </>
      )

    case 'chart':
      return (
        <>
          {skeletons.map((i) => (
            <Card key={i} className={cn("h-[320px]", className)}>
              <CardHeader className="p-4 pb-2">
                <Skeleton className="h-5 w-32" />
              </CardHeader>
              <CardContent className="p-4 pt-2">
                <Skeleton className="h-[260px] w-full" />
              </CardContent>
            </Card>
          ))}
        </>
      )

    case 'calendar':
      return (
        <>
          {skeletons.map((i) => (
            <Card key={i} className={cn("h-[600px]", className)}>
              <CardHeader className="p-4">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-6 w-32" />
                  <div className="flex gap-2">
                    <Skeleton className="h-8 w-8 rounded-md" />
                    <Skeleton className="h-8 w-8 rounded-md" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                {/* Calendar grid */}
                <div className="grid grid-cols-7 gap-2">
                  {Array.from({ length: 35 }, (_, i) => (
                    <Skeleton key={i} className="h-20 w-full rounded-md" />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </>
      )

    case 'table':
      return (
        <>
          {skeletons.map((i) => (
            <Card key={i} className={cn(className)}>
              <CardHeader className="p-4">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-9 w-24" />
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {Array.from({ length: 10 }, (_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </CardContent>
            </Card>
          ))}
        </>
      )

    case 'list':
      return (
        <>
          {skeletons.map((i) => (
            <div key={i} className={cn("space-y-3", className)}>
              {Array.from({ length: 5 }, (_, i) => (
                <Card key={i} className="p-4">
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-8 w-20" />
                  </div>
                </Card>
              ))}
            </div>
          ))}
        </>
      )

    default:
      return <Skeleton className={cn("h-32 w-full", className)} />
  }
}

// Specialized skeleton for the main dashboard page
export function MainDashboardSkeleton() {
  return (
    <div className="space-y-6 p-4">
      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 lg:gap-4">
        <DashboardSkeleton variant="kpi" count={5} />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DashboardSkeleton variant="chart" count={2} />
      </div>

      {/* Calendar & Additional Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <DashboardSkeleton variant="calendar" className="lg:col-span-2" />
        <DashboardSkeleton variant="chart" />
      </div>
    </div>
  )
}

