import { cp, mkdir, readFile, rm } from "node:fs/promises";
import { execFile } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const distDir = path.join(projectRoot, "dist");
const optimizationMapPath = path.join(projectRoot, "scripts", "runtime-asset-optimization-map.json");
const execFileAsync = promisify(execFile);
const criticalRuntimeFiles = ["src/ui/localization.js"];

const copyTargets = [
  "index.html",
  "manifest.webmanifest",
  "sw.js",
  "styles",
  "src",
  "assets",
];

function shouldSkipSourceOnlyAsset(relPath) {
  if (!relPath.startsWith("assets/")) {
    return false;
  }

  // Source-only folders never loaded at runtime.
  if (relPath.includes("/raw/") || relPath.includes("/source/") || relPath.includes("/work/")) {
    return true;
  }

  // Backup/export scratch files left from art iterations.
  if (/\.(bak|tmp)$/i.test(relPath)) {
    return true;
  }
  if (/\.backup\d*\.[a-z0-9]+$/i.test(relPath)) {
    return true;
  }
  if (/\.preclean\d*\.bak$/i.test(relPath)) {
    return true;
  }
  if (/\.candidate\.[a-z0-9]+$/i.test(relPath)) {
    return true;
  }
  if (/\.before-[^/]+\.[a-z0-9]+$/i.test(relPath)) {
    return true;
  }

  // Explicit source snapshots / non-runtime variants.
  if (/(^|\/)(copy|backup|source|work|draft|preview|candidate)-[^/]+\.(png|jpe?g|webp)$/i.test(relPath)) {
    return true;
  }
  if (/^assets\/ui\/leaderboard\/.+(backup|candidate|preview|work|tmp|before-|sourcecopy|seamfix)/i.test(relPath)) {
    return true;
  }
  if (/^assets\/ui\/leaderboard\/.+\.png$/i.test(relPath)) {
    return true;
  }
  if (/^assets\/ui\/badges\/.+(backup|preclean|preview)/i.test(relPath)) {
    return true;
  }
  if (/^assets\/adventure\/cores\/.+\.(png)$/i.test(relPath)) {
    return true;
  }
  if (/^assets\/icons\/approval-(gold|white)\.png$/i.test(relPath)) {
    return true;
  }

  // Keep only runtime-ready image assets.
  if (/_raw\.(png|jpe?g|webp)$/i.test(relPath)) {
    return true;
  }

  return false;
}

function isRequiredRuntimeFallbackAsset(relPath) {
  if (!relPath.startsWith("assets/")) {
    return false;
  }
  return /^assets\/ui\/mascot\/reactions\/reaction-[^/]+\.png$/i.test(relPath);
}

async function loadOptimizedOriginalSkipSet() {
  try {
    const raw = await readFile(optimizationMapPath, "utf8");
    const parsed = JSON.parse(raw);
    const skipSet = new Set();
    for (const item of parsed?.convertedAssets || []) {
      const source = String(item?.source || "").replace(/^\.\//, "");
      if (source) {
        skipSet.add(source);
      }
    }
    return skipSet;
  } catch {
    return new Set();
  }
}

async function assertGitTracksCriticalRuntimeFiles() {
  for (const relPath of criticalRuntimeFiles) {
    try {
      await execFileAsync("git", ["ls-files", "--error-unmatch", relPath], {
        cwd: projectRoot,
      });
    } catch (error) {
      throw new Error(
        `Critical runtime file is missing from Git index: ${relPath}. `
        + "Run: git add "
        + relPath,
      );
    }
  }
}

async function buildWeb() {
  await assertGitTracksCriticalRuntimeFiles();
  await rm(distDir, { recursive: true, force: true });
  await mkdir(distDir, { recursive: true });
  const optimizedSourceSkipSet = await loadOptimizedOriginalSkipSet();

  for (const target of copyTargets) {
    const from = path.join(projectRoot, target);
    const to = path.join(distDir, target);
    await cp(from, to, {
      recursive: true,
      filter: (sourcePath) => {
        const relPath = path.relative(projectRoot, sourcePath).split(path.sep).join("/");
        if (!relPath.startsWith("assets/")) {
          return true;
        }
        if (isRequiredRuntimeFallbackAsset(relPath)) {
          return true;
        }
        if (shouldSkipSourceOnlyAsset(relPath)) {
          return false;
        }
        if (optimizedSourceSkipSet.has(relPath.replace(/^assets\//, "assets/"))) {
          return false;
        }
        return true;
      },
    });
  }

  console.log("Web bundle prepared in ./dist");
}

buildWeb().catch((error) => {
  console.error("build:web failed", error);
  process.exit(1);
});
