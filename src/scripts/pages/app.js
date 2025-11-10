import { getActiveRoute } from "../routes/url-parser.js";
import { navigation } from "../components/navigation.js";
import { authService } from "../utils/auth.js";
import { routes } from "../routes/routes.js";

class App {
  _content = null;
  _drawerButton = null;
  _navigationDrawer = null;
  _isRendering = false;
  _currentPage = null;
  _previousRoute = null;
  _currentRoute = null;

  // Definisikan urutan halaman untuk menentukan arah transisi
  _pageOrder = {
    "/beranda": 1,
    "/about": 2,
    "/add": 3,
    "/favorites": 4,
    "/offline": 5,
    "/login": 6,
    "/register": 7,
  };

  constructor({ navigationDrawer, drawerButton, content }) {
    this._content = content;
    this._drawerButton = drawerButton;
    this._navigationDrawer = navigationDrawer;
    this._isRendering = false;
    this._currentPage = null;
    this._previousRoute = null;
    this._currentRoute = null;

    this._setupDrawer();
    this._setupSkipLink();
    this._initRouter();
    this._initNavigation();
  }

  _initNavigation() {
    navigation.init();
  }

  _initRouter() {
    const debounce = (func, wait) => {
      let timeout;
      return function executedFunction(...args) {
        const later = () => {
          clearTimeout(timeout);
          func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
      };
    };

    const debouncedRender = debounce(() => this.renderPage(), 100);

    window.addEventListener("hashchange", debouncedRender);
    window.addEventListener("load", () => this.renderPage());
    window.addEventListener("authchange", () => {
      this.renderPage();
      navigation.init();
    });
  }

  _setupDrawer() {
    if (!this._drawerButton || !this._navigationDrawer) {
      console.error("Drawer elements not found in DOM.");
      return;
    }

    this._drawerButton.addEventListener("click", () => {
      const isExpanded = this._navigationDrawer.classList.toggle("open");
      this._drawerButton.setAttribute("aria-expanded", isExpanded);

      if (isExpanded) {
        this._drawerButton.innerHTML = "✕";
        this._drawerButton.setAttribute("aria-label", "Tutup menu navigasi");
      } else {
        this._drawerButton.innerHTML = "☰";
        this._drawerButton.setAttribute("aria-label", "Buka menu navigasi");
      }
    });

    document.body.addEventListener("click", (event) => {
      if (
        !this._navigationDrawer.contains(event.target) &&
        !this._drawerButton.contains(event.target) &&
        this._navigationDrawer.classList.contains("open")
      ) {
        this._navigationDrawer.classList.remove("open");
        this._drawerButton.setAttribute("aria-expanded", "false");
        this._drawerButton.innerHTML = "☰";
        this._drawerButton.setAttribute("aria-label", "Buka menu navigasi");
      }
    });

    this._navigationDrawer.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        if (window.innerWidth < 768) {
          this._navigationDrawer.classList.remove("open");
          this._drawerButton.setAttribute("aria-expanded", "false");
          this._drawerButton.innerHTML = "☰";
          this._drawerButton.setAttribute("aria-label", "Buka menu navigasi");
        }
      });
    });
  }

  _setupSkipLink() {
    const skipLink = document.querySelector(".skip-link");
    const mainContent = document.querySelector("#main-content");

    if (skipLink && mainContent) {
      skipLink.addEventListener("click", (e) => {
        e.preventDefault();
        mainContent.focus();
        mainContent.scrollIntoView({ behavior: "smooth" });
      });
    }
  }

  async renderPage() {
    if (!this._content) {
      console.error("Content container not found in DOM.");
      return;
    }

    if (this._isRendering) {
      console.log("App: Already rendering, skipping...");
      return;
    }

    this._isRendering = true;

    try {
      let url = getActiveRoute();

      if (!url || url === "#" || url === "/") {
        if (authService.isLoggedIn()) {
          url = "#/beranda";
        } else {
          url = "#/about";
        }
        window.location.hash = url;
        this._isRendering = false;
        return;
      }

      if (!authService.isLoggedIn()) {
        const protectedRoutes = ["/beranda", "/add", "/favorites", "/offline"];
        if (protectedRoutes.includes(url)) {
          url = "#/about";
          window.location.hash = url;
          this._isRendering = false;
          return;
        }
      }

      if (authService.isLoggedIn()) {
        const authRoutes = ["/login", "/register"];
        if (authRoutes.includes(url)) {
          url = "#/beranda";
          window.location.hash = url;
          this._isRendering = false;
          return;
        }
      }

      const pageLoader = routes[url];

      if (!pageLoader) {
        this._showErrorPage(
          "404 - Halaman Tidak Ditemukan",
          "Halaman yang Anda cari tidak ditemukan."
        );
        this._isRendering = false;
        return;
      }

      // Tentukan arah transisi
      const direction = this._getTransitionDirection(url);
      console.log(
        `🔄 Navigation: ${this._previousRoute} → ${url} (${direction})`
      );

      // Gunakan View Transitions API jika tersedia
      if (document.startViewTransition) {
        console.log(`🎬 Using View Transition with direction: ${direction}`);

        // Set class untuk direction sebelum transisi
        this._content.classList.remove(
          "forward-transition",
          "backward-transition",
          "none-transition"
        );
        this._content.classList.add(`${direction}-transition`);

        const transition = document.startViewTransition(async () => {
          await this._renderPageContent(pageLoader, url, direction);
        });

        await transition.finished;

        // Hapus class setelah transisi selesai
        setTimeout(() => {
          this._content.classList.remove(`${direction}-transition`);
        }, 400);
      } else {
        // Fallback tanpa View Transitions
        console.log("⚠️ View Transitions not supported, using fallback");
        await this._renderPageContent(pageLoader, url, direction);
      }

      this._previousRoute = this._currentRoute;
      this._currentRoute = url;
    } catch (error) {
      console.error("Error rendering page:", error);
      this._showErrorPage(
        "Terjadi Kesalahan",
        "Maaf, terjadi kesalahan saat menampilkan halaman."
      );
    } finally {
      this._isRendering = false;
    }
  }

  async _renderPageContent(pageLoader, url, direction) {
    // Cleanup previous page
    if (this._currentPage && typeof this._currentPage.cleanup === "function") {
      await this._currentPage.cleanup();
    }

    // Add loading state
    this._content.style.opacity = "0.7";

    await new Promise((resolve) => setTimeout(resolve, 50));

    // Dynamic import
    const pageModule = await pageLoader();
    const page = pageModule.default;

    this._content.innerHTML = await page.render();
    this._currentPage = page;

    if (typeof page.afterRender === "function") {
      try {
        await page.afterRender();
      } catch (afterRenderError) {
        console.error("Error in afterRender:", afterRenderError);
      }
    }

    // Selesaikan transisi
    this._content.style.opacity = "1";
    this._updateDocumentTitle(url);

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Method untuk menentukan arah transisi
  _getTransitionDirection(newRoute) {
    if (!this._currentRoute) return "none";

    const currentOrder = this._pageOrder[this._currentRoute] || 0;
    const newOrder = this._pageOrder[newRoute] || 0;

    if (newOrder > currentOrder) {
      return "forward";
    } else if (newOrder < currentOrder) {
      return "backward";
    } else {
      return "none";
    }
  }
  _showErrorPage(title, message) {
    this._content.innerHTML = `
      <section class="error-page" style="text-align: center; padding: 60px 20px;">
        <h1>${title}</h1>
        <p style="margin: 20px 0; color: #666;">${message}</p>
        <div style="margin-top: 30px;">
          <a href="#/beranda" class="primary-button" style="margin-right: 10px;">🏠 Ke Beranda</a>
          <a href="#/about" class="secondary-button">ℹ️ Ke About</a>
        </div>
      </section>
    `;
    this._content.style.opacity = 1;
  }

  _updateDocumentTitle(route) {
    const titleMap = {
      "/beranda": "Beranda - Cerita di Sekitarmu",
      "/about": "Tentang - Cerita di Sekitarmu",
      "/add": "Tambah Cerita - Cerita di Sekitarmu",
      "/login": "Masuk - Cerita di Sekitarmu",
      "/register": "Daftar - Cerita di Sekitarmu",
      "/favorites": "Favorit - Cerita di Sekitarmu",
      "/offline": "Offline - Cerita di Sekitarmu",
    };

    document.title = titleMap[route] || "Cerita di Sekitarmu";
  }

  refresh() {
    this.renderPage();
  }

  isUserLoggedIn() {
    return authService.isLoggedIn();
  }

  getUserInfo() {
    return authService.getUser();
  }
}

export default App;
