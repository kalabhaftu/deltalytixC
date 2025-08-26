'use client'

import React, { useEffect, useRef } from 'react'

interface FocusTrapProps {
  children: React.ReactNode
  active?: boolean
  restoreFocus?: boolean
  className?: string
}

/**
 * Focus trap component for better keyboard navigation
 * Traps focus within the component when active
 */
export function FocusTrap({ 
  children, 
  active = true, 
  restoreFocus = true,
  className 
}: FocusTrapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const previousActiveElementRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!active) return

    const container = containerRef.current
    if (!container) return

    // Store the currently focused element
    previousActiveElementRef.current = document.activeElement as HTMLElement

    // Get all focusable elements within the container
    const getFocusableElements = () => {
      const focusableSelectors = [
        'a[href]',
        'button:not([disabled])',
        'textarea:not([disabled])',
        'input:not([disabled]):not([type="hidden"])',
        'select:not([disabled])',
        '[tabindex]:not([tabindex="-1"])',
        '[contenteditable]'
      ].join(', ')

      return Array.from(container.querySelectorAll(focusableSelectors)) as HTMLElement[]
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return

      const focusableElements = getFocusableElements()
      if (focusableElements.length === 0) return

      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]

      if (event.shiftKey) {
        // Shift + Tab (backwards)
        if (document.activeElement === firstElement) {
          event.preventDefault()
          lastElement.focus()
        }
      } else {
        // Tab (forwards)
        if (document.activeElement === lastElement) {
          event.preventDefault()
          firstElement.focus()
        }
      }
    }

    // Focus the first focusable element
    const focusableElements = getFocusableElements()
    if (focusableElements.length > 0) {
      focusableElements[0].focus()
    }

    // Add event listener
    container.addEventListener('keydown', handleKeyDown)

    return () => {
      container.removeEventListener('keydown', handleKeyDown)
      
      // Restore focus to the previously focused element
      if (restoreFocus && previousActiveElementRef.current) {
        previousActiveElementRef.current.focus()
      }
    }
  }, [active, restoreFocus])

  return (
    <div ref={containerRef} className={className}>
      {children}
    </div>
  )
}

/**
 * Skip link component for keyboard navigation
 */
export function SkipLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:shadow-lg"
    >
      {children}
    </a>
  )
}

/**
 * Screen reader only text component
 */
export function ScreenReaderOnly({ children }: { children: React.ReactNode }) {
  return <span className="sr-only">{children}</span>
}

/**
 * Accessible heading component with proper hierarchy
 */
interface AccessibleHeadingProps {
  level: 1 | 2 | 3 | 4 | 5 | 6
  children: React.ReactNode
  className?: string
  id?: string
}

export function AccessibleHeading({ 
  level, 
  children, 
  className, 
  id 
}: AccessibleHeadingProps) {
  const Tag = `h${level}` as keyof React.JSX.IntrinsicElements

  return React.createElement(Tag, {
    className,
    id,
    tabIndex: -1
  }, children)
}

/**
 * Live region for dynamic content announcements
 */
interface LiveRegionProps {
  children: React.ReactNode
  level?: 'polite' | 'assertive' | 'off'
  atomic?: boolean
  className?: string
}

export function LiveRegion({ 
  children, 
  level = 'polite', 
  atomic = false,
  className 
}: LiveRegionProps) {
  return (
    <div
      aria-live={level}
      aria-atomic={atomic}
      className={className}
      role="status"
    >
      {children}
    </div>
  )
}

/**
 * Hook for managing focus
 */
export function useFocusManagement() {
  const focusRef = useRef<HTMLElement>(null)

  const focusElement = (element?: HTMLElement) => {
    const target = element || focusRef.current
    if (target) {
      target.focus()
    }
  }

  const moveFocusToNext = () => {
    const activeElement = document.activeElement as HTMLElement
    if (activeElement && activeElement.nextElementSibling) {
      const nextElement = activeElement.nextElementSibling as HTMLElement
      if (nextElement.focus) {
        nextElement.focus()
      }
    }
  }

  const moveFocusToPrevious = () => {
    const activeElement = document.activeElement as HTMLElement
    if (activeElement && activeElement.previousElementSibling) {
      const prevElement = activeElement.previousElementSibling as HTMLElement
      if (prevElement.focus) {
        prevElement.focus()
      }
    }
  }

  return {
    focusRef,
    focusElement,
    moveFocusToNext,
    moveFocusToPrevious
  }
}

/**
 * Keyboard navigation helper
 */
export function useKeyboardNavigation(handlers: Record<string, () => void>) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const handler = handlers[event.key]
      if (handler) {
        event.preventDefault()
        handler()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handlers])
}
