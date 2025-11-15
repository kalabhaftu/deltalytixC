'use client'

/**
 * Cache Management Component
 * 
 * Provides manual cache clearing functionality for users
 * in the settings page
 */

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  clearAllCaches, 
  clearAccountCaches, 
  getCacheStats 
} from '@/lib/cache-manager'
import { invalidateAccountsCache } from '@/hooks/use-accounts'
import { Trash2, RefreshCw, Info, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'

export function CacheManagement() {
  const [isClearing, setIsClearing] = useState(false)
  const [lastCleared, setLastCleared] = useState<Date | null>(null)
  const [stats, setStats] = useState({
    version: '0',
    localStorageSize: 0,
    localStorageKeys: 0,
    sessionStorageKeys: 0
  })
  
  // Load cache stats only on client side to avoid hydration mismatch
  useEffect(() => {
    setStats(getCacheStats())
  }, [])

  const handleClearAccountCache = async () => {
    setIsClearing(true)
    
    try {
      const cleared = clearAccountCaches()
      invalidateAccountsCache('manual clear from settings')
      
      toast.success('Account cache cleared', {
        description: `Cleared ${cleared} cached items. Refresh the page to see updates.`
      })
      
      setLastCleared(new Date())
      setStats(getCacheStats())
    } catch (error) {
      toast.error('Failed to clear cache', {
        description: 'Please try again or contact support if the issue persists.'
      })
    } finally {
      setIsClearing(false)
    }
  }

  const handleClearAllCache = async () => {
    setIsClearing(true)
    
    try {
      const result = await clearAllCaches({
        keepTheme: true,
        keepConsent: true,
        clearServiceWorker: false,
        clearIndexedDB: false
      })
      
      invalidateAccountsCache('manual clear all from settings')
      
      const total = result.localStorage + result.sessionStorage + result.serviceWorker + result.indexedDB
      
      toast.success('All caches cleared', {
        description: `Cleared ${total} cached items. Page will reload to apply changes.`
      })
      
      setLastCleared(new Date())
      
      // Reload page after a short delay
      setTimeout(() => {
        window.location.reload()
      }, 1500)
    } catch (error) {
      toast.error('Failed to clear all caches', {
        description: 'Please try again or contact support if the issue persists.'
      })
      setIsClearing(false)
    }
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cache Management</CardTitle>
        <CardDescription>
          Clear cached data to resolve display issues or free up space
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Cache Statistics */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Current Cache Status</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Cache Version</p>
              <p className="font-mono">{stats.version}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Storage Size</p>
              <p className="font-mono">{formatBytes(stats.localStorageSize * 2)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Cached Keys</p>
              <p className="font-mono">{stats.localStorageKeys} items</p>
            </div>
            <div>
              <p className="text-muted-foreground">Session Data</p>
              <p className="font-mono">{stats.sessionStorageKeys} items</p>
            </div>
          </div>
        </div>

        {/* Information Alert */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            The app automatically clears stale caches when detecting version changes. 
            Only use manual clearing if you&apos;re experiencing issues with outdated data.
          </AlertDescription>
        </Alert>

        {/* Last Cleared */}
        {lastCleared && (
          <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
            <CheckCircle2 className="h-4 w-4" />
            <span>
              Cache cleared at {lastCleared.toLocaleTimeString()}
            </span>
          </div>
        )}

        {/* Clear Options */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Clear Account Cache</p>
              <p className="text-xs text-muted-foreground">
                Clears cached account and trade data
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearAccountCache}
              disabled={isClearing}
            >
              {isClearing ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              <span className="ml-2">Clear</span>
            </Button>
          </div>

          <div className="flex items-center justify-between pt-3 border-t">
            <div>
              <p className="text-sm font-medium">Clear All Cache</p>
              <p className="text-xs text-muted-foreground">
                Clears all cached data (theme and preferences preserved)
              </p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleClearAllCache}
              disabled={isClearing}
            >
              {isClearing ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              <span className="ml-2">Clear All</span>
            </Button>
          </div>
        </div>

        {/* Help Text */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p><strong>When to clear cache:</strong></p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Seeing outdated account balances or trade data</li>
            <li>Dashboard layout not updating correctly</li>
            <li>App behaving unexpectedly after an update</li>
            <li>Experiencing performance issues</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}

