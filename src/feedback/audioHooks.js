const SOUND_LIBRARY = {
  // MP3 pipeline kept for later replacement with non-voice assets.
  place: { url: "./assets/sounds/place.mp3?v=5", volume: 0.58, durationSec: 0.35, toneFilterHz: 4200 },
  pickup: { url: "./assets/sounds/pickup.mp3?v=3", volume: 0.68, durationSec: 0.22, toneFilterHz: 5200 },
  clear: { url: "./assets/sounds/clear.wav?v=1", volume: 0.76, durationSec: 2.02, toneFilterHz: 0 },
  comboGoodJob: { url: "./assets/sounds/combo-good-job.mp3?v=1", volume: 0.7, durationSec: 1.2, toneFilterHz: 0 },
  comboPerfect: { url: "./assets/sounds/combo-perfect.mp3?v=1", volume: 0.72, durationSec: 1.3, toneFilterHz: 0 },
  comboIncredible: { url: "./assets/sounds/combo-incredible.mp3?v=1", volume: 0.74, durationSec: 1.4, toneFilterHz: 0 },
  gameover: { url: "./assets/sounds/gameover-horror.wav?v=1", volume: 0.7, durationSec: 2.8, toneFilterHz: 0 },
  levelComplete: { url: "./assets/sounds/level-complete.wav?v=1", volume: 0.78, durationSec: 2.25, toneFilterHz: 0 },
  milestoneUnlock: { url: "./assets/sounds/milestone-unlock.wav?v=1", volume: 0.82, durationSec: 2.45, toneFilterHz: 0 },
  tntExplosion: { url: "./assets/sounds/tnt-explosion.wav?v=1", volume: 0.86, durationSec: 1.5, toneFilterHz: 0 },
  hammerHit: { url: "./assets/sounds/place.mp3?v=5", volume: 0.9, durationSec: 0.35, toneFilterHz: 2600 },
};

const AMBIENT_LIBRARY = {
  relaxingAmbient: {
    sources: [
      "./assets/sounds/ambient/relaxing-forest-rain-birds.mp3?v=2",
      "./assets/sounds/ambient/relaxing-forest-rain-birds.weba?v=1",
    ],
    volume: 0.54,
  },
  relaxingMusic: {
    sources: ["./assets/sounds/ambient/relaxing-music-shelter-beneath-canopy.mp3?v=1"],
    volume: 0.34,
  },
};

const SFX_PRIORITY_TABLE = {
  gameover: 500,
  levelComplete: 420,
  milestoneUnlock: 410,
  tntExplosion: 320,
  hammerHit: 320,
  clear: 220,
  comboIncredible: 210,
  comboPerfect: 205,
  comboGoodJob: 200,
  place: 120,
  pickup: 80,
};

const DOMINANT_DUCK_TABLE = [
  { minPriority: 420, ambientGain: 0.22 },
  { minPriority: 320, ambientGain: 0.34 },
  { minPriority: 220, ambientGain: 0.48 },
  { minPriority: 1, ambientGain: 0.72 },
];

const OVERLAP_MIN_INTERVAL_MS = {
  place: 30,
  pickup: 14,
  hammerHit: 80,
  tntExplosion: 120,
  clear: 95,
  comboGoodJob: 240,
  comboPerfect: 260,
  comboIncredible: 280,
};

const CRITICAL_KEYS = new Set(["gameover", "levelComplete", "milestoneUnlock"]);
const FALLBACK_URL_OVERRIDE = {
  gameover: "./assets/sounds/gameover.mp3?v=1",
};

export class SoundManager {
  constructor() {
    this.enabled = true;
    this.ctx = null;
    this.master = null;
    this.compressor = null;
    this.buffers = new Map();
    this.preloadPromise = null;
    this.clearQueueUntilMs = 0;
    this.activeBufferSources = new Set();
    this.activeHtmlAudios = new Set();
    this.quickHtmlAudio = new Map();
    this.quickHtmlAudioPool = new Map();
    this.quickHtmlAudioPoolIndex = new Map();
    this.fallbackAudioPool = new Map();
    this.fallbackAudioPoolIndex = new Map();
    this.ambientPlayers = new Map();
    this.ambientDuckGain = 1;
    this.lastOverlapPlayAtMs = new Map();
    this.maxConcurrentBufferSources = 9;
    this.maxConcurrentHtmlAudios = 10;
    this.ambientFadeStepMs = 34;
    this.relaxingModeEnabled = false;
    this.relaxingMusicEnabled = false;
    this.dominantState = {
      key: "",
      priority: 0,
      endAtMs: 0,
      releaseTimerId: 0,
    };
    this.comboVoiceState = {
      lastAtMs: 0,
      lastKey: "",
      combosSinceVoice: 0,
      qualifiedComboCount: 0,
    };
    this.comboVoiceQueueUntilMs = 0;
    this.prewarmRequested = false;
  }

  resetComboVoiceFlow() {
    this.comboVoiceState = {
      lastAtMs: 0,
      lastKey: "",
      combosSinceVoice: 0,
      qualifiedComboCount: 0,
    };
    this.comboVoiceQueueUntilMs = 0;
  }

  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
    if (this.master) {
      this.master.gain.value = this.enabled ? 1 : 0;
    }
  }

  toggleMute() {
    this.setEnabled(!this.enabled);
    return !this.enabled;
  }

  isMuted() {
    return !this.enabled;
  }

  async unlock() {
    // Keep the resume call in the same gesture call-stack on iOS Safari/WKWebView.
    void this.ensureContext();
    let resumePromise = null;
    if (this.ctx?.state === "suspended") {
      resumePromise = this.ctx.resume();
      if (resumePromise?.catch) {
        resumePromise.catch(() => {});
      }
    }
    this.primeHtmlAudio();
    this.syncAmbientPlayback();
    if (resumePromise?.then) {
      await resumePromise;
    }
  }

  setRelaxingMode(enabled) {
    this.relaxingModeEnabled = Boolean(enabled);
    this.syncAmbientPlayback();
  }

  setRelaxingMusicEnabled(enabled) {
    this.relaxingMusicEnabled = Boolean(enabled);
    this.syncAmbientPlayback();
  }

  async preloadAll() {
    if (this.preloadPromise) {
      return this.preloadPromise;
    }
    this.preloadPromise = this.loadAllBuffers();
    return this.preloadPromise;
  }

  async preloadKeys(keys = []) {
    await this.ensureContext();
    const safeKeys = Array.isArray(keys) ? keys : [];
    for (const key of safeKeys) {
      const sound = SOUND_LIBRARY[key];
      if (!sound?.url) {
        continue;
      }
      await this.loadBuffer(key, sound.url);
    }
  }

  prewarmForGameplay() {
    const startupKeys = [
      "pickup",
      "place",
      "clear",
      "comboGoodJob",
      "comboPerfect",
      "comboIncredible",
      "gameover",
      "levelComplete",
      "milestoneUnlock",
    ];
    this.primeHtmlAudio(startupKeys);
    if (this.prewarmRequested) {
      return;
    }
    this.prewarmRequested = true;
    void this.preloadKeys(startupKeys).catch(() => {});
  }

  async ensureContext() {
    if (this.ctx) {
      return;
    }
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) {
      return;
    }
    try {
      this.ctx = new AudioCtx({ latencyHint: "interactive" });
    } catch {
      this.ctx = new AudioCtx();
    }
    this.compressor = this.ctx.createDynamicsCompressor();
    this.compressor.threshold.value = -20;
    this.compressor.knee.value = 22;
    this.compressor.ratio.value = 4;
    this.compressor.attack.value = 0.002;
    this.compressor.release.value = 0.16;

    this.master = this.ctx.createGain();
    this.master.gain.value = this.enabled ? 1 : 0;
    this.master.connect(this.compressor);
    this.compressor.connect(this.ctx.destination);
  }

  async loadAllBuffers() {
    await this.ensureContext();
    const entries = Object.entries(SOUND_LIBRARY);
    await Promise.all(entries.map(([key, config]) => this.loadBuffer(key, config.url)));
  }

  async loadBuffer(key, url) {
    if (!this.ctx || this.buffers.has(key)) {
      return;
    }
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
      this.buffers.set(key, audioBuffer);
    } catch (error) {
      console.warn(`[sfx] failed to load ${key} from ${url}`, error);
    }
  }

  primeHtmlAudio(keys = null) {
    const keySet = Array.isArray(keys) && keys.length > 0
      ? new Set(keys.map((key) => String(key)))
      : null;
    Object.entries(SOUND_LIBRARY).forEach(([key, sound]) => {
      if (keySet && !keySet.has(key)) {
        return;
      }
      if (!this.fallbackAudioPool.has(key)) {
        const fallbackPoolSize = key === "pickup" ? 5 : 3;
        const fallbackPool = [];
        for (let i = 0; i < fallbackPoolSize; i += 1) {
          try {
            const pooledUrl = FALLBACK_URL_OVERRIDE[key] || sound.url;
            const pooled = new Audio(pooledUrl);
            pooled.preload = "auto";
            pooled.playsInline = true;
            pooled.load();
            fallbackPool.push(pooled);
          } catch {
            // ignore
          }
        }
        if (fallbackPool.length > 0) {
          this.fallbackAudioPool.set(key, fallbackPool);
          this.fallbackAudioPoolIndex.set(key, 0);
        }
      }
      if (key === "pickup" && !this.quickHtmlAudio.has("pickup")) {
        try {
          const pooled = new Audio(sound.url);
          pooled.preload = "auto";
          pooled.load();
          this.quickHtmlAudio.set("pickup", pooled);
        } catch {
          // ignore
        }
      }
      if (key === "pickup" && !this.quickHtmlAudioPool.has("pickup")) {
        const pool = [];
        for (let i = 0; i < 4; i += 1) {
          try {
            const pooled = new Audio(sound.url);
            pooled.preload = "auto";
            pooled.load();
            pool.push(pooled);
          } catch {
            // ignore
          }
        }
        if (pool.length > 0) {
          this.quickHtmlAudioPool.set("pickup", pool);
          this.quickHtmlAudioPoolIndex.set("pickup", 0);
        }
      }
      try {
        const primer = new Audio(sound.url);
        primer.preload = "auto";
        primer.muted = true;
        const playPromise = primer.play();
        if (playPromise?.then) {
          playPromise.then(() => {
            primer.pause();
            primer.currentTime = 0;
            primer.remove();
          }).catch(() => {
            primer.remove();
          });
        }
      } catch {
        // ignore
      }
    });
  }

  createAmbientAudio(key) {
    const track = AMBIENT_LIBRARY[key];
    if (!track) {
      return null;
    }
    const sourceUrl = this.resolveAmbientSourceUrl(key, track);
    if (!sourceUrl) {
      return null;
    }
    try {
      const audio = new Audio(sourceUrl);
      audio.preload = "auto";
      audio.loop = true;
      audio.volume = 0;
      audio.playsInline = true;
      audio.__fadeTimerId = 0;
      audio.__fadeToken = 0;
      audio.__sourceUrl = this.normalizeAssetUrl(sourceUrl);
      this.ambientPlayers.set(key, audio);
      return audio;
    } catch {
      return null;
    }
  }

  getAmbientSourceList(track) {
    if (!track) {
      return [];
    }
    if (Array.isArray(track.sources) && track.sources.length > 0) {
      return track.sources.filter(Boolean);
    }
    if (track.url) {
      return [track.url];
    }
    return [];
  }

  normalizeAssetUrl(url) {
    if (!url) {
      return "";
    }
    try {
      return new URL(url, window.location.href).href;
    } catch {
      return String(url);
    }
  }

  isIOSLikeDevice() {
    const ua = navigator.userAgent || "";
    const platform = navigator.platform || "";
    const touchPoints = Number(navigator.maxTouchPoints || 0);
    return /iPad|iPhone|iPod/i.test(ua) || (platform === "MacIntel" && touchPoints > 1);
  }

  resolveAmbientSourceUrl(key, track) {
    const sources = this.getAmbientSourceList(track);
    if (sources.length === 0) {
      return "";
    }

    // iOS Safari/PWA has inconsistent playback for some weba/webm encodes.
    // Prefer MP3 fallback when available so relaxing ambience is always audible.
    if (this.isIOSLikeDevice() && key === "relaxingAmbient") {
      const mp3Fallback = sources.find((src) => /\.mp3(\?|$)/i.test(src));
      if (mp3Fallback) {
        return mp3Fallback;
      }
    }
    return sources[0];
  }

  syncAmbientTrack(key, shouldPlay) {
    const track = AMBIENT_LIBRARY[key];
    if (!track) {
      return;
    }
    const desiredUrl = this.resolveAmbientSourceUrl(key, track);
    const desiredUrlNormalized = this.normalizeAssetUrl(desiredUrl);

    let player = this.ambientPlayers.get(key);
    const playerUrl = this.normalizeAssetUrl(player?.__sourceUrl || player?.src || "");
    if ((!player || playerUrl !== desiredUrlNormalized) && desiredUrl) {
      if (player) {
        if (player.__fadeTimerId) {
          clearTimeout(player.__fadeTimerId);
          player.__fadeTimerId = 0;
        }
        try {
          player.pause();
          player.currentTime = 0;
          player.remove();
        } catch {
          // ignore
        }
      }
      player = this.createAmbientAudio(key);
    }
    if (!player) {
      return;
    }
    const baseVolume = Math.max(0, Math.min(1, Number(track?.volume ?? 0.4)));
    const targetVolume = Math.max(0, Math.min(1, baseVolume * this.ambientDuckGain));
    if (shouldPlay) {
      if (player.paused) {
        const playPromise = player.play();
        if (playPromise?.catch) {
          playPromise.catch(() => {});
        }
      }
      this.fadeAmbientPlayer(player, targetVolume, { durationMs: 320, pauseOnEnd: false });
      return;
    }
    this.fadeAmbientPlayer(player, 0, { durationMs: 220, pauseOnEnd: true });
  }

  syncAmbientPlayback() {
    const shouldPlayAmbient = this.relaxingModeEnabled;
    const shouldPlayMusic = this.relaxingMusicEnabled;
    const ambientUrl = this.normalizeAssetUrl(
      this.resolveAmbientSourceUrl("relaxingAmbient", AMBIENT_LIBRARY.relaxingAmbient),
    );
    const musicUrl = this.normalizeAssetUrl(
      this.resolveAmbientSourceUrl("relaxingMusic", AMBIENT_LIBRARY.relaxingMusic),
    );
    const sharesSameSource = Boolean(
      shouldPlayAmbient
      && shouldPlayMusic
      && ambientUrl
      && musicUrl
      && ambientUrl === musicUrl,
    );

    this.syncAmbientTrack("relaxingAmbient", shouldPlayAmbient);
    this.syncAmbientTrack("relaxingMusic", shouldPlayMusic && !sharesSameSource);
  }

  fadeAmbientPlayer(player, targetVolume, { durationMs = 260, pauseOnEnd = false } = {}) {
    if (!player) {
      return;
    }

    if (player.__fadeTimerId) {
      clearTimeout(player.__fadeTimerId);
      player.__fadeTimerId = 0;
    }
    player.__fadeToken = (player.__fadeToken || 0) + 1;
    const localToken = player.__fadeToken;

    const startVolume = Math.max(0, Math.min(1, Number(player.volume) || 0));
    const endVolume = Math.max(0, Math.min(1, Number(targetVolume) || 0));
    if (Math.abs(endVolume - startVolume) < 0.001) {
      player.volume = endVolume;
      if (pauseOnEnd && endVolume <= 0.001 && !player.paused) {
        player.pause();
      }
      return;
    }

    const clampedDuration = Math.max(80, Math.floor(Number(durationMs) || 260));
    const startedAt = performance.now();
    const stepDelay = Math.max(16, Math.round(this.ambientFadeStepMs || 34));

    const step = () => {
      if (player.__fadeToken !== localToken) {
        return;
      }
      const elapsed = Math.max(0, performance.now() - startedAt);
      const progress = Math.min(1, elapsed / clampedDuration);
      const eased = 1 - Math.pow(1 - progress, 3);
      player.volume = startVolume + ((endVolume - startVolume) * eased);

      if (progress < 1) {
        player.__fadeTimerId = window.setTimeout(step, stepDelay);
        return;
      }
      player.__fadeTimerId = 0;
      player.volume = endVolume;
      if (pauseOnEnd && endVolume <= 0.001 && !player.paused) {
        player.pause();
      }
    };

    player.__fadeTimerId = window.setTimeout(step, stepDelay);
  }

  getSfxPriority(key) {
    return Number(SFX_PRIORITY_TABLE[key] ?? 100);
  }

  resolveAmbientDuckGain(priority) {
    for (const row of DOMINANT_DUCK_TABLE) {
      if (priority >= row.minPriority) {
        return row.ambientGain;
      }
    }
    return 1;
  }

  setAmbientDuckGain(nextGain, { durationMs = 180 } = {}) {
    const clamped = Math.max(0.15, Math.min(1, Number(nextGain) || 1));
    if (Math.abs(clamped - this.ambientDuckGain) < 0.001) {
      return;
    }
    this.ambientDuckGain = clamped;
    Object.entries(AMBIENT_LIBRARY).forEach(([key, track]) => {
      const player = this.ambientPlayers.get(key);
      if (!player || player.paused) {
        return;
      }
      const baseVolume = Math.max(0, Math.min(1, Number(track?.volume ?? 0.4)));
      const targetVolume = Math.max(0, Math.min(1, baseVolume * this.ambientDuckGain));
      this.fadeAmbientPlayer(player, targetVolume, { durationMs, pauseOnEnd: false });
    });
  }

  clearDominantState({ restoreAmbient = true } = {}) {
    if (this.dominantState.releaseTimerId) {
      clearTimeout(this.dominantState.releaseTimerId);
      this.dominantState.releaseTimerId = 0;
    }
    this.dominantState.key = "";
    this.dominantState.priority = 0;
    this.dominantState.endAtMs = 0;
    if (restoreAmbient) {
      this.setAmbientDuckGain(1, { durationMs: 260 });
    }
  }

  scheduleDominantRelease() {
    if (this.dominantState.releaseTimerId) {
      clearTimeout(this.dominantState.releaseTimerId);
      this.dominantState.releaseTimerId = 0;
    }
    const nowMs = performance.now();
    const delayMs = Math.max(0, Math.round(this.dominantState.endAtMs - nowMs) + 16);
    this.dominantState.releaseTimerId = window.setTimeout(() => {
      this.dominantState.releaseTimerId = 0;
      const now = performance.now();
      if (this.dominantState.key && now < this.dominantState.endAtMs) {
        this.scheduleDominantRelease();
        return;
      }
      this.clearDominantState({ restoreAmbient: true });
    }, delayMs);
  }

  stopActiveSoundsBelowPriority(minPriority, excludedKey = "") {
    this.activeBufferSources.forEach((source) => {
      const sourcePriority = Number(source?.__sfxPriority ?? 0);
      if (sourcePriority >= minPriority || source?.__sfxKey === excludedKey) {
        return;
      }
      try {
        source.stop();
      } catch {
        // ignore
      }
    });
    this.activeHtmlAudios.forEach((audio) => {
      const audioPriority = Number(audio?.__sfxPriority ?? 0);
      if (audioPriority >= minPriority || audio?.__sfxKey === excludedKey) {
        return;
      }
      try {
        audio.pause();
        audio.currentTime = 0;
      } catch {
        // ignore
      } finally {
        this.activeHtmlAudios.delete(audio);
      }
    });
  }

  tryAcquireDominantSlot(key, options = {}) {
    const nowMs = performance.now();
    const incomingPriority = this.getSfxPriority(key);
    const incomingDurationMs = Math.max(90, Math.floor(Number(options.durationMs) || 200));

    if (this.dominantState.key && nowMs >= this.dominantState.endAtMs) {
      this.clearDominantState({ restoreAmbient: true });
    }

    const hasActiveDominant = this.dominantState.key && nowMs < this.dominantState.endAtMs;
    if (hasActiveDominant) {
      const activePriority = this.dominantState.priority;
      if (incomingPriority < activePriority) {
        return false;
      }
      if (incomingPriority === activePriority) {
        return false;
      }
      this.stopActiveSoundsBelowPriority(incomingPriority, key);
      if (this.dominantState.key && this.dominantState.key !== key) {
        this.stopByKeyWithOptions(this.dominantState.key, { preserveDominantState: true });
      }
    }

    this.dominantState.key = key;
    this.dominantState.priority = incomingPriority;
    this.dominantState.endAtMs = nowMs + incomingDurationMs;
    this.setAmbientDuckGain(this.resolveAmbientDuckGain(incomingPriority), { durationMs: 120 });
    this.scheduleDominantRelease();
    return true;
  }

  playPlace(payload) {
    this.play("place", { volumeScale: 1, allowOverlap: true });
  }

  playLineClear(payload) {
    const lines = Math.max(1, payload?.lineCount ?? 1);
    const durationSec = this.getSoundDurationSeconds("clear");
    const nowMs = performance.now();
    this.clearQueueUntilMs = Math.max(this.clearQueueUntilMs, nowMs + (durationSec * 1000));

    this.play("clear", {
      allowOverlap: true,
      volumeScale: Math.min(1.15, 1 + ((lines - 1) * 0.08)),
    });
  }

  playCombo(payload) {
    const chain = Math.max(2, Number(payload?.comboChain ?? 2));
    const lineCount = Math.max(1, Number(payload?.lineCount ?? 1));
    const level = chain >= 4 ? 3 : (chain >= 3 ? 2 : 1);
    const voiceKey = this.pickComboVoice(level, lineCount);
    if (!voiceKey) {
      return null;
    }
    return this.playVoiceCallout(voiceKey, {
      requestedDelayMs: 60,
      allowDuringClear: true,
      allowOverlap: true,
    });
  }

  playGoodJobForSmartMove() {
    return this.playVoiceCallout("comboGoodJob", {
      requestedDelayMs: 90,
      minGapMs: 5200,
      allowDuringClear: true,
      allowOverlap: true,
    });
  }

  playVoiceCallout(voiceKey, options = {}) {
    if (!voiceKey) {
      return null;
    }

    const nowMs = performance.now();
    const minGapMs = Number(options.minGapMs ?? 0);
    if (minGapMs > 0 && (nowMs - this.comboVoiceState.lastAtMs) < minGapMs) {
      return null;
    }

    const requestedStartMs = nowMs + Math.max(0, Number(options.requestedDelayMs ?? 0));
    let scheduledStartMs = Math.max(requestedStartMs, this.comboVoiceQueueUntilMs);
    if (!options.allowDuringClear) {
      scheduledStartMs = Math.max(scheduledStartMs, this.clearQueueUntilMs);
    }
    const scheduledWhenSec = Math.max(0, (scheduledStartMs - nowMs) / 1000);
    const voiceDurationMs = this.getSoundDurationSeconds(voiceKey) * 1000;
    this.comboVoiceQueueUntilMs = scheduledStartMs + voiceDurationMs + 140;

    this.play(voiceKey, {
      when: scheduledWhenSec,
      volumeScale: 1,
      playbackRate: 1,
      allowOverlap: options.allowOverlap === true,
    });

    this.comboVoiceState.lastAtMs = scheduledStartMs;
    this.comboVoiceState.lastKey = voiceKey;
    this.comboVoiceState.combosSinceVoice = 0;

    return {
      voiceKey,
      text: this.voiceKeyToCallout(voiceKey),
      delayMs: Math.max(0, Math.round(scheduledWhenSec * 1000)),
    };
  }

  playGameOver() {
    this.play("gameover", { volumeScale: 0.95 });
  }

  playLevelComplete() {
    this.play("levelComplete", { volumeScale: 1 });
  }

  playMilestoneUnlock() {
    this.play("milestoneUnlock", { volumeScale: 1 });
  }

  playTntExplosion() {
    this.play("tntExplosion", { volumeScale: 1 });
  }

  playHammerHit() {
    this.play("hammerHit", { volumeScale: 1, playbackRate: 0.82 });
  }

  stopMilestoneUnlock() {
    this.stopByKey("milestoneUnlock");
  }

  playPickup() {
    this.play("pickup", {
      volumeScale: 1,
      allowOverlap: true,
    });
  }

  playInvalid() {
    this.play("pickup", {
      volumeScale: 0.68,
      playbackRate: 0.86,
      useHtmlOnly: true,
      allowOverlap: true,
    });
  }

  playUiTap() {
    this.play("pickup", {
      volumeScale: 0.48,
      playbackRate: 1.08,
      useHtmlOnly: true,
      allowOverlap: true,
    });
  }

  play(key, options = {}) {
    if (!this.enabled) {
      return;
    }
    const sound = SOUND_LIBRARY[key];
    if (!sound) {
      return;
    }

    const requestedWhenSec = Math.max(0, Number(options.when ?? 0));
    if (requestedWhenSec > 0.001 && !options.__scheduled) {
      const delayMs = Math.max(0, Math.round(requestedWhenSec * 1000));
      window.setTimeout(() => {
        this.play(key, {
          ...options,
          when: 0,
          __scheduled: true,
        });
      }, delayMs);
      return;
    }

    const playbackRate = Math.max(0.6, Math.min(1.6, Number(options.playbackRate ?? 1)));
    const estimatedDurationMs = Math.max(
      100,
      Math.round((this.getSoundDurationSeconds(key) * 1000) / playbackRate),
    );
    const allowOverlap = options.allowOverlap === true;
    if (allowOverlap && !this.canTriggerOverlapSfx(key)) {
      return;
    }
    if (!allowOverlap) {
      if (!this.tryAcquireDominantSlot(key, { durationMs: estimatedDurationMs })) {
        return;
      }
    }

    if (options.useHtmlOnly) {
      this.playFallback(key, options.volumeScale ?? 1, 0, playbackRate);
      return;
    }

    let buffer = this.buffers.get(key);
    if (this.ctx?.state === "suspended") {
      void this.ctx.resume().catch(() => {});
    }
    if (CRITICAL_KEYS.has(key) && !buffer && !options.__criticalRetry) {
      void this.loadBuffer(key, sound.url);
      window.setTimeout(() => {
        this.play(key, {
          ...options,
          __criticalRetry: true,
        });
      }, 70);
      return;
    }
    buffer = this.buffers.get(key);
    if (!this.ctx || !this.master || this.ctx.state !== "running" || !buffer) {
      this.playFallback(key, options.volumeScale ?? 1, 0, playbackRate);
      return;
    }

    try {
      if (this.activeBufferSources.size >= this.maxConcurrentBufferSources) {
        const incomingPriority = this.getSfxPriority(key);
        if (incomingPriority >= 400) {
          this.stopActiveSoundsBelowPriority(incomingPriority, key);
        } else if (key === "pickup" || key === "place") {
          this.playFallback(key, options.volumeScale ?? 1, 0, playbackRate);
          return;
        } else {
          // Keep iOS thermals in check during bursty gameplay.
          return;
        }
      }
      const source = this.ctx.createBufferSource();
      source.buffer = buffer;
      source.__sfxKey = key;
      source.__sfxPriority = this.getSfxPriority(key);
      source.playbackRate.value = playbackRate;

      const gain = this.ctx.createGain();
      const when = this.ctx.currentTime;
      const peak = sound.volume * (options.volumeScale ?? 1);
      const startOffset = Math.max(0, options.startOffset ?? 0);
      const hasDurationCap = Number.isFinite(options.maxDuration);
      const playableDuration = hasDurationCap
        ? Math.max(0.05, Math.min(options.maxDuration, (buffer.duration - startOffset) - 0.002))
        : null;
      const fadeIn = 0.005;

      gain.gain.setValueAtTime(0.0001, when);
      gain.gain.linearRampToValueAtTime(peak, when + fadeIn);
      if (playableDuration) {
        const fadeOut = 0.035;
        const holdUntil = Math.max(when + fadeIn, when + playableDuration - fadeOut);
        gain.gain.setValueAtTime(peak, holdUntil);
        gain.gain.exponentialRampToValueAtTime(0.0001, when + playableDuration);
      }

      const filterHz = Number(sound.toneFilterHz ?? 0);
      if (filterHz > 0) {
        const filter = this.ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.value = filterHz;
        filter.Q.value = 0.55;
        source.connect(filter);
        filter.connect(gain);
      } else {
        source.connect(gain);
      }
      gain.connect(this.master);

      source.onended = () => {
        this.activeBufferSources.delete(source);
      };
      this.activeBufferSources.add(source);
      if (playableDuration) {
        source.start(when, startOffset, playableDuration);
        source.stop(when + playableDuration + 0.005);
      } else {
        source.start(when, startOffset);
      }
    } catch (error) {
      console.warn(`[sfx] play failed for ${key}, fallback used`, error);
      this.playFallback(key, options.volumeScale ?? 1, 0, playbackRate);
    }
  }

  playFallback(key, volumeScale = 1, when = 0, playbackRate = 1) {
    if (!this.enabled) {
      return;
    }
    const sound = SOUND_LIBRARY[key];
    if (!sound) {
      return;
    }
    const clampedPlaybackRate = Math.max(0.6, Math.min(1.6, Number(playbackRate ?? 1)));
    const safeSetPlaybackRate = (audio) => {
      try {
        audio.playbackRate = clampedPlaybackRate;
      } catch {
        // iOS can throw when setting playbackRate on HTMLMediaElement.
      }
    };
    const delayMs = Math.max(0, Math.round(when * 1000));
    const runPlayback = () => {
      try {
        if (this.activeHtmlAudios.size >= this.maxConcurrentHtmlAudios) {
          const incomingPriority = this.getSfxPriority(key);
          if (incomingPriority >= 400 || key === "pickup") {
            this.stopActiveSoundsBelowPriority(incomingPriority, key);
          } else {
            return;
          }
        }
        if (key === "pickup") {
          const pickupPool = this.quickHtmlAudioPool.get("pickup");
          if (pickupPool?.length) {
            const currentIndex = Number(this.quickHtmlAudioPoolIndex.get("pickup") ?? 0);
            const audioFromPool = pickupPool[currentIndex % pickupPool.length];
            this.quickHtmlAudioPoolIndex.set("pickup", (currentIndex + 1) % pickupPool.length);
            if (audioFromPool) {
              audioFromPool.__sfxKey = key;
              audioFromPool.__sfxPriority = this.getSfxPriority(key);
              audioFromPool.volume = Math.max(0, Math.min(1, sound.volume * volumeScale));
              safeSetPlaybackRate(audioFromPool);
              try {
                audioFromPool.currentTime = 0;
              } catch {
                // ignore
              }
              this.activeHtmlAudios.add(audioFromPool);
              if (!audioFromPool.__sfxEndedListenerBound) {
                audioFromPool.addEventListener("ended", () => {
                  this.activeHtmlAudios.delete(audioFromPool);
                });
                audioFromPool.__sfxEndedListenerBound = true;
              }
              void audioFromPool.play().catch(() => {});
              return;
            }
          }
          const pooled = this.quickHtmlAudio.get("pickup");
          if (pooled) {
            pooled.pause();
            pooled.currentTime = 0;
            pooled.__sfxKey = key;
            pooled.__sfxPriority = this.getSfxPriority(key);
            pooled.volume = Math.max(0, Math.min(1, sound.volume * volumeScale));
            safeSetPlaybackRate(pooled);
            this.activeHtmlAudios.add(pooled);
            if (!pooled.__sfxEndedListenerBound) {
              pooled.addEventListener("ended", () => {
                this.activeHtmlAudios.delete(pooled);
              });
              pooled.__sfxEndedListenerBound = true;
            }
            void pooled.play().catch(() => {});
            return;
          }
        }

        const fallbackUrl = FALLBACK_URL_OVERRIDE[key] || sound.url;
        const audio = this.acquireFallbackAudio(key, fallbackUrl);
        if (!audio) {
          return;
        }
        audio.__sfxKey = key;
        audio.__sfxPriority = this.getSfxPriority(key);
        audio.__isPooled = true;
        audio.volume = Math.max(0, Math.min(1, sound.volume * volumeScale));
        safeSetPlaybackRate(audio);
        try {
          audio.currentTime = 0;
        } catch {
          // ignore
        }
        this.activeHtmlAudios.add(audio);
        if (!audio.__sfxEndedListenerBound) {
          audio.addEventListener("ended", () => {
            this.activeHtmlAudios.delete(audio);
          });
          audio.__sfxEndedListenerBound = true;
        }
        void audio.play().catch(() => {
          this.activeHtmlAudios.delete(audio);
        });
      } catch {
        // ignore
      }
    };

    if (delayMs <= 0) {
      runPlayback();
      return;
    }
    window.setTimeout(runPlayback, delayMs);
  }

  getSoundDurationSeconds(key) {
    const configured = SOUND_LIBRARY[key]?.durationSec ?? 0.35;
    const buffered = this.buffers.get(key)?.duration;
    if (Number.isFinite(buffered) && buffered > 0) {
      return buffered;
    }
    return configured;
  }

  getSoundDurationMs(key) {
    return Math.max(0, Math.round(this.getSoundDurationSeconds(key) * 1000));
  }

  stopByKey(key) {
    this.stopByKeyWithOptions(key);
  }

  stopByKeyWithOptions(key, { preserveDominantState = false } = {}) {
    this.activeBufferSources.forEach((source) => {
      if (source?.__sfxKey !== key) {
        return;
      }
      try {
        source.stop();
      } catch {
        // ignore
      }
    });
    this.activeHtmlAudios.forEach((audio) => {
      if (audio?.__sfxKey !== key) {
        return;
      }
      try {
        audio.pause();
        audio.currentTime = 0;
        if (!audio.__isPooled) {
          audio.remove();
        }
      } catch {
        // ignore
      } finally {
        this.activeHtmlAudios.delete(audio);
      }
    });
    if (!preserveDominantState && this.dominantState.key === key) {
      this.clearDominantState({ restoreAmbient: true });
    }
  }

  canTriggerOverlapSfx(key) {
    const now = performance.now();
    const minIntervalMs = Number(OVERLAP_MIN_INTERVAL_MS[key] ?? 0);
    if (minIntervalMs <= 0) {
      return true;
    }
    const lastAt = Number(this.lastOverlapPlayAtMs.get(key) ?? 0);
    if (now - lastAt < minIntervalMs) {
      return false;
    }
    this.lastOverlapPlayAtMs.set(key, now);
    return true;
  }

  acquireFallbackAudio(key, url) {
    const pool = this.fallbackAudioPool.get(key);
    if (pool?.length) {
      const currentIndex = Number(this.fallbackAudioPoolIndex.get(key) ?? 0);
      const pooled = pool[currentIndex % pool.length];
      this.fallbackAudioPoolIndex.set(key, (currentIndex + 1) % pool.length);
      return pooled;
    }

    try {
      const created = new Audio(url);
      created.preload = "auto";
      created.playsInline = true;
      const seedPool = [created];
      this.fallbackAudioPool.set(key, seedPool);
      this.fallbackAudioPoolIndex.set(key, 0);
      return created;
    } catch {
      return null;
    }
  }

  pickComboVoice(level, lineCount) {
    const state = this.comboVoiceState;
    state.combosSinceVoice += 1;

    state.qualifiedComboCount += 1;

    // Requested sequence:
    // 1st combo -> Good Job
    // 2nd combo -> optional (mostly silent)
    // 3rd combo -> Perfect
    if (state.qualifiedComboCount === 1) {
      state.lastAtMs = performance.now();
      state.lastKey = "comboGoodJob";
      state.combosSinceVoice = 0;
      return "comboGoodJob";
    }
    if (state.qualifiedComboCount === 2) {
      if (Math.random() < 0.25) {
        state.lastAtMs = performance.now();
        state.lastKey = "comboGoodJob";
        state.combosSinceVoice = 0;
        return "comboGoodJob";
      }
      return null;
    }
    if (state.qualifiedComboCount === 3) {
      state.lastAtMs = performance.now();
      state.lastKey = "comboPerfect";
      state.combosSinceVoice = 0;
      return "comboPerfect";
    }

    const now = performance.now();
    const minGapMsByLevel = { 1: 7000, 2: 6000, 3: 5200 };
    const minCombosByLevel = { 1: 1, 2: 1, 3: 1 };
    const chanceByLevel = { 1: 0.35, 2: 0.58, 3: 0.9 };

    if ((now - state.lastAtMs) < minGapMsByLevel[level]) {
      return null;
    }
    if (state.combosSinceVoice < minCombosByLevel[level]) {
      return null;
    }
    if (Math.random() > chanceByLevel[level]) {
      return null;
    }

    let voiceKey = level >= 3 ? "comboIncredible" : "comboPerfect";

    // Avoid repetitive back-to-back same callouts in long runs.
    if (state.lastKey === voiceKey) {
      if (level >= 3 && Math.random() < 0.3) {
        voiceKey = "comboPerfect";
      }
    }

    state.lastAtMs = now;
    state.lastKey = voiceKey;
    state.combosSinceVoice = 0;
    return voiceKey;
  }

  voiceKeyToCallout(voiceKey) {
    if (voiceKey === "comboGoodJob") {
      return "GOOD JOB";
    }
    if (voiceKey === "comboPerfect") {
      return "PERFECT";
    }
    if (voiceKey === "comboIncredible") {
      return "INCREDIBLE";
    }
    return "";
  }
}

export { SoundManager as AudioHooks };
