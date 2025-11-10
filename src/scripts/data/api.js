import { authService } from "../utils/auth.js";

const API_BASE = "https://story-api.dicoding.dev/v1";

function getAuthToken() {
  return authService.getToken();
}

/**
 * Fetch stories dengan token dari auth service
 * @returns {Promise<Array>}
 */
export async function fetchStoriesWithToken() {
  const token = getAuthToken();

  if (!token) {
    console.log("User belum login, tidak bisa mengambil data stories");
    return [];
  }

  try {
    console.log("🔍 DEBUG - Fetching stories from API...");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(`${API_BASE}/stories`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const json = await response.json();

    console.log("🔍 DEBUG - Full API Response:", json);

    if (json.error || !json.listStory) {
      console.error("API returned error:", json.message);
      return [];
    }

    // Perbaiki URL foto jika diperlukan
    const storiesWithCorrectedPhotos = json.listStory.map((story) => {
      let correctedPhotoUrl = story.photoUrl;

      // Jika URL foto tidak valid, gunakan placeholder
      if (!story.photoUrl || !story.photoUrl.startsWith("http")) {
        correctedPhotoUrl =
          "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkdhbWJhciB0aWRhayB0ZXJzZWRpYTwvdGV4dD48L3N2Zz4=";
      }

      return {
        id: story.id,
        name: story.name,
        description: story.description,
        photoUrl: correctedPhotoUrl,
        lat: story.lat,
        lon: story.lon,
        createdAt: story.createdAt,
      };
    });

    return storiesWithCorrectedPhotos;
  } catch (error) {
    console.error("❌ Error fetching stories:", error);

    if (error.name === "AbortError") {
      console.error("Request timeout - API server mungkin lambat");
    } else if (
      error.name === "TypeError" &&
      error.message.includes("Failed to fetch")
    ) {
      console.error("Network error - Tidak bisa connect ke API server");
    }

    return [];
  }
}

export async function postStory({ description, photo, lat, lon }) {
  const token = authService.getToken();

  if (!token) {
    return {
      error: true,
      message: "Anda harus login untuk menambah cerita.",
    };
  }

  const formData = new FormData();
  formData.append("description", description);
  formData.append("photo", photo);
  if (lat) formData.append("lat", lat);
  if (lon) formData.append("lon", lon);

  try {
    console.log("🔍 DEBUG - Mulai mengirim cerita ke API...");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    const response = await fetch(`${API_BASE}/stories`, {
      method: "POST",
      body: formData,
      headers: {
        Authorization: `Bearer ${token}`,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    console.log("🔍 DEBUG - Response status:", response.status);

    const json = await response.json();
    console.log("🔍 DEBUG - Response data:", json);

    if (!response.ok || json.error) {
      return {
        error: true,
        message:
          json.message || `Error ${response.status}: ${response.statusText}`,
      };
    }

    console.log("🔍 DEBUG - Cerita berhasil dikirim:", json);
    return json;
  } catch (error) {
    console.error("🔍 DEBUG - Error detail:", error);

    if (error.name === "AbortError") {
      return {
        error: true,
        message: "Request timeout - Server terlalu lama merespon.",
      };
    }

    if (
      error.name === "TypeError" &&
      error.message.includes("Failed to fetch")
    ) {
      return {
        error: true,
        message: "Gagal terhubung ke server. Periksa koneksi internet Anda.",
      };
    }

    return {
      error: true,
      message: `Gagal mengirim data: ${error.message}`,
    };
  }
}

export async function loginUser({ email, password }) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(`${API_BASE}/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const data = await response.json();

    if (!response.ok) {
      return {
        error: true,
        message: data.message || "Login gagal",
      };
    }

    return {
      error: false,
      data: data,
    };
  } catch (error) {
    if (error.name === "AbortError") {
      return {
        error: true,
        message: "Request timeout - Server terlalu lama merespon.",
      };
    }

    return {
      error: true,
      message: "Terjadi kesalahan jaringan",
    };
  }
}

export async function registerUser({ name, email, password }) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(`${API_BASE}/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name, email, password }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const data = await response.json();

    if (!response.ok) {
      return {
        error: true,
        message: data.message || "Pendaftaran gagal",
      };
    }

    return {
      error: false,
      data: data,
    };
  } catch (error) {
    if (error.name === "AbortError") {
      return {
        error: true,
        message: "Request timeout - Server terlalu lama merespon.",
      };
    }

    return {
      error: true,
      message: "Terjadi kesalahan jaringan",
    };
  }
}
