class IDBManager {
  constructor() {
    this.dbName = "CeritaDatabase";
    this.version = 9;
    this.db = null;
    this._isOpening = false;
    this._openPromise = null;
  }

  async init() {
    if (this._isOpening) {
      return this._openPromise;
    }

    this._isOpening = true;

    this._openPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        this._isOpening = false;
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        this._isOpening = false;

        this.db.onerror = (event) => {
          console.error("Database error:", event.target.error);
        };

        this.db.onclose = () => {
          console.log("Database connection closed");
          this.db = null;
          this._isOpening = false;
        };

        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        const oldVersion = event.oldVersion;

        console.log(
          `🔄 Database upgrading from version ${oldVersion} to ${this.version}`
        );

        // Migration logic berdasarkan versi lama
        if (oldVersion < 1) {
          // Versi 1: Buat stores awal
          const storyStore = db.createObjectStore("stories", { keyPath: "id" });
          storyStore.createIndex("createdAt", "createdAt", { unique: false });
          storyStore.createIndex("hasLocation", "hasLocation", {
            unique: false,
          });
          storyStore.createIndex("name", "name", { unique: false });
          storyStore.createIndex("description", "description", {
            unique: false,
          });

          const offlineStore = db.createObjectStore("offlineStories", {
            keyPath: "id",
            autoIncrement: true,
          });
          offlineStore.createIndex("createdAt", "createdAt", { unique: false });
          offlineStore.createIndex("synced", "synced", { unique: false });

          const favoriteStore = db.createObjectStore("favorites", {
            keyPath: "storyId",
          });
          favoriteStore.createIndex("addedAt", "addedAt", { unique: false });
        }

        // Pastikan index untuk synced ada
        if (oldVersion < 9) {
          const transaction = event.target.transaction;
          const offlineStore = transaction.objectStore("offlineStories");
          if (!offlineStore.indexNames.contains("synced")) {
            offlineStore.createIndex("synced", "synced", { unique: false });
          }
        }
      };

      request.onblocked = () => {
        console.log("⚠️ Database upgrade blocked - close other tabs");
        if (this.db) {
          this.db.close();
        }
      };
    });

    return this._openPromise;
  }

  async _ensureDB() {
    if (!this.db) {
      await this.init();
      return;
    }

    try {
      // Test connection
      const transaction = this.db.transaction([], "readonly");
      await new Promise((resolve, reject) => {
        transaction.oncomplete = resolve;
        transaction.onerror = reject;
      });
    } catch (error) {
      console.log("Database connection lost, reinitializing...");
      this.db = null;
      await this.init();
    }
  }

  // CRUD Operations untuk Stories
  async saveStories(stories) {
    try {
      await this._ensureDB();

      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction(["stories"], "readwrite");
        const store = transaction.objectStore("stories");

        store.clear();

        stories.forEach((story) => {
          store.put({
            ...story,
            hasLocation: !!(story.lat && story.lon),
            cachedAt: new Date().toISOString(),
          });
        });

        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
    } catch (error) {
      console.error("Error saving stories:", error);
      throw error;
    }
  }

  async getStories() {
    try {
      await this._ensureDB();

      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction(["stories"], "readonly");
        const store = transaction.objectStore("stories");
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error("Error getting stories:", error);
      return [];
    }
  }

  async deleteStory(storyId) {
    try {
      await this._ensureDB();

      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction(["stories"], "readwrite");
        const store = transaction.objectStore("stories");
        const request = store.delete(storyId);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error("Error deleting story:", error);
      throw error;
    }
  }

  // Offline Stories Management
  async saveOfflineStory(storyData) {
    try {
      await this._ensureDB();

      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction(
          ["offlineStories"],
          "readwrite"
        );
        const store = transaction.objectStore("offlineStories");

        const offlineStory = {
          ...storyData,
          id: Date.now(),
          createdAt: new Date().toISOString(),
          synced: false,
        };

        const request = store.add(offlineStory);

        request.onsuccess = () => resolve(offlineStory.id);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error("Error saving offline story:", error);
      throw error;
    }
  }

  async getOfflineStories() {
    try {
      await this._ensureDB();

      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction(["offlineStories"], "readonly");
        const store = transaction.objectStore("offlineStories");
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error("Error getting offline stories:", error);
      return [];
    }
  }

  async deleteOfflineStory(storyId) {
    try {
      await this._ensureDB();

      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction(
          ["offlineStories"],
          "readwrite"
        );
        const store = transaction.objectStore("offlineStories");
        const request = store.delete(storyId);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error("Error deleting offline story:", error);
      throw error;
    }
  }

  async markOfflineStoryAsSynced(storyId) {
    try {
      await this._ensureDB();

      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction(
          ["offlineStories"],
          "readwrite"
        );
        const store = transaction.objectStore("offlineStories");
        const getRequest = store.get(storyId);

        getRequest.onsuccess = () => {
          const story = getRequest.result;
          if (story) {
            // Pastikan storyId bertipe number
            const numericStoryId =
              typeof storyId === "string" ? parseInt(storyId) : storyId;

            story.synced = true;
            story.id = numericStoryId; // Pastikan ID konsisten

            const putRequest = store.put(story);
            putRequest.onsuccess = () => {
              console.log(`Story ${storyId} marked as synced`);
              resolve();
            };
            putRequest.onerror = (error) => {
              console.error(`Error marking story ${storyId} as synced:`, error);
              reject(error);
            };
          } else {
            console.warn(`Story ${storyId} not found for marking as synced`);
            resolve(); // Still resolve jika story tidak ditemukan
          }
        };

        getRequest.onerror = (error) => {
          console.error(`Error getting story ${storyId}:`, error);
          reject(error);
        };
      });
    } catch (error) {
      console.error("Error marking story as synced:", error);
      throw error;
    }
  }

  // PERBAIKAN: Method getUnsyncedStories yang aman
  async getUnsyncedStories() {
    try {
      await this._ensureDB();

      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction(["offlineStories"], "readonly");
        const store = transaction.objectStore("offlineStories");
        const request = store.getAll();

        request.onsuccess = () => {
          try {
            const allStories = request.result || [];
            console.log("Total offline stories:", allStories.length);

            // Filter stories yang belum sync
            const unsyncedStories = allStories.filter((story) => {
              return story.synced === false || story.synced === undefined;
            });

            console.log("Unsynced stories:", unsyncedStories.length);
            resolve(unsyncedStories);
          } catch (filterError) {
            console.error("Error filtering stories:", filterError);
            resolve([]);
          }
        };

        request.onerror = (error) => {
          console.error("Error getting offline stories:", error);
          reject(error);
        };
      });
    } catch (error) {
      console.error("Error in getUnsyncedStories:", error);
      return [];
    }
  }

  // PERBAIKAN: Method syncOfflineStories yang robust
  async syncOfflineStories() {
    try {
      console.log("Starting offline stories sync...");
      const unsyncedStories = await this.getUnsyncedStories();

      console.log(`Found ${unsyncedStories.length} stories to sync`);

      const syncResults = {
        successful: [],
        failed: [],
      };

      // Jika tidak ada yang perlu sync, return langsung
      if (unsyncedStories.length === 0) {
        console.log("No stories to sync");
        return syncResults;
      }

      // Process each story
      for (const story of unsyncedStories) {
        try {
          console.log(`Syncing story ${story.id}...`);

          // Simulasi API call
          await new Promise((resolve, reject) => {
            setTimeout(() => {
              // 80% success rate untuk simulasi
              if (Math.random() > 0.2) {
                resolve({ success: true, id: story.id });
              } else {
                reject(new Error("Sync simulation failed"));
              }
            }, 500);
          });

          // Mark as synced jika berhasil
          await this.markOfflineStoryAsSynced(story.id);
          syncResults.successful.push(story.id);
          console.log(`Story ${story.id} synced successfully`);
        } catch (error) {
          console.error(`Failed to sync story ${story.id}:`, error);
          syncResults.failed.push({
            id: story.id,
            error: error.message,
          });
        }
      }

      console.log("Sync completed:", syncResults);
      return syncResults;
    } catch (error) {
      console.error("Error in syncOfflineStories:", error);
      return { successful: [], failed: [] };
    }
  }

  // Favorites Management
  async addFavorite(storyId, storyData) {
    try {
      await this._ensureDB();

      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction(["favorites"], "readwrite");
        const store = transaction.objectStore("favorites");

        const favorite = {
          storyId,
          ...storyData,
          addedAt: new Date().toISOString(),
        };

        const request = store.add(favorite);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error("Error adding favorite:", error);
      throw error;
    }
  }

  async removeFavorite(storyId) {
    try {
      await this._ensureDB();

      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction(["favorites"], "readwrite");
        const store = transaction.objectStore("favorites");
        const request = store.delete(storyId);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error("Error removing favorite:", error);
      throw error;
    }
  }

  async getFavorites() {
    try {
      await this._ensureDB();

      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction(["favorites"], "readonly");
        const store = transaction.objectStore("favorites");
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error("Error getting favorites:", error);
      return [];
    }
  }

  async isFavorite(storyId) {
    try {
      await this._ensureDB();

      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction(["favorites"], "readonly");
        const store = transaction.objectStore("favorites");
        const request = store.get(storyId);

        request.onsuccess = () => resolve(!!request.result);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error("Error checking favorite:", error);
      return false;
    }
  }

  // PERBAIKAN: Search dengan hasil terurut
  async searchStories(query) {
    try {
      console.log("🔍 IDBManager: Searching for:", query);

      if (!query || query.trim() === "") {
        const allStories = await this.getStories();
        // Urutkan dari terbaru ke terlama
        return allStories.sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        );
      }

      const stories = await this.getStories();
      const searchTerm = query.toLowerCase().trim();

      console.log("🔍 IDBManager: Total stories to search:", stories.length);

      // Filter stories berdasarkan pencarian
      const filteredStories = stories.filter((story) => {
        const storyName = story.name?.toLowerCase() || "";
        const storyDesc = story.description?.toLowerCase() || "";

        return storyName.includes(searchTerm) || storyDesc.includes(searchTerm);
      });

      // Urutkan hasil pencarian dari terbaru ke terlama
      const sortedResults = filteredStories.sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );

      console.log("🔍 IDBManager: Search results:", sortedResults.length);
      return sortedResults;
    } catch (error) {
      console.error("❌ IDBManager: Search error:", error);
      return [];
    }
  }

  // Advanced filtering
  async filterStories(filters = {}) {
    try {
      console.log("🔍 IDBManager: Applying filters:", filters);

      let stories = await this.getStories();
      console.log(
        "🔍 IDBManager: Total stories before filtering:",
        stories.length
      );

      if (filters.hasLocation) {
        stories = stories.filter((story) => story.lat && story.lon);
        console.log("🔍 IDBManager: After location filter:", stories.length);
      }

      if (filters.dateRange) {
        stories = stories.filter((story) => {
          const storyDate = new Date(story.createdAt);
          return (
            storyDate >= filters.dateRange.start &&
            storyDate <= filters.dateRange.end
          );
        });
        console.log("🔍 IDBManager: After date filter:", stories.length);
      }

      if (filters.favoritesOnly) {
        const favorites = await this.getFavorites();
        const favoriteIds = favorites.map((fav) => fav.storyId);
        stories = stories.filter((story) => favoriteIds.includes(story.id));
        console.log("🔍 IDBManager: After favorites filter:", stories.length);
      }

      return stories;
    } catch (error) {
      console.error("Error filtering stories:", error);
      return [];
    }
  }

  // Advanced sorting
  async sortStories(
    sortBy = "createdAt",
    order = "desc",
    secondarySort = null
  ) {
    try {
      console.log(`🔍 IDBManager: Sorting by ${sortBy} ${order}`);

      const stories = await this.getStories();

      return stories.sort((a, b) => {
        let aVal = a[sortBy];
        let bVal = b[sortBy];

        if (sortBy === "createdAt") {
          aVal = new Date(aVal);
          bVal = new Date(bVal);
        }

        let primaryResult = 0;
        if (aVal < bVal) primaryResult = -1;
        else if (aVal > bVal) primaryResult = 1;
        else primaryResult = 0;

        if (order === "desc") {
          primaryResult = -primaryResult;
        }

        if (primaryResult === 0 && secondarySort) {
          const aSec = a[secondarySort.field];
          const bSec = b[secondarySort.field];
          let secResult = 0;
          if (aSec < bSec) secResult = -1;
          else if (aSec > bSec) secResult = 1;

          return secondarySort.order === "desc" ? -secResult : secResult;
        }

        return primaryResult;
      });
    } catch (error) {
      console.error("Error sorting stories:", error);
      return [];
    }
  }

  // Method untuk mendapatkan stats
  async getStats() {
    try {
      const stories = await this.getStories();
      const offlineStories = await this.getOfflineStories();
      const favorites = await this.getFavorites();

      return {
        totalStories: stories.length,
        storiesWithLocation: stories.filter((story) => story.lat && story.lon)
          .length,
        offlineStories: offlineStories.length,
        unsyncedStories: offlineStories.filter((story) => !story.synced).length,
        favorites: favorites.length,
      };
    } catch (error) {
      console.error("Error getting stats:", error);
      return {
        totalStories: 0,
        storiesWithLocation: 0,
        offlineStories: 0,
        unsyncedStories: 0,
        favorites: 0,
      };
    }
  }

  async getStoryById(storyId) {
    try {
      await this._ensureDB();

      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction(["stories"], "readonly");
        const store = transaction.objectStore("stories");
        const request = store.get(storyId);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error("Error getting story by ID:", error);
      return null;
    }
  }

  // Pagination support
  async getStoriesPaginated(page = 1, pageSize = 10) {
    try {
      const allStories = await this.getStories();
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;

      return {
        stories: allStories.slice(startIndex, endIndex),
        total: allStories.length,
        page,
        pageSize,
        totalPages: Math.ceil(allStories.length / pageSize),
      };
    } catch (error) {
      console.error("Error getting paginated stories:", error);
      return {
        stories: [],
        total: 0,
        page: 1,
        pageSize: 10,
        totalPages: 0,
      };
    }
  }

  async clearDatabase() {
    try {
      await this._ensureDB();

      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction(
          ["stories", "offlineStories", "favorites"],
          "readwrite"
        );

        transaction.objectStore("stories").clear();
        transaction.objectStore("offlineStories").clear();
        transaction.objectStore("favorites").clear();

        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
    } catch (error) {
      console.error("Error clearing database:", error);
      throw error;
    }
  }
}

export const idbManager = new IDBManager();
