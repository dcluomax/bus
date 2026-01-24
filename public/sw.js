// Service Worker for Sound Transit Tracker
const CACHE_NAME = 'st-tracker-v4';
const urlsToCache = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/manifest.json',
  '/icon-192.svg',
  '/icon-512.svg',
  '/sounds/orca-scan.mp3'
];

// Install - cache static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

// Activate - clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch - network first, fallback to cache
self.addEventListener('fetch', event => {
  // Skip API calls - always go to network
  if (event.request.url.includes('/api/')) {
    return;
  }
  
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Cache successful responses
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// Handle notification click
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(clientList => {
      // Focus existing window or open new one
      for (const client of clientList) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      return clients.openWindow('/');
    })
  );
});

// Listen for messages from main app
self.addEventListener('message', event => {
  if (event.data.type === 'SCHEDULE_NOTIFICATION') {
    const { title, body, delay, tag } = event.data;
    
    setTimeout(() => {
      self.registration.showNotification(title, {
        body: body,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: tag,
        vibrate: [200, 100, 200],
        requireInteraction: true
      });
    }, delay);
  }
});
