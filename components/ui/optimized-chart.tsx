'use client'

import React, { useMemo } from 'react'
import { ResponsiveContainer } from 'recharts'

interface OptimizedChartContainerProps {
  children: React.ReactNode
  width?: number | string
  height?: number | string
  className?: string
  aspect?: number
  minWidth?: number
  minHeight?: number
}

/**
 * Optimized chart container that fixes ResponsiveContainer warnings
 * Only uses ResponsiveContainer when dimensions are truly responsive
 */
export function OptimizedChartContainer({
  children,
  width = '100%',
  height = 300,
  className,
  aspect,
  minWidth = 0,
  minHeight = 0
}: OptimizedChartContainerProps) {
  // Determine if we need responsive behavior
  const isResponsive = useMemo(() => {
    // If width or height are percentages or 'auto', use ResponsiveContainer
    const widthIsResponsive = typeof width === 'string' && (width.includes('%') || width === 'auto')
    const heightIsResponsive = typeof height === 'string' && (height.includes('%') || height === 'auto')
    
    return widthIsResponsive || heightIsResponsive || aspect !== undefined
  }, [width, height, aspect])

  // If both dimensions are fixed numbers, don't use ResponsiveContainer
  if (!isResponsive && typeof width === 'number' && typeof height === 'number') {
    return (
      <div 
        className={className}
        style={{ width, height, minWidth, minHeight }}
      >
        {React.cloneElement(children as React.ReactElement, {
          width: width,
          height: height
        } as any)}
      </div>
    )
  }

  // Use ResponsiveContainer for responsive dimensions
  return (
    <ResponsiveContainer
      width={width}
      height={height}
      aspect={aspect}
      minWidth={minWidth}
      minHeight={minHeight}
      className={className}
    >
      {children as React.ReactElement}
    </ResponsiveContainer>
  )
}

/**
 * Chart wrapper with memoization to prevent unnecessary re-renders
 */
interface MemoizedChartProps {
  children: React.ReactNode
  data?: unknown[]
  width?: number | string
  height?: number | string
  className?: string
  dependencies?: unknown[]
}

export const MemoizedChart = React.memo<MemoizedChartProps>(({
  children,
  data,
  width = '100%',
  height = 300,
  className,
  dependencies = []
}) => {
  return (
    <OptimizedChartContainer
      width={width}
      height={height}
      className={className}
    >
      {children}
    </OptimizedChartContainer>
  )
}, (prevProps, nextProps) => {
  // Custom comparison to reduce re-renders
  if (prevProps.data !== nextProps.data) return false
  if (prevProps.width !== nextProps.width) return false
  if (prevProps.height !== nextProps.height) return false
  if (prevProps.className !== nextProps.className) return false
  
  // Compare dependencies array
  if (prevProps.dependencies?.length !== nextProps.dependencies?.length) return false
  for (let i = 0; i < (prevProps.dependencies?.length || 0); i++) {
    if (prevProps.dependencies?.[i] !== nextProps.dependencies?.[i]) return false
  }
  
  return true
})

MemoizedChart.displayName = 'MemoizedChart'

/**
 * Hook to debounce chart data updates
 */
export function useChartData<T>(data: T[], delay = 100): T[] {
  const [debouncedData, setDebouncedData] = React.useState(data)

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedData(data)
    }, delay)

    return () => clearTimeout(timer)
  }, [data, delay])

  return debouncedData
}
