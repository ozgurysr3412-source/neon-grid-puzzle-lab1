import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const normalizeNewlines = (text) => text.replace(/\r\n?/g, "\n");

const [source, mainSource] = (await Promise.all([
  readFile(new URL("../src/ui/uiManager.js", import.meta.url), "utf8"),
  readFile(new URL("../src/main.js", import.meta.url), "utf8"),
])).map(normalizeNewlines);

const clearMethod = source.match(/playClearFeedback\(clearedCells\) \{([\s\S]*?)\n  \}\n\n  acquireLineClearTile/)?.[1] ?? "";
const batchPaintMethod = source.match(/paintLineDominantLines\(rowLines = \[\], colLines = \[\], alreadyPainted = new Set\(\)\) \{([\s\S]*?)\n  \}\n\n  resolveClearedCellDetails/)?.[1] ?? "";
const explosionMethod = source.match(/spawnCanvasExplosion\(clearedCells, rowLines = \[\], colLines = \[\], measuredBoardRect = null\) \{([\s\S]*?)\n  \}\n\n  spawnWoodDebrisCascade/)?.[1] ?? "";
const shatterMethod = source.match(/spawnUnityShatterDebris\(clearedCells, measuredBoardRect = null\) \{([\s\S]*?)\n  \}\n\n  spawnCanvasExplosion/)?.[1] ?? "";

assert.ok(clearMethod, "Clear feedback method must exist.");
assert.ok(batchPaintMethod, "Batched line paint method must exist.");
assert.ok(explosionMethod, "Canvas explosion method must accept a measured board rect.");
assert.ok(shatterMethod, "Shatter method must accept a measured board rect.");

assert.equal(
  (clearMethod.match(/getBoundingClientRect\(\)/g) ?? []).length,
  1,
  "Clear feedback must read board geometry exactly once.",
);
assert.match(clearMethod, /spawnLineScorePopups\([^;]+boardRect\)/);
assert.match(clearMethod, /spawnCanvasExplosion\([^;]+boardRect\)/);
assert.match(clearMethod, /spawnUnityShatterDebris\([^;]+boardRect\)/);

assert.equal(
  (batchPaintMethod.match(/setTimeout\(/g) ?? []).length,
  1,
  "All extra line cells must share one cleanup timer.",
);
assert.match(batchPaintMethod, /const toneByCell = new Map\(\)/);
assert.match(batchPaintMethod, /alreadyPainted\.has\(cell\)/);

assert.match(explosionMethod, /acquireClearFxParticle\(\)/);
assert.match(shatterMethod, /acquireClearFxShard\(\)/);
assert.match(source, /releaseClearFxParticle\(particle\)/);
assert.match(source, /releaseClearFxShard\(shard\)/);
assert.match(source, /setBoardFrameFxDisabled\(disabled\)/);
assert.match(source, /if \(!this\.boardFrameFxDisabled\) \{/);
assert.match(source, /if \(!boardWrap \|\| this\.boardFrameFxDisabled\)/);
assert.match(source, /playComboAccent\(payload\) \{\s*\/\/[\s\S]*?if \(this\.boardFrameFxDisabled\) \{\s*return;/);
assert.match(mainSource, /ui\.setBoardFrameFxDisabled\(true\)/);
assert.doesNotMatch(mainSource, /ui\.playBoardFrameReaction|ui\.playComboAccent|ui\.playComboFeedback/);
assert.doesNotMatch(mainSource, /data-frame-demo|Frame Clear|Frame Multi|Frame Run/);

// Visual density remains locked to the accepted clear implementation.
assert.match(explosionMethod, /15 \+ \(lineEnergy \* 2\)/);
assert.match(explosionMethod, /Dense, premium-feel debris set/);
assert.match(shatterMethod, /UNITY_SHATTER\.shardPerCell/);

console.log("Stage 2 clear performance checks passed.");
