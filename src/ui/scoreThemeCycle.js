export const SCORE_THEME_STEP = 5000;

export const SCORE_THEME_MODES = Object.freeze([
  "royal",
  "emerald",
  "sunset",
  "pink",
  "sapphire",
  "amber",
  "frost",
]);

export function getScoreThemeBand(score) {
  const safeScore = Math.max(0, Math.floor(Number(score) || 0));
  return Math.floor(safeScore / SCORE_THEME_STEP);
}

export function pickNextScoreTheme(currentMode, random = Math.random) {
  const current = SCORE_THEME_MODES.includes(currentMode) ? currentMode : "royal";
  const candidates = SCORE_THEME_MODES.filter((mode) => mode !== current);
  const roll = Math.max(0, Math.min(0.999999, Number(random()) || 0));
  return candidates[Math.floor(roll * candidates.length)];
}
