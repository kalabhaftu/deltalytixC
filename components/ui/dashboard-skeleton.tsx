import React from 'react'
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { cn } from "@/lib/utils"

// Unified skeleton system for all dashboard components
// Matches the design from widget-canvas-with-drag.tsx (Main Dashboard Page)

interface DashboardSkeletonProps {
  variant?: 'kpi' | 'chart' | 'calendar' | 'table' | 'list'
  className?: string
  count?: number
  height?: string // Optional height override
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
            <Card key={i} className={cn("h-[120px] p-4", className)}>
              <div className="flex items-start justify-between h-full">
                <div className="space-y-2 flex-1">
                  <div className="h-3 w-20 bg-muted-foreground/20 rounded animate-pulse" />
                  <div className="h-6 w-24 bg-muted-foreground/30 rounded animate-pulse" />
                </div>
                <div className="h-12 w-12 rounded-full bg-muted-foreground/20 animate-pulse" />
              </div>
            </Card>
          ))}
        </>
      )

    case 'chart':
      return (
        <>
          {skeletons.map((i) => (
            <Card key={i} className={cn("h-[360px] p-6", className)} style={height ? { height } : undefined}>
              <div className="space-y-4 h-full">
                <div className="h-5 w-28 bg-muted-foreground/30 rounded animate-pulse" />
                <div className="flex-1 bg-muted-foreground/10 rounded-lg animate-pulse flex items-end p-4">
                  <div className="flex items-end gap-1 w-full h-32">
                    {Array(8).fill(0).map((_, j) => {
                      const barHeight = Math.random() * 80 + 20
                      return (
                        <div 
                          key={j} 
                          className="flex-1 bg-muted-foreground/20 rounded-t animate-pulse"
                          style={{ 
                            height: `${barHeight}%`,
                            animationDelay: `${(i * 8 + j) * 50}ms`
                          }}
                        />
                      )
                    })}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </>
      )

    case 'calendar':
      return (
        <>
          {skeletons.map((i) => (
            <Card key={i} className={cn("h-[300px] p-6", className)} style={height ? { height } : undefined}>
              <div className="space-y-4 h-full">
                <div className="flex items-center justify-between">
                  <div className="h-5 w-24 bg-muted-foreground/30 rounded animate-pulse" />
                  <div className="flex gap-2">
                    <div className="h-6 w-6 bg-muted-foreground/20 rounded animate-pulse" />
                    <div className="h-6 w-6 bg-muted-foreground/20 rounded animate-pulse" />
                  </div>
                </div>
                <div className="flex-1 flex flex-col space-y-2">
                  {/* Weekday headers */}
                  <div className="grid grid-cols-7 gap-1">
                    {Array(7).fill(0).map((_, d) => (
                      <div key={d} className="h-4 bg-muted-foreground/20 rounded animate-pulse text-center" />
                    ))}
                  </div>
                  {/* Calendar days */}
                  <div className="flex-1 flex flex-col justify-start space-y-1 max-h-[180px] overflow-hidden">
                    {Array(4).fill(0).map((_, weekIndex) => (
                      <div key={weekIndex} className="grid grid-cols-7 gap-1 flex-1">
                        {Array(7).fill(0).map((_, dayIndex) => (
                          <div 
                            key={dayIndex} 
                            className="w-full h-full min-h-[24px] max-h-[32px] bg-muted-foreground/10 rounded animate-pulse" 
                            style={{ animationDelay: `${(weekIndex * 7 + dayIndex) * 15}ms` }} 
                          />
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </>
      )

    case 'table':
      return (
        <>
          {skeletons.map((i) => (
            <Card key={i} className={cn("h-[300px] p-6", className)} style={height ? { height } : undefined}>
              <div className="space-y-4">
                <div className="h-5 w-32 bg-muted-foreground/30 rounded animate-pulse" />
                <div className="space-y-3">
                  {Array(5).fill(0).map((_, r) => (
                    <div key={r} className="flex justify-between items-center py-2 border-b border-muted/30">
                      <div className="flex items-center space-x-3">
                        <div className="h-4 w-12 bg-muted-foreground/20 rounded animate-pulse" />
                        <div className="h-4 w-16 bg-muted-foreground/20 rounded animate-pulse" />
                      </div>
                      <div className="h-4 w-20 bg-muted-foreground/30 rounded animate-pulse" />
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          ))}
        </>
      )

    case 'list':
      return (
        <>
          {skeletons.map((i) => (
            <Card key={i} className={cn("h-[400px] p-6", className)} style={height ? { height } : undefined}>
              <div className="space-y-4 h-full">
                <div className="h-5 w-36 bg-muted-foreground/30 rounded animate-pulse" />
                <div className="flex-1 space-y-3">
                  <div className="h-32 bg-muted-foreground/10 rounded-lg animate-pulse" style={{ animationDelay: `${i * 100}ms` }} />
                  <div className="space-y-2">
                    {Array(3).fill(0).map((_, j) => (
                      <div key={j} className="flex justify-between items-center">
                        <div className="h-3 w-20 bg-muted-foreground/20 rounded animate-pulse" />
                        <div className="h-3 w-16 bg-muted-foreground/25 rounded animate-pulse" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </>
      )

    default:
      return <div className={cn("h-32 w-full bg-muted-foreground/10 animate-pulse rounded-md", className)} />
  }
}

// Specialized skeleton for the main dashboard page
export function MainDashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Row 1: KPI Widgets */}
      <div className="px-4 pt-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
          <DashboardSkeleton variant="kpi" count={5} />
        </div>
      </div>

      {/* Row 2: Recent Trades + Mini Calendar */}
      <div className="px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <DashboardSkeleton variant="table" />
          <DashboardSkeleton variant="calendar" />
        </div>
      </div>

      {/* Row 3: Charts */}
      <div className="px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <DashboardSkeleton variant="chart" count={3} />
        </div>
      </div>
      
      {/* Row 4: More Charts */}
      <div className="px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <DashboardSkeleton variant="chart" count={3} />
        </div>
      </div>

      {/* Row 5: Performance/List */}
      <div className="px-4 pb-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <DashboardSkeleton variant="list" count={3} />
        </div>
      </div>
    </div>
  )
}
