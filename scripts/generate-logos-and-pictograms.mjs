import { promises as fs } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const BRAND_DIR = path.resolve("public", "brand");
const SOURCE = path.join(BRAND_DIR, "logo-original.png");

const WHITE = { r: 255, g: 255, b: 255, alpha: 1 };

const SHARK_VARIANTS = [
  { name: "shark-512.png", size: 512 },
  { name: "shark-256.png", size: 256 },
  { name: "shark-128.png", size: 128 },
];

const LOGO_VARIANTS = [
  { name: "logo-512.png", size: 512, maxBytes: 150 * 1024 },
  { name: "logo-256.png", size: 256, maxBytes: 80 * 1024 },
  { name: "logo-128.png", size: 128, maxBytes: 50 * 1024 },
];

const SHARK_REGION = { left: 220, top: 16, width: 1110, height: 600 };

async function generateSharkVariants(sourceBuffer) {
  const croppedBuffer = await sharp(sourceBuffer)
    .extract(SHARK_REGION)
    .flatten({ background: WHITE })
    .toBuffer();

  console.log(
    `  shark region: ${SHARK_REGION.width}x${SHARK_REGION.height} (top portion, no text)`,
  );

  for (const variant of SHARK_VARIANTS) {
    const dest = path.join(BRAND_DIR, variant.name);
    await sharp(croppedBuffer)
      .resize({
        width: variant.size,
        height: variant.size,
        fit: "contain",
        background: WHITE,
      })
      .png({ compressionLevel: 9 })
      .toFile(dest);
    const outMeta = await sharp(dest).metadata();
    const stats = await fs.stat(dest);
    console.log(
      `  wrote ${variant.name} (${outMeta.width}x${outMeta.height}, ${(stats.size / 1024).toFixed(1)} KB) — shark + ball, no text`,
    );
  }
}

async function generateLogoVariants(sourceBuffer) {
  for (const variant of LOGO_VARIANTS) {
    const dest = path.join(BRAND_DIR, variant.name);
    await sharp(sourceBuffer)
      .flatten({ background: WHITE })
      .resize({
        width: variant.size,
        height: variant.size,
        fit: "contain",
        background: WHITE,
      })
      .png({ compressionLevel: 9 })
      .toFile(dest);

    let finalSize = (await fs.stat(dest)).size;
    if (finalSize > variant.maxBytes) {
      const ratio = variant.maxBytes / finalSize;
      const reducedSize = Math.max(64, Math.round(variant.size * Math.sqrt(ratio * 0.95)));
      await sharp(sourceBuffer)
        .flatten({ background: WHITE })
        .resize({
          width: reducedSize,
          height: reducedSize,
          fit: "contain",
          background: WHITE,
        })
        .png({ compressionLevel: 9 })
        .toFile(dest);
      finalSize = (await fs.stat(dest)).size;
    }

    const outMeta = await sharp(dest).metadata();
    console.log(
      `  wrote ${variant.name} (${outMeta.width}x${outMeta.height}, ${(finalSize / 1024).toFixed(1)} KB) — full logo with text`,
    );
  }
}

async function main() {
  await fs.mkdir(BRAND_DIR, { recursive: true });

  const sourceBuffer = await fs.readFile(SOURCE);
  const metadata = await sharp(sourceBuffer).metadata();
  console.log(`Source: ${SOURCE}`);
  console.log(
    `  size: ${metadata.width}x${metadata.height}, format: ${metadata.format}, channels: ${metadata.channels}`,
  );

  console.log("\nShark + ball variants (no text):");
  await generateSharkVariants(sourceBuffer);

  console.log("\nFull logo variants (with text):");
  await generateLogoVariants(sourceBuffer);

  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
