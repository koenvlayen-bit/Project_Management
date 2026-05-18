const CACHE = 'mc-aziri-v1';
const PRECACHE = [
  '/',
  '/index.html',
  'https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&display=swap',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
  'https://unpkg.com/react@18.3.1/umd/react.development.js',
  'https://unpkg.com/react-dom@18.3.1/umd/react-dom.development.js',
  'https://unpkg.com/@babel/standalone@7.24.0/babel.min.js'
];

// Install: pre-cache app shell
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE).then(function(cache) {
      return cache.addAll(PRECACHE).catch(function(err) {
        console.log('Pre-cache partial failure (ok):', err);
      });
    }).then(function() {
      return self.skipWaiting();
    })
  );
});

// Activate: clean old caches
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE; })
          .map(function(k) { return caches.delete(k); })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

// Fetch: cache-first for app shell, network-first for Supabase API
self.addEventListener('fetch', function(e) {
  var url = e.request.url;

  // Always network for Supabase API calls
  if (url.includes('supabase.co')) {
    e.respondWith(
      fetch(e.request).catch(function() {
        return new Response(JSON.stringify({ error: 'Offline' }), {
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }

  // Cache-first for everything else (app shell, CDN scripts, fonts)
  e.respondWith(
    caches.match(e.request).then(function(cached) {
      if (cached) return cached;
      return fetch(e.request).then(function(response) {
        // Cache successful GET responses
        if (e.request.method === 'GET' && response.status === 200) {
          var clone = response.clone();
          caches.open(CACHE).then(function(cache) {
            cache.put(e.request, clone);
          });
        }
        return response;
      }).catch(function() {
        // If offline and not cached, return the app shell
        if (e.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      });
    })
  );
});
