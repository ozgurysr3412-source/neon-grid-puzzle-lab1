const DEFAULT_INTERSTITIAL_COOLDOWN_MS = 1000 * 60 * 2;

export function createAdMobService(options = {}) {
  const appId = String(options.appId || "");
  const bannerAdId = String(options.bannerAdId || "");
  const interstitialAdId = String(options.interstitialAdId || "");
  const rewardedAdId = String(options.rewardedAdId || "");
  const testing = Boolean(options.testing);
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
  let interstitialReady = false;
  let rewardedReady = false;
  let interstitialPreparing = false;
  let rewardedPreparing = false;
  let lastInterstitialShownAtMs = 0;
  let admobPlugin = null;

  const wait = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

  const INTERSTITIAL_EVENTS = {
    Loaded: "interstitialAdLoaded",
    FailedToLoad: "interstitialAdFailedToLoad",
    Dismissed: "interstitialAdDismissed",
    FailedToShow: "interstitialAdFailedToShow",
  };
  const REWARDED_EVENTS = {
    Loaded: "onRewardedVideoAdLoaded",
    FailedToLoad: "onRewardedVideoAdFailedToLoad",
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
      return false;
    }
    if (initialized) {
      return true;
    }
    if (initPromise) {
      return initPromise;
    }
    initPromise = (async () => {
      const plugin = ensurePlugin();
      if (!plugin) {
        initialized = false;
        return false;
      }
      try {
        await plugin.initialize({
          initializeForTesting: testing,
          tagForChildDirectedTreatment: false,
          tagForUnderAgeOfConsent: false,
        });
        initialized = true;
        await bindListeners();
        void prepareInterstitial();
        void prepareRewarded();
        return true;
      } catch {
        initialized = false;
        return false;
      } finally {
        initPromise = null;
      }
    })();
    return initPromise;
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
        return true;
      } catch {
        return false;
      }
    }
    if (!bannerVisible) {
      return true;
    }
    try {
      await plugin.hideBanner();
      bannerVisible = false;
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
  };

  const showInterstitial = async () => {
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
    try {
      await plugin.showInterstitial();
      lastInterstitialShownAtMs = Date.now();
      interstitialReady = false;
      return true;
    } catch {
      interstitialReady = false;
      void prepareInterstitial();
      return false;
    }
  };

  const showRewarded = async () => {
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
    let rewarded = false;
    let rewardListener = null;
    try {
      rewardListener = await plugin.addListener(REWARDED_EVENTS.Rewarded, () => {
        rewarded = true;
      });
      await plugin.showRewardVideoAd();
      return { shown: true, rewarded };
    } catch {
      return { shown: false, rewarded: false };
    } finally {
      try {
        await rewardListener?.remove?.();
      } catch {
        // no-op
      }
      rewardedReady = false;
      void prepareRewarded();
    }
  };

  return {
    isSupported() {
      return supported;
    },
    isConfigured() {
      return configured;
    },
    initialize,
    setBannerVisible,
    removeBanner,
    showInterstitial,
    showRewarded,
  };
}
