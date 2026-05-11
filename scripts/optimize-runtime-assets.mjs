import { readFile, writeFile, stat } from "node:fs/promises";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const sourceRoots = ["src", "styles", "index.html"].map((p) => path.join(projectRoot, p));
const mapPath = path.join(projectRoot, "scripts", "runtime-asset-optimization-map.json");

const EXCLUDED_ASSETS = new Set([
  "./assets/logo.png",
  "./assets/icons/icon-180.png",
]);

function walkFiles(startPath, out = []) {
  const st = fs.statSync(startPath);
  if (st.isFile()) {
    out.push(startPath);
    return out;
  }
  for (const entry of fs.readdirSync(startPath, { withFileTypes: true })) {
    const full = path.join(startPath, entry.name);
    if (entry.isDirectory()) {
      walkFiles(full, out);
    } else if (/\.(js|css|html)$/i.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

function listSourceFiles() {
  const files = [];
  for (const src of sourceRoots) {
    if (!fs.existsSync(src)) continue;
    walkFiles(src, files);
  }
  return files;
}

function collectRuntimeAssets(fileContent) {
  const regex = /["'](\.\/assets\/[^"']+\.(?:png|jpg|jpeg))(\?v=[^"']*)?["']/g;
  const items = [];
  let match;
  while ((match = regex.exec(fileContent))) {
    items.push({
      fullMatch: match[0],
      rawPath: match[1],
      query: match[2] || "",
    });
  }
  return items;
}

function profileForAsset(assetPath) {
  const normalized = assetPath.replace(/\\/g, "/");
  if (normalized.includes("/assets/blocks/")) {
    return { quality: 92, alphaQuality: 96, effort: 6, maxDim: 640 };
  }
  if (normalized.includes("/assets/ui/shop/")) {
    return { quality: 88, alphaQuality: 94, effort: 6, maxDim: 1280 };
  }
  if (normalized.includes("/assets/icons/approval")) {
    return { quality: 92, alphaQuality: 98, effort: 6, maxDim: 512 };
  }
  if (normalized.includes("/assets/ui/badges/")) {
    return { quality: 90, alphaQuality: 96, effort: 6, maxDim: 768 };
  }
  if (normalized.includes("/assets/ui/cloud-font/")) {
    return { quality: 95, alphaQuality: 99, effort: 6, maxDim: 1024 };
  }
  if (normalized.includes("/assets/ui/powers/")) {
    return { quality: 90, alphaQuality: 96, effort: 6, maxDim: 768 };
  }
  if (normalized.includes("/assets/ui/journey/")) {
    return { quality: 90, alphaQuality: 96, effort: 6, maxDim: 1024 };
  }
  return { quality: 88, alphaQuality: 94, effort: 6, maxDim: 1024 };
}

async function ensureWebpVersion(assetPath) {
  const sourceAbs = path.join(projectRoot, assetPath);
  const parsed = path.parse(sourceAbs);
  const webpAbs = path.join(parsed.dir, `${parsed.name}.webp`);
  const sourceStat = await stat(sourceAbs);
  const webpExists = fs.existsSync(webpAbs);
  if (webpExists) {
    const webpStat = await stat(webpAbs);
    if (webpStat.mtimeMs >= sourceStat.mtimeMs) {
      return { sourceAbs, webpAbs, converted: false, sourceBytes: sourceStat.size, webpBytes: webpStat.size };
    }
  }

  const profile = profileForAsset(assetPath);
  const image = sharp(sourceAbs, { animated: false, failOn: "none" });
  const meta = await image.metadata();
  const width = Number(meta.width || 0);
  const height = Number(meta.height || 0);
  let pipeline = image;
  if (width > profile.maxDim || height > profile.maxDim) {
    pipeline = pipeline.resize({
      width: profile.maxDim,
      height: profile.maxDim,
      fit: "inside",
      withoutEnlargement: true,
      kernel: sharp.kernel.lanczos3,
    });
  }
  await pipeline.webp({
    quality: profile.quality,
    alphaQuality: profile.alphaQuality,
    effort: profile.effort,
    smartSubsample: true,
  }).toFile(webpAbs);

  const webpStat = await stat(webpAbs);
  return { sourceAbs, webpAbs, converted: true, sourceBytes: sourceStat.size, webpBytes: webpStat.size };
}

function replaceRef(content, fromPathWithQuery, toPathWithQuery) {
  return content.split(fromPathWithQuery).join(toPathWithQuery);
}

async function main() {
  const files = listSourceFiles();
  const runtimeAssets = new Map();
  const fileAssets = new Map();

  for (const filePath of files) {
    const content = await readFile(filePath, "utf8");
    const items = collectRuntimeAssets(content);
    fileAssets.set(filePath, items);
    for (const item of items) {
      if (EXCLUDED_ASSETS.has(item.rawPath)) continue;
      runtimeAssets.set(item.rawPath, true);
    }
  }

  const converted = [];
  for (const rawPath of runtimeAssets.keys()) {
    const absPath = path.join(projectRoot, rawPath);
    if (!fs.existsSync(absPath)) continue;
    const result = await ensureWebpVersion(rawPath);
    const sourceExt = path.extname(rawPath);
    const webpPath = rawPath.slice(0, -sourceExt.length) + ".webp";
    converted.push({
      source: rawPath,
      optimized: webpPath,
      sourceBytes: result.sourceBytes,
      optimizedBytes: result.webpBytes,
      converted: result.converted,
    });
  }

  const modifiedFiles = [];
  const replacements = [];
  for (const filePath of files) {
    const original = await readFile(filePath, "utf8");
    let next = original;
    const items = fileAssets.get(filePath) || [];
    for (const item of items) {
      const found = converted.find((c) => c.source === item.rawPath);
      if (!found) continue;
      const from = `${item.rawPath}${item.query}`;
      const to = `${found.optimized}${item.query}`;
      if (from === to) continue;
      if (next.includes(from)) {
        next = replaceRef(next, from, to);
        replacements.push({
          file: path.relative(projectRoot, filePath).replace(/\\/g, "/"),
          from,
          to,
        });
      }
    }
    if (next !== original) {
      await writeFile(filePath, next, "utf8");
      modifiedFiles.push(path.relative(projectRoot, filePath).replace(/\\/g, "/"));
    }
  }

  const totalSourceBytes = converted.reduce((sum, row) => sum + row.sourceBytes, 0);
  const totalOptimizedBytes = converted.reduce((sum, row) => sum + row.optimizedBytes, 0);
  const savedBytes = Math.max(0, totalSourceBytes - totalOptimizedBytes);
  const savedPct = totalSourceBytes > 0 ? (savedBytes / totalSourceBytes) * 100 : 0;

  const mapPayload = {
    generatedAt: new Date().toISOString(),
    convertedAssets: converted,
    modifiedFiles,
    replacements,
    summary: {
      convertedCount: converted.length,
      totalSourceBytes,
      totalOptimizedBytes,
      savedBytes,
      savedPct,
    },
  };
  await writeFile(mapPath, JSON.stringify(mapPayload, null, 2), "utf8");

  const mb = (n) => (n / (1024 * 1024)).toFixed(2);
  console.log(`[optimize-runtime-assets] converted: ${converted.length}`);
  console.log(`[optimize-runtime-assets] source: ${mb(totalSourceBytes)} MB`);
  console.log(`[optimize-runtime-assets] webp:   ${mb(totalOptimizedBytes)} MB`);
  console.log(`[optimize-runtime-assets] saved:  ${mb(savedBytes)} MB (${savedPct.toFixed(1)}%)`);
  console.log(`[optimize-runtime-assets] map: ${path.relative(projectRoot, mapPath).replace(/\\/g, "/")}`);
}

main().catch((error) => {
  console.error("[optimize-runtime-assets] failed", error);
  process.exit(1);
});
