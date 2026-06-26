import path from "node:path";
import sharp from "sharp";

const SOURCE = path.resolve("public", "brand", "logo-original.png");
const DEST = path.resolve("public", "favicon.ico");
const SIZE = 32;

async function main() {
  const buf = await sharp(SOURCE)
    .resize({
      width: SIZE,
      height: SIZE,
      fit: "contain",
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    })
    .png()
    .toBuffer();

  await sharp(buf).toFile(DEST);
  const out = await sharp(DEST).metadata();
  console.log(`wrote ${DEST} (${out.width}x${out.height}, format: ${out.format})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
