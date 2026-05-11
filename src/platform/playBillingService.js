const BILLING_PRODUCT_TYPE = "inapp";

function getCapacitorBridge() {
  const bridge = window.Capacitor;
  if (!bridge || typeof bridge !== "object") {
    return null;
  }
  return bridge;
}

function getPlatform() {
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
}

function isNativePlatform() {
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
}

function getPlugin() {
  try {
    return window?.Capacitor?.Plugins?.PlayBilling ?? null;
  } catch {
    return null;
  }
}

function getErrorMessage(error) {
  if (!error) {
    return "Unknown billing error";
  }
  if (typeof error === "string") {
    return error;
  }
  return String(error?.message || error?.errorMessage || "Unknown billing error");
}

export function createPlayBillingService(options = {}) {
  const productId = String(options.productId || "").trim();
  const consumeAfterPurchase = options.consumeAfterPurchase === true;
  const supported =
    isNativePlatform() &&
    getPlatform() === "android" &&
    Boolean(getPlugin()) &&
    productId.length > 0;

  let productDetails = null;
  let warmupPromise = null;

  async function refreshProductDetails() {
    if (!supported) {
      return null;
    }
    const plugin = getPlugin();
    if (!plugin) {
      return null;
    }
    try {
      const result = await plugin.getProductDetails({
        productId,
        productType: BILLING_PRODUCT_TYPE,
      });
      if (result?.found) {
        productDetails = result;
        return productDetails;
      }
      productDetails = null;
      return null;
    } catch {
      productDetails = null;
      return null;
    }
  }

  async function warmup() {
    if (!supported) {
      return false;
    }
    if (warmupPromise) {
      return warmupPromise;
    }
    warmupPromise = (async () => {
      const plugin = getPlugin();
      if (!plugin) {
        return false;
      }
      try {
        await plugin.isAvailable();
      } catch {
        // Ignore - details request below is enough to detect readiness.
      }
      await refreshProductDetails();
      return true;
    })();
    try {
      return await warmupPromise;
    } finally {
      warmupPromise = null;
    }
  }

  async function purchase() {
    if (!supported) {
      return { ok: false, status: "unsupported", message: "Billing is not supported on this platform." };
    }
    const plugin = getPlugin();
    if (!plugin) {
      return { ok: false, status: "unavailable", message: "Billing plugin unavailable." };
    }
    try {
      const result = await plugin.purchase({
        productId,
        productType: BILLING_PRODUCT_TYPE,
        consumeAfterPurchase,
      });
      const status = String(result?.status || "").toLowerCase();
      if (status === "purchased") {
        return { ok: true, status: "purchased", details: result };
      }
      if (status === "pending") {
        return { ok: false, status: "pending", message: "Purchase pending approval.", details: result };
      }
      if (status === "cancelled") {
        return { ok: false, status: "cancelled", message: "Purchase cancelled.", details: result };
      }
      return {
        ok: false,
        status: status || "error",
        message: String(result?.message || "Purchase failed."),
        details: result,
      };
    } catch (error) {
      return { ok: false, status: "error", message: getErrorMessage(error) };
    }
  }

  async function restore() {
    if (!supported) {
      return { owned: false, status: "unsupported" };
    }
    const plugin = getPlugin();
    if (!plugin) {
      return { owned: false, status: "unavailable" };
    }
    try {
      const result = await plugin.restorePurchases({
        productId,
        productType: BILLING_PRODUCT_TYPE,
      });
      return {
        owned: Boolean(result?.owned),
        status: String(result?.status || (result?.owned ? "owned" : "not_owned")),
        details: result,
      };
    } catch (error) {
      return { owned: false, status: "error", message: getErrorMessage(error) };
    }
  }

  function getDisplayPrice() {
    if (productDetails?.formattedPrice) {
      return String(productDetails.formattedPrice);
    }
    if (productDetails?.price) {
      return String(productDetails.price);
    }
    return null;
  }

  return {
    isSupported() {
      return supported;
    },
    getProductId() {
      return productId;
    },
    getCachedProductDetails() {
      return productDetails;
    },
    getDisplayPrice,
    warmup,
    refreshProductDetails,
    purchase,
    restore,
  };
}
