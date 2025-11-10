const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

// Buat folder icons jika belum ada
const iconsDir = path.join(__dirname, "src", "public", "icons");
const screenshotsDir = path.join(__dirname, "src", "public", "screenshots");
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

console.log("🚀 Generating PWA icons...");

// Ukuran icons yang diperlukan untuk PWA
const iconSizes = [72, 96, 128, 144, 152, 192, 384, 512];

// Path ke source icon (ganti dengan path icon Anda)
const sourceIconPath = path.join(__dirname, "src", "public", "favicon.png");
const fallbackIconPath = path.join(
  __dirname,
  "src",
  "public",
  "images",
  "logo.png"
);

async function generateIcons() {
  try {
    // Cari source icon yang tersedia
    let sourcePath = sourceIconPath;
    if (!fs.existsSync(sourceIconPath)) {
      console.log("⚠️  favicon.png not found, trying logo.png...");
      sourcePath = fallbackIconPath;

      if (!fs.existsSync(fallbackIconPath)) {
        console.log("❌ No source icon found! Creating placeholder icons...");
        await createPlaceholderIcons();
        return;
      }
    }

    console.log(`📁 Using source icon: ${path.basename(sourcePath)}`);

    // Generate semua ukuran icon
    const generationPromises = iconSizes.map(async (size) => {
      const outputPath = path.join(iconsDir, `icon-${size}x${size}.png`);

      await sharp(sourcePath).resize(size, size).png().toFile(outputPath);

      console.log(`✅ Created icon-${size}x${size}.png`);
    });

    await Promise.all(generationPromises);

    // Juga generate favicon untuk browser tab
    await sharp(sourcePath)
      .resize(32, 32)
      .png()
      .toFile(path.join(__dirname, "src", "public", "favicon-32x32.png"));

    console.log("✅ Created favicon-32x32.png");

    console.log("🎉 All icons generated successfully!");
  } catch (error) {
    console.error("❌ Error generating icons:", error);
    console.log("🔄 Creating placeholder icons instead...");
    await createPlaceholderIcons();
  }
}

// Buat placeholder icons jika source tidak ada
async function createPlaceholderIcons() {
  const placeholderSvg = `
    <svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#1976d2"/>
      <circle cx="256" cy="256" r="200" fill="#ffffff"/>
      <text x="256" y="256" font-family="Arial" font-size="120" 
            fill="#1976d2" text-anchor="middle" dy=".3em">📖</text>
    </svg>
  `;

  const generationPromises = iconSizes.map(async (size) => {
    const outputPath = path.join(iconsDir, `icon-${size}x${size}.png`);

    await sharp(Buffer.from(placeholderSvg))
      .resize(size, size)
      .png()
      .toFile(outputPath);

    console.log(`✅ Created placeholder icon-${size}x${size}.png`);
  });

  await Promise.all(generationPromises);
}

// Buat placeholder screenshots untuk PWA
async function createScreenshotPlaceholders() {
  console.log("📸 Creating screenshot placeholders...");

  const mobileScreenshot = `
    <svg width="375" height="667" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#f5f5f5"/>
      <rect x="20" y="80" width="335" height="500" fill="#ffffff" rx="8"/>
      <text x="187.5" y="40" font-family="Arial" font-size="16" 
            fill="#666" text-anchor="middle">Cerita di Sekitarmu</text>
      <text x="187.5" y="320" font-family="Arial" font-size="14" 
            fill="#999" text-anchor="middle">Mobile Screenshot</text>
    </svg>
  `;

  const desktopScreenshot = `
    <svg width="1280" height="720" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#f5f5f5"/>
      <rect x="40" y="40" width="1200" height="640" fill="#ffffff" rx="8"/>
      <text x="640" y="30" font-family="Arial" font-size="18" 
            fill="#666" text-anchor="middle">Cerita di Sekitarmu</text>
      <text x="640" y="360" font-family="Arial" font-size="16" 
            fill="#999" text-anchor="middle">Desktop Screenshot</text>
    </svg>
  `;

  try {
    await sharp(Buffer.from(mobileScreenshot))
      .jpeg()
      .toFile(path.join(screenshotsDir, "mobile-home.jpg"));

    await sharp(Buffer.from(desktopScreenshot))
      .jpeg()
      .toFile(path.join(screenshotsDir, "desktop-home.jpg"));

    console.log("✅ Created screenshot placeholders");
  } catch (error) {
    console.log("⚠️  Could not create screenshots:", error.message);
  }
}

// Jalankan semua proses
async function main() {
  await generateIcons();
  await createScreenshotPlaceholders();
  console.log("✨ PWA assets generation completed!");
}

main();
