import React from 'react'
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { cn } from "@/lib/utils"

// Modern skeleton system for all dashboard components
// Clean, detailed design without distracting animations

interface DashboardSkeletonProps {
  variant?: 'kpi' | 'chart' | 'calendar' | 'table' | 'list'
  className?: string
  count?: number
  height?: string
}

// Base skeleton block component - no animation
function SkeletonBlock({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div className={cn("bg-muted/60 rounded", className)} style={style} />
  )
}

export function DashboardSkeleton({ 
  variant = 'kpi', 
  className,
  count = 1,
  height
}: DashboardSkeletonProps) {
  const skeletons = Array.from({ length: count }, (_, i) => i)

  switch (variant) {
    case 'kpi':
      return (
        <>
          {skeletons.map((i) => (
            <Card key={i} className={cn("h-[120px]", className)}>
              <CardContent className="p-4 h-full flex flex-col justify-between">
                <div className="flex items-start justify-between">
                  <SkeletonBlock className="h-3 w-24" />
                  <SkeletonBlock className="h-8 w-8 rounded-lg" />
                </div>
                <div className="space-y-2">
                  <SkeletonBlock className="h-7 w-32" />
                  <SkeletonBlock className="h-3 w-20" />
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
            <Card key={i} className={cn("h-[360px]", className)} style={height ? { height } : undefined}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <SkeletonBlock className="h-5 w-32" />
                  <SkeletonBlock className="h-6 w-20 rounded-md" />
                </div>
              </CardHeader>
              <CardContent className="pt-0 h-[calc(100%-60px)]">
                <div className="h-full flex flex-col">
                  {/* Y-axis labels */}
                  <div className="flex h-full">
                    <div className="flex flex-col justify-between pr-2 py-4">
                      <SkeletonBlock className="h-3 w-8" />
                      <SkeletonBlock className="h-3 w-8" />
                      <SkeletonBlock className="h-3 w-8" />
                      <SkeletonBlock className="h-3 w-8" />
                    </div>
                    {/* Chart area */}
                    <div className="flex-1 flex items-end gap-2 p-4 bg-muted/20 rounded-lg">
                      {Array(7).fill(0).map((_, j) => (
                        <div key={j} className="flex-1 flex flex-col justify-end h-full">
                          <SkeletonBlock 
                            className="w-full rounded-t" 
                            style={{ height: `${[45, 70, 55, 80, 40, 65, 75][j]}%` }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* X-axis labels */}
                  <div className="flex justify-around pt-2 pl-10">
                    {Array(7).fill(0).map((_, j) => (
                      <SkeletonBlock key={j} className="h-3 w-8" />
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </>
      )

    case 'calendar':
      return (
        <>
          {skeletons.map((i) => (
            <Card key={i} className={cn("h-[300px]", className)} style={height ? { height } : undefined}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <SkeletonBlock className="h-5 w-28" />
                  <div className="flex gap-1">
                    <SkeletonBlock className="h-7 w-7 rounded-md" />
                    <SkeletonBlock className="h-7 w-7 rounded-md" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {/* Weekday headers */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((_, j) => (
                    <div key={j} className="text-center">
                      <SkeletonBlock className="h-4 w-4 mx-auto" />
                    </div>
                  ))}
                </div>
                {/* Calendar grid */}
                <div className="space-y-1">
                  {Array(5).fill(0).map((_, weekIndex) => (
                    <div key={weekIndex} className="grid grid-cols-7 gap-1">
                      {Array(7).fill(0).map((_, dayIndex) => (
                        <SkeletonBlock 
                          key={dayIndex} 
                          className="aspect-square rounded-md" 
                        />
                      ))}
                    </div>
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
            <Card key={i} className={cn("h-[300px]", className)} style={height ? { height } : undefined}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <SkeletonBlock className="h-5 w-36" />
                  <SkeletonBlock className="h-6 w-16 rounded-md" />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {/* Table header */}
                <div className="flex items-center gap-4 py-3 border-b border-muted">
                  <SkeletonBlock className="h-4 w-20" />
                  <SkeletonBlock className="h-4 w-24" />
                  <SkeletonBlock className="h-4 w-16 ml-auto" />
                  <SkeletonBlock className="h-4 w-16" />
                </div>
                {/* Table rows */}
                <div className="space-y-0">
                  {Array(5).fill(0).map((_, r) => (
                    <div key={r} className="flex items-center gap-4 py-3 border-b border-muted/50">
                      <div className="flex items-center gap-2">
                        <SkeletonBlock className="h-6 w-6 rounded-full" />
                        <SkeletonBlock className="h-4 w-16" />
                      </div>
                      <SkeletonBlock className="h-4 w-20" />
                      <SkeletonBlock className="h-5 w-12 rounded ml-auto" />
                      <SkeletonBlock className="h-4 w-16" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </>
      )

    case 'list':
      return (
        <>
          {skeletons.map((i) => (
            <Card key={i} className={cn("h-[400px]", className)} style={height ? { height } : undefined}>
              <CardHeader className="pb-2">
                <SkeletonBlock className="h-5 w-40" />
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                {Array(4).fill(0).map((_, j) => (
                  <div key={j} className="p-3 rounded-lg border border-muted/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <SkeletonBlock className="h-8 w-8 rounded-lg" />
                        <div className="space-y-1">
                          <SkeletonBlock className="h-4 w-24" />
                          <SkeletonBlock className="h-3 w-16" />
                        </div>
                      </div>
                      <SkeletonBlock className="h-5 w-14 rounded" />
                    </div>
                    <SkeletonBlock className="h-2 w-full rounded-full" />
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </>
      )

    default:
      return <SkeletonBlock className={cn("h-32 w-full rounded-lg", className)} />
  }
}

// Specialized skeleton for the main dashboard page
export function MainDashboardSkeleton() {
  return (
    <div className="px-4 sm:px-6 py-8">
      <div className="max-w-7xl mx-auto flex flex-col gap-6">
        {/* KPI Row */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {[0, 1, 2, 3, 4].map((i) => (
            <Card key={`kpi-${i}`} className="min-h-[120px]">
              <CardContent className="p-4 h-full flex flex-col justify-between">
                <div className="flex items-start justify-between">
                  <SkeletonBlock className="h-3 w-24" />
                  <SkeletonBlock className="h-8 w-8 rounded-lg" />
                </div>
                <div className="space-y-2">
                  <SkeletonBlock className="h-7 w-32" />
                  <SkeletonBlock className="h-3 w-20" />
                </div>
              </CardContent>
            </Card>
          ))}
        </section>

        {/* Table / Calendar Row */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2 min-h-[280px] flex flex-col">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <SkeletonBlock className="h-5 w-36" />
                <SkeletonBlock className="h-6 w-16 rounded-md" />
              </div>
            </CardHeader>
            <CardContent className="pt-0 flex-1">
              {[0, 1, 2, 3, 4].map((r) => (
                <div key={`table-row-${r}`} className="flex items-center gap-4 py-3 border-b border-muted/50">
                  <SkeletonBlock className="h-4 w-20" />
                  <SkeletonBlock className="h-4 w-24" />
                  <SkeletonBlock className="h-4 w-16 ml-auto" />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="min-h-[280px] flex flex-col">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <SkeletonBlock className="h-5 w-28" />
                <div className="flex gap-1">
                  <SkeletonBlock className="h-7 w-7 rounded-md" />
                  <SkeletonBlock className="h-7 w-7 rounded-md" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0 flex-1">
              <div className="grid grid-cols-7 gap-1 mb-2">
                {[...Array(7)].map((_, d) => (
                  <SkeletonBlock key={`weekday-${d}`} className="h-4 w-4 mx-auto" />
                ))}
              </div>
              <div className="space-y-1">
                {[...Array(5)].map((_, week) => (
                  <div key={`calendar-week-${week}`} className="grid grid-cols-7 gap-1">
                    {[...Array(7)].map((_, day) => (
                      <SkeletonBlock key={`calendar-cell-${week}-${day}`} className="aspect-square rounded-md" />
                    ))}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Performance Row */}
        <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <Card className="xl:col-span-2 min-h-[320px] flex flex-col">
            <CardHeader className="pb-2">
              <SkeletonBlock className="h-5 w-32" />
            </CardHeader>
            <CardContent className="pt-0 flex-1">
              <div className="h-full flex items-end gap-3 bg-muted/20 rounded-lg p-4">
                {[...Array(8)].map((_, j) => (
                  <div key={`perf-bar-${j}`} className="flex-1 flex flex-col justify-end">
                    <SkeletonBlock
                      className="w-full rounded-t"
                      style={{ height: `${[30, 55, 45, 70, 50, 65, 40, 60][j]}%` }}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-4">
            {[0, 1].map((i) => (
              <Card key={`stat-card-${i}`} className="min-h-[150px] flex flex-col">
                <CardContent className="p-4 space-y-3 flex-1">
                  <SkeletonBlock className="h-4 w-1/2" />
                  {[0, 1, 2].map((row) => (
                    <div key={`stat-line-${i}-${row}`} className="flex items-center justify-between">
                      <SkeletonBlock className="h-3 w-20" />
                      <SkeletonBlock className="h-4 w-16" />
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Secondary Widgets Row */}
        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <Card key={`secondary-${i}`} className="min-h-[260px] flex flex-col">
              <CardHeader className="pb-2">
                <SkeletonBlock className="h-5 w-28" />
              </CardHeader>
              <CardContent className="pt-0 flex-1">
                <div className="h-full flex items-end gap-2 bg-muted/20 rounded-lg p-4">
                  {[0, 1, 2, 3, 4].map((j) => (
                    <div key={`secondary-${i}-${j}`} className="flex-1 flex flex-col justify-end">
                      <SkeletonBlock
                        className="w-full rounded-t"
                        style={{ height: `${[55, 35, 65, 45, 60][j]}%` }}
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </section>
      </div>
    </div>
  )
}

// Page-level skeleton for loading states
export function PageSkeleton() {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Page header */}
        <div className="space-y-2">
          <SkeletonBlock className="h-8 w-48" />
          <SkeletonBlock className="h-4 w-72" />
        </div>
        
        {/* Content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 h-[400px]">
            <CardContent className="p-6">
              <SkeletonBlock className="h-5 w-32 mb-4" />
              <SkeletonBlock className="h-[320px] w-full rounded-lg" />
            </CardContent>
          </Card>
          <Card className="h-[400px]">
            <CardContent className="p-6 space-y-4">
              <SkeletonBlock className="h-5 w-24" />
              {Array(5).fill(0).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <SkeletonBlock className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-1">
                    <SkeletonBlock className="h-4 w-full" />
                    <SkeletonBlock className="h-3 w-2/3" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

// Compact skeleton for smaller components
export function CompactSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array(rows).fill(0).map((_, i) => (
        <div key={i} className="flex items-center gap-2">
          <SkeletonBlock className="h-8 w-8 rounded" />
          <div className="flex-1 space-y-1">
            <SkeletonBlock className="h-3 w-3/4" />
            <SkeletonBlock className="h-2 w-1/2" />
          </div>
          <SkeletonBlock className="h-4 w-12" />
        </div>
      ))}
    </div>
  )
}
