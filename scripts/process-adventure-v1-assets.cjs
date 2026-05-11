const fs = require("node:fs");
const path = require("node:path");
const { PNG } = require("pngjs");

const SRC_DIR = path.join(__dirname, "..", "assets", "adventure", "raw");
const OUT_DIR = path.join(__dirname, "..", "assets", "adventure", "processed");

const FILES = [
  { in: "icon-blue-diamond.png", out: "icon-blue.png", max: 360 },
  { in: "icon-yellow-star.png", out: "icon-yellow.png", max: 360 },
  { in: "icon-red-new.png", out: "icon-red.png", max: 360 },
  { in: "objective-base-gold.png", out: "objective-base.png", max: 320 },
  { in: "tile-blue-objective.png", out: "tile-blue.png", max: 260 },
  { in: "tile-yellow-objective.png", out: "tile-yellow.png", max: 260 },
  { in: "tile-red-objective.png", out: "tile-red.png", max: 260 },
];

function getIndex(x, y, w) {
  return ((y * w) + x) << 2;
}

function colorDistSq(r1, g1, b1, r2, g2, b2) {
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  return (dr * dr) + (dg * dg) + (db * db);
}

function rgbToSaturation(r, g, b) {
  const max = Math.max(r, g, b) / 255;
  const min = Math.min(r, g, b) / 255;
  if (max === 0) {
    return 0;
  }
  return (max - min) / max;
}

function sampleBorderMean(png) {
  const { width: w, height: h, data } = png;
  const margin = Math.max(3, Math.floor(Math.min(w, h) * 0.018));
  let sumR = 0;
  let sumG = 0;
  let sumB = 0;
  let count = 0;

  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      if (x < margin || y < margin || x >= (w - margin) || y >= (h - margin)) {
        const i = getIndex(x, y, w);
        sumR += data[i];
        sumG += data[i + 1];
        sumB += data[i + 2];
        count += 1;
      }
    }
  }

  return {
    r: sumR / count,
    g: sumG / count,
    b: sumB / count,
  };
}

function floodFillBackground(png, bg) {
  const { width: w, height: h, data } = png;
  const visited = new Uint8Array(w * h);
  const queue = new Int32Array(w * h * 2);
  let head = 0;
  let tail = 0;

  function push(x, y) {
    const p = (y * w) + x;
    if (visited[p]) {
      return;
    }
    visited[p] = 1;
    queue[tail] = x;
    queue[tail + 1] = y;
    tail += 2;
  }

  function isBackgroundLike(x, y) {
    const i = getIndex(x, y, w);
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const sat = rgbToSaturation(r, g, b);
    const distSq = colorDistSq(r, g, b, bg.r, bg.g, bg.b);
    return (
      distSq <= (58 * 58) ||
      (sat < 0.2 && distSq <= (74 * 74))
    );
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
    const x = queue[head];
    const y = queue[head + 1];
    head += 2;

    if (!isBackgroundLike(x, y)) {
      continue;
    }

    data[getIndex(x, y, w) + 3] = 0;

    if (x > 0) push(x - 1, y);
    if (x < w - 1) push(x + 1, y);
    if (y > 0) push(x, y - 1);
    if (y < h - 1) push(x, y + 1);
  }
}

function keepLargestOpaqueComponent(png) {
  const { width: w, height: h, data } = png;
  const labels = new Int32Array(w * h);
  const queue = new Int32Array(w * h * 2);
  let currentLabel = 1;
  const sizes = new Map();

  function alphaAt(x, y) {
    return data[getIndex(x, y, w) + 3];
  }

  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const p = (y * w) + x;
      if (labels[p] !== 0 || alphaAt(x, y) === 0) {
        continue;
      }
      let head = 0;
      let tail = 0;
      labels[p] = currentLabel;
      queue[tail] = x;
      queue[tail + 1] = y;
      tail += 2;
      let size = 0;

      while (head < tail) {
        const cx = queue[head];
        const cy = queue[head + 1];
        head += 2;
        size += 1;
        const neighbors = [
          [cx - 1, cy],
          [cx + 1, cy],
          [cx, cy - 1],
          [cx, cy + 1],
        ];
        for (const [nx, ny] of neighbors) {
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) {
            continue;
          }
          const np = (ny * w) + nx;
          if (labels[np] !== 0 || alphaAt(nx, ny) === 0) {
            continue;
          }
          labels[np] = currentLabel;
          queue[tail] = nx;
          queue[tail + 1] = ny;
          tail += 2;
        }
      }
      sizes.set(currentLabel, size);
      currentLabel += 1;
    }
  }

  let largestLabel = 1;
  let largestSize = -1;
  for (const [label, size] of sizes.entries()) {
    if (size > largestSize) {
      largestSize = size;
      largestLabel = label;
    }
  }

  for (let p = 0; p < labels.length; p += 1) {
    if (labels[p] !== 0 && labels[p] !== largestLabel) {
      data[(p << 2) + 3] = 0;
    }
  }
}

function cropToAlphaBounds(png) {
  const { width: w, height: h, data } = png;
  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      if (data[getIndex(x, y, w) + 3] > 0) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
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

  const newW = (maxX - minX) + 1;
  const newH = (maxY - minY) + 1;
  const out = new PNG({ width: newW, height: newH });
  for (let y = 0; y < newH; y += 1) {
    for (let x = 0; x < newW; x += 1) {
      const srcI = getIndex(minX + x, minY + y, w);
      const dstI = getIndex(x, y, newW);
      out.data[dstI] = data[srcI];
      out.data[dstI + 1] = data[srcI + 1];
      out.data[dstI + 2] = data[srcI + 2];
      out.data[dstI + 3] = data[srcI + 3];
    }
  }
  return out;
}

function resizeToMax(png, maxDim) {
  const { width, height } = png;
  const largest = Math.max(width, height);
  if (largest <= maxDim) {
    return png;
  }
  const scale = maxDim / largest;
  const outW = Math.max(1, Math.round(width * scale));
  const outH = Math.max(1, Math.round(height * scale));
  const out = new PNG({ width: outW, height: outH });

  function bilinearAt(srcX, srcY, channelOffset) {
    const x0 = Math.floor(srcX);
    const y0 = Math.floor(srcY);
    const x1 = Math.min(width - 1, x0 + 1);
    const y1 = Math.min(height - 1, y0 + 1);
    const dx = srcX - x0;
    const dy = srcY - y0;

    const i00 = getIndex(x0, y0, width) + channelOffset;
    const i10 = getIndex(x1, y0, width) + channelOffset;
    const i01 = getIndex(x0, y1, width) + channelOffset;
    const i11 = getIndex(x1, y1, width) + channelOffset;

    const top = png.data[i00] + ((png.data[i10] - png.data[i00]) * dx);
    const bottom = png.data[i01] + ((png.data[i11] - png.data[i01]) * dx);
    return top + ((bottom - top) * dy);
  }

  for (let y = 0; y < outH; y += 1) {
    for (let x = 0; x < outW; x += 1) {
      const srcX = Math.max(0, Math.min(width - 1, ((x + 0.5) / scale) - 0.5));
      const srcY = Math.max(0, Math.min(height - 1, ((y + 0.5) / scale) - 0.5));
      const dstI = getIndex(x, y, outW);
      out.data[dstI] = Math.round(bilinearAt(srcX, srcY, 0));
      out.data[dstI + 1] = Math.round(bilinearAt(srcX, srcY, 1));
      out.data[dstI + 2] = Math.round(bilinearAt(srcX, srcY, 2));
      out.data[dstI + 3] = Math.round(bilinearAt(srcX, srcY, 3));
    }
  }
  return out;
}

function processOne(file) {
  return new Promise((resolve, reject) => {
    const srcPath = path.join(SRC_DIR, file.in);
    const outPath = path.join(OUT_DIR, file.out);
    fs.createReadStream(srcPath)
      .pipe(new PNG())
      .on("parsed", function parsed() {
        const bg = sampleBorderMean(this);
        floodFillBackground(this, bg);
        keepLargestOpaqueComponent(this);
        const cropped = cropToAlphaBounds(this);
        const resized = resizeToMax(cropped, file.max);
        resized.pack()
          .pipe(fs.createWriteStream(outPath))
          .on("finish", () => {
            resolve({ name: file.out, width: resized.width, height: resized.height });
          })
          .on("error", reject);
      })
      .on("error", reject);
  });
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const results = [];
  for (const file of FILES) {
    // eslint-disable-next-line no-await-in-loop
    results.push(await processOne(file));
  }
  console.log(JSON.stringify(results, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
