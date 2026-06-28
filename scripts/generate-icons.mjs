import { promises as fs } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const BRAND_DIR = path.resolve("public", "brand");
const SOURCE = path.join(BRAND_DIR, "logo.webp");

const WHITE = { r: 255, g: 255, b: 255, alpha: 1 };

const TARGETS = [
  { name: "icon-192.png", size: 192, fit: "contain", maskable: false },
  { name: "icon-512.png", size: 512, fit: "contain", maskable: false },
  { name: "icon-maskable-512.png", size: 512, fit: "contain", maskable: true },
];

const SAFE_ZONE_RATIO = 0.4;

async function main() {
  await fs.mkdir(BRAND_DIR, { recursive: true });

  const sourceBuffer = await fs.readFile(SOURCE);
  const metadata = await sharp(sourceBuffer).metadata();
  console.log(`Source: ${SOURCE}`);
  console.log(
    `  size: ${metadata.width}x${metadata.height}, format: ${metadata.format}, channels: ${metadata.channels}`
  );

  for (const target of TARGETS) {
    const dest = path.join(BRAND_DIR, target.name);

    if (target.maskable) {
      const innerSize = Math.round(target.size * SAFE_ZONE_RATIO);
      const innerBuffer = await sharp(sourceBuffer)
        .resize({
          width: innerSize,
          height: innerSize,
          fit: "contain",
          background: WHITE,
        })
        .png()
        .toBuffer();

      await sharp({
        create: {
          width: target.size,
          height: target.size,
          channels: 4,
          background: WHITE,
        },
      })
        .composite([{ input: innerBuffer, gravity: "center" }])
        .png()
        .toFile(dest);
    } else {
      await sharp(sourceBuffer)
        .resize({
          width: target.size,
          height: target.size,
          fit: "contain",
          background: WHITE,
        })
        .png()
        .toFile(dest);
    }

    const outMeta = await sharp(dest).metadata();
    console.log(
      `  wrote ${target.name} (${outMeta.width}x${outMeta.height}, ${
        target.maskable
          ? `logo in 40% safe zone on ${target.size}px canvas`
          : `logo contained in ${target.size}px canvas`
      })`
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
