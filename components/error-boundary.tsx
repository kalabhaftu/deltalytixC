'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { logger } from '@/lib/logger'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  showDetails?: boolean
  context?: string
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  }

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null
    }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { onError, context } = this.props
    
    // Log error to our logger
    logger.error('Component Error Boundary triggered', {
      error: error.message,
      stack: error.stack,
      errorInfo,
      context
    }, context || 'ErrorBoundary')

    // Call custom error handler if provided
    if (onError) {
      onError(error, errorInfo)
    }

    this.setState({
      error,
      errorInfo
    })
  }

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    })
  }

  private handleGoHome = () => {
    window.location.href = '/'
  }

  private handleReload = () => {
    window.location.reload()
  }

  public render() {
    const { hasError, error, errorInfo } = this.state
    const { fallback, showDetails = false, context, children } = this.props

    if (hasError) {
      if (fallback) {
        return fallback
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <Card className="w-full max-w-lg">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
                <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <CardTitle className="text-xl font-semibold">
                Something went wrong
              </CardTitle>
              <CardDescription>
                {context ? `An error occurred in ${context}` : 'An unexpected error has occurred'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {showDetails && error && (
                <div className="rounded-md bg-muted p-4">
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">
                    Error Details:
                  </h4>
                  <pre className="text-xs text-muted-foreground whitespace-pre-wrap break-words">
                    {error.message}
                  </pre>
                  {process.env.NODE_ENV === 'development' && (
                    <details className="mt-2">
                      <summary className="text-xs text-muted-foreground cursor-pointer">
                        Stack Trace
                      </summary>
                      <pre className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap break-words">
                        {error.stack}
                      </pre>
                    </details>
                  )}
                </div>
              )}
              
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button 
                  onClick={this.handleRetry}
                  className="flex-1"
                  variant="default"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Try Again
                </Button>
                <Button 
                  onClick={this.handleGoHome}
                  variant="outline"
                  className="flex-1"
                >
                  <Home className="mr-2 h-4 w-4" />
                  Go Home
                </Button>
              </div>
              
              <Button 
                onClick={this.handleReload}
                variant="ghost"
                className="w-full text-sm"
              >
                Reload Page
              </Button>
            </CardContent>
          </Card>
        </div>
      )
    }

    return children
  }
}

// Functional wrapper for easier use with React hooks
interface ErrorBoundaryWrapperProps extends Omit<Props, 'onError'> {
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

export function ErrorBoundaryWrapper({ 
  children, 
  onError,
  ...props 
}: ErrorBoundaryWrapperProps) {
  const handleError = React.useCallback((error: Error, errorInfo: ErrorInfo) => {
    // You could send this to an error tracking service like Sentry
    if (onError) {
      onError(error, errorInfo)
    }
  }, [onError])

  return (
    <ErrorBoundary onError={handleError} {...props}>
      {children}
    </ErrorBoundary>
  )
}

// Specialized error boundaries for different contexts
export function DashboardErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundaryWrapper 
      context="Dashboard"
      showDetails={process.env.NODE_ENV === 'development'}
    >
      {children}
    </ErrorBoundaryWrapper>
  )
}

export function WidgetErrorBoundary({ 
  children, 
  widgetType 
}: { 
  children: ReactNode
  widgetType?: string
}) {
  return (
    <ErrorBoundaryWrapper 
      context={`Widget${widgetType ? ` (${widgetType})` : ''}`}
      fallback={
        <Card className="h-full">
          <CardContent className="flex h-full items-center justify-center p-6">
            <div className="text-center space-y-2">
              <AlertTriangle className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Widget failed to load
              </p>
            </div>
          </CardContent>
        </Card>
      }
    >
      {children}
    </ErrorBoundaryWrapper>
  )
}

export function ImportErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundaryWrapper 
      context="Import"
      showDetails={true}
    >
      {children}
    </ErrorBoundaryWrapper>
  )
}

export default ErrorBoundary
