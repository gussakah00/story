// generate-icons.js
const fs = require("fs");
const path = require("path");

console.log("🚀 Starting icon generation...");

// Buat folder icons jika belum ada
const iconsDir = path.join(__dirname, "src", "public", "icons");
const screenshotsDir = path.join(__dirname, "src", "public", "screenshots");

if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
  console.log("✅ Created icons directory");
}

if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
  console.log("✅ Created screenshots directory");
}

// Ukuran icons yang diperlukan untuk PWA
const iconSizes = [72, 96, 128, 144, 152, 192, 384, 512];

// Cek source icon yang tersedia
const possibleSources = [
  path.join(__dirname, "src", "public", "favicon.png"),
  path.join(__dirname, "src", "public", "images", "logo.png"),
  path.join(__dirname, "src", "public", "images", "mark.png"),
];

let sourcePath = null;
for (const source of possibleSources) {
  if (fs.existsSync(source)) {
    sourcePath = source;
    console.log(`📁 Found source icon: ${source}`);
    break;
  }
}

if (!sourcePath) {
  console.log("❌ No source icon found! Creating simple SVG icons...");
  createSvgIcons();
} else {
  console.log("📁 Using source icon for generation...");
  copyIcons(sourcePath);
}

createScreenshotPlaceholders();

function copyIcons(sourcePath) {
  try {
    // Copy source ke semua ukuran
    iconSizes.forEach((size) => {
      const outputPath = path.join(iconsDir, `icon-${size}x${size}.png`);
      fs.copyFileSync(sourcePath, outputPath);
      console.log(`✅ Created icon-${size}x${size}.png`);
    });

    // Juga copy sebagai favicon
    const faviconPath = path.join(__dirname, "src", "public", "favicon.png");
    if (!fs.existsSync(faviconPath)) {
      fs.copyFileSync(sourcePath, faviconPath);
      console.log("✅ Created favicon.png");
    }

    console.log("🎉 Icons copied successfully!");
  } catch (error) {
    console.log("❌ Error copying icons, creating SVG instead:", error.message);
    createSvgIcons();
  }
}

function createSvgIcons() {
  console.log("🎨 Creating SVG-based icons...");

  const svgTemplate = (size, color = "#1976d2") => `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="${color}"/>
      <circle cx="${size / 2}" cy="${size / 2}" r="${size / 3}" fill="#ffffff"/>
      <text x="${size / 2}" y="${size / 2}" font-family="Arial" font-size="${
    size / 4
  }" 
            fill="${color}" text-anchor="middle" dy=".3em">📖</text>
    </svg>
  `;

  try {
    iconSizes.forEach((size) => {
      const outputPath = path.join(iconsDir, `icon-${size}x${size}.png`);
      const svgContent = svgTemplate(size);
      fs.writeFileSync(outputPath.replace(".png", ".svg"), svgContent);
      console.log(`✅ Created icon-${size}x${size}.svg`);
    });

    // Buat juga favicon
    const faviconSvg = svgTemplate(32);
    fs.writeFileSync(
      path.join(__dirname, "src", "public", "favicon.svg"),
      faviconSvg
    );
    console.log("✅ Created favicon.svg");
  } catch (error) {
    console.log("❌ Error creating SVG icons:", error.message);
  }
}

function createScreenshotPlaceholders() {
  console.log("📸 Creating screenshot placeholders...");

  const mobileSvg = `
    <svg width="375" height="667" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#f5f5f5"/>
      <rect x="20" y="80" width="335" height="500" fill="#ffffff" rx="8" stroke="#ddd" stroke-width="1"/>
      <text x="187.5" y="40" font-family="Arial" font-size="16" font-weight="bold"
            fill="#1976d2" text-anchor="middle">Cerita di Sekitarmu</text>
      <text x="187.5" y="320" font-family="Arial" font-size="14" 
            fill="#999" text-anchor="middle">Mobile View</text>
      <circle cx="187.5" cy="600" r="4" fill="#1976d2"/>
    </svg>
  `;

  const desktopSvg = `
    <svg width="1280" height="720" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#f5f5f5"/>
      <rect x="40" y="40" width="1200" height="640" fill="#ffffff" rx="8" stroke="#ddd" stroke-width="1"/>
      <text x="640" y="30" font-family="Arial" font-size="18" font-weight="bold"
            fill="#1976d2" text-anchor="middle">Cerita di Sekitarmu - Desktop</text>
      <text x="640" y="360" font-family="Arial" font-size="16" 
            fill="#999" text-anchor="middle">Desktop View</text>
    </svg>
  `;

  try {
    fs.writeFileSync(path.join(screenshotsDir, "mobile-home.svg"), mobileSvg);
    fs.writeFileSync(path.join(screenshotsDir, "desktop-home.svg"), desktopSvg);
    console.log("✅ Created screenshot placeholders (SVG)");

    // Buat juga versi PNG sederhana dengan copy SVG
    fs.copyFileSync(
      path.join(screenshotsDir, "mobile-home.svg"),
      path.join(screenshotsDir, "mobile-home.png")
    );
    fs.copyFileSync(
      path.join(screenshotsDir, "desktop-home.svg"),
      path.join(screenshotsDir, "desktop-home.png")
    );
    console.log("✅ Created screenshot placeholders (PNG)");
  } catch (error) {
    console.log("⚠️  Could not create screenshots:", error.message);
  }
}

console.log("✨ Icon generation process completed!");
console.log("");
console.log("📁 Folder structure created:");
console.log("   src/public/icons/");
console.log("   src/public/screenshots/");
console.log("");
console.log("ℹ️  Note: For better quality icons, please:");
console.log("   1. Add a high-quality favicon.png to src/public/");
console.log("   2. Or use online generator: https://realfavicongenerator.net/");
