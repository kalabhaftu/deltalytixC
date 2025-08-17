'use client'

import React, { Suspense, ComponentType } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Loader2 } from 'lucide-react'

interface LazyWrapperProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  className?: string
}

/**
 * Generic loading skeleton for cards
 */
export function CardSkeleton({ className }: { className?: string }) {
  return (
    <Card className={className}>
      <CardContent className="p-6">
        <div className="space-y-4">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-32 w-full" />
          <div className="flex space-x-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-16" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Chart loading skeleton
 */
export function ChartSkeleton({ className }: { className?: string }) {
  return (
    <Card className={className}>
      <CardContent className="p-6">
        <div className="space-y-4">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-48 w-full rounded-lg" />
          <div className="flex justify-between">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-3 w-12" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Table loading skeleton
 */
export function TableSkeleton({ className, rows = 5 }: { className?: string; rows?: number }) {
  return (
    <Card className={className}>
      <CardContent className="p-6">
        <div className="space-y-4">
          <Skeleton className="h-4 w-1/3" />
          <div className="space-y-2">
            {Array.from({ length: rows }).map((_, i) => (
              <div key={i} className="flex space-x-4">
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Loading spinner for heavy components
 */
export function LoadingSpinner({ className }: { className?: string }) {
  return (
    <Card className={className}>
      <CardContent className="flex h-full items-center justify-center p-6">
        <div className="flex flex-col items-center space-y-2">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Generic lazy wrapper with suspense
 */
export function LazyWrapper({ children, fallback, className }: LazyWrapperProps) {
  return (
    <Suspense fallback={fallback || <LoadingSpinner className={className} />}>
      {children}
    </Suspense>
  )
}

/**
 * Higher-order component for lazy loading
 */
export function withLazyLoading<P extends object>(
  Component: ComponentType<P>,
  fallback?: React.ReactNode
) {
  return function LazyComponent(props: P) {
    return (
      <LazyWrapper fallback={fallback}>
        <Component {...props} />
      </LazyWrapper>
    )
  }
}

/**
 * Widget-specific lazy loader
 */
export function LazyWidget({ 
  children, 
  className,
  type = 'chart'
}: { 
  children: React.ReactNode
  className?: string
  type?: 'chart' | 'table' | 'card'
}) {
  const getFallback = () => {
    switch (type) {
      case 'chart':
        return <ChartSkeleton className={className} />
      case 'table':
        return <TableSkeleton className={className} />
      default:
        return <CardSkeleton className={className} />
    }
  }

  return (
    <LazyWrapper fallback={getFallback()} className={className}>
      {children}
    </LazyWrapper>
  )
}

/**
 * Intersection Observer based lazy loading
 */
export function IntersectionLazyWrapper({ 
  children, 
  fallback,
  rootMargin = '100px',
  threshold = 0.1
}: LazyWrapperProps & {
  rootMargin?: string
  threshold?: number
}) {
  const [isVisible, setIsVisible] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin, threshold }
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => observer.disconnect()
  }, [rootMargin, threshold])

  return (
    <div ref={ref}>
      {isVisible ? (
        <LazyWrapper fallback={fallback}>
          {children}
        </LazyWrapper>
      ) : (
        fallback || <LoadingSpinner />
      )}
    </div>
  )
}
