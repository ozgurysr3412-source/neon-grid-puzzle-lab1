import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  SCORE_THEME_MODES,
  SCORE_THEME_STEP,
  getScoreThemeBand,
  pickNextScoreTheme,
} from "../src/ui/scoreThemeCycle.js";

assert.equal(SCORE_THEME_STEP, 5000);
assert.deepEqual(SCORE_THEME_MODES, ["royal", "emerald", "sunset", "pink"]);
assert.equal(getScoreThemeBand(0), 0);
assert.equal(getScoreThemeBand(4999), 0);
assert.equal(getScoreThemeBand(5000), 1);
assert.equal(getScoreThemeBand(9999), 1);
assert.equal(getScoreThemeBand(10000), 2);

for (const current of SCORE_THEME_MODES) {
  for (const roll of [0, 0.34, 0.67, 0.999999]) {
    const next = pickNextScoreTheme(current, () => roll);
    assert.ok(SCORE_THEME_MODES.includes(next));
    assert.notEqual(next, current);
  }
}

const mainSource = await readFile(new URL("../src/main.js", import.meta.url), "utf8");
assert.match(mainSource, /let scoreThemeBand = 0/);
assert.match(mainSource, /applyVisualMode\("royal"\)/);
assert.match(mainSource, /while \(scoreThemeBand < targetBand\)/);
assert.match(mainSource, /state\.on\("state", \(snapshot\) => \{[\s\S]*syncScoreTheme\(snapshot\)/);
console.log("Stage 2 score theme cycle checks passed.");
