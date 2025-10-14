/**
 * Stable Callback Hook
 * 
 * Provides a stable callback reference that doesn't change between renders
 * but always calls the latest version of the function.
 * 
 * Useful for fixing exhaustive-deps warnings without causing unnecessary re-renders
 */

import { useCallback, useRef, useEffect } from 'react'

/**
 * Creates a stable callback reference that always calls the latest function
 * 
 * @example
 * const handleClick = useStableCallback(() => {
 *   // Can use latest props/state without adding to dependencies
 *   console.log(someValue)
 * })
 */
export function useStableCallback<T extends (...args: any[]) => any>(
  callback: T
): T {
  const callbackRef = useRef(callback)

  // Update the ref to the latest callback on each render
  useEffect(() => {
    callbackRef.current = callback
  })

  // Return a stable callback that calls the latest version
  return useCallback(
    ((...args) => callbackRef.current(...args)) as T,
    []
  )
}

/**
 * Creates a stable async callback reference
 * 
 * @example
 * const fetchData = useStableAsyncCallback(async () => {
 *   const data = await api.fetch()
 *   setState(data)
 * })
 */
export function useStableAsyncCallback<T extends (...args: any[]) => Promise<any>>(
  callback: T
): T {
  const callbackRef = useRef(callback)

  useEffect(() => {
    callbackRef.current = callback
  })

  return useCallback(
    ((...args) => callbackRef.current(...args)) as T,
    []
  )
}

/**
 * Debounced stable callback
 * 
 * @example
 * const handleSearch = useDebouncedCallback((query: string) => {
 *   search(query)
 * }, 500)
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 300
): T {
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const callbackRef = useRef(callback)

  useEffect(() => {
    callbackRef.current = callback
  })

  return useCallback(
    ((...args) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args)
      }, delay)
    }) as T,
    [delay]
  )
}

