class AuthService {
  constructor() {
    this.tokenKey = "authToken";
    this.userKey = "userData";
  }

  login(token, userData) {
    localStorage.setItem(this.tokenKey, token);
    localStorage.setItem(this.userKey, JSON.stringify(userData));
  }

  logout() {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
  }

  isLoggedIn() {
    return !!this.getToken();
  }

  getToken() {
    return localStorage.getItem(this.tokenKey);
  }

  getUser() {
    const userData = localStorage.getItem(this.userKey);
    return userData ? JSON.parse(userData) : null;
  }

  getUserName() {
    const user = this.getUser();
    return user ? user.name : "Pengguna";
  }
}

export const authService = new AuthService();
