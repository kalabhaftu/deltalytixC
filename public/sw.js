// Deltalytix Service Worker
// Provides offline functionality, caching, and background sync

const CACHE_NAME = 'deltalytix-v1.0.0'
const STATIC_CACHE = 'deltalytix-static-v1.0.0'
const API_CACHE = 'deltalytix-api-v1.0.0'
const IMAGE_CACHE = 'deltalytix-images-v1.0.0'

// Files to cache immediately
const STATIC_FILES = [
  '/',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png',
  '/offline.html',
  // Add critical CSS and JS files
]

// API endpoints to cache
const CACHE_API_PATTERNS = [
  /^\/api\/trades/,
  /^\/api\/accounts/,
  /^\/api\/analytics\/basic/,
  /^\/api\/user\/profile/,
]

// Background sync tags
const SYNC_TAGS = {
  TRADE_UPLOAD: 'trade-upload',
  PROFILE_UPDATE: 'profile-update',
  ANALYTICS_REQUEST: 'analytics-request',
}

// Install event - cache static resources
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...')
  
  event.waitUntil(
    Promise.all([
      // Cache static files
      caches.open(STATIC_CACHE).then((cache) => {
        console.log('[SW] Caching static files')
        return cache.addAll(STATIC_FILES)
      }),
      
      // Skip waiting to activate immediately
      self.skipWaiting()
    ])
  )
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...')
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && 
                cacheName !== STATIC_CACHE && 
                cacheName !== API_CACHE &&
                cacheName !== IMAGE_CACHE) {
              console.log('[SW] Deleting old cache:', cacheName)
              return caches.delete(cacheName)
            }
          })
        )
      }),
      
      // Claim all clients
      self.clients.claim()
    ])
  )
})

// Fetch event - intercept network requests
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)
  
  // Skip non-GET requests and chrome-extension requests
  if (request.method !== 'GET' || url.protocol === 'chrome-extension:') {
    return
  }

  // Handle different types of requests
  if (isStaticFile(url)) {
    event.respondWith(handleStaticRequest(request))
  } else if (isAPIRequest(url)) {
    event.respondWith(handleAPIRequest(request))
  } else if (isImageRequest(url)) {
    event.respondWith(handleImageRequest(request))
  } else {
    event.respondWith(handlePageRequest(request))
  }
})

// Handle static file requests (CSS, JS, fonts)
async function handleStaticRequest(request) {
  const cache = await caches.open(STATIC_CACHE)
  const cachedResponse = await cache.match(request)
  
  if (cachedResponse) {
    return cachedResponse
  }
  
  try {
    const response = await fetch(request)
    if (response.ok) {
      cache.put(request, response.clone())
    }
    return response
  } catch (error) {
    console.log('[SW] Static file request failed:', error)
    return new Response('Static resource unavailable', { status: 404 })
  }
}

// Handle API requests with caching strategy
async function handleAPIRequest(request) {
  const cache = await caches.open(API_CACHE)
  const url = new URL(request.url)
  
  // Check if this API should be cached
  const shouldCache = CACHE_API_PATTERNS.some(pattern => pattern.test(url.pathname))
  
  if (!shouldCache) {
    return fetch(request)
  }
  
  try {
    // Try network first for fresh data
    const response = await fetch(request)
    
    if (response.ok) {
      // Cache successful responses
      cache.put(request, response.clone())
      return response
    } else {
      // If network fails, try cache
      const cachedResponse = await cache.match(request)
      return cachedResponse || response
    }
  } catch (error) {
    console.log('[SW] API request failed, trying cache:', error)
    
    // Network failed, try cache
    const cachedResponse = await cache.match(request)
    
    if (cachedResponse) {
      return cachedResponse
    }
    
    // Return offline response for critical endpoints
    if (url.pathname.includes('/api/trades')) {
      return new Response(
        JSON.stringify({ 
          error: 'Offline', 
          trades: [], 
          cached: true 
        }), 
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }
    
    return new Response(
      JSON.stringify({ error: 'Service unavailable offline' }), 
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}

// Handle image requests
async function handleImageRequest(request) {
  const cache = await caches.open(IMAGE_CACHE)
  const cachedResponse = await cache.match(request)
  
  if (cachedResponse) {
    return cachedResponse
  }
  
  try {
    const response = await fetch(request)
    if (response.ok) {
      // Cache images for offline use
      cache.put(request, response.clone())
    }
    return response
  } catch (error) {
    console.log('[SW] Image request failed:', error)
    // Return placeholder image
    return new Response(
      '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100%" height="100%" fill="#ddd"/><text x="50%" y="50%" text-anchor="middle" dy=".3em">Image offline</text></svg>',
      { headers: { 'Content-Type': 'image/svg+xml' } }
    )
  }
}

// Handle page requests
async function handlePageRequest(request) {
  try {
    const response = await fetch(request)
    return response
  } catch (error) {
    console.log('[SW] Page request failed, serving offline page:', error)
    
    // Serve offline page
    const cache = await caches.open(STATIC_CACHE)
    const offlinePage = await cache.match('/offline.html')
    
    if (offlinePage) {
      return offlinePage
    }
    
    // Fallback offline response
    return new Response(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Offline - Deltalytix</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .offline-message { max-width: 400px; margin: 0 auto; }
            .icon { font-size: 64px; margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <div class="offline-message">
            <div class="icon">📊</div>
            <h1>You're Offline</h1>
            <p>Deltalytix needs an internet connection to work properly. Please check your connection and try again.</p>
            <button onclick="window.location.reload()">Retry</button>
          </div>
        </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html' }
    })
  }
}

// Background sync for uploading data when back online
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag)
  
  switch (event.tag) {
    case SYNC_TAGS.TRADE_UPLOAD:
      event.waitUntil(syncTradeUploads())
      break
    case SYNC_TAGS.PROFILE_UPDATE:
      event.waitUntil(syncProfileUpdates())
      break
    case SYNC_TAGS.ANALYTICS_REQUEST:
      event.waitUntil(syncAnalyticsRequests())
      break
  }
})

// Sync pending trade uploads
async function syncTradeUploads() {
  try {
    const db = await openIndexedDB()
    const pendingTrades = await getPendingTrades(db)
    
    for (const trade of pendingTrades) {
      try {
        const response = await fetch('/api/trades', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(trade.data)
        })
        
        if (response.ok) {
          await removePendingTrade(db, trade.id)
          console.log('[SW] Synced trade upload:', trade.id)
        }
      } catch (error) {
        console.log('[SW] Failed to sync trade:', error)
      }
    }
  } catch (error) {
    console.log('[SW] Background sync failed:', error)
  }
}

// Sync profile updates
async function syncProfileUpdates() {
  try {
    const db = await openIndexedDB()
    const pendingUpdates = await getPendingProfileUpdates(db)
    
    for (const update of pendingUpdates) {
      try {
        const response = await fetch('/api/user/profile', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(update.data)
        })
        
        if (response.ok) {
          await removePendingProfileUpdate(db, update.id)
          console.log('[SW] Synced profile update:', update.id)
        }
      } catch (error) {
        console.log('[SW] Failed to sync profile update:', error)
      }
    }
  } catch (error) {
    console.log('[SW] Profile sync failed:', error)
  }
}

// Sync analytics requests
async function syncAnalyticsRequests() {
  try {
    // Refresh cached analytics data
    const cache = await caches.open(API_CACHE)
    const analyticsUrls = [
      '/api/analytics/basic',
      '/api/analytics/advanced',
      '/api/analytics/performance'
    ]
    
    for (const url of analyticsUrls) {
      try {
        const response = await fetch(url)
        if (response.ok) {
          await cache.put(url, response.clone())
        }
      } catch (error) {
        console.log('[SW] Failed to refresh analytics cache:', error)
      }
    }
  } catch (error) {
    console.log('[SW] Analytics sync failed:', error)
  }
}

// Message handling for communication with main thread
self.addEventListener('message', (event) => {
  const { type, data } = event.data
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting()
      break
    case 'CACHE_TRADE_DATA':
      cacheTradeData(data)
      break
    case 'CLEAR_CACHE':
      clearAllCaches()
      break
    case 'GET_CACHE_STATUS':
      getCacheStatus().then(status => {
        event.ports[0].postMessage(status)
      })
      break
  }
})

// Cache trade data for offline access
async function cacheTradeData(data) {
  try {
    const cache = await caches.open(API_CACHE)
    const response = new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' }
    })
    await cache.put('/api/trades/cached', response)
    console.log('[SW] Cached trade data for offline access')
  } catch (error) {
    console.log('[SW] Failed to cache trade data:', error)
  }
}

// Clear all caches
async function clearAllCaches() {
  try {
    const cacheNames = await caches.keys()
    await Promise.all(
      cacheNames.map(cacheName => caches.delete(cacheName))
    )
    console.log('[SW] Cleared all caches')
  } catch (error) {
    console.log('[SW] Failed to clear caches:', error)
  }
}

// Get cache status
async function getCacheStatus() {
  try {
    const cacheNames = await caches.keys()
    const status = {}
    
    for (const cacheName of cacheNames) {
      const cache = await caches.open(cacheName)
      const keys = await cache.keys()
      status[cacheName] = keys.length
    }
    
    return status
  } catch (error) {
    console.log('[SW] Failed to get cache status:', error)
    return {}
  }
}

// Helper functions
function isStaticFile(url) {
  const staticExtensions = ['.css', '.js', '.woff', '.woff2', '.ttf', '.eot']
  return staticExtensions.some(ext => url.pathname.endsWith(ext))
}

function isAPIRequest(url) {
  return url.pathname.startsWith('/api/')
}

function isImageRequest(url) {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg']
  return imageExtensions.some(ext => url.pathname.endsWith(ext))
}

// IndexedDB helpers for offline storage
function openIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('DeltalytixOffline', 1)
    
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result
      
      // Create object stores
      if (!db.objectStoreNames.contains('pendingTrades')) {
        db.createObjectStore('pendingTrades', { keyPath: 'id' })
      }
      
      if (!db.objectStoreNames.contains('pendingProfileUpdates')) {
        db.createObjectStore('pendingProfileUpdates', { keyPath: 'id' })
      }
      
      if (!db.objectStoreNames.contains('offlineData')) {
        db.createObjectStore('offlineData', { keyPath: 'key' })
      }
    }
  })
}

async function getPendingTrades(db) {
  const transaction = db.transaction(['pendingTrades'], 'readonly')
  const store = transaction.objectStore('pendingTrades')
  return new Promise((resolve, reject) => {
    const request = store.getAll()
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function removePendingTrade(db, id) {
  const transaction = db.transaction(['pendingTrades'], 'readwrite')
  const store = transaction.objectStore('pendingTrades')
  return new Promise((resolve, reject) => {
    const request = store.delete(id)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

async function getPendingProfileUpdates(db) {
  const transaction = db.transaction(['pendingProfileUpdates'], 'readonly')
  const store = transaction.objectStore('pendingProfileUpdates')
  return new Promise((resolve, reject) => {
    const request = store.getAll()
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function removePendingProfileUpdate(db, id) {
  const transaction = db.transaction(['pendingProfileUpdates'], 'readwrite')
  const store = transaction.objectStore('pendingProfileUpdates')
  return new Promise((resolve, reject) => {
    const request = store.delete(id)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

console.log('[SW] Service worker loaded successfully')
