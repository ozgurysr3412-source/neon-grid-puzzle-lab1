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
    return bridge?.Plugins?.PhotoLibraryPicker || null;
  } catch {
    return null;
  }
}

export function createPhotoLibraryPickerService() {
  function isSupported() {
    const bridge = getCapacitorBridge();
    return getPlatform(bridge) === "ios" && typeof getPlugin(bridge)?.pickImage === "function";
  }

  async function pickImage() {
    const bridge = getCapacitorBridge();
    if (getPlatform(bridge) !== "ios") {
      return { ok: false, cancelled: false, reason: "not-ios" };
    }
    const plugin = getPlugin(bridge);
    if (!plugin || typeof plugin.pickImage !== "function") {
      return { ok: false, cancelled: false, reason: "plugin-unavailable" };
    }
    try {
      const result = await plugin.pickImage();
      if (result?.cancelled === true) {
        return { ok: false, cancelled: true, reason: "cancelled" };
      }
      const dataUrl = String(result?.dataUrl || "");
      if (!dataUrl.startsWith("data:image/")) {
        return { ok: false, cancelled: false, reason: "invalid-image" };
      }
      return {
        ok: true,
        cancelled: false,
        dataUrl,
        mimeType: String(result?.mimeType || "image/jpeg"),
      };
    } catch (error) {
      return {
        ok: false,
        cancelled: false,
        reason: String(error?.message || error || "photo-library-picker-failed"),
      };
    }
  }

  return {
    isSupported,
    pickImage,
  };
}
