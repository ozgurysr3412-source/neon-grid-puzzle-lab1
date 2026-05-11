const fs = require("node:fs");
const path = require("node:path");
const { PNG } = require("pngjs");

const BLOCK_DIR = path.join(__dirname, "..", "assets", "blocks");
const FILES = [
  "block-pink.png",
  "block-orange.png",
  "block-green.png",
  "block-blue.png",
  "block-purple.png",
];

function rgbToSaturation(r, g, b) {
  const max = Math.max(r, g, b) / 255;
  const min = Math.min(r, g, b) / 255;
  if (max === 0) {
    return 0;
  }
  return (max - min) / max;
}

function colorDistSq(r1, g1, b1, r2, g2, b2) {
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  return (dr * dr) + (dg * dg) + (db * db);
}

function getIndex(x, y, w) {
  return ((y * w) + x) << 2;
}

function sampleBorderMean(png) {
  const { width: w, height: h, data } = png;
  const margin = Math.max(2, Math.floor(Math.min(w, h) * 0.01));
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
      distSq <= (44 * 44) ||
      (sat < 0.15 && distSq <= (58 * 58))
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

    const i = getIndex(x, y, w);
    data[i + 3] = 0;

    if (x > 0) {
      push(x - 1, y);
    }
    if (x < w - 1) {
      push(x + 1, y);
    }
    if (y > 0) {
      push(x, y - 1);
    }
    if (y < h - 1) {
      push(x, y + 1);
    }
  }

  return visited;
}

function cropToAlphaBounds(png) {
  const { width: w, height: h, data } = png;
  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const a = data[getIndex(x, y, w) + 3];
      if (a > 0) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
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

function keepLargestOpaqueComponent(png) {
  const { width: w, height: h, data } = png;
  const labels = new Int32Array(w * h);
  let currentLabel = 1;
  const sizes = new Map();
  const queue = new Int32Array(w * h * 2);

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
      queue[tail] = x;
      queue[tail + 1] = y;
      tail += 2;
      labels[p] = currentLabel;
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

  if (!sizes.size) {
    return;
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

function processFile(fileName) {
  return new Promise((resolve, reject) => {
    const fullPath = path.join(BLOCK_DIR, fileName);
    fs.createReadStream(fullPath)
      .pipe(new PNG())
      .on("parsed", function parsed() {
        const bg = sampleBorderMean(this);
        floodFillBackground(this, bg);
        keepLargestOpaqueComponent(this);
        const cropped = cropToAlphaBounds(this);
        const outStream = fs.createWriteStream(fullPath);
        cropped
          .pack()
          .pipe(outStream)
          .on("finish", () => {
            resolve({
              fileName,
              width: cropped.width,
              height: cropped.height,
            });
          })
          .on("error", reject);
      })
      .on("error", reject);
  });
}

async function main() {
  const results = [];
  for (const fileName of FILES) {
    const result = await processFile(fileName);
    results.push(result);
  }
  console.log(JSON.stringify(results, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
