class PushManager {
  constructor() {
    this.isSubscribed = false;
    this.registration = null;
    this.subscription = null;
    this.VAPID_PUBLIC_KEY =
      "BCCs2eonMI-6H2ctvFaWg-UYdDv387Vno_bzUzALpB442r2lCnsHmtrx8biyPi_E-1fSGABK_Qs_GlvPoJJqxbk";
    this._isInitialized = false;
    this._initPromise = null;
  }

  async init() {
    console.log("PushManager: Initializing...");

    if (this._initPromise) {
      return this._initPromise;
    }

    this._initPromise = new Promise(async (resolve, reject) => {
      if (!this._isSupported()) {
        console.log("PushManager: Not supported");
        this._isInitialized = true;
        resolve(false);
        return;
      }

      try {
        // Tunggu Service Worker ready
        if (!navigator.serviceWorker.controller) {
          console.log("PushManager: Waiting for Service Worker...");
          await navigator.serviceWorker.ready;
        }

        this.registration = await navigator.serviceWorker.ready;
        console.log("PushManager: Service Worker ready", this.registration);

        if (this._isDevelopment()) {
          console.log("PushManager: Development mode - using localStorage");
          const stored = localStorage.getItem("pushSubscription");
          this.isSubscribed = !!stored;
          this._isInitialized = true;
          resolve(true);
          return;
        }

        this.subscription =
          await this.registration.pushManager.getSubscription();
        this.isSubscribed = !!this.subscription;

        this._isInitialized = true;
        console.log("PushManager: Initialized, subscribed:", this.isSubscribed);
        resolve(true);
      } catch (error) {
        console.error("PushManager: Init error:", error);

        // Fallback untuk semua environment
        console.log("PushManager: Fallback to localStorage");
        const stored = localStorage.getItem("pushSubscription");
        this.isSubscribed = !!stored;
        this._isInitialized = true;
        resolve(true);
      }
    });

    return this._initPromise;
  }

  _isSupported() {
    const isSupported = "serviceWorker" in navigator && "PushManager" in window;
    console.log("PushManager: Supported:", isSupported);
    return isSupported;
  }

  _isDevelopment() {
    return (
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1"
    );
  }

  _isProduction() {
    return window.location.hostname.includes("github.io");
  }

  async subscribe() {
    if (!this._isInitialized) {
      await this.init();
    }

    try {
      console.log("PushManager: Requesting notification permission...");
      const permission = await Notification.requestPermission();

      if (permission !== "granted") {
        throw new Error("Izin notifikasi ditolak");
      }

      // Untuk GitHub Pages, gunakan localStorage approach
      if (this._isProduction() || this._isDevelopment()) {
        console.log("Using localStorage for subscription");
        localStorage.setItem(
          "pushSubscription",
          JSON.stringify({
            endpoint: "browser-storage-mode",
            keys: { p256dh: "local", auth: "storage" },
          })
        );
        this.isSubscribed = true;

        this._showLocalNotification(
          "🔔 Notifikasi Diaktifkan",
          "Anda akan menerima notifikasi cerita baru."
        );
        return true;
      }

      console.log("PushManager: Permission granted, subscribing...");

      if (this.subscription) {
        console.log("PushManager: Unsubscribing existing subscription...");
        await this.unsubscribe();
      }

      this.subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this._urlBase64ToUint8Array(
          this.VAPID_PUBLIC_KEY
        ),
      });

      this.isSubscribed = true;

      // Simpan ke localStorage untuk backup
      const subscriptionJSON = this.subscription.toJSON();
      localStorage.setItem(
        "pushSubscription",
        JSON.stringify(subscriptionJSON)
      );
      console.log("PushManager: Subscription created and saved");

      // Coba kirim ke server
      try {
        await this._sendSubscriptionToServer();
        console.log("PushManager: Subscription sent to server successfully");
      } catch (serverError) {
        console.warn("PushManager: Server subscription failed:", serverError);
      }

      this._showLocalNotification(
        "🔔 Notifikasi Diaktifkan",
        "Anda akan menerima notifikasi cerita baru."
      );

      return true;
    } catch (error) {
      console.error("PushManager: Subscribe error:", error);
      this._showLocalNotification(
        "❌ Gagal",
        "Tidak dapat mengaktifkan notifikasi: " + error.message
      );
      return false;
    }
  }

  async unsubscribe() {
    console.log("PushManager: Unsubscribing...");

    try {
      // Untuk semua environment, hapus dari localStorage
      console.log("PushManager: Removing from localStorage");
      localStorage.removeItem("pushSubscription");
      this.isSubscribed = false;

      // Untuk production non-GitHub Pages, unsubscribe dari push service
      if (
        !this._isProduction() &&
        !this._isDevelopment() &&
        this.subscription
      ) {
        console.log("PushManager: Unsubscribing from push service...");
        const success = await this.subscription.unsubscribe();

        if (!success) {
          console.warn("PushManager: Unsubscribe returned false");
        }
      }

      // Cleanup
      this.subscription = null;
      this.isSubscribed = false;

      console.log("PushManager: Local cleanup complete");

      // Coba hapus dari server
      try {
        await this._removeSubscriptionFromServer();
        console.log("PushManager: Server unsubscription successful");
      } catch (serverError) {
        console.warn("PushManager: Server unsubscription failed:", serverError);
      }

      this._showLocalNotification(
        "🔕 Notifikasi Dimatikan",
        "Anda tidak akan menerima notifikasi lagi."
      );

      return true;
    } catch (error) {
      console.error("PushManager: Unsubscribe error:", error);

      // Tetap lakukan cleanup meskipun ada error
      this.subscription = null;
      this.isSubscribed = false;
      localStorage.removeItem("pushSubscription");

      this._showLocalNotification(
        "⚠️ Peringatan",
        "Notifikasi dimatikan secara lokal."
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
      console.log("PushManager: No auth token, skipping server registration");
      return { success: false, error: "No auth token" };
    }

    try {
      const subscriptionJSON = this.subscription.toJSON();

      const requestBody = {
        endpoint: subscriptionJSON.endpoint,
        keys: {
          p256dh: subscriptionJSON.keys.p256dh,
          auth: subscriptionJSON.keys.auth,
        },
      };

      console.log("PushManager: Sending subscription to server");

      const response = await fetch(
        "https://story-api.dicoding.dev/v1/notifications/subscribe",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const result = await response.json();
      console.log("PushManager: Subscription saved on server");
      return { success: true, data: result };
    } catch (error) {
      console.warn(
        "PushManager: Failed to save subscription on server:",
        error
      );
      return { success: false, error: error.message };
    }
  }

  async _removeSubscriptionFromServer() {
    const token = localStorage.getItem("authToken");
    if (!token) {
      console.log("PushManager: No auth token, skipping server unsubscription");
      return { success: false, error: "No auth token" };
    }

    let endpoint;
    if (this.subscription) {
      const subscriptionJSON = this.subscription.toJSON();
      endpoint = subscriptionJSON.endpoint;
    } else {
      // Coba ambil dari localStorage
      const stored = localStorage.getItem("pushSubscription");
      if (stored) {
        const storedJSON = JSON.parse(stored);
        endpoint = storedJSON.endpoint;
      }
    }

    if (!endpoint) {
      console.log(
        "PushManager: No endpoint available for server unsubscription"
      );
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

      if (!response.ok) {
        if (response.status === 404) {
          console.log("PushManager: Subscription already removed from server");
          return { success: true };
        }
        return { success: false, error: `Server returned ${response.status}` };
      }

      console.log("PushManager: Subscription removed from server");
      return { success: true };
    } catch (error) {
      console.warn(
        "PushManager: Failed to remove subscription from server:",
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
        // Fallback ke alert
        alert(`${title}: ${body}`);
      }
    } else {
      // Fallback ke alert
      alert(`${title}: ${body}`);
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
    // Selalu cek status terbaru dari localStorage
    const stored = localStorage.getItem("pushSubscription");
    this.isSubscribed = !!stored;

    return {
      isSubscribed: this.isSubscribed,
      isSupported: this._isSupported(),
      permission: Notification.permission,
      isInitialized: this._isInitialized,
      environment: this._isProduction()
        ? "production"
        : this._isDevelopment()
        ? "development"
        : "other",
    };
  }
}

export const pushManager = new PushManager();
