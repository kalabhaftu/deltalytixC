'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface DebouncedInputProps extends Omit<React.ComponentProps<typeof Input>, 'onChange'> {
  value: string
  onChange: (value: string) => void
  debounceMs?: number
  showClearButton?: boolean
  icon?: React.ReactNode
}

/**
 * Debounced input component to reduce excessive API calls
 * and improve performance for search/filter inputs
 */
export function DebouncedInput({
  value: initialValue,
  onChange,
  debounceMs = 300,
  showClearButton = true,
  icon,
  className,
  ...props
}: DebouncedInputProps) {
  const [value, setValue] = useState(initialValue)

  // Update local state when external value changes
  useEffect(() => {
    setValue(initialValue)
  }, [initialValue])

  // Debounced onChange
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (value !== initialValue) {
        onChange(value)
      }
    }, debounceMs)

    return () => clearTimeout(timeout)
  }, [value, debounceMs, onChange, initialValue])

  const handleClear = useCallback(() => {
    setValue('')
    onChange('')
  }, [onChange])

  return (
    <div className="relative">
      {icon && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          {icon}
        </div>
      )}
      <Input
        {...props}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className={cn(
          icon && 'pl-10',
          showClearButton && value && 'pr-10',
          className
        )}
      />
      {showClearButton && value && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0 hover:bg-transparent"
          onClick={handleClear}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Clear</span>
        </Button>
      )}
    </div>
  )
}

/**
 * Search input with built-in search icon and debouncing
 */
export function DebouncedSearchInput({
  placeholder = "Search...",
  ...props
}: Omit<DebouncedInputProps, 'icon'>) {
  return (
    <DebouncedInput
      {...props}
      icon={<Search className="h-4 w-4" />}
      placeholder={placeholder}
    />
  )
}

/**
 * Hook for debounced values
 */
export function useDebounced<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

/**
 * Hook for debounced callbacks
 */
export function useDebouncedCallback<T extends (...args: Parameters<T>) => ReturnType<T>>(
  callback: T,
  delay: number
): T {
  const timeoutRef = React.useRef<NodeJS.Timeout | undefined>(undefined)
  
  return useCallback(
    ((...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      
      timeoutRef.current = setTimeout(() => {
        callback(...args)
      }, delay)
    }) as T,
    [callback, delay]
  )
}

/**
 * Hook for throttled callbacks (limits execution frequency)
 */
export function useThrottledCallback<T extends (...args: Parameters<T>) => ReturnType<T>>(
  callback: T,
  delay: number
): T {
  const lastRun = React.useRef<number>(Date.now())
  
  return useCallback(
    ((...args: Parameters<T>) => {
      if (Date.now() - lastRun.current >= delay) {
        callback(...args)
        lastRun.current = Date.now()
      }
    }) as T,
    [callback, delay]
  )
}
