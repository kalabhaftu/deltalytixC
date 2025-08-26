'use client'

// Service Worker client-side utilities for Deltalytix

export interface ServiceWorkerStatus {
  isSupported: boolean
  isRegistered: boolean
  isActive: boolean
  registration?: ServiceWorkerRegistration
}

export interface CacheStatus {
  [cacheName: string]: number
}

export interface OfflineQueueItem {
  id: string
  type: 'trade' | 'profile' | 'analytics'
  data: any
  timestamp: number
  retryCount: number
}

class ServiceWorkerManager {
  private static instance: ServiceWorkerManager
  private registration: ServiceWorkerRegistration | null = null
  private isSupported: boolean = false
  private callbacks: Map<string, Function[]> = new Map()

  private constructor() {
    this.isSupported = 'serviceWorker' in navigator
    this.initializeServiceWorker()
  }

  public static getInstance(): ServiceWorkerManager {
    if (!ServiceWorkerManager.instance) {
      ServiceWorkerManager.instance = new ServiceWorkerManager()
    }
    return ServiceWorkerManager.instance
  }

  // Initialize service worker
  private async initializeServiceWorker() {
    if (!this.isSupported) {
      console.warn('Service Worker is not supported in this browser')
      return
    }

    try {
      this.registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      })

      console.log('Service Worker registered successfully')
      
      // Handle updates
      this.registration.addEventListener('updatefound', () => {
        const newWorker = this.registration?.installing
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              this.notifyUpdate()
            }
          })
        }
      })

      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener('message', this.handleMessage.bind(this))

    } catch (error) {
      console.error('Service Worker registration failed:', error)
    }
  }

  // Handle messages from service worker
  private handleMessage(event: MessageEvent) {
    const { type, data } = event.data
    
    const callbacks = this.callbacks.get(type) || []
    callbacks.forEach(callback => callback(data))
  }

  // Register callback for service worker messages
  public onMessage(type: string, callback: Function) {
    if (!this.callbacks.has(type)) {
      this.callbacks.set(type, [])
    }
    this.callbacks.get(type)!.push(callback)
  }

  // Remove callback
  public offMessage(type: string, callback: Function) {
    const callbacks = this.callbacks.get(type) || []
    const index = callbacks.indexOf(callback)
    if (index > -1) {
      callbacks.splice(index, 1)
    }
  }

  // Get service worker status
  public async getStatus(): Promise<ServiceWorkerStatus> {
    return {
      isSupported: this.isSupported,
      isRegistered: !!this.registration,
      isActive: !!navigator.serviceWorker.controller,
      registration: this.registration || undefined,
    }
  }

  // Update service worker
  public async updateServiceWorker() {
    if (this.registration) {
      await this.registration.update()
    }
  }

  // Skip waiting for new service worker
  public skipWaiting() {
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' })
    }
  }

  // Cache trade data for offline access
  public async cacheTradeData(trades: any[]) {
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'CACHE_TRADE_DATA',
        data: trades,
      })
    }
  }

  // Clear all caches
  public async clearCache() {
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'CLEAR_CACHE',
      })
    }
  }

  // Get cache status
  public async getCacheStatus(): Promise<CacheStatus> {
    return new Promise((resolve) => {
      if (!navigator.serviceWorker.controller) {
        resolve({})
        return
      }

      const channel = new MessageChannel()
      
      channel.port1.onmessage = (event) => {
        resolve(event.data)
      }

      navigator.serviceWorker.controller.postMessage(
        { type: 'GET_CACHE_STATUS' },
        [channel.port2]
      )
    })
  }

  // Background sync for offline data
  public async scheduleBackgroundSync(tag: string) {
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      const registration = await navigator.serviceWorker.ready
      // Type assertion for background sync API
      await (registration as any).sync?.register(tag)
    }
  }

  // Add to offline queue
  public async addToOfflineQueue(item: Omit<OfflineQueueItem, 'id' | 'timestamp' | 'retryCount'>) {
    const queueItem: OfflineQueueItem = {
      ...item,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      retryCount: 0,
    }

    try {
      const db = await this.openOfflineDB()
      const transaction = db.transaction(['offlineQueue'], 'readwrite')
      const store = transaction.objectStore('offlineQueue')
      await store.add(queueItem)
      
      // Schedule background sync
      await this.scheduleBackgroundSync(`sync-${item.type}`)
      
      console.log('Added to offline queue:', queueItem.id)
    } catch (error) {
      console.error('Failed to add to offline queue:', error)
    }
  }

  // Get offline queue
  public async getOfflineQueue(): Promise<OfflineQueueItem[]> {
    try {
      const db = await this.openOfflineDB()
      const transaction = db.transaction(['offlineQueue'], 'readonly')
      const store = transaction.objectStore('offlineQueue')
      const result = await store.getAll()
      return result as unknown as OfflineQueueItem[]
    } catch (error) {
      console.error('Failed to get offline queue:', error)
      return []
    }
  }

  // Clear offline queue
  public async clearOfflineQueue() {
    try {
      const db = await this.openOfflineDB()
      const transaction = db.transaction(['offlineQueue'], 'readwrite')
      const store = transaction.objectStore('offlineQueue')
      await store.clear()
    } catch (error) {
      console.error('Failed to clear offline queue:', error)
    }
  }

  // Open IndexedDB for offline storage
  private openOfflineDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('DeltalytixOffline', 1)
      
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result)
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        
        if (!db.objectStoreNames.contains('offlineQueue')) {
          db.createObjectStore('offlineQueue', { keyPath: 'id' })
        }
        
        if (!db.objectStoreNames.contains('cachedData')) {
          db.createObjectStore('cachedData', { keyPath: 'key' })
        }
      }
    })
  }

  // Notify about service worker update
  private notifyUpdate() {
    const callbacks = this.callbacks.get('update') || []
    callbacks.forEach(callback => callback())
  }

  // Check if user is online
  public isOnline(): boolean {
    return navigator.onLine
  }

  // Add online/offline event listeners
  public onOnline(callback: () => void) {
    window.addEventListener('online', callback)
  }

  public onOffline(callback: () => void) {
    window.addEventListener('offline', callback)
  }

  // Remove online/offline event listeners
  public offOnline(callback: () => void) {
    window.removeEventListener('online', callback)
  }

  public offOffline(callback: () => void) {
    window.removeEventListener('offline', callback)
  }
}

// Export singleton instance
export const serviceWorkerManager = ServiceWorkerManager.getInstance()

// React hooks for service worker functionality
import { useState, useEffect, useCallback } from 'react'

export function useServiceWorker() {
  const [status, setStatus] = useState<ServiceWorkerStatus>({
    isSupported: false,
    isRegistered: false,
    isActive: false,
  })
  const [isOnline, setIsOnline] = useState(navigator?.onLine ?? true)

  useEffect(() => {
    const updateStatus = async () => {
      const currentStatus = await serviceWorkerManager.getStatus()
      setStatus(currentStatus)
    }

    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    updateStatus()
    
    serviceWorkerManager.onOnline(handleOnline)
    serviceWorkerManager.onOffline(handleOffline)

    return () => {
      serviceWorkerManager.offOnline(handleOnline)
      serviceWorkerManager.offOffline(handleOffline)
    }
  }, [])

  const updateServiceWorker = useCallback(async () => {
    await serviceWorkerManager.updateServiceWorker()
  }, [])

  const skipWaiting = useCallback(() => {
    serviceWorkerManager.skipWaiting()
  }, [])

  return {
    ...status,
    isOnline,
    updateServiceWorker,
    skipWaiting,
  }
}

export function useOfflineQueue() {
  const [queue, setQueue] = useState<OfflineQueueItem[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const loadQueue = useCallback(async () => {
    setIsLoading(true)
    try {
      const queueItems = await serviceWorkerManager.getOfflineQueue()
      setQueue(queueItems)
    } catch (error) {
      console.error('Failed to load offline queue:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const addToQueue = useCallback(async (item: Omit<OfflineQueueItem, 'id' | 'timestamp' | 'retryCount'>) => {
    await serviceWorkerManager.addToOfflineQueue(item)
    await loadQueue() // Refresh queue
  }, [loadQueue])

  const clearQueue = useCallback(async () => {
    await serviceWorkerManager.clearOfflineQueue()
    setQueue([])
  }, [])

  useEffect(() => {
    loadQueue()
  }, [loadQueue])

  return {
    queue,
    isLoading,
    addToQueue,
    clearQueue,
    refreshQueue: loadQueue,
  }
}

export function useCacheStatus() {
  const [cacheStatus, setCacheStatus] = useState<CacheStatus>({})
  const [isLoading, setIsLoading] = useState(false)

  const loadCacheStatus = useCallback(async () => {
    setIsLoading(true)
    try {
      const status = await serviceWorkerManager.getCacheStatus()
      setCacheStatus(status)
    } catch (error) {
      console.error('Failed to load cache status:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const clearCache = useCallback(async () => {
    await serviceWorkerManager.clearCache()
    setCacheStatus({})
  }, [])

  useEffect(() => {
    loadCacheStatus()
  }, [loadCacheStatus])

  return {
    cacheStatus,
    isLoading,
    clearCache,
    refreshStatus: loadCacheStatus,
  }
}

// Offline-first data fetching hook
export function useOfflineFirst<T>(
  fetchFn: () => Promise<T>,
  cacheKey: string,
  options?: {
    enabled?: boolean
    refreshInterval?: number
    maxAge?: number
  }
) {
  const [data, setData] = useState<T | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [isFromCache, setIsFromCache] = useState(false)
  const { isOnline } = useServiceWorker()

  const loadData = useCallback(async (forceRefresh = false) => {
    setIsLoading(true)
    setError(null)

    try {
      // Try to get cached data first
      if (!forceRefresh) {
        const cachedData = await getCachedData<T>(cacheKey, options?.maxAge)
        if (cachedData) {
          setData(cachedData)
          setIsFromCache(true)
          setIsLoading(false)
        }
      }

      // If online, fetch fresh data
      if (isOnline) {
        const freshData = await fetchFn()
        setData(freshData)
        setIsFromCache(false)
        
        // Cache the fresh data
        await setCachedData(cacheKey, freshData)
      } else if (!data) {
        // If offline and no cached data, show error
        throw new Error('No internet connection and no cached data available')
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error')
      setError(error)
    } finally {
      setIsLoading(false)
    }
  }, [fetchFn, cacheKey, isOnline, data, options?.maxAge])

  useEffect(() => {
    if (options?.enabled !== false) {
      loadData()
    }
  }, [loadData, options?.enabled])

  // Auto-refresh on interval
  useEffect(() => {
    if (options?.refreshInterval && isOnline) {
      const interval = setInterval(() => {
        loadData(true)
      }, options.refreshInterval)

      return () => clearInterval(interval)
    }
  }, [loadData, options?.refreshInterval, isOnline])

  const refetch = useCallback(() => loadData(true), [loadData])

  return {
    data,
    isLoading,
    error,
    isFromCache,
    refetch,
  }
}

// Helper functions for caching
async function getCachedData<T>(key: string, maxAge?: number): Promise<T | null> {
  try {
    const db = await serviceWorkerManager['openOfflineDB']()
    const transaction = db.transaction(['cachedData'], 'readonly')
    const store = transaction.objectStore('cachedData')
    const result = await store.get(key)

    if (!result) return null

    // Check if data is too old
    if (maxAge && result && 'timestamp' in result && Date.now() - (result as any).timestamp > maxAge) {
      return null
    }

    return result && 'data' in result ? (result as any).data : null
  } catch (error) {
    console.error('Failed to get cached data:', error)
    return null
  }
}

async function setCachedData<T>(key: string, data: T): Promise<void> {
  try {
    const db = await serviceWorkerManager['openOfflineDB']()
    const transaction = db.transaction(['cachedData'], 'readwrite')
    const store = transaction.objectStore('cachedData')
    await store.put({
      key,
      data,
      timestamp: Date.now(),
    })
  } catch (error) {
    console.error('Failed to cache data:', error)
  }
}
