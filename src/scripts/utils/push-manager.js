class PushManager {
  constructor() {
    this.isSubscribed = false;
    this.registration = null;
    this.subscription = null;
    this.VAPID_PUBLIC_KEY =
      "BCCs2eonMI-6H2ctvFaWg-UYdDv387Vno_bzUzALpB442r2lCnsHmtrx8biyPi_E-1fSGABK_Qs_GlvPoJJqxbk";
    this._isInitialized = false;
    this._initPromise = null;
    this._retryCount = 0;
    this._maxRetries = 3;
  }

  async init() {
    console.log("🔄 PushManager: Initializing...");

    if (this._initPromise) {
      return this._initPromise;
    }

    this._initPromise = new Promise(async (resolve, reject) => {
      try {
        // Cek support dasar
        if (!this._isSupported()) {
          console.log("❌ PushManager: Not supported in this browser");
          this._isInitialized = true;
          resolve(false);
          return;
        }

        console.log("✅ PushManager: Basic support check passed");

        // Untuk environment yang tidak support push service sebenarnya
        if (this._shouldUseLocalStorage()) {
          console.log("🔧 PushManager: Using localStorage approach");
          this._initWithLocalStorage();
          this._isInitialized = true;
          resolve(true);
          return;
        }

        // Tunggu Service Worker ready dengan timeout
        console.log("⏳ PushManager: Waiting for Service Worker...");
        this.registration = await this._waitForServiceWorker();

        if (!this.registration || !this.registration.pushManager) {
          console.warn(
            "⚠️ PushManager: No valid Service Worker registration, falling back to localStorage"
          );
          this._initWithLocalStorage();
          this._isInitialized = true;
          resolve(true);
          return;
        }

        console.log("✅ PushManager: Service Worker ready with pushManager");

        // Cek subscription
        this.subscription =
          await this.registration.pushManager.getSubscription();
        this.isSubscribed = !!this.subscription;

        // Sync dengan localStorage
        this._syncWithLocalStorage();

        this._isInitialized = true;
        console.log(
          "🎉 PushManager: Initialized successfully, subscribed:",
          this.isSubscribed
        );
        resolve(true);
      } catch (error) {
        console.error("❌ PushManager: Init failed:", error);

        // Fallback ke localStorage
        console.log("🔄 PushManager: Falling back to localStorage");
        this._initWithLocalStorage();
        this._isInitialized = true;
        resolve(true);
      }
    });

    return this._initPromise;
  }

  async _waitForServiceWorker() {
    return new Promise((resolve, reject) => {
      // Cek jika sudah ready
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.ready.then(resolve).catch(reject);
        return;
      }

      // Jika belum, tunggu dengan timeout
      const timeout = setTimeout(() => {
        console.warn("⏰ PushManager: Service Worker wait timeout");
        resolve(null);
      }, 5000);

      navigator.serviceWorker.ready
        .then((registration) => {
          clearTimeout(timeout);
          resolve(registration);
        })
        .catch((error) => {
          clearTimeout(timeout);
          console.warn("⚠️ PushManager: Service Worker ready failed:", error);
          resolve(null);
        });
    });
  }

  _isSupported() {
    const hasServiceWorker = "serviceWorker" in navigator;
    const hasPushManager = "PushManager" in window;
    const hasNotification = "Notification" in window;

    const isSupported = hasServiceWorker && hasPushManager && hasNotification;

    console.log("🔍 PushManager: Support check:", {
      hasServiceWorker,
      hasPushManager,
      hasNotification,
      isSupported,
    });

    return isSupported;
  }

  _shouldUseLocalStorage() {
    // Gunakan localStorage untuk environment yang bermasalah dengan push
    const isGitHubPages = window.location.hostname.includes("github.io");
    const isLocalhost =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";

    // HTTPS required untuk push service asli
    const isHTTPS = window.location.protocol === "https:";

    const useLocalStorage = isGitHubPages || !isHTTPS;

    console.log("🔍 PushManager: Environment check:", {
      isGitHubPages,
      isLocalhost,
      isHTTPS,
      useLocalStorage,
    });

    return useLocalStorage;
  }

  _initWithLocalStorage() {
    console.log("💾 PushManager: Initializing with localStorage");
    const stored = localStorage.getItem("pushSubscription");
    this.isSubscribed = !!stored;
    this.registration = null;
    this.subscription = null;

    console.log(
      "📊 PushManager: localStorage subscription status:",
      this.isSubscribed
    );
  }

  _syncWithLocalStorage() {
    // Sync status antara push service dan localStorage
    const stored = localStorage.getItem("pushSubscription");

    if (this.isSubscribed && !stored) {
      // Jika subscribed di push service tapi tidak di localStorage
      localStorage.setItem("pushSubscription", "active");
    } else if (!this.isSubscribed && stored) {
      // Jika tidak subscribed di push service tapi ada di localStorage
      localStorage.removeItem("pushSubscription");
    }
  }

  async subscribe() {
    console.log("🔔 PushManager: Starting subscribe process...");

    if (!this._isInitialized) {
      await this.init();
    }

    try {
      console.log("📝 PushManager: Requesting notification permission...");
      const permission = await Notification.requestPermission();

      if (permission !== "granted") {
        throw new Error("Izin notifikasi ditolak oleh pengguna");
      }

      console.log("✅ PushManager: Notification permission granted");

      // Untuk environment yang pakai localStorage
      if (this._shouldUseLocalStorage() || !this.registration) {
        console.log("💾 PushManager: Using localStorage subscription");
        return this._subscribeWithLocalStorage();
      }

      // Untuk environment dengan push service asli
      console.log("🌐 PushManager: Using real push service subscription");
      return await this._subscribeWithPushService();
    } catch (error) {
      console.error("❌ PushManager: Subscribe error:", error);
      this._showLocalNotification(
        "❌ Gagal Mengaktifkan",
        "Tidak dapat mengaktifkan notifikasi: " + error.message
      );
      return false;
    }
  }

  async _subscribeWithLocalStorage() {
    localStorage.setItem(
      "pushSubscription",
      JSON.stringify({
        endpoint: "local-storage-mode",
        keys: { p256dh: "local", auth: "storage" },
        createdAt: new Date().toISOString(),
      })
    );

    this.isSubscribed = true;

    this._showLocalNotification(
      "🔔 Notifikasi Diaktifkan",
      "Anda akan menerima notifikasi cerita baru. (Mode Simulasi)"
    );

    console.log("✅ PushManager: LocalStorage subscription successful");
    return true;
  }

  async _subscribeWithPushService() {
    if (!this.registration || !this.registration.pushManager) {
      throw new Error("Service Worker tidak tersedia untuk push service");
    }

    // Unsubscribe existing dulu
    if (this.subscription) {
      console.log("🔄 PushManager: Unsubscribing existing subscription...");
      await this.subscription.unsubscribe();
    }

    // Subscribe baru
    this.subscription = await this.registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: this._urlBase64ToUint8Array(this.VAPID_PUBLIC_KEY),
    });

    this.isSubscribed = true;

    // Simpan ke localStorage sebagai backup
    const subscriptionJSON = this.subscription.toJSON();
    localStorage.setItem("pushSubscription", JSON.stringify(subscriptionJSON));

    console.log("✅ PushManager: Push service subscription successful");

    // Coba kirim ke server
    try {
      await this._sendSubscriptionToServer();
      console.log("✅ PushManager: Subscription sent to server");
    } catch (serverError) {
      console.warn("⚠️ PushManager: Server subscription failed:", serverError);
    }

    this._showLocalNotification(
      "🔔 Notifikasi Diaktifkan",
      "Anda akan menerima notifikasi cerita baru."
    );

    return true;
  }

  async unsubscribe() {
    console.log("🔕 PushManager: Starting unsubscribe process...");

    try {
      // Untuk semua environment, hapus dari localStorage
      localStorage.removeItem("pushSubscription");
      this.isSubscribed = false;

      // Untuk push service asli, unsubscribe juga
      if (this.subscription && this.registration) {
        console.log("🌐 PushManager: Unsubscribing from push service...");
        await this.subscription.unsubscribe();
        this.subscription = null;
      }

      console.log("✅ PushManager: Local cleanup complete");

      // Coba hapus dari server
      try {
        await this._removeSubscriptionFromServer();
        console.log("✅ PushManager: Server unsubscription successful");
      } catch (serverError) {
        console.warn(
          "⚠️ PushManager: Server unsubscription failed:",
          serverError
        );
      }

      this._showLocalNotification(
        "🔕 Notifikasi Dimatikan",
        "Anda tidak akan menerima notifikasi lagi."
      );

      return true;
    } catch (error) {
      console.error("❌ PushManager: Unsubscribe error:", error);

      // Tetap lakukan cleanup lokal
      this.isSubscribed = false;
      this.subscription = null;
      localStorage.removeItem("pushSubscription");

      this._showLocalNotification(
        "⚠️ Notifikasi Dimatikan",
        "Notifikasi telah dimatikan secara lokal."
      );

      return true;
    }
  }

  async _sendSubscriptionToServer() {
    if (!this.subscription) {
      return { success: false, error: "No subscription" };
    }

    const token = localStorage.getItem("authToken");
    if (!token) {
      console.log(
        "🔐 PushManager: No auth token, skipping server registration"
      );
      return { success: false, error: "No auth token" };
    }

    try {
      const subscriptionJSON = this.subscription.toJSON();

      const response = await fetch(
        "https://story-api.dicoding.dev/v1/notifications/subscribe",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            endpoint: subscriptionJSON.endpoint,
            keys: subscriptionJSON.keys,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      console.log("✅ PushManager: Subscription saved on server");
      return { success: true };
    } catch (error) {
      console.warn(
        "⚠️ PushManager: Failed to save subscription on server:",
        error
      );
      return { success: false, error: error.message };
    }
  }

  async _removeSubscriptionFromServer() {
    const token = localStorage.getItem("authToken");
    if (!token) {
      console.log(
        "🔐 PushManager: No auth token, skipping server unsubscription"
      );
      return { success: false, error: "No auth token" };
    }

    let endpoint;
    if (this.subscription) {
      const subscriptionJSON = this.subscription.toJSON();
      endpoint = subscriptionJSON.endpoint;
    } else {
      const stored = localStorage.getItem("pushSubscription");
      if (stored) {
        const storedJSON = JSON.parse(stored);
        endpoint = storedJSON.endpoint;
      }
    }

    if (!endpoint) {
      console.log("❌ PushManager: No endpoint available");
      return { success: false, error: "No endpoint available" };
    }

    try {
      const response = await fetch(
        "https://story-api.dicoding.dev/v1/notifications/subscribe",
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ endpoint }),
        }
      );

      if (!response.ok && response.status !== 404) {
        throw new Error(`Server returned ${response.status}`);
      }

      console.log("✅ PushManager: Subscription removed from server");
      return { success: true };
    } catch (error) {
      console.warn(
        "⚠️ PushManager: Failed to remove subscription from server:",
        error
      );
      return { success: false, error: error.message };
    }
  }

  _showLocalNotification(title, body) {
    if ("Notification" in window && Notification.permission === "granted") {
      try {
        new Notification(title, {
          body: body,
          icon: "/icons/icon-192x192.png",
        });
      } catch (error) {
        // Fallback ke console log
        console.log(`📢 ${title}: ${body}`);
      }
    } else {
      // Fallback ke console log
      console.log(`📢 ${title}: ${body}`);
    }
  }

  _urlBase64ToUint8Array(base64String) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, "+")
      .replace(/_/g, "/");
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  getStatus() {
    // Selalu sync dengan localStorage untuk status terbaru
    const stored = localStorage.getItem("pushSubscription");
    this.isSubscribed = !!stored;

    const status = {
      isSubscribed: this.isSubscribed,
      isSupported: this._isSupported(),
      permission: Notification.permission,
      isInitialized: this._isInitialized,
      environment: this._shouldUseLocalStorage()
        ? "localStorage"
        : "pushService",
      hasServiceWorker: !!this.registration,
    };

    console.log("📊 PushManager: Current status:", status);
    return status;
  }

  // Method untuk manual recovery
  async recover() {
    console.log("🔄 PushManager: Attempting recovery...");
    this._isInitialized = false;
    this._initPromise = null;
    return await this.init();
  }
}

export const pushManager = new PushManager();
