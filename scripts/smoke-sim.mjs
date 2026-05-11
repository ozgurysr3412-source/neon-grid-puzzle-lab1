import { TUNING } from "../src/config/tuning.js";
import { GameStateManager } from "../src/game/gameStateManager.js";

function runOne() {
  const game = new GameStateManager(TUNING);
  game.startGame({ mode: "classic" });
  let guard = 0;
  while (game.getSnapshot().status === "playing" && guard < 900) {
    guard += 1;
    const snap = game.getSnapshot();
    let moved = false;

    for (let slot = 0; slot < snap.pieces.length; slot += 1) {
      if (!snap.pieces[slot]) {
        continue;
      }
      for (let row = 0; row < TUNING.BOARD_SIZE; row += 1) {
        for (let col = 0; col < TUNING.BOARD_SIZE; col += 1) {
          if (game.getPlacementPreview(slot, row, col).valid) {
            game.placePiece(slot, row, col);
            moved = true;
            break;
          }
        }
        if (moved) {
          break;
        }
      }
      if (moved) {
        break;
      }
    }

    if (!moved) {
      break;
    }
  }
  return game.getSnapshot();
}

let failures = 0;
let avgTurns = 0;
let avgScore = 0;
const runs = 120;

for (let i = 0; i < runs; i += 1) {
  const end = runOne();
  if (end.status !== "over") {
    failures += 1;
  }
  avgTurns += end.turn;
  avgScore += end.score;
}

avgTurns /= runs;
avgScore /= runs;

console.log(
  JSON.stringify(
    {
      runs,
      failures,
      avgTurns: Number(avgTurns.toFixed(2)),
      avgScore: Number(avgScore.toFixed(2)),
    },
    null,
    2,
  ),
);

if (failures > 0) {
  process.exitCode = 1;
}
