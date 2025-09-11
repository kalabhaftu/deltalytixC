'use client'

import React from 'react'

/**
 * Generic memo wrapper for components with complex props
 * Provides deep comparison for better memoization
 */
export function deepMemoWrapper<T extends Record<string, unknown>>(
  Component: React.ComponentType<T>,
  compareProps?: (prevProps: T, nextProps: T) => boolean
) {
  return React.memo(Component, compareProps || ((prevProps, nextProps) => {
    // Deep comparison for complex objects
    return JSON.stringify(prevProps) === JSON.stringify(nextProps)
  }))
}

/**
 * Shallow memo wrapper for components with simple props
 * More performant than deep comparison
 */
export function shallowMemoWrapper<T extends Record<string, unknown>>(
  Component: React.ComponentType<T>
) {
  return React.memo(Component, (prevProps, nextProps) => {
    const prevKeys = Object.keys(prevProps)
    const nextKeys = Object.keys(nextProps)
    
    if (prevKeys.length !== nextKeys.length) {
      return false
    }
    
    for (const key of prevKeys) {
      if (prevProps[key] !== nextProps[key]) {
        return false
      }
    }
    
    return true
  })
}

/**
 * Optimized memo wrapper for chart components
 * Compares only essential props for chart rendering
 */
export function chartMemoWrapper<T extends { data?: unknown[]; [key: string]: unknown }>(
  Component: React.ComponentType<T>
) {
  return React.memo(Component, (prevProps, nextProps) => {
    // Quick reference check for data
    if (prevProps.data !== nextProps.data) {
      return false
    }
    
    // Check other props shallowly
    const essentialProps = ['width', 'height', 'className', 'style']
    for (const prop of essentialProps) {
      if (prevProps[prop] !== nextProps[prop]) {
        return false
      }
    }
    
    return true
  })
}

/**
 * Widget memo wrapper specifically for dashboard widgets
 * Optimized for widget-specific props
 */
export function widgetMemoWrapper<T extends { size?: string; [key: string]: unknown }>(
  Component: React.ComponentType<T>
) {
  return React.memo(Component, (prevProps, nextProps) => {
    // Compare size (critical for widget rendering)
    if (prevProps.size !== nextProps.size) {
      return false
    }
    
    // Compare other props shallowly
    const otherProps = Object.keys(prevProps).filter(key => key !== 'size')
    for (const key of otherProps) {
      if (prevProps[key] !== nextProps[key]) {
        return false
      }
    }
    
    return true
  })
}

/**
 * Table memo wrapper for data tables
 * Optimized for table-specific props
 */
export function tableMemoWrapper<T extends { data?: unknown[]; columns?: unknown[]; [key: string]: unknown }>(
  Component: React.ComponentType<T>
) {
  return React.memo(Component, (prevProps, nextProps) => {
    // Quick check for data and columns arrays
    if (
      prevProps.data !== nextProps.data ||
      prevProps.columns !== nextProps.columns
    ) {
      return false
    }
    
    // Check pagination and filter props
    const tableProps = ['pageSize', 'pageIndex', 'sortBy', 'filters']
    for (const prop of tableProps) {
      if (prevProps[prop as keyof T] !== nextProps[prop as keyof T]) {
        return false
      }
    }
    
    return true
  })
}
