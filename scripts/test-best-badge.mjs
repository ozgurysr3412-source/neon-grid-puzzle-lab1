import { TUNING } from "../src/config/tuning.js";
import { GameStateManager } from "../src/game/gameStateManager.js";

const store = new Map();
globalThis.localStorage = {
  getItem(key) {
    return store.has(key) ? store.get(key) : null;
  },
  setItem(key, value) {
    store.set(key, String(value));
  },
  removeItem(key) {
    store.delete(key);
  },
};

const gameA = new GameStateManager(TUNING);
if (gameA.getSnapshot().bestScore !== 0) {
  throw new Error("Initial best score should be 0.");
}

gameA.score = 24810;
gameA.updateBestScore();

const gameB = new GameStateManager(TUNING);
if (gameB.getSnapshot().bestScore !== 24810) {
  throw new Error("Best score did not persist/load correctly.");
}

gameB.score = 12000;
gameB.updateBestScore();
const gameC = new GameStateManager(TUNING);
if (gameC.getSnapshot().bestScore !== 24810) {
  throw new Error("Best score should not decrease.");
}

gameC.score = 30001;
gameC.updateBestScore();
const gameD = new GameStateManager(TUNING);
if (gameD.getSnapshot().bestScore !== 30001) {
  throw new Error("Best score did not update to higher value.");
}

console.log(
  JSON.stringify(
    {
      ok: true,
      bestScore: gameD.getSnapshot().bestScore,
    },
    null,
    2,
  ),
);
