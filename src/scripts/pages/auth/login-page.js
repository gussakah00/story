import { loginUser } from "../../data/api.js";
import { authService } from "../../utils/auth.js";

const LoginPage = {
  async render() {
    return `
      <section class="auth-page" aria-labelledby="login-title">
        <h1 id="login-title" tabindex="0">Masuk ke Akun Anda</h1>
        <form id="loginForm" class="auth-form" aria-labelledby="login-title" autocomplete="off">
          <div class="form-group">
            <label for="login-email">Email:</label>
            <input 
              type="email" 
              id="login-email" 
              name="email" 
              required 
              aria-required="true"
              placeholder="Masukkan email Anda"
              autocomplete="new-email"
              aria-describedby="email-help"
            >
            <p id="email-help" class="form-help">Masukkan alamat email yang terdaftar</p>
            <p id="email-error" class="error-message" aria-live="polite"></p>
          </div>
          
          <div class="form-group">
            <label for="login-password">Kata Sandi:</label>
            <input 
              type="password" 
              id="login-password" 
              name="password" 
              required 
              aria-required="true"
              placeholder="Masukkan kata sandi Anda"
              autocomplete="new-password"
              aria-describedby="password-help"
            >
            <p id="password-help" class="form-help">Masukkan kata sandi akun Anda</p>
            <p id="password-error" class="error-message" aria-live="polite"></p>
          </div>
          
          <button type="submit" class="submit-button">Masuk</button>
          <p class="auth-link">
            Belum punya akun? <a href="#/register" class="link">Daftar di sini</a>
          </p>
        </form>
        <div id="auth-message" class="info-message" aria-live="polite" style="display:none;"></div>
      </section>
    `;
  },

  async afterRender() {
    this._setupFormValidation();
    this._setupFormSubmission();
  },

  _setupFormValidation() {
    const form = document.getElementById("loginForm");
    const emailInput = document.getElementById("login-email");
    const passwordInput = document.getElementById("login-password");

    const validateEmail = (email) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email);
    };

    emailInput.addEventListener("blur", () => {
      const email = emailInput.value.trim();
      const errorElement = document.getElementById("email-error");

      if (!email) {
        errorElement.textContent = "Email harus diisi";
        emailInput.setAttribute("aria-invalid", "true");
      } else if (!validateEmail(email)) {
        errorElement.textContent = "Format email tidak valid";
        emailInput.setAttribute("aria-invalid", "true");
      } else {
        errorElement.textContent = "";
        emailInput.setAttribute("aria-invalid", "false");
      }
    });

    passwordInput.addEventListener("blur", () => {
      const password = passwordInput.value;
      const errorElement = document.getElementById("password-error");

      if (!password) {
        errorElement.textContent = "Kata sandi harus diisi";
        passwordInput.setAttribute("aria-invalid", "true");
      } else if (password.length < 6) {
        errorElement.textContent = "Kata sandi minimal 6 karakter";
        passwordInput.setAttribute("aria-invalid", "true");
      } else {
        errorElement.textContent = "";
        passwordInput.setAttribute("aria-invalid", "false");
      }
    });

    setTimeout(() => {
      emailInput.value = "";
      passwordInput.value = "";
    }, 100);
  },

  _setupFormSubmission() {
    const form = document.getElementById("loginForm");
    const messageDisplay = document.getElementById("auth-message");

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const email = document.getElementById("login-email").value.trim();
      const password = document.getElementById("login-password").value;

      if (!email || !password) {
        messageDisplay.textContent = "Harap isi semua field yang diperlukan";
        messageDisplay.style.display = "block";
        messageDisplay.style.backgroundColor = "#fee";
        return;
      }

      const submitButton = form.querySelector(".submit-button");
      submitButton.disabled = true;
      submitButton.textContent = "Memproses...";
      messageDisplay.textContent = "Sedang masuk...";
      messageDisplay.style.display = "block";
      messageDisplay.style.backgroundColor = "#e3f2fd";

      try {
        const response = await loginUser({ email, password });

        if (response.error) {
          throw new Error(response.message);
        }

        authService.login(response.data.loginResult.token, {
          name: response.data.loginResult.name,
          email: email,
        });

        messageDisplay.textContent =
          "Login berhasil! Mengarahkan ke beranda...";
        messageDisplay.style.backgroundColor = "#e8f5e8";

        window.dispatchEvent(new Event("authchange"));

        setTimeout(() => {
          window.location.hash = "#/beranda";
        }, 2000);
      } catch (error) {
        messageDisplay.textContent = `Login gagal: ${error.message}`;
        messageDisplay.style.backgroundColor = "#fee";
        submitButton.disabled = false;
        submitButton.textContent = "Masuk";
      }
    });
  },
};

export default LoginPage;
