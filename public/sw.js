// Service Worker for NannyGold PWA
// IMPORTANT: Increment version number to force cache refresh after updates
const CACHE_NAME = 'nannygold-v3.0.0-vercel-optimized';
const RUNTIME_CACHE = 'nannygold-runtime-v3';
const API_CACHE = 'nannygold-api-v3';
const IMAGE_CACHE = 'nannygold-images-v3';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png'
];

const MAX_API_CACHE_AGE = 5 * 60 * 1000; // 5 minutes
const MAX_IMAGE_CACHE_SIZE = 50;

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .catch((error) => {
        console.error('Service Worker: Failed to cache static assets', error);
      })
  );
  // Force activation
  self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  const currentCaches = [CACHE_NAME, RUNTIME_CACHE, API_CACHE, IMAGE_CACHE];
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (!currentCaches.includes(cacheName)) {
              console.log('Service Worker: Deleting old cache', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
  );
  self.clients.claim();
});

// Fetch event - intelligent caching strategy
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  
  // Images - cache first, with size limit
  if (url.pathname.match(/\.(jpg|jpeg|png|gif|svg|webp|ico)$/)) {
    event.respondWith(
      caches.open(IMAGE_CACHE).then(async (cache) => {
        const cached = await cache.match(event.request);
        if (cached) return cached;
        
        const response = await fetch(event.request);
        if (response.status === 200) {
          cache.put(event.request, response.clone());
          // Limit cache size
          const keys = await cache.keys();
          if (keys.length > MAX_IMAGE_CACHE_SIZE) {
            cache.delete(keys[0]);
          }
        }
        return response;
      }).catch(() => caches.match(event.request))
    );
    return;
  }

  // Supabase API - network first with timed cache
  if (url.hostname.includes('supabase.co')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(API_CACHE).then((cache) => {
              cache.put(event.request, responseClone);
              // Add timestamp for expiration
              cache.put(event.request.url + ':timestamp', new Response(Date.now()));
            });
          }
          return response;
        })
        .catch(() => {
          return caches.open(API_CACHE).then(async (cache) => {
            const cached = await cache.match(event.request);
            const timestamp = await cache.match(event.request.url + ':timestamp');
            
            if (cached && timestamp) {
              const age = Date.now() - parseInt(await timestamp.text());
              if (age < MAX_API_CACHE_AGE) {
                return cached;
              }
            }
            throw new Error('Cache expired');
          });
        })
    );
    return;
  }

  // Static assets - cache first
  if (url.pathname.includes('/assets/')) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        return cached || fetch(event.request).then((response) => {
          if (response.status === 200) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, response.clone());
            });
          }
          return response;
        });
      })
    );
    return;
  }

  // HTML navigation - network first
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Default - network with cache fallback
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.status === 200) {
          caches.open(RUNTIME_CACHE).then((cache) => {
            cache.put(event.request, response.clone());
          });
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// Push notification handling (for future use)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/icon-192x192.png',
      badge: '/icon-72x72.png',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: data.primaryKey || 1
      },
      actions: [
        {
          action: 'explore',
          title: 'View Details',
          icon: '/icon-192x192.png'
        },
        {
          action: 'close',
          title: 'Close',
          icon: '/icon-192x192.png'
        }
      ]
    };

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'explore') {
    // Open the app to relevant page
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});