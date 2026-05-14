const SUPPORTED_LOCALES = Object.freeze(["en", "tr"]);

const STRINGS = Object.freeze({
  en: Object.freeze({
    score: "Score",
    settings: "Settings",
    game_control: "Game Control",
    sound: "Sound",
    vibration: "Vibration",
    visual_mode: "Visual Mode",
    relaxing_mode: "Relaxing Mode",
    relaxing_music: "Relaxing Music",
    relaxing_music_note: "Optional standalone music",
    back_to_game: "Back To Game",
    remove_ads: "Remove Ads",
    badges: "Badges",
    leaderboard: "Leaderboard",
    restart_run: "Restart Run",
    back_to_home: "Back To Home",
    on: "On",
    off: "Off",
    choose: "Choose",
    change: "Change",
    sound_on: "Sound on",
    sound_off: "Sound off",
    game_over: "Game Over",
    best: "Best",
    play_again: "Play Again",
    home: "Home",
    watch_ad_continue: "Watch Ad Continue",
    rewarded_today: "{count}/{limit} today",
    native_android_only: "Native Android only",
    ads_removed: "Ads Removed",
    remove_ads_title: "Go Ad-Free",
    remove_ads_desc_offer: "Removes in-game banner/interstitial ads. Rewarded ads stay optional for extra rewards.",
    remove_ads_desc_active: "Gameplay banner/interstitial ads are disabled. Rewarded ads stay optional for extra rewards.",
    already_active: "Already Active",
    close: "Close",
    processing: "Processing...",
    wait: "Wait...",
    not_now: "Not Now",
    pay: "Pay {price}",
    purchase_only_android: "Purchases are available on Google Play Android builds only.",
    journey: "Journey",
    journey_complete_all: "Complete all 100 levels to unlock!",
    start_selected_level: "Start selected level",
    level_label: "Level {level}",
    level_complete: "Level Complete",
    next_level: "Next Level",
    replay_level: "Replay Level",
    level_completed_title: "Level {level} Completed",
    level_complete_short: "Level {level} Complete",
    milestone_reached: "Milestone Reached",
    new_color_block_unlocked: "New Color Block Unlocked",
    ruby_unlocked_from_level: "Ruby Red blocks are now active from Level {level}.",
    ruby_unlocked_upcoming: "Ruby Red blocks are now active in upcoming Journey levels.",
    continue: "Continue",
    start_level: "Start Level {level}",
    only_players_reached: "Only {percent}% of players made it this far",
    shop: "Shop",
    shop_subtitle: "Boost your run with premium power packs",
    daily_reward: "Daily Reward",
    ready: "Ready",
    locked: "Locked",
    available_in: "Available in: {value}",
    collect_reward: "Collect reward",
    pack_starter_name: "Starter Pack",
    pack_starter_meta: "Twist x6 • Hammer x4 • TNT x2",
    pack_value_name: "Value Pack",
    pack_value_meta: "Twist x14 • Hammer x9 • TNT x5",
    pack_best_value_name: "Best Value Pack",
    pack_best_value_meta: "Twist x30 • Hammer x18 • TNT x10",
    pack_big_name: "Big Pack",
    pack_big_meta: "Twist x70 • Hammer x40 • TNT x24 • Remove Ads Included",
    all: "All",
    unlocked: "Unlocked",
    no_ranking_data: "No ranking data yet",
    weekly_race: "Weekly Race",
    global_top_players: "Global Top Players",
    weekly: "Weekly",
    global: "Global",
    your_rank: "Your Rank",
    choose_identity: "Choose your identity",
    enter_player_name: "Enter player name",
    player_name: "Player name",
    country: "Country",
    identity_lock_note: "You can not change this later.",
    no_space_left: "No space left",
    badge_unlocked: "Badge Unlocked",
    reason: "Reason",
    awesome: "Awesome",
    close_settings: "Close settings",
    close_details: "Close details",
    close_badge_popup: "Close badge popup",
    close_remove_ads_popup: "Close remove ads popup",
    rank_unlocked_summary: "{unlocked}/{total} unlocked",
    in_progress: "In progress - {progress}",
    status_unlocked: "Unlocked",
    status_locked: "locked",
    status_unlocked_word: "unlocked",
    daily_continue_limit: "Daily continue limit reached (5/5).",
    rewarded_not_ready: "Rewarded ad is not ready. Try again in a moment.",
    rewarded_not_completed: "Reward was not completed.",
    continue_unavailable: "Continue unavailable on this board. Try again.",
    ads_removed_note: "Ads removed. Rewarded ads remain optional.",
  }),
  tr: Object.freeze({
    score: "Skor",
    settings: "Ayarlar",
    game_control: "Oyun Kontrol",
    sound: "Ses",
    vibration: "Titreşim",
    visual_mode: "Görsel Mod",
    relaxing_mode: "Rahat Mod",
    relaxing_music: "Rahatlatıcı Müzik",
    relaxing_music_note: "İsteğe bağlı bağımsız müzik",
    back_to_game: "Oyuna Dön",
    remove_ads: "Reklam Kaldır",
    badges: "Rozetler",
    leaderboard: "Liderlik",
    restart_run: "Oyunu Yeniden Başlat",
    back_to_home: "Ana Menüye Dön",
    on: "Açık",
    off: "Kapalı",
    choose: "Seç",
    change: "Değiştir",
    sound_on: "Ses açık",
    sound_off: "Ses kapalı",
    game_over: "Oyun Bitti",
    best: "En İyi",
    play_again: "Tekrar Oyna",
    home: "Ana Menü",
    watch_ad_continue: "Reklam İzle Devam Et",
    rewarded_today: "{count}/{limit} bugün",
    native_android_only: "Sadece Android uygulamada",
    ads_removed: "Reklamlar Kaldırıldı",
    remove_ads_title: "Reklamsız Oyna",
    remove_ads_desc_offer: "Oyun içi banner/geçiş reklamlarını kaldırır. Ödüllü reklamlar ekstra ödül için isteğe bağlı kalır.",
    remove_ads_desc_active: "Oyun içi banner/geçiş reklamları kapalı. Ödüllü reklamlar ekstra ödül için isteğe bağlı kalır.",
    already_active: "Zaten Aktif",
    close: "Kapat",
    processing: "İşleniyor...",
    wait: "Bekleyin...",
    not_now: "Şimdi Değil",
    pay: "{price} Öde",
    purchase_only_android: "Satın alma yalnızca Google Play Android sürümünde kullanılabilir.",
    journey: "Yolculuk",
    journey_complete_all: "Kilidi açmak için 100 seviyenin tamamını bitir!",
    start_selected_level: "Seçili seviyeyi başlat",
    level_label: "Seviye {level}",
    level_complete: "Seviye Tamamlandı",
    next_level: "Sonraki Seviye",
    replay_level: "Seviyeyi Tekrar Oyna",
    level_completed_title: "Seviye {level} Tamamlandı",
    level_complete_short: "Seviye {level} Tamam",
    milestone_reached: "Kilometre Taşı",
    new_color_block_unlocked: "Yeni Renk Blok Açıldı",
    ruby_unlocked_from_level: "Ruby Red blokları artık Seviye {level} itibarıyla aktif.",
    ruby_unlocked_upcoming: "Ruby Red blokları yaklaşan Yolculuk seviyelerinde artık aktif.",
    continue: "Devam Et",
    start_level: "Seviye {level} Başlat",
    only_players_reached: "Oyuncuların sadece %{percent}'i buraya ulaştı",
    shop: "Mağaza",
    shop_subtitle: "Premium güç paketleriyle oyununu güçlendir",
    daily_reward: "Günlük Ödül",
    ready: "Hazır",
    locked: "Kilitli",
    available_in: "Kalan süre: {value}",
    collect_reward: "Ödülü Topla",
    pack_starter_name: "Başlangıç Paketi",
    pack_starter_meta: "Twist x6 • Hammer x4 • TNT x2",
    pack_value_name: "Avantaj Paketi",
    pack_value_meta: "Twist x14 • Hammer x9 • TNT x5",
    pack_best_value_name: "En İyi Paket",
    pack_best_value_meta: "Twist x30 • Hammer x18 • TNT x10",
    pack_big_name: "Büyük Paket",
    pack_big_meta: "Twist x70 • Hammer x40 • TNT x24 • Reklam Kaldır Dahil",
    all: "Tümü",
    unlocked: "Açılan",
    no_ranking_data: "Henüz sıralama verisi yok",
    weekly_race: "Haftalık Yarış",
    global_top_players: "Global En İyi Oyuncular",
    weekly: "Haftalık",
    global: "Global",
    your_rank: "Sıralaman",
    choose_identity: "Profilini seç",
    enter_player_name: "Oyuncu adı gir",
    player_name: "Oyuncu adı",
    country: "Ülke",
    identity_lock_note: "Bu seçim daha sonra değiştirilemez.",
    no_space_left: "Boş alan kalmadı",
    badge_unlocked: "Rozet Açıldı",
    reason: "Neden",
    awesome: "Harika",
    close_settings: "Ayarları kapat",
    close_details: "Detayı kapat",
    close_badge_popup: "Rozet penceresini kapat",
    close_remove_ads_popup: "Reklam kaldır penceresini kapat",
    rank_unlocked_summary: "{unlocked}/{total} açıldı",
    in_progress: "Devam ediyor - {progress}",
    status_unlocked: "Açıldı",
    status_locked: "kilitli",
    status_unlocked_word: "açıldı",
    daily_continue_limit: "Günlük devam limiti doldu (5/5).",
    rewarded_not_ready: "Ödüllü reklam hazır değil. Birazdan tekrar dene.",
    rewarded_not_completed: "Ödül tamamlanmadı.",
    continue_unavailable: "Bu tabloda devam kullanılamıyor. Tekrar dene.",
    ads_removed_note: "Reklamlar kaldırıldı. Ödüllü reklamlar isteğe bağlı olarak kalır.",
  }),
});

let currentLocale = "en";

function resolveLocale(locale) {
  const raw = String(locale || "").trim().toLowerCase();
  if (raw.startsWith("tr")) {
    return "tr";
  }
  return "en";
}

function interpolate(template, vars = {}) {
  return String(template).replace(/\{(\w+)\}/g, (_, key) => {
    const value = vars[key];
    return value === undefined || value === null ? "" : String(value);
  });
}

export function t(key, vars = {}) {
  const dict = STRINGS[currentLocale] || STRINGS.en;
  const fallback = STRINGS.en[key] ?? key;
  const template = dict[key] ?? fallback;
  return interpolate(template, vars);
}

function setText(selector, key, vars = {}) {
  const el = document.querySelector(selector);
  if (el instanceof HTMLElement) {
    el.textContent = t(key, vars);
  }
}

function setAttr(selector, attr, key, vars = {}) {
  const el = document.querySelector(selector);
  if (el instanceof HTMLElement) {
    el.setAttribute(attr, t(key, vars));
  }
}

function setIndexedText(selector, index, key, vars = {}) {
  const list = document.querySelectorAll(selector);
  const node = list[index];
  if (node instanceof HTMLElement) {
    node.textContent = t(key, vars);
  }
}

export function applyStaticTranslations() {
  setText(".score-title", "score");
  setText("#menu-settings-subtitle", "sound_on");
  setAttr("#pause-btn", "aria-label", "settings");
  setAttr("#menu-settings-btn", "aria-label", "settings");
  setAttr("#menu-shop-open-btn", "aria-label", "shop");
  setAttr("#menu-leaderboard-open-btn", "aria-label", "leaderboard");
  setAttr("#menu-badges-open-btn", "aria-label", "badges");
  setText("#menu-badges-screen .menu-badges-title", "badges");
  setText("#menu-badges-screen .menu-badges-summary", "rank_unlocked_summary", { unlocked: 0, total: 0 });
  setText("#menu-badges-filter-all", "all");
  setText("#menu-badges-filter-unlocked", "unlocked");
  setText("#menu-badges-filter-locked", "locked");
  setText("#menu-leaderboard-screen .menu-leaderboard-title", "leaderboard");
  setText(".menu-leaderboard-you-label", "your_rank");
  setText(".menu-leaderboard-setup-title", "choose_identity");
  setAttr("#menu-leaderboard-name-input", "placeholder", "enter_player_name");
  setAttr("#menu-leaderboard-name-input", "aria-label", "player_name");
  setText(".menu-leaderboard-setup-note", "identity_lock_note");
  setText("#menu-leaderboard-save-btn", "continue");
  setText("#menu-shop-screen .menu-shop-title", "shop");
  setText("#menu-shop-screen .menu-shop-subtitle", "shop_subtitle");
  setText("#menu-shop-screen .menu-shop-daily-kicker", "daily_reward");
  setText("#menu-shop-daily-status-pill", "locked");
  setText("#menu-shop-daily-claim-btn", "collect_reward");
  setText(".settings-kicker", "settings");
  setText(".settings-title", "game_control");
  setIndexedText(".settings-label", 0, "sound");
  setIndexedText(".settings-label", 1, "vibration");
  setIndexedText(".settings-label", 2, "visual_mode");
  setIndexedText(".settings-label", 3, "relaxing_mode");
  setIndexedText(".settings-label", 4, "relaxing_music");
  setText(".settings-label-note", "relaxing_music_note");
  setText("#settings-resume-btn", "back_to_game");
  setText("#settings-remove-ads-btn", "remove_ads");
  setText("#settings-badges-btn", "badges");
  setText("#settings-leaderboard-btn", "leaderboard");
  setText("#settings-restart-btn", "restart_run");
  setText("#settings-home-btn", "back_to_home");
  setText(".gameover-heading", "game_over");
  setIndexedText(".gameover-stat-label", 0, "score");
  setIndexedText(".gameover-stat-label", 1, "best");
  setIndexedText(".gameover-btn-label", 0, "play_again");
  setIndexedText(".gameover-btn-label", 1, "home");
  setText(".gameover-continue-text", "watch_ad_continue");
  setText("#no-space-banner", "no_space_left");
  setText(".level-complete-kicker", "level_complete");
  setText("#adventure-next-btn", "next_level");
  setText("#adventure-replay-btn", "replay_level");
  setText(".milestone-unlock-kicker", "milestone_reached");
  setText(".milestone-unlock-subtitle", "new_color_block_unlocked");
  setText("#milestone-unlock-continue-btn", "continue");
  setText(".badge-unlock-kicker", "badge_unlocked");
  setText(".badge-unlock-reason-label", "reason");
  setText("#badge-unlock-close-btn", "awesome");
  setText("#remove-ads-modal .modal-kicker", "remove_ads");
  setText("#remove-ads-title", "remove_ads_title");
  setText("#remove-ads-cancel-btn", "not_now");
  setAttr("#settings-close-btn", "aria-label", "close_settings");
  setAttr("#menu-badge-detail-backdrop", "aria-label", "close_details");
  setAttr("#menu-badge-detail-close", "aria-label", "close");
  setAttr("#badge-unlock-backdrop", "aria-label", "close_badge_popup");
  setAttr("#remove-ads-backdrop", "aria-label", "close_remove_ads_popup");
  setText(".journey-title", "journey");
  setText(".journey-hero-note", "journey_complete_all");
  setAttr("#journey-start-btn", "aria-label", "start_selected_level");
}

export function detectAndApplyLocale() {
  const detected = resolveLocale(window.navigator?.language || window.navigator?.languages?.[0] || "en");
  currentLocale = SUPPORTED_LOCALES.includes(detected) ? detected : "en";
  document.documentElement.setAttribute("lang", currentLocale);
  applyStaticTranslations();
  return currentLocale;
}

export function getCurrentLocale() {
  return currentLocale;
}

export function isTurkishLocale() {
  return currentLocale === "tr";
}

export function formatScoreByLocale(value) {
  const locale = currentLocale === "tr" ? "tr-TR" : "en-US";
  return Math.max(0, Math.floor(Number(value) || 0)).toLocaleString(locale);
}

export function getPackLocalizedText(pack) {
  if (!pack || typeof pack !== "object") {
    return { name: "", meta: "" };
  }
  const id = String(pack.id || "");
  if (id === "starter") {
    return { name: t("pack_starter_name"), meta: t("pack_starter_meta") };
  }
  if (id === "value") {
    return { name: t("pack_value_name"), meta: t("pack_value_meta") };
  }
  if (id === "best-value") {
    return { name: t("pack_best_value_name"), meta: t("pack_best_value_meta") };
  }
  if (id === "big") {
    return { name: t("pack_big_name"), meta: t("pack_big_meta") };
  }
  return { name: String(pack.name || ""), meta: String(pack.meta || "") };
}
