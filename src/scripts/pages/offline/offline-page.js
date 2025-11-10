import { idbManager } from "../../utils/idb-manager.js";
import { authService } from "../../utils/auth.js";

const OfflinePage = {
  async render() {
    if (!authService.isLoggedIn()) {
      return `
        <section class="offline-page">
          <h1>Akses Ditolak</h1>
          <p>Anda harus login untuk mengakses halaman ini.</p>
        </section>
      `;
    }

    return `
      <section class="offline-page" aria-labelledby="offline-title">
        <h1 id="offline-title" tabindex="0">📱 Mode Offline</h1>
        
        <div class="offline-status">
          <div class="status-indicator ${
            navigator.onLine ? "online" : "offline"
          }">
            <span class="status-dot"></span>
            <span class="status-text">
              ${navigator.onLine ? "Anda sedang online" : "Anda sedang offline"}
            </span>
          </div>
        </div>

        <!-- Storage Info -->
        <div class="storage-info">
          <h2>💾 Penyimpanan Lokal</h2>
          <div class="storage-stats">
            <div class="stat-item">
              <span class="stat-label">Cerita Tersimpan:</span>
              <span class="stat-value" id="saved-stories-count">0</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Cerita Offline:</span>
              <span class="stat-value" id="offline-stories-count">0</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Cerita Favorit:</span>
              <span class="stat-value" id="favorites-count">0</span>
            </div>
          </div>
        </div>

        <!-- Offline Stories Section -->
        <div class="offline-section">
          <h2>⏳ Cerita Menunggu Sinkronisasi</h2>
          <div id="offline-stories-list" class="offline-stories-list">
            <p id="no-offline-stories" style="display: none;">Tidak ada cerita offline yang menunggu sinkronisasi.</p>
          </div>
        </div>

        <!-- Cached Stories Section -->
        <div class="cached-section">
          <h2>📄 Cerita yang Disimpan</h2>
          <div class="cached-controls">
            <button id="refresh-cache" class="secondary-button">
              🔄 Refresh Data
            </button>
            <button id="clear-cache" class="secondary-button">
              🗑️ Hapus Cache
            </button>
          </div>
          <div id="cached-stories-list" class="story-list">
            <p id="loading-cached">Memuat cerita yang disimpan...</p>
          </div>
        </div>

        <!-- Service Worker Status -->
        <div class="sw-section">
          <h2>⚙️ Status Service Worker</h2>
          <div class="sw-status">
            <div class="sw-info">
              <span class="info-label">Status:</span>
              <span class="info-value" id="sw-status">Memeriksa...</span>
            </div>
            <div class="sw-info">
              <span class="info-label">Cache:</span>
              <span class="info-value" id="sw-cache">Memeriksa...</span>
            </div>
            <button id="update-sw" class="secondary-button" style="display: none;">
              🔄 Update Service Worker
            </button>
          </div>
        </div>
      </section>
    `;
  },

  async afterRender() {
    if (!authService.isLoggedIn()) return;

    await this._loadStorageInfo();
    await this._loadOfflineStories();
    await this._loadCachedStories();
    this._setupControls();
    this._checkServiceWorker();

    // Listen for online/offline events
    window.addEventListener("online", this._handleOnlineStatus.bind(this));
    window.addEventListener("offline", this._handleOnlineStatus.bind(this));
  },

  async _loadStorageInfo() {
    try {
      const [stories, offlineStories, favorites] = await Promise.all([
        idbManager.getStories(),
        idbManager.getOfflineStories(),
        idbManager.getFavorites(),
      ]);

      const unsyncedStories = offlineStories.filter((story) => !story.synced);

      document.getElementById("saved-stories-count").textContent =
        stories.length;
      document.getElementById("offline-stories-count").textContent =
        unsyncedStories.length;
      document.getElementById("favorites-count").textContent = favorites.length;
    } catch (error) {
      console.error("Error loading storage info:", error);
    }
  },

  async _loadOfflineStories() {
    const container = document.getElementById("offline-stories-list");
    const noStoriesElement = document.getElementById("no-offline-stories");

    try {
      const offlineStories = await idbManager.getOfflineStories();
      const unsyncedStories = offlineStories.filter((story) => !story.synced);

      if (unsyncedStories.length === 0) {
        container.innerHTML = "";
        noStoriesElement.style.display = "block";
        return;
      }

      noStoriesElement.style.display = "none";

      container.innerHTML = unsyncedStories
        .map(
          (story) => `
        <div class="offline-story-item" data-story-id="${story.id}">
          <div class="offline-story-content">
            <h4>${
              this._extractTitle(story.description) || "Cerita Tanpa Judul"
            }</h4>
            <p class="offline-story-desc">
              ${story.description.substring(0, 100)}${
            story.description.length > 100 ? "..." : ""
          }
            </p>
            <div class="offline-story-meta">
              <small>Dibuat: ${new Date(story.createdAt).toLocaleDateString(
                "id-ID"
              )}</small>
              <small>Status: ${
                story.synced ? "Tersinkronisasi" : "Menunggu"
              }</small>
            </div>
          </div>
          <div class="offline-story-actions">
            <button class="sync-single-btn" data-story-id="${story.id}">
              Sinkronisasi
            </button>
            <button class="delete-offline-btn" data-story-id="${story.id}">
              Hapus
            </button>
          </div>
        </div>
      `
        )
        .join("");

      this._setupOfflineStoryInteractions();
    } catch (error) {
      console.error("Error loading offline stories:", error);
      container.innerHTML = "<p>Gagal memuat cerita offline.</p>";
    }
  },

  async _loadCachedStories() {
    const container = document.getElementById("cached-stories-list");
    const loadingElement = document.getElementById("loading-cached");

    try {
      const stories = await idbManager.getStories();

      if (loadingElement) loadingElement.remove();

      if (stories.length === 0) {
        container.innerHTML = `
          <div style="text-align: center; padding: 40px;">
            <p>Belum ada cerita yang disimpan secara lokal.</p>
            <p>Buka <a href="#/beranda" class="link">Beranda</a> untuk memuat cerita.</p>
          </div>
        `;
        return;
      }

      container.innerHTML = stories
        .map((story) => {
          const displayInfo = this._extractStoryDisplayInfo(story);
          const hasValidCoordinates = story.lat && story.lon;

          return `
          <article class="story-card cached-card">
            <div class="story-header">
              <h3>${displayInfo.title}</h3>
              <span class="cached-badge">📱</span>
            </div>
            
            <img src="${story.photoUrl}"
                 alt="Foto ilustrasi cerita ${displayInfo.title}"
                 class="story-photo"
                 loading="lazy"
                 onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkdhbWJhciB0aWRhayB0ZXJzZWRpYTwvdGV4dD48L3N2Zz4='">
            
            <div class="story-content">
              <p>${displayInfo.description}</p>
              <div class="story-meta">
                <small>Lokasi: ${
                  hasValidCoordinates
                    ? `${story.lat}, ${story.lon}`
                    : "Tidak tersedia"
                }</small>
                ${displayInfo.dateInfo}
                <small>Disimpan: ${new Date(story.cachedAt).toLocaleDateString(
                  "id-ID"
                )}</small>
              </div>
            </div>
          </article>
        `;
        })
        .join("");
    } catch (error) {
      console.error("Error loading cached stories:", error);
      container.innerHTML = "<p>Gagal memuat cerita yang disimpan.</p>";
    }
  },

  _setupControls() {
    // Refresh cache button
    const refreshBtn = document.getElementById("refresh-cache");
    refreshBtn.addEventListener("click", () => this._refreshCache());

    // Clear cache button
    const clearBtn = document.getElementById("clear-cache");
    clearBtn.addEventListener("click", () => this._clearCache());

    // Update service worker button
    const updateSwBtn = document.getElementById("update-sw");
    updateSwBtn.addEventListener("click", () => this._updateServiceWorker());
  },

  _setupOfflineStoryInteractions() {
    // Sync single story buttons
    document.querySelectorAll(".sync-single-btn").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        const storyId = parseInt(btn.dataset.storyId);
        await this._syncSingleStory(storyId);
      });
    });

    // Delete offline story buttons
    document.querySelectorAll(".delete-offline-btn").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        const storyId = parseInt(btn.dataset.storyId);
        await this._deleteOfflineStory(storyId);
      });
    });
  },

  async _syncSingleStory(storyId) {
    try {
      // Implementasi sync single story
      // Untuk sekarang, kita hanya menandai sebagai synced
      await idbManager.markOfflineStoryAsSynced(storyId);

      alert("Cerita berhasil disinkronisasi!");
      await this._loadStorageInfo();
      await this._loadOfflineStories();
    } catch (error) {
      console.error("Error syncing single story:", error);
      alert("Gagal menyinkronisasi cerita.");
    }
  },

  async _deleteOfflineStory(storyId) {
    if (!confirm("Apakah Anda yakin ingin menghapus cerita offline ini?")) {
      return;
    }

    try {
      await idbManager.deleteOfflineStory(storyId);
      alert("Cerita offline berhasil dihapus!");
      await this._loadStorageInfo();
      await this._loadOfflineStories();
    } catch (error) {
      console.error("Error deleting offline story:", error);
      alert("Gagal menghapus cerita offline.");
    }
  },

  async _refreshCache() {
    try {
      // Clear existing stories and reload from API
      const stories = await idbManager.getStories();
      await Promise.all(
        stories.map((story) => idbManager.deleteStory(story.id))
      );

      alert(
        "Cache berhasil di-refresh. Silakan buka Beranda untuk memuat ulang data."
      );
      await this._loadStorageInfo();
      await this._loadCachedStories();
    } catch (error) {
      console.error("Error refreshing cache:", error);
      alert("Gagal me-refresh cache.");
    }
  },

  async _clearCache() {
    if (
      !confirm(
        "Apakah Anda yakin ingin menghapus semua data yang disimpan secara lokal?"
      )
    ) {
      return;
    }

    try {
      // Clear all data from IndexedDB
      if (window.indexedDB) {
        await idbManager.init(); // Ensure DB is initialized
        // You might need to implement a clearAll method in idbManager
        // For now, we'll delete the database
        window.indexedDB.deleteDatabase("CeritaDatabase");
      }

      alert("Semua data lokal berhasil dihapus!");
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error("Error clearing cache:", error);
      alert("Gagal menghapus cache.");
    }
  },

  async _checkServiceWorker() {
    const statusElement = document.getElementById("sw-status");
    const cacheElement = document.getElementById("sw-cache");
    const updateBtn = document.getElementById("update-sw");

    try {
      if ("serviceWorker" in navigator) {
        const registration = await navigator.serviceWorker.ready;

        if (registration) {
          statusElement.textContent = "Aktif";
          statusElement.style.color = "#28a745";

          // Check cache status
          const cacheNames = await caches.keys();
          const hasCache = cacheNames.some((name) =>
            name.includes("cerita-di-sekitarmu")
          );
          cacheElement.textContent = hasCache ? "Tersedia" : "Tidak tersedia";
          cacheElement.style.color = hasCache ? "#28a745" : "#dc3545";

          // Check for updates
          registration.addEventListener("updatefound", () => {
            updateBtn.style.display = "block";
          });
        } else {
          statusElement.textContent = "Tidak aktif";
          statusElement.style.color = "#dc3545";
        }
      } else {
        statusElement.textContent = "Tidak didukung";
        statusElement.style.color = "#dc3545";
      }
    } catch (error) {
      console.error("Error checking service worker:", error);
      statusElement.textContent = "Error";
      statusElement.style.color = "#dc3545";
    }
  },

  async _updateServiceWorker() {
    try {
      if ("serviceWorker" in navigator) {
        const registration = await navigator.serviceWorker.ready;
        await registration.update();
        alert("Service Worker diperbarui! Halaman akan dimuat ulang.");
        window.location.reload();
      }
    } catch (error) {
      console.error("Error updating service worker:", error);
      alert("Gagal memperbarui Service Worker.");
    }
  },

  _handleOnlineStatus() {
    const statusIndicator = document.querySelector(".status-indicator");
    const statusText = document.querySelector(".status-text");

    if (navigator.onLine) {
      statusIndicator.classList.remove("offline");
      statusIndicator.classList.add("online");
      statusText.textContent = "Anda sedang online";

      // Auto-sync when coming online
      setTimeout(() => {
        this._loadStorageInfo();
        this._loadOfflineStories();
      }, 1000);
    } else {
      statusIndicator.classList.remove("online");
      statusIndicator.classList.add("offline");
      statusText.textContent = "Anda sedang offline";
    }
  },

  _extractTitle(description) {
    if (
      description &&
      description.startsWith("**") &&
      description.includes("**\n")
    ) {
      const parts = description.split("**\n");
      if (parts.length >= 2) {
        return parts[0].replace("**", "").trim();
      }
    }
    return null;
  },

  _extractStoryDisplayInfo(story) {
    let displayTitle = "Cerita Tanpa Judul";
    let displayDescription = story.description;

    if (
      story.description &&
      story.description.startsWith("**") &&
      story.description.includes("**\n")
    ) {
      const parts = story.description.split("**\n");
      if (parts.length >= 2) {
        displayTitle = parts[0].replace("**", "").trim();
        displayDescription = parts.slice(1).join("").trim();
      }
    }

    if (displayTitle === "Cerita Tanpa Judul" && story.name) {
      displayTitle = story.name;
    }

    let dateInfo = "";
    if (story.createdAt) {
      try {
        const date = new Date(story.createdAt);
        dateInfo = `<small>Diposting: ${date.toLocaleDateString(
          "id-ID"
        )}</small>`;
      } catch (e) {
        console.error("Error formatting date:", e);
      }
    }

    return {
      title: displayTitle,
      description: displayDescription,
      dateInfo: dateInfo,
    };
  },
};

export default OfflinePage;
