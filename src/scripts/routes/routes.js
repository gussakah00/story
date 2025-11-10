export const routes = {
  "/beranda": () => import("../pages/home/home-page.js"),
  "/about": () => import("../pages/about/about-page.js"),
  "/add": () => import("../pages/add/add-page.js"),
  "/login": () => import("../pages/auth/login-page.js"),
  "/register": () => import("../pages/auth/register-page.js"),
  "/favorites": () => import("../pages/favorites/favorites-page.js"),
  "/offline": () => import("../pages/offline/offline-page.js"),
};

export const getFallbackRoute = () => {
  return "/about";
};

export const protectedRoutes = ["/beranda", "/add", "/favorites", "/offline"];

export const publicRoutes = ["/about", "/login", "/register"];

export const isProtectedRoute = (route) => {
  return protectedRoutes.includes(route);
};

export const isPublicRoute = (route) => {
  return publicRoutes.includes(route);
};

export const getRouteLoader = (path) => {
  return routes[path] || null;
};

export const validateRouteAccess = (route, isLoggedIn) => {
  if (isProtectedRoute(route) && !isLoggedIn) {
    return false;
  }

  if (
    isPublicRoute(route) &&
    isLoggedIn &&
    (route === "/login" || route === "/register")
  ) {
    return false;
  }

  return true;
};
