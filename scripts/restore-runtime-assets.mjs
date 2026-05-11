import { readFile, unlink, writeFile } from "node:fs/promises";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const mapPath = path.join(projectRoot, "scripts", "runtime-asset-optimization-map.json");

function replaceAll(haystack, needle, replacement) {
  return haystack.split(needle).join(replacement);
}

async function main() {
  if (!fs.existsSync(mapPath)) {
    console.log("[restore-runtime-assets] no optimization map found, nothing to restore.");
    return;
  }

  const map = JSON.parse(await readFile(mapPath, "utf8"));
  const replacements = Array.isArray(map.replacements) ? map.replacements : [];

  // Restore source references first.
  const fileToReplacements = new Map();
  for (const row of replacements) {
    if (!row?.file || !row?.from || !row?.to) continue;
    if (!fileToReplacements.has(row.file)) fileToReplacements.set(row.file, []);
    fileToReplacements.get(row.file).push(row);
  }

  let restoredFiles = 0;
  for (const [relFile, rows] of fileToReplacements.entries()) {
    const fullPath = path.join(projectRoot, relFile);
    if (!fs.existsSync(fullPath)) continue;
    const content = await readFile(fullPath, "utf8");
    let next = content;
    for (const row of rows) {
      next = replaceAll(next, row.to, row.from);
    }
    if (next !== content) {
      await writeFile(fullPath, next, "utf8");
      restoredFiles += 1;
    }
  }

  // Remove generated .webp files listed in the map.
  let removedFiles = 0;
  for (const item of map.convertedAssets || []) {
    const optimized = item?.optimized;
    if (!optimized) continue;
    const target = path.join(projectRoot, optimized);
    if (!fs.existsSync(target)) continue;
    await unlink(target).catch(() => {});
    removedFiles += 1;
  }

  await unlink(mapPath).catch(() => {});

  console.log(`[restore-runtime-assets] restored source refs in ${restoredFiles} file(s)`);
  console.log(`[restore-runtime-assets] removed ${removedFiles} generated webp file(s)`);
}

main().catch((error) => {
  console.error("[restore-runtime-assets] failed", error);
  process.exit(1);
});
