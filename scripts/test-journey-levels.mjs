import assert from "node:assert/strict";
import {
  getAdventureLevel,
  getAdventureLevelCount,
} from "../src/meta/adventureMode.js";

const FIRST_NEW_LEVEL = 11;
const LAST_NEW_LEVEL = 50;
const MIN_SCORE_TARGET = 5000;
const MAX_SCORE_TARGET = 12000;

assert.equal(getAdventureLevelCount(), 50, "Journey catalog should contain levels 1-50.");

for (let id = FIRST_NEW_LEVEL; id <= LAST_NEW_LEVEL; id += 1) {
  const level = getAdventureLevel(id);
  assert.equal(level.id, id, `Level ${id} should keep its catalog id.`);
  assert.equal(level.objective.kind, "score_target", `Level ${id} should use score targets.`);
  assert.ok(
    level.objective.targetScore >= MIN_SCORE_TARGET,
    `Level ${id} should not start below the ${MIN_SCORE_TARGET} score floor.`,
  );
  assert.ok(
    level.objective.targetScore <= MAX_SCORE_TARGET,
    `Level ${id} should not exceed the ${MAX_SCORE_TARGET} score ceiling.`,
  );
  assert.ok(level.objective.timeLimitSec >= 100, `Level ${id} should remain human-playable.`);

  const occupiedCells = new Set();
  const iconCounts = { star: 0, ruby: 0, diamond: 0, crown: 0 };
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

const level34 = getAdventureLevel(34).objective;
const level33 = getAdventureLevel(33).objective;
assert.ok(level34.targetScore < level33.targetScore, "Level 34 should be a score relief level.");
assert.ok(level34.timeLimitSec > level33.timeLimitSec, "Level 34 should provide more time.");

for (let id = 31; id <= 40; id += 1) {
  assert.ok(getAdventureLevel(id).objective.iconTargets.diamond > 0, `Level ${id} should use the blue diamond.`);
}

const level40 = getAdventureLevel(40).objective;
assert.ok(level40.targetScore > level30.targetScore, "Level 40 should be harder than the previous chapter finale.");
assert.ok(level40.timeLimitSec >= 110, "Level 40 should remain realistically playable.");

for (let id = 41; id <= 50; id += 1) {
  const objective = getAdventureLevel(id).objective;
  assert.ok(objective.iconTargets.crown > 0, `Level ${id} should use the Crown Seal.`);
  assert.ok(objective.targetScore <= MAX_SCORE_TARGET, `Level ${id} should not exceed the ${MAX_SCORE_TARGET} score ceiling.`);
}

const level50 = getAdventureLevel(50).objective;
assert.equal(level50.iconTargets.crown, 3, "Level 50 should end with three Crown Seals.");
assert.ok(level50.targetScore > level40.targetScore, "Level 50 should be harder than the previous chapter finale.");

console.log("Journey levels 11-50: catalog, targets, pacing, and board coordinates are valid.");
