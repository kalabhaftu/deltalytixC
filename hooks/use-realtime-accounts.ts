import { useEffect, useCallback, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { invalidateAccountsCache, broadcastAccountsUpdate } from './use-accounts'

interface RealtimeAccountsOptions {
  enabled?: boolean
  onUpdate?: () => void
}

interface RealtimeAccountsResult {
  isConnected: boolean
  lastUpdate: Date | null
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error'
}

export function useRealtimeAccounts(options: RealtimeAccountsOptions = {}): RealtimeAccountsResult {
  const { enabled = true, onUpdate } = options
  
  const [isConnected, setIsConnected] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected')
  
  const subscriptionsRef = useRef<any[]>([])
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttempts = useRef(0)
  const maxReconnectAttempts = 5

  const cleanup = useCallback(() => {
    subscriptionsRef.current.forEach(subscription => {
      try {
        subscription?.unsubscribe()
      } catch (error) {
        console.warn('[useRealtimeAccounts] Error unsubscribing:', error)
      }
    })
    subscriptionsRef.current = []
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
  }, [])

  const setupRealtimeSubscriptions = useCallback(async () => {
    if (!enabled) {
      setConnectionStatus('disconnected')
      setIsConnected(false)
      return
    }

    try {
      setConnectionStatus('connecting')
      const supabase = createClient()

      // Check if supabase client supports real-time (not in mock mode)
      if (!('channel' in supabase) || typeof (supabase as any).channel !== 'function') {
        setConnectionStatus('disconnected')
        setIsConnected(false)
        return
      }

      // Enhanced change handler with batching
      let updateTimeout: NodeJS.Timeout | null = null
      const batchedChanges = new Set<string>()

      const handleChange = (type: string, id?: string) => {
        if (id) batchedChanges.add(`${type}:${id}`)
        
        // Batch updates to avoid excessive refreshes
        if (updateTimeout) clearTimeout(updateTimeout)
        
        updateTimeout = setTimeout(() => {
          const changeCount = batchedChanges.size
          batchedChanges.clear()
          
          setLastUpdate(new Date())
          // FIXED: Schedule callback outside render cycle to prevent setState during render
          if (onUpdate) {
            setTimeout(() => onUpdate(), 0)
          }
        }, 1000) // 1 second batching window
      }

      // Subscribe to Account table changes
      const accountsSubscription = supabase
        .channel('realtime-accounts')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'Account'
          },
          (payload: any) => {
            const id = payload.new?.id || payload.old?.id
            handleChange('account', id)
          }
        )
        .subscribe((status: string) => {
          if (status === 'SUBSCRIBED') {
            setIsConnected(true)
            setConnectionStatus('connected')
            reconnectAttempts.current = 0
          } else if (status === 'CHANNEL_ERROR') {
            console.warn('[useRealtimeAccounts] Account subscription error')
            setConnectionStatus('error')
            setIsConnected(false)
          }
        })

      // Subscribe to Trade table changes
      const tradesSubscription = supabase
        .channel('realtime-trades')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'Trade'
          },
          (payload: any) => {
            const id = payload.new?.id || payload.old?.id
            const accountNumber = payload.new?.accountNumber || payload.old?.accountNumber
            handleChange('trade', id)
          }
        )
        .subscribe((status: string) => {
          if (status === 'SUBSCRIBED') {
          } else if (status === 'CHANNEL_ERROR') {
            console.warn('[useRealtimeAccounts] Trade subscription error')
          }
        })

      // Subscribe to MasterAccount and PhaseAccount changes
      const propFirmSubscription = supabase
        .channel('realtime-propfirm')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'MasterAccount'
          },
          (payload: any) => {
            const id = payload.new?.id || payload.old?.id
            handleChange('master-account', id)
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'PhaseAccount'
          },
          (payload: any) => {
            const id = payload.new?.id || payload.old?.id
            handleChange('phase-account', id)
          }
        )
        .subscribe((status: string) => {
          if (status === 'SUBSCRIBED') {
          } else if (status === 'CHANNEL_ERROR') {
            console.warn('[useRealtimeAccounts] Prop firm subscription error')
          }
        })

      // Store subscriptions for cleanup
      subscriptionsRef.current = [accountsSubscription, tradesSubscription, propFirmSubscription]

    } catch (error) {
      console.error('[useRealtimeAccounts] Setup error:', error)
      setConnectionStatus('error')
      setIsConnected(false)
      
      // Attempt to reconnect with exponential backoff
      if (reconnectAttempts.current < maxReconnectAttempts) {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000)
        reconnectAttempts.current++
        
        reconnectTimeoutRef.current = setTimeout(() => {
          setupRealtimeSubscriptions()
        }, delay)
      }
    }
  }, [enabled, onUpdate])

  useEffect(() => {
    if (enabled) {
      setupRealtimeSubscriptions()
    } else {
      cleanup()
      setConnectionStatus('disconnected')
      setIsConnected(false)
    }

    return cleanup
  }, [enabled, setupRealtimeSubscriptions, cleanup])

  return {
    isConnected,
    lastUpdate,
    connectionStatus
  }
}
