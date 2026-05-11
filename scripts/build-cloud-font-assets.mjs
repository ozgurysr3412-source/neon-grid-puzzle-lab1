import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';

const projectRoot = 'C:/Users/Ozgur72/Desktop/Yeni klasör/neon-grid-puzzle-lab';
const whitePath = 'C:/Users/Ozgur72/Downloads/Gemini_Generated_Image_17vajd17vajd17va.png';
const colorPath = 'C:/Users/Ozgur72/Downloads/Gemini_Generated_Image_r08buqr08buqr08b.png';
const outDir = path.join(projectRoot, 'assets/ui/cloud-font');
fs.mkdirSync(outDir, { recursive: true });

const whiteImg = PNG.sync.read(fs.readFileSync(whitePath));
const colorImg = PNG.sync.read(fs.readFileSync(colorPath));

const cols = [72, 410, 740, 1070, 1400, 1730, 2060, 2390];
const rows = [0, 402, 804, 1206];
const cellW = 280;
const cellH = 380;

const lettersGrid = [
  ['A','B','C','D','E','F','G','H'],
  ['I','J','K','L','M','N','O','P'],
  ['Q','R','S','T','U','V','W','X'],
  ['Y','Z','a','b','c','d','e','f'],
];

function sampleBg(png) {
  const pts = [[0,0],[png.width-1,0],[0,png.height-1],[png.width-1,png.height-1],[Math.floor(png.width/2),0],[Math.floor(png.width/2),png.height-1]];
  let r=0,g=0,b=0;
  for (const [x,y] of pts) {
    const i=(y*png.width+x)*4;
    r += png.data[i]; g += png.data[i+1]; b += png.data[i+2];
  }
  return {r:r/pts.length,g:g/pts.length,b:b/pts.length};
}

const bgWhite = sampleBg(whiteImg);
const bgColor = sampleBg(colorImg);

function crop(png, x, y, w, h) {
  const out = new PNG({ width: w, height: h });
  for (let yy=0; yy<h; yy++) {
    for (let xx=0; xx<w; xx++) {
      const sx = x + xx;
      const sy = y + yy;
      if (sx < 0 || sy < 0 || sx >= png.width || sy >= png.height) continue;
      const si = (sy * png.width + sx) * 4;
      const di = (yy * w + xx) * 4;
      out.data[di] = png.data[si];
      out.data[di+1] = png.data[si+1];
      out.data[di+2] = png.data[si+2];
      out.data[di+3] = png.data[si+3];
    }
  }
  return out;
}

function cleanToAlpha(png, bg, thr = 46) {
  const out = new PNG({ width: png.width, height: png.height });
  out.data.set(png.data);
  for (let i=0;i<out.data.length;i+=4) {
    const r=out.data[i], g=out.data[i+1], b=out.data[i+2];
    const d=Math.sqrt((r-bg.r)**2+(g-bg.g)**2+(b-bg.b)**2);
    if (d < thr) {
      out.data[i+3]=0;
    } else {
      const edge = Math.max(0, Math.min(1, (d-thr)/42));
      out.data[i+3] = Math.round(255 * edge);
    }
  }
  return out;
}

function trimAlpha(png, pad = 3) {
  let minX=png.width, minY=png.height, maxX=-1, maxY=-1;
  for (let y=0; y<png.height; y++) {
    for (let x=0; x<png.width; x++) {
      const i=(y*png.width+x)*4;
      if (png.data[i+3] > 6) {
        if (x<minX) minX=x;
        if (x>maxX) maxX=x;
        if (y<minY) minY=y;
        if (y>maxY) maxY=y;
      }
    }
  }
  if (maxX < minX || maxY < minY) {
    return new PNG({ width: 1, height: 1 });
  }
  minX = Math.max(0, minX - pad);
  minY = Math.max(0, minY - pad);
  maxX = Math.min(png.width - 1, maxX + pad);
  maxY = Math.min(png.height - 1, maxY + pad);
  return crop(png, minX, minY, maxX - minX + 1, maxY - minY + 1);
}

function alphaBlend(dst, src, offsetX, offsetY) {
  for (let y=0;y<src.height;y++) {
    for (let x=0;x<src.width;x++) {
      const dx = offsetX + x;
      const dy = offsetY + y;
      if (dx < 0 || dy < 0 || dx >= dst.width || dy >= dst.height) continue;
      const si = (y*src.width+x)*4;
      const di = (dy*dst.width+dx)*4;
      const sa = src.data[si+3]/255;
      if (sa <= 0) continue;
      const da = dst.data[di+3]/255;
      const outA = sa + da*(1-sa);
      const sr = src.data[si], sg=src.data[si+1], sb=src.data[si+2];
      const dr = dst.data[di], dg=dst.data[di+1], db=dst.data[di+2];
      dst.data[di] = Math.round((sr*sa + dr*da*(1-sa))/outA);
      dst.data[di+1] = Math.round((sg*sa + dg*da*(1-sa))/outA);
      dst.data[di+2] = Math.round((sb*sa + db*da*(1-sa))/outA);
      dst.data[di+3] = Math.round(outA*255);
    }
  }
}

function extractLetter(letter, source, bg, thresholdOverride = null) {
  for (let r=0;r<lettersGrid.length;r++) {
    const c = lettersGrid[r].indexOf(letter);
    if (c === -1) continue;
    const raw = crop(source, cols[c], rows[r], cellW, cellH);
    const threshold = Number.isFinite(thresholdOverride) ? thresholdOverride : (source === whiteImg ? 44 : 48);
    const clean = cleanToAlpha(raw, bg, threshold);
    return trimAlpha(clean, 4);
  }
  throw new Error(`Letter not found: ${letter}`);
}

function tintCloudLetter(srcPng, rgb) {
  const out = new PNG({ width: srcPng.width, height: srcPng.height });
  const rr = rgb.r, gg = rgb.g, bb = rgb.b;
  for (let i=0;i<srcPng.data.length;i+=4) {
    const a = srcPng.data[i+3];
    if (a === 0) continue;
    const lum = (srcPng.data[i] + srcPng.data[i+1] + srcPng.data[i+2]) / 765; // 0..1
    const bright = 0.65 + (lum * 0.5);
    out.data[i] = Math.max(0, Math.min(255, Math.round(rr * bright)));
    out.data[i+1] = Math.max(0, Math.min(255, Math.round(gg * bright)));
    out.data[i+2] = Math.max(0, Math.min(255, Math.round(bb * bright)));
    out.data[i+3] = a;
  }
  return out;
}

const needed = ['C','O','M','B','L','E','A','R'];
const whiteLetters = {};
const colorLetters = {};
const colorThresholdByLetter = {
  C: 46,
  O: 46,
  M: 30,
  B: 42,
  L: 44,
  E: 44,
  A: 44,
  R: 44,
};
for (const ch of needed) {
  whiteLetters[ch] = extractLetter(ch, whiteImg, bgWhite);
  colorLetters[ch] = extractLetter(ch, colorImg, bgColor, colorThresholdByLetter[ch]);
  PNG.sync.write(whiteLetters[ch]);
}

// Preserve full silhouette on the difficult M glyph while keeping colorful appearance.
colorLetters.M = tintCloudLetter(whiteLetters.M, { r: 212, g: 93, b: 220 });

function savePng(png, outPath) {
  fs.writeFileSync(outPath, PNG.sync.write(png));
}

function composeWord(word, map, outPath) {
  const letters = word.split('').map((ch)=>map[ch]);
  const spacing = 4;
  const maxH = Math.max(...letters.map((p)=>p.height));
  const width = letters.reduce((acc,p)=>acc+p.width,0) + spacing*(letters.length-1) + 8;
  const out = new PNG({ width, height: maxH + 8 });
  let x = 4;
  for (const letter of letters) {
    alphaBlend(out, letter, x, 4 + (maxH - letter.height));
    x += letter.width + spacing;
  }
  savePng(out, outPath);
}

for (const ch of needed) {
  savePng(whiteLetters[ch], path.join(outDir, `letter-white-${ch}.png`));
  savePng(colorLetters[ch], path.join(outDir, `letter-color-${ch}.png`));
}

composeWord('COMBO', whiteLetters, path.join(outDir, 'combo-cloud-white.png'));
composeWord('COMBO', colorLetters, path.join(outDir, 'combo-cloud-color.png'));
composeWord('CLEAR', whiteLetters, path.join(outDir, 'clear-cloud-white.png'));
composeWord('CLEAR', colorLetters, path.join(outDir, 'clear-cloud-color.png'));

console.log('cloud font assets built in', outDir);
