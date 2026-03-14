#!/usr/bin/env node
/**
 * PNG フレーム群からアニメーション GIF を生成する。
 * 使い方: node scripts/make-gif.js <TC名> [delayMs]
 * 例:     node scripts/make-gif.js TC-001_user_create 1200
 */
const GifEncoder = require("gif-encoder-2");
const { PNG } = require("pngjs");
const fs = require("fs");
const path = require("path");

const tc = process.argv[2];
const delay = Number(process.argv[3] ?? 1200);

if (!tc) {
  console.error("Usage: node make-gif.js <TC-name> [delayMs]");
  process.exit(1);
}

const framesDir = path.join(__dirname, "../docs/videos/frames", tc);
const outputFile = path.join(__dirname, "../docs/videos", tc + ".gif");

if (!fs.existsSync(framesDir)) {
  console.error("フレームディレクトリが見つかりません:", framesDir);
  process.exit(1);
}

const files = fs
  .readdirSync(framesDir)
  .filter((f) => f.endsWith(".png"))
  .sort();

if (!files.length) {
  console.error("PNG フレームがありません:", framesDir);
  process.exit(1);
}

const first = PNG.sync.read(fs.readFileSync(path.join(framesDir, files[0])));
const { width, height } = first;

const encoder = new GifEncoder(width, height, "neuquant", true);
encoder.setDelay(delay);
encoder.setRepeat(0);
encoder.setQuality(10);

const out = fs.createWriteStream(outputFile);
encoder.createReadStream().pipe(out);
encoder.start();

for (const f of files) {
  const png = PNG.sync.read(fs.readFileSync(path.join(framesDir, f)));
  encoder.addFrame(png.data);
}

encoder.finish();

out.on("finish", () => {
  const kb = Math.round(fs.statSync(outputFile).size / 1024);
  console.log(`✅ ${outputFile}  (${files.length} frames, ${width}x${height}, ${kb} KB)`);
});
