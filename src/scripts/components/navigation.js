import { authService } from "../utils/auth.js";
import { pushManager } from "../utils/push-manager.js";

class Navigation {
  constructor() {
    this.navElement = null;
    this.updateNavigation = this.updateNavigation.bind(this);
    this._isPushManagerInitialized = false;
    this._isInitialized = false;
    this._pushManagerInitAttempted = false;
  }

  async init() {
    if (this._isInitialized) {
      console.log("📍 Navigation: Already initialized");
      return;
    }

    console.log("📍 Navigation: Initializing...");

    this.navElement = document.getElementById("nav-list");
    if (!this.navElement) {
      console.error("❌ Navigation: nav-list element not found");
      return;
    }

    this.updateNavigation();
    window.addEventListener("authchange", this.updateNavigation);

    this._isInitialized = true;
    console.log("✅ Navigation: Initialized successfully");
  }

  async initPushManager() {
    if (this._pushManagerInitAttempted) {
      console.log("📍 Navigation: PushManager init already attempted");
      return;
    }

    this._pushManagerInitAttempted = true;

    if (!authService.isLoggedIn()) {
      console.log("📍 Navigation: User not logged in, skipping PushManager");
      return;
    }

    console.log("📍 Navigation: Initializing PushManager...");

    try {
      // Tunggu sedikit untuk memastikan SW sudah ready
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const success = await pushManager.init();

      if (success) {
        this._isPushManagerInitialized = true;
        console.log("✅ Navigation: PushManager initialized successfully");
      } else {
        console.warn("⚠️ Navigation: PushManager init returned false");
      }
    } catch (error) {
      console.warn(
        "⚠️ Navigation: PushManager init failed (non-critical):",
        error
      );
    } finally {
      // Tetap update UI meskipun init gagal
      this._updateNotificationUI();
    }
  }

  updateNavigation() {
    if (!this.navElement) {
      console.error("❌ Navigation: navElement not available");
      return;
    }

    const isLoggedIn = authService.isLoggedIn();
    const userName = authService.getUserName();

    console.log("📍 Navigation: Updating, logged in:", isLoggedIn);

    if (isLoggedIn) {
      this.navElement.innerHTML = `
        <li><a href="#/beranda" class="nav-link">Beranda</a></li>
        <li><a href="#/about" class="nav-link">About</a></li>
        <li><a href="#/add" class="nav-link">Tambah Cerita</a></li>
        <li><a href="#/favorites" class="nav-link">Favorit</a></li>
        <li><a href="#/offline" class="nav-link">Offline</a></li>
        <li class="nav-user">
          <span class="user-name">Halo, ${userName}</span>
          <div class="notification-controls">
            <button id="enable-notifications" class="notification-toggle-btn" style="display: none;">
              🔔 Aktifkan Notifikasi
            </button>
            <button id="disable-notifications" class="notification-toggle-btn secondary" style="display: none;">
              🔕 Matikan Notifikasi
            </button>
          </div>
          <button id="logout-btn" class="logout-button">Keluar</button>
        </li>
      `;

      // Setup event listeners
      this._setupEventListeners();

      // Init PushManager setelah DOM updated
      setTimeout(() => this.initPushManager(), 100);
    } else {
      this.navElement.innerHTML = `
        <li><a href="#/about" class="nav-link">About</a></li>
        <li><a href="#/login" class="nav-link">Masuk</a></li>
        <li><a href="#/register" class="nav-link">Daftar</a></li>
      `;
    }
  }

  _setupEventListeners() {
    // Logout button
    const logoutBtn = document.getElementById("logout-btn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", this.handleLogout.bind(this));
    }

    // Notification controls
    this._setupNotificationControls();
  }

  _setupNotificationControls() {
    console.log("📍 Navigation: Setting up notification controls...");

    const enableBtn = document.getElementById("enable-notifications");
    const disableBtn = document.getElementById("disable-notifications");

    if (!enableBtn || !disableBtn) {
      console.warn("⚠️ Navigation: Notification buttons not found");
      return;
    }

    // Initial UI update
    this._updateNotificationUI();

    // Event listeners
    enableBtn.addEventListener("click", async () => {
      console.log("🔔 Navigation: Enable notifications clicked");
      await this._handleEnableNotifications();
    });

    disableBtn.addEventListener("click", async () => {
      console.log("🔕 Navigation: Disable notifications clicked");
      await this._handleDisableNotifications();
    });

    console.log("✅ Navigation: Notification controls setup complete");
  }

  async _handleEnableNotifications() {
    try {
      if (!this._isPushManagerInitialized) {
        console.log("🔄 Navigation: PushManager not ready, initializing...");
        await this.initPushManager();
      }

      const success = await pushManager.subscribe();
      if (success) {
        this._updateNotificationUI();
        this._showNotificationMessage(
          "🔔 Notifikasi berhasil diaktifkan",
          "success"
        );
      } else {
        this._showNotificationMessage(
          "❌ Gagal mengaktifkan notifikasi",
          "error"
        );
      }
    } catch (error) {
      console.error("❌ Navigation: Enable notifications error:", error);
      this._showNotificationMessage(
        "❌ Error mengaktifkan notifikasi",
        "error"
      );
    }
  }

  async _handleDisableNotifications() {
    try {
      if (!this._isPushManagerInitialized) {
        console.log("🔄 Navigation: PushManager not ready, initializing...");
        await this.initPushManager();
      }

      const success = await pushManager.unsubscribe();
      if (success) {
        this._updateNotificationUI();
        this._showNotificationMessage(
          "🔕 Notifikasi berhasil dimatikan",
          "success"
        );
      } else {
        this._showNotificationMessage("❌ Gagal mematikan notifikasi", "error");
      }
    } catch (error) {
      console.error("❌ Navigation: Disable notifications error:", error);
      this._showNotificationMessage("❌ Error mematikan notifikasi", "error");
    }
  }

  _updateNotificationUI() {
    const enableBtn = document.getElementById("enable-notifications");
    const disableBtn = document.getElementById("disable-notifications");

    if (!enableBtn || !disableBtn) {
      return;
    }

    const status = pushManager.getStatus();
    console.log("📍 Navigation: Updating UI with status:", status);

    if (status.isSubscribed) {
      enableBtn.style.display = "none";
      disableBtn.style.display = "inline-block";
    } else {
      enableBtn.style.display = "inline-block";
      disableBtn.style.display = "none";
    }

    // Handle unsupported case
    if (!status.isSupported) {
      enableBtn.style.display = "none";
      disableBtn.style.display = "none";
      this._showUnsupportedMessage();
    }
  }

  _showUnsupportedMessage() {
    const notificationControls = document.querySelector(
      ".notification-controls"
    );
    if (!notificationControls) return;

    // Hapus pesan lama jika ada
    const oldMessage = notificationControls.querySelector(
      ".unsupported-message"
    );
    if (oldMessage) {
      oldMessage.remove();
    }

    // Tambahkan pesan baru
    const unsupportedMsg = document.createElement("div");
    unsupportedMsg.className = "unsupported-message";
    unsupportedMsg.textContent = "Notifikasi tidak didukung";
    unsupportedMsg.style.cssText = `
      font-size: 12px;
      color: #666;
      margin-top: 5px;
      text-align: center;
    `;
    notificationControls.appendChild(unsupportedMsg);
  }

  _showNotificationMessage(message, type) {
    // Hapus pesan lama jika ada
    const oldMessages = document.querySelectorAll(".notification-message");
    oldMessages.forEach((msg) => msg.remove());

    // Buat pesan baru
    const messageElement = document.createElement("div");
    messageElement.className = "notification-message";
    messageElement.textContent = message;
    messageElement.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      background: ${type === "success" ? "#4CAF50" : "#f44336"};
      color: white;
      border-radius: 4px;
      z-index: 10000;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
      font-size: 14px;
    `;

    document.body.appendChild(messageElement);

    // Auto remove setelah 3 detik
    setTimeout(() => {
      if (messageElement.parentNode) {
        messageElement.parentNode.removeChild(messageElement);
      }
    }, 3000);
  }

  handleLogout() {
    if (confirm("Apakah Anda yakin ingin keluar?")) {
      authService.logout();
      window.dispatchEvent(new Event("authchange"));
      window.location.hash = "#/about";
    }
  }
}

export const navigation = new Navigation();
