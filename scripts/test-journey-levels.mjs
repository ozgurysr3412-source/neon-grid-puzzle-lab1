import assert from "node:assert/strict";
import {
  getAdventureLevel,
  getAdventureLevelCount,
} from "../src/meta/adventureMode.js";

const FIRST_NEW_LEVEL = 21;
const LAST_NEW_LEVEL = 30;

assert.equal(getAdventureLevelCount(), 30, "Journey catalog should contain levels 1-30.");

for (let id = FIRST_NEW_LEVEL; id <= LAST_NEW_LEVEL; id += 1) {
  const level = getAdventureLevel(id);
  assert.equal(level.id, id, `Level ${id} should keep its catalog id.`);
  assert.equal(level.objective.kind, "score_target", `Level ${id} should use score targets.`);
  assert.ok(level.objective.targetScore > 0, `Level ${id} needs a positive score target.`);
  assert.ok(level.objective.timeLimitSec >= 100, `Level ${id} should remain human-playable.`);

  const occupiedCells = new Set();
  const iconCounts = { star: 0, ruby: 0 };
  for (const marker of level.markers) {
    assert.ok(marker.row >= 0 && marker.row < 8, `Level ${id} has an invalid marker row.`);
    assert.ok(marker.col >= 0 && marker.col < 8, `Level ${id} has an invalid marker column.`);
    const key = `${marker.row}:${marker.col}`;
    assert.equal(occupiedCells.has(key), false, `Level ${id} repeats marker cell ${key}.`);
    occupiedCells.add(key);
    iconCounts[marker.iconType] += 1;
  }

  assert.deepEqual(
    iconCounts,
    level.objective.iconTargets,
    `Level ${id} marker totals should match its objective.`,
  );
  assert.ok(level.markers.length <= 8, `Level ${id} should not overload the board with targets.`);
}

const level24 = getAdventureLevel(24).objective;
const level25 = getAdventureLevel(25).objective;
assert.ok(level25.targetScore < level24.targetScore, "Level 25 should be a score relief level.");
assert.ok(level25.timeLimitSec > level24.timeLimitSec, "Level 25 should provide more time.");

const level28 = getAdventureLevel(28).objective;
const level29 = getAdventureLevel(29).objective;
assert.ok(level29.targetScore < level28.targetScore, "Level 29 should be a score relief level.");
assert.ok(level29.timeLimitSec > level28.timeLimitSec, "Level 29 should provide more time.");

const level30 = getAdventureLevel(30).objective;
assert.ok(level30.targetScore > level28.targetScore, "Level 30 should feel like a chapter finale.");
assert.ok(level30.timeLimitSec >= 120, "Level 30 should be challenging without becoming extreme.");

console.log("Journey levels 21-30: catalog, targets, pacing, and board coordinates are valid.");
