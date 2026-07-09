import { promises as fs } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const DESKTOP_SOURCE = "C:\\Users\\galvi\\OneDrive\\Desktop\\ChatGPT Image 26 jun 2026, 02_11_52.png";
const BRAND_DIR = path.resolve("public", "brand");

const CLUB_BLUE = { r: 10, g: 46, b: 92, alpha: 1 }; // #0A2E5C
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };

// Helper function to resize and apply a rounded rectangle mask
async function generateRoundedPng(croppedBuffer, size, outPath) {
  const radius = Math.round(size * 0.12); // 12% corner radius
  const mask = Buffer.from(
    `<svg width="${size}" height="${size}">
       <rect x="0" y="0" width="${size}" height="${size}" rx="${radius}" ry="${radius}" fill="black" />
     </svg>`
  );

  await sharp(croppedBuffer)
    .resize(size, size, {
      fit: "contain",
      background: TRANSPARENT,
    })
    .composite([{ input: mask, blend: "dest-in" }])
    .png()
    .toFile(outPath);
}

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

  // 3. Save cropped high-quality webp source (also masked with rounded corners)
  const logoWebpPath = path.join(BRAND_DIR, "logo.webp");
  const webpRadius = Math.round(cropWidth * 0.12);
  const webpMask = Buffer.from(
    `<svg width="${cropWidth}" height="${cropHeight}">
       <rect x="0" y="0" width="${cropWidth}" height="${cropHeight}" rx="${webpRadius}" ry="${webpRadius}" fill="black" />
     </svg>`
  );
  await sharp(croppedBuffer)
    .composite([{ input: webpMask, blend: "dest-in" }])
    .webp({ quality: 90 })
    .toFile(logoWebpPath);
  console.log(`- Created cropped and rounded source logo.webp`);

  // 4. Generate shark-256.png and shark-512.png (transparent background, rounded corners)
  const shark256Path = path.join(BRAND_DIR, "shark-256.png");
  await generateRoundedPng(croppedBuffer, 256, shark256Path);
  console.log(`- Created rounded transparent shark-256.png`);

  const shark512Path = path.join(BRAND_DIR, "shark-512.png");
  await generateRoundedPng(croppedBuffer, 512, shark512Path);
  console.log(`- Created rounded transparent shark-512.png`);

  // 5. Generate PWA launcher icons (icon-192.png, icon-512.png)
  const icon192Path = path.join(BRAND_DIR, "icon-192.png");
  await generateRoundedPng(croppedBuffer, 192, icon192Path);
  console.log(`- Created rounded PWA launcher icon-192.png`);

  const icon512Path = path.join(BRAND_DIR, "icon-512.png");
  await generateRoundedPng(croppedBuffer, 512, icon512Path);
  console.log(`- Created rounded PWA launcher icon-512.png`);

  // 6. Generate premium PWA maskable icon (blue background with rounded safe zoned logo in center)
  const iconMaskablePath = path.join(BRAND_DIR, "icon-maskable-512.png");
  const innerSize = Math.round(512 * 0.5); // 50% safe zone
  const innerRadius = Math.round(innerSize * 0.12);
  const innerMask = Buffer.from(
    `<svg width="${innerSize}" height="${innerSize}">
       <rect x="0" y="0" width="${innerSize}" height="${innerSize}" rx="${innerRadius}" ry="${innerRadius}" fill="black" />
     </svg>`
  );
  const innerBufferRounded = await sharp(croppedBuffer)
    .resize(innerSize, innerSize, {
      fit: "contain",
      background: TRANSPARENT,
    })
    .composite([{ input: innerMask, blend: "dest-in" }])
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
    .composite([{ input: innerBufferRounded, gravity: "center" }])
    .png()
    .toFile(iconMaskablePath);
  console.log(`- Created rounded premium blue maskable icon-maskable-512.png`);

  // 7. Generate favicon.ico (32x32 rounded transparent)
  const faviconPath = path.resolve("public", "favicon.ico");
  await generateRoundedPng(croppedBuffer, 32, faviconPath);
  console.log(`- Created rounded transparent favicon.ico`);

  console.log("\nLogo processing completed successfully!");
}

main().catch((err) => {
  console.error("Error processing logo:", err);
  process.exit(1);
});
