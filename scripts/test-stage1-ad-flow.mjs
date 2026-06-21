import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { TUNING } from "../src/config/tuning.js";
import { GameStateManager } from "../src/game/gameStateManager.js";
import { createAdMobService } from "../src/platform/adMobService.js";

const [html, main, uiManager, css, androidGradle] = await Promise.all([
  readFile(new URL("../index.html", import.meta.url), "utf8"),
  readFile(new URL("../src/main.js", import.meta.url), "utf8"),
  readFile(new URL("../src/ui/uiManager.js", import.meta.url), "utf8"),
  readFile(new URL("../styles/main.css", import.meta.url), "utf8"),
  readFile(new URL("../android/app/build.gradle", import.meta.url), "utf8"),
]);

for (const source of [html, main, uiManager, css]) {
  assert.doesNotMatch(source, /revive-offer|reviveOffer|no-space-banner|noSpaceGameOver/i);
}

assert.equal(
  (main.match(/adMobService\.showInterstitial\(\)/g) ?? []).length,
  1,
  "Interstitial must have one runtime call site.",
);
assert.match(main, /gameOverInterstitialHandled = true;[\s\S]*showGameOverInterstitialNow\(\)/);

const noFillBranch = main.match(/if \(!rewardResult\.shown\) \{([\s\S]*?)\n\s*\}/)?.[1] ?? "";
assert.match(noFillBranch, /rewarded_not_ready/);
assert.doesNotMatch(noFillBranch, /restartCurrentRun|goToMenu/);

const game = new GameStateManager(TUNING);
game.startGame({ mode: "classic" });
game.triggerGameOver({ reason: "stage1-test" });
assert.equal(game.getSnapshot().status, "over");
assert.equal(game.continueFromGameOverWithSingleDots(), true);
const continued = game.getSnapshot();
assert.equal(continued.status, "playing");
assert.equal(continued.pieces.length, 3);
assert.ok(continued.pieces.every((piece) => piece?.cells?.length === 1));

assert.match(androidGradle, /com\.unity3d\.ads:unity-ads/);
assert.match(androidGradle, /com\.google\.ads\.mediation:unity/);

function createNativeAdMock() {
  const listeners = new Map();
  const emit = (eventName, payload = {}) => {
    for (const listener of listeners.get(eventName) ?? []) {
      listener(payload);
    }
  };
  let rewardedMode = "dismissed";
  return {
    setRewardedMode(mode) {
      rewardedMode = mode;
    },
    async addListener(eventName, listener) {
      const eventListeners = listeners.get(eventName) ?? new Set();
      eventListeners.add(listener);
      listeners.set(eventName, eventListeners);
      return {
        async remove() {
          eventListeners.delete(listener);
        },
      };
    },
    async initialize() {},
    async prepareInterstitial() {},
    async prepareRewardVideoAd() {},
    async showInterstitial() {
      emit("interstitialAdShowed");
      setTimeout(() => emit("interstitialAdDismissed"), 15);
    },
    showRewardVideoAd() {
      emit("onRewardedVideoAdShowed");
      if (rewardedMode === "rewarded") {
        setTimeout(() => {
          emit("onRewardedVideoAdReward", { type: "reward", amount: 1 });
          emit("onRewardedVideoAdDismissed");
        }, 15);
      } else {
        setTimeout(() => emit("onRewardedVideoAdDismissed"), 15);
      }
      return new Promise(() => {});
    },
  };
}

const nativeAdMock = createNativeAdMock();
globalThis.window = {
  setTimeout,
  clearTimeout,
  Capacitor: {
    Plugins: { AdMob: nativeAdMock },
    getPlatform: () => "android",
    isNativePlatform: () => true,
  },
};
const nativeAdService = createAdMobService({
  appId: "test-app",
  bannerAdId: "test-banner",
  interstitialAdId: "test-interstitial",
  rewardedAdId: "test-rewarded",
  interstitialCooldownMs: 0,
});
assert.equal(await nativeAdService.showInterstitial(), true);
assert.deepEqual(
  await nativeAdService.showRewarded(),
  { shown: true, rewarded: false },
  "Early rewarded dismissal must return without granting a continue.",
);
nativeAdMock.setRewardedMode("rewarded");
assert.deepEqual(
  await nativeAdService.showRewarded(),
  { shown: true, rewarded: true },
  "Reward callback must grant the continue after dismissal.",
);

console.log("Stage 1 ad flow checks passed.");
