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

function isLikelyIosRuntime(bridge) {
  if (getPlatform(bridge) === NATIVE_IOS_PLATFORM) {
    return true;
  }
  try {
    const ua = window.navigator?.userAgent || "";
    const touchMac = /Macintosh/i.test(ua) && Number(window.navigator?.maxTouchPoints || 0) > 1;
    return /iPhone|iPad|iPod/i.test(ua) || touchMac;
  } catch {
    return false;
  }
}

async function waitForPlugin(timeoutMs = 2500) {
  const startedAt = Date.now();
  while ((Date.now() - startedAt) <= timeoutMs) {
    const bridge = getCapacitorBridge();
    const plugin = getPlugin(bridge);
    if (plugin && typeof plugin.requestPermission === "function") {
      return { bridge, plugin };
    }
    await new Promise((resolve) => window.setTimeout(resolve, 120));
  }
  const bridge = getCapacitorBridge();
  return { bridge, plugin: getPlugin(bridge) };
}

export function createAppTrackingTransparencyService() {
  let lastStatus = null;
  let requestPromise = null;

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

  async function requestPermission({ timeoutMs = 2500 } = {}) {
    const initialBridge = getCapacitorBridge();
    if (!isLikelyIosRuntime(initialBridge)) {
      lastStatus = STATUS_NOT_REQUIRED;
      return { ok: true, status: lastStatus };
    }
    if (requestPromise) {
      return requestPromise;
    }
    requestPromise = (async () => {
      const { plugin } = await waitForPlugin(timeoutMs);
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
      } finally {
        requestPromise = null;
      }
    })();
    return requestPromise;
  }

  return {
    getLastStatus: () => lastStatus,
    getStatus,
    isSupported,
    requestPermission,
  };
}
