import { registerUser } from "../../data/api.js";

const RegisterPage = {
  async render() {
    return `
      <section class="auth-page" aria-labelledby="register-title">
        <h1 id="register-title" tabindex="0">Buat Akun Baru</h1>
        <form id="registerForm" class="auth-form" aria-labelledby="register-title" autocomplete="off">
          <div class="form-group">
            <label for="register-name">Nama:</label>
            <input 
              type="text" 
              id="register-name" 
              name="name" 
              required 
              aria-required="true"
              placeholder="Masukkan nama lengkap Anda"
              autocomplete="name"
              aria-describedby="name-help"
            >
            <p id="name-help" class="form-help">Masukkan nama lengkap Anda</p>
            <p id="name-error" class="error-message" aria-live="polite"></p>
          </div>
          
          <div class="form-group">
            <label for="register-email">Email:</label>
            <input 
              type="email" 
              id="register-email" 
              name="email" 
              required 
              aria-required="true"
              placeholder="Masukkan email Anda"
              autocomplete="email"
              aria-describedby="email-help"
            >
            <p id="email-help" class="form-help">Masukkan alamat email yang valid</p>
            <p id="email-error" class="error-message" aria-live="polite"></p>
          </div>
          
          <div class="form-group">
            <label for="register-password">Kata Sandi:</label>
            <input 
              type="password" 
              id="register-password" 
              name="password" 
              required 
              aria-required="true"
              placeholder="Buat kata sandi (minimal 6 karakter)"
              autocomplete="new-password"
              aria-describedby="password-help"
            >
            <p id="password-help" class="form-help">Buat kata sandi yang kuat</p>
            <p id="password-error" class="error-message" aria-live="polite"></p>
          </div>
          
          <div class="form-group">
            <label for="register-confirmPassword">Konfirmasi Kata Sandi:</label>
            <input 
              type="password" 
              id="register-confirmPassword" 
              name="confirmPassword" 
              required 
              aria-required="true"
              placeholder="Ulangi kata sandi Anda"
              autocomplete="new-password"
              aria-describedby="confirmPassword-help"
            >
            <p id="confirmPassword-help" class="form-help">Ketik ulang kata sandi Anda</p>
            <p id="confirmPassword-error" class="error-message" aria-live="polite"></p>
          </div>
          
          <button type="submit" class="submit-button">Daftar</button>
          <p class="auth-link">
            Sudah punya akun? <a href="#/login" class="link">Masuk di sini</a>
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
    const form = document.getElementById("registerForm");
    const nameInput = document.getElementById("register-name");
    const emailInput = document.getElementById("register-email");
    const passwordInput = document.getElementById("register-password");
    const confirmPasswordInput = document.getElementById(
      "register-confirmPassword"
    );

    const validateEmail = (email) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email);
    };

    nameInput.addEventListener("blur", () => {
      const name = nameInput.value.trim();
      const errorElement = document.getElementById("name-error");

      if (!name) {
        errorElement.textContent = "Nama harus diisi";
        nameInput.setAttribute("aria-invalid", "true");
      } else if (name.length < 3) {
        errorElement.textContent = "Nama minimal 3 karakter";
        nameInput.setAttribute("aria-invalid", "true");
      } else {
        errorElement.textContent = "";
        nameInput.setAttribute("aria-invalid", "false");
      }
    });

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

    confirmPasswordInput.addEventListener("blur", () => {
      const password = passwordInput.value;
      const confirmPassword = confirmPasswordInput.value;
      const errorElement = document.getElementById("confirmPassword-error");

      if (!confirmPassword) {
        errorElement.textContent = "Konfirmasi kata sandi harus diisi";
        confirmPasswordInput.setAttribute("aria-invalid", "true");
      } else if (password !== confirmPassword) {
        errorElement.textContent = "Kata sandi tidak cocok";
        confirmPasswordInput.setAttribute("aria-invalid", "true");
      } else {
        errorElement.textContent = "";
        confirmPasswordInput.setAttribute("aria-invalid", "false");
      }
    });

    setTimeout(() => {
      nameInput.value = "";
      emailInput.value = "";
      passwordInput.value = "";
      confirmPasswordInput.value = "";
    }, 100);
  },

  _setupFormSubmission() {
    const form = document.getElementById("registerForm");
    const messageDisplay = document.getElementById("auth-message");

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const name = document.getElementById("register-name").value.trim();
      const email = document.getElementById("register-email").value.trim();
      const password = document.getElementById("register-password").value;

      if (!name || !email || !password) {
        messageDisplay.textContent = "Harap isi semua field yang diperlukan";
        messageDisplay.style.display = "block";
        messageDisplay.style.backgroundColor = "#fee";
        return;
      }

      const submitButton = form.querySelector(".submit-button");
      submitButton.disabled = true;
      submitButton.textContent = "Memproses...";
      messageDisplay.textContent = "Mendaftarkan akun...";
      messageDisplay.style.display = "block";
      messageDisplay.style.backgroundColor = "#e3f2fd";

      try {
        const response = await registerUser({ name, email, password });

        if (response.error) {
          throw new Error(response.message);
        }

        messageDisplay.textContent = "Pendaftaran berhasil! Silakan masuk.";
        messageDisplay.style.backgroundColor = "#e8f5e8";

        setTimeout(() => {
          window.location.hash = "#/login";
        }, 2000);
      } catch (error) {
        messageDisplay.textContent = `Pendaftaran gagal: ${error.message}`;
        messageDisplay.style.backgroundColor = "#fee";
        submitButton.disabled = false;
        submitButton.textContent = "Daftar";
      }
    });
  },
};

export default RegisterPage;
