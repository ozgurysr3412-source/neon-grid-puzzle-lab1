const DAILY_REWARD_READY_NOTIFICATION_ID = 72001;
const DAILY_REWARD_FALLBACK_NOTIFICATION_ID = 72002;
const DAILY_COMEBACK_NOTIFICATION_ID = 72003;
const DAILY_REWARD_ANDROID_CHANNEL_ID = "daily-reward-reminders";
const DAILY_REWARD_ANDROID_LARGE_ICON = "ic_notification_large";
const DAILY_REWARD_ANDROID_SMALL_ICON = "ic_notification_small";

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
    return window?.Capacitor?.Plugins?.LocalNotifications ?? null;
  } catch {
    return null;
  }
}

function resolveNextDailyAt(hour, nowMs) {
  const safeHour = Math.max(0, Math.min(23, Math.floor(Number(hour) || 19)));
  const now = new Date(Number(nowMs) || Date.now());
  const target = new Date(now);
  target.setHours(safeHour, 0, 0, 0);
  if (target.getTime() <= now.getTime()) {
    target.setDate(target.getDate() + 1);
  }
  return target;
}

export function createLocalNotificationService(options = {}) {
  const rewardIntervalMs = Math.max(1000, Number(options.rewardIntervalMs) || (24 * 60 * 60 * 1000));
  const fallbackHour = Math.max(0, Math.min(23, Number(options.fallbackHour) || 19));
  const comebackHour = Math.max(0, Math.min(23, Number(options.comebackHour) || 14));
  const comebackMinDelayMs = Math.max(0, Number(options.comebackMinDelayMs) || (2 * 60 * 60 * 1000));
  const readyTitle = String(options.readyTitle || "Gunluk odulun hazir");
  const readyBody = String(options.readyBody || "Grid Crown'da gunluk odul seni bekliyor. Hemen topla!");
  const fallbackTitle = String(options.fallbackTitle || "Odulunu unutma");
  const fallbackBody = String(options.fallbackBody || "Gunluk odul toplamak icin Grid Crown'a geri don!");
  const comebackTitle = String(options.comebackTitle || "Grid Crown seni bekliyor");
  const comebackBody = String(options.comebackBody || "Bugunun serisini bozma, oyuna geri don!");

  const supported = isNativePlatform() && Boolean(getPlugin());
  let channelEnsured = false;

  async function ensureChannel() {
    if (!supported || channelEnsured) {
      return;
    }
    if (getPlatform() !== "android") {
      channelEnsured = true;
      return;
    }
    const plugin = getPlugin();
    if (!plugin || typeof plugin.createChannel !== "function") {
      channelEnsured = true;
      return;
    }
    try {
      await plugin.createChannel({
        id: DAILY_REWARD_ANDROID_CHANNEL_ID,
        name: "Daily Reward",
        description: "Daily reward reminders",
        importance: 4,
        visibility: 1,
      });
    } catch {
      // no-op
    }
    channelEnsured = true;
  }

  async function ensurePermissions({ request = true } = {}) {
    if (!supported) {
      return false;
    }
    const plugin = getPlugin();
    if (!plugin) {
      return false;
    }
    try {
      const current = await plugin.checkPermissions();
      const display = String(current?.display || "");
      if (display === "granted") {
        return true;
      }
      if (!request || typeof plugin.requestPermissions !== "function") {
        return false;
      }
      const granted = await plugin.requestPermissions();
      return String(granted?.display || "") === "granted";
    } catch {
      return false;
    }
  }

  async function cancelDailyRewardNotifications() {
    if (!supported) {
      return;
    }
    const plugin = getPlugin();
    if (!plugin || typeof plugin.cancel !== "function") {
      return;
    }
    try {
      await plugin.cancel({
        notifications: [
          { id: DAILY_REWARD_READY_NOTIFICATION_ID },
          { id: DAILY_REWARD_FALLBACK_NOTIFICATION_ID },
          { id: DAILY_COMEBACK_NOTIFICATION_ID },
        ],
      });
    } catch {
      // no-op
    }
  }

  async function scheduleRewardReadyNotification(at) {
    const plugin = getPlugin();
    if (!plugin || typeof plugin.schedule !== "function") {
      return false;
    }
    await ensureChannel();
    try {
      await plugin.schedule({
        notifications: [
          {
            id: DAILY_REWARD_READY_NOTIFICATION_ID,
            title: readyTitle,
            body: readyBody,
            channelId: DAILY_REWARD_ANDROID_CHANNEL_ID,
            smallIcon: DAILY_REWARD_ANDROID_SMALL_ICON,
            largeIcon: DAILY_REWARD_ANDROID_LARGE_ICON,
            schedule: {
              at,
              allowWhileIdle: true,
            },
          },
        ],
      });
      return true;
    } catch {
      return false;
    }
  }

  async function scheduleFallbackNotification(at) {
    const plugin = getPlugin();
    if (!plugin || typeof plugin.schedule !== "function") {
      return false;
    }
    await ensureChannel();
    try {
      await plugin.schedule({
        notifications: [
          {
            id: DAILY_REWARD_FALLBACK_NOTIFICATION_ID,
            title: fallbackTitle,
            body: fallbackBody,
            channelId: DAILY_REWARD_ANDROID_CHANNEL_ID,
            smallIcon: DAILY_REWARD_ANDROID_SMALL_ICON,
            largeIcon: DAILY_REWARD_ANDROID_LARGE_ICON,
            schedule: {
              at,
              allowWhileIdle: true,
            },
          },
        ],
      });
      return true;
    } catch {
      return false;
    }
  }

  async function scheduleComebackNotification(at) {
    const plugin = getPlugin();
    if (!plugin || typeof plugin.schedule !== "function") {
      return false;
    }
    await ensureChannel();
    try {
      await plugin.schedule({
        notifications: [
          {
            id: DAILY_COMEBACK_NOTIFICATION_ID,
            title: comebackTitle,
            body: comebackBody,
            channelId: DAILY_REWARD_ANDROID_CHANNEL_ID,
            smallIcon: DAILY_REWARD_ANDROID_SMALL_ICON,
            largeIcon: DAILY_REWARD_ANDROID_LARGE_ICON,
            schedule: {
              at,
              allowWhileIdle: true,
            },
          },
        ],
      });
      return true;
    } catch {
      return false;
    }
  }

  function resolveNextComebackAt(nowMs) {
    const baseAt = resolveNextDailyAt(comebackHour, nowMs);
    const minAtMs = Number(nowMs) + comebackMinDelayMs;
    if (!Number.isFinite(minAtMs)) {
      return baseAt;
    }
    if (baseAt.getTime() >= minAtMs) {
      return baseAt;
    }
    const next = new Date(baseAt);
    next.setDate(next.getDate() + 1);
    return next;
  }

  async function rescheduleDailyRewardReminder({
    lastClaimAtMs = 0,
    nowMs = Date.now(),
    requestPermission = true,
  } = {}) {
    if (!supported) {
      return { ok: false, reason: "unsupported" };
    }

    const hasPermission = await ensurePermissions({ request: requestPermission });
    if (!hasPermission) {
      return { ok: false, reason: "permission" };
    }

    await cancelDailyRewardNotifications();

    const safeLastClaimAtMs = Math.max(0, Number(lastClaimAtMs) || 0);
    const safeNowMs = Math.max(0, Number(nowMs) || Date.now());
    const comebackAt = resolveNextComebackAt(safeNowMs);
    const comebackScheduled = await scheduleComebackNotification(comebackAt);

    if (safeLastClaimAtMs <= 0) {
      const fallbackAt = resolveNextDailyAt(fallbackHour, safeNowMs);
      const scheduled = await scheduleFallbackNotification(fallbackAt);
      return {
        ok: scheduled || comebackScheduled,
        mode: "fallback",
        atMs: fallbackAt.getTime(),
        comebackAtMs: comebackAt.getTime(),
      };
    }

    const nextReadyAtMs = safeLastClaimAtMs + rewardIntervalMs;
    if (nextReadyAtMs > safeNowMs) {
      const readyAt = new Date(nextReadyAtMs);
      const scheduled = await scheduleRewardReadyNotification(readyAt);
      return {
        ok: scheduled || comebackScheduled,
        mode: "ready",
        atMs: readyAt.getTime(),
        comebackAtMs: comebackAt.getTime(),
      };
    }

    const fallbackAt = resolveNextDailyAt(fallbackHour, safeNowMs);
    const scheduled = await scheduleFallbackNotification(fallbackAt);
    return {
      ok: scheduled || comebackScheduled,
      mode: "fallback",
      atMs: fallbackAt.getTime(),
      comebackAtMs: comebackAt.getTime(),
    };
  }

  return {
    isSupported() {
      return supported;
    },
    ensurePermissions,
    cancelDailyRewardNotifications,
    rescheduleDailyRewardReminder,
  };
}
