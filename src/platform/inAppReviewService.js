export function createInAppReviewService() {
  const getCapacitorBridge = () => {
    try {
      const bridge = window.Capacitor;
      return bridge && typeof bridge === "object" ? bridge : null;
    } catch {
      return null;
    }
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

  const getPlugin = () => {
    try {
      const plugins = window?.Capacitor?.Plugins;
      return plugins?.InAppReview || plugins?.AppReview || plugins?.RateApp || null;
    } catch {
      return null;
    }
  };

  const requestReview = async () => {
    if (!isNativePlatform()) {
      return { attempted: false, supported: false };
    }
    const plugin = getPlugin();
    if (!plugin) {
      return { attempted: false, supported: false };
    }
    try {
      if (typeof plugin.requestReview === "function") {
        await plugin.requestReview();
        return { attempted: true, supported: true };
      }
      if (typeof plugin.requestInAppReview === "function") {
        await plugin.requestInAppReview();
        return { attempted: true, supported: true };
      }
      if (typeof plugin.request === "function") {
        await plugin.request();
        return { attempted: true, supported: true };
      }
      return { attempted: false, supported: false };
    } catch {
      return { attempted: false, supported: true };
    }
  };

  return {
    isSupported() {
      return isNativePlatform() && Boolean(getPlugin());
    },
    requestReview,
  };
}
