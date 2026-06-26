const NATIVE_IOS_PLATFORM = "ios";
const STATUS_NOT_REQUIRED = "not-required";
const STATUS_NOT_AVAILABLE = "not-available";

function getCapacitorBridge() {
  try {
    return window?.Capacitor || null;
  } catch {
    return null;
  }
}

function getPlatform(bridge) {
  try {
    if (typeof bridge?.getPlatform === "function") {
      return String(bridge.getPlatform() || "web");
    }
    return String(bridge?.platform || "web");
  } catch {
    return "web";
  }
}

function getPlugin(bridge) {
  try {
    return bridge?.Plugins?.AppTrackingTransparency || null;
  } catch {
    return null;
  }
}

export function createAppTrackingTransparencyService() {
  let lastStatus = null;

  function isSupported() {
    const bridge = getCapacitorBridge();
    return getPlatform(bridge) === NATIVE_IOS_PLATFORM && Boolean(getPlugin(bridge));
  }

  async function getStatus() {
    const bridge = getCapacitorBridge();
    if (getPlatform(bridge) !== NATIVE_IOS_PLATFORM) {
      lastStatus = STATUS_NOT_REQUIRED;
      return lastStatus;
    }
    const plugin = getPlugin(bridge);
    if (!plugin || typeof plugin.getStatus !== "function") {
      lastStatus = STATUS_NOT_AVAILABLE;
      return lastStatus;
    }
    try {
      const result = await plugin.getStatus();
      lastStatus = String(result?.status || STATUS_NOT_AVAILABLE);
      return lastStatus;
    } catch (error) {
      console.warn("[att] status check failed.", error);
      lastStatus = STATUS_NOT_AVAILABLE;
      return lastStatus;
    }
  }

  async function requestPermission() {
    const bridge = getCapacitorBridge();
    if (getPlatform(bridge) !== NATIVE_IOS_PLATFORM) {
      lastStatus = STATUS_NOT_REQUIRED;
      return { ok: true, status: lastStatus };
    }
    const plugin = getPlugin(bridge);
    if (!plugin || typeof plugin.requestPermission !== "function") {
      lastStatus = STATUS_NOT_AVAILABLE;
      return { ok: false, status: lastStatus };
    }
    try {
      const result = await plugin.requestPermission();
      lastStatus = String(result?.status || STATUS_NOT_AVAILABLE);
      return { ok: true, status: lastStatus };
    } catch (error) {
      console.warn("[att] permission request failed.", error);
      lastStatus = STATUS_NOT_AVAILABLE;
      return { ok: false, status: lastStatus };
    }
  }

  return {
    getLastStatus: () => lastStatus,
    getStatus,
    isSupported,
    requestPermission,
  };
}
