'use client'

import React, { Component, ErrorInfo, ReactNode, ReactElement } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

/**
 * Props for ErrorBoundary component
 */
interface ErrorBoundaryProps {
  children: ReactNode
  /** Custom fallback component */
  fallback?: ReactNode
  /** Called when an error is caught */
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  /** Called when retry is clicked */
  onRetry?: () => void
  /** Custom error message */
  errorMessage?: string
  /** Whether to show retry button */
  showRetry?: boolean
  /** Class name for the error container */
  className?: string
}

/**
 * State for ErrorBoundary component
 */
interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

/**
 * Error Boundary Component
 * Catches JavaScript errors in child components and displays a fallback UI
 * 
 * @example
 * ```tsx
 * <ErrorBoundary onRetry={() => refetch()}>
 *   <DashboardComponent />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo })
    
    // Call optional error handler
    this.props.onError?.(error, errorInfo)
    
    // Log error for debugging
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null })
    this.props.onRetry?.()
  }

  render(): ReactNode {
    const { hasError, error } = this.state
    const { 
      children, 
      fallback, 
      errorMessage,
      showRetry = true,
      className = ''
    } = this.props

    if (hasError) {
      // Use custom fallback if provided
      if (fallback) {
        return fallback
      }

      // Default error UI
      return (
        <Card className={`border-destructive/50 ${className}`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Something went wrong
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {errorMessage || 'An unexpected error occurred. Please try again.'}
            </p>
            {process.env.NODE_ENV === 'development' && error && (
              <pre className="mt-4 p-3 bg-muted rounded-md text-xs overflow-auto max-h-32">
                {error.message}
              </pre>
            )}
          </CardContent>
          {showRetry && (
            <CardFooter>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={this.handleRetry}
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Try Again
              </Button>
            </CardFooter>
          )}
        </Card>
      )
    }

    return children
  }
}

/**
 * Functional wrapper for ErrorBoundary with hooks support
 */
interface ErrorBoundaryWrapperProps extends Omit<ErrorBoundaryProps, 'onRetry'> {
  /** Reset key - changes to this will reset the error boundary */
  resetKey?: string | number
  /** Context description for error messages */
  context?: string
  /** Show error details (useful for development) */
  showDetails?: boolean
}

export function ErrorBoundaryWrapper({ 
  children, 
  resetKey,
  context,
  showDetails,
  errorMessage,
  ...props 
}: ErrorBoundaryWrapperProps): ReactElement {
  const [key, setKey] = React.useState(0)
  
  // Reset on resetKey change
  React.useEffect(() => {
    setKey(prev => prev + 1)
  }, [resetKey])

  // Build error message with context if provided
  const finalErrorMessage = errorMessage || (context ? `Error in ${context}` : undefined)

  return (
    <ErrorBoundary 
      key={key} 
      onRetry={() => setKey(prev => prev + 1)}
      errorMessage={finalErrorMessage}
      {...props}
    >
      {children}
    </ErrorBoundary>
  )
}

/**
 * Simple inline error display for data fetching
 */
interface DataErrorProps {
  error: string | null
  onRetry?: () => void
  className?: string
}

export function DataError({ error, onRetry, className = '' }: DataErrorProps): ReactElement | null {
  if (!error) return null

  return (
    <div className={`flex items-center gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-lg ${className}`}>
      <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
      <p className="text-sm text-destructive flex-1">{error}</p>
      {onRetry && (
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onRetry}
          className="shrink-0"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}

/**
 * Loading state with optional error handling
 */
interface LoadingOrErrorProps {
  isLoading: boolean
  error: string | null
  onRetry?: () => void
  loadingComponent?: ReactNode
  children: ReactNode
}

export function LoadingOrError({ 
  isLoading, 
  error, 
  onRetry,
  loadingComponent,
  children 
}: LoadingOrErrorProps): ReactElement {
  if (isLoading) {
    return (
      <>
        {loadingComponent || (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        )}
      </>
    )
  }

  if (error) {
    return <DataError error={error} onRetry={onRetry} />
  }

  return <>{children}</>
}

/**
 * Widget-specific error boundary with compact styling
 */
export function WidgetErrorBoundary({ 
  children, 
  widgetId,
  widgetType
}: { 
  children: ReactNode
  widgetId?: string
  widgetType?: string
}): ReactElement {
  return (
    <ErrorBoundaryWrapper
      errorMessage={`${widgetType || widgetId || 'Widget'} encountered an error`}
    >
      {children}
    </ErrorBoundaryWrapper>
  )
}

/**
 * Dashboard-level error boundary
 */
export function DashboardErrorBoundary({ 
  children,
  context,
  showDetails = false
}: { 
  children: ReactNode
  context?: string
  showDetails?: boolean
}): ReactElement {
  return (
    <ErrorBoundaryWrapper
      errorMessage={context ? `Error in ${context}` : 'Dashboard error'}
    >
      {children}
    </ErrorBoundaryWrapper>
  )
}

export default ErrorBoundary
