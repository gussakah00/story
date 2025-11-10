const AboutPage = {
  async render() {
    return `
    <section class="about container" aria-labelledby="about-title">
      <h1 id="about-title" tabindex="0">Tentang Aplikasi Cerita di Sekitarmu</h1>
       
        <div class="content-wrapper">
          <p>Aplikasi web ini dibuat sebagai proyek fundamental untuk memenuhi persyaratan kurikulum. Tujuan utama aplikasi ini adalah menyediakan platform berbagi cerita berbasis lokasi.</p>
         
          <h3>Fitur Utama</h3>
          <ul>
            <li><strong>Peta Interaktif:</strong> Menampilkan lokasi cerita dari pengguna lain menggunakan Leaflet.</li>
            <li><strong>Berbagi Cerita:</strong> Memungkinkan pengguna mengunggah cerita baru beserta foto dan lokasi spesifik mereka.</li>
            <li><strong>Aksesibilitas Tinggi:</strong> Dirancang agar mudah diakses oleh pengguna keyboard (menggunakan fitur "Lewati ke Konten Utama").</li>
            <li><strong>SPA (Single Page Application):</strong> Memiliki transisi halaman yang cepat dan mulus tanpa reload penuh.</li>
          </ul>
         
          <h3>Data Pembuat</h3>
          <div class="card-author">
            <h4>Proyek Dibuat oleh:</h4>
            <p><strong>Nama:</strong> I Gusti Agus Sakah Aditia</p>
          </div>
        </div>
      </section>
    `;
  },

  async afterRender() {
    console.log("About page finished rendering.");

    const aboutSection = document.querySelector(".about");
    if (aboutSection) {
      aboutSection.classList.add("fade-in");
    }
  },
};

export default AboutPage;
