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
    initialize,
    setBannerVisible,
    removeBanner,
    showInterstitial,
    showRewarded,
  };
}
