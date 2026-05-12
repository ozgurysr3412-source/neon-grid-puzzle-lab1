import { TelemetryStore } from "./analytics/telemetry.js";
import { TUNING } from "./config/tuning.js";
import { SoundManager } from "./feedback/audioHooks.js?v=20260425sfx1";
import { Haptics } from "./feedback/haptics.js";
import { GameStateManager } from "./game/gameStateManager.js";
import { DragDropController } from "./input/dragDropController.js";
import { getAdventureLevelCount } from "./meta/adventureMode.js";
import { evaluateAchievements } from "./meta/achievements.js";
import { ProgressionManager } from "./meta/progressionManager.js";
import { createAdMobService } from "./platform/adMobService.js";
import { createLocalNotificationService } from "./platform/localNotificationService.js";
import { createPlayBillingService } from "./platform/playBillingService.js";
import { mountJourneyScreenPartial } from "./ui/journey/journeyScreenPartial.js";
import { UIManager } from "./ui/uiManager.js?v=20260430perf2";

let layoutGuardRafId = 0;
let layoutGuardStatus = "menu";
let layoutGuardSettleTimer = 0;
let viewportSyncRafId = 0;
let boardSizeLockPx = 0;
let boardSizeLockKey = "";
let stableViewportWidthPx = 0;
let stableViewportHeightPx = 0;
let boardCellLockPx = 0;
let boardCellLockKey = "";
let lastViewportMetrics = {
  heightPx: 0,
  widthPx: 0,
  bottomUiPx: 0,
  topUiPx: 0,
  bottomFallbackPx: 0,
  ios: false,
  standalone: false,
};

function isInteractiveLayoutStatus(status) {
  return status === "playing" || status === "paused";
}

function isStandaloneDisplayMode() {
  return Boolean(
    window.matchMedia?.("(display-mode: standalone)")?.matches ||
    window.navigator?.standalone === true,
  );
}

function isIosDevice() {
  return /iPhone|iPad|iPod/i.test(window.navigator?.userAgent || "");
}

function toPxNumber(value) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function resetBoardSizeLock() {
  boardSizeLockPx = 0;
  boardSizeLockKey = "";
  boardCellLockPx = 0;
  boardCellLockKey = "";
}

function getBoardSizeLockKey() {
  const vv = window.visualViewport;
  const width = Math.max(1, Math.round(vv?.width || window.innerWidth || 0));
  const height = Math.max(1, Math.round(vv?.height || window.innerHeight || 0));
  const orientation = width >= height ? "landscape" : "portrait";
  const standalone = isStandaloneDisplayMode() ? "standalone" : "browser";
  // Keep lock key stable across iOS visualViewport jitter.
  return `${standalone}:${orientation}`;
}

function getRequestedBoardRenderMode() {
  // Release lock: board render mode is fixed.
  return "dom";
}

function snapBoardWrapEdgePx(rawWrapWidth, boardWrap, boardSize = 8) {
  if (!Number.isFinite(rawWrapWidth) || rawWrapWidth <= 0 || !(boardWrap instanceof HTMLElement)) {
    return null;
  }
  const boardEl = boardWrap.querySelector(".board");
  if (!(boardEl instanceof HTMLElement)) {
    return null;
  }
  const wrapStyle = window.getComputedStyle(boardWrap);
  const boardStyle = window.getComputedStyle(boardEl);
  const wrapChromePx =
    toPxNumber(wrapStyle.paddingLeft) +
    toPxNumber(wrapStyle.paddingRight) +
    toPxNumber(wrapStyle.borderLeftWidth) +
    toPxNumber(wrapStyle.borderRightWidth);
  const rowGapPx = toPxNumber(boardStyle.columnGap || boardStyle.gap || "0");
  const safeRawWrap = Math.max(0, rawWrapWidth);
  const contentWidthPx = Math.max(0, safeRawWrap - wrapChromePx);
  const gapTotalPx = rowGapPx * Math.max(0, boardSize - 1);
  const usableWidthPx = Math.max(0, contentWidthPx - gapTotalPx);
  const snappedCellPx = Math.max(1, Math.floor(usableWidthPx / boardSize));
  const snappedContentPx = (snappedCellPx * boardSize) + gapTotalPx;
  const snappedWrapPx = Math.floor(snappedContentPx + wrapChromePx);
  return Math.max(248, snappedWrapPx);
}

function syncBoardPixelGrid(boardSize = 8) {
  const boardEl = document.getElementById("board");
  const boardClipEl = document.getElementById("board-clip");
  if (!(boardEl instanceof HTMLElement)) {
    return;
  }
  const boardStyle = window.getComputedStyle(boardEl);
  const gapPx = Math.max(0, toPxNumber(boardStyle.columnGap || boardStyle.gap || "0"));
  const clipRect = boardClipEl instanceof HTMLElement ? boardClipEl.getBoundingClientRect() : null;
  const availablePx = clipRect
    ? Math.max(1, clipRect.width)
    : Math.max(1, boardEl.clientWidth);
  const gapTotalPx = gapPx * Math.max(0, boardSize - 1);

  // DOM board mode should fill the clip exactly to avoid visible
  // top/bottom inner-frame gaps from integer snapping.
  if (getRequestedBoardRenderMode() !== "canvas") {
    const cellPxExact = Math.max(1, (availablePx - gapTotalPx) / boardSize);
    const boardPxExact = availablePx;
    boardEl.style.gridTemplateColumns = `repeat(${boardSize}, ${cellPxExact.toFixed(3)}px)`;
    boardEl.style.gridTemplateRows = `repeat(${boardSize}, ${cellPxExact.toFixed(3)}px)`;
    boardEl.style.width = `${boardPxExact.toFixed(3)}px`;
    boardEl.style.height = `${boardPxExact.toFixed(3)}px`;
    boardEl.style.maxWidth = "100%";
    boardEl.style.maxHeight = "100%";
    return;
  }

  const rawCellPx = Math.max(1, Math.floor((availablePx - gapTotalPx) / boardSize));
  let cellPx = rawCellPx;
  const shouldFreezeCellPx = isIosDevice() && (layoutGuardStatus === "playing" || layoutGuardStatus === "paused");
  if (shouldFreezeCellPx) {
    const lockKey = getBoardSizeLockKey();
    const canReuseLock = boardCellLockPx > 0 && boardCellLockKey === lockKey;
    if (canReuseLock) {
      // Never shrink within same orientation/mode due transient iOS measurement jitter.
      cellPx = Math.max(boardCellLockPx, rawCellPx);
      boardCellLockPx = cellPx;
    } else {
      boardCellLockPx = rawCellPx;
      boardCellLockKey = lockKey;
      cellPx = rawCellPx;
    }
  }
  let snappedBoardPx = (cellPx * boardSize) + gapTotalPx;

  // Guard against Safari's occasional subpixel overflow while keeping size stable.
  if (snappedBoardPx > availablePx) {
    cellPx = Math.max(1, cellPx - 1);
    snappedBoardPx = (cellPx * boardSize) + gapTotalPx;
  }

  boardEl.style.gridTemplateColumns = `repeat(${boardSize}, ${cellPx}px)`;
  boardEl.style.gridTemplateRows = `repeat(${boardSize}, ${cellPx}px)`;
  boardEl.style.width = `${snappedBoardPx}px`;
  boardEl.style.height = `${snappedBoardPx}px`;
  boardEl.style.maxWidth = "100%";
  boardEl.style.maxHeight = "100%";
}

function computeBottomUiFallbackPx(measuredBottomUiPx) {
  const isCoarsePointer = window.matchMedia?.("(hover: none) and (pointer: coarse)")?.matches;
  if (!isCoarsePointer) {
    return 0;
  }
  if (isStandaloneDisplayMode()) {
    return 0;
  }
  if (measuredBottomUiPx > 0) {
    return 0;
  }
  if (!window.visualViewport) {
    return 72;
  }
  const isiOS = /iPhone|iPad|iPod/i.test(window.navigator?.userAgent || "");
  return isiOS ? 34 : 22;
}

function applyLayoutGuards() {
  const root = document.documentElement;
  const shell = document.getElementById("game-shell");
  const playArea = shell?.querySelector?.(".play-area");
  const boardWrap = document.getElementById("board-wrap");
  const traySection = document.querySelector(".tray-section");
  if (!root || !shell || !playArea || !boardWrap || !traySection) {
    return;
  }

  const interactiveStatus = isInteractiveLayoutStatus(layoutGuardStatus);
  const trayStyle = window.getComputedStyle(traySection);
  const trayHidden = trayStyle.display === "none" || trayStyle.visibility === "hidden";
  if (!interactiveStatus) {
    resetBoardSizeLock();
    root.style.setProperty("--layout-guard-extra", "0px");
    root.style.setProperty("--board-live-max", "920px");
    shell.classList.remove("layout-tight-1", "layout-tight-2");
    boardWrap.style.removeProperty("width");
    syncBoardPixelGrid(Number(TUNING?.BOARD_SIZE) || 8);
    return;
  }
  if (trayHidden) {
    // Keep board geometry frozen while overlays/settings hide tray on iOS.
    if (boardSizeLockPx <= 0) {
      const fallbackRect = boardWrap.getBoundingClientRect();
      if (fallbackRect.width > 0) {
        boardSizeLockPx = Math.floor(fallbackRect.width);
        boardSizeLockKey = getBoardSizeLockKey();
      }
    }
    if (boardSizeLockPx > 0) {
      boardWrap.style.width = `${boardSizeLockPx}px`;
    }
    syncBoardPixelGrid(Number(TUNING?.BOARD_SIZE) || 8);
    return;
  }

  const shellRect = shell.getBoundingClientRect();
  const playRect = playArea.getBoundingClientRect();
  const trayRect = traySection.getBoundingClientRect();
  const shellStyle = window.getComputedStyle(shell);
  const rootStyle = window.getComputedStyle(root);

  const viewportHeightPx =
    toPxNumber(rootStyle.getPropertyValue("--app-height")) ||
    Math.max(1, Math.round(window.innerHeight || 0));
  const bottomUiPx = Math.max(
    0,
    toPxNumber(rootStyle.getPropertyValue("--vv-bottom-ui")),
    toPxNumber(rootStyle.getPropertyValue("--bottom-ui-fallback")),
  );
  const shellPaddingBottomPx = Math.max(0, toPxNumber(shellStyle.paddingBottom));
  const isClassicMode = shell.classList.contains("mode-classic");
  const boardSafetyGapPx = isClassicMode ? 12 : 10;

  const visibleFromPlayTopPx = Math.max(0, viewportHeightPx - playRect.top);
  const reservedBottomPx = shellPaddingBottomPx + bottomUiPx + boardSafetyGapPx;
  const availableForBoardAndTrayPx = Math.max(0, visibleFromPlayTopPx - reservedBottomPx);
  const trayHeightPx = Math.max(0, trayRect.height);
  const boardMaxByViewport = Math.floor(availableForBoardAndTrayPx - trayHeightPx);
  const boardMaxByRects = Math.floor((trayRect.top - playRect.top) - boardSafetyGapPx);
  const boardMaxByShell = Math.floor((shellRect.bottom - playRect.top) - trayHeightPx - reservedBottomPx);

  let boardLiveMaxPx = Math.min(boardMaxByViewport, boardMaxByRects, boardMaxByShell);
  if (!Number.isFinite(boardLiveMaxPx) || boardLiveMaxPx <= 0) {
    boardLiveMaxPx = 920;
  }

  if (isIosDevice() && isStandaloneDisplayMode()) {
    // iOS standalone can briefly report optimistic viewport values; keep a guard band.
    boardLiveMaxPx -= 22;
  }
  boardLiveMaxPx = Math.max(248, boardLiveMaxPx);
  root.style.setProperty("--board-live-max", `${boardLiveMaxPx}px`);
  root.style.setProperty("--layout-guard-extra", "0px");
  shell.classList.remove("layout-tight-1", "layout-tight-2");

  const boardRectNow = boardWrap.getBoundingClientRect();
  const trayRectNow = traySection.getBoundingClientRect();
  if (boardRectNow.width <= 0 || boardRectNow.height <= 0 || trayRectNow.width <= 0 || trayRectNow.height <= 0) {
    boardWrap.style.removeProperty("width");
    return;
  }

  const shouldPixelSnapBoard = interactiveStatus && isIosDevice();
  if (shouldPixelSnapBoard) {
    const lockKey = getBoardSizeLockKey();
    const canReuseLock = boardSizeLockPx > 0 && boardSizeLockKey === lockKey;
    if (canReuseLock) {
      boardWrap.style.width = `${boardSizeLockPx}px`;
    } else {
      boardWrap.style.removeProperty("width");
      const candidateRect = boardWrap.getBoundingClientRect();
      const snappedWrapPx = snapBoardWrapEdgePx(
        Math.min(candidateRect.width, boardLiveMaxPx),
        boardWrap,
        Number(TUNING?.BOARD_SIZE) || 8,
      );
      if (Number.isFinite(snappedWrapPx) && snappedWrapPx > 0) {
        // Never allow gradual shrink within the active gameplay lock window.
        boardSizeLockPx = boardSizeLockPx > 0 ? Math.max(boardSizeLockPx, snappedWrapPx) : snappedWrapPx;
        boardSizeLockKey = lockKey;
        boardWrap.style.width = `${boardSizeLockPx}px`;
      }
    }
  } else {
    resetBoardSizeLock();
    boardWrap.style.removeProperty("width");
  }

  syncBoardPixelGrid(Number(TUNING?.BOARD_SIZE) || 8);
}

function scheduleLayoutGuards() {
  if (layoutGuardRafId) {
    cancelAnimationFrame(layoutGuardRafId);
  }
  layoutGuardRafId = requestAnimationFrame(() => {
    layoutGuardRafId = 0;
    applyLayoutGuards();
  });

  if (layoutGuardSettleTimer) {
    window.clearTimeout(layoutGuardSettleTimer);
  }
  // iOS Safari can settle viewport metrics a little later than resize/scroll events.
  layoutGuardSettleTimer = window.setTimeout(() => {
    applyLayoutGuards();
  }, 120);
}

function syncViewportMetrics(force = false, source = "manual") {
  // iOS Safari emits frequent visualViewport scroll jitter during touch gameplay.
  // Ignore those transient events while playing to prevent unnecessary layout work.
  if (
    source === "vv-scroll" &&
    isIosDevice() &&
    isInteractiveLayoutStatus(layoutGuardStatus)
  ) {
    return;
  }
  const vv = window.visualViewport;
  const fallbackInnerHeightPx = Math.max(1, Math.round(window.innerHeight || 0));
  const fallbackClientHeightPx = Math.max(1, Math.round(document.documentElement?.clientHeight || 0));
  const vvHeightPx = vv ? Math.max(1, Math.round(vv.height)) : fallbackInnerHeightPx;
  const vvWidthPx = vv ? Math.max(1, Math.round(vv.width)) : Math.max(1, Math.round(window.innerWidth || 0));
  let viewportHeightPx = Math.max(
    1,
    Math.min(vvHeightPx, fallbackInnerHeightPx, fallbackClientHeightPx || fallbackInnerHeightPx),
  );
  const viewportWidthPx = Math.max(1, vvWidthPx);
  const iosStandalone = isIosDevice() && isStandaloneDisplayMode();
  if (iosStandalone && stableViewportHeightPx > 0 && stableViewportWidthPx > 0) {
    const sameWidthBand = Math.abs(viewportWidthPx - stableViewportWidthPx) <= 2;
    if (sameWidthBand) {
      const shrinkDelta = stableViewportHeightPx - viewportHeightPx;
      // Ignore transient 1-frame iOS viewport drops caused by chrome/theme UI recomposition.
      if (shrinkDelta > 0 && shrinkDelta <= 42) {
        viewportHeightPx = stableViewportHeightPx;
      }
    }
  }
  const bottomUiPx = vv
    ? Math.max(0, Math.round(window.innerHeight - (vv.height + vv.offsetTop)))
    : 0;
  const topUiPx = vv
    ? Math.max(0, Math.round(vv.offsetTop))
    : 0;
  const bottomFallbackPx = computeBottomUiFallbackPx(bottomUiPx);
  const ios = isIosDevice();
  const changed =
    force ||
    Math.abs(lastViewportMetrics.heightPx - viewportHeightPx) > 1 ||
    Math.abs(lastViewportMetrics.widthPx - viewportWidthPx) > 1 ||
    Math.abs(lastViewportMetrics.bottomUiPx - bottomUiPx) > 1 ||
    Math.abs(lastViewportMetrics.topUiPx - topUiPx) > 1 ||
    Math.abs(lastViewportMetrics.bottomFallbackPx - bottomFallbackPx) > 1 ||
    lastViewportMetrics.ios !== ios ||
    lastViewportMetrics.standalone !== iosStandalone;

  if (!changed) {
    return;
  }

  document.documentElement.style.setProperty("--app-height", `${viewportHeightPx}px`);
  document.documentElement.style.setProperty("--app-width", `${viewportWidthPx}px`);
  document.documentElement.style.setProperty("--vv-bottom-ui", `${bottomUiPx}px`);
  document.documentElement.style.setProperty("--vv-top-ui", `${topUiPx}px`);
  document.documentElement.style.setProperty("--bottom-ui-fallback", `${bottomFallbackPx}px`);
  document.documentElement.classList.toggle("ios-device", ios);
  document.documentElement.classList.toggle("ios-standalone", iosStandalone);
  lastViewportMetrics = {
    heightPx: viewportHeightPx,
    widthPx: viewportWidthPx,
    bottomUiPx,
    topUiPx,
    bottomFallbackPx,
    ios,
    standalone: iosStandalone,
  };
  stableViewportWidthPx = viewportWidthPx;
  stableViewportHeightPx = viewportHeightPx;
  scheduleLayoutGuards();
}

function scheduleViewportSyncFromScroll() {
  if (viewportSyncRafId) {
    return;
  }
  viewportSyncRafId = requestAnimationFrame(() => {
    viewportSyncRafId = 0;
    syncViewportMetrics(false, "vv-scroll");
  });
}

syncViewportMetrics(true, "init");
window.addEventListener("resize", () => syncViewportMetrics(true, "resize"));
window.addEventListener("orientationchange", () => syncViewportMetrics(true, "orientation"));
if (window.visualViewport) {
  window.visualViewport.addEventListener("resize", () => syncViewportMetrics(true, "vv-resize"));
  window.visualViewport.addEventListener("scroll", scheduleViewportSyncFromScroll);
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    const host = window.location.hostname;
    const isLocal =
      host === "localhost" ||
      host === "127.0.0.1" ||
      host.startsWith("192.168.") ||
      host.startsWith("10.");
    if (isLocal) {
      navigator.serviceWorker.getRegistrations()
        .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
        .catch(() => {});
      return;
    }
    navigator.serviceWorker.register("./sw.js").catch(() => {
      // Silent fail in dev environments where SW is blocked.
    });
  });
}

const SETTINGS_STORAGE_KEY = "neon-grid-forge-settings-v1";
const REMOVE_ADS_STORAGE_KEY = "neon-grid-remove-ads-v1";
const PHOTO_BOARD_IMAGE_STORAGE_KEY = "neon-grid-photo-board-image-v1";
const SHOP_DAILY_REWARD_LAST_CLAIM_KEY = "neon-grid-shop-daily-last-claim-v1";
const SHOP_PACK_GRANTED_TOKENS_STORAGE_KEY = "neon-grid-shop-pack-granted-tokens-v1";
const REWARDED_CONTINUE_USAGE_STORAGE_KEY = "neon-grid-rewarded-continue-usage-v1";
const LEADERBOARD_PROFILE_STORAGE_KEY = "neon-grid-leaderboard-profile-v1";
const LEADERBOARD_PLAYER_ID_STORAGE_KEY = "neon-grid-leaderboard-player-id-v1";
const LEADERBOARD_FIREBASE_CONFIG_STORAGE_KEY = "neon-grid-firebase-config-v1";
const REMOVE_ADS_PRICE_USD = "$1.99 USD";
const REMOVE_ADS_PRODUCT_ID = "remove_ads";
const SHOP_BILLING_PRODUCT_IDS = Object.freeze({
  starter: "starter_pack",
  value: "value_pack",
  "best-value": "best_value_pack",
  big: "big_pack",
});
const REWARDED_CONTINUE_DAILY_LIMIT = 5;
const ADMOB_USE_TEST_ADS = true;
const ADMOB_ANDROID_APP_ID = ADMOB_USE_TEST_ADS
  ? "ca-app-pub-3940256099942544~3347511713"
  : "ca-app-pub-4788652923724034~1331997225";
const ADMOB_ANDROID_BANNER_ID = ADMOB_USE_TEST_ADS
  ? "ca-app-pub-3940256099942544/6300978111"
  : "ca-app-pub-4788652923724034/6941370955";
const ADMOB_ANDROID_INTERSTITIAL_ID = ADMOB_USE_TEST_ADS
  ? "ca-app-pub-3940256099942544/1033173712"
  : "ca-app-pub-4788652923724034/6502387250";
const ADMOB_ANDROID_REWARDED_ID = ADMOB_USE_TEST_ADS
  ? "ca-app-pub-3940256099942544/5224354917"
  : "ca-app-pub-4788652923724034/8451939345";
const ADMOB_IOS_APP_ID = ADMOB_USE_TEST_ADS
  ? "ca-app-pub-3940256099942544~1458002511"
  : "ca-app-pub-4788652923724034~5337780715";
const ADMOB_IOS_BANNER_ID = ADMOB_USE_TEST_ADS
  ? "ca-app-pub-3940256099942544/2934735716"
  : "ca-app-pub-4788652923724034/1398535704";
const ADMOB_IOS_INTERSTITIAL_ID = ADMOB_USE_TEST_ADS
  ? "ca-app-pub-3940256099942544/4411468910"
  : "ca-app-pub-4788652923724034/8051573969";
const ADMOB_IOS_REWARDED_ID = ADMOB_USE_TEST_ADS
  ? "ca-app-pub-3940256099942544/1712485313"
  : "ca-app-pub-4788652923724034/8433727661";
const ADMOB_PLATFORM = (() => {
  try {
    const bridge = window?.Capacitor;
    if (!bridge) {
      return "web";
    }
    if (typeof bridge.getPlatform === "function") {
      return String(bridge.getPlatform() || "web");
    }
    return String(bridge.platform || "web");
  } catch {
    return "web";
  }
})();
const ADMOB_ACTIVE_IDS = ADMOB_PLATFORM === "ios"
  ? {
      appId: ADMOB_IOS_APP_ID,
      bannerAdId: ADMOB_IOS_BANNER_ID,
      interstitialAdId: ADMOB_IOS_INTERSTITIAL_ID,
      rewardedAdId: ADMOB_IOS_REWARDED_ID,
    }
  : {
      appId: ADMOB_ANDROID_APP_ID,
      bannerAdId: ADMOB_ANDROID_BANNER_ID,
      interstitialAdId: ADMOB_ANDROID_INTERSTITIAL_ID,
      rewardedAdId: ADMOB_ANDROID_REWARDED_ID,
    };

const telemetry = new TelemetryStore(TUNING.STORAGE_KEY_TELEMETRY);
const progression = new ProgressionManager(TUNING.STORAGE_KEY_PROGRESS, TUNING);
const state = new GameStateManager(TUNING, { progression, telemetry });
mountJourneyScreenPartial();
const ui = new UIManager(TUNING);
const audio = new SoundManager();
void audio.preloadAll();
const haptics = new Haptics();
const powerHub = initPowerHubUi({ state, ui });
const smartPraiseState = {
  lastTurn: -99,
  lastAtMs: 0,
};
const approvalState = {
  lastTurn: -99,
  lastAtMs: 0,
};
let lastClearFxAtMs = -Infinity;
let lastClearFxEndsAtMs = -Infinity;
function syncFxSuspension(snapshot = state.getSnapshot()) {
  const hidden = document.hidden === true;
  const status = snapshot?.status ?? "menu";
  const gameplayVisible = status === "playing" || status === "paused" || status === "over";
  ui.setFxSuspended(hidden || !gameplayVisible);
}
const BADGES_UI_VARIANT = "v2";
const ADVENTURE_MAX_LEVEL = getAdventureLevelCount();
const FIREBASE_LEADERBOARD_SDK_VERSION = "10.14.1";
const LEADERBOARD_FETCH_LIMIT = 500;
const LEADERBOARD_SEED_VERSION = "v6-weekly-7day-15000";
const LEADERBOARD_SEED_VERSION_STORAGE_KEY = "neon-grid-leaderboard-seed-version-v1";
const LEADERBOARD_WEEKLY_ROTATION_STORAGE_KEY = "neon-grid-leaderboard-weekly-rotation-v1";
const LEADERBOARD_COLLECTIONS = Object.freeze({
  global: "gridcrown_leaderboard_global",
  weekly: "gridcrown_leaderboard_weekly",
});
const LEADERBOARD_SEED_COUNT = 500;
const LEADERBOARD_WRITE_BATCH_SIZE = 400;
const LEADERBOARD_WEEKLY_ROTATION_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;
const LEADERBOARD_WEEKLY_SHARED_NAME_RATIO = 0.62;
const SHOP_DAILY_REWARD_INTERVAL_MS = 24 * 60 * 60 * 1000;
const SHOP_DAILY_REWARD_FALLBACK_HOUR = 19;
const SHOP_DAILY_REWARD_READY_TITLE = "Gunluk odulun hazir 🎁";
const SHOP_DAILY_REWARD_READY_BODY = "Grid Crown'da gunluk odul seni bekliyor. Hemen topla!";
const SHOP_DAILY_REWARD_FALLBACK_TITLE = "Odulunu unutma";
const SHOP_DAILY_REWARD_FALLBACK_BODY = "Gunluk odul toplamak icin Grid Crown'a geri don!";
const SHOP_COMEBACK_REMINDER_HOUR = 14;
const SHOP_COMEBACK_REMINDER_MIN_DELAY_MS = 2 * 60 * 60 * 1000;
const SHOP_COMEBACK_REMINDER_TITLE = "Grid Crown seni bekliyor 👑";
const SHOP_COMEBACK_REMINDER_BODY = "Bugunun hedefini tamamla ve serini bozma. Hemen geri don!";
const SHOP_PACKS = Object.freeze([
  {
    id: "starter",
    productId: SHOP_BILLING_PRODUCT_IDS.starter,
    consumeAfterPurchase: true,
    name: "Starter Pack",
    meta: "Twist x6 • Hammer x4 • TNT x2",
    priceLabel: "$0.69",
    rewards: { twist: 6, hammer: 4, tnt: 2 },
    includesRemoveAds: false,
    image: "./assets/ui/shop/starter-pack-clean.webp?v=20260426shop1",
  },
  {
    id: "value",
    productId: SHOP_BILLING_PRODUCT_IDS.value,
    consumeAfterPurchase: true,
    name: "Value Pack",
    meta: "Twist x14 • Hammer x9 • TNT x5",
    priceLabel: "$1.29",
    rewards: { twist: 14, hammer: 9, tnt: 5 },
    includesRemoveAds: false,
    image: "./assets/ui/shop/value-pack-clean.webp?v=20260426shop1",
  },
  {
    id: "best-value",
    productId: SHOP_BILLING_PRODUCT_IDS["best-value"],
    consumeAfterPurchase: true,
    name: "Best Value Pack",
    meta: "Twist x30 • Hammer x18 • TNT x10",
    priceLabel: "$2.49",
    rewards: { twist: 30, hammer: 18, tnt: 10 },
    includesRemoveAds: false,
    image: "./assets/ui/shop/best-value-pack-clean.webp?v=20260426shop1",
  },
  {
    id: "big",
    productId: SHOP_BILLING_PRODUCT_IDS.big,
    consumeAfterPurchase: false,
    name: "Big Pack",
    meta: "Twist x70 • Hammer x40 • TNT x24 • Remove Ads Included",
    priceLabel: "$4.99",
    rewards: { twist: 70, hammer: 40, tnt: 24 },
    includesRemoveAds: true,
    image: "./assets/ui/shop/big-pack-clean.webp?v=20260426shop1",
  },
]);
const LEADERBOARD_SEED_COUNTRY_PROFILES = Object.freeze([
  { code: "TR", firstNames: ["Mert", "Arda", "Kerem", "Ece", "Elif", "Deniz", "Berk", "Selin", "Can", "Aylin"], lastNames: ["Yilmaz", "Kaya", "Demir", "Sahin", "Aydin", "Arslan", "Koc", "Celik", "Kurt", "Ozturk"] },
  { code: "US", firstNames: ["Liam", "Noah", "Mason", "Emma", "Ava", "Olivia", "Ethan", "Mia", "Logan", "Chloe"], lastNames: ["Smith", "Johnson", "Brown", "Davis", "Miller", "Wilson", "Moore", "Taylor", "Anderson", "Thomas"] },
  { code: "GB", firstNames: ["Oliver", "Harry", "George", "Amelia", "Isla", "Sophie", "Jack", "Emily", "Arthur", "Grace"], lastNames: ["Taylor", "Evans", "Williams", "Jones", "Davies", "Brown", "Wilson", "Thomas", "Roberts", "Hughes"] },
  { code: "DE", firstNames: ["Lukas", "Finn", "Leon", "Mia", "Emma", "Hannah", "Noah", "Lea", "Jonas", "Lina"], lastNames: ["Muller", "Schmidt", "Schneider", "Fischer", "Weber", "Meyer", "Wagner", "Becker", "Hoffmann", "Koch"] },
  { code: "FR", firstNames: ["Lucas", "Hugo", "Jules", "Emma", "Lea", "Chloe", "Louis", "Ines", "Arthur", "Manon"], lastNames: ["Martin", "Bernard", "Dubois", "Thomas", "Robert", "Richard", "Petit", "Durand", "Leroy", "Moreau"] },
  { code: "ES", firstNames: ["Mateo", "Hugo", "Leo", "Lucia", "Sofia", "Martina", "Pablo", "Carmen", "Diego", "Elena"], lastNames: ["Garcia", "Martinez", "Lopez", "Sanchez", "Perez", "Gomez", "Martin", "Jimenez", "Ruiz", "Hernandez"] },
  { code: "IT", firstNames: ["Luca", "Matteo", "Leonardo", "Sofia", "Giulia", "Aurora", "Marco", "Chiara", "Francesco", "Alice"], lastNames: ["Rossi", "Russo", "Ferrari", "Esposito", "Bianchi", "Romano", "Ricci", "Marino", "Greco", "Bruno"] },
  { code: "PT", firstNames: ["Joao", "Tiago", "Diogo", "Sofia", "Ines", "Beatriz", "Miguel", "Marta", "Rafael", "Ana"], lastNames: ["Silva", "Santos", "Ferreira", "Pereira", "Oliveira", "Costa", "Rodrigues", "Martins", "Jesus", "Sousa"] },
  { code: "NL", firstNames: ["Daan", "Lars", "Milan", "Emma", "Julia", "Sanne", "Noah", "Tess", "Sem", "Lotte"], lastNames: ["deJong", "Jansen", "deVries", "vanDenBerg", "vanDijk", "Bakker", "Janssen", "Visser", "Smit", "Meijer"] },
  { code: "BE", firstNames: ["Noah", "Louis", "Arthur", "Emma", "Olivia", "Nora", "Liam", "Lina", "Jules", "Leonie"], lastNames: ["Peeters", "Janssens", "Maes", "Jacobs", "Mertens", "Willems", "Claes", "Goossens", "Wouters", "Dubois"] },
  { code: "SE", firstNames: ["Liam", "Noah", "William", "Alice", "Maja", "Elsa", "Hugo", "Astrid", "Lucas", "Ebba"], lastNames: ["Andersson", "Johansson", "Karlsson", "Nilsson", "Eriksson", "Larsson", "Olsson", "Persson", "Svensson", "Gustafsson"] },
  { code: "NO", firstNames: ["Jakob", "Emil", "Noah", "Nora", "Emma", "Ella", "Oskar", "Ingrid", "Filip", "Sofie"], lastNames: ["Hansen", "Johansen", "Olsen", "Larsen", "Andersen", "Nilsen", "Pedersen", "Kristiansen", "Jensen", "Karlsen"] },
  { code: "DK", firstNames: ["William", "Noah", "Emil", "Emma", "Clara", "Alma", "Oscar", "Freja", "Lucas", "Ida"], lastNames: ["Jensen", "Nielsen", "Hansen", "Pedersen", "Andersen", "Christensen", "Larsen", "Sorensen", "Rasmussen", "Jorgensen"] },
  { code: "FI", firstNames: ["Elias", "Leo", "Onni", "Aino", "Sofia", "Ella", "Eetu", "Helmi", "Mikko", "Emilia"], lastNames: ["Korhonen", "Virtanen", "Maki", "Nieminen", "Makkonen", "Hamalainen", "Lahtinen", "Heikkinen", "Jokinen", "Lehtinen"] },
  { code: "PL", firstNames: ["Jan", "Antoni", "Jakub", "Zuzanna", "Julia", "Maja", "Szymon", "Oliwia", "Kacper", "Anna"], lastNames: ["Nowak", "Kowalski", "Wisniewski", "Wojcik", "Kowalczyk", "Kaminski", "Lewandowski", "Zielinski", "Szymanski", "Dabrowski"] },
  { code: "RO", firstNames: ["Andrei", "David", "Alexandru", "Maria", "Elena", "Ioana", "Stefan", "Ana", "Mihai", "Bianca"], lastNames: ["Popescu", "Ionescu", "Stan", "Dumitru", "Georgescu", "Matei", "Radu", "Stoica", "Diaconu", "Marin"] },
  { code: "GR", firstNames: ["Giorgos", "Nikos", "Dimitris", "Maria", "Eleni", "Sofia", "Kostas", "Anna", "Panagiotis", "Irene"], lastNames: ["Papadopoulos", "Nikolaidis", "Georgiou", "Dimitriou", "Pappas", "Vasileiou", "Kostopoulos", "Alexiou", "Mavridis", "Theodorou"] },
  { code: "RU", firstNames: ["Ivan", "Nikita", "Artem", "Sofia", "Anna", "Maria", "Dmitry", "Polina", "Maksim", "Elena"], lastNames: ["Ivanov", "Smirnov", "Kuznetsov", "Popov", "Vasiliev", "Sokolov", "Mikhailov", "Novikov", "Fedorov", "Morozov"] },
  { code: "UA", firstNames: ["Oleksandr", "Maksym", "Andrii", "Sofiia", "Anastasiia", "Olena", "Dmytro", "Kateryna", "Ihor", "Iryna"], lastNames: ["Shevchenko", "Kovalenko", "Bondarenko", "Tkachenko", "Kravchenko", "Boyko", "Kovalchuk", "Melnyk", "Polishchuk", "Savchenko"] },
  { code: "RS", firstNames: ["Luka", "Stefan", "Nikola", "Milica", "Jovana", "Ana", "Marko", "Teodora", "Milos", "Ivana"], lastNames: ["Jovanovic", "Petrovic", "Nikolic", "Markovic", "Stojanovic", "Ilic", "Djordjevic", "Milenkovic", "Pavlovic", "Lazarevic"] },
  { code: "HR", firstNames: ["Luka", "Ivan", "Marko", "Ana", "Mia", "Petra", "Filip", "Ivana", "Karlo", "Ema"], lastNames: ["Horvat", "Kovacevic", "Babic", "Maric", "Novak", "Knezevic", "Juric", "Grgic", "Pavic", "Brezic"] },
  { code: "CZ", firstNames: ["Jakub", "Jan", "Tomas", "Ema", "Tereza", "Adela", "Matej", "Anna", "Filip", "Klara"], lastNames: ["Novak", "Svoboda", "Novotny", "Dvorak", "Cerny", "Prochazka", "Kucera", "Vesely", "Horak", "Nemec"] },
  { code: "HU", firstNames: ["Bence", "Levente", "Daniel", "Anna", "Emma", "Lili", "Adam", "Zsofia", "Mate", "Nora"], lastNames: ["Nagy", "Kovacs", "Toth", "Szabo", "Horvath", "Varga", "Kiss", "Molnar", "Nemeth", "Farkas"] },
  { code: "AT", firstNames: ["Lukas", "David", "Paul", "Anna", "Lena", "Sophie", "Jonas", "Mia", "Simon", "Laura"], lastNames: ["Gruber", "Huber", "Bauer", "Wagner", "Muller", "Pichler", "Moser", "Steiner", "Hofer", "Mayer"] },
  { code: "CH", firstNames: ["Noah", "Luca", "Leon", "Mia", "Emma", "Lea", "Elias", "Nina", "Jan", "Sina"], lastNames: ["Muller", "Meier", "Schmid", "Keller", "Weber", "Huber", "Frei", "Steiner", "Brunner", "Zimmermann"] },
  { code: "CA", firstNames: ["Liam", "Noah", "Ethan", "Olivia", "Emma", "Charlotte", "Lucas", "Ava", "Benjamin", "Mila"], lastNames: ["Smith", "Brown", "Martin", "Wilson", "Lee", "Anderson", "Taylor", "Clark", "Hall", "Young"] },
  { code: "AU", firstNames: ["Oliver", "Noah", "William", "Charlotte", "Amelia", "Isla", "Jack", "Mia", "Leo", "Grace"], lastNames: ["Smith", "Jones", "Williams", "Brown", "Wilson", "Taylor", "Anderson", "White", "Martin", "Thompson"] },
  { code: "NZ", firstNames: ["Noah", "Oliver", "Jack", "Isla", "Charlotte", "Amelia", "Leo", "Sophie", "Luca", "Ella"], lastNames: ["Smith", "Wilson", "Brown", "Taylor", "Anderson", "Thomas", "White", "Martin", "Clark", "Harris"] },
  { code: "BR", firstNames: ["Miguel", "Arthur", "Heitor", "Helena", "Alice", "Laura", "Davi", "Valentina", "Pedro", "Julia"], lastNames: ["Silva", "Santos", "Oliveira", "Souza", "Lima", "Pereira", "Costa", "Gomes", "Ribeiro", "Almeida"] },
  { code: "AR", firstNames: ["Benjamin", "Mateo", "Thiago", "Sofia", "Martina", "Valentina", "Franco", "Lucia", "Tomas", "Camila"], lastNames: ["Gonzalez", "Rodriguez", "Gomez", "Fernandez", "Lopez", "Diaz", "Martinez", "Perez", "Sosa", "Romero"] },
  { code: "MX", firstNames: ["Santiago", "Mateo", "Sebastian", "Valentina", "Ximena", "Camila", "Diego", "Regina", "Leonardo", "Daniela"], lastNames: ["Hernandez", "Garcia", "Martinez", "Lopez", "Gonzalez", "Perez", "Rodriguez", "Sanchez", "Ramirez", "Flores"] },
  { code: "CO", firstNames: ["Santiago", "Matias", "Juan", "Valentina", "Sofia", "Isabella", "Sebastian", "Camila", "Nicolas", "Mariana"], lastNames: ["Rodriguez", "Martinez", "Gomez", "Lopez", "Gonzalez", "Perez", "Sanchez", "Ramirez", "Torres", "Diaz"] },
  { code: "PE", firstNames: ["Sebastian", "Mateo", "Diego", "Valeria", "Luciana", "Camila", "Adrian", "Daniela", "Fabricio", "Mariana"], lastNames: ["Quispe", "Flores", "Rojas", "Garcia", "Sanchez", "Torres", "Vargas", "Mendoza", "Huaman", "Castillo"] },
  { code: "CL", firstNames: ["Mateo", "Agustin", "Benjamin", "Sofia", "Isidora", "Emilia", "Vicente", "Martina", "Lucas", "Renata"], lastNames: ["Gonzalez", "Munoz", "Rojas", "Diaz", "Perez", "Soto", "Contreras", "Silva", "Martinez", "Sepulveda"] },
  { code: "IN", firstNames: ["Aarav", "Arjun", "Vihaan", "Anaya", "Isha", "Aditi", "Rohan", "Diya", "Kunal", "Sanya"], lastNames: ["Sharma", "Patel", "Singh", "Gupta", "Kapoor", "Mehta", "Reddy", "Iyer", "Nair", "Joshi"] },
  { code: "PK", firstNames: ["Ahmed", "Ali", "Usman", "Ayesha", "Fatima", "Zara", "Hassan", "Hira", "Bilal", "Mariam"], lastNames: ["Khan", "Ahmed", "Malik", "Butt", "Shah", "Qureshi", "Baig", "Chaudhry", "Farooq", "Raza"] },
  { code: "BD", firstNames: ["Rafi", "Siam", "Tanvir", "Ayesha", "Nusrat", "Mim", "Hasan", "Rima", "Sajid", "Tania"], lastNames: ["Rahman", "Islam", "Hossain", "Ahmed", "Karim", "Chowdhury", "Sarker", "Khan", "Mia", "Talukder"] },
  { code: "ID", firstNames: ["Rizky", "Fajar", "Bagas", "Ayu", "Putri", "Siti", "Dimas", "Nabila", "Andi", "Intan"], lastNames: ["Pratama", "Saputra", "Wijaya", "Hidayat", "Nugroho", "Setiawan", "Permata", "Utami", "Ramadhan", "Maulana"] },
  { code: "MY", firstNames: ["Aiman", "Hakim", "Irfan", "Aisyah", "Nurul", "Siti", "Danial", "Amira", "Faris", "Hannah"], lastNames: ["Ahmad", "Ibrahim", "Ismail", "Hassan", "Rahman", "Yusof", "Hamid", "Razak", "Shah", "Aziz"] },
  { code: "SG", firstNames: ["Ethan", "Ryan", "Lucas", "Chloe", "Alicia", "Grace", "Darren", "Jasmine", "Marcus", "MeiLin"], lastNames: ["Tan", "Lim", "Lee", "Ng", "Ong", "Goh", "Teo", "Toh", "Low", "Chua"] },
  { code: "TH", firstNames: ["Narin", "Krit", "Anan", "Pim", "Nicha", "Dao", "Thanawat", "Mali", "Pong", "Kanya"], lastNames: ["Sukhum", "Chaiyaporn", "Rattanakul", "Sirisuk", "Thongchai", "Boonmee", "Prasert", "Wongsa", "Saelim", "Sombat"] },
  { code: "VN", firstNames: ["Minh", "An", "Huy", "Linh", "Trang", "Mai", "Khoa", "Ngoc", "Duc", "Thao"], lastNames: ["Nguyen", "Tran", "Le", "Pham", "Hoang", "Huynh", "Phan", "Vu", "Dang", "Bui"] },
  { code: "PH", firstNames: ["John", "Mark", "Paolo", "Maria", "Angel", "Jasmine", "Carlo", "Bea", "Miguel", "Claire"], lastNames: ["Santos", "Reyes", "Cruz", "Bautista", "Garcia", "Mendoza", "Torres", "Ramos", "Flores", "Castro"] },
  { code: "JP", firstNames: ["Haruto", "Yuto", "Sota", "Yui", "Aoi", "Sakura", "Ren", "Hina", "Kaito", "Mio"], lastNames: ["Sato", "Suzuki", "Takahashi", "Tanaka", "Watanabe", "Ito", "Yamamoto", "Nakamura", "Kobayashi", "Kato"] },
  { code: "KR", firstNames: ["Minjun", "Seojun", "Jiho", "Soyeon", "Jiwon", "Hana", "Hyunwoo", "Yuna", "Taeyang", "Nari"], lastNames: ["Kim", "Lee", "Park", "Choi", "Jung", "Kang", "Cho", "Yoon", "Jang", "Lim"] },
  { code: "CN", firstNames: ["Wei", "Hao", "Jun", "Mei", "Li", "Xiao", "Tao", "Ying", "Qiang", "Lan"], lastNames: ["Wang", "Li", "Zhang", "Liu", "Chen", "Yang", "Huang", "Zhao", "Wu", "Zhou"] },
  { code: "TW", firstNames: ["Cheng", "Wei", "Yu", "Mei", "Ting", "Hsin", "Chao", "Ling", "Jie", "An"], lastNames: ["Chen", "Lin", "Huang", "Wang", "Wu", "Tsai", "Liu", "Chang", "Yang", "Hsiao"] },
  { code: "AE", firstNames: ["Omar", "Khalid", "Saeed", "Aisha", "Mariam", "Fatima", "Hamad", "Noora", "Zayed", "Layla"], lastNames: ["AlNuaimi", "AlMansoori", "AlDhaheri", "AlMarri", "AlMazrouei", "AlKaabi", "AlFalasi", "AlSuwaidi", "AlKetbi", "AlShamsi"] },
  { code: "SA", firstNames: ["Faisal", "Abdullah", "Saud", "Lama", "Noura", "Reem", "Turki", "Hala", "Nawaf", "Maha"], lastNames: ["AlQahtani", "AlHarbi", "AlOtaibi", "AlShammari", "AlMutairi", "AlDosari", "AlAnazi", "AlZahrani", "AlGhamdi", "AlSubaie"] },
  { code: "EG", firstNames: ["Omar", "Youssef", "Karim", "Mariam", "Salma", "Nour", "Ahmed", "Yara", "Mostafa", "Dina"], lastNames: ["Hassan", "Ali", "Ibrahim", "Mahmoud", "Sayed", "Farouk", "Kamal", "Nabil", "Saad", "Shawky"] },
]);
const MASCOT_REACTION_ASSETS = Object.freeze({
  sadSoft: Object.freeze({
    primary: "./assets/ui/mascot/reactions/reaction-sad-soft.webp?v=20260420a",
    fallback: "./assets/ui/mascot/reactions/reaction-sad-soft.png?v=20260420a",
  }),
  ambitious: Object.freeze({
    primary: "./assets/ui/mascot/reactions/reaction-ambitious.webp?v=20260420a",
    fallback: "./assets/ui/mascot/reactions/reaction-ambitious.png?v=20260420a",
  }),
  happy: Object.freeze({
    primary: "./assets/ui/mascot/reactions/reaction-happy.webp?v=20260420a",
    fallback: "./assets/ui/mascot/reactions/reaction-happy.png?v=20260420a",
  }),
  sadDeep: Object.freeze({
    primary: "./assets/ui/mascot/reactions/reaction-sad-deep.webp?v=20260420a",
    fallback: "./assets/ui/mascot/reactions/reaction-sad-deep.png?v=20260420a",
  }),
});

const leaderboardFirebaseRuntime = {
  ready: false,
  initAttempted: false,
  initPromise: null,
  db: null,
  api: null,
  playerId: loadOrCreateLeaderboardPlayerId(),
  seedPromise: null,
  seedReady: false,
  weeklyRotationPromise: null,
};

function seedMixHash(input) {
  let hash = 2166136261;
  const text = String(input ?? "");
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function buildSeedAssignmentOrder(profiles, slotsPerCountry) {
  const assignments = [];
  profiles.forEach((profile) => {
    for (let slot = 0; slot < slotsPerCountry; slot += 1) {
      assignments.push({
        code: profile.code,
        slot,
        sortKey: seedMixHash(`${profile.code}-${slot}`),
      });
    }
  });

  const takeFirst = (code, slot) => {
    const index = assignments.findIndex((entry) => entry.code === code && entry.slot === slot);
    if (index < 0) {
      return null;
    }
    const [entry] = assignments.splice(index, 1);
    return entry;
  };

  const ordered = [];
  const firstUs = takeFirst("US", 0);
  const firstTr = takeFirst("TR", 0);
  if (firstUs) {
    ordered.push(firstUs);
  }
  if (firstTr) {
    ordered.push(firstTr);
  }

  assignments.sort((a, b) => a.sortKey - b.sortKey);

  while (assignments.length) {
    const previousCode = ordered.length ? ordered[ordered.length - 1].code : "";
    let nextIndex = assignments.findIndex((entry) => entry.code !== previousCode);
    if (nextIndex < 0) {
      nextIndex = 0;
    }
    const [nextEntry] = assignments.splice(nextIndex, 1);
    ordered.push(nextEntry);
  }

  return ordered;
}

function createUniqueSeedName(baseName, usedNames) {
  let candidate = String(baseName ?? "").slice(0, 18).trim();
  if (!candidate) {
    candidate = "Player";
  }
  if (!usedNames.has(candidate)) {
    usedNames.add(candidate);
    return candidate;
  }
  for (let index = 2; index <= 99; index += 1) {
    const suffix = String(index);
    const maxBaseLength = Math.max(1, 18 - suffix.length);
    const withSuffix = `${candidate.slice(0, maxBaseLength)}${suffix}`;
    if (!usedNames.has(withSuffix)) {
      usedNames.add(withSuffix);
      return withSuffix;
    }
  }
  const fallback = `P${usedNames.size + 1}`.slice(0, 18);
  usedNames.add(fallback);
  return fallback;
}

function buildCountryNickname(profile, slot, countryCode, index) {
  const first = String(profile?.firstNames?.[slot] ?? "Player").replace(/\s+/g, "");
  const baseToken = Math.max(1, ((slot + 1) * 7) + (index % 9));
  const variant = seedMixHash(`${countryCode}-${slot}-${index}`) % 4;
  if (variant === 0) {
    return `${first}${countryCode}${baseToken}`;
  }
  if (variant === 1) {
    return `${first}_${baseToken}${countryCode}`;
  }
  if (variant === 2) {
    return `${countryCode}${first}${baseToken}`;
  }
  const clan = String(profile?.lastNames?.[(slot * 2 + 3) % profile.lastNames.length] ?? "Clan")
    .replace(/\s+/g, "")
    .slice(0, 2);
  return `${first}${clan}${baseToken}`;
}

function initPowerHubUi({ state = null, ui = null } = {}) {
  const hub = document.getElementById("power-hub");
  const toggle = document.getElementById("power-hub-toggle");
  if (!hub || !toggle) {
    return {
      getCount: () => 0,
      consume: () => false,
      setCount: () => {},
      syncFromSnapshot: () => {},
    };
  }

  const row = document.getElementById("power-icons-row");
  const pieceTrayEl = ui?.elements?.pieceTray ?? document.getElementById("piece-tray");
  const twistBtnEl = document.getElementById("power-twist-btn");
  const twistIconEl = twistBtnEl?.querySelector?.(".power-icon--twist") ?? null;
  const twistIconSrc = twistIconEl?.currentSrc || twistIconEl?.getAttribute?.("src") || "";
  const defaultInventory = { twist: 5, hammer: 3, tnt: 2 };
  let inventory = { ...defaultInventory };
  let powerDrag = null;
  let twistModeActive = false;
  let twistPending = null;
  const twistOverlaySeenPieceIds = new Set();

  try {
    const raw = localStorage.getItem("grid-crown-power-inventory");
    if (raw) {
      const parsed = JSON.parse(raw);
      inventory = {
        twist: Number.isFinite(parsed?.twist) ? Math.max(0, Math.floor(parsed.twist)) : defaultInventory.twist,
        hammer: Number.isFinite(parsed?.hammer) ? Math.max(0, Math.floor(parsed.hammer)) : defaultInventory.hammer,
        tnt: Number.isFinite(parsed?.tnt) ? Math.max(0, Math.floor(parsed.tnt)) : defaultInventory.tnt,
      };
    }
  } catch (_err) {
    inventory = { ...defaultInventory };
  }

  const saveInventory = () => {
    try {
      localStorage.setItem("grid-crown-power-inventory", JSON.stringify(inventory));
    } catch (_err) {
      // Ignore storage failures and keep UI responsive.
    }
  };

  const renderCounts = () => {
    const twistCount = document.getElementById("power-twist-count");
    const hammerCount = document.getElementById("power-hammer-count");
    const tntCount = document.getElementById("power-tnt-count");
    if (twistCount) twistCount.textContent = String(inventory.twist);
    if (hammerCount) hammerCount.textContent = String(inventory.hammer);
    if (tntCount) tntCount.textContent = String(inventory.tnt);
  };

  const getCount = (key) => Number(inventory[key] ?? 0);

  const setCount = (key, count) => {
    if (!Object.prototype.hasOwnProperty.call(inventory, key)) {
      return;
    }
    inventory[key] = Math.max(0, Math.floor(Number(count) || 0));
    saveInventory();
    renderCounts();
  };

  const consume = (key, amount = 1) => {
    if (!Object.prototype.hasOwnProperty.call(inventory, key)) {
      return false;
    }
    const safeAmount = Math.max(1, Math.floor(Number(amount) || 1));
    if (inventory[key] < safeAmount) {
      return false;
    }
    inventory[key] -= safeAmount;
    saveInventory();
    renderCounts();
    return true;
  };

  const getTwistAvailable = () => Math.max(0, getCount("twist"));

  const clearTwistPending = ({ revert = false } = {}) => {
    const pending = twistPending;
    twistPending = null;
    if (!revert || !pending || !state?.isInteractive?.()) {
      return;
    }
    const stepsBack = (4 - (Number(pending.rotations) % 4)) % 4;
    for (let i = 0; i < stepsBack; i += 1) {
      state?.rotatePieceInSlot?.(pending.slotIndex);
    }
  };

  const renderTwistOverlays = () => {
    if (!pieceTrayEl) {
      return;
    }
    pieceTrayEl.querySelectorAll(".piece-twist-overlay").forEach((node) => node.remove());
    if (!twistModeActive) {
      return;
    }

    const canPrepare = getTwistAvailable() > 0;
    pieceTrayEl.querySelectorAll(".piece-card").forEach((card) => {
      if (!(card instanceof HTMLElement) || card.classList.contains("piece-card--empty")) {
        return;
      }
      const slotIndex = Number(card.dataset.slot);
      const piece = Number.isInteger(slotIndex) ? state?.getPiece?.(slotIndex) : null;
      if (!piece) {
        return;
      }
      const pieceId = Number(piece.instanceId);
      if (!canPrepare) {
        return;
      }
      const isPending =
        twistPending
        && Number.isInteger(twistPending.slotIndex)
        && twistPending.slotIndex === slotIndex
        && Number(twistPending.rotations) > 0;
      const overlay = document.createElement("span");
      overlay.className = "piece-twist-overlay";
      if (Number.isFinite(pieceId) && !twistOverlaySeenPieceIds.has(pieceId)) {
        overlay.classList.add("piece-twist-overlay--spawn");
        twistOverlaySeenPieceIds.add(pieceId);
      }
      if (isPending) {
        overlay.classList.add("piece-twist-overlay--armed");
      }
      if (twistIconSrc) {
        const img = document.createElement("img");
        img.className = "piece-twist-overlay__icon";
        img.alt = "";
        img.setAttribute("aria-hidden", "true");
        img.draggable = false;
        img.src = twistIconSrc;
        overlay.appendChild(img);
      }
      card.appendChild(overlay);
    });
  };

  const setTwistModeActive = (nextActive) => {
    const canOpen = getTwistAvailable() > 0;
    const resolved = Boolean(nextActive) && canOpen;
    if (nextActive && !resolved) {
      markInvalidButton(twistBtnEl);
    }
    twistModeActive = resolved;
    twistBtnEl?.classList.toggle("power-icon-btn--active", twistModeActive);
    if (!twistModeActive) {
      clearTwistPending({ revert: true });
      twistOverlaySeenPieceIds.clear();
    }
    renderTwistOverlays();
  };

  const syncPowerHubModeVisibility = (snapshot = null) => {
    const safeSnapshot = snapshot ?? state?.getSnapshot?.() ?? null;
    const isClassicPlay = safeSnapshot?.mode === "classic" && safeSnapshot?.status === "playing";
    const isJourneyPanelVisible = ui?.journeyPanel?.visible === true && safeSnapshot?.status === "menu";
    const shouldShow = isClassicPlay && !isJourneyPanelVisible;
    hub.hidden = !shouldShow;
    hub.setAttribute("aria-hidden", shouldShow ? "false" : "true");
    if (!shouldShow) {
      setOpen(false);
      twistModeActive = false;
      twistBtnEl?.classList.remove("power-icon-btn--active");
      clearTwistPending({ revert: false });
      twistOverlaySeenPieceIds.clear();
      renderTwistOverlays();
    }
    return shouldShow;
  };

  const syncTwistFromSnapshot = (snapshot = null) => {
    const safeSnapshot = snapshot ?? state?.getSnapshot?.() ?? null;
    const isClassicMode = syncPowerHubModeVisibility(safeSnapshot);
    if (!isClassicMode) {
      return;
    }
    if (!safeSnapshot || safeSnapshot.status !== "playing") {
      twistModeActive = false;
      twistBtnEl?.classList.remove("power-icon-btn--active");
      clearTwistPending({ revert: false });
      twistOverlaySeenPieceIds.clear();
      renderTwistOverlays();
      return;
    }

    if (twistModeActive && getTwistAvailable() <= 0) {
      setTwistModeActive(false);
      return;
    }
    renderTwistOverlays();
  };

  const rotatePieceByTwist = (slotIndex) => {
    if (!Number.isInteger(slotIndex)) {
      return false;
    }
    const piece = state?.getPiece?.(slotIndex);
    if (!piece) {
      return false;
    }
    if (getTwistAvailable() <= 0) {
      markInvalidButton(twistBtnEl);
      return false;
    }
    if (twistPending && twistPending.slotIndex !== slotIndex) {
      markInvalidButton(twistBtnEl);
      return false;
    }

    const rotated = state?.rotatePieceInSlot?.(slotIndex);
    if (!rotated?.success) {
      markInvalidButton(twistBtnEl);
      return false;
    }

    const rotatedPieceId = Number(rotated?.piece?.instanceId ?? piece?.instanceId);
    if (Number.isFinite(rotatedPieceId)) {
      twistOverlaySeenPieceIds.add(rotatedPieceId);
    }
    if (!twistPending) {
      twistPending = { slotIndex, rotations: 0 };
    }
    twistPending.rotations = (Number(twistPending.rotations) + 1) % 4;
    if (twistPending.rotations === 0) {
      twistPending = null;
    }
    renderTwistOverlays();
    return true;
  };

  const commitTwistSelection = () => {
    const hasPending = Boolean(twistPending && Number(twistPending.rotations) > 0);
    if (!hasPending) {
      setTwistModeActive(false);
      return false;
    }
    if (!consume("twist", 1)) {
      markInvalidButton(twistBtnEl);
      return false;
    }
    twistPending = null;
    twistModeActive = false;
    twistBtnEl?.classList.remove("power-icon-btn--active");
    twistOverlaySeenPieceIds.clear();
    renderTwistOverlays();
    return true;
  };

  renderCounts();

  const setOpen = (open) => {
    hub.classList.toggle("is-open", Boolean(open));
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    if (row) {
      row.setAttribute("aria-hidden", open ? "false" : "true");
    }
  };

  const markInvalidButton = (button) => {
    if (!button) {
      return;
    }
    button.classList.remove("power-icon-btn--invalid");
    requestAnimationFrame(() => {
      button.classList.add("power-icon-btn--invalid");
    });
    window.setTimeout(() => button.classList.remove("power-icon-btn--invalid"), 240);
  };

  const clearPowerDrag = () => {
    if (!powerDrag) {
      return;
    }
    if (powerDrag.rafId) {
      cancelAnimationFrame(powerDrag.rafId);
    }
    powerDrag.dragEl?.remove();
    powerDrag.originBtn?.classList.remove("power-icon-btn--active", "power-icon-btn--invalid");
    ui?.clearHammerTargetPreview?.();
    ui?.endDragSession?.();
    powerDrag = null;
  };

  const schedulePowerDragFrame = () => {
    if (!powerDrag || powerDrag.rafId) {
      return;
    }
    powerDrag.rafId = requestAnimationFrame(() => {
      if (!powerDrag) {
        return;
      }
      powerDrag.rafId = 0;
      const controlPoint = getPowerControlPoint(
        powerDrag.lastClientX,
        powerDrag.lastClientY,
        powerDrag.pointerType,
      );
      const x = controlPoint.x - powerDrag.grabOffsetX;
      const y = controlPoint.y - powerDrag.grabOffsetY;
      powerDrag.dragEl.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    });
  };

  const getPowerTouchAimOffset = (clientX, clientY) => {
    if (!powerDrag) {
      return Number(state?.tuning?.INPUT?.DRAG_TOUCH_AIM_OFFSET_Y ?? 130);
    }

    const inputTuning = state?.tuning?.INPUT ?? {};
    const baseOffset = Number(inputTuning.DRAG_TOUCH_AIM_OFFSET_Y ?? 130);
    const boardExtra = Number(inputTuning.DRAG_TOUCH_AIM_OFFSET_BOARD_EXTRA_Y ?? 24);
    const maxOffset = Number(inputTuning.DRAG_TOUCH_AIM_OFFSET_MAX_Y ?? 170);
    const lerp = Number(inputTuning.DRAG_TOUCH_AIM_LERP ?? 0.52);
    const proximity = Number(inputTuning.DRAG_TOUCH_AIM_BOARD_PROXIMITY_PX ?? 56);

    let targetOffset = baseOffset;
    const boardRect = ui?.elements?.board?.getBoundingClientRect?.();
    if (boardRect) {
      const nearBoard =
        clientX >= boardRect.left - proximity &&
        clientX <= boardRect.right + proximity &&
        clientY >= boardRect.top - proximity &&
        clientY <= boardRect.bottom + proximity;
      if (nearBoard) {
        targetOffset = Math.min(maxOffset, baseOffset + boardExtra);
      }
    }

    if (!Number.isFinite(powerDrag.smoothedTouchOffsetY)) {
      powerDrag.smoothedTouchOffsetY = targetOffset;
      return targetOffset;
    }

    powerDrag.smoothedTouchOffsetY += (targetOffset - powerDrag.smoothedTouchOffsetY) * lerp;
    return powerDrag.smoothedTouchOffsetY;
  };

  const getPowerControlPoint = (clientX, clientY, pointerType = "mouse") => {
    if (pointerType !== "touch" && pointerType !== "pen") {
      return { x: clientX, y: clientY };
    }
    const offsetY = getPowerTouchAimOffset(clientX, clientY);
    return { x: clientX, y: Math.max(6, clientY - offsetY) };
  };

  const updateHammerTargetPreview = (clientX, clientY) => {
    if (!powerDrag || powerDrag.powerKey !== "hammer") {
      ui?.clearHammerTargetPreview?.();
      return;
    }
    const controlPoint = getPowerControlPoint(clientX, clientY, powerDrag.pointerType);
    const anchor = ui?.resolveBoardAnchor?.(controlPoint.x, controlPoint.y, { row: 0, col: 0 });
    if (!anchor) {
      ui?.clearHammerTargetPreview?.();
      return;
    }
    const preview = state?.previewHammerAt?.(anchor.row, anchor.col);
    ui?.showHammerTargetPreview?.({
      row: anchor.row,
      col: anchor.col,
      isValid: Boolean(preview?.success),
    });
  };

  const commitPowerDrop = (clientX, clientY) => {
    if (!powerDrag || !state?.isInteractive?.()) {
      return false;
    }
    const controlPoint = getPowerControlPoint(clientX, clientY, powerDrag.pointerType);
    const anchor = ui?.resolveBoardAnchor?.(controlPoint.x, controlPoint.y, { row: 0, col: 0 });
    if (!anchor) {
      markInvalidButton(powerDrag.originBtn);
      return false;
    }

    if (powerDrag.powerKey === "tnt") {
      const preview = state.previewTntAt(anchor.row, anchor.col, { size: 4 });
      if (!preview.success) {
        markInvalidButton(powerDrag.originBtn);
        return false;
      }

      ui?.playTntDropCharge?.({
        row: anchor.row,
        col: anchor.col,
        iconSrc: powerDrag.iconSrc,
        onDetonate: () => {
          const result = state.useTntAt(anchor.row, anchor.col, { size: 4 });
          if (result?.success) {
            consume("tnt", 1);
          }
        },
      });
      return true;
    }

    if (powerDrag.powerKey === "hammer") {
      const preview = state.previewHammerAt(anchor.row, anchor.col);
      if (!preview.success) {
        markInvalidButton(powerDrag.originBtn);
        return false;
      }
      ui?.clearHammerTargetPreview?.();

      ui?.playHammerDropStrike?.({
        row: anchor.row,
        col: anchor.col,
        iconSrc: powerDrag.iconSrc,
        onImpact: () => {
          const result = state.useHammerAt(anchor.row, anchor.col);
          if (result?.success) {
            consume("hammer", 1);
          }
        },
      });
      return true;
    }

    markInvalidButton(powerDrag.originBtn);
    return false;
  };

  const onPowerPointerMove = (event) => {
    if (!powerDrag) {
      return;
    }
    event.preventDefault();
    powerDrag.lastClientX = event.clientX;
    powerDrag.lastClientY = event.clientY;
    updateHammerTargetPreview(event.clientX, event.clientY);
    schedulePowerDragFrame();
  };

  const onPowerPointerUp = (event) => {
    if (!powerDrag) {
      return;
    }
    const clientX = Number(event?.clientX ?? powerDrag.lastClientX);
    const clientY = Number(event?.clientY ?? powerDrag.lastClientY);
    commitPowerDrop(clientX, clientY);
    clearPowerDrag();
  };

  const startPowerDrag = (event, button, powerKey) => {
    if (!row || powerDrag) {
      return;
    }
    if (!state?.isInteractive?.()) {
      markInvalidButton(button);
      return;
    }
    if (getCount(powerKey) <= 0) {
      markInvalidButton(button);
      return;
    }

    const icon = button.querySelector(".power-icon");
    if (!icon) {
      markInvalidButton(button);
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    button.setPointerCapture?.(event.pointerId);

    const rect = icon.getBoundingClientRect();
    const dragEl = document.createElement("div");
    dragEl.className = "drag-piece drag-piece--power";
    const img = document.createElement("img");
    img.className = "power-drag-icon";
    img.alt = "";
    img.setAttribute("aria-hidden", "true");
    img.draggable = false;
    img.src = icon.currentSrc || icon.getAttribute("src") || "";
    dragEl.appendChild(img);
    document.body.appendChild(dragEl);

    button.classList.add("power-icon-btn--active");
    ui?.beginDragSession?.();

    powerDrag = {
      powerKey,
      pointerType: event.pointerType || "touch",
      originBtn: button,
      dragEl,
      iconSrc: img.src,
      lastClientX: event.clientX,
      lastClientY: event.clientY,
      grabOffsetX: Math.max(12, rect.width * 0.5),
      grabOffsetY: Math.max(
        12,
        (rect.height * 0.5) + (
          (event.pointerType === "touch" || event.pointerType === "pen")
            ? Number(state?.tuning?.INPUT?.DRAG_LIFT_PX ?? 54)
            : 0
        ),
      ),
      smoothedTouchOffsetY: Number(state?.tuning?.INPUT?.DRAG_TOUCH_AIM_OFFSET_Y ?? 130),
      rafId: 0,
    };
    updateHammerTargetPreview(event.clientX, event.clientY);
    schedulePowerDragFrame();
  };

  setOpen(false);
  syncPowerHubModeVisibility(state?.getSnapshot?.() ?? null);

  toggle.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    const open = !hub.classList.contains("is-open");
    setOpen(open);
  });

  document.addEventListener("pointerdown", (event) => {
    if (!hub.classList.contains("is-open")) {
      return;
    }
    if (hub.contains(event.target)) {
      return;
    }
    setOpen(false);
  });

  window.addEventListener("pointermove", onPowerPointerMove, { passive: false });
  window.addEventListener("pointerup", onPowerPointerUp);
  window.addEventListener("pointercancel", clearPowerDrag);

  if (row) {
    row.addEventListener("pointerdown", (event) => {
      const button = event.target instanceof HTMLElement ? event.target.closest(".power-icon-btn") : null;
      if (!button) {
        return;
      }
      const key = button.dataset.powerKey || "";
      if (key === "tnt" || key === "hammer") {
        startPowerDrag(event, button, key);
      }
    });

    row.addEventListener("click", (event) => {
      const button = event.target instanceof HTMLElement ? event.target.closest(".power-icon-btn") : null;
      if (!button) {
        return;
      }
      const key = button.dataset.powerKey || "";
      if (key) {
        button.setAttribute("title", `${key.toUpperCase()} • ${inventory[key] ?? 0}`);
      }
      if (key === "twist") {
        event.preventDefault();
        event.stopPropagation();
        if (twistModeActive) {
          commitTwistSelection();
        } else {
          setTwistModeActive(true);
        }
      }
    });
  }

  if (pieceTrayEl) {
    pieceTrayEl.addEventListener("pointerdown", (event) => {
      if (!twistModeActive) {
        return;
      }
      const card = event.target instanceof HTMLElement ? event.target.closest(".piece-card") : null;
      if (!card || card.classList.contains("piece-card--empty")) {
        return;
      }
      const slotIndex = Number(card.dataset.slot);
      event.preventDefault();
      event.stopPropagation();
      const rotated = rotatePieceByTwist(slotIndex);
      if (!rotated) {
        markInvalidButton(twistBtnEl);
      }
    }, true);
  }

  return {
    getCount,
    consume,
    setCount,
    syncFromSnapshot: syncTwistFromSnapshot,
  };
}
function buildGridCrownSeedPlayers(count = LEADERBOARD_SEED_COUNT) {
  const total = Math.min(
    Math.max(1, Math.floor(Number(count) || LEADERBOARD_SEED_COUNT)),
    LEADERBOARD_SEED_COUNTRY_PROFILES.length * 10,
  );
  const slotsPerCountry = 10;
  const usedNames = new Set();
  const profileByCode = new Map(LEADERBOARD_SEED_COUNTRY_PROFILES.map((profile) => [profile.code, profile]));
  const assignmentOrder = buildSeedAssignmentOrder(LEADERBOARD_SEED_COUNTRY_PROFILES, slotsPerCountry).slice(0, total);
  const players = [];
  for (let index = 0; index < assignmentOrder.length; index += 1) {
    const assignment = assignmentOrder[index];
    const profile = profileByCode.get(assignment.code);
    if (!profile) {
      continue;
    }
    const slot = assignment.slot;
    const countryCode = profile.code;
    const first = profile.firstNames[slot];
    const primaryLast = profile.lastNames[(slot * 3 + 1) % profile.lastNames.length];
    let fullName = `${first} ${primaryLast}`;
    if (usedNames.has(fullName)) {
      const secondaryLast = profile.lastNames[(slot * 3 + 2) % profile.lastNames.length];
      fullName = `${first} ${secondaryLast}`;
    }
    if (usedNames.has(fullName)) {
      const tertiaryLast = profile.lastNames[(slot * 3 + 4) % profile.lastNames.length];
      fullName = `${first}-${countryCode} ${tertiaryLast}`;
    }
    const shouldUseNickname = index % 2 === 1;
    const displayName = shouldUseNickname
      ? buildCountryNickname(profile, slot, countryCode, index)
      : fullName;
    fullName = createUniqueSeedName(displayName, usedNames);
    const normalized = total > 1 ? (index / (total - 1)) : 0;
    const globalScore = Math.max(1100, Math.round(33600 - (Math.pow(normalized, 1.22) * 32200)));
    const weeklyBase = Math.max(1000, Math.round(14100 - (Math.pow(normalized, 1.16) * 12900)));
    const weeklyScore = Math.max(1000, Math.min(globalScore - 40, weeklyBase));
    players.push({
      playerId: `gc-bot-${String(index + 1).padStart(3, "0")}`,
      name: fullName,
      countryCode,
      globalScore,
      weeklyScore,
      isBot: true,
    });
  }
  return players;
}

async function writeSeedEntriesToCollection(collectionName, entries, scoreKey) {
  if (!leaderboardFirebaseRuntime.ready || !leaderboardFirebaseRuntime.db || !leaderboardFirebaseRuntime.api) {
    return;
  }
  const {
    writeBatch,
    doc,
    serverTimestamp,
  } = leaderboardFirebaseRuntime.api;
  let batch = writeBatch(leaderboardFirebaseRuntime.db);
  let queued = 0;
  for (let i = 0; i < entries.length; i += 1) {
    const item = entries[i];
    const docRef = doc(leaderboardFirebaseRuntime.db, collectionName, item.playerId);
    batch.set(docRef, {
      playerId: item.playerId,
      name: item.name,
      countryCode: item.countryCode,
      score: Math.max(0, Math.floor(Number(item?.[scoreKey]) || 0)),
      isBot: true,
      updatedAt: serverTimestamp(),
    }, { merge: true });
    queued += 1;
    if (queued >= LEADERBOARD_WRITE_BATCH_SIZE) {
      await batch.commit();
      batch = writeBatch(leaderboardFirebaseRuntime.db);
      queued = 0;
    }
  }
  if (queued > 0) {
    await batch.commit();
  }
}

function getStoredWeeklyRotationCycle() {
  try {
    return Number.parseInt(localStorage.getItem(LEADERBOARD_WEEKLY_ROTATION_STORAGE_KEY) ?? "", 10) || 0;
  } catch {
    return 0;
  }
}

function setStoredWeeklyRotationCycle(cycle) {
  try {
    localStorage.setItem(LEADERBOARD_WEEKLY_ROTATION_STORAGE_KEY, String(Math.max(0, Math.floor(Number(cycle) || 0))));
  } catch {
    // Ignore storage write failures.
  }
}

function buildWeeklyAliasName(baseName, countryCode, cycle, index) {
  const compact = String(baseName ?? "Player").replace(/[^A-Za-z0-9]/g, "");
  const token = (seedMixHash(`${compact}-${countryCode}-${cycle}-${index}`) % 900) + 100;
  const cut = Math.max(3, Math.min(10, compact.length));
  const alias = `${compact.slice(0, cut)}_${countryCode}${token}`;
  return alias.slice(0, 18);
}

function buildRotatingWeeklyPlayers(seedPlayers, cycle) {
  const source = Array.isArray(seedPlayers) ? seedPlayers : [];
  if (!source.length) {
    return [];
  }
  const total = Math.min(source.length, LEADERBOARD_SEED_COUNT);
  const randomized = source
    .slice(0, total)
    .map((player) => ({
      ...player,
      weeklyMix: seedMixHash(`${player.playerId}-${cycle}`),
    }))
    .sort((a, b) => {
      if (a.weeklyMix !== b.weeklyMix) {
        return b.weeklyMix - a.weeklyMix;
      }
      return a.playerId.localeCompare(b.playerId);
    });

  const repeatedNameCount = Math.max(
    120,
    Math.min(total - 1, Math.floor(total * LEADERBOARD_WEEKLY_SHARED_NAME_RATIO)),
  );
  const usedNames = new Set();
  const players = [];
  for (let index = 0; index < randomized.length; index += 1) {
    const player = randomized[index];
    const fromGlobal = index < repeatedNameCount;
    const baseName = fromGlobal
      ? String(player.name ?? "Player")
      : buildWeeklyAliasName(player.name, player.countryCode, cycle, index);
    const name = createUniqueSeedName(baseName, usedNames);
    const normalized = total > 1 ? (index / (total - 1)) : 0;
    const curve = Math.pow(normalized, 1.15);
    const scoreSwing = index === 0 ? 0 : (seedMixHash(`${player.playerId}-swing-${cycle}`) % 180);
    const weeklyScore = Math.max(
      1000,
      Math.round(15000 - (curve * 14000) - scoreSwing),
    );
    players.push({
      playerId: player.playerId,
      countryCode: player.countryCode,
      name,
      weeklyScore,
      isBot: true,
    });
  }
  return players;
}

function resolveSeedPlayersFromSnapshot(snapshot, fallbackPlayers) {
  const rows = Array.isArray(snapshot?.docs) ? snapshot.docs : [];
  const fromFirestore = rows
    .map((entryDoc) => {
      const data = typeof entryDoc?.data === "function" ? entryDoc.data() : null;
      const playerId = String(entryDoc?.id ?? data?.playerId ?? "").trim();
      const name = String(data?.name ?? "").trim().slice(0, 18);
      const countryCode = String(data?.countryCode ?? "").toUpperCase();
      const score = Math.max(0, Math.floor(Number(data?.score) || 0));
      if (!playerId || !name || !/^[A-Z]{2}$/.test(countryCode) || score <= 0) {
        return null;
      }
      return {
        playerId,
        name,
        countryCode,
        globalScore: score,
      };
    })
    .filter(Boolean);

  if (fromFirestore.length >= Math.min(LEADERBOARD_SEED_COUNT, 120)) {
    return fromFirestore;
  }
  return Array.isArray(fallbackPlayers) ? fallbackPlayers : [];
}

async function ensureWeeklyRotation(globalSnapshot, weeklySnapshot, fallbackPlayers, { force = false } = {}) {
  if (!leaderboardFirebaseRuntime.ready || !leaderboardFirebaseRuntime.db || !leaderboardFirebaseRuntime.api) {
    return;
  }
  if (leaderboardFirebaseRuntime.weeklyRotationPromise) {
    await leaderboardFirebaseRuntime.weeklyRotationPromise;
    return;
  }
  const nowCycle = Math.floor(Date.now() / LEADERBOARD_WEEKLY_ROTATION_INTERVAL_MS);
  const storedCycle = getStoredWeeklyRotationCycle();
  const weeklyCount = Number(weeklySnapshot?.size) || 0;
  const shouldRotate = force || weeklyCount < LEADERBOARD_SEED_COUNT || storedCycle !== nowCycle;
  if (!shouldRotate) {
    return;
  }

  leaderboardFirebaseRuntime.weeklyRotationPromise = (async () => {
    try {
      const seedPlayers = resolveSeedPlayersFromSnapshot(globalSnapshot, fallbackPlayers);
      if (!seedPlayers.length) {
        return;
      }
      const rotatingWeekly = buildRotatingWeeklyPlayers(seedPlayers, nowCycle);
      await writeSeedEntriesToCollection(LEADERBOARD_COLLECTIONS.weekly, rotatingWeekly, "weeklyScore");
      setStoredWeeklyRotationCycle(nowCycle);
    } catch (error) {
      console.warn("[leaderboard] weekly rotation update failed.", error);
    } finally {
      leaderboardFirebaseRuntime.weeklyRotationPromise = null;
    }
  })();
  await leaderboardFirebaseRuntime.weeklyRotationPromise;
}

async function refreshWeeklyRotationIfNeeded() {
  if (!leaderboardFirebaseRuntime.ready || !leaderboardFirebaseRuntime.db || !leaderboardFirebaseRuntime.api) {
    return;
  }
  const {
    collection,
    query,
    orderBy,
    limit,
    getDocs,
  } = leaderboardFirebaseRuntime.api;
  const [globalSnap, weeklySnap] = await Promise.all([
    getDocs(query(
      collection(leaderboardFirebaseRuntime.db, LEADERBOARD_COLLECTIONS.global),
      orderBy("score", "desc"),
      limit(LEADERBOARD_SEED_COUNT),
    )),
    getDocs(query(
      collection(leaderboardFirebaseRuntime.db, LEADERBOARD_COLLECTIONS.weekly),
      orderBy("score", "desc"),
      limit(LEADERBOARD_SEED_COUNT),
    )),
  ]);
  await ensureWeeklyRotation(globalSnap, weeklySnap, null, { force: false });
}

async function ensureGridCrownSeedLeaderboard() {
  if (!leaderboardFirebaseRuntime.ready || !leaderboardFirebaseRuntime.db || !leaderboardFirebaseRuntime.api) {
    return;
  }
  if (leaderboardFirebaseRuntime.seedReady) {
    await refreshWeeklyRotationIfNeeded();
    return;
  }
  if (leaderboardFirebaseRuntime.seedPromise) {
    await leaderboardFirebaseRuntime.seedPromise;
    return;
  }
  const {
    collection,
    query,
    orderBy,
    limit,
    getDocs,
  } = leaderboardFirebaseRuntime.api;
  leaderboardFirebaseRuntime.seedPromise = (async () => {
    try {
      const [globalSnap, weeklySnap] = await Promise.all([
        getDocs(query(
          collection(leaderboardFirebaseRuntime.db, LEADERBOARD_COLLECTIONS.global),
          orderBy("score", "desc"),
          limit(LEADERBOARD_SEED_COUNT),
        )),
        getDocs(query(
          collection(leaderboardFirebaseRuntime.db, LEADERBOARD_COLLECTIONS.weekly),
          orderBy("score", "desc"),
          limit(LEADERBOARD_SEED_COUNT),
        )),
      ]);

      const seedVersionNeedsRefresh = getStoredLeaderboardSeedVersion() !== LEADERBOARD_SEED_VERSION;
      const shouldSeedGlobal = seedVersionNeedsRefresh || globalSnap.size < LEADERBOARD_SEED_COUNT;
      const seedPlayers = buildGridCrownSeedPlayers(LEADERBOARD_SEED_COUNT);
      if (shouldSeedGlobal) {
        await writeSeedEntriesToCollection(LEADERBOARD_COLLECTIONS.global, seedPlayers, "globalScore");
      }
      await ensureWeeklyRotation(shouldSeedGlobal ? null : globalSnap, weeklySnap, seedPlayers, {
        force: seedVersionNeedsRefresh,
      });
      setStoredLeaderboardSeedVersion(LEADERBOARD_SEED_VERSION);
      leaderboardFirebaseRuntime.seedReady = true;
    } catch (error) {
      console.warn("[leaderboard] Grid Crown seed write failed.", error);
    } finally {
      leaderboardFirebaseRuntime.seedPromise = null;
    }
  })();
  await leaderboardFirebaseRuntime.seedPromise;
}

function loadOrCreateLeaderboardPlayerId() {
  const fallback = `ng-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  try {
    const existing = localStorage.getItem(LEADERBOARD_PLAYER_ID_STORAGE_KEY);
    if (existing && /^[a-z0-9\-]{8,64}$/i.test(existing)) {
      return existing;
    }
    const generated = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? `ng-${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`
      : fallback;
    localStorage.setItem(LEADERBOARD_PLAYER_ID_STORAGE_KEY, generated);
    return generated;
  } catch {
    return fallback;
  }
}

function getLeaderboardFirebaseConfig() {
  const parseCandidate = (candidate) => {
    if (!candidate || typeof candidate !== "object") {
      return null;
    }
    if (candidate.enabled !== true) {
      return null;
    }
    const safe = {
      apiKey: String(candidate.apiKey ?? "").trim(),
      authDomain: String(candidate.authDomain ?? "").trim(),
      projectId: String(candidate.projectId ?? "").trim(),
      appId: String(candidate.appId ?? "").trim(),
      storageBucket: String(candidate.storageBucket ?? "").trim(),
      messagingSenderId: String(candidate.messagingSenderId ?? "").trim(),
      measurementId: String(candidate.measurementId ?? "").trim(),
    };
    if (!safe.apiKey || !safe.authDomain || !safe.projectId || !safe.appId) {
      return null;
    }
    return safe;
  };

  const fromWindow = parseCandidate(window.__LEADERBOARD_FIREBASE__);
  if (fromWindow) {
    return fromWindow;
  }

  try {
    const raw = localStorage.getItem(LEADERBOARD_FIREBASE_CONFIG_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    return parseCandidate(parsed);
  } catch {
    return null;
  }
}

function getStoredLeaderboardSeedVersion() {
  try {
    return String(localStorage.getItem(LEADERBOARD_SEED_VERSION_STORAGE_KEY) ?? "").trim();
  } catch {
    return "";
  }
}

function setStoredLeaderboardSeedVersion(version) {
  try {
    localStorage.setItem(LEADERBOARD_SEED_VERSION_STORAGE_KEY, String(version ?? "").trim());
  } catch {
    // Ignore storage write failures.
  }
}

async function initLeaderboardFirebase() {
  if (leaderboardFirebaseRuntime.ready) {
    return true;
  }
  if (leaderboardFirebaseRuntime.initPromise) {
    return leaderboardFirebaseRuntime.initPromise;
  }
  const config = getLeaderboardFirebaseConfig();
  if (!config) {
    leaderboardFirebaseRuntime.initAttempted = true;
    return false;
  }

  leaderboardFirebaseRuntime.initPromise = (async () => {
    try {
      const [{ initializeApp, getApps, getApp }, firestoreModule] = await Promise.all([
        import(`https://www.gstatic.com/firebasejs/${FIREBASE_LEADERBOARD_SDK_VERSION}/firebase-app.js`),
        import(`https://www.gstatic.com/firebasejs/${FIREBASE_LEADERBOARD_SDK_VERSION}/firebase-firestore.js`),
      ]);
      const app = getApps().length ? getApp() : initializeApp(config);
      const db = firestoreModule.getFirestore(app);
      leaderboardFirebaseRuntime.db = db;
      leaderboardFirebaseRuntime.api = firestoreModule;
      leaderboardFirebaseRuntime.ready = true;
      leaderboardFirebaseRuntime.initAttempted = true;
      return true;
    } catch (error) {
      leaderboardFirebaseRuntime.ready = false;
      leaderboardFirebaseRuntime.initAttempted = true;
      console.warn("[leaderboard] Firebase init failed; prototype mode active.", error);
      return false;
    } finally {
      leaderboardFirebaseRuntime.initPromise = null;
    }
  })();

  return leaderboardFirebaseRuntime.initPromise;
}

function computeWeeklyPlayerScore(snapshot, bestScore) {
  const latestScore = Math.max(0, Math.floor(Number(snapshot?.score) || 0));
  const weeklyFromRuns = Array.isArray(snapshot?.weeklyTop) ? snapshot.weeklyTop : [];
  const weeklyBestFromRuns = weeklyFromRuns.reduce(
    (maxScore, entry) => Math.max(maxScore, Math.floor(Number(entry?.score) || 0)),
    0,
  );
  return Math.max(weeklyBestFromRuns, Math.floor(bestScore * 0.38), latestScore);
}

async function upsertLeaderboardScore({ mode, score, profile }) {
  if (!leaderboardFirebaseRuntime.ready || !leaderboardFirebaseRuntime.db || !leaderboardFirebaseRuntime.api) {
    return;
  }
  if (!Number.isFinite(score) || score <= 0) {
    return;
  }

  const safeMode = mode === "weekly" ? "weekly" : "global";
  const collectionName = LEADERBOARD_COLLECTIONS[safeMode];
  const {
    doc,
    getDoc,
    setDoc,
    serverTimestamp,
  } = leaderboardFirebaseRuntime.api;
  const entryRef = doc(leaderboardFirebaseRuntime.db, collectionName, leaderboardFirebaseRuntime.playerId);
  const entrySnapshot = await getDoc(entryRef);
  const currentScore = entrySnapshot.exists()
    ? Math.max(0, Math.floor(Number(entrySnapshot.data()?.score) || 0))
    : 0;
  const nextScore = Math.max(currentScore, Math.floor(Number(score) || 0));
  if (nextScore <= 0) {
    return;
  }
  const safeName = String(profile?.name ?? "Player").replace(/\s+/g, " ").trim().slice(0, 18) || "Player";
  const safeCountry = /^[A-Z]{2}$/.test(String(profile?.countryCode ?? "").toUpperCase())
    ? String(profile.countryCode).toUpperCase()
    : "TR";
  await setDoc(entryRef, {
    playerId: leaderboardFirebaseRuntime.playerId,
    name: safeName,
    countryCode: safeCountry,
    score: nextScore,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

async function syncPlayerLeaderboardScores(snapshot, profile) {
  const firebaseReady = await initLeaderboardFirebase();
  if (!firebaseReady) {
    return;
  }
  const bestScore = Math.max(0, Math.floor(Number(snapshot?.bestScore) || 0));
  const weeklyScore = computeWeeklyPlayerScore(snapshot, bestScore);
  try {
    await Promise.all([
      upsertLeaderboardScore({ mode: "global", score: bestScore, profile }),
      upsertLeaderboardScore({ mode: "weekly", score: weeklyScore, profile }),
    ]);
  } catch (error) {
    console.warn("[leaderboard] score sync failed.", error);
  }
}

async function fetchLeaderboardFromFirebase(snapshot, profile) {
  const firebaseReady = await initLeaderboardFirebase();
  if (!firebaseReady || !leaderboardFirebaseRuntime.db || !leaderboardFirebaseRuntime.api) {
    return null;
  }
  await ensureGridCrownSeedLeaderboard();

  const {
    collection,
    query,
    orderBy,
    limit,
    getDocs,
    doc,
    getDoc,
  } = leaderboardFirebaseRuntime.api;

  const toUiEntries = (docs = []) => normalizeLeaderboardEntries(
    docs.map((entry) => ({
      name: entry.name,
      countryCode: entry.countryCode ?? entry.country ?? entry.country_code,
      score: entry.score,
      isPlayer: String(entry.entryId ?? "") === leaderboardFirebaseRuntime.playerId,
    })),
  ).slice(0, LEADERBOARD_FETCH_LIMIT);

  try {
    const [globalSnapshot, weeklySnapshot, playerGlobalSnapshot, playerWeeklySnapshot] = await Promise.all([
      getDocs(query(
        collection(leaderboardFirebaseRuntime.db, LEADERBOARD_COLLECTIONS.global),
        orderBy("score", "desc"),
        limit(LEADERBOARD_FETCH_LIMIT),
      )),
      getDocs(query(
        collection(leaderboardFirebaseRuntime.db, LEADERBOARD_COLLECTIONS.weekly),
        orderBy("score", "desc"),
        limit(LEADERBOARD_FETCH_LIMIT),
      )),
      getDoc(doc(leaderboardFirebaseRuntime.db, LEADERBOARD_COLLECTIONS.global, leaderboardFirebaseRuntime.playerId)),
      getDoc(doc(leaderboardFirebaseRuntime.db, LEADERBOARD_COLLECTIONS.weekly, leaderboardFirebaseRuntime.playerId)),
    ]);

    const globalEntries = toUiEntries(globalSnapshot.docs.map((entryDoc) => ({
      entryId: entryDoc.id,
      ...entryDoc.data(),
    })));
    const weeklyEntries = toUiEntries(weeklySnapshot.docs.map((entryDoc) => ({
      entryId: entryDoc.id,
      ...entryDoc.data(),
    })));

    if (!globalEntries.length && !weeklyEntries.length) {
      return null;
    }

    const yourRankGlobal = globalEntries.find((entry) => entry.isPlayer)
      ?? (playerGlobalSnapshot.exists() ? {
        rank: null,
        name: String(playerGlobalSnapshot.data()?.name ?? profile?.name ?? "Player").slice(0, 18),
        countryCode: String(playerGlobalSnapshot.data()?.countryCode ?? profile?.countryCode ?? "TR").toUpperCase(),
        score: Math.max(0, Math.floor(Number(playerGlobalSnapshot.data()?.score) || 0)),
        isPlayer: true,
      } : null);

    const yourRankWeekly = weeklyEntries.find((entry) => entry.isPlayer)
      ?? (playerWeeklySnapshot.exists() ? {
        rank: null,
        name: String(playerWeeklySnapshot.data()?.name ?? profile?.name ?? "Player").slice(0, 18),
        countryCode: String(playerWeeklySnapshot.data()?.countryCode ?? profile?.countryCode ?? "TR").toUpperCase(),
        score: Math.max(0, Math.floor(Number(playerWeeklySnapshot.data()?.score) || 0)),
        isPlayer: true,
      } : null);

    return {
      globalEntries,
      weeklyEntries,
      profile,
      yourRankGlobal,
      yourRankWeekly,
    };
  } catch (error) {
    console.warn("[leaderboard] Firebase fetch failed; prototype mode active.", error);
    return null;
  }
}

function loadRuntimeSettings() {
  const normalizeVisualMode = (value) => {
    const safe = String(value ?? "").toLowerCase();
    if (safe === "emerald" || safe === "sunset" || safe === "pink" || safe === "royal") {
      return safe;
    }
    return "royal";
  };
  const fallback = {
    soundEnabled: true,
    hapticsEnabled: true,
    relaxingModeEnabled: false,
    relaxingMusicEnabled: false,
    photoBoardEnabled: false,
    visualMode: "royal",
  };
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) {
      return fallback;
    }
    const parsed = JSON.parse(raw);
    return {
      soundEnabled: parsed.soundEnabled !== false,
      hapticsEnabled: parsed.hapticsEnabled !== false,
      relaxingModeEnabled: parsed.relaxingModeEnabled === true,
      relaxingMusicEnabled: parsed.relaxingMusicEnabled === true,
      photoBoardEnabled: parsed.photoBoardEnabled === true,
      visualMode: normalizeVisualMode(parsed.visualMode),
    };
  } catch {
    return fallback;
  }
}

function saveRuntimeSettings(settings) {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage write failures.
  }
}

function loadPhotoBoardImageDataUrl() {
  try {
    const raw = localStorage.getItem(PHOTO_BOARD_IMAGE_STORAGE_KEY);
    if (!raw || typeof raw !== "string") {
      return "";
    }
    return raw.startsWith("data:image/") ? raw : "";
  } catch {
    return "";
  }
}

function savePhotoBoardImageDataUrl(dataUrl) {
  try {
    if (typeof dataUrl === "string" && dataUrl.startsWith("data:image/")) {
      localStorage.setItem(PHOTO_BOARD_IMAGE_STORAGE_KEY, dataUrl);
    } else {
      localStorage.removeItem(PHOTO_BOARD_IMAGE_STORAGE_KEY);
    }
  } catch {
    // Ignore storage write failures.
  }
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (!(file instanceof Blob)) {
      reject(new Error("Invalid file"));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("Failed to read image file"));
    reader.readAsDataURL(file);
  });
}

function estimateDataUrlBytes(dataUrl) {
  if (typeof dataUrl !== "string") {
    return 0;
  }
  const commaIndex = dataUrl.indexOf(",");
  if (commaIndex < 0) {
    return 0;
  }
  const base64 = dataUrl.slice(commaIndex + 1);
  const padding = (base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0);
  return Math.max(0, Math.floor((base64.length * 3) / 4) - padding);
}

function resolvePhotoBoardQualityProfile({ inputBytes = 0 } = {}) {
  const memoryGb = Number(navigator.deviceMemory || 0);
  const cpuCores = Number(navigator.hardwareConcurrency || 0);
  const dpr = Number(window.devicePixelRatio || 1);
  const viewportMin = Math.min(
    Math.max(1, Number(window.innerWidth || 0)),
    Math.max(1, Number(window.innerHeight || 0)),
  );
  const isTouchLike =
    window.matchMedia?.("(pointer: coarse)")?.matches ||
    navigator.maxTouchPoints > 0;

  const veryLowPower =
    (memoryGb > 0 && memoryGb <= 3) ||
    (cpuCores > 0 && cpuCores <= 4);
  const lowPower =
    veryLowPower ||
    (memoryGb > 0 && memoryGb <= 4) ||
    (cpuCores > 0 && cpuCores <= 6);
  const oversizedInput = Number(inputBytes) > (9.5 * 1024 * 1024);

  if (veryLowPower || oversizedInput) {
    return {
      targetSize: 352,
      normalizeQuality: 0.72,
      tileQuality: 0.66,
      maxOutputBytes: 280 * 1024,
    };
  }

  if (lowPower || (isTouchLike && (dpr >= 2.7 || viewportMin <= 400))) {
    return {
      targetSize: 416,
      normalizeQuality: 0.78,
      tileQuality: 0.72,
      maxOutputBytes: 340 * 1024,
    };
  }

  if (isTouchLike) {
    return {
      targetSize: 512,
      normalizeQuality: 0.84,
      tileQuality: 0.78,
      maxOutputBytes: 460 * 1024,
    };
  }

  return {
    targetSize: 640,
    normalizeQuality: 0.9,
    tileQuality: 0.86,
    maxOutputBytes: 620 * 1024,
  };
}

function loadImageFromDataUrl(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Unable to decode selected image"));
    img.src = dataUrl;
  });
}

async function normalizePhotoBoardImageDataUrl(dataUrl, {
  targetSize = 640,
  quality = 0.9,
  maxOutputBytes = 620 * 1024,
} = {}) {
  const image = await loadImageFromDataUrl(dataUrl);
  const width = Math.max(1, Number(image.naturalWidth || image.width || 1));
  const height = Math.max(1, Number(image.naturalHeight || image.height || 1));
  const side = Math.max(1, Math.min(width, height));
  const sx = Math.max(0, Math.floor((width - side) / 2));
  const sy = Math.max(0, Math.floor((height - side) / 2));
  let size = Math.max(128, Math.floor(Number(targetSize) || 640));
  let encodeQuality = Math.max(0.6, Math.min(0.95, Number(quality) || 0.9));
  const maxBytes = Math.max(140 * 1024, Math.floor(Number(maxOutputBytes) || (620 * 1024)));
  const minSize = 224;
  const minQuality = 0.6;

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) {
    throw new Error("Canvas context unavailable");
  }

  let encoded = "";
  for (let attempt = 0; attempt < 7; attempt += 1) {
    canvas.width = size;
    canvas.height = size;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.clearRect(0, 0, size, size);
    ctx.drawImage(image, sx, sy, side, side, 0, 0, size, size);
    encoded = canvas.toDataURL("image/jpeg", encodeQuality);
    const encodedBytes = estimateDataUrlBytes(encoded);
    if (encodedBytes <= maxBytes || (size <= minSize && encodeQuality <= minQuality + 0.01)) {
      break;
    }

    const aggressiveShrink = encodedBytes > (maxBytes * 1.2);
    if (size > minSize) {
      size = Math.max(minSize, Math.floor(size * (aggressiveShrink ? 0.84 : 0.9)));
    }
    if (encodeQuality > minQuality) {
      encodeQuality = Math.max(minQuality, encodeQuality - (aggressiveShrink ? 0.1 : 0.06));
    }
  }
  return encoded;
}

async function buildPhotoBoardTiles(dataUrl, {
  boardSize = 8,
  tileQuality = 0.86,
} = {}) {
  const image = await loadImageFromDataUrl(dataUrl);
  const width = Math.max(1, Number(image.naturalWidth || image.width || 1));
  const height = Math.max(1, Number(image.naturalHeight || image.height || 1));
  const grid = Math.max(2, Math.floor(Number(boardSize) || 8));
  const tileWidth = Math.max(1, Math.floor(width / grid));
  const tileHeight = Math.max(1, Math.floor(height / grid));

  const tileCanvas = document.createElement("canvas");
  tileCanvas.width = tileWidth;
  tileCanvas.height = tileHeight;
  const tileCtx = tileCanvas.getContext("2d", { alpha: false });
  if (!tileCtx) {
    throw new Error("Tile canvas context unavailable");
  }
  tileCtx.imageSmoothingEnabled = true;
  tileCtx.imageSmoothingQuality = "high";

  const tiles = [];
  for (let row = 0; row < grid; row += 1) {
    for (let col = 0; col < grid; col += 1) {
      const sx = col * tileWidth;
      const sy = row * tileHeight;
      tileCtx.clearRect(0, 0, tileWidth, tileHeight);
      tileCtx.drawImage(image, sx, sy, tileWidth, tileHeight, 0, 0, tileWidth, tileHeight);
      tiles.push(tileCanvas.toDataURL("image/jpeg", Math.max(0.6, Math.min(0.95, tileQuality))));
    }
  }
  return tiles;
}

function loadRemoveAdsUnlocked() {
  try {
    return localStorage.getItem(REMOVE_ADS_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function saveRemoveAdsUnlocked(enabled) {
  try {
    localStorage.setItem(REMOVE_ADS_STORAGE_KEY, enabled ? "1" : "0");
  } catch {
    // Ignore storage write failures.
  }
}

function loadShopDailyLastClaimAtMs() {
  try {
    const raw = Number(localStorage.getItem(SHOP_DAILY_REWARD_LAST_CLAIM_KEY) || 0);
    if (!Number.isFinite(raw) || raw <= 0) {
      return 0;
    }
    return Math.floor(raw);
  } catch {
    return 0;
  }
}

function saveShopDailyLastClaimAtMs(value) {
  try {
    const safeValue = Math.max(0, Math.floor(Number(value) || 0));
    localStorage.setItem(SHOP_DAILY_REWARD_LAST_CLAIM_KEY, String(safeValue));
  } catch {
    // Ignore storage write failures.
  }
}

function loadShopPackGrantedTokens() {
  try {
    const raw = localStorage.getItem(SHOP_PACK_GRANTED_TOKENS_STORAGE_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return {};
    }
    const safe = {};
    for (const [packId, tokenList] of Object.entries(parsed)) {
      if (!Array.isArray(tokenList)) {
        continue;
      }
      const normalizedPackId = String(packId || "").trim();
      if (!normalizedPackId) {
        continue;
      }
      const dedupedTokens = [...new Set(
        tokenList
          .map((entry) => String(entry || "").trim())
          .filter(Boolean),
      )].slice(-40);
      if (dedupedTokens.length > 0) {
        safe[normalizedPackId] = dedupedTokens;
      }
    }
    return safe;
  } catch {
    return {};
  }
}

function saveShopPackGrantedTokens(tokensByPack) {
  try {
    localStorage.setItem(
      SHOP_PACK_GRANTED_TOKENS_STORAGE_KEY,
      JSON.stringify(tokensByPack && typeof tokensByPack === "object" ? tokensByPack : {}),
    );
  } catch {
    // Ignore storage write failures.
  }
}

function hasGrantedShopPackPurchaseToken(tokensByPack, packId, token) {
  const normalizedPackId = String(packId || "").trim();
  const normalizedToken = String(token || "").trim();
  if (!normalizedPackId || !normalizedToken) {
    return false;
  }
  return Array.isArray(tokensByPack?.[normalizedPackId])
    && tokensByPack[normalizedPackId].includes(normalizedToken);
}

function rememberGrantedShopPackPurchaseToken(tokensByPack, packId, token) {
  const normalizedPackId = String(packId || "").trim();
  const normalizedToken = String(token || "").trim();
  if (!normalizedPackId || !normalizedToken) {
    return tokensByPack;
  }
  const next = {
    ...(tokensByPack && typeof tokensByPack === "object" ? tokensByPack : {}),
  };
  const current = Array.isArray(next[normalizedPackId]) ? next[normalizedPackId] : [];
  if (current.includes(normalizedToken)) {
    return next;
  }
  next[normalizedPackId] = [...current, normalizedToken].slice(-40);
  return next;
}

function getLocalDayKey(now = Date.now()) {
  const date = new Date(now);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function loadRewardedContinueUsage() {
  const fallback = {
    dayKey: getLocalDayKey(),
    count: 0,
  };
  try {
    const raw = localStorage.getItem(REWARDED_CONTINUE_USAGE_STORAGE_KEY);
    if (!raw) {
      return fallback;
    }
    const parsed = JSON.parse(raw);
    const safeDayKey = typeof parsed?.dayKey === "string" ? parsed.dayKey : fallback.dayKey;
    const safeCount = Math.max(0, Math.floor(Number(parsed?.count) || 0));
    return {
      dayKey: safeDayKey,
      count: safeCount,
    };
  } catch {
    return fallback;
  }
}

function saveRewardedContinueUsage(usage) {
  try {
    const dayKey = typeof usage?.dayKey === "string" ? usage.dayKey : getLocalDayKey();
    const count = Math.max(0, Math.floor(Number(usage?.count) || 0));
    localStorage.setItem(
      REWARDED_CONTINUE_USAGE_STORAGE_KEY,
      JSON.stringify({ dayKey, count }),
    );
  } catch {
    // Ignore storage write failures.
  }
}

function loadLeaderboardProfile() {
  const fallback = {
    name: "Player",
    countryCode: "TR",
    profileLocked: false,
  };
  try {
    const raw = localStorage.getItem(LEADERBOARD_PROFILE_STORAGE_KEY);
    if (!raw) {
      return fallback;
    }
    const parsed = JSON.parse(raw);
    const safeName = String(parsed?.name ?? "").replace(/\s+/g, " ").trim().slice(0, 18);
    const safeCountry = String(parsed?.countryCode ?? "").toUpperCase();
    const hasLegacyProfile = safeName.length > 0 && /^[A-Z]{2}$/.test(safeCountry);
    const safeLocked = typeof parsed?.profileLocked === "boolean"
      ? parsed.profileLocked
      : hasLegacyProfile;
    return {
      name: safeName || fallback.name,
      countryCode: /^[A-Z]{2}$/.test(safeCountry) ? safeCountry : fallback.countryCode,
      profileLocked: safeLocked,
    };
  } catch {
    return fallback;
  }
}

function saveLeaderboardProfile(profile) {
  const safeProfile = {
    name: String(profile?.name ?? "Player").replace(/\s+/g, " ").trim().slice(0, 18) || "Player",
    countryCode: /^[A-Z]{2}$/.test(String(profile?.countryCode ?? "").toUpperCase())
      ? String(profile.countryCode).toUpperCase()
      : "TR",
    profileLocked: Boolean(profile?.profileLocked),
  };
  try {
    localStorage.setItem(LEADERBOARD_PROFILE_STORAGE_KEY, JSON.stringify(safeProfile));
  } catch {
    // Ignore storage write failures.
  }
}

function normalizeLeaderboardEntries(entries = []) {
  return [...entries]
    .map((entry) => ({
      name: String(entry.name ?? "Player").slice(0, 18),
      countryCode: String(entry.countryCode ?? "TR").toUpperCase(),
      score: Math.max(0, Math.floor(Number(entry.score) || 0)),
      isPlayer: Boolean(entry.isPlayer),
    }))
    .sort((a, b) => b.score - a.score)
    .map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));
}

function buildLeaderboardPrototypeData(snapshot, profile) {
  const bestScore = Math.max(0, Math.floor(Number(snapshot?.bestScore) || 0));

  const baseGlobal = [
    { name: "NovaAce", countryCode: "US", score: 33800 },
    { name: "VortexTR", countryCode: "TR", score: 32420 },
    { name: "FrostHex", countryCode: "DE", score: 30980 },
    { name: "LumiK", countryCode: "FR", score: 29640 },
    { name: "TokyoGrid", countryCode: "JP", score: 28200 },
    { name: "PixelRex", countryCode: "GB", score: 27460 },
    { name: "NeonShift", countryCode: "BR", score: 26710 },
    { name: "CubePilot", countryCode: "ES", score: 25880 },
    { name: "SparkMove", countryCode: "IT", score: 24620 },
    { name: "ArcLine", countryCode: "CA", score: 23340 },
  ];

  const baseWeekly = [
    { name: "NovaAce", countryCode: "US", score: 17400 },
    { name: "VortexTR", countryCode: "TR", score: 16820 },
    { name: "FrostHex", countryCode: "DE", score: 16190 },
    { name: "LumiK", countryCode: "FR", score: 15340 },
    { name: "TokyoGrid", countryCode: "JP", score: 14680 },
    { name: "PixelRex", countryCode: "GB", score: 14120 },
    { name: "NeonShift", countryCode: "BR", score: 13690 },
    { name: "CubePilot", countryCode: "ES", score: 13040 },
    { name: "SparkMove", countryCode: "IT", score: 12510 },
    { name: "ArcLine", countryCode: "CA", score: 11940 },
  ];

  const globalEntriesSource = [...baseGlobal];
  if (bestScore > 0) {
    globalEntriesSource.push({
      name: profile.name,
      countryCode: profile.countryCode,
      score: bestScore,
      isPlayer: true,
    });
  }

  const weeklyPlayerScore = computeWeeklyPlayerScore(snapshot, bestScore);
  const weeklyEntriesSource = [...baseWeekly];
  if (weeklyPlayerScore > 0) {
    weeklyEntriesSource.push({
      name: profile.name,
      countryCode: profile.countryCode,
      score: weeklyPlayerScore,
      isPlayer: true,
    });
  }

  const globalEntries = normalizeLeaderboardEntries(globalEntriesSource).slice(0, 100);
  const weeklyEntries = normalizeLeaderboardEntries(weeklyEntriesSource).slice(0, 100);
  const yourRankGlobal = globalEntries.find((entry) => entry.isPlayer) ?? null;
  const yourRankWeekly = weeklyEntries.find((entry) => entry.isPlayer) ?? null;

  return {
    globalEntries,
    weeklyEntries,
    profile,
    yourRankGlobal,
    yourRankWeekly,
  };
}

async function buildLeaderboardData(snapshot, profile, { syncScores = true } = {}) {
  if (syncScores) {
    await syncPlayerLeaderboardScores(snapshot, profile);
  }
  const firebaseData = await fetchLeaderboardFromFirebase(snapshot, profile);
  if (firebaseData) {
    return firebaseData;
  }
  return buildLeaderboardPrototypeData(snapshot, profile);
}

const runtimeSettings = loadRuntimeSettings();
let removeAdsUnlocked = loadRemoveAdsUnlocked();
let leaderboardProfile = loadLeaderboardProfile();
let shopDailyLastClaimAtMs = loadShopDailyLastClaimAtMs();
let rewardedContinueUsage = loadRewardedContinueUsage();
let shopCountdownIntervalId = 0;
let menuShopViewOpen = false;
let menuShopPackIndex = 0;
let menuShopPackPurchaseInFlight = false;
let removeAdsModalSource = "menu";
let removeAdsModalPurchaseInFlight = false;
let removeAdsPriceLabel = REMOVE_ADS_PRICE_USD;
const shopPackStorePriceLabels = new Map();
let shopPackGrantedTokens = loadShopPackGrantedTokens();
const SHOP_PACKS_BY_ID = new Map(SHOP_PACKS.map((pack) => [pack.id, pack]));
let gameplayBannerVisible = false;
let pendingMilestoneUnlock = null;
let achievementUnlockTracker = null;
let mascotReaction = null;
const settingsPhotoPickerInput = document.getElementById("settings-photo-picker");
let classicPhotoBoardImageDataUrl = loadPhotoBoardImageDataUrl();
let classicPhotoBoardTiles = [];
let classicPhotoBoardReady = false;
let classicPhotoBoardBuildToken = 0;
const adMobService = createAdMobService({
  appId: ADMOB_ACTIVE_IDS.appId,
  bannerAdId: ADMOB_ACTIVE_IDS.bannerAdId,
  interstitialAdId: ADMOB_ACTIVE_IDS.interstitialAdId,
  rewardedAdId: ADMOB_ACTIVE_IDS.rewardedAdId,
  testing: ADMOB_USE_TEST_ADS,
});
const playBillingService = createPlayBillingService({
  productId: REMOVE_ADS_PRODUCT_ID,
});
const shopPackBillingServices = new Map(
  SHOP_PACKS.map((pack) => [pack.id, createPlayBillingService({
    productId: pack.productId,
    consumeAfterPurchase: pack.consumeAfterPurchase === true,
  })]),
);
const localNotificationService = createLocalNotificationService({
  rewardIntervalMs: SHOP_DAILY_REWARD_INTERVAL_MS,
  fallbackHour: SHOP_DAILY_REWARD_FALLBACK_HOUR,
  comebackHour: SHOP_COMEBACK_REMINDER_HOUR,
  comebackMinDelayMs: SHOP_COMEBACK_REMINDER_MIN_DELAY_MS,
  readyTitle: SHOP_DAILY_REWARD_READY_TITLE,
  readyBody: SHOP_DAILY_REWARD_READY_BODY,
  fallbackTitle: SHOP_DAILY_REWARD_FALLBACK_TITLE,
  fallbackBody: SHOP_DAILY_REWARD_FALLBACK_BODY,
  comebackTitle: SHOP_COMEBACK_REMINDER_TITLE,
  comebackBody: SHOP_COMEBACK_REMINDER_BODY,
});
if (!classicPhotoBoardImageDataUrl && runtimeSettings.photoBoardEnabled === true) {
  runtimeSettings.photoBoardEnabled = false;
  saveRuntimeSettings(runtimeSettings);
}
ui.setMenuBadgesUiVariant(BADGES_UI_VARIANT);
audio.setEnabled(runtimeSettings.soundEnabled);
haptics.setEnabled(runtimeSettings.hapticsEnabled);
audio.setRelaxingMode(runtimeSettings.relaxingModeEnabled);
audio.setRelaxingMusicEnabled(runtimeSettings.relaxingMusicEnabled);
applyVisualMode(runtimeSettings.visualMode);
ui.setAdventureCounterImpactHandler(() => {
  haptics.pulse([7, 10, 9]);
});

function syncMenuSettingsButton() {
  const menuButton = document.getElementById("menu-settings-btn");
  const subtitle = document.getElementById("menu-settings-subtitle");
  const muted = audio.isMuted();
  if (menuButton) {
    menuButton.classList.toggle("is-muted", muted);
    menuButton.setAttribute("aria-pressed", muted ? "true" : "false");
  }
  if (subtitle) {
    subtitle.textContent = muted ? "Sound off" : "Sound on";
  }
}

function syncClassicPhotoBoardConfig() {
  ui.setClassicPhotoBoardConfig({
    enabled: runtimeSettings.photoBoardEnabled === true,
    tiles: classicPhotoBoardReady ? classicPhotoBoardTiles : [],
  });
}

function syncClassicPhotoBoardSettingsUi() {
  ui.updateSettingsPanelState({
    photoBoardEnabled: runtimeSettings.photoBoardEnabled === true,
    photoBoardReady: classicPhotoBoardReady,
  });
}

async function rebuildClassicPhotoBoardTiles(dataUrl, { inputBytes = 0 } = {}) {
  const buildToken = ++classicPhotoBoardBuildToken;
  const safeDataUrl = typeof dataUrl === "string" ? dataUrl.trim() : "";
  if (!safeDataUrl) {
    classicPhotoBoardImageDataUrl = "";
    classicPhotoBoardTiles = [];
    classicPhotoBoardReady = false;
    syncClassicPhotoBoardConfig();
    syncClassicPhotoBoardSettingsUi();
    return;
  }

  try {
    const qualityProfile = resolvePhotoBoardQualityProfile({ inputBytes });
    const normalized = await normalizePhotoBoardImageDataUrl(safeDataUrl, {
      targetSize: qualityProfile.targetSize,
      quality: qualityProfile.normalizeQuality,
      maxOutputBytes: qualityProfile.maxOutputBytes,
    });
    if (buildToken !== classicPhotoBoardBuildToken) {
      return;
    }
    const tiles = await buildPhotoBoardTiles(normalized, {
      boardSize: TUNING.BOARD_SIZE,
      tileQuality: qualityProfile.tileQuality,
    });
    if (buildToken !== classicPhotoBoardBuildToken) {
      return;
    }
    classicPhotoBoardImageDataUrl = normalized;
    classicPhotoBoardTiles = tiles;
    classicPhotoBoardReady = tiles.length >= (TUNING.BOARD_SIZE * TUNING.BOARD_SIZE);
    savePhotoBoardImageDataUrl(classicPhotoBoardReady ? normalized : "");
  } catch (error) {
    console.warn("[photo-board] Failed to build image tiles.", error);
    classicPhotoBoardImageDataUrl = "";
    classicPhotoBoardTiles = [];
    classicPhotoBoardReady = false;
    runtimeSettings.photoBoardEnabled = false;
    saveRuntimeSettings(runtimeSettings);
    savePhotoBoardImageDataUrl("");
  }

  syncClassicPhotoBoardConfig();
  syncClassicPhotoBoardSettingsUi();
}

function syncRemoveAdsButtons() {
  const menuBtn = document.getElementById("menu-remove-ads-btn");
  const menuLabel = menuBtn?.querySelector(".menu-remove-ads-label");
  const menuShopBtn = document.getElementById("menu-shop-open-btn");
  const settingsBtn = document.getElementById("settings-remove-ads-btn");
  if (menuBtn) {
    menuBtn.classList.toggle("is-hidden", removeAdsUnlocked);
    menuBtn.classList.toggle("is-active", removeAdsUnlocked);
    menuBtn.setAttribute("aria-pressed", removeAdsUnlocked ? "true" : "false");
    menuBtn.setAttribute("aria-label", removeAdsUnlocked ? "Ads Removed" : "Remove Ads");
    menuBtn.hidden = removeAdsUnlocked;
  }
  if (menuShopBtn) {
    menuShopBtn.classList.toggle("menu-shop-open-btn--ads-hidden", removeAdsUnlocked);
  }
  if (menuLabel) {
    menuLabel.textContent = removeAdsUnlocked ? "Ads Removed" : "Remove Ads";
  }
  if (settingsBtn) {
    settingsBtn.classList.toggle("is-active", removeAdsUnlocked);
    settingsBtn.textContent = removeAdsUnlocked ? "Ads Removed" : "Remove Ads";
    settingsBtn.setAttribute("aria-pressed", removeAdsUnlocked ? "true" : "false");
  }
}

function normalizeRewardedContinueUsage(now = Date.now()) {
  const todayKey = getLocalDayKey(now);
  if (rewardedContinueUsage.dayKey !== todayKey) {
    rewardedContinueUsage = {
      dayKey: todayKey,
      count: 0,
    };
    saveRewardedContinueUsage(rewardedContinueUsage);
  }
}

function getRemainingRewardedContinues(now = Date.now()) {
  normalizeRewardedContinueUsage(now);
  return Math.max(0, REWARDED_CONTINUE_DAILY_LIMIT - rewardedContinueUsage.count);
}

function consumeRewardedContinue(now = Date.now()) {
  normalizeRewardedContinueUsage(now);
  rewardedContinueUsage.count = Math.max(
    0,
    Math.min(REWARDED_CONTINUE_DAILY_LIMIT, rewardedContinueUsage.count + 1),
  );
  saveRewardedContinueUsage(rewardedContinueUsage);
}

function syncGameOverContinueUi(snapshot = state.getSnapshot()) {
  const button = document.getElementById("gameover-continue-btn");
  if (!(button instanceof HTMLButtonElement)) {
    return;
  }
  const label = button.querySelector(".gameover-continue-text");
  const subLabel = button.querySelector(".gameover-continue-subtext");
  const isGameOver = snapshot?.status === "over";
  const adReadyFlow = adMobService.isConfigured() && adMobService.isSupported();
  const remaining = getRemainingRewardedContinues();
  const enabled = isGameOver && adReadyFlow && remaining > 0;

  button.disabled = !enabled;
  button.setAttribute("aria-disabled", enabled ? "false" : "true");
  if (label) {
    label.textContent = "Watch Ad Continue";
  }
  if (subLabel) {
    subLabel.textContent = adReadyFlow
      ? `${remaining}/${REWARDED_CONTINUE_DAILY_LIMIT} today`
      : "Native Android only";
  }
}

function getRemoveAdsModalElements() {
  return {
    modal: document.getElementById("remove-ads-modal"),
    backdrop: document.getElementById("remove-ads-backdrop"),
    title: document.getElementById("remove-ads-title"),
    description: document.getElementById("remove-ads-description"),
    price: document.getElementById("remove-ads-price"),
    purchaseBtn: document.getElementById("remove-ads-purchase-btn"),
    cancelBtn: document.getElementById("remove-ads-cancel-btn"),
  };
}

function getRemoveAdsPriceLabel() {
  const label = String(removeAdsPriceLabel || "").trim();
  if (label) {
    return label;
  }
  return REMOVE_ADS_PRICE_USD;
}

function setRemoveAdsModalMessage(message) {
  const { description } = getRemoveAdsModalElements();
  if (!(description instanceof HTMLElement)) {
    return;
  }
  description.textContent = String(message || "").trim();
}

async function refreshRemoveAdsStorePrice() {
  if (!playBillingService.isSupported()) {
    removeAdsPriceLabel = REMOVE_ADS_PRICE_USD;
    syncRemoveAdsModalUi();
    return;
  }
  const details = await playBillingService.refreshProductDetails();
  const storePrice = details?.formattedPrice || playBillingService.getDisplayPrice();
  removeAdsPriceLabel = storePrice ? `${storePrice}` : REMOVE_ADS_PRICE_USD;
  syncRemoveAdsModalUi();
}

function shouldShowGameplayBanner(snapshot = state.getSnapshot()) {
  if (removeAdsUnlocked) {
    return false;
  }
  const status = snapshot?.status ?? "menu";
  return status === "playing" || status === "paused" || status === "over";
}

function syncGameplayBannerVisibility(snapshot = state.getSnapshot()) {
  const root = document.documentElement;
  const body = document.body;
  const shell = document.getElementById("game-shell");
  const bannerSlot = document.querySelector(".ad-banner-slot");
  const nextVisible = shouldShowGameplayBanner(snapshot);
  const forceHide = removeAdsUnlocked === true;
  const shouldRenderBanner = !forceHide && nextVisible;
  root?.classList.toggle("ads-disabled", removeAdsUnlocked);
  body?.classList.toggle("ads-disabled", removeAdsUnlocked);
  shell?.classList.toggle("ads-disabled", removeAdsUnlocked);
  shell?.classList.toggle("has-banner", shouldRenderBanner);
  if (shell) {
    if (forceHide) {
      shell.style.setProperty("--ad-slot-height", "0px");
    } else {
      shell.style.removeProperty("--ad-slot-height");
    }
  }
  if (bannerSlot instanceof HTMLElement) {
    bannerSlot.classList.toggle("is-visible", shouldRenderBanner);
    bannerSlot.setAttribute("aria-hidden", shouldRenderBanner ? "false" : "true");
    if (forceHide) {
      bannerSlot.classList.remove("is-visible");
      bannerSlot.style.display = "none";
      bannerSlot.style.height = "0px";
      bannerSlot.style.opacity = "0";
      bannerSlot.style.visibility = "hidden";
    } else {
      bannerSlot.style.display = "";
      bannerSlot.style.height = "";
      bannerSlot.style.opacity = "";
      bannerSlot.style.visibility = "";
    }
  }
  if (gameplayBannerVisible !== shouldRenderBanner) {
    gameplayBannerVisible = shouldRenderBanner;
    scheduleLayoutGuards();
  }
  void adMobService.setBannerVisible(shouldRenderBanner);
}

function syncRemoveAdsModalUi() {
  const { title, description, price, purchaseBtn, cancelBtn } = getRemoveAdsModalElements();
  if (price) {
    price.textContent = getRemoveAdsPriceLabel();
  }
  if (removeAdsUnlocked) {
    if (title) {
      title.textContent = "Ads Removed";
    }
    if (description) {
      description.textContent = "Gameplay banner/interstitial ads are disabled. Rewarded ads stay optional for extra rewards.";
    }
    if (purchaseBtn) {
      purchaseBtn.textContent = "Already Active";
      purchaseBtn.disabled = true;
    }
    if (cancelBtn) {
      cancelBtn.textContent = "Close";
    }
    return;
  }
  if (title) {
    title.textContent = "Go Ad-Free";
  }
  if (description) {
    description.textContent = "Removes in-game banner/interstitial ads. Rewarded ads stay optional for extra rewards.";
  }
  if (purchaseBtn) {
    purchaseBtn.textContent = removeAdsModalPurchaseInFlight
      ? "Processing..."
      : `Pay ${getRemoveAdsPriceLabel()}`;
    purchaseBtn.disabled = removeAdsModalPurchaseInFlight;
  }
  if (cancelBtn) {
    cancelBtn.textContent = removeAdsModalPurchaseInFlight ? "Wait..." : "Not Now";
    cancelBtn.disabled = removeAdsModalPurchaseInFlight;
  }
}

function closeRemoveAdsModal() {
  const { modal } = getRemoveAdsModalElements();
  modal?.classList.remove("overlay--visible");
}

function openRemoveAdsModal({ source = "menu" } = {}) {
  const { modal } = getRemoveAdsModalElements();
  if (!(modal instanceof HTMLElement)) {
    return;
  }
  removeAdsModalSource = source;
  syncRemoveAdsModalUi();
  modal.classList.add("overlay--visible");
  void refreshRemoveAdsStorePrice();
}

function getMenuShopElements() {
  return {
    openBtn: document.getElementById("menu-shop-open-btn"),
    notifyDot: document.getElementById("menu-shop-notify-dot"),
    screen: document.getElementById("menu-shop-screen"),
    closeBtn: document.getElementById("menu-shop-close-btn"),
    dailyCard: document.querySelector(".menu-shop-daily-card"),
    dailyStatusPill: document.getElementById("menu-shop-daily-status-pill"),
    dailyLockedRow: document.getElementById("menu-shop-daily-locked-row"),
    dailyClaimBtn: document.getElementById("menu-shop-daily-claim-btn"),
    dailyRewardChips: Array.from(document.querySelectorAll(".menu-shop-reward-chip")),
    packImage: document.getElementById("menu-shop-pack-image"),
    packName: document.getElementById("menu-shop-pack-name"),
    packMeta: document.getElementById("menu-shop-pack-meta"),
    packBuyBtn: document.getElementById("menu-shop-pack-buy-btn"),
    packPrevBtn: document.getElementById("menu-shop-pack-prev-btn"),
    packNextBtn: document.getElementById("menu-shop-pack-next-btn"),
    packStage: document.querySelector(".menu-shop-pack-stage"),
  };
}

function getShopDailyRemainingMs(now = Date.now()) {
  const nextAt = shopDailyLastClaimAtMs + SHOP_DAILY_REWARD_INTERVAL_MS;
  return Math.max(0, nextAt - now);
}

function isShopDailyReady(now = Date.now()) {
  return getShopDailyRemainingMs(now) <= 0;
}

function formatShopCountdownLabel(remainingMs) {
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours}h ${String(minutes).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}s`;
}

function normalizeMenuShopPackIndex(index) {
  const count = SHOP_PACKS.length;
  if (count <= 0) {
    return 0;
  }
  return ((index % count) + count) % count;
}

function getMenuShopPackPriceLabel(pack) {
  if (!pack) {
    return "";
  }
  const storePrice = shopPackStorePriceLabels.get(pack.id);
  if (typeof storePrice === "string" && storePrice.trim()) {
    return storePrice.trim();
  }
  return pack.priceLabel;
}

function isShopPackPurchaseSupported(pack) {
  if (!pack) {
    return false;
  }
  const service = shopPackBillingServices.get(pack.id);
  return Boolean(service?.isSupported?.());
}

function grantShopPackRewards(pack) {
  if (!pack) {
    return false;
  }
  const rewards = pack.rewards ?? {};
  const twistGain = Math.max(0, Math.floor(Number(rewards.twist) || 0));
  const hammerGain = Math.max(0, Math.floor(Number(rewards.hammer) || 0));
  const tntGain = Math.max(0, Math.floor(Number(rewards.tnt) || 0));

  if (twistGain > 0) {
    powerHub.setCount("twist", powerHub.getCount("twist") + twistGain);
  }
  if (hammerGain > 0) {
    powerHub.setCount("hammer", powerHub.getCount("hammer") + hammerGain);
  }
  if (tntGain > 0) {
    powerHub.setCount("tnt", powerHub.getCount("tnt") + tntGain);
  }

  if (pack.includesRemoveAds) {
    unlockRemoveAds("shop-pack");
  }
  return twistGain > 0 || hammerGain > 0 || tntGain > 0 || pack.includesRemoveAds === true;
}

function syncMenuShopPackUi() {
  const {
    packImage,
    packName,
    packMeta,
    packBuyBtn,
  } = getMenuShopElements();
  if (!packImage && !packName && !packMeta && !packBuyBtn) {
    return;
  }
  if (SHOP_PACKS.length <= 0) {
    return;
  }
  menuShopPackIndex = normalizeMenuShopPackIndex(menuShopPackIndex);
  const pack = SHOP_PACKS[menuShopPackIndex];
  if (packImage) {
    packImage.src = pack.image;
    packImage.alt = pack.name;
  }
  if (packName) {
    packName.textContent = pack.name;
  }
  if (packMeta) {
    packMeta.textContent = pack.meta;
  }
  if (packBuyBtn) {
    const billingSupported = isShopPackPurchaseSupported(pack);
    const label = getMenuShopPackPriceLabel(pack);
    packBuyBtn.textContent = menuShopPackPurchaseInFlight ? "Processing..." : label;
    packBuyBtn.dataset.packId = pack.id;
    packBuyBtn.disabled = menuShopPackPurchaseInFlight || !billingSupported;
    packBuyBtn.setAttribute(
      "aria-disabled",
      menuShopPackPurchaseInFlight || !billingSupported ? "true" : "false",
    );
    packBuyBtn.title = billingSupported ? "" : "Purchases are available on Google Play Android builds only.";
  }
}

function shiftMenuShopPack(step = 1) {
  menuShopPackIndex = normalizeMenuShopPackIndex(menuShopPackIndex + step);
  syncMenuShopPackUi();
}

function syncMenuShopUi() {
  const {
    notifyDot,
    screen,
    dailyCard,
    dailyStatusPill,
    dailyLockedRow,
    dailyClaimBtn,
    dailyRewardChips,
  } = getMenuShopElements();
  const now = Date.now();
  const ready = isShopDailyReady(now);
  const remainingMs = getShopDailyRemainingMs(now);
  const countdownLabel = formatShopCountdownLabel(remainingMs);

  if (notifyDot) {
    notifyDot.classList.toggle("is-ready", ready);
  }

  if (screen) {
    const shouldShowScreen = menuShopViewOpen && state.getSnapshot().status === "menu";
    screen.classList.toggle("is-visible", shouldShowScreen);
    screen.setAttribute("aria-hidden", shouldShowScreen ? "false" : "true");
  }

  if (dailyCard) {
    dailyCard.classList.toggle("is-ready", ready);
  }
  if (dailyStatusPill) {
    dailyStatusPill.textContent = ready ? "Ready" : "Locked";
    dailyStatusPill.classList.toggle("is-ready", ready);
  }
  if (dailyLockedRow) {
    dailyLockedRow.hidden = ready;
    const textNode = dailyLockedRow.querySelector("span");
    if (textNode) {
      textNode.textContent = `Available in: ${countdownLabel}`;
    }
  }
  if (dailyClaimBtn) {
    dailyClaimBtn.disabled = !ready;
    dailyClaimBtn.hidden = !ready;
    dailyClaimBtn.textContent = "Collect reward";
  }
  if (dailyRewardChips?.length) {
    for (const chip of dailyRewardChips) {
      chip.classList.toggle("is-locked", !ready);
    }
  }

  syncMenuShopPackUi();
}

function closeMenuShopView() {
  if (!menuShopViewOpen) {
    return;
  }
  menuShopViewOpen = false;
  syncMenuShopUi();
}

function openMenuShopView() {
  menuShopViewOpen = true;
  ui.closeMenuBadgesView();
  ui.closeMenuLeaderboardView();
  syncMenuShopUi();
  void refreshShopPackStorePrices();
}

function claimMenuShopDailyReward() {
  if (!isShopDailyReady()) {
    syncMenuShopUi();
    return false;
  }
  powerHub.setCount("twist", powerHub.getCount("twist") + 1);
  powerHub.setCount("hammer", powerHub.getCount("hammer") + 1);
  powerHub.setCount("tnt", powerHub.getCount("tnt") + 1);
  shopDailyLastClaimAtMs = Date.now();
  saveShopDailyLastClaimAtMs(shopDailyLastClaimAtMs);
  void rescheduleDailyRewardReminder({ requestPermission: true });
  syncMenuShopUi();
  return true;
}

function rescheduleDailyRewardReminder({ requestPermission = false } = {}) {
  if (!localNotificationService.isSupported()) {
    return;
  }
  void localNotificationService.rescheduleDailyRewardReminder({
    lastClaimAtMs: shopDailyLastClaimAtMs,
    nowMs: Date.now(),
    requestPermission,
  });
}

function startMenuShopTicker() {
  if (shopCountdownIntervalId) {
    window.clearInterval(shopCountdownIntervalId);
    shopCountdownIntervalId = 0;
  }
  shopCountdownIntervalId = window.setInterval(() => {
    syncMenuShopUi();
  }, 1000);
}

async function refreshShopPackStorePrices() {
  let changed = false;
  await Promise.all(SHOP_PACKS.map(async (pack) => {
    const service = shopPackBillingServices.get(pack.id);
    if (!service?.isSupported?.()) {
      return;
    }
    await service.warmup();
    const details = await service.refreshProductDetails();
    const storePrice = details?.formattedPrice || service.getDisplayPrice();
    if (!storePrice) {
      return;
    }
    const normalizedPrice = String(storePrice).trim();
    if (!normalizedPrice || shopPackStorePriceLabels.get(pack.id) === normalizedPrice) {
      return;
    }
    shopPackStorePriceLabels.set(pack.id, normalizedPrice);
    changed = true;
  }));
  if (changed) {
    syncMenuShopPackUi();
  }
}

async function initShopPackBillingFlow() {
  await refreshShopPackStorePrices();
  for (const pack of SHOP_PACKS) {
    if (pack.consumeAfterPurchase === true) {
      continue;
    }
    if (pack.includesRemoveAds !== true) {
      continue;
    }
    const service = shopPackBillingServices.get(pack.id);
    if (!service?.isSupported?.()) {
      continue;
    }
    const restore = await service.restore();
    if (restore?.owned && !removeAdsUnlocked) {
      unlockRemoveAds("restore");
    }
  }
}

function handleRemoveAdsRequest({ source = "menu" } = {}) {
  openRemoveAdsModal({ source });
}

function unlockRemoveAds(source = "menu") {
  if (!removeAdsUnlocked) {
    removeAdsUnlocked = true;
    saveRemoveAdsUnlocked(true);
  }
  syncRemoveAdsButtons();
  syncGameplayBannerVisibility(state.getSnapshot());
  void adMobService.removeBanner();
  if (source === "gameover") {
    ui.setGameOverActionNote("Ads removed. Rewarded ads remain optional.");
  }
}

function completeRemoveAdsPurchase() {
  unlockRemoveAds(removeAdsModalSource);
  closeRemoveAdsModal();
}

async function processRemoveAdsPurchase() {
  if (removeAdsUnlocked || removeAdsModalPurchaseInFlight) {
    return;
  }
  if (!playBillingService.isSupported()) {
    setRemoveAdsModalMessage("Purchases are available on Google Play Android builds only.");
    return;
  }

  removeAdsModalPurchaseInFlight = true;
  syncRemoveAdsModalUi();
  setRemoveAdsModalMessage("Opening Google Play purchase screen...");

  const purchaseResult = await playBillingService.purchase();
  removeAdsModalPurchaseInFlight = false;

  if (purchaseResult?.ok && purchaseResult?.status === "purchased") {
    completeRemoveAdsPurchase();
    return;
  }

  syncRemoveAdsModalUi();
  const status = String(purchaseResult?.status || "").toLowerCase();
  if (status === "cancelled") {
    setRemoveAdsModalMessage("Purchase cancelled. You can try again anytime.");
    return;
  }
  if (status === "pending") {
    setRemoveAdsModalMessage("Purchase is pending approval. Ads will be removed when payment is confirmed.");
    return;
  }
  const fallbackMessage = purchaseResult?.message || "Purchase could not be completed. Please try again.";
  setRemoveAdsModalMessage(fallbackMessage);
}

function initRemoveAdsModalControls() {
  const { backdrop, purchaseBtn, cancelBtn } = getRemoveAdsModalElements();
  backdrop?.addEventListener("click", () => {
    if (removeAdsModalPurchaseInFlight) {
      return;
    }
    closeRemoveAdsModal();
  });
  cancelBtn?.addEventListener("click", () => {
    if (removeAdsModalPurchaseInFlight) {
      return;
    }
    closeRemoveAdsModal();
  });
  purchaseBtn?.addEventListener("click", async () => {
    await processRemoveAdsPurchase();
  });
}

async function initRemoveAdsBillingFlow() {
  if (!playBillingService.isSupported()) {
    removeAdsPriceLabel = REMOVE_ADS_PRICE_USD;
    syncRemoveAdsModalUi();
    return;
  }

  await playBillingService.warmup();
  await refreshRemoveAdsStorePrice();

  const restore = await playBillingService.restore();
  if (restore?.owned && !removeAdsUnlocked) {
    unlockRemoveAds("restore");
  }
}

async function purchaseMenuShopPack(packIdRaw) {
  const packId = String(packIdRaw || "").trim();
  if (!packId) {
    return;
  }
  if (menuShopPackPurchaseInFlight) {
    return;
  }
  const pack = SHOP_PACKS_BY_ID.get(packId);
  if (!pack) {
    return;
  }
  const service = shopPackBillingServices.get(pack.id);
  if (!service?.isSupported?.()) {
    ui.spawnFloatingText("Purchases require Google Play Android build.", "callout");
    return;
  }

  menuShopPackPurchaseInFlight = true;
  syncMenuShopPackUi();
  const purchaseResult = await service.purchase();
  menuShopPackPurchaseInFlight = false;
  syncMenuShopPackUi();

  if (purchaseResult?.ok && purchaseResult?.status === "purchased") {
    const purchaseToken = String(purchaseResult?.details?.purchaseToken || "").trim();
    if (!purchaseToken) {
      ui.spawnFloatingText("Purchase verification failed. Please try again.", "callout");
      return;
    }
    if (pack.consumeAfterPurchase === true && purchaseResult?.details?.consumed !== true) {
      ui.spawnFloatingText("Purchase not finalized yet. Try again in a moment.", "callout");
      return;
    }
    if (hasGrantedShopPackPurchaseToken(shopPackGrantedTokens, pack.id, purchaseToken)) {
      ui.spawnFloatingText("Purchase already applied.", "callout");
      return;
    }
    grantShopPackRewards(pack);
    shopPackGrantedTokens = rememberGrantedShopPackPurchaseToken(
      shopPackGrantedTokens,
      pack.id,
      purchaseToken,
    );
    saveShopPackGrantedTokens(shopPackGrantedTokens);
    ui.spawnFloatingText(`${pack.name} unlocked`, "combo");
    return;
  }

  const status = String(purchaseResult?.status || "").toLowerCase();
  if (status === "cancelled") {
    ui.spawnFloatingText("Purchase cancelled", "callout");
    return;
  }
  if (status === "pending") {
    ui.spawnFloatingText("Purchase pending approval", "callout");
    return;
  }
  ui.spawnFloatingText("Purchase failed. Try again.", "callout");
}

function createMascotReactionOverlay() {
  const boardWrap = document.getElementById("board-wrap");
  if (!boardWrap) {
    return {
      play: () => {},
      stop: () => {},
    };
  }

  const layer = document.createElement("div");
  layer.setAttribute("aria-hidden", "true");
  layer.style.position = "fixed";
  layer.style.left = "0";
  layer.style.top = "0";
  layer.style.width = "120px";
  layer.style.height = "120px";
  layer.style.transform = "translate3d(0, 0, 0) scale(0.92)";
  layer.style.transformOrigin = "50% 50%";
  layer.style.pointerEvents = "none";
  layer.style.opacity = "0";
  layer.style.display = "none";
  layer.style.transition = "opacity 240ms ease, transform 420ms cubic-bezier(0.2, 0.84, 0.26, 1)";
  layer.style.zIndex = "55";
  layer.style.filter = "drop-shadow(0 8px 18px rgba(8, 6, 20, 0.35))";
  layer.style.willChange = "transform, opacity";

  const img = document.createElement("img");
  img.setAttribute("draggable", "false");
  img.setAttribute("alt", "");
  img.style.width = "100%";
  img.style.height = "100%";
  img.style.objectFit = "contain";
  img.style.display = "block";
  img.style.imageRendering = "auto";
  layer.appendChild(img);
  document.body.appendChild(layer);

  const resolveReactionAsset = (reactionType = "happy") => {
    return MASCOT_REACTION_ASSETS[reactionType] ?? MASCOT_REACTION_ASSETS.happy;
  };

  Object.values(MASCOT_REACTION_ASSETS).forEach((asset) => {
    if (!asset) {
      return;
    }
    const preloadPrimary = new Image();
    preloadPrimary.decoding = "async";
    preloadPrimary.src = asset.primary;
    if (asset.fallback) {
      const preloadFallback = new Image();
      preloadFallback.decoding = "async";
      preloadFallback.src = asset.fallback;
    }
  });

  let hideTimer = 0;
  let unmountTimer = 0;
  let playing = false;
  let lastPlayAt = 0;
  let activeReactionAsset = resolveReactionAsset("happy");
  let fallbackTriedForCurrentPlay = false;

  img.addEventListener("error", () => {
    const fallbackSrc = activeReactionAsset?.fallback;
    if (!fallbackTriedForCurrentPlay && fallbackSrc && img.src !== fallbackSrc) {
      fallbackTriedForCurrentPlay = true;
      img.src = fallbackSrc;
      return;
    }
    // Never leave broken "?" image on screen in gameplay.
    playing = false;
    clearTimers();
    layer.style.display = "none";
    layer.style.opacity = "0";
  });

  const clearTimers = () => {
    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = 0;
    }
    if (unmountTimer) {
      clearTimeout(unmountTimer);
      unmountTimer = 0;
    }
  };

  const hideNow = (withRise = true) => {
    layer.style.opacity = "0";
    if (withRise) {
      layer.style.transform = "translate3d(0, -10px, 0) scale(0.96)";
    }
    unmountTimer = window.setTimeout(() => {
      if (!playing) {
        layer.style.display = "none";
      }
      unmountTimer = 0;
    }, 260);
  };

  const stop = () => {
    playing = false;
    clearTimers();
    hideNow(false);
  };

  const isObstacleElement = (el) => {
    if (!el || el === document.body || el === document.documentElement) {
      return false;
    }
    if (el === layer || el === img) {
      return false;
    }
    if (boardWrap.contains(el)) {
      return false;
    }
    const style = window.getComputedStyle(el);
    if (
      style.display === "none" ||
      style.visibility === "hidden" ||
      Number(style.opacity || 1) < 0.06 ||
      style.pointerEvents === "none"
    ) {
      return false;
    }
    const rect = el.getBoundingClientRect();
    if (rect.width < 14 || rect.height < 14) {
      return false;
    }
    return true;
  };

  const getPlacementObstacleScore = (candidateRect) => {
    const points = [
      { x: candidateRect.left + (candidateRect.width * 0.25), y: candidateRect.top + (candidateRect.height * 0.2) },
      { x: candidateRect.left + (candidateRect.width * 0.75), y: candidateRect.top + (candidateRect.height * 0.2) },
      { x: candidateRect.left + (candidateRect.width * 0.25), y: candidateRect.top + (candidateRect.height * 0.5) },
      { x: candidateRect.left + (candidateRect.width * 0.75), y: candidateRect.top + (candidateRect.height * 0.5) },
      { x: candidateRect.left + (candidateRect.width * 0.5), y: candidateRect.top + (candidateRect.height * 0.78) },
    ];
    let score = 0;
    points.forEach((point) => {
      if (
        point.x <= 2 ||
        point.y <= 2 ||
        point.x >= (window.innerWidth - 2) ||
        point.y >= (window.innerHeight - 2)
      ) {
        score += 3;
        return;
      }
      const hit = document.elementFromPoint(point.x, point.y);
      if (!isObstacleElement(hit)) {
        return;
      }
      score += 1;
    });
    return score;
  };

  const placeLayer = () => {
    const rect = boardWrap.getBoundingClientRect();
    if (!rect.width || !rect.height) {
      return { risePx: 0 };
    }
    const size = Math.round(Math.max(96, Math.min(138, rect.width * 0.26)));
    const feetInset = Math.round(size * 0.08);
    const endY = Math.max(8, rect.top - size + feetInset);
    const startY = rect.bottom + (size * 0.15);
    const rightX = rect.right - (size * 0.82);
    const leftX = rect.left - (size * 0.18);
    const rightCandidate = { left: rightX, top: endY, width: size, height: size };
    const leftCandidate = { left: leftX, top: endY, width: size, height: size };
    const rightScore = getPlacementObstacleScore(rightCandidate);
    const leftScore = getPlacementObstacleScore(leftCandidate);
    const selectedXRaw = (rightScore === 0 || rightScore <= leftScore)
      ? rightX
      : leftX;
    const selectedX = Math.max(8, Math.min(window.innerWidth - size - 8, selectedXRaw));
    layer.style.width = `${size}px`;
    layer.style.height = `${size}px`;
    layer.style.left = `${Math.round(selectedX)}px`;
    layer.style.top = `${Math.round(endY)}px`;
    return { risePx: Math.max(0, startY - endY) };
  };

  const play = (reactionType = "happy", { force = false } = {}) => {
    const asset = resolveReactionAsset(reactionType);
    const src = asset?.primary;
    if (!src) {
      return;
    }
    const now = performance.now();
    if (!force && (now - lastPlayAt) < 850) {
      return;
    }
    lastPlayAt = now;
    clearTimers();
    playing = true;
    activeReactionAsset = asset;
    fallbackTriedForCurrentPlay = false;
    img.src = src;
    const { risePx } = placeLayer();
    layer.style.display = "block";
    layer.style.opacity = "0";
    layer.style.transform = `translate3d(0, ${Math.round(risePx)}px, 0) scale(0.92)`;
    requestAnimationFrame(() => {
      if (!playing) {
        return;
      }
      layer.style.opacity = "1";
      layer.style.transform = "translate3d(0, 0, 0) scale(1)";
    });
    hideTimer = window.setTimeout(() => {
      playing = false;
      hideNow(true);
      hideTimer = 0;
    }, 2600);
  };

  window.addEventListener("beforeunload", () => {
    clearTimers();
    if (layer.parentNode) {
      layer.parentNode.removeChild(layer);
    }
  });

  return { play, stop };
}

function syncAchievementUnlockPopups(snapshot) {
  const evaluation = evaluateAchievements(snapshot);
  const nextMap = new Map(evaluation.items.map((item) => [item.id, Boolean(item.unlocked)]));
  if (!achievementUnlockTracker) {
    achievementUnlockTracker = nextMap;
    return;
  }
  const unlockedNow = evaluation.items.filter((item) =>
    item.unlocked && achievementUnlockTracker.get(item.id) !== true,
  );
  achievementUnlockTracker = nextMap;
  if (!unlockedNow.length) {
    return;
  }
  unlockedNow.forEach((item) => {
    ui.queueBadgeUnlockPopup({
      badgeSrc: item.badgeSrc,
      name: item.name,
      condition: item.condition,
    });
  });
}

function syncSettingsPanelState() {
  syncClassicPhotoBoardConfig();
  ui.updateSettingsPanelState({
    soundEnabled: !audio.isMuted(),
    hapticsEnabled: haptics.isEnabled(),
    relaxingModeEnabled: runtimeSettings.relaxingModeEnabled === true,
    relaxingMusicEnabled: runtimeSettings.relaxingMusicEnabled === true,
    photoBoardEnabled: runtimeSettings.photoBoardEnabled === true,
    photoBoardReady: classicPhotoBoardReady,
    visualMode: runtimeSettings.visualMode || "royal",
  });
}

function applyVisualMode(mode) {
  const safeMode = mode === "emerald" || mode === "sunset" || mode === "pink" ? mode : "royal";
  runtimeSettings.visualMode = safeMode;
  document.documentElement.setAttribute("data-visual-mode", safeMode);
}

function restartCurrentRun() {
  pendingMilestoneUnlock = null;
  audio.resetComboVoiceFlow();
  smartPraiseState.lastTurn = -99;
  smartPraiseState.lastAtMs = 0;
  approvalState.lastTurn = -99;
  approvalState.lastAtMs = 0;
  const snapshot = state.getSnapshot();
  if (snapshot.mode === "adventure") {
    const level = snapshot.adventure?.level ?? progression.getAdventureCurrentLevel(ADVENTURE_MAX_LEVEL);
    state.startGame({ mode: "adventure", level });
    return;
  }
  state.startGame({ mode: snapshot.mode });
}

function isAdventureMilestoneLevel(level) {
  const safeLevel = Math.max(1, Math.floor(Number(level) || 1));
  return safeLevel % 10 === 0;
}

function closeSettingsPanel({ resumeGame = false } = {}) {
  const shouldResume = resumeGame && state.getSnapshot().status === "paused";
  ui.closeSettingsPanel();
  if (shouldResume) {
    state.resume();
  }
}

async function openSettingsPanel(source = "game") {
  await primeAudioForInteraction();
  audio.playUiTap({ id: "open-settings" });
  const snapshot = state.getSnapshot();
  if (source === "game" && snapshot.status === "playing") {
    state.togglePause();
  }
  const currentStatus = state.getSnapshot().status;
  ui.openSettingsPanel({
    source,
    canResume: source === "game" && currentStatus === "paused",
    soundEnabled: !audio.isMuted(),
    hapticsEnabled: haptics.isEnabled(),
    relaxingModeEnabled: runtimeSettings.relaxingModeEnabled === true,
    relaxingMusicEnabled: runtimeSettings.relaxingMusicEnabled === true,
    photoBoardEnabled: runtimeSettings.photoBoardEnabled === true,
    photoBoardReady: classicPhotoBoardReady,
    visualMode: runtimeSettings.visualMode || "royal",
  });
  syncSettingsPanelState();
}

syncMenuSettingsButton();
syncRemoveAdsButtons();
initRemoveAdsModalControls();
void initRemoveAdsBillingFlow();
void initShopPackBillingFlow();
syncClassicPhotoBoardConfig();
syncClassicPhotoBoardSettingsUi();
startMenuShopTicker();
syncMenuShopUi();
syncGameplayBannerVisibility(state.getSnapshot());
syncGameOverContinueUi(state.getSnapshot());
rescheduleDailyRewardReminder({ requestPermission: true });
void adMobService.initialize().then(() => {
  syncGameOverContinueUi(state.getSnapshot());
  syncGameplayBannerVisibility(state.getSnapshot());
});
if (classicPhotoBoardImageDataUrl) {
  void rebuildClassicPhotoBoardTiles(classicPhotoBoardImageDataUrl).then(() => {
    if (runtimeSettings.photoBoardEnabled === true && classicPhotoBoardReady) {
      ui.render(state.getSnapshot());
    }
  });
}

async function primeAudioForInteraction() {
  try {
    await audio.unlock();
  } catch {
    // Ignore unlock failures in restrictive webviews.
  }
  void audio.preloadAll();
}

ui.setBadgeUnlockPopupShownHandler(() => {
  void primeAudioForInteraction();
  audio.playMilestoneUnlock();
  return audio.getSoundDurationMs("milestoneUnlock");
});

ui.setBadgeUnlockPopupClosedHandler(({ manual } = {}) => {
  if (!manual) {
    return;
  }
  audio.stopMilestoneUnlock();
});

const dragDrop = new DragDropController(state, ui, {
  onDragStart: (payload) => {
    void primeAudioForInteraction();
    audio.playPickup(payload);
    haptics.pickup();
  },
  onInvalidDrop: (payload) => {
    audio.playInvalid(payload);
    haptics.invalid();
    mascotReaction?.play?.("sadSoft");
  },
  onDropSuccess: () => {
    void primeAudioForInteraction();
  },
});

window.addEventListener("pointerdown", () => {
  void primeAudioForInteraction();
}, { once: true, capture: true });

window.addEventListener("touchstart", () => {
  void primeAudioForInteraction();
}, { once: true, passive: true, capture: true });

if (settingsPhotoPickerInput) {
  settingsPhotoPickerInput.addEventListener("change", async () => {
    const file = settingsPhotoPickerInput.files?.[0];
    settingsPhotoPickerInput.value = "";
    if (!file) {
      return;
    }
    await primeAudioForInteraction();
    try {
      const rawDataUrl = await fileToDataUrl(file);
      await rebuildClassicPhotoBoardTiles(rawDataUrl, { inputBytes: Number(file.size || 0) });
      if (classicPhotoBoardReady) {
        runtimeSettings.photoBoardEnabled = true;
        saveRuntimeSettings(runtimeSettings);
        syncSettingsPanelState();
        ui.render(state.getSnapshot());
      }
    } catch (error) {
      console.warn("[photo-board] Could not apply selected photo.", error);
    }
  });
}

ui.bindControls({
  onStartClassic: async () => {
    await primeAudioForInteraction();
    closeMenuShopView();
    ui.closeSettingsPanel();
    ui.closeJourneyPanel();
    audio.resetComboVoiceFlow();
    smartPraiseState.lastTurn = -99;
    smartPraiseState.lastAtMs = 0;
    approvalState.lastTurn = -99;
    approvalState.lastAtMs = 0;
    audio.playUiTap({ id: "start-classic" });
    state.startGame({ mode: "classic" });
  },
  onStartAdventure: async () => {
    await primeAudioForInteraction();
    closeMenuShopView();
    ui.closeSettingsPanel();
    ui.closeJourneyPanel();
    audio.resetComboVoiceFlow();
    smartPraiseState.lastTurn = -99;
    smartPraiseState.lastAtMs = 0;
    approvalState.lastTurn = -99;
    approvalState.lastAtMs = 0;
    audio.playUiTap({ id: "start-adventure" });
    const level = progression.getAdventureCurrentLevel(ADVENTURE_MAX_LEVEL);
    state.startGame({ mode: "adventure", level });
  },
  onOpenJourney: async () => {
    await primeAudioForInteraction();
    closeMenuShopView();
    ui.closeSettingsPanel();
    audio.playUiTap({ id: "open-journey" });
    const snapshot = state.getSnapshot();
    const progress = snapshot.adventureProgress ?? {};
    const level = progress.currentLevel ?? progression.getAdventureCurrentLevel(ADVENTURE_MAX_LEVEL);
    ui.openJourneyPanel({
      totalLevels: 100,
      playableMaxLevel: ADVENTURE_MAX_LEVEL,
      currentLevel: level,
      completed: progress.completed ?? {},
    });
  },
  onMenuRemoveAds: async () => {
    await primeAudioForInteraction();
    audio.playUiTap({ id: "menu-remove-ads" });
    handleRemoveAdsRequest({ source: "menu" });
  },
  onOpenMenuLeaderboard: async () => {
    await primeAudioForInteraction();
    closeMenuShopView();
    audio.playUiTap({ id: "open-leaderboard" });
    const snapshot = state.getSnapshot();
    const fallbackData = buildLeaderboardPrototypeData(snapshot, leaderboardProfile);
    ui.openMenuLeaderboardView({
      context: "menu",
      initialTab: ui.menuLeaderboardTab,
      ...fallbackData,
      profileLocked: Boolean(leaderboardProfile.profileLocked),
    });
    const leaderboardData = await buildLeaderboardData(snapshot, leaderboardProfile, { syncScores: true });
    ui.setMenuLeaderboardData({
      ...leaderboardData,
      activeTab: ui.menuLeaderboardTab,
      profileLocked: Boolean(leaderboardProfile.profileLocked),
    });
  },
  onCloseMenuLeaderboard: async () => {
    await primeAudioForInteraction();
    audio.playUiTap({ id: "close-leaderboard" });
    const wasSettingsContext = ui.menuLeaderboardContext === "settings";
    ui.closeMenuLeaderboardView();
    if (wasSettingsContext && state.getSnapshot().status === "paused") {
      ui.openSettingsPanel({
        source: "game",
        canResume: true,
        soundEnabled: !audio.isMuted(),
        hapticsEnabled: haptics.isEnabled(),
        relaxingModeEnabled: runtimeSettings.relaxingModeEnabled === true,
        relaxingMusicEnabled: runtimeSettings.relaxingMusicEnabled === true,
        photoBoardEnabled: runtimeSettings.photoBoardEnabled === true,
        photoBoardReady: classicPhotoBoardReady,
        visualMode: runtimeSettings.visualMode || "royal",
      });
      syncSettingsPanelState();
    }
  },
  onSaveMenuLeaderboardProfile: async (profile) => {
    leaderboardProfile = {
      name: String(profile?.name ?? leaderboardProfile.name ?? "Player").slice(0, 18),
      countryCode: String(profile?.countryCode ?? leaderboardProfile.countryCode ?? "TR").toUpperCase(),
      profileLocked: Boolean(profile?.profileLocked ?? true),
    };
    saveLeaderboardProfile(leaderboardProfile);
    const snapshot = state.getSnapshot();
    const leaderboardData = await buildLeaderboardData(snapshot, leaderboardProfile, { syncScores: true });
    ui.setMenuLeaderboardData({
      ...leaderboardData,
      activeTab: ui.menuLeaderboardTab,
      profileLocked: Boolean(leaderboardProfile.profileLocked),
    });
  },
  onJourneyBack: () => {
    void primeAudioForInteraction();
    audio.playUiTap({ id: "journey-back" });
    ui.closeJourneyPanel();
  },
  onJourneyStart: async ({ level } = {}) => {
    await primeAudioForInteraction();
    ui.closeSettingsPanel();
    ui.closeJourneyPanel();
    audio.resetComboVoiceFlow();
    smartPraiseState.lastTurn = -99;
    smartPraiseState.lastAtMs = 0;
    approvalState.lastTurn = -99;
    approvalState.lastAtMs = 0;
    audio.playUiTap({ id: "journey-start" });
    const safeLevel = Math.max(1, Math.min(ADVENTURE_MAX_LEVEL, Math.floor(Number(level) || 1)));
    state.startGame({ mode: "adventure", level: safeLevel });
  },
  onOpenSettings: async ({ source }) => {
    closeMenuShopView();
    await openSettingsPanel(source);
  },
  onOpenMenuBadges: async () => {
    await primeAudioForInteraction();
    closeMenuShopView();
    audio.playUiTap({ id: "open-badges" });
    ui.openMenuBadgesView({ context: "menu" });
  },
  onCloseMenuBadges: async () => {
    await primeAudioForInteraction();
    audio.playUiTap({ id: "close-badges" });
    const wasSettingsContext = ui.menuBadgesContext === "settings";
    ui.closeMenuBadgesView();
    if (wasSettingsContext && state.getSnapshot().status === "paused") {
      ui.openSettingsPanel({
        source: "game",
        canResume: true,
        soundEnabled: !audio.isMuted(),
        hapticsEnabled: haptics.isEnabled(),
        relaxingModeEnabled: runtimeSettings.relaxingModeEnabled === true,
        relaxingMusicEnabled: runtimeSettings.relaxingMusicEnabled === true,
        photoBoardEnabled: runtimeSettings.photoBoardEnabled === true,
        photoBoardReady: classicPhotoBoardReady,
        visualMode: runtimeSettings.visualMode || "royal",
      });
      syncSettingsPanelState();
    }
  },
  onSettingsClose: () => {
    void primeAudioForInteraction();
    audio.playUiTap({ id: "settings-close" });
    const shouldResume = ui.settingsPanel.source === "game" && ui.settingsPanel.canResume;
    closeSettingsPanel({ resumeGame: shouldResume });
  },
  onSettingsToggleSound: () => {
    void primeAudioForInteraction();
    const muted = audio.toggleMute();
    runtimeSettings.soundEnabled = !muted;
    saveRuntimeSettings(runtimeSettings);
    syncMenuSettingsButton();
    syncSettingsPanelState();
  },
  onSettingsToggleHaptics: () => {
    const enabled = haptics.toggleEnabled();
    runtimeSettings.hapticsEnabled = enabled;
    saveRuntimeSettings(runtimeSettings);
    syncSettingsPanelState();
  },
  onSettingsCycleVisualMode: () => {
    const cycle = ["royal", "emerald", "sunset", "pink"];
    const currentIndex = cycle.indexOf(runtimeSettings.visualMode || "royal");
    const nextMode = cycle[(currentIndex + 1 + cycle.length) % cycle.length];
    applyVisualMode(nextMode);
    saveRuntimeSettings(runtimeSettings);
    syncSettingsPanelState();
  },
  onSettingsToggleRelaxing: async () => {
    await primeAudioForInteraction();
    runtimeSettings.relaxingModeEnabled = !(runtimeSettings.relaxingModeEnabled === true);
    saveRuntimeSettings(runtimeSettings);
    audio.setRelaxingMode(runtimeSettings.relaxingModeEnabled === true);
    syncSettingsPanelState();
  },
  onSettingsToggleRelaxingMusic: async () => {
    await primeAudioForInteraction();
    runtimeSettings.relaxingMusicEnabled = !(runtimeSettings.relaxingMusicEnabled === true);
    saveRuntimeSettings(runtimeSettings);
    audio.setRelaxingMusicEnabled(runtimeSettings.relaxingMusicEnabled === true);
    syncSettingsPanelState();
  },
  onSettingsTogglePhotoBoard: async () => {
    await primeAudioForInteraction();
    const nextEnabled = !(runtimeSettings.photoBoardEnabled === true);
    if (!nextEnabled) {
      runtimeSettings.photoBoardEnabled = false;
      saveRuntimeSettings(runtimeSettings);
      syncSettingsPanelState();
      ui.render(state.getSnapshot());
      return;
    }

    if (!classicPhotoBoardReady) {
      if (classicPhotoBoardImageDataUrl) {
        await rebuildClassicPhotoBoardTiles(classicPhotoBoardImageDataUrl);
      } else {
        settingsPhotoPickerInput?.click();
      }
    }
    if (classicPhotoBoardReady) {
      runtimeSettings.photoBoardEnabled = true;
      saveRuntimeSettings(runtimeSettings);
      syncSettingsPanelState();
      ui.render(state.getSnapshot());
    }
  },
  onSettingsPickPhotoBoard: async () => {
    await primeAudioForInteraction();
    settingsPhotoPickerInput?.click();
  },
  onSettingsClearPhotoBoard: async () => {
    await primeAudioForInteraction();
    runtimeSettings.photoBoardEnabled = false;
    saveRuntimeSettings(runtimeSettings);
    savePhotoBoardImageDataUrl("");
    await rebuildClassicPhotoBoardTiles("");
    syncSettingsPanelState();
    ui.render(state.getSnapshot());
  },
  onSettingsRemoveAds: async () => {
    await primeAudioForInteraction();
    audio.playUiTap({ id: "settings-remove-ads" });
    handleRemoveAdsRequest({ source: "settings" });
  },
  onSettingsBadges: async () => {
    await primeAudioForInteraction();
    audio.playUiTap({ id: "settings-badges" });
    const snapshot = state.getSnapshot();
    const fromGameSettings = ui.settingsPanel.source === "game" && snapshot.status === "paused";
    closeSettingsPanel({ resumeGame: false });
    ui.openMenuBadgesView({ context: fromGameSettings ? "settings" : "menu" });
  },
  onSettingsLeaderboard: async () => {
    await primeAudioForInteraction();
    audio.playUiTap({ id: "open-leaderboard" });
    const snapshot = state.getSnapshot();
    const fromGameSettings = ui.settingsPanel.source === "game" && snapshot.status === "paused";
    closeSettingsPanel({ resumeGame: false });
    const fallbackData = buildLeaderboardPrototypeData(snapshot, leaderboardProfile);
    ui.openMenuLeaderboardView({
      context: fromGameSettings ? "settings" : "menu",
      initialTab: ui.menuLeaderboardTab,
      ...fallbackData,
      profileLocked: Boolean(leaderboardProfile.profileLocked),
    });
    const leaderboardData = await buildLeaderboardData(snapshot, leaderboardProfile, { syncScores: true });
    ui.setMenuLeaderboardData({
      ...leaderboardData,
      activeTab: ui.menuLeaderboardTab,
      profileLocked: Boolean(leaderboardProfile.profileLocked),
    });
  },
  onSettingsResume: () => {
    void primeAudioForInteraction();
    audio.playUiTap({ id: "settings-resume" });
    closeSettingsPanel({ resumeGame: true });
  },
  onSettingsRestart: async () => {
    await primeAudioForInteraction();
    audio.playUiTap({ id: "settings-restart" });
    closeSettingsPanel();
    restartCurrentRun();
  },
  onSettingsHome: async () => {
    await primeAudioForInteraction();
    audio.playUiTap({ id: "settings-home" });
    closeSettingsPanel();
    pendingMilestoneUnlock = null;
    ui.closeMilestoneUnlockPopup();
    state.goToMenu();
    syncMenuSettingsButton();
  },
  onQuickPhotoPicker: async () => {
    await primeAudioForInteraction();
    audio.playUiTap({ id: "photo-quick-open" });
    const snapshot = state.getSnapshot();
    if (snapshot.mode !== "classic") {
      return;
    }
    settingsPhotoPickerInput?.click();
  },
  onQuickPhotoClear: async () => {
    await primeAudioForInteraction();
    audio.playUiTap({ id: "photo-quick-clear" });
    runtimeSettings.photoBoardEnabled = false;
    saveRuntimeSettings(runtimeSettings);
    savePhotoBoardImageDataUrl("");
    await rebuildClassicPhotoBoardTiles("");
    syncSettingsPanelState();
    ui.render(state.getSnapshot());
  },
  onRestart: async () => {
    await primeAudioForInteraction();
    audio.playUiTap({ id: "restart" });
    ui.setGameOverActionNote("");
    restartCurrentRun();
  },
  onGameOverHome: async () => {
    await primeAudioForInteraction();
    audio.playUiTap({ id: "gameover-home" });
    ui.setGameOverActionNote("");
    state.goToMenu();
    syncMenuSettingsButton();
  },
  onGameOverContinue: async () => {
    await primeAudioForInteraction();
    audio.playUiTap({ id: "gameover-continue" });
    const remaining = getRemainingRewardedContinues();
    if (remaining <= 0) {
      ui.setGameOverActionNote("Daily continue limit reached (5/5).");
      syncGameOverContinueUi(state.getSnapshot());
      return;
    }
    const rewardResult = await adMobService.showRewarded();
    if (!rewardResult.shown) {
      ui.setGameOverActionNote("Rewarded ad is not ready. Try again in a moment.");
      syncGameOverContinueUi(state.getSnapshot());
      return;
    }
    if (!rewardResult.rewarded) {
      ui.setGameOverActionNote("Reward was not completed.");
      syncGameOverContinueUi(state.getSnapshot());
      return;
    }
    consumeRewardedContinue();
    ui.setGameOverActionNote("");
    const resumed = state.continueFromGameOverWithSingleDots();
    if (!resumed) {
      ui.setGameOverActionNote("Continue unavailable on this board. Try again.");
      syncGameOverContinueUi(state.getSnapshot());
      return;
    }
    syncGameOverContinueUi(state.getSnapshot());
  },
  onGameOverRemoveAds: async () => {
    await primeAudioForInteraction();
    audio.playUiTap({ id: "gameover-remove-ads" });
    handleRemoveAdsRequest({ source: "gameover" });
  },
  onAdventureNext: async () => {
    await primeAudioForInteraction();
    audio.playUiTap({ id: "adventure-next" });
    const snapshot = state.getSnapshot();
    const current = snapshot.adventure?.level ?? progression.getAdventureCurrentLevel(ADVENTURE_MAX_LEVEL);
    const nextLevel = Math.min(ADVENTURE_MAX_LEVEL, current + 1);
    if (isAdventureMilestoneLevel(current)) {
      pendingMilestoneUnlock = {
        completedLevel: current,
        nextLevel,
        unlockedColor: "red",
      };
      audio.playMilestoneUnlock();
      ui.openMilestoneUnlockPopup({
        completedLevel: current,
        nextLevel,
        unlockedColor: "red",
      });
      return;
    }
    state.startGame({ mode: "adventure", level: nextLevel });
  },
  onAdventureReplay: async () => {
    await primeAudioForInteraction();
    audio.playUiTap({ id: "adventure-replay" });
    const snapshot = state.getSnapshot();
    const current = snapshot.adventure?.level ?? progression.getAdventureCurrentLevel(ADVENTURE_MAX_LEVEL);
    state.startGame({ mode: "adventure", level: current });
  },
  onMilestoneUnlockContinue: async () => {
    await primeAudioForInteraction();
    audio.playUiTap({ id: "milestone-continue" });
    const milestone = pendingMilestoneUnlock;
    pendingMilestoneUnlock = null;
    ui.closeMilestoneUnlockPopup();
    if (!milestone) {
      return;
    }
    if (milestone.nextLevel > milestone.completedLevel) {
      state.startGame({ mode: "adventure", level: milestone.nextLevel });
      return;
    }
    state.goToMenu();
    syncMenuSettingsButton();
  },
  onHint: () => {
    void primeAudioForInteraction();
    audio.playUiTap({ id: "hint" });
    const snapshot = state.getSnapshot();
    const slot = snapshot.pieces.findIndex(Boolean);
    if (slot < 0) {
      return;
    }
    const anchor = state.getHintForSlot(slot);
    if (!anchor) {
      ui.spawnFloatingText("No move", "score");
      return;
    }
    const piece = snapshot.pieces[slot];
    const hintCells = piece.cells.map((cell) => ({
      row: anchor.row + cell.y,
      col: anchor.col + cell.x,
    }));
    ui.showHint(hintCells);
  },
});

{
  const {
    openBtn,
    closeBtn,
    dailyClaimBtn,
    packPrevBtn,
    packNextBtn,
    packStage,
    packBuyBtn,
  } = getMenuShopElements();

  openBtn?.addEventListener("click", async () => {
    await primeAudioForInteraction();
    audio.playUiTap({ id: "open-shop" });
    openMenuShopView();
  });

  closeBtn?.addEventListener("click", async () => {
    await primeAudioForInteraction();
    audio.playUiTap({ id: "close-shop" });
    closeMenuShopView();
  });

  dailyClaimBtn?.addEventListener("click", async () => {
    await primeAudioForInteraction();
    const claimed = claimMenuShopDailyReward();
    if (claimed) {
      audio.playUiTap({ id: "claim-daily-reward" });
    } else {
      audio.playUiTap({ id: "shop-claim-locked" });
    }
  });

  packPrevBtn?.addEventListener("click", async () => {
    await primeAudioForInteraction();
    audio.playUiTap({ id: "shop-pack-prev" });
    shiftMenuShopPack(-1);
  });

  packNextBtn?.addEventListener("click", async () => {
    await primeAudioForInteraction();
    audio.playUiTap({ id: "shop-pack-next" });
    shiftMenuShopPack(1);
  });

  packBuyBtn?.addEventListener("click", async () => {
    await primeAudioForInteraction();
    audio.playUiTap({ id: "shop-pack-select" });
    await purchaseMenuShopPack(packBuyBtn.dataset.packId);
  });

  if (packStage) {
    let swipeStartX = 0;
    let swipeTracking = false;
    const beginSwipe = (clientX) => {
      swipeStartX = clientX;
      swipeTracking = true;
    };
    const endSwipe = (clientX) => {
      if (!swipeTracking) {
        return;
      }
      swipeTracking = false;
      const delta = clientX - swipeStartX;
      if (Math.abs(delta) < 32) {
        return;
      }
      if (delta < 0) {
        shiftMenuShopPack(1);
      } else {
        shiftMenuShopPack(-1);
      }
      audio.playUiTap({ id: "shop-pack-swipe" });
    };
    packStage.addEventListener("touchstart", (event) => {
      if (!event.touches || event.touches.length <= 0) {
        return;
      }
      beginSwipe(event.touches[0].clientX);
    }, { passive: true });
    packStage.addEventListener("touchend", (event) => {
      if (!event.changedTouches || event.changedTouches.length <= 0) {
        return;
      }
      endSwipe(event.changedTouches[0].clientX);
    });
    packStage.addEventListener("pointerdown", (event) => {
      if (event.pointerType === "touch") {
        return;
      }
      beginSwipe(event.clientX);
    });
    packStage.addEventListener("pointerup", (event) => {
      if (event.pointerType === "touch") {
        return;
      }
      endSwipe(event.clientX);
    });
    packStage.addEventListener("pointercancel", () => {
      swipeTracking = false;
    });
  }
}

const initialLeaderboardSnapshot = state.getSnapshot();
ui.setMenuLeaderboardData({
  ...buildLeaderboardPrototypeData(initialLeaderboardSnapshot, leaderboardProfile),
  activeTab: "global",
  profileLocked: Boolean(leaderboardProfile.profileLocked),
});
void (async () => {
  const leaderboardData = await buildLeaderboardData(initialLeaderboardSnapshot, leaderboardProfile, { syncScores: true });
  ui.setMenuLeaderboardData({
    ...leaderboardData,
    activeTab: "global",
    profileLocked: Boolean(leaderboardProfile.profileLocked),
  });
})();

state.on("state", (snapshot) => {
  const previousStatus = layoutGuardStatus;
  layoutGuardStatus = snapshot.status;
  const enteredGameOver = snapshot.status === "over" && previousStatus !== "over";
  if (snapshot.status !== "menu" && menuShopViewOpen) {
    closeMenuShopView();
  }
  syncClassicPhotoBoardConfig();
  ui.render(snapshot);
  syncFxSuspension(snapshot);
  syncGameplayBannerVisibility(snapshot);
  syncGameOverContinueUi(snapshot);
  if (enteredGameOver && !removeAdsUnlocked) {
    void adMobService.showInterstitial();
  }
  if (previousStatus !== layoutGuardStatus) {
    const wasInteractive = isInteractiveLayoutStatus(previousStatus);
    const nowInteractive = isInteractiveLayoutStatus(layoutGuardStatus);
    // Preserve board lock across playing <-> paused transitions (theme/settings interactions).
    if (!(wasInteractive && nowInteractive)) {
      resetBoardSizeLock();
    }
    scheduleLayoutGuards();
  }
  powerHub?.syncFromSnapshot?.(snapshot);
  syncMenuShopUi();
  syncAchievementUnlockPopups(snapshot);
  if (snapshot.status !== "over") {
    ui.setGameOverActionNote("");
  }
});

document.addEventListener("visibilitychange", () => {
  syncFxSuspension(state.getSnapshot());
  if (!document.hidden) {
    rescheduleDailyRewardReminder({ requestPermission: false });
  }
});
syncFxSuspension(state.getSnapshot());

function mountAdventureObjectiveTicker() {
  let timeoutId = 0;
  const clearTimer = () => {
    if (!timeoutId) {
      return;
    }
    window.clearTimeout(timeoutId);
    timeoutId = 0;
  };
  const resolveIntervalMs = () => {
    const snapshot = state.getSnapshot();
    if (!snapshot || snapshot.status !== "playing") {
      return 760;
    }
    if (snapshot.mode !== "adventure") {
      return 1100;
    }
    const objectiveKind = snapshot.adventure?.objective?.kind ?? "marker_collect";
    if (objectiveKind !== "score_target") {
      return 860;
    }
    const remainingMs = Number(snapshot.adventure?.timerRemainingMs ?? 0);
    if (remainingMs <= 12000) {
      return 95;
    }
    if (remainingMs <= 45000) {
      return 140;
    }
    return 220;
  };
  const scheduleNext = (delayMs = resolveIntervalMs()) => {
    clearTimer();
    timeoutId = window.setTimeout(tick, Math.max(70, Math.floor(delayMs)));
  };
  const tick = () => {
    timeoutId = 0;
    if (!document.hidden) {
      state.updateAdventureTimer(performance.now());
    }
    scheduleNext();
  };
  const handleVisibility = () => {
    if (document.hidden) {
      clearTimer();
      return;
    }
    scheduleNext(90);
  };
  document.addEventListener("visibilitychange", handleVisibility);
  scheduleNext(120);
  return () => {
    clearTimer();
    document.removeEventListener("visibilitychange", handleVisibility);
  };
}

const unmountAdventureObjectiveTicker = mountAdventureObjectiveTicker();
void unmountAdventureObjectiveTicker;

function runAfterFrames(frameCount, task) {
  if (typeof task !== "function") {
    return;
  }
  let remaining = Math.max(0, Number(frameCount) | 0);
  const step = () => {
    if (remaining <= 0) {
      task();
      return;
    }
    remaining -= 1;
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

state.on("placed", (payload) => {
  audio.playPlace(payload);
  haptics.place();
  ui.playPlacementFeedback(payload.placedCells);
  ui.pulseScore();
  ui.spawnFloatingText(`+${payload.scoreDelta}`, "score-gold");

  const lineCount =
    (Array.isArray(payload.clearedRows) ? payload.clearedRows.length : 0) +
    (Array.isArray(payload.clearedCols) ? payload.clearedCols.length : 0);
  const nowMs = performance.now();
  const turnsSinceLastPraise = (payload.turn ?? 0) - smartPraiseState.lastTurn;
  const msSinceLastPraise = nowMs - smartPraiseState.lastAtMs;
  const turnsSinceLastApproval = (payload.turn ?? 0) - approvalState.lastTurn;
  const msSinceLastApproval = nowMs - approvalState.lastAtMs;
  const placedCells = Array.isArray(payload.placedCells) ? payload.placedCells : [];
  let cornerExactHits = 0;
  let cornerZoneTL = 0;
  let cornerZoneTR = 0;
  let cornerZoneBL = 0;
  let cornerZoneBR = 0;
  placedCells.forEach(({ row, col }) => {
    if (
      (row === 0 && col === 0) ||
      (row === 0 && col === 7) ||
      (row === 7 && col === 0) ||
      (row === 7 && col === 7)
    ) {
      cornerExactHits += 1;
    }
    if (row <= 1 && col <= 1) cornerZoneTL += 1;
    if (row <= 1 && col >= 6) cornerZoneTR += 1;
    if (row >= 6 && col <= 1) cornerZoneBL += 1;
    if (row >= 6 && col >= 6) cornerZoneBR += 1;
  });
  const cornerZoneMax = Math.max(cornerZoneTL, cornerZoneTR, cornerZoneBL, cornerZoneBR);
  const strategicScore =
    (placedCells.length >= 4 ? 1 : 0) +
    (payload.nearCompleteLines1 >= 3 ? 1 : 0) +
    (payload.nearCompleteLines2 >= 2 ? 1 : 0) +
    (payload.boardFillRatioAfter >= 0.62 ? 1 : 0);
  const isCornerFillMove =
    cornerExactHits >= 1 ||
    cornerZoneMax >= 2;
  const noClearThisTurn = lineCount === 0;
  const strategicCore = strategicScore >= 3 || (isCornerFillMove && strategicScore >= 2);
  const strongStrategic = strategicScore >= 3 || (strategicScore >= 2 && isCornerFillMove);
  const canShowStrategicApproval =
    noClearThisTurn &&
    strategicCore &&
    turnsSinceLastApproval >= 3 &&
    msSinceLastApproval >= 4300;

  // Approval icons are reserved for smart placements only (not clear/combo moments).
  if (canShowStrategicApproval) {
    const approvalVariant = strongStrategic ? "gold" : "white";
    const approvalDirection = "up";
    const iconCount = Math.max(1, placedCells.length);
    ui.spawnMoveApprovalIcons(placedCells, approvalVariant, {
      maxIcons: iconCount,
      spreadMs: 0,
      direction: approvalDirection,
    });
    approvalState.lastTurn = payload.turn ?? approvalState.lastTurn;
    approvalState.lastAtMs = nowMs;
  }

  const isSmartPlacement =
    !payload.hadClear &&
    strategicScore >= 3 &&
    turnsSinceLastPraise >= 6 &&
    msSinceLastPraise >= 10500 &&
    Math.random() < 0.45;

  if (isSmartPlacement) {
    const goodJob = audio.playGoodJobForSmartMove();
    if (goodJob?.text) {
      smartPraiseState.lastTurn = payload.turn ?? smartPraiseState.lastTurn;
      smartPraiseState.lastAtMs = nowMs;
      window.setTimeout(() => {
        ui.spawnFloatingText(goodJob.text, "callout");
      }, goodJob.delayMs ?? 0);
    }
  }
});

state.on("cleared", (payload) => {
  lastClearFxAtMs = performance.now();
  audio.playLineClear(payload);
  const lineCount = payload.lineCount ?? 0;
  const comboVisualChain = payload.comboChain > 1
    ? payload.comboChain
    : (lineCount >= 2 ? 2 : 1);
  const isComboClear = comboVisualChain > 1;
  const normalizedClearPayload = { ...payload, comboChain: comboVisualChain };
  const estimatedClearFxMs =
    640 +
    Math.min(360, lineCount * 110) +
    Math.min(440, Math.max(0, comboVisualChain - 1) * 170);
  lastClearFxEndsAtMs = lastClearFxAtMs + estimatedClearFxMs;

  // Spread clear/combo feedback across adjacent frames to reduce single-frame spikes.
  runAfterFrames(0, () => {
    ui.playClearFeedback(normalizedClearPayload);
    ui.pulseScore();
  });

  runAfterFrames(1, () => {
    ui.spawnClearBurstText(normalizedClearPayload);
    if (isComboClear) {
      haptics.combo();
      ui.playComboFeedback(comboVisualChain);
      ui.playComboAccent(normalizedClearPayload);
    } else {
      haptics.clear();
    }
    if (isComboClear || lineCount >= 2) {
      mascotReaction?.play?.("ambitious");
    } else if (lineCount === 1) {
      mascotReaction?.play?.("happy");
    }
  });

  if (isComboClear) {
    runAfterFrames(2, () => {
      const comboVoice = audio.playCombo(normalizedClearPayload);
      ui.spawnComboBurstText(comboVisualChain, normalizedClearPayload);
      if (comboVoice?.text) {
        window.setTimeout(() => {
          ui.spawnFloatingText(comboVoice.text, "callout");
        }, comboVoice.delayMs ?? 0);
      }
    });
  }
});

state.on("missionComplete", (payload) => {
  ui.spawnFloatingText(`Mission +${payload.bonus}`, "score-gold");
  mascotReaction?.play?.("happy");
});

state.on("newBestScore", (payload) => {
  ui.showBestScorePopup(payload.bestScore ?? payload.score ?? 0);
});

state.on("tntExploded", (payload) => {
  const now = performance.now();
  const affectedCount = Math.max(
    0,
    Math.floor(Number(payload?.affectedCount ?? payload?.affectedCellsDetailed?.length ?? 0)),
  );
  const scoreDelta = Math.max(0, Math.floor(Number(payload?.scoreDelta ?? 0)));
  lastClearFxAtMs = now;
  lastClearFxEndsAtMs = now + 900 + Math.min(560, affectedCount * 34);

  ui.playTntExplosionFeedback(payload);
  haptics.pulse([20, 36, 32, 44, 26, 48]);
  audio.playTntExplosion();
  ui.pulseScore();
  if (scoreDelta > 0) {
    ui.spawnFloatingText(`+${scoreDelta}`, "score-gold");
  }
  mascotReaction?.play?.("ambitious");
});

state.on("hammerHit", (payload) => {
  const now = performance.now();
  const scoreDelta = Math.max(0, Math.floor(Number(payload?.scoreDelta ?? 0)));
  lastClearFxAtMs = now;
  lastClearFxEndsAtMs = now + 520;

  ui.playHammerStrikeFeedback(payload);
  haptics.pulse([16, 22, 12]);
  audio.playHammerHit();
  ui.pulseScore();
  if (scoreDelta > 0) {
    ui.spawnFloatingText(`+${scoreDelta}`, "score-gold");
  }
  mascotReaction?.play?.("ambitious");
});

state.on("adventureCollected", (payload) => {
  const now = performance.now();
  const holdUntilGlideMs = Math.max(0, lastClearFxEndsAtMs - now);
  ui.playAdventureCollectFeedback({
    ...payload,
    style: "premium",
    collectAfterClearMs: holdUntilGlideMs,
  });
});

state.on("adventureLevelComplete", (payload) => {
  audio.playLevelComplete();
  ui.spawnFloatingText(`Level ${payload.level} Complete`, "combo");
});

state.on("gameOver", (payload) => {
  audio.playGameOver(payload);
  haptics.gameOver();
  ui.playGameOverFeedback();
  mascotReaction?.play?.("sadDeep");
});

dragDrop.init();
ui.render(state.getSnapshot());
layoutGuardStatus = state.getSnapshot().status;
scheduleLayoutGuards();
mascotReaction = createMascotReactionOverlay();

