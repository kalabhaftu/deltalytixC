'use client'

import React from 'react'
import { Button, ButtonProps } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

interface AccessibleButtonProps extends ButtonProps {
  /** Loading state */
  loading?: boolean
  /** Text to announce to screen readers when loading */
  loadingText?: string
  /** Keyboard shortcut hint */
  shortcut?: string
  /** Whether this button represents a destructive action */
  destructive?: boolean
  /** Additional description for screen readers */
  describedBy?: string
  /** Whether the button controls another element */
  controls?: string
  /** Whether the controlled element is expanded */
  expanded?: boolean
  /** Whether the button is pressed (for toggle buttons) */
  pressed?: boolean
}

/**
 * Enhanced button component with better accessibility features
 */
export function AccessibleButton({
  children,
  loading = false,
  loadingText = 'Loading',
  shortcut,
  destructive = false,
  describedBy,
  controls,
  expanded,
  pressed,
  disabled,
  className,
  variant,
  ...props
}: AccessibleButtonProps) {
  // Determine variant based on destructive prop
  const buttonVariant = destructive ? 'destructive' : variant

  // Build aria attributes
  const ariaAttributes = {
    'aria-describedby': describedBy,
    'aria-controls': controls,
    'aria-expanded': expanded,
    'aria-pressed': pressed,
    'aria-busy': loading,
    'aria-disabled': disabled || loading
  }

  // Filter out undefined values
  const filteredAriaAttributes = Object.fromEntries(
    Object.entries(ariaAttributes).filter(([, value]) => value !== undefined)
  )

  return (
    <Button
      {...props}
      {...filteredAriaAttributes}
      variant={buttonVariant}
      disabled={disabled || loading}
      className={cn(
        // Focus styles
        'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        // High contrast mode support
        'forced-colors:border-[ButtonBorder] forced-colors:text-[ButtonText]',
        className
      )}
    >
      {loading && (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
      )}
      
      <span className={loading ? 'sr-only' : undefined}>
        {children}
      </span>
      
      {loading && (
        <span aria-live="polite" className="sr-only">
          {loadingText}
        </span>
      )}
      
      {shortcut && (
        <span className="ml-auto text-xs opacity-60" aria-hidden="true">
          {shortcut}
        </span>
      )}
    </Button>
  )
}

/**
 * Icon button with proper accessibility
 */
interface AccessibleIconButtonProps extends Omit<AccessibleButtonProps, 'children'> {
  icon: React.ReactNode
  label: string
  tooltip?: string
}

export function AccessibleIconButton({
  icon,
  label,
  tooltip,
  className,
  ...props
}: AccessibleIconButtonProps) {
  return (
    <AccessibleButton
      {...props}
      variant="ghost"
      size="icon"
      className={cn('relative', className)}
      aria-label={label}
      title={tooltip || label}
    >
      {icon}
      <span className="sr-only">{label}</span>
    </AccessibleButton>
  )
}

/**
 * Toggle button with proper state management
 */
interface AccessibleToggleButtonProps extends Omit<AccessibleButtonProps, 'pressed'> {
  pressed: boolean
  onPressedChange: (pressed: boolean) => void
  pressedLabel?: string
  unpressedLabel?: string
}

export function AccessibleToggleButton({
  pressed,
  onPressedChange,
  pressedLabel,
  unpressedLabel,
  children,
  className,
  ...props
}: AccessibleToggleButtonProps) {
  const handleClick = () => {
    onPressedChange(!pressed)
  }

  const label = pressed ? pressedLabel : unpressedLabel

  return (
    <AccessibleButton
      {...props}
      pressed={pressed}
      onClick={handleClick}
      className={cn(
        'data-[state=on]:bg-accent data-[state=on]:text-accent-foreground',
        className
      )}
      data-state={pressed ? 'on' : 'off'}
      aria-label={label}
    >
      {children}
    </AccessibleButton>
  )
}

/**
 * Button group with proper keyboard navigation
 */
interface AccessibleButtonGroupProps {
  children: React.ReactNode
  orientation?: 'horizontal' | 'vertical'
  className?: string
  label?: string
}

export function AccessibleButtonGroup({
  children,
  orientation = 'horizontal',
  className,
  label
}: AccessibleButtonGroupProps) {
  const handleKeyDown = (event: React.KeyboardEvent) => {
    const buttons = event.currentTarget.querySelectorAll('button:not([disabled])')
    const currentIndex = Array.from(buttons).indexOf(event.target as HTMLButtonElement)
    
    let nextIndex = currentIndex
    
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        if (orientation === 'horizontal' && event.key === 'ArrowRight' ||
            orientation === 'vertical' && event.key === 'ArrowDown') {
          event.preventDefault()
          nextIndex = (currentIndex + 1) % buttons.length
        }
        break
      case 'ArrowLeft':
      case 'ArrowUp':
        if (orientation === 'horizontal' && event.key === 'ArrowLeft' ||
            orientation === 'vertical' && event.key === 'ArrowUp') {
          event.preventDefault()
          nextIndex = currentIndex === 0 ? buttons.length - 1 : currentIndex - 1
        }
        break
      case 'Home':
        event.preventDefault()
        nextIndex = 0
        break
      case 'End':
        event.preventDefault()
        nextIndex = buttons.length - 1
        break
    }
    
    if (nextIndex !== currentIndex) {
      (buttons[nextIndex] as HTMLButtonElement).focus()
    }
  }

  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        'flex',
        orientation === 'horizontal' ? 'flex-row' : 'flex-col',
        className
      )}
      onKeyDown={handleKeyDown}
    >
      {children}
    </div>
  )
}
