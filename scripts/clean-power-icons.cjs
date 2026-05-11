const fs = require("fs");
const path = require("path");
const { PNG } = require("pngjs");

const ROOT = path.resolve(__dirname, "..");
const INPUT_DIR = path.join(ROOT, "assets", "ui", "powers");

const FILES = [
  { input: "bag_raw.png", output: "bag_clean.png" },
  { input: "twist_raw.png", output: "twist_clean.png" },
  { input: "hammer_raw.png", output: "hammer_clean.png" },
  { input: "tnt_raw.png", output: "tnt_clean.png" },
  { input: "remix_raw.png", output: "remix_clean.png" },
];

function luminance(r, g, b) {
  return (r + g + b) / 3;
}

function saturation(r, g, b) {
  return Math.max(r, g, b) - Math.min(r, g, b);
}

function getPixel(png, x, y) {
  const idx = (y * png.width + x) * 4;
  return {
    idx,
    r: png.data[idx],
    g: png.data[idx + 1],
    b: png.data[idx + 2],
    a: png.data[idx + 3],
  };
}

function setAlpha(png, x, y, alpha) {
  const idx = (y * png.width + x) * 4;
  png.data[idx + 3] = alpha;
}

function collectBorderGrayLuminance(png) {
  const values = [];
  const pushIfGray = (x, y) => {
    const { r, g, b, a } = getPixel(png, x, y);
    if (a !== 255) {
      return;
    }
    const sat = saturation(r, g, b);
    if (sat <= 18) {
      values.push(luminance(r, g, b));
    }
  };

  for (let x = 0; x < png.width; x += 1) {
    pushIfGray(x, 0);
    pushIfGray(x, png.height - 1);
  }
  for (let y = 0; y < png.height; y += 1) {
    pushIfGray(0, y);
    pushIfGray(png.width - 1, y);
  }

  if (!values.length) {
    return { low: 128, high: 200 };
  }

  values.sort((a, b) => a - b);
  const pivot = Math.floor(values.length / 2);
  const low = values[Math.floor(pivot / 2)] ?? values[0];
  const high = values[Math.floor((pivot + values.length - 1) / 2)] ?? values[values.length - 1];
  return { low, high };
}

function isBackgroundPixel(pixel, low, high) {
  if (pixel.a !== 255) {
    return false;
  }
  const sat = saturation(pixel.r, pixel.g, pixel.b);
  if (sat > 30) {
    return false;
  }
  const lum = luminance(pixel.r, pixel.g, pixel.b);
  return Math.abs(lum - low) <= 42 || Math.abs(lum - high) <= 42;
}

function cleanFile(inputName, outputName) {
  const inputPath = path.join(INPUT_DIR, inputName);
  const outputPath = path.join(INPUT_DIR, outputName);
  const png = PNG.sync.read(fs.readFileSync(inputPath));
  const { low, high } = collectBorderGrayLuminance(png);
  const total = png.width * png.height;
  const visited = new Uint8Array(total);
  const mask = new Uint8Array(total);
  const queue = [];

  const push = (x, y) => {
    if (x < 0 || y < 0 || x >= png.width || y >= png.height) {
      return;
    }
    const index = y * png.width + x;
    if (visited[index]) {
      return;
    }
    visited[index] = 1;
    const pixel = getPixel(png, x, y);
    if (!isBackgroundPixel(pixel, low, high)) {
      return;
    }
    mask[index] = 1;
    queue.push(index);
  };

  for (let x = 0; x < png.width; x += 1) {
    push(x, 0);
    push(x, png.height - 1);
  }
  for (let y = 0; y < png.height; y += 1) {
    push(0, y);
    push(png.width - 1, y);
  }

  while (queue.length) {
    const current = queue.pop();
    const x = current % png.width;
    const y = Math.floor(current / png.width);
    push(x + 1, y);
    push(x - 1, y);
    push(x, y + 1);
    push(x, y - 1);
  }

  for (let i = 0; i < total; i += 1) {
    if (!mask[i]) {
      continue;
    }
    const x = i % png.width;
    const y = Math.floor(i / png.width);
    setAlpha(png, x, y, 0);
  }

  for (let y = 1; y < png.height - 1; y += 1) {
    for (let x = 1; x < png.width - 1; x += 1) {
      const idx = y * png.width + x;
      if (mask[idx]) {
        continue;
      }
      const pixel = getPixel(png, x, y);
      if (pixel.a !== 255) {
        continue;
      }
      const sat = saturation(pixel.r, pixel.g, pixel.b);
      if (sat > 45) {
        continue;
      }
      const lum = luminance(pixel.r, pixel.g, pixel.b);
      const nearBg = Math.abs(lum - low) <= 55 || Math.abs(lum - high) <= 55;
      if (!nearBg) {
        continue;
      }
      const neighbors = [
        (y - 1) * png.width + x,
        (y + 1) * png.width + x,
        y * png.width + (x - 1),
        y * png.width + (x + 1),
      ];
      if (neighbors.some((n) => mask[n])) {
        setAlpha(png, x, y, 0);
      }
    }
  }

  // Remove checker-style neutral pixels that can remain inside enclosed icon holes.
  // This is intentionally conservative and targets only low-saturation pixels
  // matching detected background luminance bands.
  for (let y = 0; y < png.height; y += 1) {
    for (let x = 0; x < png.width; x += 1) {
      const pixel = getPixel(png, x, y);
      if (pixel.a !== 255) {
        continue;
      }
      const sat = saturation(pixel.r, pixel.g, pixel.b);
      if (sat > 20) {
        continue;
      }
      const lum = luminance(pixel.r, pixel.g, pixel.b);
      const nearBg = Math.abs(lum - low) <= 52 || Math.abs(lum - high) <= 52;
      if (nearBg) {
        setAlpha(png, x, y, 0);
      }
    }
  }

  const visitedKeep = new Uint8Array(total);
  let biggest = null;
  const neighbors = (index) => {
    const x = index % png.width;
    const y = Math.floor(index / png.width);
    return [
      x > 0 ? index - 1 : -1,
      x < png.width - 1 ? index + 1 : -1,
      y > 0 ? index - png.width : -1,
      y < png.height - 1 ? index + png.width : -1,
    ];
  };

  for (let i = 0; i < total; i += 1) {
    if (visitedKeep[i]) {
      continue;
    }
    const a = png.data[(i * 4) + 3];
    if (a === 0) {
      visitedKeep[i] = 1;
      continue;
    }
    const stack = [i];
    visitedKeep[i] = 1;
    let count = 0;
    let minX = png.width;
    let minY = png.height;
    let maxX = 0;
    let maxY = 0;
    while (stack.length) {
      const current = stack.pop();
      const x = current % png.width;
      const y = Math.floor(current / png.width);
      count += 1;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      const next = neighbors(current);
      for (const n of next) {
        if (n < 0 || visitedKeep[n]) {
          continue;
        }
        const na = png.data[(n * 4) + 3];
        if (na === 0) {
          visitedKeep[n] = 1;
          continue;
        }
        visitedKeep[n] = 1;
        stack.push(n);
      }
    }
    if (!biggest || count > biggest.count) {
      biggest = { count, minX, minY, maxX, maxY };
    }
  }

  if (biggest) {
    const margin = 36;
    const keepMinX = Math.max(0, biggest.minX - margin);
    const keepMinY = Math.max(0, biggest.minY - margin);
    const keepMaxX = Math.min(png.width - 1, biggest.maxX + margin);
    const keepMaxY = Math.min(png.height - 1, biggest.maxY + margin);
    for (let y = 0; y < png.height; y += 1) {
      for (let x = 0; x < png.width; x += 1) {
        if (x >= keepMinX && x <= keepMaxX && y >= keepMinY && y <= keepMaxY) {
          continue;
        }
        setAlpha(png, x, y, 0);
      }
    }
  }

  let minX = png.width;
  let minY = png.height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < png.height; y += 1) {
    for (let x = 0; x < png.width; x += 1) {
      const a = png.data[(y * png.width + x) * 4 + 3];
      if (a === 0) {
        continue;
      }
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }

  let outputPng = png;
  if (maxX >= minX && maxY >= minY) {
    const pad = 8;
    const cropX = Math.max(0, minX - pad);
    const cropY = Math.max(0, minY - pad);
    const cropW = Math.min(png.width - cropX, (maxX - minX + 1) + (pad * 2));
    const cropH = Math.min(png.height - cropY, (maxY - minY + 1) + (pad * 2));
    const cropped = new PNG({ width: cropW, height: cropH });
    PNG.bitblt(png, cropped, cropX, cropY, cropW, cropH, 0, 0);
    outputPng = cropped;
  }

  fs.writeFileSync(outputPath, PNG.sync.write(outputPng));

  let transparent = 0;
  for (let i = 3; i < outputPng.data.length; i += 4) {
    if (outputPng.data[i] === 0) {
      transparent += 1;
    }
  }
  const outputTotal = outputPng.width * outputPng.height;
  console.log(`${outputName}: ${outputPng.width}x${outputPng.height} transparent ${transparent}/${outputTotal}`);
}

for (const file of FILES) {
  cleanFile(file.input, file.output);
}
