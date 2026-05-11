import { JourneyController } from "./journey/journeyController.js";
import { evaluateAchievements } from "../meta/achievements.js";

const LEADERBOARD_COUNTRY_CODES = Object.freeze([
  "AF", "AL", "DZ", "AD", "AO", "AG", "AR", "AM", "AU", "AT", "AZ",
  "BS", "BH", "BD", "BB", "BY", "BE", "BZ", "BJ", "BT", "BO", "BA", "BW", "BR", "BN", "BG", "BF", "BI",
  "CV", "KH", "CM", "CA", "CF", "TD", "CL", "CN", "CO", "KM", "CG", "CD", "CR", "CI", "HR", "CU", "CY", "CZ",
  "DK", "DJ", "DM", "DO", "EC", "EG", "SV", "GQ", "ER", "EE", "SZ", "ET",
  "FJ", "FI", "FR", "GA", "GM", "GE", "DE", "GH", "GR", "GD", "GT", "GN", "GW", "GY",
  "HT", "HN", "HU", "IS", "IN", "ID", "IR", "IQ", "IE", "IL", "IT",
  "JM", "JP", "JO", "KZ", "KE", "KI", "KP", "KR", "KW", "KG",
  "LA", "LV", "LB", "LS", "LR", "LY", "LI", "LT", "LU",
  "MG", "MW", "MY", "MV", "ML", "MT", "MH", "MR", "MU", "MX", "FM", "MD", "MC", "MN", "ME", "MA", "MZ", "MM",
  "NA", "NR", "NP", "NL", "NZ", "NI", "NE", "NG", "MK", "NO",
  "OM", "PK", "PW", "PS", "PA", "PG", "PY", "PE", "PH", "PL", "PT", "QA",
  "RO", "RU", "RW", "KN", "LC", "VC", "WS", "SM", "ST", "SA", "SN", "RS", "SC", "SL", "SG", "SK", "SI", "SB", "SO", "ZA", "SS", "ES", "LK", "SD", "SR", "SE", "CH", "SY",
  "TW", "TJ", "TZ", "TH", "TL", "TG", "TO", "TT", "TN", "TR", "TM", "TV",
  "UG", "UA", "AE", "GB", "US", "UY", "UZ", "VU", "VA", "VE", "VN",
  "YE", "ZM", "ZW",
]);

const LEADERBOARD_COUNTRY_NAME_OVERRIDES = Object.freeze({
  BN: "Brunei",
  BO: "Bolivia",
  CD: "Democratic Republic of the Congo",
  CG: "Republic of the Congo",
  CI: "Cote d'Ivoire",
  CV: "Cape Verde",
  CZ: "Czech Republic",
  FM: "Micronesia",
  KP: "North Korea",
  KR: "South Korea",
  LA: "Laos",
  MD: "Moldova",
  MK: "North Macedonia",
  MM: "Myanmar",
  PS: "Palestine",
  RU: "Russia",
  ST: "Sao Tome and Principe",
  SY: "Syria",
  TZ: "Tanzania",
  TL: "Timor-Leste",
  TR: "Turkey",
  TW: "Taiwan",
  AE: "United Arab Emirates",
  GB: "United Kingdom",
  US: "United States",
  VE: "Venezuela",
  VN: "Vietnam",
});

function buildMenuLeaderboardCountryOptions() {
  const regionNames = typeof Intl !== "undefined" && typeof Intl.DisplayNames === "function"
    ? new Intl.DisplayNames(["en"], { type: "region" })
    : null;
  const seen = new Set();
  const options = [];
  LEADERBOARD_COUNTRY_CODES.forEach((codeRaw) => {
    const code = String(codeRaw ?? "").toUpperCase();
    if (!/^[A-Z]{2}$/.test(code) || seen.has(code)) {
      return;
    }
    seen.add(code);
    const defaultName = LEADERBOARD_COUNTRY_NAME_OVERRIDES[code] ?? code;
    const resolved = regionNames?.of(code);
    const name = String(LEADERBOARD_COUNTRY_NAME_OVERRIDES[code] ?? resolved ?? defaultName).trim();
    options.push({ code, name });
  });
  options.sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" }));
  return options;
}
const CLEAR_TONE_VFX = {
  1: { main: "#ff4ba8", accent: "#ffd1e8", edge: "#ff177e", spread: 28 },
  2: { main: "#ff8f39", accent: "#ffe0ba", edge: "#ff6b00", spread: 26 },
  3: { main: "#34d57f", accent: "#d4ffe8", edge: "#15b860", spread: 25 },
  4: { main: "#3488ff", accent: "#d2e7ff", edge: "#136dff", spread: 27 },
  5: { main: "#9f45ff", accent: "#e8d3ff", edge: "#7f22ff", spread: 29 },
  6: { main: "#ff3d45", accent: "#ffd6d9", edge: "#da1728", spread: 28 },
};
const COMBO_GOLD = {
  core: "#fff5d1",
  main: "#f6c45f",
  edge: "#d99225",
  deep: "#7b4b14",
  sparkle: "#ffe8b4",
};
const COMBO_BURST_LIFETIME_MS = 1520;
const CLOUD_WORD_ASSETS = Object.freeze({
  combo: {
    white: "./assets/ui/cloud-font/combo-cloud-white.webp?v=20260429cloud1",
    colorful: "./assets/ui/cloud-font/combo-cloud-color.webp?v=20260429cloud1",
  },
  clear: {
    white: "./assets/ui/cloud-font/clear-cloud-white.webp?v=20260429cloud1",
    colorful: "./assets/ui/cloud-font/clear-cloud-color.webp?v=20260429cloud1",
  },
});
const BOARD_TONE_SPRITE_ASSETS = Object.freeze({
  base: Object.freeze({
    1: "./assets/blocks/block-pink.webp",
    2: "./assets/blocks/block-orange.webp",
    3: "./assets/blocks/block-green.webp",
    4: "./assets/blocks/block-blue.webp",
    5: "./assets/blocks/block-purple.webp",
    6: "./assets/blocks/block-red.webp",
  }),
  lite: Object.freeze({
    1: "./assets/blocks-lite/block-pink-lite.png",
    2: "./assets/blocks-lite/block-orange-lite.png",
    3: "./assets/blocks-lite/block-green-lite.png",
    4: "./assets/blocks-lite/block-blue-lite.png",
    5: "./assets/blocks-lite/block-purple-lite.png",
    6: "./assets/blocks-lite/block-red-lite.png",
  }),
});
const VISUAL_MODE_LABELS = Object.freeze({
  royal: "Royal Night",
  emerald: "Emerald Mist",
  sunset: "Sunset Ember",
  pink: "Candy Pink",
});
const ADVENTURE_GOLD_SHATTER = {
  core: "#fff3cd",
  main: "#f0bd64",
  edge: "#d89235",
  deep: "#7b4d1e",
  sparkle: "#ffe6a6",
};
const COMBO_ACCENT_TIER = {
  1: {
    shellMs: 220,
    accentMs: 240,
    shellGlowA: "rgba(235, 169, 75, 0.26)",
    shellGlowB: "rgba(255, 237, 190, 0.14)",
    ringAlpha: 0.32,
    lineFlashAlpha: 0.2,
    particleBase: 7,
  },
  2: {
    shellMs: 270,
    accentMs: 300,
    shellGlowA: "rgba(246, 185, 82, 0.36)",
    shellGlowB: "rgba(255, 243, 201, 0.2)",
    ringAlpha: 0.44,
    lineFlashAlpha: 0.28,
    particleBase: 10,
  },
  3: {
    shellMs: 320,
    accentMs: 360,
    shellGlowA: "rgba(255, 199, 98, 0.5)",
    shellGlowB: "rgba(255, 248, 215, 0.28)",
    ringAlpha: 0.58,
    lineFlashAlpha: 0.36,
    particleBase: 13,
  },
};

const CLEAR_DURATION_SCALE = 1.8;
const COMBO_TIER_CONFIG = {
  1: {
    scale: 0.56,
    boardPulseMs: 980,
    flashAlpha: 0.42,
    ringAlpha: 0.42,
    burstAlpha: 0.3,
    sparkScale: 0.5,
    chunkScale: 0.45,
    durationMult: 2.22,
    fadePower: 1.05,
  },
  2: {
    scale: 0.78,
    boardPulseMs: 760,
    flashAlpha: 0.56,
    ringAlpha: 0.56,
    burstAlpha: 0.38,
    sparkScale: 0.74,
    chunkScale: 0.68,
    durationMult: 1.32,
    fadePower: 1.25,
  },
  3: {
    scale: 1,
    boardPulseMs: 920,
    flashAlpha: 0.74,
    ringAlpha: 0.72,
    burstAlpha: 0.46,
    sparkScale: 1,
    chunkScale: 1,
    durationMult: 1.18,
    fadePower: 1.45,
  },
};
const COMBO_DURATION_BOOST = 1.2;
const LINE_SWEEP_LIFE_FRAMES = 18;
const LINE_SCORE_POP_LIFE_FRAMES = 48;
const ADVENTURE_BEAM_LIFE_FRAMES = 24;
const ADVENTURE_RING_LIFE_FRAMES = 22;
const ADVENTURE_BURST_LIFE_FRAMES = 20;
const WOOD_DEBRIS_PALETTE = [
  { main: "#9f6b3c", accent: "#e4be86", deep: "#5a341c" },
  { main: "#a87845", accent: "#efcc94", deep: "#60381d" },
  { main: "#8d5a31", accent: "#d9aa71", deep: "#4b2a16" },
];
const ADVENTURE_VISUALS = {
  blue: {
    icon: "./assets/adventure/locked/objective-blue.webp",
  },
  yellow: {
    icon: "./assets/adventure/locked/objective-yellow.webp",
  },
  red: {
    icon: "./assets/adventure/locked/objective-red.webp",
  },
};
const ADVENTURE_COLLECT_SHELL_ICON = "./assets/adventure/processed/objective-base.webp";
const ADVENTURE_COLLECT_CORE = {
  blue: "./assets/adventure/cores/core-blue-diamond-clean-512.webp",
  yellow: "./assets/adventure/cores/core-yellow-star-premium-512.webp",
  red: "./assets/adventure/cores/core-red-ruby-clean-512.webp",
};
const ADVENTURE_SCORE_HUD_ICONS = {
  star: "./assets/adventure/cores/core-yellow-star-premium-512.webp",
  ruby: "./assets/adventure/cores/core-red-ruby-clean-512.webp",
};
const ADVENTURE_COLLECT_VFX = {
  blue: {
    glow: "rgba(77, 218, 255, 0.78)",
    ring: "rgba(165, 243, 255, 0.92)",
    flash: "rgba(222, 249, 255, 0.88)",
  },
  yellow: {
    glow: "rgba(255, 203, 92, 0.8)",
    ring: "rgba(255, 236, 176, 0.95)",
    flash: "rgba(255, 248, 215, 0.9)",
  },
  red: {
    glow: "rgba(255, 102, 126, 0.78)",
    ring: "rgba(255, 186, 198, 0.92)",
    flash: "rgba(255, 228, 232, 0.9)",
  },
};
const ADVENTURE_COLLECT_SPEC = {
  popMs: 240,
  popLiftPx: 15,
  popScaleFrom: 0.82,
  popScalePeak: 1.24,
  popRotateFrom: -3,
  popRotateTo: 2.2,
  travelDelayMs: 18,
  travelMs: 1320,
  travelScaleFrom: 1.12,
  travelScaleTo: 0.52,
  travelRotateFrom: 0.8,
  travelRotateTo: 3.4,
  curveHeightMin: 76,
  curveHeightFactor: 0.28,
  curveSideFactor: 0.04,
  travelBobPx: 0,
  trailIntervalMs: 0,
  trailScaleMin: 0.36,
  trailScaleFactor: 0.5,
  sparkleIntervalMs: 0,
  enableFlightSparkles: false,
  impactHoldMs: 98,
  shellFadeMs: 340,
};
const ADVENTURE_SHELL_SHATTER = {
  shards: { min: 6, max: 9 },
  speed: { min: 18, max: 42 },
  lift: { min: 10, max: 24 },
  size: { min: 8, max: 14 },
  lifeMs: { min: 300, max: 460 },
};
const ADVENTURE_COLLECT_KEY_TTL_MS = 1400;
const ADVENTURE_COLLECT_POP_CONFIG = {
  topRows: 2,
  bottomRows: 2,
  up: {
    peakY: -34,
    settleY: -29,
    endY: -31,
    sourceOffsetY: 0,
  },
  upEdge: {
    peakY: -24,
    settleY: -20,
    endY: -22,
    sourceOffsetY: -8,
  },
  down: {
    peakY: 34,
    settleY: 29,
    endY: 31,
    sourceOffsetY: 0,
  },
  downEdge: {
    peakY: 24,
    settleY: 20,
    endY: 22,
    sourceOffsetY: 8,
  },
};
const ADVENTURE_OBJECTIVE_TYPE_BY_TONE = {
  101: "blue",
  102: "yellow",
  103: "red",
};
const BLOCK_SPRITES_BY_TONE = {
  1: "./assets/blocks/block-pink.webp",
  2: "./assets/blocks/block-orange.webp",
  3: "./assets/blocks/block-green.webp",
  4: "./assets/blocks/block-blue.webp",
  5: "./assets/blocks/block-purple.webp",
  6: "./assets/blocks/block-red.webp",
};
const MOVE_APPROVAL_ICONS = {
  white: "./assets/icons/approval-white.webp?v=bgfix1",
  gold: "./assets/icons/approval-gold.webp?v=bgfix1",
};
const UNITY_SHATTER = {
  gravity: 0.22,
  drag: 0.986,
  spinDamping: 0.992,
  baseLife: 34,
  lifeVariance: 20,
  crackLife: 12,
  crackAlpha: 0.72,
  shardPerCell: { low: 6, high: 9 },
  maxShards: { low: 120, high: 220 },
};

function scaleLife(frames) {
  return Math.max(1, Math.round(frames * CLEAR_DURATION_SCALE));
}

function hexToHsl(hexColor) {
  const hex = hexColor.replace("#", "");
  const normalized = hex.length === 3
    ? `${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`
    : hex;
  const intVal = Number.parseInt(normalized, 16);
  const r = ((intVal >> 16) & 255) / 255;
  const g = ((intVal >> 8) & 255) / 255;
  const b = (intVal & 255) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (delta !== 0) {
    s = delta / (1 - Math.abs((2 * l) - 1));
    switch (max) {
      case r:
        h = 60 * (((g - b) / delta) % 6);
        break;
      case g:
        h = 60 * (((b - r) / delta) + 2);
        break;
      default:
        h = 60 * (((r - g) / delta) + 4);
        break;
    }
  }

  if (h < 0) {
    h += 360;
  }

  return { h, s, l };
}

function hslToCss(h, s, l) {
  return `hsl(${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%)`;
}

function shiftHexHue(hexColor, deltaHue) {
  const hsl = hexToHsl(hexColor);
  const shiftedHue = (hsl.h + deltaHue + 360) % 360;
  return hslToCss(shiftedHue, hsl.s, hsl.l);
}

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function lerp(a, b, t) {
  return a + ((b - a) * t);
}

function easeOutCubic(t) {
  const x = clamp01(t);
  return 1 - ((1 - x) ** 3);
}

function easeOutBack(t) {
  const x = clamp01(t);
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + (c3 * ((x - 1) ** 3)) + (c1 * ((x - 1) ** 2));
}

function quadraticBezierPoint(p0, p1, p2, t) {
  const k = clamp01(t);
  const inv = 1 - k;
  return {
    x: (inv * inv * p0.x) + (2 * inv * k * p1.x) + (k * k * p2.x),
    y: (inv * inv * p0.y) + (2 * inv * k * p1.y) + (k * k * p2.y),
  };
}

function resolveFxQualityProfile() {
  const ua = navigator.userAgent || "";
  const touchLike = window.matchMedia?.("(pointer: coarse)")?.matches || navigator.maxTouchPoints > 0;
  const mobileUa = /android|iphone|ipad|ipod|mobile/i.test(ua);
  const isAndroid = /android/i.test(ua);
  const isIOS = /iphone|ipad|ipod/i.test(ua);
  const isMobile = touchLike || mobileUa;
  const memoryGb = Number(navigator.deviceMemory || 0);
  const cpuCores = Number(navigator.hardwareConcurrency || 0);
  const isLowPower = isMobile && (
    (Number.isFinite(memoryGb) && memoryGb > 0 && memoryGb <= 4) ||
    (Number.isFinite(cpuCores) && cpuCores > 0 && cpuCores <= 6)
  );

  if (isIOS) {
    return {
      lowPower: true,
      isIOS: true,
      particleScale: 0.42,
      comboParticleScale: 0.5,
      dprCap: 1.12,
      maxParticles: 96,
      minParticleBudget: 24,
      trailLength: 0,
      glowPasses: 1,
      enableSmoke: false,
      // Keep animation progression smooth under temporary frame drops.
      maxFrameStep: 2,
      ringShadowBlur: 2.4,
      particleShadowBlur: 2.8,
      chunkShadowBlur: 2.2,
      simpleShading: true,
      useTexturedShards: false,
      clearFxCellCap: 8,
      shatterScale: 0.58,
      afterburstCount: 3,
      startRuntimeScale: 0.84,
      minRuntimeScale: 0.44,
      forceLiteTextures: true,
      domFxCapScale: 0.64,
      // Preserve stronger clear FX at start, then reduce progressively for heat control.
      thermalTier1Ms: 6 * 60 * 1000,
      thermalTier2Ms: 13 * 60 * 1000,
      thermalTier3Ms: 20 * 60 * 1000,
      thermalTier1DomFxScale: 0.95,
      thermalTier2DomFxScale: 0.84,
      thermalTier3DomFxScale: 0.72,
      thermalTier1ScaleCeiling: 0.92,
      thermalTier2ScaleCeiling: 0.8,
      thermalTier3ScaleCeiling: 0.7,
      startupWarmMs: 8 * 1000,
      startupScaleCeiling: 0.9,
      adaptiveHardMs: 27,
      adaptiveMidMs: 23.2,
      adaptiveSoftMs: 20.2,
      adaptiveRecoverMs: 17.2,
    };
  }

  if (isLowPower) {
    return {
      lowPower: true,
      particleScale: 0.4,
      comboParticleScale: 0.48,
      dprCap: 1.1,
      maxParticles: 120,
      minParticleBudget: 26,
      trailLength: 0,
      glowPasses: 0,
      enableSmoke: false,
      maxFrameStep: 1,
      ringShadowBlur: 0,
      particleShadowBlur: 0,
      chunkShadowBlur: 0,
      simpleShading: true,
      useTexturedShards: false,
      clearFxCellCap: 7,
      shatterScale: 0.5,
      afterburstCount: 2,
      startRuntimeScale: 0.78,
      minRuntimeScale: 0.44,
      forceLiteTextures: true,
    };
  }

  if (isAndroid) {
    return {
      lowPower: true,
      particleScale: 0.36,
      comboParticleScale: 0.44,
      dprCap: 1,
      maxParticles: 104,
      minParticleBudget: 24,
      trailLength: 0,
      glowPasses: 0,
      enableSmoke: false,
      maxFrameStep: 1,
      ringShadowBlur: 0,
      particleShadowBlur: 0,
      chunkShadowBlur: 0,
      simpleShading: true,
      useTexturedShards: false,
      clearFxCellCap: 6,
      shatterScale: 0.44,
      afterburstCount: 2,
      startRuntimeScale: 0.74,
      minRuntimeScale: 0.4,
      forceLiteTextures: true,
    };
  }

  if (isMobile) {
    return {
      lowPower: false,
      particleScale: 0.6,
      comboParticleScale: 0.72,
      dprCap: 1.15,
      maxParticles: 220,
      minParticleBudget: 42,
      trailLength: 1,
      glowPasses: 1,
      enableSmoke: false,
      maxFrameStep: 1,
      ringShadowBlur: 3.5,
      particleShadowBlur: 4,
      chunkShadowBlur: 3.5,
      simpleShading: true,
      useTexturedShards: false,
      clearFxCellCap: 12,
      shatterScale: 0.72,
      afterburstCount: 4,
      startRuntimeScale: 0.92,
      minRuntimeScale: 0.52,
      forceLiteTextures: false,
    };
  }

  return {
    lowPower: false,
    particleScale: 1,
    comboParticleScale: 1,
    dprCap: 2,
    maxParticles: 520,
    minParticleBudget: 60,
    trailLength: 9,
    glowPasses: 3,
    enableSmoke: true,
      maxFrameStep: 3,
      ringShadowBlur: 8,
      particleShadowBlur: 9,
      chunkShadowBlur: 7,
      simpleShading: false,
      useTexturedShards: true,
      clearFxCellCap: 64,
      shatterScale: 1,
      afterburstCount: 8,
      startRuntimeScale: 1,
      minRuntimeScale: 0.56,
      forceLiteTextures: false,
    };
}

function resolveFxTextRenderMode() {
  // Release lock: use the approved renderer.
  return "canvas";
}

export class UIManager {
  constructor(tuning) {
    this.tuning = tuning;
    this.boardSize = tuning.BOARD_SIZE;
    this.cells = new Map();
    this.ghostedMap = new Map();
    this.gameOverFxTimer = 0;
    this.fxParticles = [];
    this.fxFlashes = [];
    this.fxRings = [];
    this.fxBursts = [];
    this.fxAfterbursts = [];
    this.fxCellLights = [];
    this.fxLineSweeps = [];
    this.fxLineScorePopups = [];
    this.fxMoveApprovals = [];
    this.fxAdventureBeams = [];
    this.fxCracks = [];
    this.fxShards = [];
    this.clearPulseTimer = 0;
    this.scorePulseTimer = 0;
    this.scoreStagePulseTimer = 0;
    this.fxRafId = 0;
    this.fxLastTime = 0;
    this.fxProbeEnabled = false;
    this.fxPerfRing = new Float32Array(180);
    this.fxPerfRingIndex = 0;
    this.fxPerfRingCount = 0;
    this.fxPerfAvgMs = 16.7;
    this.fxPerfMaxMs = 0;
    this.fxPerfFps = 60;
    this.fxPerfLastStamp = performance.now();
    this.fxPerfFrameCounter = 0;
    this.fxPerfP95Ms = 16.7;
    this.fxPerfUpdateCostMs = 0;
    this.fxPerfDrawCostMs = 0;
    this.noSpaceBannerTimer = 0;
    this.noSpaceBannerVisible = false;
    this.noSpaceGameOverGateActive = false;
    this.noSpaceBannerDurationMs = 820;
    this.comboBurstActiveUntilMs = 0;
    this.clearBurstActiveUntilMs = 0;
    this.floatingTextPool = [];
    this.comboBurstPool = [];
    this.clearBurstPool = [];
    this.fxCanvasTextBursts = [];
    this.fxWordImageCache = new Map();
    this.fxTextRenderMode = resolveFxTextRenderMode();
    this.fxResizeObserver = null;
    this.classRestartRafMap = new WeakMap();
    this.fxSuspended = false;
    this.fxProfile = resolveFxQualityProfile();
    this.applyPerformanceClass();
    this.fxAdaptive = {
      scale: Number(this.fxProfile.startRuntimeScale ?? (this.fxProfile.lowPower ? 0.82 : 1)),
      avgMs: 16.7,
      cooldownFrames: 0,
    };
    this.playSessionStartedAtMs = 0;
    this.iosStartupPhaseUntilMs = 0;
    this.thermalTier = 0;
    const domFxCapScale = Number(this.fxProfile.domFxCapScale ?? 1);
    this.baseDomFxTotalCap = Math.max(
      40,
      Math.round((this.fxProfile.lowPower ? 120 : 260) * domFxCapScale),
    );
    this.baseDomFxTypeCaps = {
      collectPulse: Math.max(2, Math.round((this.fxProfile.lowPower ? 10 : 24) * domFxCapScale)),
      counterSparkle: Math.max(2, Math.round((this.fxProfile.lowPower ? 8 : 18) * domFxCapScale)),
      shellShard: Math.max(4, Math.round((this.fxProfile.lowPower ? 24 : 64) * domFxCapScale)),
      columnBeam: Math.max(1, Math.round((this.fxProfile.lowPower ? 4 : 10) * domFxCapScale)),
      comboBurst: Math.max(1, Math.round((this.fxProfile.lowPower ? 2 : 4) * domFxCapScale)),
      clearBurst: Math.max(1, Math.round((this.fxProfile.lowPower ? 2 : 4) * domFxCapScale)),
    };
    this.shatterSpriteCache = new Map();
    this.adventureDisplay = {
      level: null,
      remaining: { blue: 0, yellow: 0, red: 0 },
    };
    this.adventureFlyActive = 0;
    this.adventureGlideTasks = new Set();
    this.adventureGlideRafId = 0;
    this.domFxTypeCounts = new Map();
    this.domFxTotalActive = 0;
    this.domFxTotalCap = this.baseDomFxTotalCap;
    this.domFxTypeCaps = { ...this.baseDomFxTypeCaps };
    this.adventureCounterImpactToken = new WeakMap();
    this.onAdventureCounterImpact = null;
    this.adventureCollectedCellExpiry = new Map();
    this.currentStatus = "menu";
    this.currentMode = "classic";
    this.menuBadgesUiVariant = "v2";
    this.menuBadgesFilter = "all";
    this.menuBadgesEvaluation = null;
    this.menuAchievementsRenderKey = "";
    this.menuBadgesViewOpen = false;
    this.menuBadgeDetailId = null;
    this.menuBadgeUnlockStates = new Map();
    this.menuBadgesContext = "menu";
    this.menuLeaderboardViewOpen = false;
    this.menuLeaderboardContext = "menu";
    this.menuLeaderboardTab = "global";
    this.menuLeaderboardData = {
      global: [],
      weekly: [],
    };
    this.menuLeaderboardProfile = {
      name: "Player",
      countryCode: "TR",
    };
    this.menuLeaderboardProfileLocked = false;
    this.menuLeaderboardYourRank = {
      global: null,
      weekly: null,
    };
    this.menuLeaderboardCountries = buildMenuLeaderboardCountryOptions();
    this.menuLeaderboardTabAnimTimer = 0;
    this.deferredAdventureComplete = null;
    this.dragSessionActive = false;
    this.dragSessionSlot = null;
    this.hammerTargetKey = null;
    this.hammerTargetClass = "";
    this.milestoneUnlockPanel = {
      visible: false,
      completedLevel: null,
      nextLevel: null,
      unlockedColor: "red",
    };
    this.settingsPanel = {
      visible: false,
      source: "game",
      canResume: true,
      soundEnabled: true,
      hapticsEnabled: true,
      relaxingModeEnabled: false,
      relaxingMusicEnabled: false,
      photoBoardEnabled: false,
      photoBoardReady: false,
      visualMode: "royal",
    };
    this.classicPhotoBoardEnabled = false;
    this.classicPhotoTilesSource = null;
    this.classicPhotoTilesVersion = 0;
    this.classicPhotoTiles = [];
    this.boardRenderCache = Array.from({ length: this.boardSize * this.boardSize }, () => "");
    this.boardRenderMode = this.resolveBoardRenderMode();
    this.boardToneCanvasEnabled = this.boardRenderMode === "canvas";
    this.boardToneCanvas = null;
    this.boardToneCanvasCtx = null;
    this.boardToneCanvasDpr = 1;
    this.boardToneCanvasSpriteSet = "";
    this.boardToneCanvasAtlases = { base: null, lite: null };
    this.boardToneCanvasAtlasPromises = { base: null, lite: null };
    this.boardToneCanvasAtlasReady = { base: false, lite: false };
    this.boardToneCanvasSizeSignature = "";
    this.boardToneCanvasMetrics = { width: 0, height: 0, gap: 4, cellSize: 0 };
    this.coreSpritePreloadCache = new Map();
    this.coreGameplaySpritePreloadPromise = null;
    this.lastRenderedBoardSnapshot = Array.from({ length: this.boardSize }, () => Array(this.boardSize).fill(0));
    this.badgeUnlockPanel = {
      visible: false,
      queue: [],
      current: null,
      timerId: 0,
    };
    this.onBadgeUnlockPopupShown = null;
    this.onBadgeUnlockPopupClosed = null;
    this.elements = {
      gameShell: document.getElementById("game-shell"),
      board: document.getElementById("board"),
      boardWrap: document.getElementById("board-wrap"),
      boardFillCanvas: document.getElementById("board-fill-canvas"),
      fxCanvas: document.getElementById("fx-canvas"),
      particleLayer: document.getElementById("particle-layer"),
      pieceTray: document.getElementById("piece-tray"),
      scoreValue: document.getElementById("score-value"),
      bestValue: document.getElementById("best-value"),
      adventureHud: document.getElementById("adventure-hud"),
      adventureMarkerLayer: document.getElementById("adventure-marker-layer"),
      floatingLayer: document.getElementById("floating-layer"),
      menuScreen: document.getElementById("menu-screen"),
      journeyOverlay: document.getElementById("journey-overlay"),
      settingsOverlay: document.getElementById("settings-overlay"),
      gameOverModal: document.getElementById("gameover-modal"),
      noSpaceBanner: document.getElementById("no-space-banner"),
      adventureCompleteModal: document.getElementById("adventure-complete-modal"),
      milestoneUnlockModal: document.getElementById("milestone-unlock-modal"),
      adventureCompleteTitle: document.getElementById("adventure-complete-title"),
      adventureCompleteScore: document.getElementById("adventure-complete-score"),
      adventureCompleteReach: document.getElementById("adventure-complete-reach"),
      milestoneUnlockTitle: document.getElementById("milestone-unlock-title"),
      milestoneUnlockText: document.getElementById("milestone-unlock-text"),
      milestoneUnlockContinueBtn: document.getElementById("milestone-unlock-continue-btn"),
      finalScore: document.getElementById("final-score"),
      gameOverBestScore: document.getElementById("gameover-best-score"),
      gameOverActionNote: document.getElementById("gameover-action-note"),
      weeklyTopList: document.getElementById("weekly-top-list"),
      startClassicBtn: document.getElementById("start-classic-btn"),
      startDailyBtn: document.getElementById("start-daily-btn"),
      menuRemoveAdsBtn: document.getElementById("menu-remove-ads-btn"),
      menuLeaderboardOpenBtn: document.getElementById("menu-leaderboard-open-btn"),
      menuLeaderboardScreen: document.getElementById("menu-leaderboard-screen"),
      menuLeaderboardCloseBtn: document.getElementById("menu-leaderboard-close-btn"),
      menuLeaderboardSubtitle: document.getElementById("menu-leaderboard-subtitle"),
      menuLeaderboardPrevBtn: document.getElementById("menu-leaderboard-prev-btn"),
      menuLeaderboardNextBtn: document.getElementById("menu-leaderboard-next-btn"),
      menuLeaderboardModeLabel: document.getElementById("menu-leaderboard-mode-label"),
      menuLeaderboardSetup: document.getElementById("menu-leaderboard-setup"),
      menuLeaderboardContent: document.getElementById("menu-leaderboard-content"),
      menuLeaderboardNameInput: document.getElementById("menu-leaderboard-name-input"),
      menuLeaderboardCountrySelect: document.getElementById("menu-leaderboard-country-select"),
      menuLeaderboardSaveBtn: document.getElementById("menu-leaderboard-save-btn"),
      menuLeaderboardList: document.getElementById("menu-leaderboard-list"),
      menuLeaderboardYourRank: document.getElementById("menu-leaderboard-your-rank"),
      menuLeaderboardYourName: document.getElementById("menu-leaderboard-your-name"),
      menuLeaderboardYourScore: document.getElementById("menu-leaderboard-your-score"),
      menuSettingsBtn: document.getElementById("menu-settings-btn"),
      menuBadgesOpenBtn: document.getElementById("menu-badges-open-btn"),
      menuBadgesScreen: document.getElementById("menu-badges-screen"),
      menuBadgesCloseBtn: document.getElementById("menu-badges-close-btn"),
      menuBadgesGrid: document.getElementById("menu-badges-grid"),
      menuBadgesSummary: document.getElementById("menu-badges-summary"),
      menuBadgesProgressFill: document.getElementById("menu-badges-progress-fill"),
      menuBadgesFilters: document.getElementById("menu-badges-filters"),
      menuBadgesNear: document.getElementById("menu-badges-near"),
      menuBadgesNearList: document.getElementById("menu-badges-near-list"),
      menuBadgeDetail: document.getElementById("menu-badge-detail"),
      menuBadgeDetailBackdrop: document.getElementById("menu-badge-detail-backdrop"),
      menuBadgeDetailClose: document.getElementById("menu-badge-detail-close"),
      menuBadgeDetailImg: document.getElementById("menu-badge-detail-img"),
      menuBadgeDetailName: document.getElementById("menu-badge-detail-name"),
      menuBadgeDetailCondition: document.getElementById("menu-badge-detail-condition"),
      menuBadgeDetailStatus: document.getElementById("menu-badge-detail-status"),
      photoPickerQuickBtn: document.getElementById("photo-picker-quick-btn"),
      photoPickerClearBtn: document.getElementById("photo-picker-clear-btn"),
      pauseBtn: document.getElementById("pause-btn"),
      settingsCloseBtn: document.getElementById("settings-close-btn"),
      settingsSoundToggleBtn: document.getElementById("settings-sound-toggle-btn"),
      settingsHapticsToggleBtn: document.getElementById("settings-haptics-toggle-btn"),
      settingsVisualModeBtn: document.getElementById("settings-visual-mode-btn"),
      settingsRelaxingToggleBtn: document.getElementById("settings-relaxing-toggle-btn"),
      settingsRelaxingMusicToggleBtn: document.getElementById("settings-relaxing-music-toggle-btn"),
      settingsPhotoBoardToggleBtn: document.getElementById("settings-photo-board-toggle-btn"),
      settingsPhotoBoardPickBtn: document.getElementById("settings-photo-board-pick-btn"),
      settingsPhotoBoardClearBtn: document.getElementById("settings-photo-board-clear-btn"),
      settingsRemoveAdsBtn: document.getElementById("settings-remove-ads-btn"),
      settingsBadgesBtn: document.getElementById("settings-badges-btn"),
      settingsLeaderboardBtn: document.getElementById("settings-leaderboard-btn"),
      settingsResumeBtn: document.getElementById("settings-resume-btn"),
      settingsRestartBtn: document.getElementById("settings-restart-btn"),
      settingsHomeBtn: document.getElementById("settings-home-btn"),
      badgeUnlockModal: document.getElementById("badge-unlock-modal"),
      badgeUnlockBackdrop: document.getElementById("badge-unlock-backdrop"),
      badgeUnlockCloseBtn: document.getElementById("badge-unlock-close-btn"),
      badgeUnlockImage: document.getElementById("badge-unlock-image"),
      badgeUnlockName: document.getElementById("badge-unlock-name"),
      badgeUnlockReason: document.getElementById("badge-unlock-reason"),
      restartGameOverBtn: document.getElementById("restart-gameover-btn"),
      gameOverHomeBtn: document.getElementById("gameover-home-btn"),
      gameOverContinueBtn: document.getElementById("gameover-continue-btn"),
      gameOverRemoveAdsBtn: document.getElementById("gameover-remove-ads-btn"),
      adventureNextBtn: document.getElementById("adventure-next-btn"),
      adventureReplayBtn: document.getElementById("adventure-replay-btn"),
      hintBtn: document.getElementById("hint-btn"),
    };
    this.journeyController = new JourneyController({
      toggleOverlay: (overlay, visible) => this.toggleOverlay(overlay, visible),
    });
    this.journeyPanel = this.journeyController.panelState;
    this.populateMenuLeaderboardCountrySelect();

    this.preloadCoreGameplaySprites();
    this.createBoardGrid();
    if (this.boardToneCanvasEnabled) {
      this.preloadBoardToneAtlas("base");
    }
    this.initFxCanvas();
  }

  bindControls({
    onStartClassic,
    onStartAdventure,
    onOpenJourney,
    onMenuRemoveAds,
    onOpenMenuLeaderboard,
    onCloseMenuLeaderboard,
    onSaveMenuLeaderboardProfile,
    onJourneyBack,
    onJourneyStart,
    onOpenSettings,
    onOpenMenuBadges,
    onCloseMenuBadges,
    onSettingsClose,
    onSettingsToggleSound,
    onSettingsToggleHaptics,
    onSettingsCycleVisualMode,
    onSettingsToggleRelaxing,
    onSettingsToggleRelaxingMusic,
    onSettingsTogglePhotoBoard,
    onSettingsPickPhotoBoard,
    onSettingsClearPhotoBoard,
    onSettingsRemoveAds,
    onSettingsBadges,
    onSettingsLeaderboard,
    onSettingsResume,
    onSettingsRestart,
    onSettingsHome,
    onRestart,
    onGameOverHome,
    onGameOverContinue,
    onGameOverRemoveAds,
    onAdventureNext,
    onAdventureReplay,
    onMilestoneUnlockContinue,
    onHint,
    onQuickPhotoPicker,
    onQuickPhotoClear,
  }) {
    this.elements.startClassicBtn?.addEventListener("click", onStartClassic);
    this.elements.startDailyBtn?.addEventListener("click", () => {
      if (typeof onOpenJourney === "function") {
        onOpenJourney();
        return;
      }
      onStartAdventure?.();
    });
    this.elements.menuRemoveAdsBtn?.addEventListener("click", onMenuRemoveAds);
    this.elements.menuLeaderboardOpenBtn?.addEventListener("click", () => {
      onOpenMenuLeaderboard?.();
    });
    this.elements.menuLeaderboardCloseBtn?.addEventListener("click", () => {
      onCloseMenuLeaderboard?.();
    });
    this.elements.menuLeaderboardPrevBtn?.addEventListener("click", () => {
      this.setMenuLeaderboardTab(this.menuLeaderboardTab === "weekly" ? "global" : "weekly");
    });
    this.elements.menuLeaderboardNextBtn?.addEventListener("click", () => {
      this.setMenuLeaderboardTab(this.menuLeaderboardTab === "weekly" ? "global" : "weekly");
    });
    this.elements.menuLeaderboardSaveBtn?.addEventListener("click", () => {
      if (this.menuLeaderboardProfileLocked) {
        return;
      }
      const profile = this.readMenuLeaderboardProfileInput();
      this.menuLeaderboardProfile = profile;
      this.menuLeaderboardProfileLocked = true;
      this.renderMenuLeaderboard();
      onSaveMenuLeaderboardProfile?.({
        ...profile,
        profileLocked: true,
      });
    });
    this.journeyController.bindControls({ onJourneyBack, onJourneyStart });
    this.elements.menuSettingsBtn?.addEventListener("click", () => {
      onOpenSettings?.({ source: "menu" });
    });
    this.elements.menuBadgesOpenBtn?.addEventListener("click", () => {
      onOpenMenuBadges?.();
    });
    this.elements.menuBadgesCloseBtn?.addEventListener("click", () => {
      onCloseMenuBadges?.();
    });
    this.elements.menuBadgesFilters?.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }
      const button = target.closest("[data-filter]");
      if (!(button instanceof HTMLElement)) {
        return;
      }
      this.setMenuBadgesFilter(button.dataset.filter ?? "all");
    });
    this.elements.menuBadgesGrid?.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }
      const card = target.closest("[data-achievement-id]");
      if (!(card instanceof HTMLElement)) {
        return;
      }
      const achievementId = card.dataset.achievementId;
      if (!achievementId) {
        return;
      }
      this.openMenuBadgeDetail(achievementId);
    });
    this.elements.menuBadgeDetailBackdrop?.addEventListener("click", () => {
      this.closeMenuBadgeDetail();
    });
    this.elements.menuBadgeDetailClose?.addEventListener("click", () => {
      this.closeMenuBadgeDetail();
    });
    this.elements.pauseBtn?.addEventListener("click", () => {
      onOpenSettings?.({ source: "game" });
    });
    this.elements.photoPickerQuickBtn?.addEventListener("click", onQuickPhotoPicker);
    this.elements.photoPickerClearBtn?.addEventListener("click", onQuickPhotoClear);
    this.elements.settingsCloseBtn?.addEventListener("click", onSettingsClose);
    this.elements.settingsSoundToggleBtn?.addEventListener("click", onSettingsToggleSound);
    this.elements.settingsHapticsToggleBtn?.addEventListener("click", onSettingsToggleHaptics);
    this.elements.settingsVisualModeBtn?.addEventListener("click", onSettingsCycleVisualMode);
    this.elements.settingsRelaxingToggleBtn?.addEventListener("click", onSettingsToggleRelaxing);
    this.elements.settingsRelaxingMusicToggleBtn?.addEventListener("click", onSettingsToggleRelaxingMusic);
    this.elements.settingsPhotoBoardToggleBtn?.addEventListener("click", onSettingsTogglePhotoBoard);
    this.elements.settingsPhotoBoardPickBtn?.addEventListener("click", onSettingsPickPhotoBoard);
    this.elements.settingsPhotoBoardClearBtn?.addEventListener("click", onSettingsClearPhotoBoard);
    this.elements.settingsRemoveAdsBtn?.addEventListener("click", onSettingsRemoveAds);
    this.elements.settingsBadgesBtn?.addEventListener("click", onSettingsBadges);
    this.elements.settingsLeaderboardBtn?.addEventListener("click", onSettingsLeaderboard);
    this.elements.settingsResumeBtn?.addEventListener("click", onSettingsResume);
    this.elements.settingsRestartBtn?.addEventListener("click", onSettingsRestart);
    this.elements.settingsHomeBtn?.addEventListener("click", onSettingsHome);
    this.elements.badgeUnlockBackdrop?.addEventListener("click", () => {
      this.closeBadgeUnlockPopup({ manual: true });
    });
    this.elements.badgeUnlockCloseBtn?.addEventListener("click", () => {
      this.closeBadgeUnlockPopup({ manual: true });
    });
    this.elements.restartGameOverBtn?.addEventListener("click", onRestart);
    this.elements.gameOverHomeBtn?.addEventListener("click", onGameOverHome);
    this.elements.gameOverContinueBtn?.addEventListener("click", onGameOverContinue);
    this.elements.gameOverRemoveAdsBtn?.addEventListener("click", onGameOverRemoveAds);
    this.elements.adventureNextBtn?.addEventListener("click", onAdventureNext);
    this.elements.adventureReplayBtn?.addEventListener("click", onAdventureReplay);
    this.elements.milestoneUnlockContinueBtn?.addEventListener("click", onMilestoneUnlockContinue);
    this.elements.hintBtn?.addEventListener("click", onHint);
  }

  setAdventureCounterImpactHandler(handler) {
    this.onAdventureCounterImpact = typeof handler === "function" ? handler : null;
  }

  setBadgeUnlockPopupShownHandler(handler) {
    this.onBadgeUnlockPopupShown = typeof handler === "function" ? handler : null;
  }

  setBadgeUnlockPopupClosedHandler(handler) {
    this.onBadgeUnlockPopupClosed = typeof handler === "function" ? handler : null;
  }

  queueBadgeUnlockPopup({
    badgeSrc = "",
    name = "Badge",
    condition = "",
  } = {}) {
    this.badgeUnlockPanel.queue.push({
      badgeSrc,
      name,
      condition,
    });
    if (this.badgeUnlockPanel.visible) {
      return;
    }
    this.showNextBadgeUnlockPopup();
  }

  showNextBadgeUnlockPopup() {
    if (this.badgeUnlockPanel.timerId) {
      clearTimeout(this.badgeUnlockPanel.timerId);
      this.badgeUnlockPanel.timerId = 0;
    }
    const next = this.badgeUnlockPanel.queue.shift();
    if (!next) {
      this.badgeUnlockPanel.visible = false;
      this.badgeUnlockPanel.current = null;
      this.toggleOverlay(this.elements.badgeUnlockModal, false);
      return;
    }
    this.badgeUnlockPanel.current = next;
    this.badgeUnlockPanel.visible = true;
    if (this.elements.badgeUnlockImage) {
      this.elements.badgeUnlockImage.src = next.badgeSrc;
      this.elements.badgeUnlockImage.alt = next.name;
    }
    if (this.elements.badgeUnlockName) {
      this.elements.badgeUnlockName.textContent = next.name;
    }
    if (this.elements.badgeUnlockReason) {
      this.elements.badgeUnlockReason.textContent = next.condition;
    }
    this.toggleOverlay(this.elements.badgeUnlockModal, true);
    const durationMs = Number(this.onBadgeUnlockPopupShown?.(next));
    const holdMs = Number.isFinite(durationMs) && durationMs > 0 ? durationMs : 2600;
    this.badgeUnlockPanel.timerId = setTimeout(() => {
      this.closeBadgeUnlockPopup({ manual: false });
    }, holdMs);
  }

  closeBadgeUnlockPopup({ manual = false } = {}) {
    if (!this.badgeUnlockPanel.visible) {
      return;
    }
    if (this.badgeUnlockPanel.timerId) {
      clearTimeout(this.badgeUnlockPanel.timerId);
      this.badgeUnlockPanel.timerId = 0;
    }
    this.badgeUnlockPanel.visible = false;
    this.badgeUnlockPanel.current = null;
    this.toggleOverlay(this.elements.badgeUnlockModal, false);
    this.onBadgeUnlockPopupClosed?.({ manual: Boolean(manual) });
    if (this.badgeUnlockPanel.queue.length) {
      this.badgeUnlockPanel.timerId = setTimeout(() => {
        this.badgeUnlockPanel.timerId = 0;
        this.showNextBadgeUnlockPopup();
      }, 120);
    }
  }

  openSettingsPanel({
    source = "game",
    canResume = true,
    soundEnabled = true,
    hapticsEnabled = true,
    relaxingModeEnabled = false,
    relaxingMusicEnabled = false,
    photoBoardEnabled = false,
    photoBoardReady = false,
    visualMode = "royal",
  } = {}) {
    this.settingsPanel.visible = true;
    this.settingsPanel.source = source;
    this.settingsPanel.canResume = Boolean(canResume);
    this.settingsPanel.soundEnabled = Boolean(soundEnabled);
    this.settingsPanel.hapticsEnabled = Boolean(hapticsEnabled);
    this.settingsPanel.relaxingModeEnabled = Boolean(relaxingModeEnabled);
    this.settingsPanel.relaxingMusicEnabled = Boolean(relaxingMusicEnabled);
    this.settingsPanel.photoBoardEnabled = Boolean(photoBoardEnabled);
    this.settingsPanel.photoBoardReady = Boolean(photoBoardReady);
    this.settingsPanel.visualMode = String(visualMode || "royal");
    this.renderSettingsPanel();
    this.toggleOverlay(this.elements.settingsOverlay, true);
  }

  closeSettingsPanel() {
    this.settingsPanel.visible = false;
    this.toggleOverlay(this.elements.settingsOverlay, false);
  }

  openJourneyPanel({
    totalLevels = 100,
    playableMaxLevel = 10,
    currentLevel = 1,
    completed = {},
  } = {}) {
    this.journeyController.open({
      totalLevels,
      playableMaxLevel,
      currentLevel,
      completed,
    });
  }

  closeJourneyPanel() {
    this.journeyController.close();
  }

  setMenuBadgesUiVariant(variant = "v2") {
    this.menuBadgesUiVariant = variant === "v1" ? "v1" : "v2";
    this.menuAchievementsRenderKey = "";
    const sheet = this.elements.menuBadgesScreen;
    if (!sheet) {
      return;
    }
    sheet.classList.toggle("menu-badges-screen--v1", this.menuBadgesUiVariant === "v1");
    sheet.classList.toggle("menu-badges-screen--v2", this.menuBadgesUiVariant !== "v1");
  }

  openMenuBadgesView({ context = "menu" } = {}) {
    this.menuBadgesContext = context === "settings" ? "settings" : "menu";
    this.menuLeaderboardViewOpen = false;
    this.syncMenuLeaderboardViewVisibility();
    this.menuBadgesViewOpen = true;
    this.syncMenuBadgesViewVisibility();
  }

  closeMenuBadgesView() {
    this.menuBadgesViewOpen = false;
    this.closeMenuBadgeDetail();
    this.menuBadgesContext = "menu";
    this.syncMenuBadgesViewVisibility();
  }

  syncMenuBadgesViewVisibility() {
    const sheet = this.elements.menuBadgesScreen;
    if (!sheet) {
      return;
    }
    const visible =
      this.menuBadgesViewOpen &&
      (
        this.currentStatus === "menu" ||
        (this.currentStatus === "paused" && this.menuBadgesContext === "settings")
      );
    sheet.classList.toggle("is-visible", visible);
    sheet.setAttribute("aria-hidden", visible ? "false" : "true");
    if (!visible) {
      this.closeMenuBadgeDetail();
    }
  }

  openMenuLeaderboardView({
    context = "menu",
    initialTab = "global",
    globalEntries = null,
    weeklyEntries = null,
    profile = null,
    profileLocked = null,
    yourRankGlobal = null,
    yourRankWeekly = null,
  } = {}) {
    this.menuLeaderboardContext = context === "settings" ? "settings" : "menu";
    if (Array.isArray(globalEntries)) {
      this.menuLeaderboardData.global = globalEntries;
    }
    if (Array.isArray(weeklyEntries)) {
      this.menuLeaderboardData.weekly = weeklyEntries;
    }
    if (profile && typeof profile === "object") {
      this.menuLeaderboardProfile = {
        name: String(profile.name ?? this.menuLeaderboardProfile.name ?? "Player").slice(0, 18),
        countryCode: String(profile.countryCode ?? this.menuLeaderboardProfile.countryCode ?? "TR").toUpperCase(),
      };
    }
    if (typeof profileLocked === "boolean") {
      this.menuLeaderboardProfileLocked = profileLocked;
    }
    if (yourRankGlobal && typeof yourRankGlobal === "object") {
      this.menuLeaderboardYourRank.global = yourRankGlobal;
    }
    if (yourRankWeekly && typeof yourRankWeekly === "object") {
      this.menuLeaderboardYourRank.weekly = yourRankWeekly;
    }
    this.menuBadgesViewOpen = false;
    this.closeMenuBadgeDetail();
    this.menuLeaderboardViewOpen = true;
    this.setMenuLeaderboardTab(initialTab);
    this.syncMenuLeaderboardViewVisibility();
    this.renderMenuLeaderboard();
  }

  closeMenuLeaderboardView() {
    this.menuLeaderboardViewOpen = false;
    this.menuLeaderboardContext = "menu";
    if (this.menuLeaderboardTabAnimTimer) {
      window.clearTimeout(this.menuLeaderboardTabAnimTimer);
      this.menuLeaderboardTabAnimTimer = 0;
    }
    this.elements.menuLeaderboardContent?.classList.remove("is-tab-leaving", "is-tab-enter");
    this.syncMenuLeaderboardViewVisibility();
  }

  syncMenuLeaderboardViewVisibility() {
    const sheet = this.elements.menuLeaderboardScreen;
    if (!sheet) {
      return;
    }
    const visible =
      this.menuLeaderboardViewOpen &&
      (
        this.currentStatus === "menu" ||
        (this.currentStatus === "paused" && this.menuLeaderboardContext === "settings")
      );
    sheet.classList.toggle("is-visible", visible);
    sheet.setAttribute("aria-hidden", visible ? "false" : "true");
  }

  setMenuLeaderboardTab(tab = "global") {
    const safeTab = tab === "weekly" ? "weekly" : "global";
    if (safeTab === this.menuLeaderboardTab) {
      return;
    }
    const screenVisible = this.elements.menuLeaderboardScreen?.classList.contains("is-visible");
    const content = this.elements.menuLeaderboardContent;
    const canAnimate = Boolean(screenVisible && content);
    if (canAnimate) {
      if (this.menuLeaderboardTabAnimTimer) {
        window.clearTimeout(this.menuLeaderboardTabAnimTimer);
        this.menuLeaderboardTabAnimTimer = 0;
      }
      content.classList.remove("is-tab-enter");
      content.classList.add("is-tab-leaving");
      this.menuLeaderboardTabAnimTimer = window.setTimeout(() => {
        this.menuLeaderboardTab = safeTab;
        this.renderMenuLeaderboard();
        content.classList.remove("is-tab-leaving");
        content.classList.add("is-tab-enter");
        this.menuLeaderboardTabAnimTimer = window.setTimeout(() => {
          content.classList.remove("is-tab-enter");
          this.menuLeaderboardTabAnimTimer = 0;
        }, 180);
      }, 110);
      return;
    }
    this.menuLeaderboardTab = safeTab;
    this.renderMenuLeaderboard();
  }

  setMenuLeaderboardData({
    globalEntries = null,
    weeklyEntries = null,
    profile = null,
    profileLocked = null,
    yourRankGlobal = null,
    yourRankWeekly = null,
    activeTab = null,
  } = {}) {
    if (Array.isArray(globalEntries)) {
      this.menuLeaderboardData.global = globalEntries;
    }
    if (Array.isArray(weeklyEntries)) {
      this.menuLeaderboardData.weekly = weeklyEntries;
    }
    if (profile && typeof profile === "object") {
      this.menuLeaderboardProfile = {
        name: String(profile.name ?? this.menuLeaderboardProfile.name ?? "Player").slice(0, 18),
        countryCode: String(profile.countryCode ?? this.menuLeaderboardProfile.countryCode ?? "TR").toUpperCase(),
      };
    }
    if (typeof profileLocked === "boolean") {
      this.menuLeaderboardProfileLocked = profileLocked;
    }
    if (yourRankGlobal && typeof yourRankGlobal === "object") {
      this.menuLeaderboardYourRank.global = yourRankGlobal;
    }
    if (yourRankWeekly && typeof yourRankWeekly === "object") {
      this.menuLeaderboardYourRank.weekly = yourRankWeekly;
    }
    if (typeof activeTab === "string") {
      this.menuLeaderboardTab = activeTab === "weekly" ? "weekly" : "global";
    }
    this.renderMenuLeaderboard();
  }

  populateMenuLeaderboardCountrySelect() {
    const countrySelect = this.elements.menuLeaderboardCountrySelect;
    if (!countrySelect) {
      return;
    }
    const safeCountries = Array.isArray(this.menuLeaderboardCountries)
      ? this.menuLeaderboardCountries
      : [];
    countrySelect.innerHTML = "";
    safeCountries.forEach(({ code, name }) => {
      const option = document.createElement("option");
      option.value = code;
      option.textContent = `${this.countryCodeToFlag(code)} ${name}`;
      countrySelect.appendChild(option);
    });
    const preferred = String(this.menuLeaderboardProfile.countryCode ?? "TR").toUpperCase();
    const hasPreferred = safeCountries.some((entry) => entry.code === preferred);
    countrySelect.value = hasPreferred ? preferred : "TR";
    if (!countrySelect.value && safeCountries.length) {
      countrySelect.value = safeCountries[0].code;
    }
  }

  readMenuLeaderboardProfileInput() {
    const nameInput = this.elements.menuLeaderboardNameInput;
    const countrySelect = this.elements.menuLeaderboardCountrySelect;
    const rawName = nameInput ? String(nameInput.value ?? "") : "";
    const cleanName = rawName.replace(/\s+/g, " ").trim().slice(0, 18);
    const fallbackName = this.menuLeaderboardProfile.name || "Player";
    const safeName = cleanName || fallbackName;
    const countryCode = countrySelect
      ? String(countrySelect.value ?? this.menuLeaderboardProfile.countryCode ?? "TR").toUpperCase()
      : String(this.menuLeaderboardProfile.countryCode ?? "TR").toUpperCase();
    return {
      name: safeName,
      countryCode,
    };
  }

  countryCodeToFlag(countryCode = "TR") {
    const code = String(countryCode || "").toUpperCase();
    if (!/^[A-Z]{2}$/.test(code)) {
      return String.fromCodePoint(0x1F3F3, 0xFE0F);
    }
    const chars = [...code].map((char) => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...chars);
  }

  renderMenuLeaderboard() {
    const subtitle = this.elements.menuLeaderboardSubtitle;
    const modeLabel = this.elements.menuLeaderboardModeLabel;
    const setup = this.elements.menuLeaderboardSetup;
    const screen = this.elements.menuLeaderboardScreen;
    const content = this.elements.menuLeaderboardContent;
    const nameInput = this.elements.menuLeaderboardNameInput;
    const countrySelect = this.elements.menuLeaderboardCountrySelect;
    const list = this.elements.menuLeaderboardList;
    const safeTab = this.menuLeaderboardTab === "weekly" ? "weekly" : "global";
    const isLocked = this.menuLeaderboardProfileLocked;
    const shouldShowSetup = !isLocked && this.menuLeaderboardViewOpen;
    const entries = Array.isArray(this.menuLeaderboardData[safeTab])
      ? this.menuLeaderboardData[safeTab]
      : [];

    if (screen) {
      screen.classList.toggle("is-setup-open", shouldShowSetup);
    }
    if (setup) {
      setup.hidden = !shouldShowSetup;
      setup.setAttribute("aria-hidden", shouldShowSetup ? "false" : "true");
    }
    if (content) {
      content.setAttribute("aria-hidden", shouldShowSetup ? "true" : "false");
      if ("inert" in content) {
        content.inert = shouldShowSetup;
      }
    }
    if (subtitle) {
      subtitle.textContent = safeTab === "weekly" ? "Weekly Race" : "Global Top Players";
    }
    if (modeLabel) {
      modeLabel.textContent = safeTab === "weekly" ? "Weekly" : "Global";
    }
    if (nameInput) {
      nameInput.value = this.menuLeaderboardProfile.name ?? "Player";
    }
    if (countrySelect) {
      const nextCountry = String(this.menuLeaderboardProfile.countryCode ?? "TR").toUpperCase();
      const hasCountry = Array.isArray(this.menuLeaderboardCountries)
        ? this.menuLeaderboardCountries.some((entry) => entry.code === nextCountry)
        : false;
      countrySelect.value = hasCountry ? nextCountry : "TR";
    }

    if (list) {
      list.innerHTML = "";
      if (!entries.length) {
        const empty = document.createElement("li");
        empty.className = "menu-leaderboard-empty";
        empty.textContent = "No ranking data yet";
        list.appendChild(empty);
      } else {
        entries.forEach((item) => {
          const row = document.createElement("li");
          row.className = "menu-leaderboard-row";
          if (item.isPlayer) {
            row.classList.add("is-player");
          }

          const medal = document.createElement("span");
          medal.className = "menu-leaderboard-row-medal";
          if (item.rank === 1) {
            medal.textContent = "🥇";
          } else if (item.rank === 2) {
            medal.textContent = "🥈";
          } else if (item.rank === 3) {
            medal.textContent = "🥉";
          } else {
            medal.textContent = "";
          }

          const rank = document.createElement("span");
          rank.className = "menu-leaderboard-rank";
          rank.textContent = `#${item.rank ?? "-"}`;

          const flag = document.createElement("span");
          flag.className = "menu-leaderboard-flag";
          flag.textContent = this.countryCodeToFlag(item.countryCode);

          const name = document.createElement("span");
          name.className = "menu-leaderboard-name";
          name.textContent = item.name ?? "Player";

          const score = document.createElement("span");
          score.className = "menu-leaderboard-score";
          score.textContent = this.formatScore(item.score ?? 0);

          row.append(medal, rank, flag, name, score);
          list.appendChild(row);
        });
      }
    }

    const yourRank = this.menuLeaderboardYourRank[safeTab] ?? null;
    if (this.elements.menuLeaderboardYourRank) {
      this.elements.menuLeaderboardYourRank.textContent =
        yourRank && Number.isFinite(yourRank.rank) ? `#${yourRank.rank}` : "#-";
    }
    if (this.elements.menuLeaderboardYourName) {
      const youName = yourRank?.name ?? this.menuLeaderboardProfile.name ?? "Player";
      const youCountry = yourRank?.countryCode ?? this.menuLeaderboardProfile.countryCode ?? "TR";
      this.elements.menuLeaderboardYourName.textContent = `${this.countryCodeToFlag(youCountry)} ${youName}`;
    }
    if (this.elements.menuLeaderboardYourScore) {
      this.elements.menuLeaderboardYourScore.textContent = this.formatScore(yourRank?.score ?? 0);
    }
  }

  setMenuBadgesFilter(nextFilter = "all") {
    const safeFilter = ["all", "unlocked", "locked"].includes(nextFilter) ? nextFilter : "all";
    if (this.menuBadgesFilter === safeFilter) {
      return;
    }
    this.menuBadgesFilter = safeFilter;
    this.menuAchievementsRenderKey = "";
    if (this.menuBadgesEvaluation) {
      this.renderMenuAchievementsFromEvaluation(this.menuBadgesEvaluation);
    }
  }

  openMenuBadgeDetail(achievementId) {
    if (!this.menuBadgesEvaluation) {
      return;
    }
    const item = this.menuBadgesEvaluation.items.find((entry) => entry.id === achievementId);
    if (!item) {
      return;
    }
    this.menuBadgeDetailId = achievementId;
    this.renderMenuBadgeDetail(item);
  }

  closeMenuBadgeDetail() {
    this.menuBadgeDetailId = null;
    const detail = this.elements.menuBadgeDetail;
    if (!detail) {
      return;
    }
    detail.classList.remove("is-visible");
    detail.setAttribute("aria-hidden", "true");
  }

  renderMenuBadgeDetail(item) {
    const detail = this.elements.menuBadgeDetail;
    if (!detail) {
      return;
    }
    if (this.elements.menuBadgeDetailImg) {
      this.elements.menuBadgeDetailImg.src = item.badgeSrc;
      this.elements.menuBadgeDetailImg.alt = item.name;
      this.elements.menuBadgeDetailImg.classList.toggle("is-locked", !item.unlocked);
    }
    if (this.elements.menuBadgeDetailName) {
      this.elements.menuBadgeDetailName.textContent = item.name;
    }
    if (this.elements.menuBadgeDetailCondition) {
      this.elements.menuBadgeDetailCondition.textContent = item.condition;
    }
    if (this.elements.menuBadgeDetailStatus) {
      this.elements.menuBadgeDetailStatus.textContent = item.unlocked
        ? "Unlocked"
        : `In progress - ${item.progressText}`;
      this.elements.menuBadgeDetailStatus.classList.toggle("is-locked", !item.unlocked);
    }
    detail.classList.add("is-visible");
    detail.setAttribute("aria-hidden", "false");
  }

  renderMenuBadgesNearTargets(evaluation) {
    const nearSection = this.elements.menuBadgesNear;
    const nearList = this.elements.menuBadgesNearList;
    if (!nearSection || !nearList) {
      return;
    }
    const nearTargets = evaluation.nearTargets ?? [];
    nearList.innerHTML = "";
    if (!nearTargets.length || this.menuBadgesUiVariant === "v1") {
      nearSection.style.display = "none";
      return;
    }
    nearSection.style.display = "";
    nearTargets.forEach((target) => {
      const row = document.createElement("li");
      row.className = "menu-badges-near-item";
      const leftWrap = document.createElement("div");
      leftWrap.className = "menu-badges-near-left";
      const name = document.createElement("span");
      name.className = "menu-badges-near-name";
      name.textContent = target.name;
      const progress = document.createElement("span");
      progress.className = "menu-badges-near-progress";
      progress.textContent = target.progressText;
      const remaining = document.createElement("span");
      remaining.className = "menu-badges-near-remaining";
      remaining.textContent = target.remainingText ?? "";
      leftWrap.append(name, progress);
      row.append(leftWrap, remaining);
      nearList.appendChild(row);
    });
  }

  renderMenuBadgesFilterButtons(evaluation = null) {
    const filters = this.elements.menuBadgesFilters;
    if (!filters) {
      return;
    }
    if (evaluation) {
      const allBtn = filters.querySelector("[data-filter='all']");
      const unlockedBtn = filters.querySelector("[data-filter='unlocked']");
      const lockedBtn = filters.querySelector("[data-filter='locked']");
      if (allBtn) {
        allBtn.textContent = `All (${evaluation.totalCount})`;
      }
      if (unlockedBtn) {
        unlockedBtn.textContent = `Unlocked (${evaluation.unlockedCount})`;
      }
      if (lockedBtn) {
        lockedBtn.textContent = `Locked (${Math.max(0, evaluation.totalCount - evaluation.unlockedCount)})`;
      }
    }
    filters.querySelectorAll("[data-filter]").forEach((node) => {
      if (!(node instanceof HTMLElement)) {
        return;
      }
      node.classList.toggle("is-active", node.dataset.filter === this.menuBadgesFilter);
    });
    filters.style.display = this.menuBadgesUiVariant === "v1" ? "none" : "";
  }

  renderMenuAchievementsFromEvaluation(evaluation) {
    const grid = this.elements.menuBadgesGrid;
    if (!grid) {
      return;
    }
    const summary = this.elements.menuBadgesSummary;
    const progressFill = this.elements.menuBadgesProgressFill;
    if (summary) {
      summary.textContent = `${evaluation.unlockedCount}/${evaluation.totalCount} unlocked`;
    }
    if (progressFill) {
      const ratio = evaluation.totalCount > 0 ? (evaluation.unlockedCount / evaluation.totalCount) : 0;
      progressFill.style.width = `${Math.round(ratio * 100)}%`;
      progressFill.parentElement?.classList.toggle("is-hidden", this.menuBadgesUiVariant === "v1");
    }
    this.renderMenuBadgesFilterButtons(evaluation);
    this.renderMenuBadgesNearTargets(evaluation);

    const filteredItems = evaluation.items.filter((item) => {
      if (this.menuBadgesFilter === "unlocked") {
        return item.unlocked;
      }
      if (this.menuBadgesFilter === "locked") {
        return !item.unlocked;
      }
      return true;
    });

    grid.innerHTML = "";
    filteredItems.forEach((achievement) => {
      const cell = document.createElement("div");
      cell.className = "menu-badge-item";
      cell.classList.toggle("is-locked", !achievement.unlocked);
      cell.classList.toggle("is-unlocked", achievement.unlocked);
      cell.setAttribute("role", "listitem");
      cell.setAttribute("title", achievement.name);
      cell.setAttribute("aria-label", `${achievement.name} ${achievement.unlocked ? "unlocked" : "locked"}`);
      cell.dataset.achievementId = achievement.id;
      const hadPrevState = this.menuBadgeUnlockStates.has(achievement.id);
      const prevUnlocked = hadPrevState ? this.menuBadgeUnlockStates.get(achievement.id) === true : achievement.unlocked;
      this.menuBadgeUnlockStates.set(achievement.id, achievement.unlocked);
      if (achievement.unlocked && hadPrevState && !prevUnlocked && this.menuBadgesUiVariant !== "v1") {
        cell.classList.add("is-newly-unlocked");
      }

      const badgeImage = document.createElement("img");
      badgeImage.className = "menu-badge-img";
      badgeImage.src = achievement.badgeSrc;
      badgeImage.alt = achievement.name;
      badgeImage.loading = "lazy";
      badgeImage.decoding = "async";
      cell.appendChild(badgeImage);

      if (!achievement.unlocked) {
        const lock = document.createElement("span");
        lock.className = "menu-badge-lock";
        lock.textContent = "\uD83D\uDD12";
        lock.setAttribute("aria-hidden", "true");
        cell.appendChild(lock);
      }

      if (!achievement.unlocked && this.menuBadgesUiVariant !== "v1") {
        const progress = document.createElement("div");
        progress.className = "menu-badge-progress";
        const progressFill = document.createElement("span");
        progressFill.className = "menu-badge-progress-fill";
        progressFill.style.width = `${Math.round(Math.max(0, Math.min(1, achievement.progressRatio)) * 100)}%`;
        const progressValue = document.createElement("span");
        progressValue.className = "menu-badge-progress-value";
        progressValue.textContent = achievement.remainingText ?? achievement.progressText;
        progress.append(progressFill, progressValue);
        cell.appendChild(progress);
      }

      grid.appendChild(cell);
    });

    if (this.menuBadgeDetailId) {
      const current = evaluation.items.find((entry) => entry.id === this.menuBadgeDetailId);
      if (current) {
        this.renderMenuBadgeDetail(current);
      } else {
        this.closeMenuBadgeDetail();
      }
    }
  }

  updateSettingsPanelState({
    soundEnabled,
    hapticsEnabled,
    relaxingModeEnabled,
    relaxingMusicEnabled,
    photoBoardEnabled,
    photoBoardReady,
    visualMode,
    canResume,
  } = {}) {
    if (typeof soundEnabled === "boolean") {
      this.settingsPanel.soundEnabled = soundEnabled;
    }
    if (typeof hapticsEnabled === "boolean") {
      this.settingsPanel.hapticsEnabled = hapticsEnabled;
    }
    if (typeof relaxingModeEnabled === "boolean") {
      this.settingsPanel.relaxingModeEnabled = relaxingModeEnabled;
    }
    if (typeof relaxingMusicEnabled === "boolean") {
      this.settingsPanel.relaxingMusicEnabled = relaxingMusicEnabled;
    }
    if (typeof photoBoardEnabled === "boolean") {
      this.settingsPanel.photoBoardEnabled = photoBoardEnabled;
    }
    if (typeof photoBoardReady === "boolean") {
      this.settingsPanel.photoBoardReady = photoBoardReady;
    }
    if (typeof visualMode === "string" && visualMode.length) {
      this.settingsPanel.visualMode = visualMode;
    }
    if (typeof canResume === "boolean") {
      this.settingsPanel.canResume = canResume;
    }
    this.renderSettingsPanel();
  }

  setClassicPhotoBoardConfig({ enabled = false, tiles = [] } = {}) {
    const nextEnabled = Boolean(enabled);
    const nextSource = Array.isArray(tiles) ? tiles : [];
    const changed =
      this.classicPhotoBoardEnabled !== nextEnabled ||
      this.classicPhotoTilesSource !== nextSource;
    this.classicPhotoBoardEnabled = nextEnabled;
    if (!changed) {
      return;
    }
    this.classicPhotoTilesSource = nextSource;
    this.classicPhotoTiles = nextSource.slice();
    this.classicPhotoTilesVersion += 1;
    this.boardRenderCache.fill("");
  }

  renderSettingsPanel() {
    const {
      settingsSoundToggleBtn,
      settingsHapticsToggleBtn,
      settingsVisualModeBtn,
      settingsRelaxingToggleBtn,
      settingsRelaxingMusicToggleBtn,
      settingsPhotoBoardToggleBtn,
      settingsPhotoBoardPickBtn,
      settingsPhotoBoardClearBtn,
      settingsBadgesBtn,
      settingsLeaderboardBtn,
      settingsResumeBtn,
      settingsRestartBtn,
      settingsHomeBtn,
    } = this.elements;

    const soundEnabled = Boolean(this.settingsPanel.soundEnabled);
    const hapticsEnabled = Boolean(this.settingsPanel.hapticsEnabled);
    const relaxingModeEnabled = Boolean(this.settingsPanel.relaxingModeEnabled);
    const relaxingMusicEnabled = Boolean(this.settingsPanel.relaxingMusicEnabled);
    const photoBoardEnabled = Boolean(this.settingsPanel.photoBoardEnabled);
    const photoBoardReady = Boolean(this.settingsPanel.photoBoardReady);
    const visualModeKey = String(this.settingsPanel.visualMode || "royal");
    const canResume = Boolean(this.settingsPanel.canResume);

    if (settingsSoundToggleBtn) {
      settingsSoundToggleBtn.textContent = soundEnabled ? "On" : "Off";
      settingsSoundToggleBtn.setAttribute("aria-pressed", soundEnabled ? "true" : "false");
      settingsSoundToggleBtn.classList.toggle("is-off", !soundEnabled);
    }
    if (settingsHapticsToggleBtn) {
      settingsHapticsToggleBtn.textContent = hapticsEnabled ? "On" : "Off";
      settingsHapticsToggleBtn.setAttribute("aria-pressed", hapticsEnabled ? "true" : "false");
      settingsHapticsToggleBtn.classList.toggle("is-off", !hapticsEnabled);
    }
    if (settingsVisualModeBtn) {
      const visualModeLabel = VISUAL_MODE_LABELS[visualModeKey] ?? VISUAL_MODE_LABELS.royal;
      settingsVisualModeBtn.textContent = visualModeLabel;
      settingsVisualModeBtn.setAttribute("aria-label", `Visual mode: ${visualModeLabel}. Tap to cycle`);
    }
    if (settingsRelaxingToggleBtn) {
      settingsRelaxingToggleBtn.textContent = relaxingModeEnabled ? "On" : "Off";
      settingsRelaxingToggleBtn.setAttribute("aria-pressed", relaxingModeEnabled ? "true" : "false");
      settingsRelaxingToggleBtn.classList.toggle("is-off", !relaxingModeEnabled);
    }
    if (settingsRelaxingMusicToggleBtn) {
      settingsRelaxingMusicToggleBtn.textContent = relaxingMusicEnabled ? "On" : "Off";
      settingsRelaxingMusicToggleBtn.setAttribute("aria-pressed", relaxingMusicEnabled ? "true" : "false");
      settingsRelaxingMusicToggleBtn.classList.toggle("is-off", !relaxingMusicEnabled);
      settingsRelaxingMusicToggleBtn.disabled = false;
      settingsRelaxingMusicToggleBtn.classList.remove("is-disabled");
    }
    if (settingsPhotoBoardToggleBtn) {
      settingsPhotoBoardToggleBtn.textContent = photoBoardEnabled ? "On" : "Off";
      settingsPhotoBoardToggleBtn.setAttribute("aria-pressed", photoBoardEnabled ? "true" : "false");
      settingsPhotoBoardToggleBtn.classList.toggle("is-off", !photoBoardEnabled);
    }
    if (settingsPhotoBoardPickBtn) {
      settingsPhotoBoardPickBtn.textContent = photoBoardReady ? "Change" : "Choose";
    }
    if (settingsPhotoBoardClearBtn) {
      settingsPhotoBoardClearBtn.disabled = !photoBoardReady;
      settingsPhotoBoardClearBtn.classList.toggle("is-disabled", !photoBoardReady);
    }
    if (settingsBadgesBtn) {
      settingsBadgesBtn.style.display = "";
    }
    if (settingsLeaderboardBtn) {
      settingsLeaderboardBtn.style.display = "";
    }
    if (settingsResumeBtn) {
      settingsResumeBtn.style.display = canResume ? "" : "none";
    }
    if (settingsRestartBtn) {
      settingsRestartBtn.style.display = canResume ? "" : "none";
    }
    if (settingsHomeBtn) {
      settingsHomeBtn.style.display = canResume ? "" : "none";
    }
  }

  render(snapshot) {
    const previousStatus = this.currentStatus;
    this.currentStatus = snapshot.status;
    this.currentMode = snapshot.mode ?? "classic";
    this.updateThermalBudget(snapshot);
    const shell = this.elements.gameShell;
    if (shell) {
      shell.classList.toggle("mode-classic", this.currentMode === "classic");
      shell.classList.toggle("mode-adventure", this.currentMode === "adventure");
      shell.classList.toggle("mode-daily", this.currentMode === "daily");
    }
    if (this.elements.photoPickerQuickBtn) {
      const showQuickPicker =
        this.currentMode === "classic" &&
        (this.currentStatus === "playing" || this.currentStatus === "paused");
      this.elements.photoPickerQuickBtn.classList.toggle("is-hidden", !showQuickPicker);
    }
    if (this.elements.photoPickerClearBtn) {
      const showQuickPicker =
        this.currentMode === "classic" &&
        (this.currentStatus === "playing" || this.currentStatus === "paused");
      const showClear = showQuickPicker && this.classicPhotoBoardEnabled === true;
      this.elements.photoPickerClearBtn.classList.toggle("is-hidden", !showClear);
    }
    this.renderBoard(snapshot.board);
    if (!this.dragSessionActive) {
      this.renderPieces(snapshot.pieces);
    }
    this.renderHud(snapshot);
    this.renderAdventure(snapshot);
    this.renderMenuAchievements(snapshot);
    this.syncMenuBadgesViewVisibility();
    this.renderOverlays(snapshot.status, snapshot.score, snapshot.weeklyTop, snapshot, previousStatus);
  }

  renderMenuAchievements(snapshot) {
    if (!this.elements.menuBadgesGrid) {
      return;
    }
    const evaluation = evaluateAchievements(snapshot);
    this.menuBadgesEvaluation = evaluation;
    const renderKey = [
      this.menuBadgesUiVariant,
      this.menuBadgesFilter,
      evaluation.items.map((item) => `${item.id}:${item.unlocked ? 1 : 0}:${item.progressText}`).join("|"),
    ].join("::");
    if (renderKey === this.menuAchievementsRenderKey) {
      return;
    }
    this.menuAchievementsRenderKey = renderKey;
    this.renderMenuAchievementsFromEvaluation(evaluation);
  }

  createBoardGrid() {
    this.elements.board.innerHTML = "";
    for (let row = 0; row < this.boardSize; row += 1) {
      for (let col = 0; col < this.boardSize; col += 1) {
        const cell = document.createElement("div");
        cell.className = "cell";
        cell.dataset.row = String(row);
        cell.dataset.col = String(col);
        this.elements.board.appendChild(cell);
        this.cells.set(this.cellKey(row, col), cell);
      }
    }
  }

  resolveBoardRenderMode() {
    // Release lock: board render mode is fixed.
    return "dom";
  }

  getBoardToneAtlasKind() {
    // Keep canvas board visuals identical to the approved DOM quality.
    // "lite" atlas can produce edge-only looking tiles on some iOS paths.
    return "base";
  }

  preloadBoardToneAtlas(kind = "base") {
    const atlasKind = kind === "lite" ? "lite" : "base";
    if (this.boardToneCanvasAtlasReady[atlasKind]) {
      return Promise.resolve(this.boardToneCanvasAtlases[atlasKind]);
    }
    if (this.boardToneCanvasAtlasPromises[atlasKind]) {
      return this.boardToneCanvasAtlasPromises[atlasKind];
    }
    const sources = BOARD_TONE_SPRITE_ASSETS[atlasKind];
    const entries = Object.entries(sources);
    const promise = Promise.all(entries.map(([tone, src]) => new Promise((resolve) => {
      const image = new Image();
      image.decoding = "async";
      image.onload = () => resolve([Number(tone), image]);
      image.onerror = () => resolve([Number(tone), null]);
      image.src = src;
    }))).then((pairs) => {
      const map = new Map();
      pairs.forEach(([tone, image]) => {
        if (image) {
          map.set(Number(tone), image);
        }
      });
      this.boardToneCanvasAtlases[atlasKind] = map;
      this.boardToneCanvasAtlasReady[atlasKind] = true;
      return map;
    }).finally(() => {
      this.boardToneCanvasAtlasPromises[atlasKind] = null;
    });
    this.boardToneCanvasAtlasPromises[atlasKind] = promise;
    return promise;
  }

  preloadCoreGameplaySprites() {
    if (this.coreGameplaySpritePreloadPromise) {
      return this.coreGameplaySpritePreloadPromise;
    }
    const criticalPreloadList = [
      ...Object.values(BOARD_TONE_SPRITE_ASSETS.base || {}),
      ...Object.values(BLOCK_SPRITES_BY_TONE || {}),
    ];
    const deferredPreloadList = [
      ...Object.values(BOARD_TONE_SPRITE_ASSETS.lite || {}),
      ...Object.values(CLOUD_WORD_ASSETS.combo || {}),
      ...Object.values(CLOUD_WORD_ASSETS.clear || {}),
      ...Object.values(MOVE_APPROVAL_ICONS || {}),
      "./assets/logo.png",
    ];
    const uniqueSources = Array.from(new Set(criticalPreloadList.filter((src) => typeof src === "string" && src.length > 0)));
    this.coreGameplaySpritePreloadPromise = Promise.allSettled(
      uniqueSources.map((src) => this.preloadImageAsset(src)),
    ).finally(() => {
      this.coreGameplaySpritePreloadPromise = null;
    });
    this.deferSpriteWarmup(deferredPreloadList);
    return this.coreGameplaySpritePreloadPromise;
  }

  deferSpriteWarmup(list) {
    const uniqueSources = Array.from(new Set((list || []).filter((src) => typeof src === "string" && src.length > 0)));
    if (uniqueSources.length === 0) {
      return;
    }
    const run = () => {
      uniqueSources.forEach((src) => {
        this.preloadImageAsset(src);
      });
    };
    if (typeof window.requestIdleCallback === "function") {
      window.requestIdleCallback(() => run(), { timeout: 1200 });
      return;
    }
    window.setTimeout(run, 900);
  }

  preloadImageAsset(src) {
    if (typeof src !== "string" || src.length === 0) {
      return Promise.resolve(null);
    }
    const cached = this.coreSpritePreloadCache.get(src);
    if (cached?.promise) {
      return cached.promise;
    }
    const image = new Image();
    image.decoding = "async";
    image.loading = "eager";
    const promise = new Promise((resolve) => {
      const finalize = () => resolve(image);
      image.onload = () => {
        if (typeof image.decode === "function") {
          image.decode().catch(() => {}).finally(finalize);
          return;
        }
        finalize();
      };
      image.onerror = () => resolve(null);
      image.src = src;
    });
    this.coreSpritePreloadCache.set(src, { image, promise });
    return promise;
  }

  initFxCanvas() {
    const canvas = this.elements.fxCanvas;
    const toneCanvas = this.elements.boardFillCanvas;
    if (!canvas) {
      return;
    }
    if (toneCanvas) {
      toneCanvas.style.display = this.boardToneCanvasEnabled ? "block" : "none";
      if (this.boardToneCanvasEnabled) {
        this.boardToneCanvas = toneCanvas;
        this.boardToneCanvasCtx = toneCanvas.getContext("2d", { alpha: true });
        this.syncBoardToneCanvasSize();
      } else {
        this.boardToneCanvas = null;
        this.boardToneCanvasCtx = null;
      }
    }
    this.syncFxCanvasSize();
    if (typeof ResizeObserver !== "undefined") {
      this.fxResizeObserver = new ResizeObserver(() => {
        this.syncBoardToneCanvasSize();
        this.syncFxCanvasSize();
      });
      this.fxResizeObserver.observe(this.elements.board);
    }
    window.addEventListener("resize", () => {
      this.syncBoardToneCanvasSize();
      this.syncFxCanvasSize();
    });
  }

  syncBoardToneCanvasSize() {
    if (!this.boardToneCanvasEnabled) {
      return;
    }
    const canvas = this.elements.boardFillCanvas;
    if (!canvas) {
      return;
    }
    const rect = this.elements.board.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));
    const rawDpr = window.devicePixelRatio || 1;
    const dpr = Math.max(1, Math.min(rawDpr, 2));
    const nextWidth = Math.round(width * dpr);
    const nextHeight = Math.round(height * dpr);
    if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
      canvas.width = nextWidth;
      canvas.height = nextHeight;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    }
    const boardRect = this.elements.board.getBoundingClientRect();
    const firstCell = this.cells.get(this.cellKey(0, 0));
    const secondColCell = this.cells.get(this.cellKey(0, 1));
    const secondRowCell = this.cells.get(this.cellKey(1, 0));
    const firstRect = firstCell?.getBoundingClientRect?.();
    const secondColRect = secondColCell?.getBoundingClientRect?.();
    const secondRowRect = secondRowCell?.getBoundingClientRect?.();
    const fallbackGapRaw = Number.parseFloat(window.getComputedStyle(this.elements.board).columnGap ?? "4");
    const fallbackGap = Number.isFinite(fallbackGapRaw) ? fallbackGapRaw : 4;
    const fallbackCellSize = (width - (fallbackGap * (this.boardSize - 1))) / this.boardSize;
    const cellWidth = Number.isFinite(firstRect?.width) && firstRect.width > 0 ? firstRect.width : fallbackCellSize;
    const cellHeight = Number.isFinite(firstRect?.height) && firstRect.height > 0 ? firstRect.height : fallbackCellSize;
    const stepX = Number.isFinite(secondColRect?.left) && Number.isFinite(firstRect?.left)
      ? (secondColRect.left - firstRect.left)
      : (cellWidth + fallbackGap);
    const stepY = Number.isFinite(secondRowRect?.top) && Number.isFinite(firstRect?.top)
      ? (secondRowRect.top - firstRect.top)
      : (cellHeight + fallbackGap);
    const offsetX = Number.isFinite(firstRect?.left) && Number.isFinite(boardRect?.left)
      ? (firstRect.left - boardRect.left)
      : 0;
    const offsetY = Number.isFinite(firstRect?.top) && Number.isFinite(boardRect?.top)
      ? (firstRect.top - boardRect.top)
      : 0;
    this.boardToneCanvasMetrics = {
      width,
      height,
      cellWidth,
      cellHeight,
      stepX,
      stepY,
      offsetX,
      offsetY,
    };
    this.boardToneCanvasDpr = dpr;
    const signature = [
      width,
      height,
      dpr,
      cellWidth.toFixed(3),
      cellHeight.toFixed(3),
      stepX.toFixed(3),
      stepY.toFixed(3),
      offsetX.toFixed(3),
      offsetY.toFixed(3),
    ].join("|");
    if (signature !== this.boardToneCanvasSizeSignature) {
      this.boardToneCanvasSizeSignature = signature;
      this.drawBoardToneCanvas(this.lastRenderedBoardSnapshot, this.currentMode === "classic" && this.classicPhotoBoardEnabled === true);
    }
  }

  syncFxCanvasSize() {
    const canvas = this.elements.fxCanvas;
    if (!canvas) {
      return;
    }
    const rect = this.elements.board.getBoundingClientRect();
    const rawDpr = window.devicePixelRatio || 1;
    const dpr = Math.max(1, Math.min(rawDpr, this.fxProfile.dprCap ?? 2));
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));
    if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    }
  }

  shouldUseBoardToneCanvas(useClassicPhotoBoard) {
    return Boolean(
      this.boardToneCanvasEnabled &&
      this.boardToneCanvasCtx &&
      !useClassicPhotoBoard &&
      this.currentMode === "classic",
    );
  }

  drawBoardToneCanvas(board, useClassicPhotoBoard = false) {
    if (!this.boardToneCanvasEnabled) {
      return;
    }
    const canvas = this.elements.boardFillCanvas;
    const ctx = this.boardToneCanvasCtx;
    if (!canvas || !ctx) {
      return;
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!Array.isArray(board) || !board.length || useClassicPhotoBoard) {
      return;
    }
    const atlasKind = this.getBoardToneAtlasKind();
    const atlas = this.boardToneCanvasAtlases[atlasKind];
    if (!(atlas instanceof Map) || atlas.size === 0) {
      this.preloadBoardToneAtlas(atlasKind).then(() => {
        this.drawBoardToneCanvas(this.lastRenderedBoardSnapshot, useClassicPhotoBoard);
      });
      return;
    }
    const metrics = this.boardToneCanvasMetrics;
    const cellWidth = Number.isFinite(metrics?.cellWidth) && metrics.cellWidth > 0 ? metrics.cellWidth : 0;
    const cellHeight = Number.isFinite(metrics?.cellHeight) && metrics.cellHeight > 0 ? metrics.cellHeight : 0;
    const stepX = Number.isFinite(metrics?.stepX) ? metrics.stepX : 0;
    const stepY = Number.isFinite(metrics?.stepY) ? metrics.stepY : 0;
    const offsetX = Number.isFinite(metrics?.offsetX) ? metrics.offsetX : 0;
    const offsetY = Number.isFinite(metrics?.offsetY) ? metrics.offsetY : 0;
    if (cellWidth <= 0 || cellHeight <= 0) {
      return;
    }
    const dpr = this.boardToneCanvasDpr || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    for (let row = 0; row < this.boardSize; row += 1) {
      for (let col = 0; col < this.boardSize; col += 1) {
        const value = Number(board?.[row]?.[col] ?? 0);
        if (!value || ADVENTURE_OBJECTIVE_TYPE_BY_TONE[value]) {
          continue;
        }
        const cell = this.cells.get(this.cellKey(row, col));
        if (cell?.classList.contains("cell--clear-hidden")) {
          continue;
        }
        const sprite = atlas.get(value);
        if (!sprite) {
          continue;
        }
        const x = offsetX + (col * stepX);
        const y = offsetY + (row * stepY);
        ctx.drawImage(sprite, x, y, cellWidth, cellHeight);
      }
    }
  }

  getFxRuntimeScale() {
    const minScale = Number(this.fxProfile.minRuntimeScale ?? 0.56);
    let scale = Math.max(minScale, Math.min(1, Number(this.fxAdaptive?.scale ?? 1)));
    if (this.fxProfile?.isIOS && this.iosStartupPhaseUntilMs > 0) {
      const now = performance.now();
      if (now < this.iosStartupPhaseUntilMs) {
        const warmCap = Number(this.fxProfile.startupScaleCeiling ?? 0.8);
        scale = Math.min(scale, warmCap);
      }
    }
    return scale;
  }

  getThermalScaleCeiling() {
    if (this.fxProfile?.isIOS) {
      if (this.thermalTier >= 3) {
        return Number(this.fxProfile.thermalTier3ScaleCeiling ?? 0.66);
      }
      if (this.thermalTier >= 2) {
        return Number(this.fxProfile.thermalTier2ScaleCeiling ?? 0.66);
      }
      if (this.thermalTier >= 1) {
        return Number(this.fxProfile.thermalTier1ScaleCeiling ?? 0.78);
      }
      return 0.96;
    }
    if (this.thermalTier >= 2) {
      return 0.74;
    }
    if (this.thermalTier >= 1) {
      return 0.86;
    }
    return 1;
  }

  updateThermalBudget(snapshot) {
    if (!this.fxProfile.lowPower) {
      if (this.thermalTier !== 0) {
        this.applyThermalTier(0);
      }
      return;
    }
    const status = snapshot?.status ?? "menu";
    const activePlay = status === "playing";
    if (!activePlay) {
      this.playSessionStartedAtMs = 0;
      this.iosStartupPhaseUntilMs = 0;
      if (this.thermalTier !== 0) {
        this.applyThermalTier(0);
      }
      return;
    }
    const now = performance.now();
    if (this.playSessionStartedAtMs <= 0) {
      this.playSessionStartedAtMs = now;
      if (this.fxProfile?.isIOS) {
        const warmMs = Math.max(5 * 1000, Number(this.fxProfile.startupWarmMs ?? (12 * 1000)));
        this.iosStartupPhaseUntilMs = now + warmMs;
      }
    }
    const elapsedMs = Math.max(0, now - this.playSessionStartedAtMs);
    const tier1Ms = Math.max(90 * 1000, Number(this.fxProfile.thermalTier1Ms ?? (4 * 60 * 1000)));
    const tier2Ms = Math.max(tier1Ms + (60 * 1000), Number(this.fxProfile.thermalTier2Ms ?? (8 * 60 * 1000)));
    const tier3Ms = Math.max(tier2Ms + (60 * 1000), Number(this.fxProfile.thermalTier3Ms ?? (12 * 60 * 1000)));
    let nextTier = 0;
    if (elapsedMs >= tier3Ms) {
      nextTier = 3;
    } else if (elapsedMs >= tier2Ms) {
      nextTier = 2;
    } else if (elapsedMs >= tier1Ms) {
      nextTier = 1;
    }
    if (nextTier !== this.thermalTier) {
      this.applyThermalTier(nextTier);
    }
  }

  applyThermalTier(tier = 0) {
    const nextTier = Math.max(0, Math.min(3, Number(tier) || 0));
    this.thermalTier = nextTier;
    let capScale = nextTier >= 2 ? 0.62 : (nextTier >= 1 ? 0.8 : 1);
    if (this.fxProfile?.isIOS) {
      capScale = nextTier >= 3
        ? Number(this.fxProfile.thermalTier3DomFxScale ?? capScale)
        : (nextTier >= 2
          ? Number(this.fxProfile.thermalTier2DomFxScale ?? capScale)
          : (nextTier >= 1
            ? Number(this.fxProfile.thermalTier1DomFxScale ?? capScale)
            : 1));
    }
    this.domFxTotalCap = Math.max(40, Math.round(this.baseDomFxTotalCap * capScale));
    this.domFxTypeCaps = Object.fromEntries(
      Object.entries(this.baseDomFxTypeCaps).map(([key, value]) => [key, Math.max(1, Math.round(value * capScale))]),
    );

    const scaleCeiling = this.getThermalScaleCeiling();
    if (this.fxAdaptive.scale > scaleCeiling) {
      this.fxAdaptive.scale = scaleCeiling;
    }
    this.applyPerformanceClass();
  }

  updateFxAdaptive(frameMs) {
    if (!Number.isFinite(frameMs) || frameMs <= 0) {
      return;
    }
    const adaptive = this.fxAdaptive;
    const prevScale = adaptive.scale;
    const scaleCeiling = this.getThermalScaleCeiling();
    if (adaptive.scale > scaleCeiling) {
      adaptive.scale = scaleCeiling;
    }
    adaptive.avgMs = (adaptive.avgMs * 0.9) + (frameMs * 0.1);
    if (adaptive.cooldownFrames > 0) {
      adaptive.cooldownFrames -= 1;
      return;
    }
    // Soft auto-tuning: when frames are heavy, reduce FX budget; recover slowly when stable.
    const minScale = Number(this.fxProfile.minRuntimeScale ?? 0.56);
    const hardMs = Number(this.fxProfile.adaptiveHardMs ?? 28);
    const midMs = Number(this.fxProfile.adaptiveMidMs ?? 22);
    const softMs = Number(this.fxProfile.adaptiveSoftMs ?? 18.8);
    const recoverMs = Number(this.fxProfile.adaptiveRecoverMs ?? 16);

    if (adaptive.avgMs > hardMs && adaptive.scale > minScale) {
      adaptive.scale = Math.max(minScale, adaptive.scale - 0.14);
      adaptive.cooldownFrames = 12;
      return;
    }
    if (adaptive.avgMs > midMs && adaptive.scale > minScale) {
      adaptive.scale = Math.max(minScale, adaptive.scale - 0.1);
      adaptive.cooldownFrames = 10;
      return;
    }
    if (adaptive.avgMs > softMs && adaptive.scale > minScale + 0.04) {
      adaptive.scale = Math.max(minScale, adaptive.scale - 0.05);
      adaptive.cooldownFrames = 8;
      return;
    }
    if (adaptive.avgMs < recoverMs && adaptive.scale < scaleCeiling) {
      adaptive.scale = Math.min(scaleCeiling, adaptive.scale + 0.03);
      adaptive.cooldownFrames = 14;
    }
    if (Math.abs(adaptive.scale - prevScale) >= 0.01) {
      this.applyPerformanceClass();
    }
  }

  applyPerformanceClass() {
    const root = document.documentElement;
    if (!root) {
      return;
    }
    root.classList.toggle("perf-lite", Boolean(this.fxProfile.forceLiteTextures));
    root.classList.toggle(
      "perf-throttle",
      Boolean(this.fxProfile.lowPower || this.getFxRuntimeScale() < 0.72),
    );
    root.classList.toggle("perf-thermal-1", this.thermalTier >= 1);
    root.classList.toggle("perf-thermal-2", this.thermalTier >= 2);
    root.classList.toggle("perf-ios-device", Boolean(this.fxProfile.isIOS));
    root.classList.toggle(
      "perf-ios-thermal",
      Boolean(this.fxProfile.isIOS && this.currentStatus === "playing"),
    );
  }

  restartClassAnimation(element, classNames = []) {
    if (!(element instanceof HTMLElement) || !Array.isArray(classNames) || !classNames.length) {
      return;
    }
    const pendingRaf = this.classRestartRafMap.get(element);
    if (pendingRaf) {
      cancelAnimationFrame(pendingRaf);
    }
    element.classList.remove(...classNames);
    const rafId = requestAnimationFrame(() => {
      element.classList.add(...classNames);
      this.classRestartRafMap.delete(element);
    });
    this.classRestartRafMap.set(element, rafId);
  }

  hasActiveFxQueues() {
    return Boolean(
      this.fxCracks.length ||
      this.fxShards.length ||
      this.fxParticles.length ||
      this.fxFlashes.length ||
      this.fxRings.length ||
      this.fxBursts.length ||
      this.fxAfterbursts.length ||
      this.fxCellLights.length ||
      this.fxLineSweeps.length ||
      this.fxLineScorePopups.length ||
      this.fxMoveApprovals.length ||
      this.fxAdventureBeams.length ||
      this.fxCanvasTextBursts.length,
    );
  }

  setFxSuspended(suspended) {
    this.fxSuspended = Boolean(suspended);
    if (!this.fxSuspended) {
      return;
    }
    if (this.fxRafId) {
      cancelAnimationFrame(this.fxRafId);
      this.fxRafId = 0;
    }
    if (this.adventureGlideRafId) {
      cancelAnimationFrame(this.adventureGlideRafId);
      this.adventureGlideRafId = 0;
    }
    this.adventureGlideTasks.forEach((task) => {
      task.fly?.remove();
      task.onDone?.();
    });
    this.adventureGlideTasks.clear();
    this.fxCanvasTextBursts.length = 0;
    this.fxLineSweeps.length = 0;
    this.fxLineScorePopups.length = 0;
    this.fxMoveApprovals.length = 0;
    this.fxAdventureBeams.length = 0;
    this.domFxTypeCounts.clear();
    this.domFxTotalActive = 0;
  }

  beginDragSession(slotIndex = null) {
    this.dragSessionActive = true;
    this.dragSessionSlot = Number.isInteger(slotIndex) ? slotIndex : null;
    this.cachedBoardRect = this.elements.board?.getBoundingClientRect?.() ?? null;
  }

  endDragSession() {
    this.dragSessionActive = false;
    this.dragSessionSlot = null;
    this.cachedBoardRect = null;
    this.clearHammerTargetPreview();
  }

  canSpawnDomFx(type) {
    if (this.fxSuspended) {
      return false;
    }
    if (this.domFxTotalActive >= this.domFxTotalCap) {
      return false;
    }
    const typeCap = Number(this.domFxTypeCaps?.[type] ?? 9999);
    const typeCount = Number(this.domFxTypeCounts.get(type) ?? 0);
    return typeCount < typeCap;
  }

  registerDomFx(type) {
    this.domFxTotalActive += 1;
    this.domFxTypeCounts.set(type, Number(this.domFxTypeCounts.get(type) ?? 0) + 1);
  }

  releaseDomFx(type) {
    this.domFxTotalActive = Math.max(0, this.domFxTotalActive - 1);
    const next = Math.max(0, Number(this.domFxTypeCounts.get(type) ?? 0) - 1);
    if (next <= 0) {
      this.domFxTypeCounts.delete(type);
      return;
    }
    this.domFxTypeCounts.set(type, next);
  }

  selectClearFxCells(clearedCells, cap) {
    const cells = Array.isArray(clearedCells) ? clearedCells : [];
    const limit = Math.max(1, Math.floor(cap || cells.length));
    if (cells.length <= limit) {
      return cells;
    }
    const dominant = cells.filter((cell) => cell.lineDominant);
    const others = cells.filter((cell) => !cell.lineDominant);
    const selected = dominant.slice(0, limit);
    if (selected.length >= limit) {
      return selected;
    }
    const remain = limit - selected.length;
    const stride = Math.max(1, Math.ceil(others.length / remain));
    for (let i = 0; i < others.length && selected.length < limit; i += stride) {
      selected.push(others[i]);
    }
    return selected;
  }

  renderBoard(board) {
    const useClassicPhotoBoard =
      this.currentMode === "classic" &&
      this.classicPhotoBoardEnabled === true &&
      Array.isArray(this.classicPhotoTiles) &&
      this.classicPhotoTiles.length >= this.boardSize * this.boardSize;
    const preferToneCanvas = this.shouldUseBoardToneCanvas(useClassicPhotoBoard);
    const atlasKind = this.getBoardToneAtlasKind();
    if (preferToneCanvas && !this.boardToneCanvasAtlasReady[atlasKind]) {
      this.preloadBoardToneAtlas(atlasKind);
    }
    const useToneCanvas = preferToneCanvas && this.boardToneCanvasAtlasReady[atlasKind];
    if (Array.isArray(board) && board.length === this.boardSize) {
      for (let row = 0; row < this.boardSize; row += 1) {
        this.lastRenderedBoardSnapshot[row] = Array.isArray(board[row])
          ? board[row].slice(0, this.boardSize)
          : Array(this.boardSize).fill(0);
      }
    }
    if (this.boardToneCanvasEnabled) {
      this.syncBoardToneCanvasSize();
    }
    for (let row = 0; row < this.boardSize; row += 1) {
      for (let col = 0; col < this.boardSize; col += 1) {
        const cell = this.cells.get(this.cellKey(row, col));
        cell.classList.remove("cell--clear-hidden");
        const value = board[row][col];
        const objectiveType = ADVENTURE_OBJECTIVE_TYPE_BY_TONE[value];
        const isFilled = value !== 0;
        const isObjective = Boolean(objectiveType);
        const tileIndex = (row * this.boardSize) + col;
        let renderKey = "empty";
        if (isObjective) {
          renderKey = `obj:${objectiveType}`;
        } else if (isFilled && useClassicPhotoBoard) {
          const tileUrl = this.classicPhotoTiles[tileIndex];
          if (typeof tileUrl === "string" && tileUrl.length > 0) {
            renderKey = `photo:${this.classicPhotoTilesVersion}:${tileIndex}`;
          } else {
            renderKey = `tone:${value}`;
          }
        } else if (isFilled) {
          renderKey = useToneCanvas ? `tone-c:${value}` : `tone:${value}`;
        }

        if (this.boardRenderCache[tileIndex] === renderKey) {
          continue;
        }
        this.boardRenderCache[tileIndex] = renderKey;

        cell.classList.remove("cell--objective", "cell--photo-filled");
        cell.style.removeProperty("background-image");
        cell.classList.toggle("cell--filled", false);
        delete cell.dataset.tone;

        if (isObjective) {
          cell.classList.add("cell--objective");
          cell.classList.add("cell--filled");
          cell.style.backgroundImage = `url("${ADVENTURE_VISUALS[objectiveType].icon}")`;
          continue;
        }

        if (isFilled && useClassicPhotoBoard) {
          const tileUrl = this.classicPhotoTiles[tileIndex];
          if (typeof tileUrl === "string" && tileUrl.length > 0) {
            cell.classList.add("cell--photo-filled");
            cell.classList.add("cell--filled");
            cell.style.backgroundImage = `url("${tileUrl}")`;
            continue;
          }
        }

        if (isFilled && !useToneCanvas) {
          cell.classList.add("cell--filled");
          cell.dataset.tone = String(value);
        }
      }
    }

    this.drawBoardToneCanvas(board, useClassicPhotoBoard || !useToneCanvas);
  }

  renderPieces(pieces) {
    this.elements.pieceTray.innerHTML = "";
    const trayCellSize = this.resolveTrayCellSize();
    pieces.forEach((piece, slotIndex) => {
      const card = document.createElement("div");
      card.className = "piece-card";
      card.dataset.slot = String(slotIndex);
      const hiddenByDrag =
        this.dragSessionActive &&
        this.dragSessionSlot !== null &&
        slotIndex === this.dragSessionSlot;

      if (!piece || hiddenByDrag) {
        card.classList.add("piece-card--empty");
        this.elements.pieceTray.appendChild(card);
        return;
      }

      card.dataset.pieceInstance = String(piece.instanceId);
      const grid = this.createPieceGrid(piece, trayCellSize);
      card.appendChild(grid);
      this.elements.pieceTray.appendChild(card);
    });
  }

  resolveTrayCellSize() {
    const viewportWidth = Math.max(
      1,
      window.innerWidth ||
      document.documentElement?.clientWidth ||
      390,
    );
    const isTouchLike =
      window.matchMedia?.("(pointer: coarse)")?.matches ||
      navigator.maxTouchPoints > 0;

    const isClassic = this.currentMode === "classic";
    if (isTouchLike) {
      if (viewportWidth <= 360) return isClassic ? 21 : 23;
      if (viewportWidth <= 420) return isClassic ? 23 : 25;
      return isClassic ? 25 : 27;
    }

    if (viewportWidth <= 420) return isClassic ? 25 : 27;
    return isClassic ? 27 : 29;
  }

  createPieceGrid(piece, cellSize) {
    const grid = document.createElement("div");
    grid.className = "piece-grid";
    grid.style.gridTemplateColumns = `repeat(${piece.width}, auto)`;
    grid.style.gridTemplateRows = `repeat(${piece.height}, auto)`;
    grid.style.setProperty("--piece-cell-size", `${cellSize}px`);

    const occupied = new Set(piece.cells.map((cell) => this.cellKey(cell.y, cell.x)));
    for (let row = 0; row < piece.height; row += 1) {
      for (let col = 0; col < piece.width; col += 1) {
        const dot = document.createElement("div");
        dot.className = "piece-cell";
        if (occupied.has(this.cellKey(row, col))) {
          dot.dataset.tone = String(piece.tone);
        } else {
          dot.classList.add("piece-cell--blank");
        }
        grid.appendChild(dot);
      }
    }
    return grid;
  }

  createFloatingPiece(piece, cellSize = 36) {
    const root = document.createElement("div");
    root.className = "drag-piece";
    root.appendChild(this.createPieceGrid(piece, cellSize));
    return root;
  }

  positionFloatingPiece(dragEl, x, y) {
    dragEl.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  }

  resolvePieceAnchor(pieceGridEl, piece, clientX, clientY) {
    const rect = pieceGridEl.getBoundingClientRect();
    const localX = clientX - rect.left;
    const localY = clientY - rect.top;
    const stepX = rect.width / piece.width;
    const stepY = rect.height / piece.height;
    const rawCol = Math.max(0, Math.min(piece.width - 1, Math.floor(localX / stepX)));
    const rawRow = Math.max(0, Math.min(piece.height - 1, Math.floor(localY / stepY)));

    const exactHit = piece.cells.find((cell) => cell.x === rawCol && cell.y === rawRow);
    if (exactHit) {
      return { row: exactHit.y, col: exactHit.x };
    }

    let nearest = piece.cells[0];
    let nearestDistance = Number.POSITIVE_INFINITY;
    piece.cells.forEach((cell) => {
      const dx = cell.x - rawCol;
      const dy = cell.y - rawRow;
      const distance = (dx * dx) + (dy * dy);
      if (distance < nearestDistance) {
        nearest = cell;
        nearestDistance = distance;
      }
    });

    return { row: nearest.y, col: nearest.x };
  }

  resolveBoardAnchor(clientX, clientY, pieceAnchor) {
    const rect = this.cachedBoardRect ?? this.elements.board.getBoundingClientRect();
    const tolerance = this.tuning.INPUT.BOARD_SNAP_TOLERANCE_PX;
    const inside =
      clientX >= rect.left - tolerance &&
      clientX <= rect.right + tolerance &&
      clientY >= rect.top - tolerance &&
      clientY <= rect.bottom + tolerance;

    if (!inside) {
      return null;
    }

    const clampedX = Math.max(rect.left, Math.min(clientX, rect.right - 0.1));
    const clampedY = Math.max(rect.top, Math.min(clientY, rect.bottom - 0.1));
    const cellSize = rect.width / this.boardSize;
    const rawCol = Math.floor((clampedX - rect.left) / cellSize);
    const rawRow = Math.floor((clampedY - rect.top) / cellSize);

    return {
      row: rawRow - pieceAnchor.row,
      col: rawCol - pieceAnchor.col,
    };
  }

  showGhost(cells, isValid) {
    const ghostClass = isValid ? "cell--ghost-valid" : "cell--ghost-invalid";
    const desired = new Map();
    cells.forEach(({ row, col }) => {
      desired.set(this.cellKey(row, col), ghostClass);
    });
    this.applyGhostMap(desired);
  }

  clearGhost() {
    if (!this.ghostedMap.size) {
      return;
    }
    this.ghostedMap.forEach((_, key) => {
      const cell = this.cells.get(key);
      cell?.classList.remove("cell--ghost-valid", "cell--ghost-invalid", "cell--hint");
    });
    this.ghostedMap.clear();
  }

  showHammerTargetPreview({ row, col, isValid = true } = {}) {
    if (!Number.isInteger(row) || !Number.isInteger(col)) {
      this.clearHammerTargetPreview();
      return;
    }
    if (row < 0 || col < 0 || row >= this.boardSize || col >= this.boardSize) {
      this.clearHammerTargetPreview();
      return;
    }

    const key = this.cellKey(row, col);
    const nextClass = isValid ? "cell--hammer-target" : "cell--hammer-target-invalid";
    if (this.hammerTargetKey === key && this.hammerTargetClass === nextClass) {
      return;
    }

    if (this.hammerTargetKey) {
      const prevCell = this.cells.get(this.hammerTargetKey);
      prevCell?.classList.remove("cell--hammer-target", "cell--hammer-target-invalid");
    }

    const cell = this.cells.get(key);
    if (!cell) {
      this.hammerTargetKey = null;
      this.hammerTargetClass = "";
      return;
    }

    cell.classList.remove("cell--hammer-target", "cell--hammer-target-invalid");
    cell.classList.add(nextClass);
    this.hammerTargetKey = key;
    this.hammerTargetClass = nextClass;
  }

  clearHammerTargetPreview() {
    if (!this.hammerTargetKey) {
      return;
    }
    const cell = this.cells.get(this.hammerTargetKey);
    cell?.classList.remove("cell--hammer-target", "cell--hammer-target-invalid");
    this.hammerTargetKey = null;
    this.hammerTargetClass = "";
  }

  showHint(cells) {
    const desired = new Map();
    cells.forEach(({ row, col }) => {
      desired.set(this.cellKey(row, col), "cell--hint");
    });
    this.applyGhostMap(desired);
    setTimeout(() => this.clearGhost(), 850);
  }

  applyGhostMap(desiredMap) {
    this.ghostedMap.forEach((currentClass, key) => {
      const nextClass = desiredMap.get(key);
      if (nextClass === currentClass) {
        return;
      }
      const cell = this.cells.get(key);
      cell?.classList.remove("cell--ghost-valid", "cell--ghost-invalid", "cell--hint");
    });

    desiredMap.forEach((nextClass, key) => {
      const currentClass = this.ghostedMap.get(key);
      if (currentClass === nextClass) {
        return;
      }
      const cell = this.cells.get(key);
      if (!cell) {
        return;
      }
      cell.classList.remove("cell--ghost-valid", "cell--ghost-invalid", "cell--hint");
      cell.classList.add(nextClass);
    });

    this.ghostedMap = desiredMap;
  }

  playClearFeedback(clearedCells) {
    const payload = Array.isArray(clearedCells)
      ? { clearedCells, clearedRows: [], clearedCols: [] }
      : (clearedCells ?? { clearedCells: [] });
    const detailedCells = this.resolveClearedCellDetails(payload);
    if (!detailedCells.length) {
      return;
    }
    const rowLines = this.resolveLineDetails(payload.clearedRows);
    const colLines = this.resolveLineDetails(payload.clearedCols);
    const collectedFromPayload = new Set(
      (payload.collectedObjectiveCells ?? [])
        .filter((cell) => Number.isInteger(cell?.row) && Number.isInteger(cell?.col))
        .map((cell) => this.cellKey(cell.row, cell.col)),
    );
    const collectedObjectiveCellKeys = this.consumeAdventureCollectedKeys(detailedCells);
    collectedFromPayload.forEach((key) => collectedObjectiveCellKeys.add(key));
    const fxDetailedCells = detailedCells.filter(
      (cell) => !collectedObjectiveCellKeys.has(this.cellKey(cell.row, cell.col)),
    );
    const rowToneByIndex = new Map(
      rowLines.map((line) => [Number(line.index), Number(line.tone) || 1]),
    );
    const colToneByIndex = new Map(
      colLines.map((line) => [Number(line.index), Number(line.tone) || 1]),
    );
    const dominantDetailedCells = fxDetailedCells.map((cell) => {
      const dominantTone = colToneByIndex.get(cell.col)
        ?? rowToneByIndex.get(cell.row)
        ?? Number(cell.tone)
        ?? 1;
      return {
        ...cell,
        tone: dominantTone,
        lineDominant: dominantTone !== Number(cell.tone),
      };
    });

    this.elements.boardWrap.classList.add("board-wrap--shake");
    setTimeout(() => {
      this.elements.boardWrap.classList.remove("board-wrap--shake");
    }, this.tuning.FX.SHAKE_MS);

    this.elements.boardWrap.classList.add("board-wrap--clear-premium");
    if (this.clearPulseTimer) {
      clearTimeout(this.clearPulseTimer);
    }
    this.clearPulseTimer = setTimeout(() => {
      this.elements.boardWrap.classList.remove("board-wrap--clear-premium");
      this.clearPulseTimer = 0;
    }, 320);

    const flashedCells = [];
    dominantDetailedCells.forEach(({ row, col, tone }) => {
      const cell = this.cells.get(this.cellKey(row, col));
      if (!cell) {
        return;
      }
      // Clear starts at frame-0: hide only block sprite, keep board cell visible.
      cell.classList.add("cell--clear-hidden");
      const vfx = this.getToneVfx(tone);
      cell.style.setProperty("--clear-glow", vfx.main);
      cell.style.setProperty("--clear-accent", vfx.accent);
      cell.classList.add("cell--line-dominant");
      cell?.classList.add("cell--flash");
      flashedCells.push(cell);
    });
    if (flashedCells.length) {
      this.drawBoardToneCanvas(this.lastRenderedBoardSnapshot, false);
      setTimeout(() => {
        flashedCells.forEach((cell) => {
          cell.classList.remove("cell--flash", "cell--line-dominant");
          cell.style.removeProperty("--clear-glow");
          cell.style.removeProperty("--clear-accent");
        });
        this.drawBoardToneCanvas(this.lastRenderedBoardSnapshot, false);
      }, this.tuning.FX.CLEAR_FLASH_MS + 60);
    }

    rowLines.forEach(({ index, tone }) => {
      this.paintLineDominant("row", index, tone);
      this.spawnLineSweep("row", index, tone);
    });
    colLines.forEach(({ index, tone }) => {
      this.paintLineDominant("col", index, tone);
      this.spawnLineSweep("col", index, tone);
    });
    // Locked clear style: Clear + Shatter hybrid (accepted panel version).
    this.spawnLineScorePopups(rowLines, colLines, payload.comboChain ?? 1);
    this.spawnCanvasExplosion(dominantDetailedCells, rowLines, colLines);
    this.spawnUnityShatterDebris(dominantDetailedCells);
  }

  playPlacementFeedback(placedCells) {
    const placedEls = [];
    (placedCells ?? []).forEach(({ row, col }) => {
      const cell = this.cells.get(this.cellKey(row, col));
      if (!cell) {
        return;
      }
      cell.classList.add("cell--placed");
      placedEls.push(cell);
    });
    if (placedEls.length) {
      setTimeout(() => {
        placedEls.forEach((cell) => cell.classList.remove("cell--placed"));
      }, this.tuning.FX.PLACE_POP_MS);
    }
    this.elements.boardWrap.classList.add("board-wrap--place");
    setTimeout(() => {
      this.elements.boardWrap.classList.remove("board-wrap--place");
    }, this.tuning.FX.PLACE_POP_MS);
  }

  playTntDropCharge({
    row,
    col,
    iconSrc = "",
    onDetonate = null,
  } = {}) {
    if (!Number.isInteger(row) || !Number.isInteger(col)) {
      onDetonate?.();
      return;
    }
    const boardRect = this.elements.board?.getBoundingClientRect?.();
    const layer = this.elements.floatingLayer;
    const layerRect = layer?.getBoundingClientRect?.();
    if (!boardRect?.width || !layer || !layerRect) {
      onDetonate?.();
      return;
    }

    const cellSize = boardRect.width / this.boardSize;
    const centerX = (boardRect.left + ((col + 0.5) * cellSize)) - layerRect.left;
    const centerY = (boardRect.top + ((row + 0.5) * cellSize)) - layerRect.top;

    const root = document.createElement("div");
    root.className = "tnt-drop-charge";
    root.style.left = `${centerX}px`;
    root.style.top = `${centerY}px`;

    const pulse = document.createElement("span");
    pulse.className = "tnt-drop-charge__pulse";
    root.appendChild(pulse);

    const icon = document.createElement("img");
    icon.className = "tnt-drop-charge__icon";
    icon.alt = "";
    icon.setAttribute("aria-hidden", "true");
    icon.draggable = false;
    if (iconSrc) {
      icon.src = iconSrc;
    }
    root.appendChild(icon);

    layer.appendChild(root);
    requestAnimationFrame(() => root.classList.add("is-armed"));

    const detonate = () => {
      if (!root.isConnected) {
        onDetonate?.();
        return;
      }
      root.classList.add("is-detonate");
      window.setTimeout(() => {
        root.remove();
        onDetonate?.();
      }, 150);
    };

    window.setTimeout(detonate, 170);
  }

  playHammerDropStrike({
    row,
    col,
    iconSrc = "",
    onImpact = null,
  } = {}) {
    if (!Number.isInteger(row) || !Number.isInteger(col)) {
      onImpact?.();
      return;
    }

    const boardRect = this.elements.board?.getBoundingClientRect?.();
    const layer = this.elements.floatingLayer;
    const layerRect = layer?.getBoundingClientRect?.();
    if (!boardRect?.width || !layer || !layerRect) {
      onImpact?.();
      return;
    }

    const cellSize = boardRect.width / this.boardSize;
    const centerX = (boardRect.left + ((col + 0.5) * cellSize)) - layerRect.left;
    const centerY = (boardRect.top + ((row + 0.5) * cellSize)) - layerRect.top;

    const root = document.createElement("div");
    root.className = "hammer-drop";
    root.style.left = `${centerX}px`;
    root.style.top = `${centerY}px`;

    const icon = document.createElement("img");
    icon.className = "hammer-drop__icon";
    icon.alt = "";
    icon.setAttribute("aria-hidden", "true");
    icon.draggable = false;
    if (iconSrc) {
      icon.src = iconSrc;
    }
    root.appendChild(icon);

    const spark = document.createElement("span");
    spark.className = "hammer-drop__spark";
    root.appendChild(spark);

    layer.appendChild(root);
    requestAnimationFrame(() => {
      root.classList.add("is-ready");
      window.setTimeout(() => root.classList.add("is-backswing"), 72);
      window.setTimeout(() => root.classList.add("is-swing"), 190);
      window.setTimeout(() => {
        root.classList.add("is-impact");
        onImpact?.();
      }, 270);
      window.setTimeout(() => {
        root.remove();
      }, 560);
    });
  }

  playTntExplosionFeedback(payload = {}) {
    const detailedCells = this.resolveClearedCellDetails({
      clearedCellsDetailed: payload.affectedCellsDetailed ?? payload.affectedCells ?? [],
    });
    if (!detailedCells.length) {
      return;
    }

    this.restartClassAnimation(this.elements.boardWrap, ["board-wrap--tnt-impact", "board-wrap--tnt-burst"]);
    window.setTimeout(() => {
      this.elements.boardWrap.classList.remove("board-wrap--tnt-impact", "board-wrap--tnt-burst");
    }, 640);

    detailedCells.forEach(({ row, col, tone }) => {
      const cell = this.cells.get(this.cellKey(row, col));
      if (!cell) {
        return;
      }
      const vfx = this.getToneVfx(tone);
      cell.classList.add("cell--clear-hidden", "cell--tnt-hit");
      cell.style.setProperty("--clear-glow", vfx.main);
      cell.style.setProperty("--clear-accent", vfx.accent);
      window.setTimeout(() => {
        cell.classList.remove("cell--tnt-hit");
        cell.style.removeProperty("--clear-glow");
        cell.style.removeProperty("--clear-accent");
        this.drawBoardToneCanvas(this.lastRenderedBoardSnapshot, false);
      }, 520);
    });
    this.drawBoardToneCanvas(this.lastRenderedBoardSnapshot, false);

    this.spawnCanvasExplosion(detailedCells, [], []);
    this.spawnUnityShatterDebris(detailedCells);
  }

  playHammerStrikeFeedback(payload = {}) {
    const detailedCells = this.resolveClearedCellDetails({
      clearedCellsDetailed: payload.affectedCellsDetailed ?? payload.affectedCells ?? [],
    });
    if (!detailedCells.length) {
      return;
    }

    this.restartClassAnimation(this.elements.boardWrap, ["board-wrap--hammer-hit"]);
    window.setTimeout(() => {
      this.elements.boardWrap.classList.remove("board-wrap--hammer-hit");
    }, 430);

    detailedCells.forEach(({ row, col, tone }) => {
      const cell = this.cells.get(this.cellKey(row, col));
      if (!cell) {
        return;
      }
      const vfx = this.getToneVfx(tone);
      cell.classList.add("cell--clear-hidden", "cell--hammer-hit");
      cell.style.setProperty("--clear-glow", vfx.main);
      cell.style.setProperty("--clear-accent", vfx.accent);
      window.setTimeout(() => {
        cell.classList.remove("cell--hammer-hit");
        cell.style.removeProperty("--clear-glow");
        cell.style.removeProperty("--clear-accent");
        this.drawBoardToneCanvas(this.lastRenderedBoardSnapshot, false);
      }, 430);
    });
    this.drawBoardToneCanvas(this.lastRenderedBoardSnapshot, false);

    this.spawnCanvasExplosion(detailedCells, [], []);
    this.spawnUnityShatterDebris(detailedCells);
  }

  playComboFeedback(comboChain) {
    if (!comboChain || comboChain < 2) {
      return;
    }
    const tier = Math.min(3, Math.max(1, comboChain - 1));
    const tierCfg = COMBO_ACCENT_TIER[tier];
    this.elements.boardWrap.style.setProperty("--combo-shell-glow-a", tierCfg.shellGlowA);
    this.elements.boardWrap.style.setProperty("--combo-shell-glow-b", tierCfg.shellGlowB);
    this.elements.boardWrap.style.setProperty("--combo-shell-ms", `${tierCfg.shellMs}ms`);
    this.elements.boardWrap.style.setProperty("--combo-strength", String(Math.min(comboChain, 6)));
    this.restartClassAnimation(this.elements.boardWrap, ["board-wrap--combo"]);
    setTimeout(() => {
      this.elements.boardWrap.classList.remove("board-wrap--combo");
    }, tierCfg.shellMs);
  }

  playComboAccent(payload) {
    const comboChain = Math.max(2, payload?.comboChain ?? 2);
    const lineCount = Math.max(1, payload?.lineCount ?? 1);
    const rowLines = this.resolveLineDetails(payload?.clearedRows);
    const colLines = this.resolveLineDetails(payload?.clearedCols);
    const tier = Math.min(3, comboChain - 1);
    const tierCfg = COMBO_ACCENT_TIER[tier];

    const rect = this.elements.board.getBoundingClientRect();
    const cellSize = rect.width / this.boardSize;
    const centerX = rect.width * 0.5;
    const centerY = rect.height * 0.5;
    const accentLife = scaleLife(16 + (tier * 5));
    const accentMs = tierCfg.accentMs;

    this.elements.boardWrap.style.setProperty("--combo-accent-glow-a", tierCfg.shellGlowA);
    this.elements.boardWrap.style.setProperty("--combo-accent-glow-b", tierCfg.shellGlowB);
    this.elements.boardWrap.style.setProperty("--combo-accent-ms", `${accentMs}ms`);
    this.restartClassAnimation(this.elements.boardWrap, ["board-wrap--combo-accent"]);
    setTimeout(() => {
      this.elements.boardWrap.classList.remove("board-wrap--combo-accent");
    }, accentMs);

    this.fxRings.push({
      x: centerX,
      y: centerY,
      innerRadius: 10,
      outerRadius: Math.max(44, 54 + (lineCount * 8)),
      radius: 10,
      color: COMBO_GOLD.main,
      alpha: tierCfg.ringAlpha,
      life: accentLife,
      maxLife: accentLife,
      thickness: 2.4,
      delayFrames: 0,
    });

    if (tier >= 2) {
      this.fxRings.push({
        x: centerX,
        y: centerY,
        innerRadius: 7,
        outerRadius: Math.max(32, 40 + (lineCount * 7)),
        radius: 7,
        color: COMBO_GOLD.core,
        alpha: 0.32 + (tier * 0.05),
        life: accentLife,
        maxLife: accentLife,
        thickness: 1.8,
        delayFrames: 1,
      });
    }

    rowLines.forEach(({ index }) => {
      this.fxFlashes.push({
        x: centerX,
        y: (index + 0.5) * cellSize,
        radius: Math.max(24, cellSize * 1.25),
        alpha: tierCfg.lineFlashAlpha,
        colorCore: COMBO_GOLD.core,
        colorOuter: COMBO_GOLD.main,
        maxLife: scaleLife(8),
        life: scaleLife(8),
        delayFrames: 0,
      });
    });
    colLines.forEach(({ index }) => {
      this.fxFlashes.push({
        x: (index + 0.5) * cellSize,
        y: centerY,
        radius: Math.max(24, cellSize * 1.25),
        alpha: tierCfg.lineFlashAlpha,
        colorCore: COMBO_GOLD.core,
        colorOuter: COMBO_GOLD.main,
        maxLife: scaleLife(8),
        life: scaleLife(8),
        delayFrames: 0,
      });
    });

    const particleScale = this.fxProfile.comboParticleScale ?? 1;
    const accentParticleCount = Math.max(5, Math.round((tierCfg.particleBase + lineCount) * particleScale));
    for (let i = 0; i < accentParticleCount; i += 1) {
      const angle = (Math.PI * 2 * i) / accentParticleCount;
      const speed = 2.2 + (Math.random() * 1.8) + (tier * 0.35);
      const life = scaleLife(15 + (Math.round(Math.random() * 4)));
      this.pushFxParticle({
        x: centerX,
        y: centerY,
        prevX: centerX,
        prevY: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 1.6 + (Math.random() * 1.2),
        type: "dot",
        streakLength: 0,
        color: Math.random() > 0.5 ? COMBO_GOLD.main : COMBO_GOLD.sparkle,
        alpha: 0.84,
        baseAlpha: 0.84,
        gravityScale: 0.52,
        drag: 0.982,
        rotation: 0,
        rotationSpeedDeg: 0,
        fadePower: 1.14,
        turbulenceAmp: 0.01,
        turbulenceFreq: 0.06,
        turbulencePhase: 0,
        turbulenceDir: angle,
        life,
        maxLife: life,
        trail: [],
        delayFrames: 0,
      });
    }

    // Tier 3 gets a second quick sparkle burst to clearly separate big combos.
    if (tier >= 3) {
      const burstCount = Math.max(6, Math.round((8 + lineCount) * particleScale));
      for (let i = 0; i < burstCount; i += 1) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 3.8 + (Math.random() * 2.2);
        const life = scaleLife(11 + Math.round(Math.random() * 3));
        this.pushFxParticle({
          x: centerX,
          y: centerY,
          prevX: centerX,
          prevY: centerY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          radius: 1.4 + (Math.random() * 0.9),
          type: "streak",
          streakLength: 8 + (Math.random() * 4),
          color: Math.random() > 0.45 ? COMBO_GOLD.sparkle : COMBO_GOLD.core,
          alpha: 0.9,
          baseAlpha: 0.9,
          gravityScale: 0.48,
          drag: 0.985,
          rotation: 0,
          rotationSpeedDeg: 0,
          fadePower: 1.18,
          turbulenceAmp: 0.01,
          turbulenceFreq: 0.05,
          turbulencePhase: 0,
          turbulenceDir: angle,
          life,
          maxLife: life,
          trail: [],
          delayFrames: 1,
        });
      }
    }

    this.startFxLoop();
  }

  playComboOverdrive(payload) {
    const comboChain = Math.max(2, payload?.comboChain ?? 2);
    const lineCount = Math.max(1, payload?.lineCount ?? 1);
    const detailedCells = this.resolveClearedCellDetails(payload ?? { clearedCells: [] });
    if (!detailedCells.length) {
      return;
    }
    const rowLines = this.resolveLineDetails(payload?.clearedRows);
    const colLines = this.resolveLineDetails(payload?.clearedCols);

    const comboLevel = Math.max(1, comboChain - 1);
    const comboTier = Math.min(3, comboLevel);
    const tier = COMBO_TIER_CONFIG[comboTier];
    const lineBoost = Math.min(1.22, 1 + (Math.max(0, lineCount - 2) * 0.12));
    const tierScale = tier.scale * lineBoost;
    const durationBoost = COMBO_DURATION_BOOST * (tier.durationMult ?? 1);

    const rect = this.elements.board.getBoundingClientRect();
    const cellSize = rect.width / this.boardSize;
    const intensity = Math.min(8, comboChain + lineCount);
    const sampleStepBoost = this.fxProfile.lowPower ? 2 : (this.fxProfile.glowPasses < 3 ? 1.5 : 1);
    const sampleStep = Math.max(
      1,
      Math.floor((detailedCells.length / Math.max(2, Math.round((3 + intensity) * tierScale))) * sampleStepBoost),
    );
    const boardCenterX = rect.width * 0.5;
    const boardCenterY = rect.height * 0.5;
    const pulseLife = scaleLife(Math.round((20 + (intensity * 2)) * (0.72 + (tierScale * 0.28)) * durationBoost));
    const comboDelay = comboTier >= 3 ? 1 : 0;

    // Combo always includes every cleared row/column in this turn.
    rowLines.forEach(({ index, tone }) => {
      this.paintLineDominant("row", index, tone);
      this.spawnLineSweep("row", index, tone);
    });
    colLines.forEach(({ index, tone }) => {
      this.paintLineDominant("col", index, tone);
      this.spawnLineSweep("col", index, tone);
    });
    this.spawnLineScorePopups(rowLines, colLines, comboChain);
    rowLines.forEach(({ index }) => {
      this.fxFlashes.push({
        x: boardCenterX,
        y: (index + 0.5) * cellSize,
        radius: Math.max(cellSize * 1.9, 42),
        alpha: tier.flashAlpha * 0.52,
        colorCore: COMBO_GOLD.core,
        colorOuter: COMBO_GOLD.main,
        maxLife: scaleLife(10),
        life: scaleLife(10),
        delayFrames: 0,
      });
    });
    colLines.forEach(({ index }) => {
      this.fxFlashes.push({
        x: (index + 0.5) * cellSize,
        y: boardCenterY,
        radius: Math.max(cellSize * 1.9, 42),
        alpha: tier.flashAlpha * 0.52,
        colorCore: COMBO_GOLD.core,
        colorOuter: COMBO_GOLD.main,
        maxLife: scaleLife(10),
        life: scaleLife(10),
        delayFrames: 0,
      });
    });

    this.elements.boardWrap.style.setProperty("--combo-overdrive-ms", `${tier.boardPulseMs}ms`);
    this.restartClassAnimation(this.elements.boardWrap, ["board-wrap--combo-overdrive"]);
    setTimeout(() => {
      this.elements.boardWrap.classList.remove("board-wrap--combo-overdrive");
    }, tier.boardPulseMs);

    // Global mega pulse so combo clearly outranks normal clear.
      this.fxFlashes.push({
        x: boardCenterX,
        y: boardCenterY,
        radius: Math.max(rect.width * (0.4 + (0.22 * tierScale)), 64),
        alpha: tier.flashAlpha,
        colorCore: COMBO_GOLD.core,
        colorOuter: COMBO_GOLD.main,
        maxLife: pulseLife,
        life: pulseLife,
        delayFrames: 0,
      });
    this.fxRings.push({
      x: boardCenterX,
      y: boardCenterY,
        innerRadius: 14,
        outerRadius: (rect.width * (0.38 + (0.2 * tierScale))) + (intensity * (3 + (2 * tierScale))),
        radius: 14,
        color: COMBO_GOLD.main,
        alpha: tier.ringAlpha,
        life: pulseLife,
        maxLife: pulseLife,
      thickness: 3.6,
      delayFrames: 0,
    });

    for (let i = 0; i < detailedCells.length; i += sampleStep) {
      const cell = detailedCells[i];
      const centerX = (cell.col + 0.5) * cellSize;
      const centerY = (cell.row + 0.5) * cellSize;
      const vfx = this.getToneVfx(cell.tone);
      const life = scaleLife(Math.round((12 + (intensity * 2)) * (0.68 + (0.34 * tierScale)) * durationBoost));

      this.fxRings.push({
        x: centerX,
        y: centerY,
          innerRadius: 6,
          outerRadius: (28 + (intensity * 4)) * (0.8 + (0.32 * tierScale)),
          radius: 6,
          color: COMBO_GOLD.main,
        alpha: tier.ringAlpha,
        life,
        maxLife: life,
        thickness: 2.2,
        delayFrames: comboDelay,
      });

        this.fxBursts.push({
          x: centerX,
          y: centerY,
          radius: 8 + (2 * tierScale),
          maxRadius: (28 + (intensity * 5)) * (0.86 + (0.24 * tierScale)),
          alpha: tier.burstAlpha,
          alphaDecay: comboTier === 1 ? 0.97 : (comboTier === 2 ? 0.964 : 0.958),
          colorCore: COMBO_GOLD.sparkle,
          colorOuter: COMBO_GOLD.edge,
          life,
          maxLife: life,
          delayFrames: comboDelay,
      });

      this.fxBursts.push({
        x: centerX,
        y: centerY,
          radius: 6 + (1.4 * tierScale),
          maxRadius: (24 + (intensity * 4)) * (0.84 + (0.22 * tierScale)),
          alpha: tier.burstAlpha * 0.74,
          alphaDecay: comboTier === 1 ? 0.968 : (comboTier === 2 ? 0.962 : 0.956),
          colorCore: COMBO_GOLD.core,
          colorOuter: COMBO_GOLD.main,
          life,
          maxLife: life,
          delayFrames: comboDelay + 1,
      });

      const sparkCount = Math.max(
        4,
        Math.round((12 + (intensity * 4)) * tier.sparkScale * (this.fxProfile.comboParticleScale ?? 1)),
      );
      for (let s = 0; s < sparkCount; s += 1) {
        const angle = (Math.PI * 2 * s) / sparkCount + ((Math.random() * 0.32) - 0.16);
        const speed = 3.4 + (Math.random() * ((1.8 + intensity * 0.3) * (0.82 + (0.22 * tierScale))));
        const lifeSpark = scaleLife(Math.round((16 + Math.round(Math.random() * 8)) * (0.8 + (0.25 * tierScale)) * durationBoost));
        const colorRoll = Math.random();
        const color = colorRoll > 0.66 ? COMBO_GOLD.core : (colorRoll > 0.33 ? COMBO_GOLD.main : COMBO_GOLD.edge);

        this.pushFxParticle({
          x: centerX,
          y: centerY,
          prevX: centerX,
          prevY: centerY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          radius: 1.5 + (Math.random() * 1.8),
          type: Math.random() > 0.4 ? "streak" : "dot",
          streakLength: 7 + (Math.random() * 7),
          color,
          alpha: 0.95,
          baseAlpha: 0.95,
          gravityScale: 0.54,
          drag: 0.982,
          rotation: 0,
          rotationSpeedDeg: 0,
          fadePower: tier.fadePower,
          turbulenceAmp: 0.03 + (Math.random() * 0.05),
          turbulenceFreq: 0.08 + (Math.random() * 0.08),
          turbulencePhase: Math.random() * Math.PI * 2,
          turbulenceDir: Math.random() * Math.PI * 2,
          life: lifeSpark,
          maxLife: lifeSpark,
          trail: [],
          delayFrames: comboDelay,
        });
      }

      // Heavy shard chunks to make combo impact feel weighty.
      const chunkCount = Math.max(
        2,
        Math.round((4 + Math.round(intensity * 0.8)) * tier.chunkScale * (this.fxProfile.comboParticleScale ?? 1)),
      );
      for (let c = 0; c < chunkCount; c += 1) {
        const chunkAngle = (Math.PI * 2 * c) / chunkCount + ((Math.random() * 0.4) - 0.2);
        const chunkSpeed = 2.5 + (Math.random() * ((1.6 + intensity * 0.22) * (0.82 + (0.24 * tierScale))));
        const chunkLife = scaleLife(Math.round((20 + Math.round(Math.random() * 10)) * (0.84 + (0.24 * tierScale)) * durationBoost));
        this.pushFxParticle({
          x: centerX,
          y: centerY,
          prevX: centerX,
          prevY: centerY,
          vx: Math.cos(chunkAngle) * chunkSpeed,
          vy: Math.sin(chunkAngle) * chunkSpeed,
          radius: 2.8 + (Math.random() * 2.4),
          type: "chunk",
          streakLength: 0,
          color: Math.random() > 0.5 ? COMBO_GOLD.edge : COMBO_GOLD.main,
          alpha: 0.94,
          baseAlpha: 0.94,
          gravityScale: 1.08,
          drag: 0.966,
          rotation: Math.random() * Math.PI * 2,
          rotationSpeedDeg: (Math.random() * 20) - 10,
          fadePower: tier.fadePower,
          turbulenceAmp: 0.04 + (Math.random() * 0.08),
          turbulenceFreq: 0.07 + (Math.random() * 0.08),
          turbulencePhase: Math.random() * Math.PI * 2,
          turbulenceDir: Math.random() * Math.PI * 2,
          life: chunkLife,
          maxLife: chunkLife,
          trail: [],
          delayFrames: comboDelay,
        });
      }
    }

    this.startFxLoop();
  }

  playGameOverFeedback() {
    this.elements.gameShell?.classList.add("app-shell--gameover");
    if (this.gameOverFxTimer) {
      clearTimeout(this.gameOverFxTimer);
    }
    this.gameOverFxTimer = setTimeout(() => {
      this.elements.gameShell?.classList.remove("app-shell--gameover");
      this.gameOverFxTimer = 0;
    }, this.tuning.FX.GAME_OVER_VIGNETTE_MS);
  }

  pulseScore() {
    if (!this.elements.scoreValue) {
      return;
    }
    if (this.scorePulseTimer) {
      clearTimeout(this.scorePulseTimer);
    }
    if (this.scoreStagePulseTimer) {
      clearTimeout(this.scoreStagePulseTimer);
    }
    this.restartClassAnimation(this.elements.scoreValue, ["score-value--pulse"]);
    this.restartClassAnimation(this.elements.scoreStage, ["score-stage--pulse"]);
    this.scorePulseTimer = setTimeout(() => {
      this.elements.scoreValue?.classList.remove("score-value--pulse");
      this.scorePulseTimer = 0;
    }, this.tuning.FX.SCORE_PULSE_MS);
    this.scoreStagePulseTimer = setTimeout(() => {
      this.elements.scoreStage?.classList.remove("score-stage--pulse");
      this.scoreStagePulseTimer = 0;
    }, Math.max(this.tuning.FX.SCORE_PULSE_MS + 80, 320));
  }

  playInvalidDropFeedback(cardEl) {
    if (!cardEl) {
      return;
    }
    cardEl.classList.add("piece-card--invalid");
    setTimeout(() => cardEl.classList.remove("piece-card--invalid"), this.tuning.FX.INVALID_DROP_SHAKE_MS);
  }

  pushFxParticle(particle) {
    const budget = Math.max(
      Number(this.fxProfile.minParticleBudget ?? 60),
      Math.round((this.fxProfile.maxParticles ?? 320) * this.getFxRuntimeScale()),
    );
    if (this.fxParticles.length >= budget) {
      const overflow = (this.fxParticles.length - budget) + 1;
      this.fxParticles.splice(0, Math.max(1, overflow));
    }
    this.fxParticles.push(particle);
  }

  extractCssUrl(backgroundImageValue) {
    if (!backgroundImageValue || !backgroundImageValue.includes("url(")) {
      return "";
    }
    const matched = backgroundImageValue.match(/url\((['"]?)(.*?)\1\)/i);
    return matched?.[2] ?? "";
  }

  resolveCellSpriteUrl(row, col, tone) {
    const cell = this.cells.get(this.cellKey(row, col));
    if (cell?.classList.contains("cell--objective")) {
      const inlineUrl = this.extractCssUrl(cell.style.backgroundImage);
      if (inlineUrl) {
        return inlineUrl;
      }
    }
    return BLOCK_SPRITES_BY_TONE[Number(tone)] ?? BLOCK_SPRITES_BY_TONE[4];
  }

  getOrCreateShatterImage(src) {
    if (!src) {
      return null;
    }
    if (this.shatterSpriteCache.has(src)) {
      return this.shatterSpriteCache.get(src);
    }
    const img = new Image();
    img.decoding = "async";
    img.src = src;
    this.shatterSpriteCache.set(src, img);
    return img;
  }

  polygonArea(points) {
    let area = 0;
    for (let i = 0; i < points.length; i += 1) {
      const a = points[i];
      const b = points[(i + 1) % points.length];
      area += (a.x * b.y) - (b.x * a.y);
    }
    return area * 0.5;
  }

  polygonCentroid(points) {
    const area = this.polygonArea(points);
    if (Math.abs(area) < 0.0001) {
      const sum = points.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
      return {
        x: sum.x / Math.max(1, points.length),
        y: sum.y / Math.max(1, points.length),
      };
    }
    let cx = 0;
    let cy = 0;
    for (let i = 0; i < points.length; i += 1) {
      const a = points[i];
      const b = points[(i + 1) % points.length];
      const cross = (a.x * b.y) - (b.x * a.y);
      cx += (a.x + b.x) * cross;
      cy += (a.y + b.y) * cross;
    }
    const factor = 1 / (6 * area);
    return { x: cx * factor, y: cy * factor };
  }

  createRadialFracturePolygons(cellSize, shardCount, impactX, impactY) {
    const borderPoints = [];
    const rim = cellSize * 0.06;
    for (let i = 0; i < shardCount; i += 1) {
      const ang = ((Math.PI * 2 * i) / shardCount) + ((Math.random() - 0.5) * 0.24);
      const length = cellSize * (0.56 + (Math.random() * 0.34));
      const px = Math.max(rim, Math.min(cellSize - rim, impactX + (Math.cos(ang) * length)));
      const py = Math.max(rim, Math.min(cellSize - rim, impactY + (Math.sin(ang) * length)));
      borderPoints.push({ x: px, y: py, angle: ang });
    }
    borderPoints.sort((a, b) => a.angle - b.angle);

    const polys = [];
    for (let i = 0; i < borderPoints.length; i += 1) {
      const a = borderPoints[i];
      const b = borderPoints[(i + 1) % borderPoints.length];
      const triangle = [
        { x: impactX, y: impactY },
        { x: a.x, y: a.y },
        { x: b.x, y: b.y },
      ];
      if (Math.abs(this.polygonArea(triangle)) >= (cellSize * cellSize * 0.008)) {
        polys.push(triangle);
      }
    }
    return polys;
  }

  spawnShatterCrackPulse(cellLeft, cellTop, impactX, impactY, cellSize, color) {
    const crackLines = [];
    const rays = this.fxProfile.lowPower ? 4 : 6;
    for (let i = 0; i < rays; i += 1) {
      const a = ((Math.PI * 2 * i) / rays) + ((Math.random() - 0.5) * 0.26);
      const len = cellSize * (0.32 + (Math.random() * 0.34));
      crackLines.push({
        x1: cellLeft + impactX,
        y1: cellTop + impactY,
        x2: cellLeft + impactX + (Math.cos(a) * len),
        y2: cellTop + impactY + (Math.sin(a) * len),
        w: 1 + (Math.random() * 1.1),
      });
    }
    this.fxCracks.push({
      lines: crackLines,
      alpha: UNITY_SHATTER.crackAlpha,
      color,
      life: scaleLife(UNITY_SHATTER.crackLife),
      maxLife: scaleLife(UNITY_SHATTER.crackLife),
      delayFrames: 0,
    });
  }

  spawnUnityShatterDebris(clearedCells) {
    if (!Array.isArray(clearedCells) || !clearedCells.length) {
      return;
    }
    const rect = this.elements.board.getBoundingClientRect();
    const cellSize = rect.width / this.boardSize;
    const runtimeScale = this.getFxRuntimeScale();
    const lowPower = Boolean(this.fxProfile.lowPower);
    const shatterScale = Math.max(0.5, (this.fxProfile.shatterScale ?? 1) * runtimeScale);
    const cellCap = Math.max(4, Math.round((this.fxProfile.clearFxCellCap ?? 64) * runtimeScale));
    const sourceCells = this.selectClearFxCells(clearedCells, cellCap);
    const shardBase = lowPower ? UNITY_SHATTER.shardPerCell.low : UNITY_SHATTER.shardPerCell.high;
    const shardCountPerCell = Math.max(3, Math.round(shardBase * shatterScale));
    const maxShardBase = lowPower ? UNITY_SHATTER.maxShards.low : UNITY_SHATTER.maxShards.high;
    const maxShards = Math.max(40, Math.round(maxShardBase * shatterScale));

    for (let i = 0; i < sourceCells.length; i += 1) {
      const { row, col, tone } = sourceCells[i];
      const cellLeft = col * cellSize;
      const cellTop = row * cellSize;
      const impactX = cellSize * (0.38 + (Math.random() * 0.24));
      const impactY = cellSize * (0.34 + (Math.random() * 0.26));
      const spriteUrl = this.resolveCellSpriteUrl(row, col, tone);
      const spriteImage = this.getOrCreateShatterImage(spriteUrl);
      const baseColor = this.getToneVfx(tone).main;
      const polygons = this.createRadialFracturePolygons(cellSize, shardCountPerCell, impactX, impactY);
      this.spawnShatterCrackPulse(cellLeft, cellTop, impactX, impactY, cellSize, baseColor);

      for (let p = 0; p < polygons.length; p += 1) {
        if (this.fxShards.length >= maxShards) {
          break;
        }
        const poly = polygons[p];
        const centroid = this.polygonCentroid(poly);
        const localPoints = poly.map((pt) => ({ x: pt.x - centroid.x, y: pt.y - centroid.y }));
        const dirX = centroid.x - impactX;
        const dirY = centroid.y - impactY;
        const dist = Math.max(0.001, Math.hypot(dirX, dirY));
        const nx = dirX / dist;
        const ny = dirY / dist;
        const eject = 1.8 + (Math.random() * 3.1);
        const lift = 1.6 + (Math.random() * 2.1);
        const life = scaleLife(UNITY_SHATTER.baseLife + Math.round(Math.random() * UNITY_SHATTER.lifeVariance));
        this.fxShards.push({
          x: cellLeft + centroid.x,
          y: cellTop + centroid.y,
          vx: (nx * eject * 0.9) + ((Math.random() - 0.5) * 0.8),
          vy: (-lift) + (ny * eject * 0.25),
          drag: UNITY_SHATTER.drag,
          gravity: UNITY_SHATTER.gravity,
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: ((Math.random() * 16) - 8) * (Math.PI / 180),
          alpha: 1,
          baseAlpha: 1,
          life,
          maxLife: life,
          points: localPoints,
          textureOffsetX: -centroid.x,
          textureOffsetY: -centroid.y,
          textureSize: cellSize,
          image: spriteImage,
          fallbackColor: baseColor,
          delayFrames: Math.random() > 0.76 ? 1 : 0,
        });
      }
    }
    this.startFxLoop();
  }

  spawnCanvasExplosion(clearedCells, rowLines = [], colLines = []) {
    const rect = this.elements.board.getBoundingClientRect();
    const cellSize = rect.width / this.boardSize;
    const lineEnergy = Math.max(1, rowLines.length + colLines.length);
    const runtimeScale = this.getFxRuntimeScale();
    const particleScale = (this.fxProfile.particleScale ?? 1) * runtimeScale;
    const cellCap = Math.max(4, Math.round((this.fxProfile.clearFxCellCap ?? 64) * runtimeScale));
    const sourceCells = this.selectClearFxCells(clearedCells, cellCap);
    sourceCells.forEach(({ row, col, tone, lineDominant = false }) => {
      const centerX = (col + 0.5) * cellSize;
      const centerY = (row + 0.5) * cellSize;
      const vfx = this.getToneVfx(tone);
      const delayFrames = this.computeExplosionDelayFrames(row, col, rowLines, colLines);
      const coreRadius = Math.max(9, cellSize * 0.27);
      const dominantBoost = lineDominant ? 1.18 : 1;
      const burstBoost = lineDominant ? 1.24 : 1;

      // Frame-0 flash, fades out over 5 frames.
      this.fxFlashes.push({
        x: centerX,
        y: centerY,
        radius: Math.max(20, cellSize * 0.58),
        alpha: Math.min(0.98, 0.82 * dominantBoost),
        colorCore: "#ffffff",
        colorOuter: vfx.accent,
        maxLife: scaleLife(6),
        life: scaleLife(6),
        delayFrames,
      });

      this.fxCellLights.push({
        x: centerX,
        y: centerY,
        innerRadius: Math.max(2, cellSize * 0.06),
        outerRadius: Math.max(12, cellSize * 0.82),
        radius: Math.max(2, cellSize * 0.06),
        alpha: 0.4,
        life: scaleLife(10),
        maxLife: scaleLife(10),
        delayFrames,
      });

      this.fxBursts.push({
        x: centerX,
        y: centerY,
        radius: coreRadius,
        maxRadius: coreRadius + 22 + (Math.random() * 9),
        alpha: Math.min(0.98, 0.82 * burstBoost),
        colorCore: vfx.accent,
        colorOuter: vfx.main,
        life: scaleLife(20),
        maxLife: scaleLife(20),
        delayFrames,
      });

      this.fxBursts.push({
        x: centerX,
        y: centerY,
        radius: coreRadius + 4,
        maxRadius: coreRadius + 34 + (Math.random() * 12),
        alpha: Math.min(0.7, 0.42 * burstBoost),
        colorCore: vfx.main,
        colorOuter: vfx.edge,
        life: scaleLife(24),
        maxLife: scaleLife(24),
        delayFrames,
      });

      this.fxAfterbursts.push({
        x: centerX,
        y: centerY,
        delayFrames: delayFrames + 15,
      });

      this.fxRings.push({
        x: centerX,
        y: centerY,
        innerRadius: 9,
        outerRadius: 42 + (lineEnergy * 2),
        radius: 9,
        color: "#ffffff",
        alpha: Math.min(0.95, 0.78 * dominantBoost),
        life: scaleLife(18),
        maxLife: scaleLife(18),
        thickness: 2.8,
        delayFrames,
      });

      this.fxRings.push({
        x: centerX,
        y: centerY,
        innerRadius: 7,
        outerRadius: 33 + lineEnergy,
        radius: 7,
        color: vfx.main,
        alpha: 0.64,
        life: scaleLife(13),
        maxLife: scaleLife(13),
        thickness: 2.1,
        delayFrames: delayFrames + 5,
      });

      if (!this.fxProfile.lowPower) {
        this.fxRings.push({
          x: centerX,
          y: centerY,
          innerRadius: 3,
          outerRadius: 20 + lineEnergy,
          radius: 3,
          color: "#ffffff",
          alpha: 0.35,
          life: scaleLife(10),
          maxLife: scaleLife(10),
          thickness: 1.5,
          delayFrames,
        });
      }

      // Dense, premium-feel debris set.
      const particleCount = Math.max(
        8,
        Math.round((15 + (lineEnergy * 2)) * (lineDominant ? 1.12 : 1) * particleScale),
      );
      for (let i = 0; i < particleCount; i += 1) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 2.6 + (Math.random() * 5.2);
        const roll = Math.random();
        const isSparkle = i % 6 === 0;
        const type = roll < 0.24 ? "streak" : (roll < 0.46 ? "chunk" : "dot");
        const chunkSize = 2.2 + (Math.random() * 3.4);
        this.pushFxParticle({
          x: centerX,
          y: centerY,
          prevX: centerX,
          prevY: centerY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * (speed * (type === "chunk" ? 0.86 : 1)),
          radius: type === "chunk" ? chunkSize : (1.8 + (Math.random() * 2.8)),
          type,
          streakLength: type === "streak" ? 10 + (Math.random() * 10) : 0,
          color: isSparkle
            ? "#ffffff"
            : shiftHexHue(
                Math.random() > 0.45 ? vfx.main : vfx.edge,
                (Math.random() * 40) - 20,
              ),
          alpha: isSparkle ? 1 : 0.92,
          baseAlpha: isSparkle ? 1 : 0.92,
          gravityScale: type === "chunk" ? 1.16 : (isSparkle ? 0.48 : 0.95),
          drag: type === "chunk" ? 0.952 : (isSparkle ? 0.985 : 0.972),
          rotation: Math.random() * Math.PI * 2,
          rotationSpeedDeg: (Math.random() * 16) - 8,
          turbulenceAmp: 0.05 + (Math.random() * 0.16),
          turbulenceFreq: 0.08 + (Math.random() * 0.11),
          turbulencePhase: Math.random() * Math.PI * 2,
          turbulenceDir: Math.random() * Math.PI * 2,
          life: scaleLife(30 + Math.round(Math.random() * 14)),
          maxLife: scaleLife(30 + Math.round(Math.random() * 14)),
          trail: [],
          delayFrames,
        });
      }

      const smokeCount = this.fxProfile.enableSmoke
        ? Math.max(1, Math.round((3 + Math.min(5, lineEnergy)) * particleScale))
        : 0;
      for (let s = 0; s < smokeCount; s += 1) {
        const smokeAngle = Math.random() * Math.PI * 2;
        const smokeSpeed = 0.35 + (Math.random() * 1.25);
        const smokeLife = scaleLife(28 + Math.round(Math.random() * 16));
        this.pushFxParticle({
          x: centerX,
          y: centerY,
          prevX: centerX,
          prevY: centerY,
          vx: Math.cos(smokeAngle) * smokeSpeed,
          vy: -Math.abs(Math.sin(smokeAngle) * smokeSpeed),
          radius: (cellSize * 0.14) + (Math.random() * (cellSize * 0.07)),
          type: "smoke",
          color: "rgba(193, 173, 255, 1)",
          alpha: 0.34 + (Math.random() * 0.08),
          baseAlpha: 0.34 + (Math.random() * 0.08),
          gravityScale: -0.06,
          drag: 0.955,
          rotation: 0,
          rotationSpeedDeg: 0,
          turbulenceAmp: 0.03 + (Math.random() * 0.05),
          turbulenceFreq: 0.05 + (Math.random() * 0.06),
          turbulencePhase: Math.random() * Math.PI * 2,
          turbulenceDir: Math.random() * Math.PI * 2,
          growth: 0.16 + (Math.random() * 0.18),
          life: smokeLife,
          maxLife: smokeLife,
          trail: [],
          delayFrames: delayFrames + Math.round(Math.random() * 3),
        });
      }
    });

    this.startFxLoop();
  }

  spawnWoodDebrisCascade(rowLines = [], colLines = [], comboChain = 1) {
    if (!rowLines.length && !colLines.length) {
      return;
    }
    const rect = this.elements.board.getBoundingClientRect();
    const cellSize = rect.width / this.boardSize;
    const anchors = [];
    const dedupe = new Set();
    const pushAnchor = (row, col) => {
      const key = `${row}:${col}`;
      if (dedupe.has(key)) {
        return;
      }
      dedupe.add(key);
      anchors.push({
        x: (col + 0.5) * cellSize,
        y: (row + 0.5) * cellSize,
      });
    };

    rowLines.forEach(({ index }) => {
      for (let col = 0; col < this.boardSize; col += 1) {
        pushAnchor(index, col);
      }
    });
    colLines.forEach(({ index }) => {
      for (let row = 0; row < this.boardSize; row += 1) {
        pushAnchor(row, index);
      }
    });

    const perAnchor = comboChain >= 3 ? 3 : (comboChain > 1 ? 2 : 1);
    const maxDebris = this.fxProfile.lowPower ? 68 : 130;
    const stride = Math.max(1, Math.ceil((anchors.length * perAnchor) / maxDebris));
    let emitted = 0;
    let stepCounter = 0;

    for (let i = 0; i < anchors.length; i += 1) {
      const anchor = anchors[i];
      for (let k = 0; k < perAnchor; k += 1) {
        stepCounter += 1;
        if (stepCounter % stride !== 0) {
          continue;
        }
        if (emitted >= maxDebris) {
          break;
        }
        const palette = WOOD_DEBRIS_PALETTE[Math.floor(Math.random() * WOOD_DEBRIS_PALETTE.length)];
        const width = (cellSize * 0.17) + (Math.random() * (cellSize * 0.16));
        const height = Math.max(2.4, width * (0.24 + (Math.random() * 0.24)));
        const spreadX = (Math.random() - 0.5) * (cellSize * 0.55);
        const spawnX = anchor.x + spreadX;
        const spawnY = anchor.y - (Math.random() * (cellSize * 0.12));
        const drift = (Math.random() - 0.5) * 1.65;
        const downSpeed = 0.75 + (Math.random() * 1.55);
        const life = scaleLife(28 + Math.round(Math.random() * 16) + (comboChain > 1 ? 5 : 0));

        this.pushFxParticle({
          x: spawnX,
          y: spawnY,
          prevX: spawnX,
          prevY: spawnY,
          vx: drift,
          vy: downSpeed,
          radius: Math.max(width, height),
          width,
          height,
          type: "woodchip",
          streakLength: 0,
          color: palette.main,
          colorAccent: palette.accent,
          colorDeep: palette.deep,
          alpha: 0.96,
          baseAlpha: 0.96,
          gravityScale: 1.12,
          drag: 0.968,
          rotation: Math.random() * Math.PI * 2,
          rotationSpeedDeg: (Math.random() * 28) - 14,
          fadePower: 1.15,
          turbulenceAmp: 0.016 + (Math.random() * 0.03),
          turbulenceFreq: 0.06 + (Math.random() * 0.05),
          turbulencePhase: Math.random() * Math.PI * 2,
          turbulenceDir: Math.random() * Math.PI * 2,
          life,
          maxLife: life,
          trail: [],
          delayFrames: Math.floor(Math.random() * 3),
        });
        emitted += 1;
      }
      if (emitted >= maxDebris) {
        break;
      }
    }
    if (emitted > 0) {
      this.startFxLoop();
    }
  }

  computeExplosionDelayFrames(row, col, rowLines, colLines) {
    const rowIndexes = rowLines.map((line) => line.index);
    const colIndexes = colLines.map((line) => line.index);

    let minDelay = Number.POSITIVE_INFINITY;
    if (rowIndexes.includes(row)) {
      minDelay = Math.min(minDelay, col * 0.65);
    }
    if (colIndexes.includes(col)) {
      minDelay = Math.min(minDelay, row * 0.65);
    }
    if (!Number.isFinite(minDelay)) {
      return 0;
    }
    return Math.max(0, Math.round(minDelay));
  }

  startFxLoop() {
    if (this.fxRafId || this.fxSuspended) {
      return;
    }
    this.fxLastTime = performance.now();
    const tick = (time) => {
      this.fxRafId = 0;
      if (this.fxSuspended) {
        return;
      }
      const frameMs = Math.max(1, time - this.fxLastTime);
      this.updateFxAdaptive(frameMs);
      this.updateFxPerfMetrics(frameMs);
      const frameStep = Math.min(
        this.fxProfile.maxFrameStep ?? 3,
        Math.max(1, Math.round(frameMs / 16.67)),
      );
      this.fxLastTime = time;

      const probeStart = this.fxProbeEnabled ? performance.now() : 0;
      for (let i = 0; i < frameStep; i += 1) {
        this.updateFxFrame();
      }
      if (this.fxProbeEnabled) {
        this.fxPerfUpdateCostMs = (performance.now() - probeStart) / frameStep;
      }

      const drawStart = this.fxProbeEnabled ? performance.now() : 0;
      this.drawFxFrame();
      if (this.fxProbeEnabled) {
        this.fxPerfDrawCostMs = performance.now() - drawStart;
      }

      if (this.hasActiveFxQueues()) {
        this.fxRafId = requestAnimationFrame(tick);
      }
    };
    this.fxRafId = requestAnimationFrame(tick);
  }

  updateFxFrame() {
    const gravity = 0.15;

    for (let i = this.fxShards.length - 1; i >= 0; i -= 1) {
      const shard = this.fxShards[i];
      if (shard.delayFrames > 0) {
        shard.delayFrames -= 1;
        continue;
      }
      shard.x += shard.vx;
      shard.y += shard.vy;
      shard.vx *= shard.drag ?? UNITY_SHATTER.drag;
      shard.vy = (shard.vy * (shard.drag ?? UNITY_SHATTER.drag)) + (shard.gravity ?? UNITY_SHATTER.gravity);
      shard.rotation += shard.rotationSpeed ?? 0;
      shard.rotationSpeed *= UNITY_SHATTER.spinDamping;
      shard.life -= 1;
      const lifeT = clamp01(shard.life / shard.maxLife);
      shard.alpha = (shard.baseAlpha ?? 1) * Math.pow(lifeT, 1.22);
      if (shard.life <= 0 || shard.y > ((this.elements.board?.clientHeight ?? 0) + 48)) {
        this.fxShards.splice(i, 1);
      }
    }

    for (let i = this.fxCracks.length - 1; i >= 0; i -= 1) {
      const crack = this.fxCracks[i];
      if (crack.delayFrames > 0) {
        crack.delayFrames -= 1;
        continue;
      }
      crack.life -= 1;
      const lifeT = clamp01(crack.life / crack.maxLife);
      crack.alpha = UNITY_SHATTER.crackAlpha * Math.pow(lifeT, 1.36);
      if (crack.life <= 0) {
        this.fxCracks.splice(i, 1);
      }
    }

    for (let i = this.fxParticles.length - 1; i >= 0; i -= 1) {
      const particle = this.fxParticles[i];
      if (particle.delayFrames > 0) {
        particle.delayFrames -= 1;
        continue;
      }
      if (particle.type === "chunk" || particle.type === "woodchip") {
        const trailLimit = this.fxProfile.trailLength ?? 0;
        if (trailLimit > 0) {
          particle.trail.push({
            x: particle.x,
            y: particle.y,
            rotation: particle.rotation ?? 0,
            width: particle.width,
            height: particle.height,
          });
          if (particle.trail.length > trailLimit) {
            particle.trail.shift();
          }
        } else if (particle.trail.length) {
          particle.trail.length = 0;
        }
      }
      particle.prevX = particle.x;
      particle.prevY = particle.y;
      particle.turbulencePhase = (particle.turbulencePhase ?? 0) + (particle.turbulenceFreq ?? 0.08);
      const turbulencePulse = Math.sin(particle.turbulencePhase) * (particle.turbulenceAmp ?? 0);
      particle.vx += Math.cos(particle.turbulenceDir ?? 0) * turbulencePulse * 0.08;
      particle.vy += Math.sin(particle.turbulenceDir ?? 0) * turbulencePulse * 0.08;
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.vx *= particle.drag ?? 0.97;
      particle.vy = (particle.vy * (particle.drag ?? 0.97)) + (gravity * (particle.gravityScale ?? 1));
      if (particle.type === "smoke") {
        particle.radius += particle.growth ?? 0.18;
      }
      particle.rotation = (particle.rotation ?? 0) + ((particle.rotationSpeedDeg ?? 0) * (Math.PI / 180));
      particle.life -= 1;
      const lifeT = Math.max(0, particle.life / particle.maxLife);
      if (particle.type === "smoke") {
        particle.alpha = (particle.baseAlpha ?? 0.35) * Math.pow(lifeT, 1.35);
      } else {
        const fadePower = particle.fadePower ?? 2;
        particle.alpha = (particle.baseAlpha ?? 1) * Math.pow(lifeT, fadePower);
      }
      if (particle.life <= 0) {
        this.fxParticles.splice(i, 1);
      }
    }

    for (let i = this.fxFlashes.length - 1; i >= 0; i -= 1) {
      const flash = this.fxFlashes[i];
      if (flash.delayFrames > 0) {
        flash.delayFrames -= 1;
        continue;
      }
      flash.life -= 1;
      flash.alpha = Math.max(0, 0.85 * (flash.life / flash.maxLife));
      if (flash.life <= 0) {
        this.fxFlashes.splice(i, 1);
      }
    }

    for (let i = this.fxRings.length - 1; i >= 0; i -= 1) {
      const ring = this.fxRings[i];
      if (ring.delayFrames > 0) {
        ring.delayFrames -= 1;
        continue;
      }
      ring.life -= 1;
      const progress = 1 - (ring.life / ring.maxLife);
      ring.radius = ring.innerRadius + ((ring.outerRadius - ring.innerRadius) * progress);
      ring.alpha = Math.max(0, 0.7 * (1 - progress));
      if (ring.life <= 0) {
        this.fxRings.splice(i, 1);
      }
    }

    for (let i = this.fxCellLights.length - 1; i >= 0; i -= 1) {
      const light = this.fxCellLights[i];
      if (light.delayFrames > 0) {
        light.delayFrames -= 1;
        continue;
      }
      light.life -= 1;
      const progress = 1 - (light.life / light.maxLife);
      light.radius = light.innerRadius + ((light.outerRadius - light.innerRadius) * progress);
      light.alpha = Math.max(0, 0.4 * (1 - progress));
      if (light.life <= 0) {
        this.fxCellLights.splice(i, 1);
      }
    }

    for (let i = this.fxAfterbursts.length - 1; i >= 0; i -= 1) {
      const burst = this.fxAfterbursts[i];
      if (burst.delayFrames > 0) {
        burst.delayFrames -= 1;
        continue;
      }
      const afterburstCount = Math.max(
        2,
        Math.round((this.fxProfile.afterburstCount ?? 8) * this.getFxRuntimeScale()),
      );
      for (let j = 0; j < afterburstCount; j += 1) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 8 + (Math.random() * 2);
        this.pushFxParticle({
          x: burst.x,
          y: burst.y,
          prevX: burst.x,
          prevY: burst.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          radius: 1.6 + (Math.random() * 1.5),
          type: "dot",
          color: Math.random() > 0.5 ? "#ffffff" : "#fbbf24",
          alpha: 0.96,
          gravityScale: 0.56,
          drag: 0.986,
          rotation: 0,
          rotationSpeedDeg: 0,
          maxLife: scaleLife(20),
          life: scaleLife(20),
          trail: [],
          delayFrames: 0,
        });
      }
      this.fxAfterbursts.splice(i, 1);
    }

    for (let i = this.fxBursts.length - 1; i >= 0; i -= 1) {
      const burst = this.fxBursts[i];
      if (burst.delayFrames > 0) {
        burst.delayFrames -= 1;
        continue;
      }
      burst.life -= 1;
      burst.radius = burst.radius + ((burst.maxRadius - burst.radius) * 0.24);
      burst.alpha = Math.max(0, burst.alpha * (burst.alphaDecay ?? 0.943));
      if (burst.life <= 0) {
        this.fxBursts.splice(i, 1);
      }
    }

    for (let i = this.fxLineSweeps.length - 1; i >= 0; i -= 1) {
      const sweep = this.fxLineSweeps[i];
      sweep.life -= 1;
      if (sweep.life <= 0) {
        this.fxLineSweeps.splice(i, 1);
      }
    }

    for (let i = this.fxLineScorePopups.length - 1; i >= 0; i -= 1) {
      const popup = this.fxLineScorePopups[i];
      if (popup.delayFrames > 0) {
        popup.delayFrames -= 1;
        continue;
      }
      popup.life -= 1;
      if (popup.life <= 0) {
        this.fxLineScorePopups.splice(i, 1);
      }
    }

    for (let i = this.fxMoveApprovals.length - 1; i >= 0; i -= 1) {
      const approval = this.fxMoveApprovals[i];
      if (approval.delayFrames > 0) {
        approval.delayFrames -= 1;
        continue;
      }
      approval.life -= 1;
      if (approval.life <= 0) {
        this.fxMoveApprovals.splice(i, 1);
      }
    }

    for (let i = this.fxAdventureBeams.length - 1; i >= 0; i -= 1) {
      const beam = this.fxAdventureBeams[i];
      if (beam.delayFrames > 0) {
        beam.delayFrames -= 1;
        continue;
      }
      beam.life -= 1;
      if (beam.life <= 0) {
        this.fxAdventureBeams.splice(i, 1);
      }
    }

    for (let i = this.fxCanvasTextBursts.length - 1; i >= 0; i -= 1) {
      const burst = this.fxCanvasTextBursts[i];
      burst.elapsed += 1;
      if (burst.elapsed >= burst.lifeFrames) {
        this.fxCanvasTextBursts.splice(i, 1);
      }
    }
  }

  drawFxFrame() {
    const canvas = this.elements.fxCanvas;
    if (!canvas) {
      return;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    const rawDpr = window.devicePixelRatio || 1;
    const dpr = Math.max(1, Math.min(rawDpr, this.fxProfile.dprCap ?? 2));
    const trailLimit = this.fxProfile.trailLength ?? 0;
    const glowPasses = this.fxProfile.glowPasses ?? 3;
    const ringShadowBlur = this.fxProfile.ringShadowBlur ?? 8;
    const particleShadowBlur = this.fxProfile.particleShadowBlur ?? 9;
    const chunkShadowBlur = this.fxProfile.chunkShadowBlur ?? 7;
    const simpleShading = Boolean(this.fxProfile.simpleShading);
    const useTexturedShards = Boolean(this.fxProfile.useTexturedShards) && this.getFxRuntimeScale() > 0.78;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const width = canvas.width / dpr;
    const height = canvas.height / dpr;
    ctx.clearRect(0, 0, width, height);
    ctx.globalCompositeOperation = "lighter";

    this.fxCellLights.forEach((light) => {
      if (light.delayFrames > 0) {
        return;
      }
      const gradient = ctx.createRadialGradient(
        light.x,
        light.y,
        0,
        light.x,
        light.y,
        light.radius,
      );
      gradient.addColorStop(0, "rgba(255,255,255,0.75)");
      gradient.addColorStop(0.45, "rgba(255,255,255,0.35)");
      gradient.addColorStop(1, "rgba(255,255,255,0)");
      ctx.save();
      ctx.globalAlpha = light.alpha;
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(light.x, light.y, light.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    this.fxFlashes.forEach((flash) => {
      if (flash.delayFrames > 0) {
        return;
      }
      const gradient = ctx.createRadialGradient(
        flash.x,
        flash.y,
        0,
        flash.x,
        flash.y,
        flash.radius,
      );
      gradient.addColorStop(0, flash.colorCore ?? "#ffffff");
      gradient.addColorStop(0.45, flash.colorOuter ?? "#ffffff");
      gradient.addColorStop(1, "rgba(255,255,255,0)");
      ctx.save();
      ctx.globalAlpha = flash.alpha;
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(flash.x, flash.y, flash.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    this.fxCracks.forEach((crack) => {
      if (crack.delayFrames > 0) {
        return;
      }
      ctx.save();
      ctx.globalAlpha = crack.alpha;
      ctx.strokeStyle = crack.color;
      ctx.shadowColor = "rgba(255,255,255,0.45)";
      ctx.shadowBlur = simpleShading ? 1.5 : 4.5;
      for (let i = 0; i < crack.lines.length; i += 1) {
        const line = crack.lines[i];
        ctx.lineWidth = line.w;
        ctx.beginPath();
        ctx.moveTo(line.x1, line.y1);
        ctx.lineTo(line.x2, line.y2);
        ctx.stroke();
      }
      ctx.restore();
    });

    this.fxBursts.forEach((burst) => {
      if (burst.delayFrames > 0) {
        return;
      }
      const gradient = ctx.createRadialGradient(
        burst.x,
        burst.y,
        0,
        burst.x,
        burst.y,
        burst.radius,
      );
      gradient.addColorStop(0, burst.colorCore);
      gradient.addColorStop(0.24, burst.colorOuter);
      gradient.addColorStop(0.62, "rgba(255,255,255,0.09)");
      gradient.addColorStop(1, "rgba(255,255,255,0)");
      ctx.save();
      ctx.globalAlpha = burst.alpha;
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(burst.x, burst.y, burst.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    this.fxRings.forEach((ring) => {
      if (ring.delayFrames > 0) {
        return;
      }
      ctx.save();
      ctx.globalAlpha = ring.alpha;
      ctx.strokeStyle = ring.color;
      ctx.lineWidth = ring.thickness ?? 2.2;
      ctx.shadowColor = ring.color;
      ctx.shadowBlur = ringShadowBlur;
      ctx.beginPath();
      ctx.arc(ring.x, ring.y, ring.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    });

    this.fxShards.forEach((shard) => {
      if (shard.delayFrames > 0) {
        return;
      }
      ctx.save();
      ctx.globalAlpha = shard.alpha;
      ctx.translate(shard.x, shard.y);
      ctx.rotate(shard.rotation);
      ctx.shadowColor = "rgba(0, 0, 0, 0.32)";
      ctx.shadowBlur = simpleShading ? 2 : 5;
      const points = Array.isArray(shard.points) ? shard.points : null;
      if (points && points.length >= 3) {
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i += 1) {
          ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.closePath();

        if (!simpleShading) {
          ctx.save();
          ctx.translate(1.1, 1.3);
          ctx.fillStyle = "rgba(8, 7, 18, 0.34)";
          ctx.fill();
          ctx.restore();
        }

        ctx.save();
        ctx.clip();
        if (useTexturedShards && shard.image?.complete && shard.image.naturalWidth > 0) {
          ctx.drawImage(
            shard.image,
            shard.textureOffsetX,
            shard.textureOffsetY,
            shard.textureSize,
            shard.textureSize,
          );
        } else {
          ctx.fillStyle = shard.fallbackColor ?? "#ffffff";
          ctx.fillRect(
            shard.textureOffsetX,
            shard.textureOffsetY,
            shard.textureSize,
            shard.textureSize,
          );
        }
        if (!simpleShading) {
          const shine = ctx.createLinearGradient(-14, -18, 16, 22);
          shine.addColorStop(0, "rgba(255,255,255,0.24)");
          shine.addColorStop(1, "rgba(255,255,255,0)");
          ctx.fillStyle = shine;
          ctx.fillRect(
            shard.textureOffsetX,
            shard.textureOffsetY,
            shard.textureSize,
            shard.textureSize,
          );
        }
        ctx.restore();

        if (!simpleShading) {
          ctx.globalAlpha = shard.alpha * 0.34;
          ctx.strokeStyle = "rgba(255,255,255,0.78)";
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      } else {
        ctx.fillStyle = shard.fallbackColor ?? "#ffffff";
        ctx.fillRect(-4, -4, 8, 8);
      }
      ctx.restore();
    });

    this.fxParticles.forEach((particle) => {
      if (particle.delayFrames > 0) {
        return;
      }
      if (particle.type === "smoke") {
        const smokeGradient = ctx.createRadialGradient(
          particle.x,
          particle.y,
          0,
          particle.x,
          particle.y,
          particle.radius,
        );
        smokeGradient.addColorStop(0, "rgba(236,226,255,0.34)");
        smokeGradient.addColorStop(0.42, "rgba(110,87,160,0.24)");
        smokeGradient.addColorStop(1, "rgba(14,11,30,0)");
        ctx.save();
        ctx.globalAlpha = particle.alpha;
        ctx.fillStyle = smokeGradient;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        return;
      }

      ctx.save();

      if ((particle.type === "chunk" || particle.type === "woodchip") && Array.isArray(particle.trail) && particle.trail.length) {
        const trailOpacities = [0.8, 0.72, 0.64, 0.56, 0.46, 0.36, 0.26, 0.18, 0.1];
        const scaleByIndex = [0.95, 0.88, 0.8, 0.72, 0.64, 0.56, 0.5, 0.44, 0.38];
        for (let t = 0; t < particle.trail.length && t < trailLimit; t += 1) {
          const trailIdx = particle.trail.length - 1 - t;
          const segment = particle.trail[trailIdx];
          if (!segment) {
            continue;
          }
          ctx.save();
          ctx.globalAlpha = particle.alpha * trailOpacities[t];
          ctx.translate(segment.x, segment.y);
          ctx.rotate(segment.rotation ?? 0);
          if (particle.type === "woodchip") {
            const w = (segment.width ?? particle.width ?? particle.radius) * scaleByIndex[t];
            const h = (segment.height ?? particle.height ?? Math.max(2, particle.radius * 0.32)) * scaleByIndex[t];
            ctx.fillStyle = particle.colorDeep ?? "#5a341c";
            ctx.fillRect(-w * 0.5, -h * 0.5, w, h);
          } else {
            const size = particle.radius * scaleByIndex[t];
            ctx.fillStyle = particle.color;
            ctx.fillRect(-size * 0.5, -size * 0.5, size, size);
          }
          ctx.restore();
        }
      }

      const glowScales = simpleShading ? [2] : [3, 2, 1.5];
      const glowOpacities = simpleShading ? [0.1] : [0.15, 0.1, 0.05];
      for (let g = 0; g < glowPasses; g += 1) {
        ctx.save();
        ctx.globalAlpha = particle.alpha * glowOpacities[g];
        if (particle.type === "streak") {
          const dx = particle.x - particle.prevX;
          const dy = particle.y - particle.prevY;
          const len = Math.hypot(dx, dy) || 1;
          const tx = (dx / len) * (particle.streakLength ?? 8);
          const ty = (dy / len) * (particle.streakLength ?? 8);
          ctx.strokeStyle = particle.color;
          ctx.lineWidth = Math.max(2, particle.radius * glowScales[g]);
          ctx.beginPath();
          ctx.moveTo(particle.x, particle.y);
          ctx.lineTo(particle.x - tx, particle.y - ty);
          ctx.stroke();
        } else if (particle.type === "chunk") {
          const size = particle.radius * glowScales[g];
          ctx.translate(particle.x, particle.y);
          ctx.rotate(particle.rotation ?? 0);
          ctx.fillStyle = particle.color;
          ctx.fillRect(-size * 0.5, -size * 0.5, size, size);
        } else if (particle.type === "woodchip") {
          const w = (particle.width ?? particle.radius) * glowScales[g];
          const h = (particle.height ?? Math.max(2, particle.radius * 0.32)) * glowScales[g];
          ctx.translate(particle.x, particle.y);
          ctx.rotate(particle.rotation ?? 0);
          ctx.fillStyle = particle.color;
          ctx.fillRect(-w * 0.5, -h * 0.5, w, h);
        } else {
          ctx.fillStyle = particle.color;
          ctx.beginPath();
          ctx.arc(particle.x, particle.y, particle.radius * glowScales[g], 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      const lifeT = clamp01(particle.life / particle.maxLife);
      const hotCoreAlpha = simpleShading ? 0 : (clamp01((lifeT - 0.55) / 0.45) * 0.78 * particle.alpha);
      const emberAlpha = simpleShading ? 0 : (clamp01((0.42 - lifeT) / 0.42) * 0.58 * particle.alpha);

      ctx.globalAlpha = particle.alpha;
      if (particle.type === "streak") {
        const dx = particle.x - particle.prevX;
        const dy = particle.y - particle.prevY;
        const len = Math.hypot(dx, dy) || 1;
        const tx = (dx / len) * (particle.streakLength ?? 8);
        const ty = (dy / len) * (particle.streakLength ?? 8);
        ctx.strokeStyle = particle.color;
        ctx.lineWidth = Math.max(1, particle.radius * 0.66);
        ctx.beginPath();
        ctx.moveTo(particle.x, particle.y);
        ctx.lineTo(particle.x - tx, particle.y - ty);
        ctx.stroke();

        if (hotCoreAlpha > 0) {
          ctx.globalAlpha = hotCoreAlpha;
          ctx.strokeStyle = "#fff8d9";
          ctx.lineWidth = Math.max(0.9, particle.radius * 0.36);
          ctx.beginPath();
          ctx.moveTo(particle.x, particle.y);
          ctx.lineTo(particle.x - (tx * 0.56), particle.y - (ty * 0.56));
          ctx.stroke();
        }
        if (emberAlpha > 0) {
          ctx.globalAlpha = emberAlpha;
          ctx.strokeStyle = "#ff9d3a";
          ctx.lineWidth = Math.max(0.8, particle.radius * 0.32);
          ctx.beginPath();
          ctx.moveTo(particle.x - (tx * 0.15), particle.y - (ty * 0.15));
          ctx.lineTo(particle.x - tx, particle.y - ty);
          ctx.stroke();
        }
      } else if (particle.type === "chunk") {
        const size = particle.radius;
        ctx.translate(particle.x, particle.y);
        ctx.rotate(particle.rotation ?? 0);
        ctx.fillStyle = particle.color;
        ctx.shadowColor = particle.color;
        ctx.shadowBlur = chunkShadowBlur;
        ctx.fillRect(-size * 0.5, -size * 0.5, size, size);
        if (!simpleShading) {
          ctx.strokeStyle = "rgba(255,255,255,0.38)";
          ctx.lineWidth = 1;
          ctx.strokeRect(-size * 0.45, -size * 0.45, size * 0.9, size * 0.9);
        }

        if (hotCoreAlpha > 0) {
          ctx.globalAlpha = hotCoreAlpha;
          ctx.fillStyle = "#fff6d0";
          ctx.fillRect(-size * 0.24, -size * 0.24, size * 0.48, size * 0.48);
        }
        if (emberAlpha > 0) {
          ctx.globalAlpha = emberAlpha;
          ctx.strokeStyle = "#ff9d3a";
          ctx.lineWidth = 1;
          ctx.strokeRect(-size * 0.36, -size * 0.36, size * 0.72, size * 0.72);
        }
      } else if (particle.type === "woodchip") {
        const w = particle.width ?? particle.radius;
        const h = particle.height ?? Math.max(2.4, w * 0.34);
        ctx.translate(particle.x, particle.y);
        ctx.rotate(particle.rotation ?? 0);
        ctx.shadowColor = particle.colorDeep ?? "#4b2a16";
        ctx.shadowBlur = Math.max(2, chunkShadowBlur - 2);
        ctx.fillStyle = particle.colorDeep ?? "#4b2a16";
        ctx.fillRect(-w * 0.5, -h * 0.5, w, h);
        ctx.fillStyle = particle.color ?? "#9f6b3c";
        ctx.fillRect(-w * 0.48, -h * 0.42, w * 0.96, h * 0.84);
        ctx.strokeStyle = "rgba(72, 44, 24, 0.55)";
        ctx.lineWidth = Math.max(0.8, h * 0.16);
        ctx.beginPath();
        ctx.moveTo(-w * 0.3, 0);
        ctx.lineTo(w * 0.3, 0);
        ctx.stroke();
        ctx.globalAlpha = Math.min(1, particle.alpha * 0.72);
        ctx.fillStyle = particle.colorAccent ?? "#e4be86";
        ctx.fillRect(-w * 0.38, -h * 0.34, w * 0.48, h * 0.22);
      } else {
        ctx.fillStyle = particle.color;
        ctx.shadowColor = particle.color;
        ctx.shadowBlur = particleShadowBlur;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        ctx.fill();

        if (hotCoreAlpha > 0) {
          ctx.globalAlpha = hotCoreAlpha;
          ctx.fillStyle = "#fff8e0";
          ctx.beginPath();
          ctx.arc(particle.x, particle.y, particle.radius * 0.52, 0, Math.PI * 2);
          ctx.fill();
        }
        if (emberAlpha > 0) {
          ctx.globalAlpha = emberAlpha;
          ctx.fillStyle = "#ff9d3a";
          ctx.beginPath();
          ctx.arc(particle.x, particle.y, particle.radius * 0.74, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    });

    this.drawCanvasLineSweeps(ctx, width, height);
    ctx.globalCompositeOperation = "source-over";
    this.drawCanvasMoveApprovals(ctx, width, height);
    this.drawCanvasLineScorePopups(ctx, width, height);
    this.drawCanvasAdventureBeams(ctx, width, height);
    this.drawCanvasTextBursts(ctx, width, height);
  }

  drawCanvasLineSweeps(ctx, boardWidth, boardHeight) {
    if (!this.fxLineSweeps.length) {
      return;
    }
    const cellSize = boardWidth / this.boardSize;
    this.fxLineSweeps.forEach((sweep) => {
      const lifeRatio = clamp01(1 - (sweep.life / sweep.maxLife));
      const moveT = easeOutCubic(lifeRatio);
      const fade = 1 - lifeRatio;
      if (fade <= 0.001) {
        return;
      }
      const axis = sweep.axis === "col" ? "col" : "row";
      const thickness = Math.max(12, cellSize * 1.26);
      const beamLength = axis === "row" ? boardWidth * 1.24 : boardHeight * 1.24;
      const sweepStart = axis === "row" ? (-boardWidth * 0.32) : (-boardHeight * 0.32);
      const sweepEnd = axis === "row" ? (boardWidth * 1.32) : (boardHeight * 1.32);
      const travel = lerp(sweepStart, sweepEnd, moveT);
      const alpha = Math.max(0, Math.min(1, fade * 0.42));

      if (axis === "row") {
        const y = ((sweep.index + 0.5) / this.boardSize) * boardHeight;
        const left = travel - (beamLength * 0.5);
        const gradient = ctx.createLinearGradient(left, y, left + beamLength, y);
        gradient.addColorStop(0, "rgba(255,255,255,0)");
        gradient.addColorStop(0.28, `${sweep.colorMain}00`);
        gradient.addColorStop(0.5, sweep.colorAccent);
        gradient.addColorStop(0.72, `${sweep.colorMain}00`);
        gradient.addColorStop(1, "rgba(255,255,255,0)");
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = gradient;
        ctx.shadowColor = sweep.colorAccent;
        ctx.shadowBlur = this.fxProfile.lowPower ? 2 : 8;
        ctx.fillRect(left, y - (thickness * 0.5), beamLength, thickness);
        ctx.restore();
      } else {
        const x = ((sweep.index + 0.5) / this.boardSize) * boardWidth;
        const top = travel - (beamLength * 0.5);
        const gradient = ctx.createLinearGradient(x, top, x, top + beamLength);
        gradient.addColorStop(0, "rgba(255,255,255,0)");
        gradient.addColorStop(0.28, `${sweep.colorMain}00`);
        gradient.addColorStop(0.5, sweep.colorAccent);
        gradient.addColorStop(0.72, `${sweep.colorMain}00`);
        gradient.addColorStop(1, "rgba(255,255,255,0)");
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = gradient;
        ctx.shadowColor = sweep.colorAccent;
        ctx.shadowBlur = this.fxProfile.lowPower ? 2 : 8;
        ctx.fillRect(x - (thickness * 0.5), top, thickness, beamLength);
        ctx.restore();
      }
    });
  }

  drawCanvasLineScorePopups(ctx, boardWidth, boardHeight) {
    if (!this.fxLineScorePopups.length) {
      return;
    }
    this.fxLineScorePopups.forEach((popup) => {
      if (popup.delayFrames > 0) {
        return;
      }
      const lifeRatio = clamp01(1 - (popup.life / popup.maxLife));
      const rise = easeOutCubic(lifeRatio);
      const y = popup.y - (40 * rise);
      let alpha = 1;
      if (lifeRatio < 0.1) {
        alpha = lifeRatio / 0.1;
      } else if (lifeRatio > 0.62) {
        alpha = 1 - ((lifeRatio - 0.62) / 0.38);
      }
      alpha = clamp01(alpha);
      if (alpha <= 0.001) {
        return;
      }
      const x = Math.max(14, Math.min(boardWidth - 14, popup.x));
      const yClamped = Math.max(24, Math.min(boardHeight - 10, y));
      const fontSize = popup.isCombo ? 34 : 32;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = `700 ${fontSize}px Rajdhani, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = popup.isCombo ? "#fbbf24" : "#ffffff";
      ctx.shadowColor = popup.isCombo ? "rgba(251,191,36,0.65)" : "rgba(255,255,255,0.55)";
      ctx.shadowBlur = popup.isCombo ? 16 : 14;
      ctx.fillText(popup.text, x, yClamped);
      ctx.restore();
    });
  }

  drawCanvasAdventureBeams(ctx, boardWidth, boardHeight) {
    if (!this.fxAdventureBeams.length) {
      return;
    }
    this.fxAdventureBeams.forEach((beam) => {
      if (beam.delayFrames > 0) {
        return;
      }
      const lifeRatio = clamp01(1 - (beam.life / beam.maxLife));
      const fade = lifeRatio < 0.2
        ? (lifeRatio / 0.2)
        : (1 - ((lifeRatio - 0.2) / 0.8));
      const alpha = clamp01((beam.alpha ?? 0.6) * fade);
      if (alpha <= 0.001) {
        return;
      }
      const x = Math.max(-24, Math.min(boardWidth + 24, beam.x));
      const y = Math.max(-24, Math.min(boardHeight + 24, beam.y));
      const height = Math.max(18, beam.height ?? 40);
      const width = Math.max(12, beam.width ?? 24);
      const halfH = height * 0.5;
      const gradient = ctx.createLinearGradient(x, y - halfH, x, y + halfH);
      gradient.addColorStop(0, "rgba(255,255,255,0)");
      gradient.addColorStop(0.2, beam.colorA);
      gradient.addColorStop(0.5, beam.colorB);
      gradient.addColorStop(0.8, beam.colorA);
      gradient.addColorStop(1, "rgba(255,255,255,0)");

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = gradient;
      ctx.shadowColor = beam.colorB;
      ctx.shadowBlur = this.fxProfile.lowPower ? 3 : 11;
      ctx.fillRect(x - (width * 0.5), y - halfH, width, height);
      ctx.restore();
    });
  }

  spawnLineSweep(axis, index, tone = 4) {
    const vfx = this.getToneVfx(tone);
    this.fxLineSweeps.push({
      axis: axis === "col" ? "col" : "row",
      index: Math.max(0, Math.min(this.boardSize - 1, Number(index) || 0)),
      colorMain: vfx.main,
      colorAccent: vfx.accent,
      life: LINE_SWEEP_LIFE_FRAMES,
      maxLife: LINE_SWEEP_LIFE_FRAMES,
    });
    const maxSweeps = this.fxProfile.lowPower ? 8 : 14;
    if (this.fxLineSweeps.length > maxSweeps) {
      this.fxLineSweeps.splice(0, this.fxLineSweeps.length - maxSweeps);
    }
    this.startFxLoop();
  }

  paintLineDominant(axis, index, tone) {
    const vfx = this.getToneVfx(tone);
    const targets = [];
    if (axis === "row") {
      for (let col = 0; col < this.boardSize; col += 1) {
        const cell = this.cells.get(this.cellKey(index, col));
        if (cell) {
          targets.push(cell);
        }
      }
    } else {
      for (let row = 0; row < this.boardSize; row += 1) {
        const cell = this.cells.get(this.cellKey(row, index));
        if (cell) {
          targets.push(cell);
        }
      }
    }

    targets.forEach((cell) => {
      cell.style.setProperty("--clear-glow", vfx.main);
      cell.style.setProperty("--clear-accent", vfx.accent);
      cell.classList.add("cell--line-dominant");
      setTimeout(() => {
        cell.classList.remove("cell--line-dominant");
        cell.style.removeProperty("--clear-glow");
        cell.style.removeProperty("--clear-accent");
      }, this.tuning.FX.CLEAR_FLASH_MS + 120);
    });
  }

  resolveClearedCellDetails(payload) {
    if (Array.isArray(payload.clearedCellsDetailed) && payload.clearedCellsDetailed.length) {
      return payload.clearedCellsDetailed.map((cell) => ({
        row: cell.row,
        col: cell.col,
        tone: Number(cell.tone) || 1,
      }));
    }
    return (payload.clearedCells ?? []).map((cell) => ({
      row: cell.row,
      col: cell.col,
      tone: 1,
    }));
  }

  resolveLineDetails(lines) {
    if (!Array.isArray(lines)) {
      return [];
    }
    return lines.map((line) => {
      if (typeof line === "number") {
        return { index: line, tone: 1 };
      }
      return {
        index: line.index,
        tone: Number(line.tone) || 1,
      };
    });
  }

  setPerformanceProbeEnabled(enabled) {
    this.fxProbeEnabled = Boolean(enabled);
  }

  updateFxPerfMetrics(frameMs) {
    const safeFrameMs = Math.max(0.5, Math.min(250, Number(frameMs) || 16.7));
    this.fxPerfAvgMs = (this.fxPerfAvgMs * 0.92) + (safeFrameMs * 0.08);
    if (safeFrameMs > this.fxPerfMaxMs) {
      this.fxPerfMaxMs = safeFrameMs;
    } else {
      this.fxPerfMaxMs *= 0.996;
    }
    this.fxPerfRing[this.fxPerfRingIndex] = safeFrameMs;
    this.fxPerfRingIndex = (this.fxPerfRingIndex + 1) % this.fxPerfRing.length;
    this.fxPerfRingCount = Math.min(this.fxPerfRing.length, this.fxPerfRingCount + 1);
    this.fxPerfFrameCounter += 1;

    const now = performance.now();
    if ((now - this.fxPerfLastStamp) >= 480) {
      const elapsed = Math.max(1, now - this.fxPerfLastStamp);
      this.fxPerfFps = (this.fxPerfFrameCounter * 1000) / elapsed;
      this.fxPerfFrameCounter = 0;
      this.fxPerfLastStamp = now;
      if (this.fxPerfRingCount > 0) {
        const values = Array.from(this.fxPerfRing.slice(0, this.fxPerfRingCount)).sort((a, b) => a - b);
        const idx = Math.max(0, Math.min(values.length - 1, Math.floor(values.length * 0.95)));
        this.fxPerfP95Ms = values[idx] || this.fxPerfAvgMs;
      }
    }
  }

  getPerformanceSnapshot() {
    return {
      fps: this.fxPerfFps,
      frameAvgMs: this.fxPerfAvgMs,
      frameP95Ms: this.fxPerfP95Ms,
      frameMaxMs: this.fxPerfMaxMs,
      drawCostMs: this.fxPerfDrawCostMs,
      updateCostMs: this.fxPerfUpdateCostMs,
      thermalTier: this.thermalTier,
      runtimeScale: this.getFxRuntimeScale(),
      fxQueues: this.fxCracks.length + this.fxShards.length + this.fxParticles.length + this.fxFlashes.length + this.fxRings.length + this.fxBursts.length + this.fxAfterbursts.length + this.fxCellLights.length + this.fxLineSweeps.length + this.fxLineScorePopups.length + this.fxMoveApprovals.length + this.fxAdventureBeams.length,
      domFxActive: this.domFxTotalActive,
      floatingLayerNodes: this.elements.floatingLayer?.childElementCount ?? 0,
      particleLayerNodes: this.elements.particleLayer?.childElementCount ?? 0,
      textFxMode: this.fxTextRenderMode,
      suspended: this.fxSuspended,
    };
  }

  acquireFloatingTextChip(variant = "score") {
    const chip = this.floatingTextPool.pop() ?? document.createElement("span");
    chip.className = `floating-text floating-text--${variant}`;
    chip.style.removeProperty("left");
    chip.style.removeProperty("top");
    chip.style.removeProperty("transform");
    chip.textContent = "";
    return chip;
  }

  recycleFloatingTextChip(chip) {
    if (!chip) {
      return;
    }
    chip.onanimationend = null;
    chip.remove();
    if (this.floatingTextPool.length < 32) {
      this.floatingTextPool.push(chip);
    }
  }

  acquireComboBurstNode(styleKey = "white", chain = 2, hasOverlap = false) {
    let bubble = this.comboBurstPool.pop();
    if (!bubble) {
      bubble = document.createElement("span");
      bubble.className = "combo-burst-text";
      const wordWrap = document.createElement("span");
      wordWrap.className = "combo-burst-text__word";
      const wordImg = document.createElement("img");
      wordImg.className = "combo-burst-text__word-img";
      wordImg.alt = "";
      wordImg.setAttribute("aria-hidden", "true");
      wordImg.draggable = false;
      wordWrap.appendChild(wordImg);
      const number = document.createElement("span");
      number.className = "combo-burst-text__num";
      bubble.append(wordWrap, number);
    }
    bubble.className = "combo-burst-text";
    bubble.classList.add(`combo-burst-text--${styleKey}`);
    if (hasOverlap) bubble.classList.add("combo-burst-text--overlap");
    if (chain >= 4) bubble.classList.add("combo-burst-text--strong");
    const comboWordSrc = CLOUD_WORD_ASSETS.combo[styleKey] || CLOUD_WORD_ASSETS.combo.white;
    const wordImg = bubble.querySelector(".combo-burst-text__word-img");
    const number = bubble.querySelector(".combo-burst-text__num");
    if (wordImg) {
      wordImg.src = comboWordSrc;
    }
    if (number) {
      number.textContent = String(chain);
    }
    bubble.style.removeProperty("left");
    bubble.style.removeProperty("top");
    return bubble;
  }

  recycleComboBurstNode(node) {
    if (!node) {
      return;
    }
    node.onanimationend = null;
    node.remove();
    if (this.comboBurstPool.length < 12) {
      this.comboBurstPool.push(node);
    }
  }

  acquireClearBurstNode(styleKey = "white", lineCount = 1, comboChain = 1) {
    let burst = this.clearBurstPool.pop();
    if (!burst) {
      burst = document.createElement("span");
      burst.className = "clear-burst-text";
      const wordWrap = document.createElement("span");
      wordWrap.className = "clear-burst-text__word";
      const wordImg = document.createElement("img");
      wordImg.className = "clear-burst-text__word-img";
      wordImg.alt = "";
      wordImg.setAttribute("aria-hidden", "true");
      wordImg.draggable = false;
      wordWrap.appendChild(wordImg);
      const multi = document.createElement("span");
      multi.className = "clear-burst-text__multi-label";
      burst.append(wordWrap, multi);
    }
    burst.className = "clear-burst-text";
    burst.classList.add(`clear-burst-text--${styleKey}`);
    if (lineCount >= 2) burst.classList.add("clear-burst-text--multi");
    if (comboChain > 1) burst.classList.add("clear-burst-text--combo");
    const clearWordSrc = CLOUD_WORD_ASSETS.clear[styleKey] || CLOUD_WORD_ASSETS.clear.white;
    const wordImg = burst.querySelector(".clear-burst-text__word-img");
    const multi = burst.querySelector(".clear-burst-text__multi-label");
    if (wordImg) {
      wordImg.src = clearWordSrc;
    }
    if (multi) {
      if (lineCount >= 2) {
        multi.textContent = `x${lineCount}`;
        multi.style.display = "";
      } else {
        multi.textContent = "";
        multi.style.display = "none";
      }
    }
    burst.style.removeProperty("left");
    burst.style.removeProperty("top");
    return burst;
  }

  recycleClearBurstNode(node) {
    if (!node) {
      return;
    }
    node.onanimationend = null;
    node.remove();
    if (this.clearBurstPool.length < 12) {
      this.clearBurstPool.push(node);
    }
  }

  getToneVfx(tone) {
    return CLEAR_TONE_VFX[tone] ?? CLEAR_TONE_VFX[5];
  }

  spawnFloatingText(text, variant = "score") {
    if (this.fxSuspended) {
      return;
    }
    const chip = this.acquireFloatingTextChip(variant);
    chip.textContent = text;
    chip.onanimationend = () => this.recycleFloatingTextChip(chip);
    const layer = this.elements.floatingLayer;
    if (!layer) {
      return;
    }
    const thermalPenalty = this.thermalTier >= 2 ? 4 : (this.thermalTier >= 1 ? 2 : 0);
    const maxFloatingChips = Math.max(4, (this.fxProfile.lowPower ? 8 : 16) - thermalPenalty);
    const floatingChips = layer.querySelectorAll(".floating-text");
    let overflowCount = (floatingChips.length + 1) - maxFloatingChips;
    for (let i = 0; i < floatingChips.length && overflowCount > 0; i += 1, overflowCount -= 1) {
      floatingChips[i]?.remove();
    }
    layer.appendChild(chip);
  }

  resolveComboAnchorPoint(rowLines = [], colLines = [], layer = this.elements.floatingLayer) {
    const boardRect = this.elements.board?.getBoundingClientRect?.();
    const layerRect = layer?.getBoundingClientRect?.();
    if (!boardRect?.width || !layerRect) {
      return null;
    }

    const cellSize = boardRect.width / this.boardSize;
    const points = [];
    rowLines.forEach((line) => {
      const idx = Number(line?.index);
      if (!Number.isFinite(idx)) {
        return;
      }
      points.push({
        x: boardRect.width * 0.5,
        y: (idx + 0.5) * cellSize,
      });
    });
    colLines.forEach((line) => {
      const idx = Number(line?.index);
      if (!Number.isFinite(idx)) {
        return;
      }
      points.push({
        x: (idx + 0.5) * cellSize,
        y: boardRect.height * 0.5,
      });
    });

    const base = points.length
      ? points.reduce((acc, point) => ({
        x: acc.x + point.x,
        y: acc.y + point.y,
      }), { x: 0, y: 0 })
      : { x: boardRect.width * 0.5, y: boardRect.height * 0.5 };
    const avgX = points.length ? (base.x / points.length) : base.x;
    const avgY = points.length ? (base.y / points.length) : base.y;

    const minX = 72;
    const maxX = Math.max(minX, boardRect.width - 72);
    const minY = 54;
    const maxY = Math.max(minY, boardRect.height - 54);
    const targetX = Math.max(minX, Math.min(maxX, avgX));
    const targetY = Math.max(minY, Math.min(maxY, avgY - Math.max(12, cellSize * 0.34)));
    return {
      x: targetX + (boardRect.left - layerRect.left),
      y: targetY + (boardRect.top - layerRect.top),
    };
  }

  resolveBoardPointFromLayerPoint(anchor, layer = this.elements.floatingLayer) {
    if (!anchor || !layer) {
      return null;
    }
    const boardRect = this.elements.board?.getBoundingClientRect?.();
    const layerRect = layer?.getBoundingClientRect?.();
    if (!boardRect || !layerRect) {
      return null;
    }
    return {
      x: anchor.x - (boardRect.left - layerRect.left),
      y: anchor.y - (boardRect.top - layerRect.top),
    };
  }

  getFxWordImage(src) {
    const key = String(src || "").trim();
    if (!key) {
      return null;
    }
    if (this.fxWordImageCache.has(key)) {
      return this.fxWordImageCache.get(key);
    }
    const image = new Image();
    image.decoding = "async";
    image.src = key;
    this.fxWordImageCache.set(key, image);
    return image;
  }

  enqueueCanvasTextBurst(payload = {}) {
    const x = Number(payload.x);
    const y = Number(payload.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      return;
    }
    const lifeMs = Math.max(220, Number(payload.lifeMs) || 980);
    const lifeFrames = Math.max(18, Math.round(lifeMs / 16.67));
    this.fxCanvasTextBursts.push({
      type: payload.type === "clear" ? "clear" : "combo",
      x,
      y,
      elapsed: 0,
      lifeFrames,
      styleKey: payload.styleKey === "colorful" ? "colorful" : "white",
      chain: Math.max(1, Math.floor(Number(payload.chain) || 1)),
      lineCount: Math.max(1, Math.floor(Number(payload.lineCount) || 1)),
      hasOverlap: Boolean(payload.hasOverlap),
      driftY: Number.isFinite(Number(payload.driftY)) ? Number(payload.driftY) : -34,
      wordSrc: String(payload.wordSrc || ""),
    });
    const maxBursts = this.fxProfile.lowPower ? 6 : 10;
    if (this.fxCanvasTextBursts.length > maxBursts) {
      this.fxCanvasTextBursts.splice(0, this.fxCanvasTextBursts.length - maxBursts);
    }
  }

  drawCanvasGoldNumber(ctx, text, x, y, fontSize, alpha = 1) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = `900 ${fontSize}px "Baloo 2", "Segoe UI", sans-serif`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    const grad = ctx.createLinearGradient(x, y - (fontSize * 0.72), x, y + (fontSize * 0.72));
    grad.addColorStop(0, "#fff7d8");
    grad.addColorStop(0.36, "#f9d87f");
    grad.addColorStop(0.62, "#f3bd51");
    grad.addColorStop(1, "#d18620");
    ctx.fillStyle = grad;
    ctx.strokeStyle = "rgba(107,62,12,0.96)";
    ctx.lineWidth = Math.max(2, fontSize * 0.095);
    ctx.shadowColor = "rgba(255, 212, 128, 0.52)";
    ctx.shadowBlur = Math.max(4, fontSize * 0.34);
    ctx.strokeText(text, x, y);
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  drawCanvasWordFallback(ctx, word, x, y, size, alpha = 1, colorful = false) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = `900 ${size}px "Baloo 2", "Segoe UI", sans-serif`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    if (colorful) {
      const grad = ctx.createLinearGradient(x, y - size, x + (size * word.length * 0.65), y + size);
      grad.addColorStop(0, "#ffdb7a");
      grad.addColorStop(0.35, "#ff7d77");
      grad.addColorStop(0.7, "#7ad8ff");
      grad.addColorStop(1, "#fff5c8");
      ctx.fillStyle = grad;
    } else {
      ctx.fillStyle = "#f8fbff";
    }
    ctx.strokeStyle = colorful ? "rgba(83, 22, 42, 0.88)" : "rgba(52, 62, 106, 0.82)";
    ctx.lineWidth = Math.max(2, size * 0.09);
    ctx.shadowColor = colorful ? "rgba(255,145,120,0.34)" : "rgba(199, 223, 255, 0.28)";
    ctx.shadowBlur = Math.max(3, size * 0.24);
    ctx.strokeText(word, x, y);
    ctx.fillText(word, x, y);
    ctx.restore();
  }

  drawCanvasTextBursts(ctx, boardWidth, boardHeight) {
    if (!this.fxCanvasTextBursts.length) {
      return;
    }
    const baseWordWidth = Math.max(116, Math.min(210, boardWidth * 0.34));
    const baseWordHeight = baseWordWidth * 0.34;
    const safeMarginX = Math.max(60, baseWordWidth * 0.48);
    const safeMarginY = Math.max(36, baseWordHeight * 0.72);

    this.fxCanvasTextBursts.forEach((burst) => {
      const lifeRatio = clamp01(burst.elapsed / burst.lifeFrames);
      const pop = lifeRatio < 0.22 ? easeOutBack(lifeRatio / 0.22) : 1;
      const fade = lifeRatio < 0.62 ? 1 : clamp01(1 - ((lifeRatio - 0.62) / 0.38));
      const alpha = fade * (burst.hasOverlap ? 0.94 : 1);
      if (alpha <= 0.01) {
        return;
      }

      const x = Math.max(safeMarginX, Math.min(boardWidth - safeMarginX, burst.x));
      const yBase = burst.y + (burst.driftY * easeOutCubic(lifeRatio));
      const y = Math.max(safeMarginY, Math.min(boardHeight - safeMarginY, yBase));
      const scale = (0.9 + (0.16 * pop)) * (burst.hasOverlap ? 0.96 : 1);

      if (burst.type === "combo") {
        const wordW = baseWordWidth * scale;
        const wordH = baseWordHeight * scale;
        const numSize = Math.max(36, Math.round(wordH * 1.46));
        const numText = String(Math.max(2, burst.chain));
        ctx.save();
        ctx.font = `900 ${numSize}px "Baloo 2", "Segoe UI", sans-serif`;
        const numWidth = ctx.measureText(numText).width;
        ctx.restore();
        const gap = Math.max(8, Math.round(wordW * 0.06));
        const totalW = wordW + gap + numWidth;
        const startX = x - (totalW * 0.5);
        const wordSrc = burst.wordSrc || CLOUD_WORD_ASSETS.combo.white;
        const wordImage = this.getFxWordImage(wordSrc);
        if (wordImage?.complete && wordImage.naturalWidth > 0) {
          ctx.save();
          ctx.globalAlpha = alpha;
          ctx.drawImage(wordImage, startX, y - (wordH * 0.5), wordW, wordH);
          ctx.restore();
        } else {
          this.drawCanvasWordFallback(ctx, "COMBO", startX, y, Math.max(30, wordH * 0.82), alpha, burst.styleKey === "colorful");
        }
        this.drawCanvasGoldNumber(ctx, numText, startX + wordW + gap, y, numSize, alpha);
      } else {
        const wordW = (baseWordWidth * 0.92) * scale;
        const wordH = (baseWordHeight * 0.96) * scale;
        const startX = x - (wordW * 0.5);
        const wordSrc = burst.wordSrc || CLOUD_WORD_ASSETS.clear.white;
        const wordImage = this.getFxWordImage(wordSrc);
        if (wordImage?.complete && wordImage.naturalWidth > 0) {
          ctx.save();
          ctx.globalAlpha = alpha;
          ctx.drawImage(wordImage, startX, y - (wordH * 0.5), wordW, wordH);
          ctx.restore();
        } else {
          this.drawCanvasWordFallback(ctx, "CLEAR", startX, y, Math.max(28, wordH * 0.84), alpha, burst.styleKey === "colorful");
        }
        if (burst.lineCount >= 2) {
          const multiSize = Math.max(18, Math.round(wordH * 0.58));
          this.drawCanvasGoldNumber(ctx, `x${burst.lineCount}`, x + (wordW * 0.56), y + (wordH * 0.1), multiSize, alpha * 0.95);
        }
      }
    });
  }

  spawnCanvasComboBurstText(chain, styleKey, hasOverlap, boardPoint) {
    const comboWordSrc = CLOUD_WORD_ASSETS.combo[styleKey] || CLOUD_WORD_ASSETS.combo.white;
    this.enqueueCanvasTextBurst({
      type: "combo",
      x: boardPoint.x,
      y: boardPoint.y,
      lifeMs: COMBO_BURST_LIFETIME_MS,
      styleKey,
      chain,
      hasOverlap,
      driftY: -30,
      wordSrc: comboWordSrc,
    });
    this.startFxLoop();
  }

  spawnCanvasClearBurstText(styleKey, lineCount, comboChain, hasOverlap, boardPoint) {
    const clearWordSrc = CLOUD_WORD_ASSETS.clear[styleKey] || CLOUD_WORD_ASSETS.clear.white;
    this.enqueueCanvasTextBurst({
      type: "clear",
      x: boardPoint.x,
      y: boardPoint.y - 34,
      lifeMs: 980,
      styleKey,
      chain: comboChain,
      lineCount,
      hasOverlap,
      driftY: -26,
      wordSrc: clearWordSrc,
    });
    this.startFxLoop();
  }

  spawnComboBurstText(comboChain, payload = {}) {
    const chain = Math.max(2, Math.floor(Number(comboChain) || 2));
    const layer = this.elements.floatingLayer;
    if (!layer || this.fxSuspended) {
      return;
    }
    const nowMs = performance.now();
    const hasOverlap = nowMs < this.comboBurstActiveUntilMs;

    const rowLines = this.resolveLineDetails(payload?.clearedRows);
    const colLines = this.resolveLineDetails(payload?.clearedCols);
    const anchor = this.resolveComboAnchorPoint(rowLines, colLines, layer);
    const x = Number(anchor?.x);
    const y = Number(anchor?.y);

    const styleKey = this.resolveComboWordStyle(chain, payload);
    if (this.fxTextRenderMode === "canvas") {
      const boardPoint = this.resolveBoardPointFromLayerPoint(anchor, layer);
      if (boardPoint) {
        this.comboBurstActiveUntilMs = nowMs + COMBO_BURST_LIFETIME_MS;
        this.spawnCanvasComboBurstText(chain, styleKey, hasOverlap, boardPoint);
      }
      return;
    }
    if (!this.canSpawnDomFx("comboBurst")) {
      return;
    }
    this.registerDomFx("comboBurst");
    const bubble = this.acquireComboBurstNode(styleKey, chain, hasOverlap);
    if (Number.isFinite(x) && Number.isFinite(y)) {
      bubble.style.left = `${x}px`;
      bubble.style.top = `${y}px`;
    }
    this.comboBurstActiveUntilMs = nowMs + COMBO_BURST_LIFETIME_MS;
    let settled = false;
    const finish = () => {
      if (settled) {
        return;
      }
      settled = true;
      this.releaseDomFx("comboBurst");
      this.recycleComboBurstNode(bubble);
    };
    bubble.addEventListener("animationend", finish, { once: true });
    window.setTimeout(finish, COMBO_BURST_LIFETIME_MS + 240);
    layer.appendChild(bubble);
  }

  resolveComboWordStyle(comboChain, payload = {}) {
    const forced = String(payload?.comboWordStyle ?? "").toLowerCase();
    if (forced === "white" || forced === "colorful") {
      return forced;
    }
    const comboMultiplier = Number(payload?.comboMultiplier ?? 1);
    if (comboChain >= 3 || comboMultiplier > 1.22) {
      return "colorful";
    }
    return "white";
  }

  spawnClearBurstText(payload = {}) {
    const layer = this.elements.floatingLayer;
    if (!layer || this.fxSuspended) {
      return;
    }
    const nowMs = performance.now();
    const rowLines = this.resolveLineDetails(payload?.clearedRows);
    const colLines = this.resolveLineDetails(payload?.clearedCols);
    const anchor = this.resolveComboAnchorPoint(rowLines, colLines, layer);
    const x = Number(anchor?.x);
    const y = Number(anchor?.y);
    const lineCount = Math.max(1, Math.floor(Number(payload?.lineCount ?? 1)));
    const comboChain = Math.max(1, Math.floor(Number(payload?.comboChain ?? 1)));
    const hasOverlap = nowMs < this.clearBurstActiveUntilMs;

    const shouldColorize = comboChain > 1 || lineCount >= 2 || hasOverlap;
    const clearWordStyle = shouldColorize ? "colorful" : "white";
    if (this.fxTextRenderMode === "canvas") {
      const boardPoint = this.resolveBoardPointFromLayerPoint(anchor, layer);
      if (boardPoint) {
        this.clearBurstActiveUntilMs = nowMs + 980;
        this.spawnCanvasClearBurstText(clearWordStyle, lineCount, comboChain, hasOverlap, boardPoint);
      }
      return;
    }
    if (!this.canSpawnDomFx("clearBurst")) {
      return;
    }
    this.registerDomFx("clearBurst");
    const burst = this.acquireClearBurstNode(clearWordStyle, lineCount, comboChain);
    if (Number.isFinite(x) && Number.isFinite(y)) {
      burst.style.left = `${x}px`;
      burst.style.top = `${y - 34}px`;
    }
    this.clearBurstActiveUntilMs = nowMs + 980;
    let settled = false;
    const finish = () => {
      if (settled) {
        return;
      }
      settled = true;
      this.releaseDomFx("clearBurst");
      this.recycleClearBurstNode(burst);
    };
    burst.addEventListener("animationend", finish, { once: true });
    window.setTimeout(finish, 1220);
    layer.appendChild(burst);
  }

  showBestScorePopup(bestScore = 0) {
    const layer = this.elements.floatingLayer;
    if (!layer) {
      return;
    }
    const existing = layer.querySelector(".best-score-popup");
    if (existing) {
      existing.remove();
    }
    const popup = document.createElement("div");
    popup.className = "best-score-popup";
    popup.innerHTML = `
      <span class="best-score-popup-crown" aria-hidden="true">&#128081;</span>
      <span class="best-score-popup-label">BEST SCORE</span>
      <span class="best-score-popup-value">${this.formatScore(bestScore)}</span>
    `;
    popup.addEventListener("animationend", () => popup.remove(), { once: true });
    layer.appendChild(popup);
  }

  drawCanvasMoveApprovals(ctx, boardWidth, boardHeight) {
    if (!this.fxMoveApprovals.length) {
      return;
    }
    this.fxMoveApprovals.forEach((approval) => {
      if (approval.delayFrames > 0) {
        return;
      }
      const lifeRatio = clamp01(1 - (approval.life / approval.maxLife));
      let alpha = 0;
      let yOffset = 0;
      let scale = 1;
      if (lifeRatio < 0.24) {
        const t = clamp01(lifeRatio / 0.24);
        alpha = t;
        yOffset = lerp(approval.startOffsetY, 0, t);
        scale = lerp(0.72, 1.06, t);
      } else if (lifeRatio < 0.62) {
        const t = clamp01((lifeRatio - 0.24) / 0.38);
        alpha = 1;
        yOffset = 0;
        scale = lerp(1.06, 1, t);
      } else {
        const t = clamp01((lifeRatio - 0.62) / 0.38);
        alpha = 1 - t;
        yOffset = lerp(0, approval.endOffsetY, t);
        scale = lerp(1, 0.92, t);
      }
      alpha = clamp01(alpha);
      if (alpha <= 0.01) {
        return;
      }

      const x = Math.max(8, Math.min(boardWidth - 8, approval.x));
      const y = Math.max(8, Math.min(boardHeight - 8, approval.y + yOffset));
      const size = Math.max(14, approval.size * scale);
      const rotationRad = (Number(approval.rotationDeg) || 0) * (Math.PI / 180);

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(x, y);
      if (rotationRad) {
        ctx.rotate(rotationRad);
      }
      if (approval.image?.complete && approval.image.naturalWidth > 0) {
        ctx.shadowColor = approval.variant === "gold"
          ? "rgba(251,191,36,0.36)"
          : "rgba(255,255,255,0.3)";
        ctx.shadowBlur = this.fxProfile.lowPower ? 2 : 6;
        ctx.drawImage(approval.image, -size * 0.5, -size * 0.5, size, size);
      } else {
        const r = size * 0.5;
        const grad = ctx.createRadialGradient(0, 0, r * 0.2, 0, 0, r);
        if (approval.variant === "gold") {
          grad.addColorStop(0, "rgba(255,245,198,0.95)");
          grad.addColorStop(0.55, "rgba(248,188,80,0.9)");
          grad.addColorStop(1, "rgba(191,119,28,0.2)");
        } else {
          grad.addColorStop(0, "rgba(255,255,255,0.96)");
          grad.addColorStop(0.6, "rgba(208,230,255,0.9)");
          grad.addColorStop(1, "rgba(112,145,194,0.2)");
        }
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });
  }

  spawnMoveApprovalIcons(cells, variant = "white", options = {}) {
    if (this.fxSuspended || !Array.isArray(cells) || !cells.length) {
      return;
    }

    const iconUrl = MOVE_APPROVAL_ICONS[variant] ?? MOVE_APPROVAL_ICONS.white;
    const iconImage = this.getFxWordImage(iconUrl);
    const boardRect = this.elements.board.getBoundingClientRect();
    if (!boardRect.width || !boardRect.height) {
      return;
    }
    const cellSize = boardRect.width / this.boardSize;
    const spreadMs = Math.max(0, Number(options.spreadMs ?? 0));
    const maxIcons = Math.max(1, Math.min(8, Math.round(options.maxIcons ?? 4)));
    const directionMode = options.direction ?? "alternating";
    const rotationDeg = Number.isFinite(Number(options.rotationDeg))
      ? Number(options.rotationDeg)
      : 0;

    const uniqueCells = [];
    const seen = new Set();
    cells.forEach((cell) => {
      const row = Number(cell?.row);
      const col = Number(cell?.col);
      if (!Number.isInteger(row) || !Number.isInteger(col)) {
        return;
      }
      const key = `${row}:${col}`;
      if (seen.has(key)) {
        return;
      }
      seen.add(key);
      uniqueCells.push({ row, col });
    });
    if (!uniqueCells.length) {
      return;
    }

    const pickedCells = [];
    if (uniqueCells.length <= maxIcons) {
      pickedCells.push(...uniqueCells);
    } else {
      const stride = uniqueCells.length / maxIcons;
      for (let i = 0; i < maxIcons; i += 1) {
        const index = Math.min(uniqueCells.length - 1, Math.floor(i * stride));
        pickedCells.push(uniqueCells[index]);
      }
    }

    pickedCells.forEach((cell, index) => {
      const cellEl = this.cells.get(this.cellKey(cell.row, cell.col));
      const cellRect = cellEl?.getBoundingClientRect();
      const x = cellEl
        ? ((cellRect.left + (cellRect.width * 0.5)) - boardRect.left)
        : ((cell.col + 0.5) * cellSize);
      const y = cellEl
        ? ((cellRect.top + (cellRect.height * 0.5)) - boardRect.top)
        : ((cell.row + 0.5) * cellSize);
      const cellVisualSize = cellEl
        ? Math.min(cellRect.width, cellRect.height)
        : cellSize;
      const fromTop = (() => {
        if (directionMode === "up") {
          return false;
        }
        if (directionMode === "down") {
          return true;
        }
        return index % 2 !== 0;
      })();
      const entryDistance = Math.round(cellVisualSize * 0.42);
      this.fxMoveApprovals.push({
        x,
        y,
        size: Math.max(18, Math.round(cellVisualSize * 0.72)),
        image: iconImage,
        variant: variant === "gold" ? "gold" : "white",
        delayFrames: Math.round((index * spreadMs) / 16.67),
        life: 44,
        maxLife: 44,
        startOffsetY: fromTop ? -entryDistance : entryDistance,
        endOffsetY: fromTop ? (entryDistance * 0.7) : (-entryDistance * 0.7),
        rotationDeg,
      });
    });
    const maxApprovals = this.fxProfile.lowPower ? 10 : 20;
    if (this.fxMoveApprovals.length > maxApprovals) {
      this.fxMoveApprovals.splice(0, this.fxMoveApprovals.length - maxApprovals);
    }
    this.startFxLoop();
  }

  spawnLineScorePopups(rowLines, colLines, comboChain) {
    const boardEl = this.elements.board;
    if (!boardEl) {
      return;
    }

    const rect = boardEl.getBoundingClientRect();
    const cellSize = rect.width / this.boardSize;
    const isCombo = comboChain > 1;
    const text = isCombo ? (comboChain >= 3 ? "+500" : "+250") : "+100";

    const points = [];
    rowLines.forEach((line) => {
      points.push({
        x: rect.width * 0.5,
        y: (line.index + 0.5) * cellSize,
      });
    });
    colLines.forEach((line) => {
      points.push({
        x: (line.index + 0.5) * cellSize,
        y: rect.height * 0.5,
      });
    });

    points.forEach((point, idx) => {
      this.fxLineScorePopups.push({
        x: point.x,
        y: point.y,
        text,
        isCombo,
        delayFrames: Math.round((idx * 40) / 16.67),
        life: LINE_SCORE_POP_LIFE_FRAMES,
        maxLife: LINE_SCORE_POP_LIFE_FRAMES,
      });
    });
    const maxPopups = this.fxProfile.lowPower ? 10 : 20;
    if (this.fxLineScorePopups.length > maxPopups) {
      this.fxLineScorePopups.splice(0, this.fxLineScorePopups.length - maxPopups);
    }
    this.startFxLoop();
  }

  renderHud(snapshot) {
    const score = Number.isFinite(snapshot.score) ? snapshot.score : 0;
    const bestScore = Number.isFinite(snapshot.bestScore) ? snapshot.bestScore : 0;

    if (this.elements.scoreValue) {
      this.elements.scoreValue.textContent = this.formatScore(score);
    }
    if (this.elements.bestValue) {
      this.elements.bestValue.textContent = this.formatScore(bestScore);
    }
  }

  renderAdventure(snapshot) {
    const adventureHud = this.elements.adventureHud;
    const markerLayer = this.elements.adventureMarkerLayer;
    const isAdventure = snapshot.mode === "adventure" && Boolean(snapshot.adventure);

    if (adventureHud) {
      adventureHud.classList.toggle("adventure-hud--visible", isAdventure);
    }
    if (!isAdventure) {
      if (adventureHud) {
        adventureHud.classList.remove("adventure-hud--score-target");
        adventureHud.innerHTML = "";
      }
      if (markerLayer) {
        markerLayer.innerHTML = "";
      }
      return;
    }

    this.renderAdventureHud(snapshot.adventure, snapshot.score);
    this.renderAdventureMarkers(snapshot.adventure);
  }

  renderAdventureHud(adventure, score = 0) {
    const root = this.elements.adventureHud;
    if (!root) {
      return;
    }
    const objectiveKind = adventure?.objective?.kind ?? "marker_collect";
    root.classList.toggle("adventure-hud--score-target", objectiveKind === "score_target");
    if (objectiveKind === "score_target") {
      this.renderAdventureScoreTargetHud(adventure, score);
      return;
    }
    const levelId = Number(adventure.level || adventure.id || 1);
    if (this.adventureDisplay.level !== levelId) {
      this.adventureDisplay.level = levelId;
      this.adventureDisplay.remaining = { ...adventure.remaining };
    } else if (this.adventureFlyActive === 0) {
      this.adventureDisplay.remaining = { ...adventure.remaining };
    }
    root.innerHTML = "";

    const counterWrap = document.createElement("div");
    counterWrap.className = "adventure-counter-wrap";
    root.appendChild(counterWrap);

    ["blue", "yellow", "red"].forEach((type) => {
      const remain = Number(this.adventureDisplay.remaining?.[type] ?? adventure.remaining?.[type] ?? 0);
      const target = Number(adventure.targets?.[type] ?? 0);
      if (target <= 0) {
        return;
      }
      const chip = document.createElement("div");
      chip.className = "adventure-counter-chip";
      chip.dataset.type = type;
      chip.innerHTML = `
        <span class="adventure-counter-icon-wrap">
          <span class="adventure-counter-icon"></span>
        </span>
        <span class="adventure-counter-value">${remain}</span>
      `;
      const icon = chip.querySelector(".adventure-counter-icon");
      if (icon instanceof HTMLElement) {
        icon.style.backgroundImage = `url("${ADVENTURE_VISUALS[type].icon}")`;
      }
      counterWrap.appendChild(chip);
    });
  }

  renderAdventureScoreTargetHud(adventure, score = 0) {
    const root = this.elements.adventureHud;
    if (!root) {
      return;
    }
    const levelId = Number(adventure.level || adventure.id || 1);
    const objective = adventure.objective ?? {};
    const targetScore = Math.max(1, Number(objective.targetScore ?? 1));
    const safeScore = Math.max(0, Number(score) || 0);
    const timerMs = Math.max(0, Number(adventure.timerRemainingMs ?? 0));
    const timerSec = Math.max(0, Math.ceil(timerMs / 1000));
    const progress = Math.max(0, Math.min(1, safeScore / targetScore));
    const progressPercent = Math.round(progress * 100);
    const iconRemaining = objective.iconRemaining ?? { star: 0, ruby: 0 };
    const iconTargets = objective.iconTargets ?? { star: 0, ruby: 0 };

    root.innerHTML = "";

    const scoreObjective = document.createElement("div");
    scoreObjective.className = "adventure-score-objective";
    scoreObjective.innerHTML = `
      <div class="adventure-timer-chip" data-state="${timerSec <= 10 ? "danger" : "normal"}">
        &#9201; ${timerSec}s
      </div>
      <div class="adventure-score-progress">
        <div class="adventure-score-progress-track">
          <div class="adventure-score-progress-fill" style="width:${progressPercent}%"></div>
        </div>
        <div class="adventure-score-progress-meta">
          <span>${this.formatScore(safeScore)}</span>
          <span>${this.formatScore(targetScore)}</span>
        </div>
      </div>
    `;
    root.appendChild(scoreObjective);

    const iconWrap = document.createElement("div");
    iconWrap.className = "adventure-score-icons";
    ["star", "ruby"].forEach((type) => {
      const target = Number(iconTargets[type] ?? 0);
      if (target <= 0) {
        return;
      }
      const remain = Math.max(0, Number(iconRemaining[type] ?? 0));
      const chip = document.createElement("div");
      chip.className = "adventure-score-icon-chip";
      chip.dataset.icon = type;
      chip.innerHTML = `
        <span class="adventure-score-icon"></span>
        <span class="adventure-score-icon-value">${remain}</span>
      `;
      const icon = chip.querySelector(".adventure-score-icon");
      if (icon instanceof HTMLElement) {
        icon.style.backgroundImage = `url("${ADVENTURE_SCORE_HUD_ICONS[type]}")`;
      }
      iconWrap.appendChild(chip);
    });
    if (iconWrap.childElementCount > 0) {
      root.appendChild(iconWrap);
    }
  }

  renderAdventureMarkers(adventure) {
    const layer = this.elements.adventureMarkerLayer;
    if (!layer) {
      return;
    }
    layer.innerHTML = "";
    if (!adventure || !Array.isArray(adventure.markers) || !adventure.markers.length) {
      return;
    }
    const boardRect = this.elements.board.getBoundingClientRect();
    const cellSize = boardRect.width / this.boardSize;
    const markerSize = Math.max(22, Math.min(34, cellSize * 0.66));

    adventure.markers.forEach((marker) => {
      if (marker?.collected) {
        return;
      }
      const iconType = marker?.iconType;
      if (iconType !== "star" && iconType !== "ruby") {
        return;
      }
      const markerEl = document.createElement("span");
      markerEl.className = "adventure-marker";
      markerEl.classList.add("adventure-marker--static");
      markerEl.style.width = `${markerSize}px`;
      markerEl.style.height = `${markerSize}px`;
      markerEl.style.left = `${(marker.col + 0.5) * cellSize}px`;
      markerEl.style.top = `${(marker.row + 0.5) * cellSize}px`;
      markerEl.style.backgroundImage = `url("${ADVENTURE_SCORE_HUD_ICONS[iconType]}")`;
      layer.appendChild(markerEl);
    });
  }

  syncAdventureCounterValues() {
    const hud = this.elements.adventureHud;
    if (!hud) {
      return;
    }
    ["blue", "yellow", "red"].forEach((type) => {
      const chip = hud.querySelector(`.adventure-counter-chip[data-type="${type}"]`);
      if (!(chip instanceof HTMLElement)) {
        return;
      }
      const valueEl = chip.querySelector(".adventure-counter-value");
      if (valueEl) {
        valueEl.textContent = String(Number(this.adventureDisplay.remaining?.[type] ?? 0));
      }
    });
  }

  resolveAdventureCollectTone(marker) {
    if (marker?.iconType === "star") {
      return "yellow";
    }
    if (marker?.iconType === "ruby") {
      return "red";
    }
    return marker?.type ?? "yellow";
  }

  resolveAdventureCollectIconUrl(marker) {
    if (marker?.iconType && ADVENTURE_SCORE_HUD_ICONS[marker.iconType]) {
      return ADVENTURE_SCORE_HUD_ICONS[marker.iconType];
    }
    return ADVENTURE_VISUALS[marker?.type]?.icon ?? ADVENTURE_VISUALS.yellow.icon;
  }

  resolveAdventureCollectHudTarget(hud, marker) {
    if (!hud || !marker) {
      return { targetChip: null, targetIcon: null };
    }
    if (marker.iconType === "star" || marker.iconType === "ruby") {
      const targetChip = hud.querySelector(`.adventure-score-icon-chip[data-icon="${marker.iconType}"]`);
      const targetIcon = targetChip?.querySelector(".adventure-score-icon");
      return {
        targetChip: targetChip instanceof HTMLElement ? targetChip : null,
        targetIcon: targetIcon instanceof HTMLElement ? targetIcon : null,
      };
    }
    const targetChip = hud.querySelector(`.adventure-counter-chip[data-type="${marker.type}"]`);
    const targetIcon = targetChip?.querySelector(".adventure-counter-icon-wrap");
    return {
      targetChip: targetChip instanceof HTMLElement ? targetChip : null,
      targetIcon: targetIcon instanceof HTMLElement ? targetIcon : null,
    };
  }

  playAdventureCollectFeedback(payload) {
    const style = payload?.style ?? "premium";
    if (style === "raw") {
      this.playAdventureCollectFeedbackRaw(payload);
      return;
    }
    if (style === "phase1") {
      this.playAdventureCollectFeedbackPhase1(payload);
      return;
    }
    this.playAdventureCollectFeedbackPremium(payload);
  }

  playAdventureCollectFeedbackRaw(payload) {
    const layer = this.elements.particleLayer;
    const hud = this.elements.adventureHud;
    if (!layer || !hud || !Array.isArray(payload?.collectedMarkers)) {
      return;
    }
    this.pruneAdventureCollectedCells();
    const boardRect = this.elements.board.getBoundingClientRect();
    const cellSize = boardRect.width / this.boardSize;
    const layerRect = layer.getBoundingClientRect();

    payload.collectedMarkers.forEach((marker, index) => {
      if (!marker?.type) {
        return;
      }
      this.trackAdventureCollectedCell(marker.row, marker.col);
      const popProfile = this.resolveAdventureCollectPopProfile(marker.row);
      const markerTone = this.resolveAdventureCollectTone(marker);
      const { targetChip, targetIcon } = this.resolveAdventureCollectHudTarget(hud, marker);
      if (!(targetIcon instanceof HTMLElement)) {
        return;
      }

      const rawSourceX = ((boardRect.left + ((marker.col + 0.5) * cellSize)) - layerRect.left);
      // Keep the rising icon fully visible on far-left / far-right board cells.
      const sourceX = Math.max(24, Math.min(layerRect.width - 24, rawSourceX));
      const sourceY =
        ((boardRect.top + ((marker.row + 0.5) * cellSize)) - layerRect.top) +
        Number(popProfile.sourceOffsetY ?? 0);
      const targetRect = targetIcon.getBoundingClientRect();
      const targetX = (targetRect.left + (targetRect.width / 2)) - layerRect.left;
      const targetY = (targetRect.top + (targetRect.height / 2)) - layerRect.top;
      const fly = document.createElement("span");
      fly.className = "adventure-fly-gem adventure-fly-gem--raw";
      fly.style.left = `${sourceX}px`;
      fly.style.top = `${sourceY}px`;
      fly.style.backgroundImage = `url("${this.resolveAdventureCollectIconUrl(marker)}")`;
      layer.appendChild(fly);
      this.adventureFlyActive += 1;
      this.spawnAdventureCollectPulse(sourceX, sourceY, markerTone);

      const delay = index * 54;
      window.setTimeout(() => {
        fly.style.transform = `translate3d(${targetX - sourceX}px, ${targetY - sourceY}px, 0) scale(0.38)`;
        fly.style.opacity = "0.08";
      }, delay + 86);

      window.setTimeout(() => {
        this.applyAdventureCounterImpact({
          markerType: markerTone,
          targetChip,
          targetX,
          targetY,
          pulseDurationMs: 220,
        });
        fly.remove();
        this.adventureFlyActive = Math.max(0, this.adventureFlyActive - 1);
        if (this.adventureFlyActive === 0 && payload?.remaining) {
          this.adventureDisplay.remaining = { ...payload.remaining };
          this.flushDeferredAdventureCompleteModal();
        }
      }, delay + 612);
    });
  }

  playAdventureCollectFeedbackPremium(payload) {
    const layer = this.elements.particleLayer;
    const hud = this.elements.adventureHud;
    if (!layer || !hud || !Array.isArray(payload?.collectedMarkers)) {
      return;
    }
    this.pruneAdventureCollectedCells();
    const boardRect = this.elements.board.getBoundingClientRect();
    const cellSize = boardRect.width / this.boardSize;
    const layerRect = layer.getBoundingClientRect();
    const baseSpec = payload?.debugSlow
      ? {
        ...ADVENTURE_COLLECT_SPEC,
        popMs: 340,
        travelDelayMs: 64,
        travelMs: 1480,
        impactHoldMs: 180,
        trailIntervalMs: 0,
        sparkleIntervalMs: 0,
        enableFlightSparkles: false,
      }
      : ADVENTURE_COLLECT_SPEC;
    const holdUntilGlideMs = Math.max(0, Number(payload?.collectAfterClearMs ?? 0));
    const spec = {
      ...baseSpec,
      // Desired sequence: clear + pop now, glide starts after clear visual settles.
      travelDelayMs: Math.max(baseSpec.travelDelayMs ?? 0, holdUntilGlideMs),
    };
    const typeOrder = { blue: 0, yellow: 1, red: 2 };
    const orderedMarkers = [...payload.collectedMarkers].sort((a, b) => {
      const ta = typeOrder[a?.type] ?? 99;
      const tb = typeOrder[b?.type] ?? 99;
      if (ta !== tb) {
        return ta - tb;
      }
      return (a.col - b.col) || (b.row - a.row);
    });
    const collectedByType = { blue: 0, yellow: 0, red: 0 };
    orderedMarkers.forEach((marker) => {
      if (marker?.type && Object.hasOwn(collectedByType, marker.type)) {
        collectedByType[marker.type] += 1;
      }
    });
    this.adventureDisplay.remaining = {
      blue: Math.max(0, Number(payload?.remaining?.blue ?? 0) + collectedByType.blue),
      yellow: Math.max(0, Number(payload?.remaining?.yellow ?? 0) + collectedByType.yellow),
      red: Math.max(0, Number(payload?.remaining?.red ?? 0) + collectedByType.red),
    };
    this.syncAdventureCounterValues();
    orderedMarkers.forEach((marker, index) => {
      if (!marker?.type) {
        return;
      }
      this.trackAdventureCollectedCell(marker.row, marker.col);
      const markerTone = this.resolveAdventureCollectTone(marker);
      const { targetChip, targetIcon } = this.resolveAdventureCollectHudTarget(hud, marker);
      if (!(targetIcon instanceof HTMLElement)) {
        return;
      }

      const popProfile = this.resolveAdventureCollectPopProfile(marker.row);
      const sourceX = ((boardRect.left + ((marker.col + 0.5) * cellSize)) - layerRect.left);
      const sourceY =
        ((boardRect.top + ((marker.row + 0.5) * cellSize)) - layerRect.top) +
        Number(popProfile.sourceOffsetY ?? 0);
      const targetRect = targetIcon.getBoundingClientRect();
      const targetX = (targetRect.left + (targetRect.width / 2)) - layerRect.left;
      const targetY = (targetRect.top + (targetRect.height / 2)) - layerRect.top;
      const delay = index * 92;

      const restoreCellVisual = this.applyObjectiveCellShellState(marker.row, marker.col, { restoreMode: "empty" });
      window.setTimeout(() => {
        // As soon as icon rise starts, remove the gold base to keep flow minimal and clean.
        restoreCellVisual?.();
      }, delay + 90);

      const fly = this.createAdventureEssenceCore(markerTone, sourceX, sourceY, { popProfile });
      layer.appendChild(fly);
      this.adventureFlyActive += 1;
      // Premium collect: keep source area clean; no burst/ring under icon.

      this.animateAdventureCollectGlide({
        fly,
        type: markerTone,
        sourceX,
        sourceY,
        targetX,
        targetY,
        impactRadiusPx: Math.max(8, Math.min(targetRect.width, targetRect.height) * 0.55),
        delayMs: delay,
        popDirection: popProfile.direction,
        spec,
        onPopPeak: () => {
          fly.classList.add("adventure-essence-core--shine");
          // Keep this moment subtle to avoid noisy / cheap source FX.
        },
        onImpact: () => {
          this.applyAdventureCounterImpact({
            markerType: markerTone,
            targetChip,
            targetX,
            targetY,
            pulseDurationMs: 320,
          });
        },
        onDone: () => {
          fly.remove();
          this.adventureFlyActive = Math.max(0, this.adventureFlyActive - 1);
          if (this.adventureFlyActive === 0 && payload?.remaining) {
            this.adventureDisplay.remaining = { ...payload.remaining };
            this.flushDeferredAdventureCompleteModal();
          }
        },
      });
    });
  }

  playAdventureCollectFeedbackPhase1(payload) {
    const layer = this.elements.particleLayer;
    if (!layer || !Array.isArray(payload?.collectedMarkers)) {
      return;
    }
    this.pruneAdventureCollectedCells();
    const boardRect = this.elements.board.getBoundingClientRect();
    const cellSize = boardRect.width / this.boardSize;
    const layerRect = layer.getBoundingClientRect();
    const orderedMarkers = [...payload.collectedMarkers].sort((a, b) => (a.col - b.col) || (b.row - a.row));

    orderedMarkers.forEach((marker, index) => {
      if (!marker?.type) {
        return;
      }
      this.trackAdventureCollectedCell(marker.row, marker.col);
      const markerTone = this.resolveAdventureCollectTone(marker);
      const popProfile = this.resolveAdventureCollectPopProfile(marker.row);
      const sourceX = ((boardRect.left + ((marker.col + 0.5) * cellSize)) - layerRect.left);
      const sourceY =
        ((boardRect.top + ((marker.row + 0.5) * cellSize)) - layerRect.top) +
        Number(popProfile.sourceOffsetY ?? 0);
      const delay = index * 74;
      const restoreCellVisual = this.applyObjectiveCellShellState(marker.row, marker.col, { restoreMode: "empty" });

      const core = this.createAdventureEssenceCore(markerTone, sourceX, sourceY, { popProfile });
      core.classList.add("adventure-essence-core--phase1");
      layer.appendChild(core);

      window.setTimeout(() => {
        core.classList.add("adventure-essence-core--shine");
        this.spawnAdventureCollectSheen(sourceX, sourceY, markerTone);
      }, delay + 160);
      window.setTimeout(() => {
        // Match runtime: icon up, base disappears immediately.
        restoreCellVisual?.();
      }, delay + 90);

      window.setTimeout(() => {
        core.remove();
      }, delay + 1160);
    });
  }

  applyObjectiveCellShellState(row, col, options = {}) {
    const { restoreMode = "empty" } = options;
    const cell = this.cells.get(this.cellKey(row, col));
    if (!(cell instanceof HTMLElement)) {
      return null;
    }
    const previousBackground = cell.style.backgroundImage;
    const hadObjectiveClass = cell.classList.contains("cell--objective");
    const hadFilledClass = cell.classList.contains("cell--filled");
    const previousTone = cell.dataset.tone;
    cell.classList.remove("cell--clear-hidden");
    cell.style.backgroundImage = `url("${ADVENTURE_COLLECT_SHELL_ICON}")`;
    cell.classList.add("cell--objective-shell");
    return () => {
      if (restoreMode === "previous") {
        // Preview-only mode can restore previous visual snapshot.
        cell.style.backgroundImage = previousBackground;
        cell.classList.toggle("cell--objective", hadObjectiveClass);
        cell.classList.toggle("cell--filled", hadFilledClass);
        if (typeof previousTone === "string") {
          cell.dataset.tone = previousTone;
        } else {
          delete cell.dataset.tone;
        }
      } else {
        // Runtime mode: collected objective slot should stay empty after shell breaks.
        cell.style.removeProperty("background-image");
        cell.classList.remove("cell--objective", "cell--filled", "cell--clear-hidden");
        delete cell.dataset.tone;
      }
      cell.classList.remove("cell--objective-shell");
    };
  }

  spawnAdventureShellShatter(x, y, type) {
    const point = this.mapLayerPointToBoardFx(x, y);
    if (!point) {
      return;
    }
    const shardCount =
      ADVENTURE_SHELL_SHATTER.shards.min +
      Math.floor(Math.random() * ((ADVENTURE_SHELL_SHATTER.shards.max - ADVENTURE_SHELL_SHATTER.shards.min) + 1));
    const tone = ADVENTURE_COLLECT_VFX[type] ?? ADVENTURE_COLLECT_VFX.yellow;
    const particleScale = this.fxProfile.particleScale ?? 1;

    for (let i = 0; i < shardCount; i += 1) {
      const angle = ((Math.PI * 2) / shardCount) * i + ((Math.random() - 0.5) * 0.4);
      const speed =
        ADVENTURE_SHELL_SHATTER.speed.min +
        (Math.random() * (ADVENTURE_SHELL_SHATTER.speed.max - ADVENTURE_SHELL_SHATTER.speed.min));
      const lift =
        ADVENTURE_SHELL_SHATTER.lift.min +
        (Math.random() * (ADVENTURE_SHELL_SHATTER.lift.max - ADVENTURE_SHELL_SHATTER.lift.min));
      const dx = Math.cos(angle) * speed;
      const dy = (Math.sin(angle) * speed) - lift;
      const rot = (Math.random() * 180) - 90;
      const size =
        ADVENTURE_SHELL_SHATTER.size.min +
        Math.round(Math.random() * (ADVENTURE_SHELL_SHATTER.size.max - ADVENTURE_SHELL_SHATTER.size.min));
      const life =
        ADVENTURE_SHELL_SHATTER.lifeMs.min +
        Math.round(Math.random() * (ADVENTURE_SHELL_SHATTER.lifeMs.max - ADVENTURE_SHELL_SHATTER.lifeMs.min));

      if (!this.canSpawnDomFx("shellShard")) {
        continue;
      }
      const lifeFrames = scaleLife(Math.max(14, Math.round(life / 16.67)));
      this.pushFxParticle({
        x: point.x,
        y: point.y,
        prevX: point.x,
        prevY: point.y,
        vx: dx * 0.06,
        vy: dy * 0.06,
        radius: Math.max(2.4, (size * 0.46) * particleScale),
        width: Math.max(3.2, size * 0.72 * particleScale),
        height: Math.max(2.2, (size - 2) * 0.44 * particleScale),
        type: "woodchip",
        color: tone.ring,
        colorAccent: tone.flash,
        colorDeep: tone.glow,
        alpha: 0.9,
        baseAlpha: 0.9,
        gravityScale: 0.44 + (Math.random() * 0.26),
        drag: 0.976,
        rotation: 0,
        rotationSpeedDeg: rot * 0.4,
        maxLife: lifeFrames,
        life: lifeFrames,
        trail: [],
        delayFrames: 0,
      });
    }
    this.startFxLoop();
  }

  spawnAdventureGoldCellShatter(row, col, options = {}) {
    const intensity = Math.max(0.8, Math.min(1.4, Number(options.intensity ?? 1)));
    const boardRect = this.elements.board.getBoundingClientRect();
    if (!boardRect.width || !boardRect.height) {
      return;
    }
    const cellSize = boardRect.width / this.boardSize;
    const x = (col + 0.5) * cellSize;
    const y = (row + 0.5) * cellSize;
    const particleScale = this.fxProfile.particleScale ?? 1;

    const flashLife = scaleLife(Math.round((10 + (intensity * 2)) * 1.05));
    this.fxFlashes.push({
      x,
      y,
      radius: Math.max(18, cellSize * 0.68),
      alpha: 0.46,
      colorCore: ADVENTURE_GOLD_SHATTER.core,
      colorOuter: ADVENTURE_GOLD_SHATTER.main,
      maxLife: flashLife,
      life: flashLife,
      delayFrames: 0,
    });

    const ringLife = scaleLife(Math.round((12 + (intensity * 3)) * 1.05));
    this.fxRings.push({
      x,
      y,
      innerRadius: Math.max(3, cellSize * 0.08),
      outerRadius: Math.max(16, cellSize * 0.72),
      radius: Math.max(3, cellSize * 0.08),
      color: ADVENTURE_GOLD_SHATTER.main,
      alpha: 0.42,
      life: ringLife,
      maxLife: ringLife,
      thickness: 1.9,
      delayFrames: 0,
    });

    const burstLife = scaleLife(Math.round((14 + (intensity * 5)) * 1.04));
    this.fxBursts.push({
      x,
      y,
      radius: Math.max(7, cellSize * 0.18),
      maxRadius: Math.max(18, cellSize * 0.62),
      alpha: 0.34,
      alphaDecay: 0.95,
      colorCore: ADVENTURE_GOLD_SHATTER.sparkle,
      colorOuter: ADVENTURE_GOLD_SHATTER.main,
      life: burstLife,
      maxLife: burstLife,
      delayFrames: 0,
    });

    const chunkCount = Math.max(8, Math.round((14 + (intensity * 5)) * particleScale));
    for (let i = 0; i < chunkCount; i += 1) {
      const angle = ((Math.PI * 2 * i) / chunkCount) + ((Math.random() - 0.5) * 0.34);
      const speed = 2.2 + (Math.random() * (1.8 * intensity));
      const life = scaleLife(Math.round((17 + Math.random() * 8) * (1 + (0.15 * intensity))));
      const pick = Math.random();
      const color = pick > 0.72
        ? ADVENTURE_GOLD_SHATTER.core
        : (pick > 0.36 ? ADVENTURE_GOLD_SHATTER.main : ADVENTURE_GOLD_SHATTER.edge);

      const kindRoll = Math.random();
      if (kindRoll > 0.62) {
        this.pushFxParticle({
          x,
          y,
          prevX: x,
          prevY: y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          radius: 1.6 + (Math.random() * 1.3),
          type: "streak",
          streakLength: 6 + (Math.random() * 6),
          color,
          alpha: 0.95,
          baseAlpha: 0.95,
          gravityScale: 0.58,
          drag: 0.982,
          rotation: 0,
          rotationSpeedDeg: 0,
          fadePower: 1.4,
          turbulenceAmp: 0.028 + (Math.random() * 0.04),
          turbulenceFreq: 0.08 + (Math.random() * 0.08),
          turbulencePhase: Math.random() * Math.PI * 2,
          turbulenceDir: Math.random() * Math.PI * 2,
          life,
          maxLife: life,
          trail: [],
          delayFrames: 0,
        });
      } else {
        this.pushFxParticle({
          x,
          y,
          prevX: x,
          prevY: y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          radius: 2.2 + (Math.random() * 2),
          type: "chunk",
          streakLength: 0,
          color,
          colorDeep: ADVENTURE_GOLD_SHATTER.deep,
          alpha: 0.94,
          baseAlpha: 0.94,
          gravityScale: 0.92,
          drag: 0.968,
          rotation: Math.random() * Math.PI * 2,
          rotationSpeedDeg: (Math.random() * 16) - 8,
          fadePower: 1.5,
          turbulenceAmp: 0.03 + (Math.random() * 0.05),
          turbulenceFreq: 0.07 + (Math.random() * 0.08),
          turbulencePhase: Math.random() * Math.PI * 2,
          turbulenceDir: Math.random() * Math.PI * 2,
          life,
          maxLife: life,
          trail: [],
          delayFrames: 0,
        });
      }
    }
  }

  createAdventureCollectShell(type, sourceX, sourceY) {
    const shell = document.createElement("span");
    shell.className = "adventure-collect-shell";
    shell.style.left = `${sourceX}px`;
    shell.style.top = `${sourceY}px`;
    shell.style.backgroundImage = `url("${ADVENTURE_COLLECT_SHELL_ICON}")`;
    shell.style.setProperty("--collect-ring", (ADVENTURE_COLLECT_VFX[type] ?? ADVENTURE_COLLECT_VFX.blue).ring);
    return shell;
  }

  resolveAdventureCollectPopProfile(row) {
    if (!Number.isInteger(row)) {
      return {
        direction: "up",
        ...ADVENTURE_COLLECT_POP_CONFIG.up,
      };
    }
    if (row < ADVENTURE_COLLECT_POP_CONFIG.topRows) {
      const edge = row <= 0;
      return {
        direction: "down",
        ...(edge ? ADVENTURE_COLLECT_POP_CONFIG.downEdge : ADVENTURE_COLLECT_POP_CONFIG.down),
      };
    }
    if (row >= (this.boardSize - ADVENTURE_COLLECT_POP_CONFIG.bottomRows)) {
      return {
        direction: "up",
        ...ADVENTURE_COLLECT_POP_CONFIG.upEdge,
      };
    }
    return {
      direction: "up",
      ...ADVENTURE_COLLECT_POP_CONFIG.up,
    };
  }

  createAdventureEssenceCore(type, sourceX, sourceY, options = {}) {
    const popProfile = options.popProfile && typeof options.popProfile === "object"
      ? options.popProfile
      : this.resolveAdventureCollectPopProfile(-1);
    const fly = document.createElement("span");
    fly.className = "adventure-essence-core";
    fly.dataset.coreType = type;
    fly.dataset.popDirection = popProfile.direction === "down" ? "down" : "up";
    fly.style.left = `${sourceX}px`;
    fly.style.top = `${sourceY}px`;
    fly.style.backgroundImage = `url("${ADVENTURE_COLLECT_CORE[type] ?? ADVENTURE_COLLECT_CORE.blue}")`;
    fly.style.setProperty("--collect-tone", type);
    fly.style.setProperty("--core-glow", "rgba(255, 255, 255, 0.64)");
    fly.style.setProperty("--essence-pop-peak-y", `${Number(popProfile.peakY ?? -34)}px`);
    fly.style.setProperty("--essence-pop-settle-y", `${Number(popProfile.settleY ?? -29)}px`);
    fly.style.setProperty("--essence-pop-end-y", `${Number(popProfile.endY ?? -31)}px`);
    return fly;
  }

  createAdventureFlyGem(type, sourceX, sourceY) {
    const fly = document.createElement("span");
    fly.className = "adventure-fly-gem";
    fly.style.left = `${sourceX}px`;
    fly.style.top = `${sourceY}px`;
    fly.style.setProperty("--collect-tone", type);

    const shadow = document.createElement("span");
    shadow.className = "adventure-fly-gem-shadow";
    fly.appendChild(shadow);

    const glow = document.createElement("span");
    glow.className = "adventure-fly-gem-glow";
    fly.appendChild(glow);

    const core = document.createElement("span");
    core.className = "adventure-fly-gem-core";
    core.style.backgroundImage = `url("${ADVENTURE_VISUALS[type].icon}")`;
    fly.appendChild(core);

    const shine = document.createElement("span");
    shine.className = "adventure-fly-gem-shine";
    fly.appendChild(shine);

    return fly;
  }

  animateAdventureCollectGlide({
    fly,
    type,
    sourceX,
    sourceY,
    targetX,
    targetY,
    impactRadiusPx = 10,
    delayMs = 0,
    popDirection = "up",
    spec = ADVENTURE_COLLECT_SPEC,
    onPopPeak,
    onImpact,
    onDone,
  }) {
    const layer = this.elements.particleLayer;
    if (!layer || !(fly instanceof HTMLElement)) {
      onDone?.();
      return;
    }
    const startAt = performance.now() + Math.max(0, delayMs);
    const popEndAt = startAt + spec.popMs;
    const travelStartAt = popEndAt + spec.travelDelayMs;
    const travelEndAt = travelStartAt + spec.travelMs;
    const doneAt = travelEndAt + spec.impactHoldMs;
    const popSign = popDirection === "down" ? 1 : -1;
    const sourcePoint = { x: sourceX, y: sourceY + (spec.popLiftPx * popSign) };
    const offsetX = targetX - sourceX;
    const offsetY = targetY - sourceY;
    const controlPoint = {
      x: lerp(sourceX, targetX, 0.62) + Math.max(-12, Math.min(12, offsetX * spec.curveSideFactor)),
      y: Math.min(sourceY, targetY) - Math.max(spec.curveHeightMin, Math.abs(offsetY) * spec.curveHeightFactor),
    };
    const targetPoint = { x: targetX, y: targetY };
    this.adventureGlideTasks.add({
      fly,
      type,
      spec,
      sourceX,
      sourceY,
      sourcePoint,
      controlPoint,
      targetPoint,
      startAt,
      popEndAt,
      travelStartAt,
      travelEndAt,
      doneAt,
      popSign,
      impactTriggerProgress: 0.975,
      impactTriggerDistance: Math.max(6, Number(impactRadiusPx) || 10),
      lastTrailAt: 0,
      lastSparkAt: 0,
      hasSignaledPopPeak: false,
      hasImpacted: false,
      onPopPeak,
      onImpact,
      onDone,
    });
    this.startAdventureGlideLoop();
  }

  startAdventureGlideLoop() {
    if (this.adventureGlideRafId || this.fxSuspended) {
      return;
    }
    const tick = (now) => {
      this.adventureGlideRafId = 0;
      if (this.fxSuspended) {
        return;
      }
      this.advanceAdventureCollectGlides(now);
      if (this.adventureGlideTasks.size) {
        this.adventureGlideRafId = requestAnimationFrame(tick);
      }
    };
    this.adventureGlideRafId = requestAnimationFrame(tick);
  }

  advanceAdventureCollectGlides(now) {
    this.adventureGlideTasks.forEach((task) => {
      const done = this.advanceAdventureCollectGlideTask(task, now);
      if (!done) {
        return;
      }
      this.adventureGlideTasks.delete(task);
      task.onDone?.();
    });
  }

  advanceAdventureCollectGlideTask(task, now) {
    const {
      fly,
      type,
      spec,
      sourceX,
      sourceY,
      sourcePoint,
      controlPoint,
      targetPoint,
      startAt,
      popEndAt,
      travelStartAt,
      travelEndAt,
      doneAt,
      popSign,
    } = task;

    if (!fly.isConnected) {
      return true;
    }
    if (now < startAt) {
      return false;
    }

    if (now < popEndAt) {
      const popT = clamp01((now - startAt) / Math.max(1, spec.popMs));
      const popEase = easeOutBack(popT);
      const lift = Math.sin(popT * Math.PI) * spec.popLiftPx;
      const scale = lerp(spec.popScaleFrom, spec.popScalePeak, popEase);
      const rotation = lerp(spec.popRotateFrom, spec.popRotateTo, popEase);
      const alpha = lerp(0.08, 1, popEase);
      fly.style.transform = `translate(-50%, -50%) translate3d(0px, ${(lift * popSign).toFixed(2)}px, 0) scale(${scale.toFixed(3)}) rotate(${rotation.toFixed(2)}deg)`;
      fly.style.opacity = `${alpha.toFixed(3)}`;
      if (!task.hasSignaledPopPeak && popT >= 0.55) {
        task.hasSignaledPopPeak = true;
        task.onPopPeak?.();
      }
      return false;
    }

    if (now < travelStartAt) {
      return false;
    }

    if (now <= travelEndAt) {
      const travelT = clamp01((now - travelStartAt) / Math.max(1, spec.travelMs));
      const easeT = easeOutCubic(travelT);
      const point = quadraticBezierPoint(sourcePoint, controlPoint, targetPoint, easeT);
      const bob = Math.sin(easeT * Math.PI * 2.6) * (spec.travelBobPx ?? 0) * (1 - easeT);
      const pointY = point.y + bob;
      const scale = lerp(spec.travelScaleFrom, spec.travelScaleTo, easeT);
      const alpha = lerp(0.98, 0.28, easeT);
      const rot = lerp(spec.travelRotateFrom, spec.travelRotateTo, easeT);
      fly.style.transform = `translate(-50%, -50%) translate3d(${(point.x - sourceX).toFixed(2)}px, ${(pointY - sourceY).toFixed(2)}px, 0) scale(${scale.toFixed(3)}) rotate(${rot.toFixed(2)}deg)`;
      fly.style.opacity = `${Math.max(0.08, alpha).toFixed(3)}`;

      if (!task.hasImpacted) {
        const dx = targetPoint.x - point.x;
        const dy = targetPoint.y - pointY;
        const dist = Math.sqrt((dx * dx) + (dy * dy));
        if (travelT >= task.impactTriggerProgress || dist <= task.impactTriggerDistance) {
          task.hasImpacted = true;
          task.onImpact?.();
        }
      }

      if ((spec.trailIntervalMs ?? 0) > 0 && now - task.lastTrailAt >= spec.trailIntervalMs) {
        this.spawnAdventureCollectTrail(
          type,
          point.x,
          pointY,
          Math.max(spec.trailScaleMin, scale * spec.trailScaleFactor),
        );
        task.lastTrailAt = now;
      }
      if (
        (spec.enableFlightSparkles ?? false) &&
        (spec.sparkleIntervalMs ?? 0) > 0 &&
        now - task.lastSparkAt >= spec.sparkleIntervalMs
      ) {
        this.spawnAdventureCollectSparkle(
          type,
          point.x + ((Math.random() - 0.5) * 6),
          pointY + ((Math.random() - 0.5) * 6),
          Math.max(0.56, scale * 0.9),
        );
        task.lastSparkAt = now;
      }
      return false;
    }

    if (!task.hasImpacted) {
      task.hasImpacted = true;
      task.onImpact?.();
    }
    fly.style.opacity = "0";
    return now >= doneAt;
  }

  mapLayerPointToBoardFx(x, y) {
    const boardRect = this.elements.board?.getBoundingClientRect?.();
    if (!boardRect?.width || !boardRect?.height) {
      return null;
    }
    let boardX = Number(x);
    let boardY = Number(y);
    if (!Number.isFinite(boardX) || !Number.isFinite(boardY)) {
      return null;
    }
    const layerRect = this.elements.particleLayer?.getBoundingClientRect?.();
    if (layerRect?.width && layerRect?.height) {
      boardX -= (boardRect.left - layerRect.left);
      boardY -= (boardRect.top - layerRect.top);
    }
    if (
      boardX < -48 ||
      boardY < -48 ||
      boardX > (boardRect.width + 48) ||
      boardY > (boardRect.height + 48)
    ) {
      return null;
    }
    return { x: boardX, y: boardY };
  }

  spawnAdventureCollectTrail(type, x, y, scale = 0.6) {
    const point = this.mapLayerPointToBoardFx(x, y);
    if (!point || !this.canSpawnDomFx("collectPulse")) {
      return;
    }
    const trailScale = Math.max(0.26, Math.min(1, scale));
    const trailLife = scaleLife(Math.round(18 + (trailScale * 12)));
    const tone = ADVENTURE_COLLECT_VFX[type] ?? ADVENTURE_COLLECT_VFX.blue;
    this.pushFxParticle({
      x: point.x,
      y: point.y,
      prevX: point.x,
      prevY: point.y,
      vx: (Math.random() - 0.5) * 0.8,
      vy: -0.6 - (Math.random() * 0.8),
      radius: (2.8 + (trailScale * 3.6)) * (this.fxProfile.particleScale ?? 1),
      type: "smoke",
      color: tone.glow,
      alpha: 0.22 + (trailScale * 0.12),
      baseAlpha: 0.28 + (trailScale * 0.14),
      growth: 0.16 + (trailScale * 0.16),
      gravityScale: 0.22,
      drag: 0.965,
      rotation: 0,
      rotationSpeedDeg: 0,
      maxLife: trailLife,
      life: trailLife,
      trail: [],
      delayFrames: 0,
    });
    this.startFxLoop();
  }

  spawnAdventureCollectSparkle(type, x, y, scale = 0.8) {
    const point = this.mapLayerPointToBoardFx(x, y);
    if (!point || !this.canSpawnDomFx("collectPulse")) {
      return;
    }
    const tone = ADVENTURE_COLLECT_VFX[type] ?? ADVENTURE_COLLECT_VFX.blue;
    const sparkScale = Math.max(0.45, Math.min(1.4, scale));
    const flashLife = scaleLife(Math.round(10 + (sparkScale * 8)));
    this.fxFlashes.push({
      x: point.x,
      y: point.y,
      radius: Math.max(10, 18 * sparkScale),
      alpha: 0.44,
      colorCore: tone.flash,
      colorOuter: tone.glow,
      maxLife: flashLife,
      life: flashLife,
      delayFrames: 0,
    });

    const sparkCount = Math.max(3, Math.round(4 * sparkScale));
    for (let i = 0; i < sparkCount; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.4 + (Math.random() * 2.4);
      const life = scaleLife(Math.round(12 + (Math.random() * 10)));
      this.pushFxParticle({
        x: point.x,
        y: point.y,
        prevX: point.x,
        prevY: point.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: (1.8 + (Math.random() * 1.8)) * (this.fxProfile.particleScale ?? 1),
        type: "dot",
        color: Math.random() > 0.5 ? tone.ring : tone.flash,
        alpha: 0.86,
        baseAlpha: 0.86,
        growth: 0,
        gravityScale: 0.14,
        drag: 0.97,
        rotation: 0,
        rotationSpeedDeg: 0,
        maxLife: life,
        life,
        trail: [],
        delayFrames: 0,
      });
    }
    this.startFxLoop();
  }

  spawnAdventureCollectSheen(x, y, type) {
    const point = this.mapLayerPointToBoardFx(x, y);
    if (!point || !this.canSpawnDomFx("collectPulse")) {
      return;
    }
    const vfx = ADVENTURE_COLLECT_VFX[type] ?? ADVENTURE_COLLECT_VFX.blue;
    const life = ADVENTURE_BEAM_LIFE_FRAMES;
    this.fxAdventureBeams.push({
      x: point.x,
      y: point.y,
      height: 44,
      width: 34,
      colorA: vfx.ring,
      colorB: vfx.glow,
      alpha: 0.58,
      life,
      maxLife: life,
      delayFrames: 0,
    });
    this.startFxLoop();
  }

  spawnAdventureHudImpact(x, y, type) {
    this.spawnAdventureCollectPulse(x, y, type);
  }

  spawnAdventureColumnBeam({
    type,
    x,
    topY,
    height,
    delayMs = 0,
  }) {
    const point = this.mapLayerPointToBoardFx(x, topY);
    if (!point || !this.canSpawnDomFx("columnBeam")) {
      return;
    }
    const tone = ADVENTURE_COLLECT_VFX[type] ?? ADVENTURE_COLLECT_VFX.blue;
    const life = ADVENTURE_BEAM_LIFE_FRAMES;
    this.fxAdventureBeams.push({
      x: point.x,
      y: point.y + (Math.max(12, Number(height) || 0) * 0.5),
      height: Math.max(16, Number(height) || 0),
      width: 24,
      colorA: tone.ring,
      colorB: tone.glow,
      alpha: 0.6,
      life,
      maxLife: life,
      delayFrames: Math.max(0, Math.round(Number(delayMs) / 16.67) || 0),
    });
    this.startFxLoop();
  }

  applyAdventureCounterImpact({
    markerType,
    targetChip,
    targetX,
    targetY,
    pulseDurationMs = 220,
    retryCount = 0,
  }) {
    const hud = this.elements.adventureHud;
    const liveChip = hud?.querySelector(`.adventure-counter-chip[data-type="${markerType}"]`);
    const chip = liveChip instanceof HTMLElement ? liveChip : targetChip;
    if (!(chip instanceof HTMLElement)) {
      if (retryCount < 3) {
        window.setTimeout(() => {
          this.applyAdventureCounterImpact({
            markerType,
            targetChip,
            targetX,
            targetY,
            pulseDurationMs,
            retryCount: retryCount + 1,
          });
        }, 16);
      }
      return;
    }
    const impactToken = (this.adventureCounterImpactToken.get(chip) ?? 0) + 1;
    this.adventureCounterImpactToken.set(chip, impactToken);
    this.adventureDisplay.remaining[markerType] = Math.max(
      0,
      Number(this.adventureDisplay.remaining[markerType] ?? 0) - 1,
    );
    const valueEl = chip.querySelector(".adventure-counter-value");
    if (valueEl) {
      valueEl.textContent = String(this.adventureDisplay.remaining[markerType]);
    }
    const iconWrap = chip.querySelector(".adventure-counter-icon-wrap");
    let sparkleX = targetX;
    let sparkleY = targetY;
    if (iconWrap instanceof HTMLElement && this.elements.particleLayer) {
      const iconRect = iconWrap.getBoundingClientRect();
      const layerRect = this.elements.particleLayer.getBoundingClientRect();
      sparkleX = (iconRect.left + (iconRect.width / 2)) - layerRect.left;
      sparkleY = (iconRect.top + (iconRect.height / 2)) - layerRect.top;
    }
    if (iconWrap instanceof HTMLElement) {
      this.restartClassAnimation(iconWrap, ["adventure-counter-icon-wrap--absorb"]);
      window.setTimeout(() => {
        if (this.adventureCounterImpactToken.get(chip) !== impactToken) {
          return;
        }
        iconWrap.classList.remove("adventure-counter-icon-wrap--absorb");
      }, Math.max(180, Math.round(pulseDurationMs * 0.92)));
    }
    this.restartClassAnimation(chip, [
      "adventure-counter-chip--entry-flash",
      "adventure-counter-chip--pulse",
      "adventure-counter-chip--impact",
      "adventure-counter-chip--collect-glow",
    ]);
    this.onAdventureCounterImpact?.({ markerType });
    this.spawnAdventureCounterSparkle(sparkleX, sparkleY, markerType);
    window.setTimeout(() => {
      if (this.adventureCounterImpactToken.get(chip) !== impactToken) {
        return;
      }
      chip.classList.remove(
        "adventure-counter-chip--entry-flash",
        "adventure-counter-chip--pulse",
        "adventure-counter-chip--impact",
        "adventure-counter-chip--collect-glow",
      );
    }, pulseDurationMs);
  }

  spawnAdventureCounterSparkle(x, y, type) {
    const layer = this.elements.particleLayer;
    if (!layer) {
      return;
    }
    if (!this.canSpawnDomFx("counterSparkle")) {
      return;
    }
    const tone = ADVENTURE_COLLECT_VFX[type] ?? ADVENTURE_COLLECT_VFX.blue;
    const halo = document.createElement("span");
    halo.className = "adventure-counter-sparkle";
    halo.style.left = `${x}px`;
    halo.style.top = `${y}px`;
    halo.style.setProperty("--counter-spark", tone.ring);
    halo.style.setProperty("--counter-flash", tone.flash);
    this.registerDomFx("counterSparkle");
    halo.addEventListener("animationend", () => {
      halo.remove();
      this.releaseDomFx("counterSparkle");
    }, { once: true });
    layer.appendChild(halo);
  }

  trackAdventureCollectedCell(row, col) {
    if (!Number.isInteger(row) || !Number.isInteger(col)) {
      return;
    }
    const expiryAt = performance.now() + ADVENTURE_COLLECT_KEY_TTL_MS;
    this.adventureCollectedCellExpiry.set(this.cellKey(row, col), expiryAt);
  }

  pruneAdventureCollectedCells(now = performance.now()) {
    this.adventureCollectedCellExpiry.forEach((expiry, key) => {
      if (!Number.isFinite(expiry) || expiry < now) {
        this.adventureCollectedCellExpiry.delete(key);
      }
    });
  }

  consumeAdventureCollectedKeys(cells) {
    this.pruneAdventureCollectedCells();
    const now = performance.now();
    const consumed = new Set();
    (cells ?? []).forEach((cell) => {
      const key = this.cellKey(cell.row, cell.col);
      const expiry = this.adventureCollectedCellExpiry.get(key);
      if (Number.isFinite(expiry) && expiry >= now) {
        consumed.add(key);
      }
    });
    consumed.forEach((key) => {
      this.adventureCollectedCellExpiry.delete(key);
    });
    return consumed;
  }

  spawnAdventureCollectPulse(x, y, type) {
    const point = this.mapLayerPointToBoardFx(x, y);
    if (!point || !this.canSpawnDomFx("collectPulse")) {
      return;
    }
    const vfx = ADVENTURE_COLLECT_VFX[type] ?? ADVENTURE_COLLECT_VFX.blue;
    const burstLife = ADVENTURE_BURST_LIFE_FRAMES;
    this.fxBursts.push({
      x: point.x,
      y: point.y,
      radius: 8,
      maxRadius: 34,
      alpha: 0.62,
      alphaDecay: 0.915,
      colorCore: vfx.flash,
      colorOuter: vfx.glow,
      maxLife: burstLife,
      life: burstLife,
      delayFrames: 0,
    });

    const ringLife = ADVENTURE_RING_LIFE_FRAMES;
    this.fxRings.push({
      x: point.x,
      y: point.y,
      color: vfx.ring,
      innerRadius: 10,
      outerRadius: 46,
      radius: 10,
      thickness: 2.3,
      alpha: 0.6,
      maxLife: ringLife,
      life: ringLife,
      delayFrames: 0,
    });
    this.startFxLoop();
  }

  renderWeeklyTop(weeklyTop = []) {
    if (!this.elements.weeklyTopList) {
      return;
    }
    this.elements.weeklyTopList.innerHTML = "";
    const top3 = weeklyTop.slice(0, 3);
    this.elements.weeklyTopList.classList.toggle("weekly-list--empty", !top3.length);
    if (!top3.length) {
      const li = document.createElement("li");
      li.className = "weekly-list-item weekly-list-item--empty";
      li.textContent = "No runs yet";
      this.elements.weeklyTopList.appendChild(li);
      return;
    }
    top3.forEach((entry, index) => {
      const li = document.createElement("li");
      li.className = "weekly-list-item";
      const rank = document.createElement("span");
      rank.className = "weekly-rank";
      rank.textContent = `#${index + 1}`;
      const score = document.createElement("span");
      score.className = "weekly-score";
      score.textContent = this.formatScore(entry.score ?? 0);
      const mode = document.createElement("span");
      mode.className = "weekly-mode";
      mode.textContent = String(entry.mode ?? "classic").toUpperCase();
      li.append(rank, score, mode);
      this.elements.weeklyTopList.appendChild(li);
    });
  }

  setGameOverActionNote(message = "") {
    if (!this.elements.gameOverActionNote) {
      return;
    }
    this.elements.gameOverActionNote.textContent = message;
  }

  renderOverlays(status, score, weeklyTop, snapshot, previousStatus = this.currentStatus) {
    if (status !== "over") {
      if (this.noSpaceBannerTimer) {
        clearTimeout(this.noSpaceBannerTimer);
        this.noSpaceBannerTimer = 0;
      }
      this.noSpaceBannerVisible = false;
      this.noSpaceGameOverGateActive = false;
    } else if (previousStatus !== "over" && !this.noSpaceGameOverGateActive) {
      if (this.noSpaceBannerTimer) {
        clearTimeout(this.noSpaceBannerTimer);
      }
      this.noSpaceBannerVisible = true;
      this.noSpaceGameOverGateActive = true;
      this.noSpaceBannerTimer = window.setTimeout(() => {
        this.noSpaceBannerTimer = 0;
        this.noSpaceBannerVisible = false;
        this.noSpaceGameOverGateActive = false;
        if (this.currentStatus === "over") {
          this.toggleOverlay(this.elements.noSpaceBanner, false);
          this.toggleOverlay(this.elements.gameOverModal, true);
        }
      }, this.noSpaceBannerDurationMs);
    }

    if (
      this.menuBadgesViewOpen &&
      (
        (this.menuBadgesContext === "menu" && status !== "menu") ||
        (this.menuBadgesContext === "settings" && status !== "paused")
      )
    ) {
      this.menuBadgesViewOpen = false;
      this.menuBadgesContext = "menu";
    }
    if (
      this.menuLeaderboardViewOpen &&
      (
        (this.menuLeaderboardContext === "menu" && status !== "menu") ||
        (this.menuLeaderboardContext === "settings" && status !== "paused")
      )
    ) {
      this.menuLeaderboardViewOpen = false;
      this.menuLeaderboardContext = "menu";
    }
    if (
      this.settingsPanel.visible &&
      this.settingsPanel.source === "game" &&
      status !== "paused"
    ) {
      this.settingsPanel.visible = false;
    }
    if (status !== "menu" && this.journeyPanel.visible) {
      this.journeyPanel.visible = false;
    }
    if (this.journeyPanel.visible && this.menuBadgesViewOpen) {
      this.menuBadgesViewOpen = false;
    }
    if (this.journeyPanel.visible && this.menuLeaderboardViewOpen) {
      this.menuLeaderboardViewOpen = false;
    }
    this.syncMenuBadgesViewVisibility();
    this.syncMenuLeaderboardViewVisibility();
    const showMenuForSettingsBadges = this.menuBadgesViewOpen && this.menuBadgesContext === "settings";
    const showMenuForSettingsLeaderboard = this.menuLeaderboardViewOpen && this.menuLeaderboardContext === "settings";
    this.toggleOverlay(
      this.elements.menuScreen,
      (status === "menu" && !this.journeyPanel.visible) || showMenuForSettingsBadges || showMenuForSettingsLeaderboard,
    );
    this.toggleOverlay(this.elements.journeyOverlay, status === "menu" && this.journeyPanel.visible);
    this.toggleOverlay(this.elements.settingsOverlay, this.settingsPanel.visible);
    const shouldDeferAdventureComplete = status === "levelComplete" && this.adventureFlyActive > 0;
    const shouldShowAdventureComplete =
      status === "levelComplete" &&
      !shouldDeferAdventureComplete &&
      !this.milestoneUnlockPanel.visible;
    this.toggleOverlay(this.elements.adventureCompleteModal, shouldShowAdventureComplete);
    this.toggleOverlay(this.elements.milestoneUnlockModal, this.milestoneUnlockPanel.visible);
    this.toggleOverlay(this.elements.noSpaceBanner, status === "over" && this.noSpaceBannerVisible);
    this.toggleOverlay(this.elements.gameOverModal, status === "over" && !this.noSpaceGameOverGateActive);
    this.toggleOverlay(this.elements.badgeUnlockModal, this.badgeUnlockPanel.visible);
    if (shouldDeferAdventureComplete) {
      const level = Math.max(1, Math.min(100, Math.floor(Number(snapshot?.adventure?.level) || 1)));
      this.deferredAdventureComplete = {
        title: `Level ${level}`,
        score: this.formatScore(score),
        level,
      };
    } else if (status === "levelComplete") {
      const level =
        this.deferredAdventureComplete?.level ??
        Math.max(1, Math.min(100, Math.floor(Number(snapshot?.adventure?.level) || 1)));
      const title = this.deferredAdventureComplete?.title ?? `Level ${level}`;
      if (this.elements.adventureCompleteTitle) {
        this.elements.adventureCompleteTitle.textContent = `${title} Completed`;
      }
      if (this.elements.adventureCompleteScore) {
        this.elements.adventureCompleteScore.textContent =
          this.deferredAdventureComplete?.score ?? this.formatScore(score);
      }
      this.renderAdventureCompleteReach(level);
      this.deferredAdventureComplete = null;
    }
    if (status === "over") {
      if (this.elements.finalScore) {
        this.elements.finalScore.textContent = this.formatScore(score);
      }
      if (this.elements.gameOverBestScore) {
        this.elements.gameOverBestScore.textContent = this.formatScore(snapshot?.bestScore ?? 0);
      }
      this.renderWeeklyTop(weeklyTop);
    }
    if (status !== "levelComplete") {
      this.deferredAdventureComplete = null;
      this.closeMilestoneUnlockPopup();
    }
  }

  flushDeferredAdventureCompleteModal() {
    if (this.currentStatus !== "levelComplete" || this.adventureFlyActive > 0) {
      return;
    }
    if (!this.deferredAdventureComplete) {
      return;
    }
    if (this.elements.adventureCompleteTitle) {
      this.elements.adventureCompleteTitle.textContent = `${this.deferredAdventureComplete.title} Completed`;
    }
    if (this.elements.adventureCompleteScore) {
      this.elements.adventureCompleteScore.textContent = this.deferredAdventureComplete.score;
    }
    this.renderAdventureCompleteReach(this.deferredAdventureComplete.level ?? 1);
    this.toggleOverlay(this.elements.adventureCompleteModal, true);
    this.deferredAdventureComplete = null;
  }

  renderAdventureCompleteReach(level = 1) {
    if (!this.elements.adventureCompleteReach) {
      return;
    }
    const percent = this.estimateJourneyReachPercent(level);
    this.elements.adventureCompleteReach.textContent =
      `Only ${percent}% of players made it this far`;
  }

  estimateJourneyReachPercent(level = 1) {
    const safeLevel = Math.max(1, Math.min(100, Math.floor(Number(level) || 1)));
    const anchors = [
      { level: 1, percent: 98 },
      { level: 10, percent: 74 },
      { level: 25, percent: 52 },
      { level: 50, percent: 28 },
      { level: 75, percent: 14 },
      { level: 100, percent: 6 },
    ];
    for (let i = 0; i < anchors.length - 1; i += 1) {
      const from = anchors[i];
      const to = anchors[i + 1];
      if (safeLevel >= from.level && safeLevel <= to.level) {
        const t = (safeLevel - from.level) / (to.level - from.level);
        return Math.round(from.percent + ((to.percent - from.percent) * t));
      }
    }
    return anchors[anchors.length - 1].percent;
  }

  openAdventureCompletePreview({
    level = 4,
    score = 476,
    title = "Level 4",
  } = {}) {
    const safeLevel = Math.max(1, Math.min(100, Math.floor(Number(level) || 1)));
    if (this.elements.adventureCompleteTitle) {
      this.elements.adventureCompleteTitle.textContent = `${title} Completed`;
    }
    if (this.elements.adventureCompleteScore) {
      this.elements.adventureCompleteScore.textContent = this.formatScore(score);
    }
    this.renderAdventureCompleteReach(safeLevel);
    this.toggleOverlay(this.elements.menuScreen, false);
    this.toggleOverlay(this.elements.journeyOverlay, false);
    this.toggleOverlay(this.elements.settingsOverlay, false);
    this.toggleOverlay(this.elements.gameOverModal, false);
    this.toggleOverlay(this.elements.adventureCompleteModal, true);
  }

  openMilestoneUnlockPopup({
    completedLevel = 10,
    nextLevel = 11,
    unlockedColor = "red",
  } = {}) {
    const safeCompletedLevel = Math.max(1, Math.min(100, Math.floor(Number(completedLevel) || 1)));
    const safeNextLevel = Math.max(1, Math.min(100, Math.floor(Number(nextLevel) || safeCompletedLevel)));
    this.milestoneUnlockPanel.visible = true;
    this.milestoneUnlockPanel.completedLevel = safeCompletedLevel;
    this.milestoneUnlockPanel.nextLevel = safeNextLevel;
    this.milestoneUnlockPanel.unlockedColor = unlockedColor;

    if (this.elements.milestoneUnlockTitle) {
      this.elements.milestoneUnlockTitle.textContent = `Level ${safeCompletedLevel} Complete`;
    }
    if (this.elements.milestoneUnlockText) {
      this.elements.milestoneUnlockText.textContent =
        safeNextLevel > safeCompletedLevel
          ? `Ruby Red blocks are now active from Level ${safeNextLevel}.`
          : "Ruby Red blocks are now active in upcoming Journey levels.";
    }
    if (this.elements.milestoneUnlockContinueBtn) {
      this.elements.milestoneUnlockContinueBtn.textContent =
        safeNextLevel > safeCompletedLevel
          ? `Start Level ${safeNextLevel}`
          : "Continue";
    }

    this.toggleOverlay(this.elements.adventureCompleteModal, false);
    this.toggleOverlay(this.elements.milestoneUnlockModal, true);
  }

  closeMilestoneUnlockPopup() {
    this.milestoneUnlockPanel.visible = false;
    this.milestoneUnlockPanel.completedLevel = null;
    this.milestoneUnlockPanel.nextLevel = null;
    this.toggleOverlay(this.elements.milestoneUnlockModal, false);
  }

  toggleOverlay(overlayEl, shouldShow) {
    if (!overlayEl) {
      return;
    }
    overlayEl.classList.toggle("overlay--visible", shouldShow);
  }

  cellKey(row, col) {
    return `${row}:${col}`;
  }

  formatScore(value) {
    return Math.max(0, Math.floor(value)).toLocaleString("en-US");
  }
}

