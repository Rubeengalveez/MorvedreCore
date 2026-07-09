import { promises as fs } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const DESKTOP_SOURCE = "C:\\Users\\galvi\\OneDrive\\Desktop\\ChatGPT Image 26 jun 2026, 02_11_52.png";
const BRAND_DIR = path.resolve("public", "brand");

const CLUB_BLUE = { r: 10, g: 46, b: 92, alpha: 1 }; // #0A2E5C
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };

async function main() {
  console.log(`Processing new logo from desktop: ${DESKTOP_SOURCE}`);
  
  // 1. Read source and get metadata
  const sourceBuffer = await fs.readFile(DESKTOP_SOURCE);
  const img = sharp(sourceBuffer);
  const metadata = await img.metadata();
  
  const width = metadata.width;
  const height = metadata.height;
  const channels = metadata.channels;
  
  // Get raw pixel buffer to detect non-transparent bounds
  const rawBuffer = await img.raw().toBuffer();
  
  const bgR = rawBuffer[0];
  const bgG = rawBuffer[1];
  const bgB = rawBuffer[2];
  const bgA = channels === 4 ? rawBuffer[3] : 255;
  
  let minX = width;
  let maxX = 0;
  let minY = height;
  let maxY = 0;
  
  const threshold = 15; // sensitivity threshold
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * channels;
      const r = rawBuffer[idx];
      const g = rawBuffer[idx + 1];
      const b = rawBuffer[idx + 2];
      const a = channels === 4 ? rawBuffer[idx + 3] : 255;
      
      const diff = Math.abs(r - bgR) + Math.abs(g - bgG) + Math.abs(b - bgB);
      
      // Check if pixel is opaque
      if (a > 10) {
        if (bgA < 10 || diff > threshold) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
  }

  // Calculate crop coordinates
  const cropLeft = minX;
  const cropTop = minY;
  const cropWidth = maxX - minX + 1;
  const cropHeight = maxY - minY + 1;
  
  console.log(`- Detected logo bounding box: X ${cropLeft}-${maxX} (w:${cropWidth}), Y ${cropTop}-${maxY} (h:${cropHeight})`);

  // 2. Create the cropped logo buffer
  const croppedBuffer = await sharp(sourceBuffer)
    .extract({
      left: cropLeft,
      top: cropTop,
      width: cropWidth,
      height: cropHeight,
    })
    .toBuffer();

  // 3. Save cropped high-quality webp source
  const logoWebpPath = path.join(BRAND_DIR, "logo.webp");
  await sharp(croppedBuffer)
    .webp({ quality: 90 })
    .toFile(logoWebpPath);
  console.log(`- Created cropped source logo.webp`);

  // 4. Generate shark-256.png and shark-512.png (transparent background, fully contained)
  const shark256Path = path.join(BRAND_DIR, "shark-256.png");
  await sharp(croppedBuffer)
    .resize(256, 256, {
      fit: "contain",
      background: TRANSPARENT,
    })
    .png()
    .toFile(shark256Path);
  console.log(`- Created transparent shark-256.png`);

  const shark512Path = path.join(BRAND_DIR, "shark-512.png");
  await sharp(croppedBuffer)
    .resize(512, 512, {
      fit: "contain",
      background: TRANSPARENT,
    })
    .png()
    .toFile(shark512Path);
  console.log(`- Created transparent shark-512.png`);

  // 5. Generate PWA launcher icons (icon-192.png, icon-512.png)
  const icon192Path = path.join(BRAND_DIR, "icon-192.png");
  await sharp(croppedBuffer)
    .resize(192, 192, {
      fit: "contain",
      background: TRANSPARENT,
    })
    .png()
    .toFile(icon192Path);
  console.log(`- Created PWA launcher icon-192.png`);

  const icon512Path = path.join(BRAND_DIR, "icon-512.png");
  await sharp(croppedBuffer)
    .resize(512, 512, {
      fit: "contain",
      background: TRANSPARENT,
    })
    .png()
    .toFile(icon512Path);
  console.log(`- Created PWA launcher icon-512.png`);

  // 6. Generate premium PWA maskable icon (blue background with safe zoned logo in center)
  const iconMaskablePath = path.join(BRAND_DIR, "icon-maskable-512.png");
  const innerSize = Math.round(512 * 0.5); // 50% safe zone
  const innerBuffer = await sharp(croppedBuffer)
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

  // 7. Generate favicon.ico (32x32 transparent)
  const faviconPath = path.resolve("public", "favicon.ico");
  await sharp(croppedBuffer)
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
