import { promises as fs } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const DESKTOP_SOURCE = "C:\\Users\\galvi\\OneDrive\\Desktop\\ChatGPT Image 26 jun 2026, 02_11_52.png";
const BRAND_DIR = path.resolve("public", "brand");

const CLUB_BLUE = { r: 10, g: 46, b: 92, alpha: 1 }; // #0A2E5C
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };

async function main() {
  console.log(`Processing new logo from desktop: ${DESKTOP_SOURCE}`);
  
  // 1. Read source
  const sourceBuffer = await fs.readFile(DESKTOP_SOURCE);
  
  // 2. Save trimmed high-quality webp source
  const logoWebpPath = path.join(BRAND_DIR, "logo.webp");
  await sharp(sourceBuffer)
    .trim()
    .webp({ quality: 90 })
    .toFile(logoWebpPath);
  console.log(`- Created source logo.webp`);

  // 3. Generate shark-256.png and shark-512.png (transparent background, fully contained)
  const shark256Path = path.join(BRAND_DIR, "shark-256.png");
  await sharp(sourceBuffer)
    .trim()
    .resize(256, 256, {
      fit: "contain",
      background: TRANSPARENT,
    })
    .png()
    .toFile(shark256Path);
  console.log(`- Created transparent shark-256.png`);

  const shark512Path = path.join(BRAND_DIR, "shark-512.png");
  await sharp(sourceBuffer)
    .trim()
    .resize(512, 512, {
      fit: "contain",
      background: TRANSPARENT,
    })
    .png()
    .toFile(shark512Path);
  console.log(`- Created transparent shark-512.png`);

  // 4. Generate PWA launcher icons (icon-192.png, icon-512.png)
  const icon192Path = path.join(BRAND_DIR, "icon-192.png");
  await sharp(sourceBuffer)
    .trim()
    .resize(192, 192, {
      fit: "contain",
      background: TRANSPARENT,
    })
    .png()
    .toFile(icon192Path);
  console.log(`- Created PWA launcher icon-192.png`);

  const icon512Path = path.join(BRAND_DIR, "icon-512.png");
  await sharp(sourceBuffer)
    .trim()
    .resize(512, 512, {
      fit: "contain",
      background: TRANSPARENT,
    })
    .png()
    .toFile(icon512Path);
  console.log(`- Created PWA launcher icon-512.png`);

  // 5. Generate premium PWA maskable icon (blue background with safe zoned logo in center)
  const iconMaskablePath = path.join(BRAND_DIR, "icon-maskable-512.png");
  const innerSize = Math.round(512 * 0.5); // 50% safe zone
  const innerBuffer = await sharp(sourceBuffer)
    .trim()
    .resize(innerSize, innerSize, {
      fit: "contain",
      background: TRANSPARENT,
    })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: CLUB_BLUE,
    },
  })
    .composite([{ input: innerBuffer, gravity: "center" }])
    .png()
    .toFile(iconMaskablePath);
  console.log(`- Created premium blue maskable icon-maskable-512.png`);

  // 6. Generate favicon.ico (32x32 transparent)
  const faviconPath = path.resolve("public", "favicon.ico");
  await sharp(sourceBuffer)
    .trim()
    .resize(32, 32, {
      fit: "contain",
      background: TRANSPARENT,
    })
    .png()
    .toFile(faviconPath);
  console.log(`- Created transparent favicon.ico`);

  console.log("\nLogo processing completed successfully!");
}

main().catch((err) => {
  console.error("Error processing logo:", err);
  process.exit(1);
});
