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
    native_android_only: "Native app only",
    already_active: "Already Active",
    close: "Close",
    processing: "Processing...",
    wait: "Wait...",
    not_now: "Not Now",
    journey: "Journey",
    journey_complete_all: "Complete all 100 levels to unlock!",
    journey_final_chest_locked: "The chest opens after Level 100",
    journey_final_chest_ready: "Final chest ready!",
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
    shop_subtitle: "Collect daily rewards and keep playing",
    daily_reward: "Daily Reward",
    bonus_reward: "Bonus Reward",
    ready: "Ready",
    locked: "Locked",
    available_in: "Available in: {value}",
    collect_reward: "Collect reward",
    watch_ad_reward: "Watch ad for reward",
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
    no_space_left: "No Space Left",
    badge_unlocked: "Badge Unlocked",
    reason: "Reason",
    awesome: "Awesome",
    close_settings: "Close settings",
    close_details: "Close details",
    close_badge_popup: "Close badge popup",
    rank_unlocked_summary: "{unlocked}/{total} unlocked",
    in_progress: "In progress - {progress}",
    status_unlocked: "Unlocked",
    status_locked: "locked",
    status_unlocked_word: "unlocked",
    daily_continue_limit: "Daily continue limit reached (5/5).",
    rewarded_not_ready: "Rewarded ad is not ready. Try again in a moment.",
    rewarded_not_completed: "Reward was not completed.",
    continue_unavailable: "Continue unavailable on this board. Try again.",
    update_available: "New Update Available",
    update_message: "Update Grid Crown for the latest improvements and the best game experience.",
    update_now: "Update",
    update_later: "Later",
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
    native_android_only: "Yalnızca yerel uygulamada",
    already_active: "Zaten Aktif",
    close: "Kapat",
    processing: "İşleniyor...",
    wait: "Bekleyin...",
    not_now: "Şimdi Değil",
    journey: "Yolculuk",
    journey_complete_all: "Kilidi açmak için 100 seviyenin tamamını bitir!",
    journey_final_chest_locked: "Kasa 100. seviye tamamlandığında açılır",
    journey_final_chest_ready: "Final kasası hazır!",
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
    shop_subtitle: "Günlük ödülleri topla ve oynamaya devam et",
    daily_reward: "Günlük Ödül",
    bonus_reward: "Bonus Ödül",
    ready: "Hazır",
    locked: "Kilitli",
    available_in: "Kalan süre: {value}",
    collect_reward: "Ödülü Topla",
    watch_ad_reward: "Reklam izle, ödül al",
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
    no_space_left: "No Space Left",
    badge_unlocked: "Rozet Açıldı",
    reason: "Neden",
    awesome: "Harika",
    close_settings: "Ayarları kapat",
    close_details: "Detayı kapat",
    close_badge_popup: "Rozet penceresini kapat",
    rank_unlocked_summary: "{unlocked}/{total} açıldı",
    in_progress: "Devam ediyor - {progress}",
    status_unlocked: "Açıldı",
    status_locked: "kilitli",
    status_unlocked_word: "açıldı",
    daily_continue_limit: "Günlük devam limiti doldu (5/5).",
    rewarded_not_ready: "Ödüllü reklam hazır değil. Birazdan tekrar dene.",
    rewarded_not_completed: "Ödül tamamlanmadı.",
    continue_unavailable: "Bu tabloda devam kullanılamıyor. Tekrar dene.",
    update_available: "Yeni Güncelleme Hazır",
    update_message: "En yeni iyileştirmeler ve en iyi oyun deneyimi için Grid Crown'u güncelle.",
    update_now: "Güncelle",
    update_later: "Daha Sonra",
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
  setText("#menu-shop-screen .menu-shop-bonus-kicker", "bonus_reward");
  setText("#menu-shop-daily-status-pill", "locked");
  setText("#menu-shop-daily-claim-btn", "collect_reward");
  setText("#menu-shop-bonus-claim-btn", "watch_ad_reward");
  setText(".settings-kicker", "settings");
  setText(".settings-title", "game_control");
  setIndexedText(".settings-label", 0, "sound");
  setIndexedText(".settings-label", 1, "vibration");
  setIndexedText(".settings-label", 2, "visual_mode");
  setIndexedText(".settings-label", 3, "relaxing_mode");
  setIndexedText(".settings-label", 4, "relaxing_music");
  setText(".settings-label-note", "relaxing_music_note");
  setText("#settings-resume-btn", "back_to_game");
  setText("#settings-restart-btn", "restart_run");
  setText("#settings-home-btn", "back_to_home");
  setText(".gameover-heading", "game_over");
  setIndexedText(".gameover-stat-label", 0, "score");
  setIndexedText(".gameover-stat-label", 1, "best");
  setIndexedText(".gameover-btn-label", 0, "play_again");
  setIndexedText(".gameover-btn-label", 1, "home");
  setText(".gameover-continue-text", "watch_ad_continue");
  setText(".level-complete-kicker", "level_complete");
  setText("#adventure-next-btn", "next_level");
  setText("#adventure-replay-btn", "replay_level");
  setText(".milestone-unlock-kicker", "milestone_reached");
  setText(".milestone-unlock-subtitle", "new_color_block_unlocked");
  setText("#milestone-unlock-continue-btn", "continue");
  setText(".badge-unlock-kicker", "badge_unlocked");
  setText(".badge-unlock-reason-label", "reason");
  setText("#badge-unlock-close-btn", "awesome");
  setAttr("#settings-close-btn", "aria-label", "close_settings");
  setAttr("#menu-badge-detail-backdrop", "aria-label", "close_details");
  setAttr("#menu-badge-detail-close", "aria-label", "close");
  setAttr("#badge-unlock-backdrop", "aria-label", "close_badge_popup");
  setText("#soft-update-title", "update_available");
  setText("#soft-update-message", "update_message");
  setText("#soft-update-open-btn", "update_now");
  setText("#soft-update-later-btn", "update_later");
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
