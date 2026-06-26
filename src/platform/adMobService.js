const DEFAULT_INTERSTITIAL_COOLDOWN_MS = 1000 * 60 * 2;

export function createAdMobService(options = {}) {
  const appId = String(options.appId || "");
  const bannerAdId = String(options.bannerAdId || "");
  const interstitialAdId = String(options.interstitialAdId || "");
  const rewardedAdId = String(options.rewardedAdId || "");
  const testing = Boolean(options.testing);
  const consentDebugGeography = Number.isFinite(Number(options.consentDebugGeography))
    ? Number(options.consentDebugGeography)
    : null;
  const consentTestDeviceIdentifiers = Array.isArray(options.consentTestDeviceIdentifiers)
    ? options.consentTestDeviceIdentifiers.map((id) => String(id || "").trim()).filter(Boolean)
    : [];
  const resetConsentOnInitialize = Boolean(options.resetConsentOnInitialize);
  const openAdInspectorOnInitialize = Boolean(options.openAdInspectorOnInitialize);
  const interstitialCooldownMs = Math.max(
    0,
    Number(options.interstitialCooldownMs ?? DEFAULT_INTERSTITIAL_COOLDOWN_MS) || 0,
  );

  const getCapacitorBridge = () => {
    const bridge = window.Capacitor;
    if (!bridge || typeof bridge !== "object") {
      return null;
    }
    return bridge;
  };

  const getPlatform = () => {
    const bridge = getCapacitorBridge();
    if (!bridge) {
      return "web";
    }
    try {
      if (typeof bridge.getPlatform === "function") {
        return String(bridge.getPlatform() || "web");
      }
      return String(bridge.platform || "web");
    } catch {
      return "web";
    }
  };

  const isNativePlatform = () => {
    const bridge = getCapacitorBridge();
    if (!bridge) {
      return false;
    }
    try {
      if (typeof bridge.isNativePlatform === "function") {
        return bridge.isNativePlatform() === true;
      }
      const platform = getPlatform();
      return platform === "android" || platform === "ios";
    } catch {
      return false;
    }
  };

  const platform = getPlatform();
  const supported = isNativePlatform() && (platform === "android" || platform === "ios");
  const configured = supported && appId && bannerAdId && interstitialAdId && rewardedAdId;

  let initialized = false;
  let initPromise = null;
  let listenersBound = false;
  let bannerVisible = false;
  let bannerShownOnce = false;
  let bannerRetryTimerId = 0;
  let bannerRetryAttempts = 0;
  let interstitialReady = false;
  let rewardedReady = false;
  let interstitialPreparing = false;
  let rewardedPreparing = false;
  let interstitialShowPromise = null;
  let rewardedShowPromise = null;
  let lastInterstitialShownAtMs = 0;
  let admobPlugin = null;
  let privacyBridgePlugin = null;
  let consentReady = false;
  let latestConsentInfo = null;
  let lastUnityPrivacyMetadata = null;
  let lastAdInitStatus = "not-started";
  let lastConsentError = "";

  const wait = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

  const INTERSTITIAL_EVENTS = {
    Loaded: "interstitialAdLoaded",
    FailedToLoad: "interstitialAdFailedToLoad",
    Showed: "interstitialAdShowed",
    Dismissed: "interstitialAdDismissed",
    FailedToShow: "interstitialAdFailedToShow",
  };
  const REWARDED_EVENTS = {
    Loaded: "onRewardedVideoAdLoaded",
    FailedToLoad: "onRewardedVideoAdFailedToLoad",
    Showed: "onRewardedVideoAdShowed",
    Rewarded: "onRewardedVideoAdReward",
    Dismissed: "onRewardedVideoAdDismissed",
    FailedToShow: "onRewardedVideoAdFailedToShow",
  };

  function ensurePlugin() {
    if (admobPlugin) {
      return admobPlugin;
    }
    try {
      const plugin = window?.Capacitor?.Plugins?.AdMob;
      if (!plugin || typeof plugin !== "object") {
        return null;
      }
      admobPlugin = plugin;
      return admobPlugin;
    } catch {
      return null;
    }
  }

  function ensurePrivacyBridge() {
    if (privacyBridgePlugin) {
      return privacyBridgePlugin;
    }
    try {
      const plugin = window?.Capacitor?.Plugins?.AdPrivacyBridge;
      if (!plugin || typeof plugin !== "object") {
        return null;
      }
      privacyBridgePlugin = plugin;
      return privacyBridgePlugin;
    } catch {
      return null;
    }
  }

  function isConsentGrantedForUnity(info) {
    const status = String(info?.status || "").toUpperCase();
    return Boolean(info?.canRequestAds) && (status === "OBTAINED" || status === "NOT_REQUIRED");
  }

  async function syncUnityPrivacyMetadata(info) {
    if (!["android", "ios"].includes(platform)) {
      lastUnityPrivacyMetadata = {
        gdprConsent: null,
        privacyConsent: null,
        bridgeAvailable: false,
        set: false,
        skipped: true,
        error: "",
      };
      return true;
    }
    const bridge = ensurePrivacyBridge();
    if (!bridge || typeof bridge.setUnityPrivacyConsent !== "function") {
      lastUnityPrivacyMetadata = {
        gdprConsent: null,
        privacyConsent: null,
        bridgeAvailable: false,
        set: false,
        error: "AdPrivacyBridge unavailable",
      };
      return false;
    }
    const consentGranted = isConsentGrantedForUnity(info);
    try {
      const result = await bridge.setUnityPrivacyConsent({
        gdprConsent: consentGranted,
        privacyConsent: consentGranted,
        canRequestAds: Boolean(info?.canRequestAds),
        status: String(info?.status || "UNKNOWN"),
        privacyOptionsRequirementStatus: String(info?.privacyOptionsRequirementStatus || "UNKNOWN"),
      });
      lastUnityPrivacyMetadata = {
        ...(result || {}),
        gdprConsent: consentGranted,
        privacyConsent: consentGranted,
        bridgeAvailable: true,
        set: true,
      };
      return true;
    } catch (error) {
      lastUnityPrivacyMetadata = {
        gdprConsent: consentGranted,
        privacyConsent: consentGranted,
        bridgeAvailable: true,
        set: false,
        error: String(error?.message || error || "Unable to set Unity privacy metadata"),
      };
      return false;
    }
  }

  function buildConsentOptions(overrides = {}) {
    const nextDebugGeography = Number.isFinite(Number(overrides.debugGeography))
      ? Number(overrides.debugGeography)
      : consentDebugGeography;
    const nextTestDeviceIdentifiers = Array.isArray(overrides.testDeviceIdentifiers)
      ? overrides.testDeviceIdentifiers.map((id) => String(id || "").trim()).filter(Boolean)
      : consentTestDeviceIdentifiers;
    const consentOptions = {
      tagForUnderAgeOfConsent: false,
    };
    if (nextDebugGeography !== null) {
      consentOptions.debugGeography = nextDebugGeography;
    }
    if (nextTestDeviceIdentifiers.length > 0) {
      consentOptions.testDeviceIdentifiers = nextTestDeviceIdentifiers;
    }
    return consentOptions;
  }

  async function requestConsentFlow(plugin, overrides = {}) {
    if (overrides.reset === true && typeof plugin.resetConsentInfo === "function") {
      await plugin.resetConsentInfo();
    }
    const requestedInfo = await plugin.requestConsentInfo(buildConsentOptions(overrides));
    const formInfo = overrides.showForm === false ? {} : await plugin.showConsentForm();
    latestConsentInfo = {
      ...(requestedInfo || {}),
      ...(formInfo || {}),
      isConsentFormAvailable: requestedInfo?.isConsentFormAvailable,
    };
    consentReady = Boolean(latestConsentInfo.canRequestAds);
    const unityPrivacyReady = await syncUnityPrivacyMetadata(latestConsentInfo);
    lastConsentError = unityPrivacyReady ? "" : "Unity privacy metadata could not be set.";
    return {
      consentInfo: getConsentInfoSnapshot(),
      unityPrivacyReady,
    };
  }

  async function ensureConsentBeforeAds(plugin) {
    if (!supported || !["android", "ios"].includes(platform)) {
      consentReady = true;
      return true;
    }
    if (
      !plugin
      || typeof plugin.requestConsentInfo !== "function"
      || typeof plugin.showConsentForm !== "function"
    ) {
      consentReady = false;
      lastConsentError = "AdMob UMP consent APIs unavailable.";
      return false;
    }
    try {
      const { unityPrivacyReady } = await requestConsentFlow(plugin, {
        reset: resetConsentOnInitialize,
      });
      if (!unityPrivacyReady || !consentReady) {
        return false;
      }
      return true;
    } catch (error) {
      consentReady = false;
      lastConsentError = String(error?.message || error || "Consent flow failed.");
      return false;
    }
  }

  const prepareInterstitial = async () => {
    if (!configured || !initialized || interstitialPreparing) {
      return interstitialReady;
    }
    const plugin = ensurePlugin();
    if (!plugin) {
      return false;
    }
    interstitialPreparing = true;
    try {
      await plugin.prepareInterstitial({
        adId: interstitialAdId,
        isTesting: testing,
        immersiveMode: true,
      });
      interstitialReady = true;
      return true;
    } catch {
      interstitialReady = false;
      return false;
    } finally {
      interstitialPreparing = false;
    }
  };

  const prepareRewarded = async () => {
    if (!configured || !initialized || rewardedPreparing) {
      return rewardedReady;
    }
    const plugin = ensurePlugin();
    if (!plugin) {
      return false;
    }
    rewardedPreparing = true;
    try {
      await plugin.prepareRewardVideoAd({
        adId: rewardedAdId,
        isTesting: testing,
        immersiveMode: true,
      });
      rewardedReady = true;
      return true;
    } catch {
      rewardedReady = false;
      return false;
    } finally {
      rewardedPreparing = false;
    }
  };

  const bindListeners = async () => {
    if (!configured || !initialized || listenersBound) {
      return;
    }
    const plugin = ensurePlugin();
    if (!plugin) {
      return;
    }
    listenersBound = true;
    await plugin.addListener(INTERSTITIAL_EVENTS.Loaded, () => {
      interstitialReady = true;
    });
    await plugin.addListener(INTERSTITIAL_EVENTS.Dismissed, async () => {
      interstitialReady = false;
      await wait(450);
      void prepareInterstitial();
    });
    await plugin.addListener(INTERSTITIAL_EVENTS.FailedToLoad, async () => {
      interstitialReady = false;
      await wait(1500);
      void prepareInterstitial();
    });
    await plugin.addListener(INTERSTITIAL_EVENTS.FailedToShow, async () => {
      interstitialReady = false;
      await wait(450);
      void prepareInterstitial();
    });

    await plugin.addListener(REWARDED_EVENTS.Loaded, () => {
      rewardedReady = true;
    });
    await plugin.addListener(REWARDED_EVENTS.Dismissed, async () => {
      rewardedReady = false;
      await wait(450);
      void prepareRewarded();
    });
    await plugin.addListener(REWARDED_EVENTS.FailedToLoad, async () => {
      rewardedReady = false;
      await wait(1500);
      void prepareRewarded();
    });
    await plugin.addListener(REWARDED_EVENTS.FailedToShow, async () => {
      rewardedReady = false;
      await wait(450);
      void prepareRewarded();
    });
  };

  const initialize = async () => {
    if (!configured) {
      lastAdInitStatus = supported ? "not-configured" : "unsupported";
      return false;
    }
    if (initialized) {
      lastAdInitStatus = "initialized";
      return true;
    }
    if (initPromise) {
      return initPromise;
    }
    initPromise = (async () => {
      const plugin = ensurePlugin();
      if (!plugin) {
        initialized = false;
        lastAdInitStatus = "admob-plugin-missing";
        return false;
      }
      try {
        const consentAllowed = await ensureConsentBeforeAds(plugin);
        if (!consentAllowed) {
          initialized = false;
          lastAdInitStatus = consentReady ? "privacy-metadata-blocked" : "consent-blocked";
          return false;
        }
        await plugin.initialize({
          initializeForTesting: testing,
          tagForChildDirectedTreatment: false,
          tagForUnderAgeOfConsent: false,
        });
        initialized = true;
        lastAdInitStatus = "initialized";
        await bindListeners();
        void prepareInterstitial();
        void prepareRewarded();
        if (openAdInspectorOnInitialize) {
          void openAdInspector();
        }
        return true;
      } catch (error) {
        initialized = false;
        lastAdInitStatus = "failed";
        lastConsentError = String(error?.message || error || "AdMob initialize failed.");
        return false;
      } finally {
        initPromise = null;
      }
    })();
    return initPromise;
  };

  const openAdInspector = async () => {
    const bridge = ensurePrivacyBridge();
    if (!supported || platform !== "android" || !bridge || typeof bridge.openAdInspector !== "function") {
      return false;
    }
    try {
      await bridge.openAdInspector();
      return true;
    } catch {
      return false;
    }
  };

  const runConsentDebug = async (overrides = {}) => {
    const plugin = ensurePlugin();
    if (!supported || !["android", "ios"].includes(platform)) {
      lastAdInitStatus = "unsupported";
      return {
        ok: false,
        reason: "Ad privacy debug only works inside native app.",
        diagnostics: getDiagnostics(),
      };
    }
    if (
      !plugin
      || typeof plugin.requestConsentInfo !== "function"
      || typeof plugin.showConsentForm !== "function"
    ) {
      lastConsentError = "AdMob UMP consent APIs unavailable.";
      return {
        ok: false,
        reason: lastConsentError,
        diagnostics: getDiagnostics(),
      };
    }
    try {
      const result = await requestConsentFlow(plugin, overrides);
      return {
        ok: Boolean(result.consentInfo?.canRequestAds && result.unityPrivacyReady),
        reason: "",
        diagnostics: getDiagnostics(),
      };
    } catch (error) {
      lastConsentError = String(error?.message || error || "Consent debug failed.");
      return {
        ok: false,
        reason: lastConsentError,
        diagnostics: getDiagnostics(),
      };
    }
  };

  function getConsentInfoSnapshot() {
    return latestConsentInfo ? { ...latestConsentInfo } : null;
  }

  function getDiagnostics() {
    return {
      platform,
      supported,
      configured: Boolean(configured),
      initialized,
      consentReady,
      consentInfo: getConsentInfoSnapshot(),
      unityPrivacy: lastUnityPrivacyMetadata ? { ...lastUnityPrivacyMetadata } : null,
      adInspectorAvailable: Boolean(
        supported
        && platform === "android"
        && ensurePrivacyBridge()
        && typeof ensurePrivacyBridge().openAdInspector === "function"
      ),
      lastAdInitStatus,
      lastConsentError,
    };
  }

  const scheduleBannerRetry = () => {
    if (bannerRetryTimerId) {
      return;
    }
    const attempt = Math.max(0, bannerRetryAttempts);
    const delayMs = Math.min(10000, 1000 * (2 ** attempt));
    bannerRetryAttempts = Math.min(attempt + 1, 4);
    bannerRetryTimerId = window.setTimeout(() => {
      bannerRetryTimerId = 0;
      if (!bannerVisible) {
        void setBannerVisible(true);
      }
    }, delayMs);
  };

  const setBannerVisible = async (visible) => {
    if (!configured) {
      return false;
    }
    const plugin = ensurePlugin();
    if (!plugin) {
      return false;
    }
    await initialize();
    if (!initialized) {
      return false;
    }
    if (visible) {
      if (bannerVisible) {
        bannerRetryAttempts = 0;
        return true;
      }
      try {
        if (bannerShownOnce) {
          await plugin.resumeBanner();
        } else {
          await plugin.showBanner({
            adId: bannerAdId,
            adSize: "ADAPTIVE_BANNER",
            position: "BOTTOM_CENTER",
            margin: 0,
            isTesting: testing,
          });
          bannerShownOnce = true;
        }
        bannerVisible = true;
        bannerRetryAttempts = 0;
        if (bannerRetryTimerId) {
          window.clearTimeout(bannerRetryTimerId);
          bannerRetryTimerId = 0;
        }
        return true;
      } catch {
        bannerVisible = false;
        scheduleBannerRetry();
        return false;
      }
    }
    if (bannerRetryTimerId) {
      window.clearTimeout(bannerRetryTimerId);
      bannerRetryTimerId = 0;
    }
    if (!bannerVisible) {
      bannerRetryAttempts = 0;
      return true;
    }
    try {
      await plugin.hideBanner();
      bannerVisible = false;
      bannerRetryAttempts = 0;
      return true;
    } catch {
      return false;
    }
  };

  const removeBanner = async () => {
    if (!configured || !initialized) {
      return;
    }
    const plugin = ensurePlugin();
    if (!plugin) {
      return;
    }
    try {
      await plugin.removeBanner();
    } catch {
      // no-op
    }
    bannerVisible = false;
    bannerShownOnce = false;
    if (bannerRetryTimerId) {
      window.clearTimeout(bannerRetryTimerId);
      bannerRetryTimerId = 0;
    }
    bannerRetryAttempts = 0;
  };

  const showInterstitial = async () => {
    if (interstitialShowPromise) {
      return interstitialShowPromise;
    }
    if (!configured) {
      return false;
    }
    const plugin = ensurePlugin();
    if (!plugin) {
      return false;
    }
    await initialize();
    if (!initialized) {
      return false;
    }
    const now = Date.now();
    if ((now - lastInterstitialShownAtMs) < interstitialCooldownMs) {
      return false;
    }
    if (!interstitialReady) {
      const readyNow = await prepareInterstitial();
      if (!readyNow) {
        return false;
      }
    }
    interstitialShowPromise = new Promise(async (resolve) => {
      const listenerHandles = [];
      let settled = false;
      let shown = false;
      let timeoutId = 0;
      const finish = (result) => {
        if (settled) {
          return;
        }
        settled = true;
        if (timeoutId) {
          window.clearTimeout(timeoutId);
        }
        void Promise.allSettled(listenerHandles.map((handle) => handle?.remove?.())).finally(() => {
          resolve(Boolean(result));
        });
      };
      try {
        listenerHandles.push(
          await plugin.addListener(INTERSTITIAL_EVENTS.Showed, () => {
            shown = true;
          }),
          await plugin.addListener(INTERSTITIAL_EVENTS.Dismissed, () => finish(true)),
          await plugin.addListener(INTERSTITIAL_EVENTS.FailedToShow, () => finish(false)),
        );
        timeoutId = window.setTimeout(() => finish(shown), 150000);
        await plugin.showInterstitial();
        shown = true;
        lastInterstitialShownAtMs = Date.now();
        interstitialReady = false;
      } catch {
        interstitialReady = false;
        finish(false);
      }
    }).finally(() => {
      interstitialShowPromise = null;
    });
    return interstitialShowPromise;
  };

  const showRewarded = async () => {
    if (rewardedShowPromise) {
      return rewardedShowPromise;
    }
    if (!configured) {
      return { shown: false, rewarded: false };
    }
    const plugin = ensurePlugin();
    if (!plugin) {
      return { shown: false, rewarded: false };
    }
    await initialize();
    if (!initialized) {
      return { shown: false, rewarded: false };
    }
    if (!rewardedReady) {
      const readyNow = await prepareRewarded();
      if (!readyNow) {
        return { shown: false, rewarded: false };
      }
    }
    rewardedShowPromise = new Promise(async (resolve) => {
      const listenerHandles = [];
      let settled = false;
      let shown = false;
      let rewarded = false;
      let timeoutId = 0;
      const finish = (result) => {
        if (settled) {
          return;
        }
        settled = true;
        if (timeoutId) {
          window.clearTimeout(timeoutId);
        }
        void Promise.allSettled(listenerHandles.map((handle) => handle?.remove?.())).finally(() => {
          resolve(result);
        });
      };
      try {
        listenerHandles.push(
          await plugin.addListener(REWARDED_EVENTS.Showed, () => {
            shown = true;
          }),
          await plugin.addListener(REWARDED_EVENTS.Rewarded, () => {
            rewarded = true;
          }),
          await plugin.addListener(REWARDED_EVENTS.Dismissed, () => {
            finish({ shown: true, rewarded });
          }),
          await plugin.addListener(REWARDED_EVENTS.FailedToShow, () => {
            finish({ shown: false, rewarded: false });
          }),
        );
        timeoutId = window.setTimeout(() => {
          finish({ shown, rewarded });
        }, 150000);
        void plugin.showRewardVideoAd().then((rewardItem) => {
          shown = true;
          if (rewardItem && typeof rewardItem === "object") {
            rewarded = true;
          }
        }).catch(() => {
          finish({ shown: false, rewarded: false });
        });
      } catch {
        finish({ shown: false, rewarded: false });
      }
    }).finally(() => {
      rewardedReady = false;
      rewardedShowPromise = null;
      void prepareRewarded();
    });
    return rewardedShowPromise;
  };

  return {
    isSupported() {
      return supported;
    },
    isConfigured() {
      return configured;
    },
    getConsentInfo() {
      return getConsentInfoSnapshot();
    },
    isConsentReady() {
      return consentReady;
    },
    getDiagnostics,
    initialize,
    runConsentDebug,
    openAdInspector,
    setBannerVisible,
    removeBanner,
    showInterstitial,
    showRewarded,
  };
}
