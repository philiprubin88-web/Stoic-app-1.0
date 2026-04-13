/**
 * STOIC Service Worker
 * Strategy: Network-first for HTML, Cache-first for static assets.
 * This prevents the iOS "white screen on launch" caused by stale cached HTML.
 */

const CACHE_NAME = 'stoic-v1'

// Assets to pre-cache on install (static, fingerprinted by Vite)
const PRECACHE_URLS = [
  '/',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/favicon.svg',
]

// ── Install: pre-cache shell ────────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(PRECACHE_URLS).catch(err => {
        // Don't fail install if pre-cache misses a URL
        console.warn('[SW] Pre-cache partial failure:', err)
      })
    }).then(() => self.skipWaiting()) // Activate immediately
  )
})

// ── Activate: clear old caches ──────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim()) // Take control of all open tabs
  )
})

// ── Fetch: network-first for navigation, cache-first for assets ─────────────
self.addEventListener('fetch', event => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET and cross-origin requests
  if (request.method !== 'GET' || url.origin !== location.origin) return

  // Navigation requests (HTML pages) → network-first
  // This is the KEY fix: always try the network for the app shell so iOS
  // never boots from a stale or empty cached HTML file.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Cache the fresh HTML
          const clone = response.clone()
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone))
          return response
        })
        .catch(() => {
          // Offline fallback — serve cached index.html
          return caches.match('/') || caches.match(request)
        })
    )
    return
  }

  // Static assets (JS, CSS, images, fonts) → cache-first
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached
      return fetch(request).then(response => {
        // Only cache valid responses
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response
        }
        const clone = response.clone()
        caches.open(CACHE_NAME).then(cache => cache.put(request, clone))
        return response
      })
    })
  )
})
