import { idbManager } from "../../utils/idb-manager.js";
import { authService } from "../../utils/auth.js";

const FavoritesPage = {
  async render() {
    console.log("FavoritesPage: Checking authentication...");

    if (!authService.isLoggedIn()) {
      console.log("FavoritesPage: User not logged in");
      return `
        <section class="favorites-page">
          <h1>Akses Ditolak</h1>
          <p>Anda harus login untuk mengakses halaman ini.</p>
          <a href="#/login" class="link">Masuk</a>
        </section>
      `;
    }

    console.log("FavoritesPage: User is logged in, rendering favorites...");

    return `
      <section class="favorites-page" aria-labelledby="favorites-title">
        <h1 id="favorites-title" tabindex="0">❤️ Cerita Favorit Anda</h1>
        
        <div class="favorites-controls">
          <button id="clear-favorites" class="secondary-button">
            🗑️ Hapus Semua Favorit
          </button>
          <button id="export-favorites" class="secondary-button">
            📤 Ekspor Favorit
          </button>
        </div>
        
        <div id="favorites-list" class="story-list">
          <p id="loading-favorites">Memuat cerita favorit...</p>
        </div>
        
        <div id="no-favorites" style="display: none; text-align: center; padding: 40px;">
          <p>Belum ada cerita favorit.</p>
          <p>Kunjungi <a href="#/beranda" class="link">Beranda</a> untuk menambahkan cerita ke favorit.</p>
        </div>
      </section>
    `;
  },

  async afterRender() {
    console.log("FavoritesPage: afterRender called");

    if (!authService.isLoggedIn()) {
      console.log("FavoritesPage: User not logged in in afterRender");
      return;
    }

    console.log("FavoritesPage: Loading favorites...");
    await this._loadFavorites();
    this._setupControls();
  },
  async _loadFavorites() {
    const container = document.getElementById("favorites-list");
    const loadingElement = document.getElementById("loading-favorites");
    const noFavoritesElement = document.getElementById("no-favorites");

    try {
      const favorites = await idbManager.getFavorites();

      if (loadingElement) loadingElement.remove();

      if (favorites.length === 0) {
        container.style.display = "none";
        noFavoritesElement.style.display = "block";
        return;
      }

      container.innerHTML = favorites
        .map(
          (favorite) => `
        <article class="story-card favorite-card">
          <div class="story-header">
            <h3>${favorite.name || "Cerita Tanpa Judul"}</h3>
            <button class="remove-favorite-btn" data-story-id="${
              favorite.storyId
            }"
                    aria-label="Hapus dari favorit">
              ❌
            </button>
          </div>
          
          <img src="${favorite.photoUrl}" 
               alt="Foto cerita favorit" 
               class="story-photo"
               loading="lazy">
               
          <div class="story-content">
            <p>${favorite.description}</p>
            <div class="story-meta">
              <small>Ditambahkan: ${new Date(
                favorite.addedAt
              ).toLocaleDateString("id-ID")}</small>
            </div>
          </div>
        </article>
      `
        )
        .join("");

      this._setupFavoriteInteractions();
    } catch (error) {
      console.error("Error loading favorites:", error);
      container.innerHTML = "<p>Gagal memuat cerita favorit.</p>";
    }
  },

  _setupControls() {
    const clearBtn = document.getElementById("clear-favorites");
    const exportBtn = document.getElementById("export-favorites");

    clearBtn.addEventListener("click", () => this._clearAllFavorites());
    exportBtn.addEventListener("click", () => this._exportFavorites());
  },

  _setupFavoriteInteractions() {
    document.querySelectorAll(".remove-favorite-btn").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        const storyId = btn.dataset.storyId;
        await idbManager.removeFavorite(storyId);
        this._loadFavorites();
      });
    });
  },

  async _clearAllFavorites() {
    if (!confirm("Apakah Anda yakin ingin menghapus semua cerita favorit?")) {
      return;
    }

    try {
      const favorites = await idbManager.getFavorites();
      await Promise.all(
        favorites.map((fav) => idbManager.removeFavorite(fav.storyId))
      );

      this._loadFavorites();
      alert("Semua cerita favorit telah dihapus.");
    } catch (error) {
      console.error("Error clearing favorites:", error);
      alert("Gagal menghapus cerita favorit.");
    }
  },

  async _exportFavorites() {
    try {
      const favorites = await idbManager.getFavorites();

      if (favorites.length === 0) {
        alert("Tidak ada cerita favorit untuk diekspor.");
        return;
      }

      const exportData = {
        exportedAt: new Date().toISOString(),
        totalFavorites: favorites.length,
        favorites: favorites.map((fav) => ({
          title: fav.name,
          description: fav.description,
          photoUrl: fav.photoUrl,
          addedAt: fav.addedAt,
        })),
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: "application/json",
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cerita-favorit-${
        new Date().toISOString().split("T")[0]
      }.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      alert(`Berhasil mengekspor ${favorites.length} cerita favorit.`);
    } catch (error) {
      console.error("Error exporting favorites:", error);
      alert("Gagal mengekspor cerita favorit.");
    }
  },
};

export default FavoritesPage;
