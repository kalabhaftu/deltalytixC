'use client'

import { lazy } from 'react'
import { 
  LazyWrapper, 
  ChartSkeleton, 
  TableSkeleton, 
  StatCardSkeleton,
  ComponentSkeleton,
  useLazyComponent 
} from './lazy-wrapper'

// Lazy load heavy dashboard components
export const LazyTradeChart = lazy(() => 
  import("@/lib/utils").then(module => ({
    default: module.TradeChart
  }))
)

export const LazyTradeTable = lazy(() => 
  import("@/lib/utils").then(module => ({
    default: module.TradeTable
  }))
)

export const LazyAnalyticsPanel = lazy(() => 
  import("@/lib/utils").then(module => ({
    default: module.AnalyticsPanel
  }))
)

export const LazyPerformanceMetrics = lazy(() => 
  import("@/lib/utils").then(module => ({
    default: module.PerformanceMetrics
  }))
)

export const LazyRiskManagement = lazy(() => 
  import("@/lib/utils").then(module => ({
    default: module.RiskManagement
  }))
)

// Wrapped components with appropriate loading states
export function LazyTradeChartWrapper(props: any) {
  return (
    <LazyWrapper fallback={<ChartSkeleton />}>
      <LazyTradeChart {...props} />
    </LazyWrapper>
  )
}

export function LazyTradeTableWrapper(props: any) {
  return (
    <LazyWrapper fallback={<TableSkeleton rows={10} columns={8} />}>
      <LazyTradeTable {...props} />
    </LazyWrapper>
  )
}

export function LazyAnalyticsPanelWrapper(props: any) {
  return (
    <LazyWrapper fallback={<ComponentSkeleton />}>
      <LazyAnalyticsPanel {...props} />
    </LazyWrapper>
  )
}

export function LazyPerformanceMetricsWrapper(props: any) {
  return (
    <LazyWrapper fallback={
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>
    }>
      <LazyPerformanceMetrics {...props} />
    </LazyWrapper>
  )
}

export function LazyRiskManagementWrapper(props: any) {
  return (
    <LazyWrapper fallback={<ComponentSkeleton />}>
      <LazyRiskManagement {...props} />
    </LazyWrapper>
  )
}

// Create lazy versions using the hook for better error handling
export const useLazyTradeChart = () => useLazyComponent(
  () => import("@/lib/utils").then(m => ({ default: m.TradeChart })),
  <ChartSkeleton />
)

export const useLazyTradeTable = () => useLazyComponent(
  () => import("@/lib/utils").then(m => ({ default: m.TradeTable })),
  <TableSkeleton />
)

// Advanced lazy loading with intersection observer
import { IntersectionLazyLoader } from './lazy-wrapper'

export function IntersectionLazyTradeChart(props: any) {
  return (
    <IntersectionLazyLoader fallback={<ChartSkeleton />} rootMargin="200px">
      <LazyTradeChart {...props} />
    </IntersectionLazyLoader>
  )
}

export function IntersectionLazyAnalytics(props: any) {
  return (
    <IntersectionLazyLoader fallback={<ComponentSkeleton />} rootMargin="150px">
      <LazyAnalyticsPanel {...props} />
    </IntersectionLazyLoader>
  )
}

// Data-heavy components with progressive loading
import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, TrendingUp } from 'lucide-react'

interface ProgressiveLoadingComponentProps {
  userId: string
  accountId?: string
}

export function ProgressiveTradeAnalytics({ userId, accountId }: ProgressiveLoadingComponentProps) {
  const [loadingStage, setLoadingStage] = useState<'initial' | 'basic' | 'advanced' | 'complete'>('initial')
  const [basicData, setBasicData] = useState<any>(null)
  const [advancedData, setAdvancedData] = useState<any>(null)

  useEffect(() => {
    // Load basic data first
    const loadBasicData = async () => {
      setLoadingStage('basic')
      try {
        const response = await fetch(`/api/analytics/basic?userId=${userId}${accountId ? `&accountId=${accountId}` : ''}`)
        const data = await response.json()
        setBasicData(data)
        setLoadingStage('advanced')
        
        // Then load advanced data
        setTimeout(async () => {
          const advancedResponse = await fetch(`/api/analytics/advanced?userId=${userId}${accountId ? `&accountId=${accountId}` : ''}`)
          const advancedData = await advancedResponse.json()
          setAdvancedData(advancedData)
          setLoadingStage('complete')
        }, 100) // Small delay to prevent overwhelming the server
      } catch (error) {
        console.error('Failed to load analytics data:', error)
      }
    }

    if (loadingStage === 'initial') {
      loadBasicData()
    }
  }, [userId, accountId, loadingStage])

  return (
    <div className="space-y-4">
      {/* Basic metrics - loads first */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5" />
            <span>Performance Overview</span>
            {loadingStage !== 'complete' && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {basicData ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-500">Total PnL</p>
                <p className="text-2xl font-bold">${basicData.totalPnl?.toFixed(2) || '0.00'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Win Rate</p>
                <p className="text-2xl font-bold">{basicData.winRate?.toFixed(1) || '0.0'}%</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Trades</p>
                <p className="text-2xl font-bold">{basicData.totalTrades || 0}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Best Trade</p>
                <p className="text-2xl font-bold">${basicData.bestTrade?.toFixed(2) || '0.00'}</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Advanced analytics - loads second */}
      {loadingStage === 'complete' && advancedData ? (
        <LazyAdvancedAnalytics data={advancedData} />
      ) : loadingStage !== 'initial' && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center space-x-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm text-gray-500">Loading advanced analytics...</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Advanced analytics component that loads only when needed
function LazyAdvancedAnalytics({ data }: { data: any }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Advanced Metrics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-500">Sharpe Ratio</p>
            <p className="text-2xl font-bold">{data.sharpeRatio?.toFixed(2) || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Max Drawdown</p>
            <p className="text-2xl font-bold">{data.maxDrawdown?.toFixed(2) || 'N/A'}%</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Profit Factor</p>
            <p className="text-2xl font-bold">{data.profitFactor?.toFixed(2) || 'N/A'}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Lazy loading with retry mechanism
export function LazyComponentWithRetry({ 
  loadComponent, 
  maxRetries = 3,
  fallback = <ComponentSkeleton />,
  errorFallback = <div>Failed to load component</div>
}: {
  loadComponent: () => Promise<{ default: React.ComponentType<any> }>
  maxRetries?: number
  fallback?: React.ReactNode
  errorFallback?: React.ReactNode
}) {
  const [retryCount, setRetryCount] = useState(0)
  const [hasError, setHasError] = useState(false)

  const LazyComponent = lazy(async () => {
    try {
      return await loadComponent()
    } catch (error) {
      if (retryCount < maxRetries) {
        setRetryCount(prev => prev + 1)
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000))
        return loadComponent()
      } else {
        setHasError(true)
        throw error
      }
    }
  })

  if (hasError) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          {errorFallback}
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-2"
            onClick={() => {
              setHasError(false)
              setRetryCount(0)
            }}
          >
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <LazyWrapper fallback={fallback}>
      <LazyComponent />
    </LazyWrapper>
  )
}
