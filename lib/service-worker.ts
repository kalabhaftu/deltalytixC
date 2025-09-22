'use client'

// Simple service worker utilities for basic caching and offline support

export interface ServiceWorkerStatus {
  isSupported: boolean
  isRegistered: boolean
  isActive: boolean
  registration?: ServiceWorkerRegistration
}

class ServiceWorkerManager {
  private static instance: ServiceWorkerManager
  private registration: ServiceWorkerRegistration | null = null
  private isSupported: boolean = false

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

  // Initialize service worker for basic caching
  private async initializeServiceWorker() {
    if (!this.isSupported) return

    try {
      this.registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      })
    } catch (error) {
      console.error('Service Worker registration failed:', error)
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

// Simple React hook for basic service worker functionality
import { useState, useEffect } from 'react'

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

  return {
    ...status,
    isOnline,
  }
}
