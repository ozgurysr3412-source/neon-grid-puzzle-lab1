import fs from "node:fs";
import path from "node:path";
import { PNG } from "pngjs";

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function idxOf(x, y, w) {
  return (y * w + x) * 4;
}

function rgbDistance(r, g, b, c) {
  const dr = r - c.r;
  const dg = g - c.g;
  const db = b - c.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

function saturation(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max <= 0) return 0;
  return (max - min) / max;
}

function nearestCluster(r, g, b, clusters) {
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < clusters.length; i += 1) {
    const d = rgbDistance(r, g, b, clusters[i]);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  }
  return { index: best, distance: bestDist };
}

function runKMeans2(samples, iterations = 14) {
  const seedA = samples[0];
  const seedB = samples[Math.floor(samples.length * 0.66)];
  let c1 = { ...seedA };
  let c2 = { ...seedB };

  for (let iter = 0; iter < iterations; iter += 1) {
    let s1r = 0;
    let s1g = 0;
    let s1b = 0;
    let n1 = 0;
    let s2r = 0;
    let s2g = 0;
    let s2b = 0;
    let n2 = 0;

    for (const p of samples) {
      const d1 = rgbDistance(p.r, p.g, p.b, c1);
      const d2 = rgbDistance(p.r, p.g, p.b, c2);
      if (d1 <= d2) {
        s1r += p.r;
        s1g += p.g;
        s1b += p.b;
        n1 += 1;
      } else {
        s2r += p.r;
        s2g += p.g;
        s2b += p.b;
        n2 += 1;
      }
    }

    if (n1 > 0) {
      c1 = { r: s1r / n1, g: s1g / n1, b: s1b / n1 };
    }
    if (n2 > 0) {
      c2 = { r: s2r / n2, g: s2g / n2, b: s2b / n2 };
    }
  }
  return [c1, c2];
}

function collectEdgeSamples(data, w, h) {
  const samples = [];
  const push = (x, y) => {
    const i = idxOf(x, y, w);
    const a = data[i + 3];
    if (a < 220) return;
    samples.push({ r: data[i], g: data[i + 1], b: data[i + 2] });
  };

  for (let x = 0; x < w; x++) {
    push(x, 0);
    push(x, h - 1);
  }
  for (let y = 1; y < h - 1; y++) {
    push(0, y);
    push(w - 1, y);
  }
  return samples;
}

function floodBackgroundMask(data, w, h, clusters) {
  const visited = new Uint8Array(w * h);
  const bgMask = new Uint8Array(w * h);
  const qx = new Int32Array(w * h);
  const qy = new Int32Array(w * h);
  let head = 0;
  let tail = 0;

  const maybeBg = (x, y) => {
    const i = idxOf(x, y, w);
    const a = data[i + 3];
    if (a < 200) return true;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const value = Math.max(r, g, b);
    const s = saturation(r, g, b);
    const { distance } = nearestCluster(r, g, b, clusters);
    return (
      distance < 30 ||
      (distance < 60 && s < 0.3) ||
      (s < 0.2 && value > 100) ||
      (distance < 95 && s < 0.38)
    );
  };

  const enqueue = (x, y) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const k = y * w + x;
    if (visited[k]) return;
    visited[k] = 1;
    qx[tail] = x;
    qy[tail] = y;
    tail += 1;
  };

  for (let x = 0; x < w; x++) {
    enqueue(x, 0);
    enqueue(x, h - 1);
  }
  for (let y = 1; y < h - 1; y++) {
    enqueue(0, y);
    enqueue(w - 1, y);
  }

  while (head < tail) {
    const x = qx[head];
    const y = qy[head];
    head += 1;
    if (!maybeBg(x, y)) continue;
    const k = y * w + x;
    bgMask[k] = 1;
    enqueue(x + 1, y);
    enqueue(x - 1, y);
    enqueue(x, y + 1);
    enqueue(x, y - 1);
  }

  return bgMask;
}

function cleanImage(png, clusters) {
  const { width: w, height: h, data } = png;
  const src = Buffer.from(data);
  const bgMask = floodBackgroundMask(data, w, h, clusters);
  const menuBg = { r: 42, g: 36, b: 80 };

  let bgCleared = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const k = y * w + x;
      if (!bgMask[k]) continue;
      const i = idxOf(x, y, w);
      if (data[i + 3] !== 0 || data[i] !== menuBg.r || data[i + 1] !== menuBg.g || data[i + 2] !== menuBg.b) {
        bgCleared += 1;
      }
      data[i] = menuBg.r;
      data[i + 1] = menuBg.g;
      data[i + 2] = menuBg.b;
      data[i + 3] = 0;
    }
  }

  let fringeAdjusted = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const k = y * w + x;
      if (bgMask[k]) continue;
      const i = idxOf(x, y, w);
      const a = data[i + 3];
      if (a <= 0) continue;

      let touchingBg = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          if (bgMask[(y + dy) * w + (x + dx)]) touchingBg += 1;
        }
      }
      if (touchingBg === 0) continue;

      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const s = saturation(r, g, b);
      const { distance } = nearestCluster(r, g, b, clusters);
      if (distance > 65 || s > 0.35) continue;

      const newAlpha = Math.round(clamp(((distance - 8) / 44) * 255, 0, a));
      if (newAlpha < a) {
        data[i + 3] = newAlpha;
      }
      if (s < 0.2) {
        data[i] = Math.round(r * 0.65 + menuBg.r * 0.35);
        data[i + 1] = Math.round(g * 0.65 + menuBg.g * 0.35);
        data[i + 2] = Math.round(b * 0.65 + menuBg.b * 0.35);
      }
      fringeAdjusted += 1;
    }
  }

  // Final pass: remove bright edge halos left from checkerboard compositing.
  let haloCleared = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = idxOf(x, y, w);
      const a = data[i + 3];
      if (a <= 0) continue;

      let touchingTransparent = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const ni = idxOf(x + dx, y + dy, w);
          if (data[ni + 3] === 0) touchingTransparent += 1;
        }
      }
      if (touchingTransparent === 0) continue;

      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const s = saturation(r, g, b);
      const value = Math.max(r, g, b);
      const avg = (r + g + b) / 3;

      // Kill tiny noisy edge fragments.
      if (a < 18) {
        data[i] = menuBg.r;
        data[i + 1] = menuBg.g;
        data[i + 2] = menuBg.b;
        data[i + 3] = 0;
        haloCleared += 1;
        continue;
      }

      // Remove low-saturation bright fringes around the silhouette.
      if ((avg > 224 && s < 0.26 && touchingTransparent >= 2) || (value > 242 && s < 0.22)) {
        data[i] = menuBg.r;
        data[i + 1] = menuBg.g;
        data[i + 2] = menuBg.b;
        data[i + 3] = 0;
        haloCleared += 1;
      }
    }
  }

  // Recovery pass: restore accidentally removed vivid foreground edge pixels
  // (e.g. podium top under avatars) while keeping checkerboard bg removed.
  let restoredPixels = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = idxOf(x, y, w);
      if (data[i + 3] !== 0) continue;

      const sr = src[i];
      const sg = src[i + 1];
      const sb = src[i + 2];
      const ss = saturation(sr, sg, sb);
      const { distance: srcClusterDistance } = nearestCluster(sr, sg, sb, clusters);

      // Candidate must look like colorful foreground, not checker bg.
      if (ss < 0.33 && srcClusterDistance < 78) continue;

      let opaqueNeighbors = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const ni = idxOf(x + dx, y + dy, w);
          if (data[ni + 3] > 0) opaqueNeighbors += 1;
        }
      }
      if (opaqueNeighbors < 2) continue;

      data[i] = sr;
      data[i + 1] = sg;
      data[i + 2] = sb;
      data[i + 3] = 255;
      restoredPixels += 1;
    }
  }

  return { bgCleared, fringeAdjusted, haloCleared, restoredPixels };
}

function cropToAlpha(png, pad = 0) {
  const { width: w, height: h, data } = png;
  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = idxOf(x, y, w);
      if (data[i + 3] > 0) {
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

  minX = clamp(minX - pad, 0, w - 1);
  minY = clamp(minY - pad, 0, h - 1);
  maxX = clamp(maxX + pad, 0, w - 1);
  maxY = clamp(maxY + pad, 0, h - 1);

  const cw = maxX - minX + 1;
  const ch = maxY - minY + 1;
  const out = new PNG({ width: cw, height: ch });
  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      const srcI = idxOf(minX + x, minY + y, w);
      const dstI = idxOf(x, y, cw);
      out.data[dstI] = data[srcI];
      out.data[dstI + 1] = data[srcI + 1];
      out.data[dstI + 2] = data[srcI + 2];
      out.data[dstI + 3] = data[srcI + 3];
    }
  }
  return out;
}

function readPng(filePath) {
  return PNG.sync.read(fs.readFileSync(filePath));
}

function writePng(filePath, png) {
  fs.writeFileSync(filePath, PNG.sync.write(png));
}

function main() {
  const input = process.argv[2];
  const outFull = process.argv[3];
  const outCrop = process.argv[4];
  if (!input || !outFull || !outCrop) {
    console.error("Usage: node scripts/cleanup-podium-transparent.mjs <input.png> <out-full.png> <out-crop.png>");
    process.exit(1);
  }

  const png = readPng(input);
  const edgeSamples = collectEdgeSamples(png.data, png.width, png.height);
  if (edgeSamples.length < 100) {
    console.error("Not enough edge samples to detect checker background.");
    process.exit(2);
  }
  const clusters = runKMeans2(edgeSamples);
  const stats = cleanImage(png, clusters);
  writePng(outFull, png);

  const cropped = cropToAlpha(png, 2);
  writePng(outCrop, cropped);

  const relativeInput = path.basename(input);
  console.log(JSON.stringify({
    source: relativeInput,
    size: { width: png.width, height: png.height },
    clusters,
    stats,
    outputs: {
      full: outFull,
      crop: outCrop,
    },
  }, null, 2));
}

main();
