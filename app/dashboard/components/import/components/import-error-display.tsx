'use client'

import { AlertCircle, RefreshCw, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

interface ImportErrorDisplayProps {
  error: Error | string
  onRetry?: () => void
  onClose?: () => void
}

export function ImportErrorDisplay({ error, onRetry, onClose }: ImportErrorDisplayProps) {
  const errorMessage = typeof error === 'string' ? error : error.message

  // Categorize errors for better UX
  const getErrorInfo = () => {
    if (errorMessage.includes('duplicate') || errorMessage.includes('already exist')) {
      return {
        title: 'Duplicate Trades Detected',
        description: 'The trades you\'re trying to import have already been added to this account.',
        icon: AlertCircle,
        color: 'text-amber-500'
      }
    }
    
    if (errorMessage.includes('No active phase')) {
      return {
        title: 'No Active Phase',
        description: 'This account doesn\'t have an active phase set up. Please configure account phases first.',
        icon: AlertCircle,
        color: 'text-orange-500'
      }
    }
    
    if (errorMessage.includes('not found') || errorMessage.includes('Not Found')) {
      return {
        title: 'Account Not Found',
        description: 'The selected account could not be found. It may have been deleted.',
        icon: AlertCircle,
        color: 'text-red-500'
      }
    }
    
    if (errorMessage.includes('Network') || errorMessage.includes('fetch') || errorMessage.includes('ECONNRESET')) {
      return {
        title: 'Connection Error',
        description: 'Unable to connect to the server. Please check your internet connection.',
        icon: AlertCircle,
        color: 'text-red-500'
      }
    }
    
    if (errorMessage.includes('Authentication') || errorMessage.includes('Unauthorized')) {
      return {
        title: 'Authentication Error',
        description: 'Your session has expired. Please log in again.',
        icon: AlertCircle,
        color: 'text-red-500'
      }
    }
    
    return {
      title: 'Import Failed',
      description: errorMessage.length > 150 
        ? 'An unexpected error occurred. Please try again or contact support if the issue persists.'
        : errorMessage,
      icon: AlertCircle,
      color: 'text-red-500'
    }
  }

  const errorInfo = getErrorInfo()
  const Icon = errorInfo.icon

  return (
    <div className="flex flex-col items-center justify-center h-full w-full p-8 space-y-6">
      {/* Error Icon */}
      <div className="relative">
        <div className="absolute inset-0 blur-2xl opacity-30">
          <div className="w-24 h-24 rounded-full bg-red-500" />
        </div>
        <div className="relative z-10 w-24 h-24 rounded-full bg-red-500/10 backdrop-blur-sm border-2 border-red-500/30 flex items-center justify-center">
          <Icon className={`w-12 h-12 ${errorInfo.color}`} />
        </div>
      </div>

      {/* Error Message */}
      <div className="max-w-md w-full space-y-4">
        <Alert variant="destructive" className="border-red-500/50 bg-red-500/10">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle className="text-lg font-semibold">{errorInfo.title}</AlertTitle>
          <AlertDescription className="mt-2">
            {errorInfo.description}
          </AlertDescription>
        </Alert>

        {/* Technical Details (collapsed by default) */}
        {process.env.NODE_ENV === 'development' && (
          <details className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
            <summary className="cursor-pointer font-medium mb-2">Technical Details</summary>
            <pre className="whitespace-pre-wrap break-words overflow-auto max-h-32">
              {errorMessage}
            </pre>
          </details>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        {onRetry && (
          <Button onClick={onRetry} variant="default" className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Try Again
          </Button>
        )}
        {onClose && (
          <Button onClick={onClose} variant="outline" className="gap-2">
            <Home className="w-4 h-4" />
            Close
          </Button>
        )}
      </div>
    </div>
  )
}

