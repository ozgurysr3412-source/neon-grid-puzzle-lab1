const fs = require('node:fs');
const path = require('node:path');
const { PNG } = require('pngjs');

const RAW_DIR = path.join(__dirname, '..', 'assets', 'ui', 'shop', 'raw');
const OUT_DIR = path.join(__dirname, '..', 'assets', 'ui', 'shop');

const FILES = [
  { in: 'starter-pack.png', out: 'starter-pack-clean.png' },
  { in: 'value-pack.png', out: 'value-pack-clean.png' },
  { in: 'best-value-pack.png', out: 'best-value-pack-clean.png' },
  { in: 'big-pack.png', out: 'big-pack-clean.png' },
];

function idx(x, y, w) {
  return ((y * w) + x) << 2;
}

function sat(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === 0) return 0;
  return (max - min) / max;
}

function isBgLike(r, g, b) {
  const s = sat(r, g, b);
  const rg = Math.abs(r - g);
  const gb = Math.abs(g - b);
  const rb = Math.abs(r - b);
  const neutral = rg <= 16 && gb <= 16 && rb <= 16;
  const bright = r >= 120 && g >= 120 && b >= 120;
  const nearWhite = r >= 236 && g >= 236 && b >= 236;
  const checkerMid = r >= 160 && r <= 230 && g >= 160 && g <= 230 && b >= 160 && b <= 230;
  return (neutral && bright && s < 0.15) || nearWhite || (neutral && checkerMid);
}

function floodEraseBackground(png) {
  const { width: w, height: h, data } = png;
  const seen = new Uint8Array(w * h);
  const q = new Int32Array(w * h * 2);
  let head = 0;
  let tail = 0;

  function push(x, y) {
    const p = (y * w) + x;
    if (seen[p]) return;
    seen[p] = 1;
    q[tail++] = x;
    q[tail++] = y;
  }

  for (let x = 0; x < w; x += 1) {
    push(x, 0);
    push(x, h - 1);
  }
  for (let y = 0; y < h; y += 1) {
    push(0, y);
    push(w - 1, y);
  }

  while (head < tail) {
    const x = q[head++];
    const y = q[head++];
    const i = idx(x, y, w);
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    if (!isBgLike(r, g, b)) {
      continue;
    }

    data[i + 3] = 0;

    if (x > 0) push(x - 1, y);
    if (x < w - 1) push(x + 1, y);
    if (y > 0) push(x, y - 1);
    if (y < h - 1) push(x, y + 1);
  }
}

function trimToAlpha(png) {
  const { width: w, height: h, data } = png;
  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const a = data[idx(x, y, w) + 3];
      if (a <= 0) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }

  if (maxX < minX || maxY < minY) {
    return png;
  }

  const pad = 2;
  minX = Math.max(0, minX - pad);
  minY = Math.max(0, minY - pad);
  maxX = Math.min(w - 1, maxX + pad);
  maxY = Math.min(h - 1, maxY + pad);

  const outW = (maxX - minX) + 1;
  const outH = (maxY - minY) + 1;
  const out = new PNG({ width: outW, height: outH });

  for (let y = 0; y < outH; y += 1) {
    for (let x = 0; x < outW; x += 1) {
      const s = idx(minX + x, minY + y, w);
      const d = idx(x, y, outW);
      out.data[d] = data[s];
      out.data[d + 1] = data[s + 1];
      out.data[d + 2] = data[s + 2];
      out.data[d + 3] = data[s + 3];
    }
  }

  return out;
}

async function processOne(inputName, outputName) {
  const inputPath = path.join(RAW_DIR, inputName);
  const outputPath = path.join(OUT_DIR, outputName);

  await fs.promises.mkdir(OUT_DIR, { recursive: true });

  const png = await new Promise((resolve, reject) => {
    fs.createReadStream(inputPath)
      .pipe(new PNG())
      .on('parsed', function done() {
        resolve(this);
      })
      .on('error', reject);
  });

  floodEraseBackground(png);
  const trimmed = trimToAlpha(png);

  await new Promise((resolve, reject) => {
    trimmed
      .pack()
      .pipe(fs.createWriteStream(outputPath))
      .on('finish', resolve)
      .on('error', reject);
  });

  return outputPath;
}

(async () => {
  for (const file of FILES) {
    const out = await processOne(file.in, file.out);
    console.log(`cleaned: ${path.basename(out)}`);
  }
})();
