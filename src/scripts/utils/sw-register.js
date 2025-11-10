class ServiceWorkerManager {
  constructor() {
    this.registration = null;
    this.isActive = false;
  }

  async init() {
    // Cek browser support
    if (!("serviceWorker" in navigator)) {
      console.log("❌ Service Worker tidak didukung browser ini");
      return false;
    }

    try {
      console.log("🚀 Mengaktifkan Service Worker...");

      // Unregister SW lama yang bermasalah
      await this.cleanupOldSW();

      // Register SW baru
      await this.registerSW();

      console.log("✅ Service Worker berhasil diaktifkan");
      return true;
    } catch (error) {
      console.error("❌ Gagal mengaktifkan Service Worker:", error);
      return false;
    }
  }

  async cleanupOldSW() {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();

      if (registrations.length === 0) {
        console.log("ℹ️ Tidak ada Service Worker lama");
        return;
      }

      console.log(
        `🗑️ Membersihkan ${registrations.length} Service Worker lama...`
      );

      const unregisterPromises = registrations.map(async (registration) => {
        try {
          await registration.unregister();
          console.log("✅ Berhasil unregister SW:", registration.scope);
          return true;
        } catch (error) {
          console.error("❌ Gagal unregister SW:", error);
          return false;
        }
      });

      await Promise.all(unregisterPromises);
      console.log("✅ Semua Service Worker lama dibersihkan");
    } catch (error) {
      console.error("❌ Error saat membersihkan SW lama:", error);
    }
  }

  async registerSW() {
    try {
      const swUrl = this.getSWUrl();
      const scope = this.getSWScope();

      console.log("📁 Registering Service Worker:", swUrl, "Scope:", scope);

      this.registration = await navigator.serviceWorker.register(swUrl, {
        scope: scope,
      });

      console.log("✅ Service Worker terdaftar:", this.registration.scope);

      // Tunggu aktivasi
      await this.waitForActivation();
      return this.registration;
    } catch (error) {
      console.error("❌ Gagal register Service Worker:", error);
      throw error;
    }
  }

  getSWUrl() {
    // Untuk GitHub Pages
    if (window.location.hostname.includes("github.io")) {
      const repoName = window.location.pathname.split("/")[1] || "story";
      return `/${repoName}/sw.js`;
    }

    // Untuk development/local
    return "/sw.js";
  }

  getSWScope() {
    // Untuk GitHub Pages
    if (window.location.hostname.includes("github.io")) {
      const repoName = window.location.pathname.split("/")[1] || "story";
      return `/${repoName}/`;
    }

    // Untuk development/local
    return "/";
  }

  async waitForActivation() {
    return new Promise((resolve, reject) => {
      if (!this.registration) {
        reject(new Error("No registration found"));
        return;
      }

      // Jika sudah aktif
      if (this.registration.active) {
        this.isActive = true;
        console.log("🎉 Service Worker sudah aktif");
        resolve(this.registration);
        return;
      }

      // Jika masih installing, tunggu sampai aktif
      const installingWorker = this.registration.installing;

      if (installingWorker) {
        installingWorker.addEventListener("statechange", () => {
          console.log(`🔄 Status Service Worker: ${installingWorker.state}`);

          if (installingWorker.state === "activated") {
            this.isActive = true;
            console.log("🎉 Service Worker berhasil diaktifkan!");
            resolve(this.registration);
          }

          if (installingWorker.state === "redundant") {
            reject(new Error("Service Worker menjadi redundant"));
          }
        });
      } else {
        // Listen untuk updatefound
        this.registration.addEventListener("updatefound", () => {
          const newWorker = this.registration.installing;
          console.log("🔄 Service Worker baru ditemukan:", newWorker.state);

          newWorker.addEventListener("statechange", () => {
            console.log(`🔄 Status SW baru: ${newWorker.state}`);

            if (newWorker.state === "activated") {
              this.isActive = true;
              console.log("🎉 Service Worker baru diaktifkan!");
              resolve(this.registration);
            }
          });
        });
      }

      // Timeout setelah 10 detik
      setTimeout(() => {
        if (!this.isActive) {
          console.warn(
            "⚠️ Service Worker activation timeout, but continuing..."
          );
          resolve(this.registration); // Jangan reject, biarkan continue
        }
      }, 10000);
    });
  }

  async forceUpdate() {
    if (!this.registration) {
      console.log("❌ Tidak ada Service Worker yang terdaftar");
      return false;
    }

    try {
      console.log("🔄 Memaksa update Service Worker...");
      await this.registration.update();
      console.log("✅ Force update berhasil");
      return true;
    } catch (error) {
      console.error("❌ Gagal force update:", error);
      return false;
    }
  }

  async unregister() {
    try {
      await this.cleanupOldSW();
      this.registration = null;
      this.isActive = false;
      console.log("✅ Semua Service Worker di-unregister");
      return true;
    } catch (error) {
      console.error("❌ Gagal unregister:", error);
      return false;
    }
  }

  getStatus() {
    return {
      isActive: this.isActive,
      scope: this.registration?.scope || null,
      controller: navigator.serviceWorker.controller ? true : false,
    };
  }
}

// Buat instance global
const swManager = new ServiceWorkerManager();

// Export untuk digunakan di modul lain
export const registerSW = () => swManager.init();
export const forceUpdate = () => swManager.forceUpdate();
export const unregisterSW = () => swManager.unregister();
export const getSWStatus = () => swManager.getStatus();

// Auto init ketika module di-load
if (typeof window !== "undefined") {
  // Tunggu sampai DOM ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      setTimeout(() => swManager.init(), 1000);
    });
  } else {
    setTimeout(() => swManager.init(), 1000);
  }
}

console.log("🚀 Service Worker Manager loaded");
