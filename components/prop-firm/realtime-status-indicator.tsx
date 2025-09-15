'use client'

import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { RefreshCw, Wifi, WifiOff, AlertTriangle, CheckCircle2 } from 'lucide-react'

interface RealtimeStatusIndicatorProps {
  isPolling: boolean
  lastUpdated: Date | null
  error: string | null
  className?: string
}

export function RealtimeStatusIndicator({ 
  isPolling, 
  lastUpdated, 
  error,
  className 
}: RealtimeStatusIndicatorProps) {
  const getStatusIcon = () => {
    if (error) {
      return <WifiOff className="h-3 w-3" />
    }
    if (isPolling) {
      return <Wifi className="h-3 w-3" />
    }
    return <AlertTriangle className="h-3 w-3" />
  }

  const getStatusColor = () => {
    if (error) return 'destructive'
    if (isPolling) return 'default'
    return 'secondary'
  }

  const getStatusText = () => {
    if (error) return 'Connection Error'
    if (isPolling) return 'Live'
    return 'Offline'
  }

  const getTooltipContent = () => {
    if (error) {
      return `Connection error: ${error}`
    }
    if (lastUpdated) {
      const timeDiff = Date.now() - lastUpdated.getTime()
      const secondsAgo = Math.floor(timeDiff / 1000)
      
      if (secondsAgo < 60) {
        return `Last updated: ${secondsAgo} seconds ago`
      } else {
        const minutesAgo = Math.floor(secondsAgo / 60)
        return `Last updated: ${minutesAgo} minutes ago`
      }
    }
    return 'No data received yet'
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant={getStatusColor()} 
            className={cn(
              "flex items-center gap-1 text-xs font-medium",
              isPolling && "animate-pulse",
              className
            )}
          >
            {getStatusIcon()}
            {getStatusText()}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>{getTooltipContent()}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

interface RealtimeMetricsProps {
  isLoading: boolean
  lastUpdated: Date | null
  className?: string
}

export function RealtimeMetrics({ isLoading, lastUpdated, className }: RealtimeMetricsProps) {
  return (
    <div className={cn("flex items-center gap-2 text-xs text-muted-foreground", className)}>
      {isLoading && (
        <>
          <RefreshCw className="h-3 w-3 animate-spin" />
          <span>Updating...</span>
        </>
      )}
      {!isLoading && lastUpdated && (
        <>
          <CheckCircle2 className="h-3 w-3 text-green-600" />
          <span>
            Updated {new Date(lastUpdated).toLocaleTimeString()}
          </span>
        </>
      )}
    </div>
  )
}
