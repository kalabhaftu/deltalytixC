'use client'

/**
 * Database Realtime Manager
 * 
 * Professional implementation using Supabase postgres_changes
 * Server pushes changes to client - NO POLLING
 * 
 * How it works:
 * 1. Client subscribes to postgres_changes for relevant tables
 * 2. When ANY client makes a database change, Supabase broadcasts it
 * 3. All connected clients receive the update and refresh their data
 * 
 * Requirements (Supabase Dashboard):
 * 1. Go to Database > Replication
 * 2. Enable realtime for tables: Trade, Account, MasterAccount, PhaseAccount, Payout, DailyNote, Notification
 * 3. Ensure RLS policies allow SELECT for authenticated users
 */

import { createClient } from '@/lib/supabase'
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'

// Tables that need realtime updates
export const REALTIME_TABLES = ['Trade', 'Account', 'MasterAccount', 'PhaseAccount', 'Payout', 'DailyNote', 'Notification'] as const
export type RealtimeTable = typeof REALTIME_TABLES[number]

export type ChangeEvent = 'INSERT' | 'UPDATE' | 'DELETE'

export interface DatabaseChange {
  table: RealtimeTable
  event: ChangeEvent
  newRecord: Record<string, unknown> | null
  oldRecord: Record<string, unknown> | null
  timestamp: Date
}

type ChangeCallback = (change: DatabaseChange) => void

interface SubscriptionOptions {
  /** Tables to subscribe to */
  tables: RealtimeTable[]
  /** User ID for filtering (required for RLS) */
  userId: string
  /** Callback when changes occur */
  onChange: ChangeCallback
  /** Called when connection status changes */
  onStatusChange?: (status: 'connected' | 'disconnected' | 'error') => void
}

class DatabaseRealtimeManager {
  private channel: RealtimeChannel | null = null
  private isConnected = false
  private userId: string | null = null
  private callbacks: Set<ChangeCallback> = new Set()
  private statusCallbacks: Set<(status: 'connected' | 'disconnected' | 'error') => void> = new Set()
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectTimeout: NodeJS.Timeout | null = null
  
  /**
   * Subscribe to database changes
   * Returns an unsubscribe function
   */
  subscribe(options: SubscriptionOptions): () => void {
    const { tables, userId, onChange, onStatusChange } = options
    
    this.userId = userId
    this.callbacks.add(onChange)
    if (onStatusChange) {
      this.statusCallbacks.add(onStatusChange)
    }
    
    // Connect if not already connected
    if (!this.isConnected && !this.channel) {
      this.connect(tables, userId)
    }
    
    // Return unsubscribe function
    return () => {
      this.callbacks.delete(onChange)
      if (onStatusChange) {
        this.statusCallbacks.delete(onStatusChange)
      }
      
      // Disconnect if no more subscribers
      if (this.callbacks.size === 0) {
        this.disconnect()
      }
    }
  }
  
  private async connect(tables: RealtimeTable[], userId: string) {
    try {
      const supabase = createClient()
      
      // Check if supabase client supports realtime
      if (!supabase.channel || typeof supabase.channel !== 'function') {
        console.warn('[Realtime] Supabase client does not support realtime')
        return
      }
      
      // Disconnect existing channel if any
      if (this.channel) {
        try {
          this.channel.unsubscribe()
        } catch (e) {
          // Ignore unsubscribe errors
        }
        this.channel = null
      }
      
      // Create channel with unique name
      const channelName = `db-changes-${userId}-${Date.now()}`
      let channel = supabase.channel(channelName, {
        config: {
          // Add presence configuration to prevent channel errors
          presence: {
            key: userId
          }
        }
      })
      
      // Subscribe to postgres_changes for each table
      // This is the PROPER way - server monitors DB and pushes changes
      for (const table of tables) {
        try {
          channel = channel.on(
            'postgres_changes',
            {
              event: '*', // Listen to INSERT, UPDATE, DELETE
              schema: 'public',
              table: table,
              filter: `userId=eq.${userId}` // Only changes for this user
            },
            (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
              this.handleChange(table, payload)
            }
          )
        } catch (tableError) {
          // Log but continue with other tables
          console.warn(`[Realtime] Failed to subscribe to table ${table}:`, tableError instanceof Error ? tableError.message : 'Unknown error')
        }
      }
      
      this.channel = channel
      
      // Subscribe and handle connection status
      channel.subscribe((status: string, err?: Error) => {
        if (status === 'SUBSCRIBED') {
          this.isConnected = true
          this.reconnectAttempts = 0
          this.notifyStatus('connected')
        } else if (status === 'CHANNEL_ERROR') {
          this.isConnected = false
          this.notifyStatus('error')
          // Only log if error details are available, and use console.warn to avoid unhandled error
          if (err && err.message) {
            console.warn('[Realtime] Channel error:', err.message)
          } else {
            console.warn('[Realtime] Channel error: Connection issue (details unavailable)')
          }
          this.scheduleReconnect(tables, userId)
        } else if (status === 'TIMED_OUT') {
          this.isConnected = false
          this.notifyStatus('disconnected')
          this.scheduleReconnect(tables, userId)
        } else if (status === 'CLOSED') {
          this.isConnected = false
          this.notifyStatus('disconnected')
        }
      })
      
    } catch (error) {
      // Use console.warn to avoid unhandled error propagation
      const errorMessage = error instanceof Error ? error.message : 'Unknown connection error'
      console.warn('[Realtime] Failed to connect:', errorMessage)
      this.notifyStatus('error')
      // Schedule reconnect attempt
      this.scheduleReconnect(tables, userId)
    }
  }
  
  private handleChange(
    table: RealtimeTable, 
    payload: RealtimePostgresChangesPayload<Record<string, unknown>>
  ) {
    const change: DatabaseChange = {
      table,
      event: payload.eventType as ChangeEvent,
      newRecord: payload.new as Record<string, unknown> | null,
      oldRecord: payload.old as Record<string, unknown> | null,
      timestamp: new Date()
    }
    
    // Notify all subscribers
    for (const callback of this.callbacks) {
      try {
        callback(change)
      } catch (error) {
        console.error('[Realtime] Callback error:', error)
      }
    }
  }
  
  private notifyStatus(status: 'connected' | 'disconnected' | 'error') {
    for (const callback of this.statusCallbacks) {
      try {
        callback(status)
      } catch (error) {
        console.error('[Realtime] Status callback error:', error)
      }
    }
  }
  
  private scheduleReconnect(tables: RealtimeTable[], userId: string) {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[Realtime] Max reconnect attempts reached')
      return
    }
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
    }
    
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000)
    this.reconnectAttempts++
    
    
    this.reconnectTimeout = setTimeout(() => {
      this.disconnect()
      this.connect(tables, userId)
    }, delay)
  }
  
  private disconnect() {
    if (this.channel) {
      this.channel.unsubscribe()
      this.channel = null
    }
    this.isConnected = false
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }
  }
  
  /**
   * Check connection status
   */
  getStatus(): { isConnected: boolean; subscriberCount: number } {
    return {
      isConnected: this.isConnected,
      subscriberCount: this.callbacks.size
    }
  }
  
  /**
   * Force reconnect (useful after network issues)
   */
  reconnect() {
    if (this.userId) {
      this.disconnect()
      this.reconnectAttempts = 0
      this.connect(REALTIME_TABLES as unknown as RealtimeTable[], this.userId)
    }
  }
}

// Singleton instance
export const DatabaseRealtime = new DatabaseRealtimeManager()

/**
 * React hook for database realtime subscriptions
 * 
 * @example
 * ```tsx
 * useDatabaseRealtime({
 *   userId: user.id,
 *   onTradeChange: () => refetchTrades(),
 *   onAccountChange: () => refetchAccounts(),
 * })
 * ```
 */
export function useDatabaseRealtime(options: {
  userId: string | undefined
  enabled?: boolean
  onTradeChange?: (change: DatabaseChange) => void
  onAccountChange?: (change: DatabaseChange) => void
  onNotificationChange?: (change: DatabaseChange) => void
  onAnyChange?: (change: DatabaseChange) => void
  onStatusChange?: (status: 'connected' | 'disconnected' | 'error') => void
}) {
  const { useEffect, useRef, useCallback } = require('react')
  
  const {
    userId,
    enabled = true,
    onTradeChange,
    onAccountChange,
    onNotificationChange,
    onAnyChange,
    onStatusChange
  } = options
  
  // Store ALL callbacks in refs to avoid re-subscriptions
  const onTradeChangeRef = useRef(onTradeChange)
  const onAccountChangeRef = useRef(onAccountChange)
  const onNotificationChangeRef = useRef(onNotificationChange)
  const onAnyChangeRef = useRef(onAnyChange)
  const onStatusChangeRef = useRef(onStatusChange)
  
  useEffect(() => {
    onTradeChangeRef.current = onTradeChange
    onAccountChangeRef.current = onAccountChange
    onNotificationChangeRef.current = onNotificationChange
    onAnyChangeRef.current = onAnyChange
    onStatusChangeRef.current = onStatusChange
  }, [onTradeChange, onAccountChange, onNotificationChange, onAnyChange, onStatusChange])
  
  const handleChange = useCallback((change: DatabaseChange) => {
    // Call specific handlers based on table
    if (change.table === 'Trade' && onTradeChangeRef.current) {
      onTradeChangeRef.current(change)
    }
    if (['Account', 'MasterAccount', 'PhaseAccount'].includes(change.table) && onAccountChangeRef.current) {
      onAccountChangeRef.current(change)
    }
    if (change.table === 'Notification' && onNotificationChangeRef.current) {
      onNotificationChangeRef.current(change)
    }
    
    // Always call generic handler
    if (onAnyChangeRef.current) {
      onAnyChangeRef.current(change)
    }
  }, [])
  
  const handleStatusChange = useCallback((status: 'connected' | 'disconnected' | 'error') => {
    if (onStatusChangeRef.current) {
      onStatusChangeRef.current(status)
    }
  }, [])
  
  useEffect(() => {
    if (!enabled || !userId) return
    
    const unsubscribe = DatabaseRealtime.subscribe({
      tables: [...REALTIME_TABLES],
      userId,
      onChange: handleChange,
      onStatusChange: handleStatusChange
    })
    
    return unsubscribe
  }, [enabled, userId, handleChange, handleStatusChange])
}

export default DatabaseRealtime

