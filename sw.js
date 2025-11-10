const CACHE_NAME = "cerita-sekitarmu-v1.0.0";
const APP_SHELL_CACHE = "app-shell-v1";

// HANYA file yang benar-benar ada dan stabil
const ESSENTIAL_FILES = [
  "./",
  "./index.html",
  "./manifest.json",
  "./styles.css",
];

const OPTIONAL_FILES = [
  "./favicon.png",
  "./icons/icon-72x72.png",
  "./icons/icon-96x96.png",
  "./icons/icon-128x128.png",
  "./icons/icon-144x144.png",
  "./icons/icon-152x152.png",
  "./icons/icon-192x192.png",
  "./icons/icon-384x384.png",
  "./icons/icon-512x512.png",
];

// === INSTALL ===
self.addEventListener("install", (event) => {
  console.log("🔧 Service Worker: Install");

  // Skip waiting - langsung aktif
  self.skipWaiting();

  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(APP_SHELL_CACHE);

        // Cache essential files
        console.log("📦 Caching essential files...");
        for (const url of ESSENTIAL_FILES) {
          try {
            const response = await fetch(url);
            if (response.ok) {
              await cache.put(url, response);
              console.log(`✅ ${url}`);
            }
          } catch (err) {
            console.warn(`❌ Gagal cache: ${url}`);
          }
        }

        // Cache optional files
        console.log("📦 Caching optional files...");
        for (const url of OPTIONAL_FILES) {
          try {
            const response = await fetch(url);
            if (response.ok) {
              await cache.put(url, response);
            }
          } catch (err) {
            // Skip error untuk optional files
          }
        }

        console.log("🎉 Caching selesai");
      } catch (error) {
        console.error("Error caching:", error);
      }
    })()
  );
});

// === ACTIVATE ===
self.addEventListener("activate", (event) => {
  console.log("🔄 Service Worker: Activate");

  event.waitUntil(
    (async () => {
      // Claim clients
      await self.clients.claim();

      // Clean old caches
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(async (cacheName) => {
          if (cacheName !== APP_SHELL_CACHE && cacheName !== CACHE_NAME) {
            await caches.delete(cacheName);
          }
        })
      );

      console.log("✅ Service Worker aktif");
    })()
  );
});

// === FETCH ===
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Skip non-GET
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Skip API dan external
  if (url.href.includes("story-api.dicoding.dev")) return;
  if (!url.href.startsWith(self.location.origin)) return;

  event.respondWith(
    (async () => {
      // Coba cache dulu
      const cached = await caches.match(request);
      if (cached) return cached;

      try {
        // Fetch dari network
        const response = await fetch(request);

        // Cache jika berhasil
        if (response.status === 200) {
          const cache = await caches.open(APP_SHELL_CACHE);
          cache.put(request, response.clone());
        }

        return response;
      } catch (error) {
        // Fallback untuk halaman
        if (request.destination === "document") {
          const fallback = await caches.match("./index.html");
          if (fallback) return fallback;
        }

        // Offline page
        return new Response(
          "<h1>Anda sedang offline</h1><p>Cek koneksi internet Anda.</p>",
          {
            status: 503,
            headers: { "Content-Type": "text/html" },
          }
        );
      }
    })()
  );
});

// Push notifications (simple version)
self.addEventListener("push", (event) => {
  const options = {
    body: "Ada cerita baru di sekitarmu! 📖",
    icon: "./icons/icon-192x192.png",
    badge: "./icons/icon-72x72.png",
  };

  event.waitUntil(
    self.registration.showNotification("Cerita di Sekitarmu", options)
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin)) return client.focus();
      }
      return self.clients.openWindow("./");
    })
  );
});

console.log("🚀 Service Worker loaded");
