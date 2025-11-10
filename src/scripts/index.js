// src/scripts/index.js
import App from "./pages/app.js";
import { pushManager } from "./utils/push-manager.js";
import { navigation } from "./components/navigation.js";
import { registerSW, getSWStatus } from "./utils/sw-register.js";

console.log("🚀 Memulai Cerita di Sekitarmu...");

const app = new App({
  drawerButton: document.querySelector("#drawer-button"),
  navigationDrawer: document.querySelector("#navigation-drawer"),
  content: document.querySelector("#main-content"),
});

let appInitialized = false;

window.addEventListener("hashchange", () => app.renderPage());
window.addEventListener("load", async () => {
  if (appInitialized) return;
  appInitialized = true;

  await app.renderPage();
  console.log("✅ Aplikasi berhasil dimulai");

  await initializePWA();
});

async function initializePWA() {
  try {
    console.log("📱 Mengaktifkan fitur PWA...");

    // 1. Aktifkan Service Worker
    const swActive = await registerSW();

    if (swActive) {
      console.log("✅ Service Worker aktif");

      // Tampilkan status SW
      const status = getSWStatus();
      console.log("📊 Status Service Worker:", status);
    } else {
      console.log("ℹ️ Service Worker tidak aktif (development mode)");
    }

    // 2. Aktifkan push notifications
    setTimeout(async () => {
      await initializePushNotifications();
    }, 2000);

    console.log("✅ Semua fitur PWA diaktifkan");
  } catch (error) {
    console.error("❌ Gagal mengaktifkan PWA:", error);
  }
}

async function initializePushNotifications() {
  try {
    const pushSupported = await pushManager.init();
    if (pushSupported) {
      await navigation.init();
      console.log("✅ Push notifications aktif");
    } else {
      console.log("ℹ️ Push notifications tidak didukung");
    }
  } catch (error) {
    console.error("❌ Gagal mengaktifkan push notifications:", error);
  }
}

// Export untuk debugging
window.enableSW = registerSW;
window.swStatus = getSWStatus;

window.app = app;
