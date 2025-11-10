import { authService } from "../utils/auth.js";
import { pushManager } from "../utils/push-manager.js";

class Navigation {
  constructor() {
    this.navElement = null;
    this.updateNavigation = this.updateNavigation.bind(this);
    this._isPushManagerInitialized = false;
    this._isInitialized = false;
  }

  async init() {
    if (this._isInitialized) {
      console.log("Navigation: Already initialized, skipping...");
      return;
    }

    this.navElement = document.getElementById("nav-list");
    this.updateNavigation();

    window.addEventListener("authchange", this.updateNavigation);

    if (authService.isLoggedIn()) {
      console.log("Navigation: Initializing push manager...");
      await this._initializePushManager();
    }

    this._isInitialized = true;
  }

  async _initializePushManager() {
    try {
      await pushManager.init();
      this._isPushManagerInitialized = true;
      console.log("Navigation: Push manager initialized successfully");

      this._updateNotificationUI();
    } catch (error) {
      console.error("Navigation: Failed to initialize push manager:", error);
      this._isPushManagerInitialized = false;
    }
  }

  updateNavigation() {
    if (!this.navElement) return;

    const isLoggedIn = authService.isLoggedIn();
    const userName = authService.getUserName();

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
          <button id="logout-btn" class="logout-button" aria-label="Keluar dari akun">Keluar</button>
        </li>
      `;

      const logoutBtn = document.getElementById("logout-btn");
      if (logoutBtn) {
        logoutBtn.addEventListener("click", this.handleLogout.bind(this));
      }

      // Setup notification controls
      this._setupNotificationControls();
    } else {
      this.navElement.innerHTML = `
        <li><a href="#/about" class="nav-link">About</a></li>
        <li><a href="#/login" class="nav-link">Masuk</a></li>
        <li><a href="#/register" class="nav-link">Daftar</a></li>
      `;
    }
  }

  _setupNotificationControls() {
    console.log("Navigation: Setting up notification controls...");

    const enableBtn = document.getElementById("enable-notifications");
    const disableBtn = document.getElementById("disable-notifications");

    if (enableBtn && disableBtn) {
      // Update UI berdasarkan status terkini
      this._updateNotificationUI();

      enableBtn.addEventListener("click", async () => {
        console.log("Enable notifications clicked");

        if (!this._isPushManagerInitialized) {
          console.log("Push manager not ready, initializing...");
          await pushManager.init();
          this._isPushManagerInitialized = true;
        }

        const success = await pushManager.subscribe();
        if (success) {
          this._updateNotificationUI();
          this._showNotificationMessage(
            "Notifikasi berhasil diaktifkan",
            "success"
          );
        } else {
          this._showNotificationMessage(
            "Gagal mengaktifkan notifikasi",
            "error"
          );
        }
      });

      disableBtn.addEventListener("click", async () => {
        console.log("Disable notifications clicked");

        if (!this._isPushManagerInitialized) {
          console.log("Push manager not ready, initializing...");
          await pushManager.init();
          this._isPushManagerInitialized = true;
        }

        const success = await pushManager.unsubscribe();
        if (success) {
          this._updateNotificationUI();
          this._showNotificationMessage(
            "Notifikasi berhasil dimatikan",
            "success"
          );
        } else {
          this._showNotificationMessage("Gagal mematikan notifikasi", "error");
        }
      });
    }

    console.log("Navigation: Notification controls setup complete");
  }

  _showNotificationMessage(message, type) {
    // Buat temporary message element
    const messageElement = document.createElement("div");
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
    `;

    document.body.appendChild(messageElement);
    setTimeout(() => {
      if (messageElement.parentNode) {
        messageElement.parentNode.removeChild(messageElement);
      }
    }, 3000);
  }

  _updateNotificationUI() {
    const enableBtn = document.getElementById("enable-notifications");
    const disableBtn = document.getElementById("disable-notifications");

    if (!enableBtn || !disableBtn) return;

    // Dapatkan status terkini
    const status = pushManager.getStatus();
    console.log("Navigation: Current notification status:", status);

    // Update UI berdasarkan status
    if (status.isSubscribed) {
      enableBtn.style.display = "none";
      disableBtn.style.display = "inline-block";
    } else {
      enableBtn.style.display = "inline-block";
      disableBtn.style.display = "none";
    }

    // Sembunyikan tombol jika notifikasi tidak didukung
    if (!status.isSupported) {
      enableBtn.style.display = "none";
      disableBtn.style.display = "none";

      // Tambahkan pesan bahwa notifikasi tidak didukung
      const notificationControls = document.querySelector(
        ".notification-controls"
      );
      if (
        notificationControls &&
        !notificationControls.querySelector(".unsupported-message")
      ) {
        const unsupportedMsg = document.createElement("div");
        unsupportedMsg.className = "unsupported-message";
        unsupportedMsg.textContent = "Notifikasi tidak didukung di browser ini";
        unsupportedMsg.style.cssText = `
          font-size: 12px;
          color: #666;
          margin-top: 5px;
          text-align: center;
        `;
        notificationControls.appendChild(unsupportedMsg);
      }
    }
  }

  handleLogout() {
    if (confirm("Apakah Anda yakin ingin keluar?")) {
      authService.logout();
      window.dispatchEvent(new Event("authchange"));
      window.location.hash = "#/about";

      const mainContent = document.getElementById("main-content");
      if (mainContent) {
        mainContent.innerHTML = `
          <div style="text-align: center; padding: 40px;">
            <h1>Berhasil Keluar</h1>
            <p>Anda telah berhasil keluar dari akun.</p>
            <p>Mengarahkan ke halaman about...</p>
          </div>
        `;
      }
    }
  }
}

export const navigation = new Navigation();
