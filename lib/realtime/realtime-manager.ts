'use client'

/**
 * Unified Real-Time Subscription Manager
 * Single subscription system for the entire application
 * Handles Supabase real-time events and distributes them to subscribers
 */

import { createClient } from '@/lib/supabase'
import { 
  MIN_REFRESH_INTERVAL, 
  MAX_REFRESH_INTERVAL,
  RECONNECT_DELAY,
  MAX_RECONNECT_ATTEMPTS 
} from '@/lib/constants'

// ===========================================
// TYPES
// ===========================================

export type TableName = 'Account' | 'Trade' | 'MasterAccount' | 'PhaseAccount' | 'Payout' | 'BreachRecord' | 'DailyNote'
export type EventType = 'INSERT' | 'UPDATE' | 'DELETE' | '*'

export interface RealtimeEvent {
  table: TableName
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  new: Record<string, unknown> | null
  old: Record<string, unknown> | null
  timestamp: Date
}

export type RealtimeCallback = (event: RealtimeEvent) => void

interface Subscription {
  id: string
  tables: TableName[]
  callback: RealtimeCallback
  userId?: string
}

// ===========================================
// REALTIME MANAGER CLASS
// ===========================================

class RealtimeManagerClass {
  private static instance: RealtimeManagerClass | null = null
  
  private subscriptions: Map<string, Subscription> = new Map()
  private channel: any = null
  private isConnected: boolean = false
  private isVisible: boolean = true
  private reconnectAttempts: number = 0
  private pendingEvents: RealtimeEvent[] = []
  private lastEventTime: number = 0
  private debounceTimeout: NodeJS.Timeout | null = null
  
  private constructor() {
    // Set up visibility listener
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.handleVisibilityChange)
      this.isVisible = document.visibilityState === 'visible'
    }
  }

  /**
   * Get singleton instance
   */
  static getInstance(): RealtimeManagerClass {
    if (!RealtimeManagerClass.instance) {
      RealtimeManagerClass.instance = new RealtimeManagerClass()
    }
    return RealtimeManagerClass.instance
  }

  /**
   * Handle visibility change - pause/resume when tab is hidden/visible
   */
  private handleVisibilityChange = (): void => {
    this.isVisible = document.visibilityState === 'visible'
    
    if (this.isVisible) {
      // Tab became visible - reconnect if needed
      if (!this.isConnected && this.subscriptions.size > 0) {
        this.connect()
      }
      // Process any pending events
      this.processPendingEvents()
    }
  }

  /**
   * Process batched events
   */
  private processPendingEvents = (): void => {
    if (this.pendingEvents.length === 0) return
    
    // Group events by table
    const eventsByTable = new Map<TableName, RealtimeEvent[]>()
    
    for (const event of this.pendingEvents) {
      const existing = eventsByTable.get(event.table) || []
      existing.push(event)
      eventsByTable.set(event.table, existing)
    }
    
    // Notify subscribers with the latest event for each table
    for (const [table, events] of eventsByTable) {
      const latestEvent = events[events.length - 1]
      this.notifySubscribers(latestEvent)
    }
    
    this.pendingEvents = []
  }

  /**
   * Handle incoming real-time event
   */
  private handleEvent = (payload: any, table: TableName): void => {
    const event: RealtimeEvent = {
      table,
      eventType: payload.eventType,
      new: payload.new,
      old: payload.old,
      timestamp: new Date()
    }

    // If tab is hidden, queue the event
    if (!this.isVisible) {
      this.pendingEvents.push(event)
      return
    }

    // Debounce rapid events
    const now = Date.now()
    const timeSinceLastEvent = now - this.lastEventTime

    if (timeSinceLastEvent < MIN_REFRESH_INTERVAL) {
      // Queue the event and set up debounced processing
      this.pendingEvents.push(event)
      
      if (this.debounceTimeout) {
        clearTimeout(this.debounceTimeout)
      }
      
      this.debounceTimeout = setTimeout(() => {
        this.processPendingEvents()
      }, MIN_REFRESH_INTERVAL - timeSinceLastEvent)
      
      return
    }

    // Process immediately
    this.lastEventTime = now
    this.notifySubscribers(event)
  }

  /**
   * Notify all relevant subscribers of an event
   */
  private notifySubscribers(event: RealtimeEvent): void {
    for (const subscription of this.subscriptions.values()) {
      if (subscription.tables.includes(event.table) || subscription.tables.includes('*' as any)) {
        try {
          subscription.callback(event)
        } catch (error) {
          console.error('Error in realtime subscriber callback:', error)
        }
      }
    }
  }

  /**
   * Connect to Supabase real-time
   * 
   * NOTE: Supabase Realtime requires tables to have realtime enabled in the dashboard.
   * If you see "mismatch between server and client bindings" errors, ensure:
   * 1. Realtime is enabled for the tables in Supabase Dashboard > Database > Replication
   * 2. RLS policies allow the user to read the data
   * 
   * The app will work without realtime - updates just won't be instant.
   */
  private async connect(): Promise<void> {
    if (this.isConnected || this.subscriptions.size === 0) return

    try {
      const supabase = createClient()
      
      // Check if supabase client supports real-time
      if (!(supabase as any).channel || typeof (supabase as any).channel !== 'function') {
        // Supabase client does not support real-time - app will work without it
        return
      }

      // Create a simple presence channel that doesn't require postgres_changes
      // This avoids "mismatch between server and client bindings" errors
      // when tables don't have realtime enabled in Supabase Dashboard
      this.channel = (supabase as any).channel('app-updates', {
        config: {
          broadcast: { self: true },
          presence: { key: 'user' }
        }
      })

      // Listen for broadcast messages (manual triggers)
      this.channel.on('broadcast', { event: 'refresh' }, (payload: any) => {
        if (payload?.payload?.table) {
          this.handleEvent({
            eventType: 'UPDATE',
            new: payload.payload.data || null,
            old: null
          }, payload.payload.table as TableName)
        }
      })

      // Subscribe with error handling
      this.channel.subscribe((status: string, err?: Error) => {
        if (status === 'SUBSCRIBED') {
          this.isConnected = true
          this.reconnectAttempts = 0
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          // Silently handle - app works without realtime
          this.isConnected = false
        } else if (status === 'CLOSED') {
          this.isConnected = false
        }
      })

    } catch (error) {
      // Silently handle connection errors - app works without realtime
      this.isConnected = false
    }
  }

  /**
   * Broadcast a data change to all connected clients
   * Use this after database mutations to notify other clients
   */
  broadcastChange(table: TableName, data?: Record<string, unknown>): void {
    if (this.channel && this.isConnected) {
      this.channel.send({
        type: 'broadcast',
        event: 'refresh',
        payload: { table, data }
      })
    }
  }

  /**
   * Handle disconnection and attempt reconnect
   */
  private handleDisconnect(): void {
    this.isConnected = false
    
    if (this.reconnectAttempts < MAX_RECONNECT_ATTEMPTS && this.subscriptions.size > 0) {
      this.reconnectAttempts++
      setTimeout(() => {
        if (this.isVisible) {
          this.connect()
        }
      }, RECONNECT_DELAY * this.reconnectAttempts)
    }
  }

  /**
   * Subscribe to real-time events
   * 
   * @param tables - Tables to subscribe to
   * @param callback - Callback for events
   * @param userId - Optional user ID for filtering
   * @returns Unsubscribe function
   */
  subscribe(
    tables: TableName[],
    callback: RealtimeCallback,
    userId?: string
  ): () => void {
    const id = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    this.subscriptions.set(id, {
      id,
      tables,
      callback,
      userId
    })

    // Connect if this is the first subscription
    if (this.subscriptions.size === 1) {
      this.connect()
    }

    // Return unsubscribe function
    return () => {
      this.subscriptions.delete(id)
      
      // Disconnect if no more subscriptions
      if (this.subscriptions.size === 0) {
        this.disconnect()
      }
    }
  }

  /**
   * Disconnect from real-time
   */
  private disconnect(): void {
    if (this.channel) {
      this.channel.unsubscribe()
      this.channel = null
    }
    this.isConnected = false
    this.reconnectAttempts = 0
    
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout)
      this.debounceTimeout = null
    }
  }

  /**
   * Manually trigger a refresh for all subscribers
   * This notifies local subscribers AND broadcasts to other connected clients
   */
  triggerRefresh(table?: TableName): void {
    const event: RealtimeEvent = {
      table: table || 'Account',
      eventType: 'UPDATE',
      new: null,
      old: null,
      timestamp: new Date()
    }
    
    // Notify local subscribers
    this.notifySubscribers(event)
    
    // Also broadcast to other clients
    this.broadcastChange(table || 'Account')
  }

  /**
   * Check if currently connected
   */
  getConnectionStatus(): { isConnected: boolean; subscriptionCount: number } {
    return {
      isConnected: this.isConnected,
      subscriptionCount: this.subscriptions.size
    }
  }

  /**
   * Clean up - call when app unmounts
   */
  cleanup(): void {
    this.disconnect()
    this.subscriptions.clear()
    this.pendingEvents = []
    
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.handleVisibilityChange)
    }
    
    RealtimeManagerClass.instance = null
  }
}

// ===========================================
// EXPORTS
// ===========================================

/** Singleton instance */
export const RealtimeManager = RealtimeManagerClass.getInstance()

/**
 * Trigger a refresh after database mutations
 * Call this after creating/updating/deleting data to notify all subscribers
 * 
 * @example
 * ```typescript
 * // After updating a trade
 * await prisma.trade.update({ ... })
 * triggerDataRefresh('Trade')
 * 
 * // After updating an account
 * await prisma.masterAccount.update({ ... })
 * triggerDataRefresh('MasterAccount')
 * ```
 */
export function triggerDataRefresh(table?: TableName): void {
  RealtimeManager.triggerRefresh(table)
}

/**
 * React hook for subscribing to real-time events
 * 
 * @example
 * ```typescript
 * useRealtimeSubscription(['Trade', 'Account'], (event) => {
 *   console.log('Got event:', event)
 *   refetch()
 * })
 * ```
 */
export function useRealtimeSubscription(
  tables: TableName[],
  callback: RealtimeCallback,
  enabled: boolean = true
): void {
  const { useEffect, useRef } = require('react')
  const callbackRef = useRef(callback)
  
  // Keep callback ref updated
  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  useEffect(() => {
    if (!enabled) return

    const unsubscribe = RealtimeManager.subscribe(
      tables,
      (event) => callbackRef.current(event)
    )

    return unsubscribe
  }, [tables.join(','), enabled])
}

export default RealtimeManager

