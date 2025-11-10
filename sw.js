const CACHE_NAME = "cerita-sekitarmu-v2.2.0";
const APP_SHELL_CACHE = "app-shell-v2";
const BASE_PATH = "/story";
const ESSENTIAL_FILES = [
  "./",
  "./index.html",
  "./main.bundle.js",
  "./styles.css",
  "./manifest.json",
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
  console.log("🔧 Service Worker: Memulai instalasi...");

  // Skip waiting - langsung aktifkan SW baru
  event.waitUntil(self.skipWaiting());

  // Cache App Shell dengan error handling yang robust
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(APP_SHELL_CACHE);
        console.log("💾 Membuka cache...");

        // 1. Cache ESSENTIAL files - harus berhasil
        console.log("📦 Caching file essential...");
        const essentialResults = await Promise.allSettled(
          ESSENTIAL_FILES.map((url) =>
            cache.add(url).catch((err) => {
              console.warn(`⚠️ Gagal cache essential ${url}:`, err.message);
              return null; // Return null instead of throwing
            })
          )
        );

        // Log results
        const essentialSuccess = essentialResults.filter(
          (r) => r.status === "fulfilled" && r.value !== null
        ).length;

        console.log(
          `✅ ${essentialSuccess}/${ESSENTIAL_FILES.length} file essential berhasil di-cache`
        );

        // 2. Cache OPTIONAL files - boleh gagal
        console.log("📦 Caching file optional...");
        const optionalResults = await Promise.allSettled(
          OPTIONAL_FILES.map(async (url) => {
            try {
              await cache.add(url);
              console.log(`✅ Berhasil cache optional: ${url}`);
              return { success: true, url };
            } catch (err) {
              console.warn(`⚠️ Gagal cache optional ${url}:`, err.message);
              return { success: false, url, error: err.message };
            }
          })
        );

        const optionalSuccess = optionalResults.filter(
          (r) => r.status === "fulfilled" && r.value.success
        ).length;

        console.log(
          `📊 Cache result: ${essentialSuccess}/${ESSENTIAL_FILES.length} essential, ${optionalSuccess}/${OPTIONAL_FILES.length} optional berhasil`
        );

        console.log("🎉 Proses caching selesai");
      } catch (error) {
        console.error("❌ Error utama saat caching:", error);
        // JANGAN reject - biarkan SW tetap install meski caching gagal
      }
    })()
  );
});

// === ACTIVATE ===
self.addEventListener("activate", (event) => {
  console.log("🔄 Service Worker: Mengaktifkan...");

  event.waitUntil(
    (async () => {
      // Claim clients immediately
      await self.clients.claim();

      // Clean old caches
      try {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(async (cacheName) => {
            if (cacheName !== APP_SHELL_CACHE && cacheName !== CACHE_NAME) {
              console.log(`🗑️ Menghapus cache lama: ${cacheName}`);
              await caches.delete(cacheName);
            }
          })
        );
      } catch (error) {
        console.warn("⚠️ Error cleaning old caches:", error);
      }

      console.log("✅ Service Worker aktif dan siap!");
    })()
  );
});

// === FETCH ===
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Skip non-GET requests
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Skip API calls - langsung fetch dari network
  if (url.href.includes("story-api.dicoding.dev")) {
    return;
  }

  // Skip external resources
  if (!url.href.startsWith(self.location.origin)) {
    return;
  }

  // Handle request
  event.respondWith(
    (async () => {
      try {
        // Coba cache dulu
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
          return cachedResponse;
        }

        // Kalau tidak ada di cache, fetch dari network
        const networkResponse = await fetch(request);

        // Cache response yang valid (kecuali API calls)
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          !url.href.includes("story-api.dicoding.dev")
        ) {
          try {
            const cache = await caches.open(APP_SHELL_CACHE);
            await cache.put(request, networkResponse.clone());
          } catch (cacheError) {
            console.warn(`⚠️ Gagal menyimpan ke cache: ${url.pathname}`);
          }
        }

        return networkResponse;
      } catch (error) {
        console.log(`❌ Network error: ${url.pathname}`);

        // Fallback untuk HTML requests
        if (
          request.destination === "document" ||
          request.headers.get("accept")?.includes("text/html")
        ) {
          const fallback = await caches.match("./index.html");
          if (fallback) {
            return fallback;
          }
        }

        // Return offline page
        return createOfflineResponse();
      }
    })()
  );
});

// Helper function untuk create offline response
function createOfflineResponse() {
  return new Response(
    `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Anda Sedang Offline - Cerita di Sekitarmu</title>
        
      </head>
      <body>
        <div class="container">
          <h1>📶 Anda Sedang Offline</h1>
          <p>Aplikasi membutuhkan koneksi internet untuk mengambil data cerita terbaru.</p>
          <p>Silakan periksa koneksi internet Anda dan coba lagi.</p>
        </div>
      </body>
    </html>
  `,
    {
      status: 503,
      statusText: "Service Unavailable",
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    }
  );
}

// === PUSH NOTIFICATIONS ===
self.addEventListener("push", (event) => {
  console.log("📨 Menerima push notification");

  const options = {
    body: "Ada cerita baru di sekitarmu! 📖",
    icon: "./icons/icon-192x192.png",
    badge: "./icons/icon-72x72.png",
    tag: "cerita-notification",
  };

  event.waitUntil(
    self.registration.showNotification("Cerita di Sekitarmu", options)
  );
});

self.addEventListener("notificationclick", (event) => {
  console.log("👆 Notification diklik");
  event.notification.close();

  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin)) {
          return client.focus();
        }
      }
      return self.clients.openWindow("./");
    })
  );
});

console.log("🚀 Service Worker loaded dan siap! Versi 2.2.0");
