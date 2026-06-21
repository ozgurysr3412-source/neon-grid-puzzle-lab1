export class ScoringSystem {
  constructor(config) {
    this.config = config;
    this.comboChain = 0;
    this.lastClearAtMs = 0;
    this.comboWindowUntilMs = 0;
  }

  reset() {
    this.comboChain = 0;
    this.lastClearAtMs = 0;
    this.comboWindowUntilMs = 0;
  }

  applyPlacement(placedCellCount, clearedLineCount, options = {}) {
    const nowMs = Number.isFinite(options.nowMs) ? options.nowMs : Date.now();
    const comboGraceMs = Math.max(0, Number(this.config.COMBO_GRACE_MS ?? 0));
    const hasActiveComboWindow =
      comboGraceMs > 0 &&
      this.comboWindowUntilMs > 0 &&
      nowMs <= this.comboWindowUntilMs;
    const base = placedCellCount * this.config.BASE_PER_CELL;
    const lineBonus =
      clearedLineCount > 0
        ? (clearedLineCount * this.config.LINE_CLEAR_BONUS) +
          (Math.max(0, clearedLineCount - 1) * this.config.MULTI_LINE_STEP_BONUS)
        : 0;

    if (clearedLineCount > 0) {
      const continuedChain = (this.comboChain > 0 && hasActiveComboWindow)
        ? this.comboChain + 1
        : 1;
      const multiLineFloor = clearedLineCount >= 2 ? clearedLineCount : 1;
      this.comboChain = Math.max(continuedChain, multiLineFloor);
      this.lastClearAtMs = nowMs;
      this.comboWindowUntilMs = comboGraceMs > 0 ? nowMs + comboGraceMs : 0;
    } else {
      if (hasActiveComboWindow && this.comboChain > 0) {
        this.comboWindowUntilMs = comboGraceMs > 0 ? nowMs + comboGraceMs : 0;
      } else {
        this.comboChain = 0;
        this.comboWindowUntilMs = 0;
      }
    }

    const comboMultiplier =
      clearedLineCount > 0
        ? Math.min(
            this.config.MAX_COMBO_MULTIPLIER,
            1 + ((this.comboChain - 1) * this.config.COMBO_STEP),
          )
        : 1;

    const chainBonus =
      this.comboChain > 1 && clearedLineCount > 0
        ? this.config.COMBO_CHAIN_BONUS * (this.comboChain - 1)
        : 0;

    const highPressureBonus =
      (options.boardFillRatioBefore ?? 0) >= 0.72 && clearedLineCount > 0
        ? this.config.HIGH_PRESSURE_CLEAR_BONUS
        : 0;

    const flatBonus = options.flatBonus ?? 0;
    const delta = Math.round(((base + lineBonus) * comboMultiplier) + chainBonus + highPressureBonus + flatBonus);

    return {
      delta,
      base,
      lineBonus,
      chainBonus,
      highPressureBonus,
      comboChain: this.comboChain,
      comboWindowRemainingMs: Math.max(0, this.comboWindowUntilMs - nowMs),
      comboMultiplier,
      hadClear: clearedLineCount > 0,
      clearedLineCount,
    };
  }
}
