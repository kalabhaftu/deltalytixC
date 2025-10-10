'use client'

import React from 'react'
import { cn } from '@/lib/utils'

interface AccessibleTextProps {
  children: React.ReactNode
  variant?: 'default' | 'muted' | 'subtle' | 'emphasis'
  size?: 'xs' | 'sm' | 'base' | 'lg' | 'xl'
  className?: string
}

/**
 * Accessible text component with improved contrast ratios
 * Ensures WCAG 2.1 AA compliance for text readability
 */
export function AccessibleText({ 
  children, 
  variant = 'default', 
  size = 'base',
  className 
}: AccessibleTextProps) {
  const variantClasses = {
    default: 'text-foreground',
    muted: 'text-slate-600 dark:text-slate-300', // Improved contrast
    subtle: 'text-slate-500 dark:text-slate-400', // Better than muted-foreground
    emphasis: 'text-slate-900 dark:text-slate-100 font-medium'
  }

  const sizeClasses = {
    xs: 'text-xs',
    sm: 'text-sm',
    base: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl'
  }

  return (
    <span className={cn(
      variantClasses[variant],
      sizeClasses[size],
      className
    )}>
      {children}
    </span>
  )
}

/**
 * Accessible label component for form fields
 */
interface AccessibleLabelProps {
  children: React.ReactNode
  required?: boolean
  htmlFor?: string
  className?: string
}

export function AccessibleLabel({ 
  children, 
  required = false, 
  htmlFor,
  className 
}: AccessibleLabelProps) {
  return (
    <label 
      htmlFor={htmlFor}
      className={cn(
        'text-sm font-medium text-slate-700 dark:text-slate-200',
        className
      )}
    >
      {children}
      {required && (
        <span className="text-red-500 ml-1" aria-label="required">*</span>
      )}
    </label>
  )
}

/**
 * Accessible description text for form fields and UI elements
 */
interface AccessibleDescriptionProps {
  children: React.ReactNode
  className?: string
}

export function AccessibleDescription({ children, className }: AccessibleDescriptionProps) {
  return (
    <AccessibleText 
      variant="muted" 
      size="sm" 
      className={cn('leading-relaxed', className)}
    >
      {children}
    </AccessibleText>
  )
}

/**
 * Status indicator with proper color contrast
 */
interface StatusIndicatorProps {
  status: 'success' | 'warning' | 'error' | 'info'
  children: React.ReactNode
  className?: string
}

export function StatusIndicator({ status, children, className }: StatusIndicatorProps) {
  const statusClasses = {
    success: 'text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
    warning: 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',
    error: 'text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
    info: 'text-foreground dark:text-foreground bg-muted/50 dark:bg-muted/30 border-border dark:border-border'
  }

  return (
    <div className={cn(
      'px-3 py-2 rounded-md border text-sm font-medium',
      statusClasses[status],
      className
    )}>
      {children}
    </div>
  )
}

/**
 * High contrast link component
 */
interface AccessibleLinkProps {
  children: React.ReactNode
  href?: string
  onClick?: () => void
  external?: boolean
  className?: string
}

export function AccessibleLink({ 
  children, 
  href, 
  onClick, 
  external = false,
  className 
}: AccessibleLinkProps) {
  const baseClasses = 'text-foreground dark:text-foreground hover:text-foreground/80 dark:hover:text-foreground/80 underline underline-offset-2 font-medium transition-colors'
  
  if (href) {
    return (
      <a 
        href={href}
        onClick={onClick}
        className={cn(baseClasses, className)}
        {...(external && { target: '_blank', rel: 'noopener noreferrer' })}
      >
        {children}
        {external && (
          <span className="sr-only"> (opens in new tab)</span>
        )}
      </a>
    )
  }

  return (
    <button 
      onClick={onClick}
      className={cn(baseClasses, 'bg-transparent border-none p-0', className)}
    >
      {children}
    </button>
  )
}

