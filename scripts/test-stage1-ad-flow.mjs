import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { TUNING } from "../src/config/tuning.js";
import { GameStateManager } from "../src/game/gameStateManager.js";
import { createAdMobService } from "../src/platform/adMobService.js";

const [html, main, uiManager, css, androidGradle, adMobServiceSource] = await Promise.all([
  readFile(new URL("../index.html", import.meta.url), "utf8"),
  readFile(new URL("../src/main.js", import.meta.url), "utf8"),
  readFile(new URL("../src/ui/uiManager.js", import.meta.url), "utf8"),
  readFile(new URL("../styles/main.css", import.meta.url), "utf8"),
  readFile(new URL("../android/app/build.gradle", import.meta.url), "utf8"),
  readFile(new URL("../src/platform/adMobService.js", import.meta.url), "utf8"),
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
assert.match(androidGradle, /com\.unity3d\.ads:unity-ads:4\.18\.1/);
assert.match(androidGradle, /com\.google\.ads\.mediation:unity:4\.18\.1\.0/);
assert.match(adMobServiceSource, /requestConsentInfo/);
assert.match(adMobServiceSource, /showConsentForm/);
assert.match(adMobServiceSource, /AdPrivacyBridge/);
assert.match(adMobServiceSource, /runConsentDebug/);
assert.match(adMobServiceSource, /getDiagnostics/);
assert.match(main, /adConsentGeo/);
assert.match(main, /adConsentInfo/);
assert.match(main, /ad-privacy-debug-panel/);
assert.match(main, /Ad Inspector is not available on this platform/);
assert.match(main, /GridCrownAds/);

function createNativeAdMock() {
  const listeners = new Map();
  const calls = {
    requestConsentInfo: 0,
    showConsentForm: 0,
    initialize: 0,
  };
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
    get calls() {
      return { ...calls };
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
    async requestConsentInfo() {
      calls.requestConsentInfo += 1;
      return {
        status: "OBTAINED",
        isConsentFormAvailable: false,
        canRequestAds: true,
        privacyOptionsRequirementStatus: "NOT_REQUIRED",
      };
    },
    async showConsentForm() {
      calls.showConsentForm += 1;
      return {
        status: "OBTAINED",
        canRequestAds: true,
        privacyOptionsRequirementStatus: "NOT_REQUIRED",
      };
    },
    async initialize() {
      calls.initialize += 1;
    },
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
const privacyBridgeCalls = [];
globalThis.window = {
  setTimeout,
  clearTimeout,
  Capacitor: {
    Plugins: {
      AdMob: nativeAdMock,
      AdPrivacyBridge: {
        async setUnityPrivacyConsent(payload) {
          privacyBridgeCalls.push(payload);
          return payload;
        },
        async openAdInspector() {},
      },
    },
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
assert.equal(nativeAdMock.calls.requestConsentInfo, 1);
assert.equal(nativeAdMock.calls.showConsentForm, 1);
assert.equal(nativeAdMock.calls.initialize, 1);
assert.equal(privacyBridgeCalls.length, 1);
assert.equal(privacyBridgeCalls[0].gdprConsent, true);
assert.equal(privacyBridgeCalls[0].privacyConsent, true);
assert.equal(nativeAdService.getDiagnostics().lastAdInitStatus, "initialized");
assert.equal(nativeAdService.getDiagnostics().unityPrivacy.set, true);
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
