import {
  anyPieceFits,
  boardFillRatio,
  canPlacePiece,
  clearLines,
  cloneBoard,
  countNearCompleteLines,
  countPlaceablePieces,
  detectFullLines,
  hasAnyPlacementForPiece,
  placePiece,
} from "./boardLogic.js";

const CLEAR_FRIENDLY_IDS = new Set([
  "tri_h",
  "tri_v",
  "line4_h",
  "line4_v",
  "line5_h",
  "line5_v",
  "tee4",
]);

const COMBO_ASSIST_PREFERRED_IDS = new Set([
  "line4_h",
  "line4_v",
  "line5_h",
  "line5_v",
  "rect2x4",
  "rect4x2",
  "block3",
  "rect3x4",
  "rect4x3",
  "rect2x3",
  "rect3x2",
]);

function randomInt(max, random) {
  return Math.floor(random() * max);
}

function weightedPick(weights, random) {
  const entries = Object.entries(weights).filter(([, weight]) => weight > 0);
  if (!entries.length) {
    return "small";
  }

  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = random() * total;

  for (const [key, weight] of entries) {
    roll -= weight;
    if (roll <= 0) {
      return key;
    }
  }

  return entries[entries.length - 1][0];
}

function weightedPiecePick(pieces, random) {
  if (!pieces.length) {
    return null;
  }
  const total = pieces.reduce(
    (sum, piece) => sum + Math.max(0.01, Number(piece.weight ?? 1)),
    0,
  );
  let roll = random() * total;
  for (let i = 0; i < pieces.length; i += 1) {
    const weight = Math.max(0.01, Number(pieces[i].weight ?? 1));
    roll -= weight;
    if (roll <= 0) {
      return pieces[i];
    }
  }
  return pieces[pieces.length - 1];
}

export class PieceGenerator {
  constructor(config, catalog) {
    this.config = config;
    this.largeStreak = 0;
    this.random = Math.random;
    this.catalog = catalog;
    this.byCategory = catalog.reduce((acc, piece) => {
      if (!acc[piece.category]) {
        acc[piece.category] = [];
      }
      acc[piece.category].push(piece);
      return acc;
    }, {});
  }

  setRandom(randomFn) {
    this.random = typeof randomFn === "function" ? randomFn : Math.random;
  }

  isScoreTargetContext(context = {}) {
    return context.mode === "adventure" && context.adventureObjectiveKind === "score_target";
  }

  isComboAssistMode(context = {}) {
    if (this.config.SMART_ASSIST_ENABLED === false) {
      return false;
    }
    const mode = String(context.mode ?? "classic");
    const modeFlags = this.config.COMBO_ASSIST_MODES ?? {};
    return modeFlags[mode] !== false;
  }

  resolveComboAssistStrength(context = {}, fillRatio = 0) {
    if (!this.isComboAssistMode(context)) {
      return 0;
    }
    const highFillGate = Number(this.config.COMBO_ASSIST_HIGH_FILL_GATE ?? 0.78);
    const minStrength = Math.max(0, Math.min(1, Number(this.config.COMBO_ASSIST_MIN_STRENGTH ?? 0.1)));
    if (fillRatio >= highFillGate) {
      return minStrength;
    }

    const elapsedMs = Math.max(0, Number(context.runElapsedMs ?? 0));
    const fullWindowMs = Math.max(0, Number(this.config.COMBO_ASSIST_WINDOW_MS ?? 300000));
    const rampDownMs = Math.max(1, Number(this.config.COMBO_ASSIST_RAMP_DOWN_MS ?? 180000));

    let strength = 0;
    if (elapsedMs <= fullWindowMs) {
      strength = 1;
    } else if (elapsedMs <= (fullWindowMs + rampDownMs)) {
      const t = (elapsedMs - fullWindowMs) / rampDownMs;
      strength = Math.max(minStrength, 1 - t);
    } else {
      strength = minStrength;
    }

    if ((context.noClearTurns ?? 0) >= Number(this.config.RECOVERY_TRIGGER_NO_CLEAR_TURNS ?? 2)) {
      strength = Math.min(1, strength + 0.18);
    }

    return Math.max(0, Math.min(1, strength));
  }

  blendWeights(baseWeights, targetWeights, t) {
    const mix = Math.max(0, Math.min(1, Number(t) || 0));
    const keys = ["small", "medium", "large"];
    const result = {};
    keys.forEach((key) => {
      const base = Number(baseWeights?.[key] ?? 0);
      const target = Number(targetWeights?.[key] ?? base);
      result[key] = Math.max(0, (base * (1 - mix)) + (target * mix));
    });
    const total = keys.reduce((sum, key) => sum + result[key], 0);
    if (total <= 0) {
      return { small: 1, medium: 0, large: 0 };
    }
    keys.forEach((key) => {
      result[key] /= total;
    });
    return result;
  }

  getDynamicWeights(fillRatio, context = {}, assistStrength = 0) {
    let baseWeights;
    if (this.isScoreTargetContext(context)) {
      if ((context.noClearTurns ?? 0) >= 1) {
        baseWeights = { small: 0.72, medium: 0.25, large: 0.03 };
      } else if (fillRatio >= this.config.TIGHT_FILL_THRESHOLD) {
        baseWeights = { small: 0.58, medium: 0.38, large: 0.04 };
      } else if (fillRatio >= this.config.MID_FILL_THRESHOLD) {
        baseWeights = { small: 0.48, medium: 0.44, large: 0.08 };
      } else {
        baseWeights = { small: 0.4, medium: 0.48, large: 0.12 };
      }
    } else if ((context.noClearTurns ?? 0) >= this.config.RECOVERY_TRIGGER_NO_CLEAR_TURNS) {
      baseWeights = { ...this.config.SIZE_WEIGHTS_RECOVERY };
    } else if (fillRatio >= this.config.TIGHT_FILL_THRESHOLD) {
      baseWeights = { ...this.config.SIZE_WEIGHTS_TIGHT };
    } else if (fillRatio >= this.config.MID_FILL_THRESHOLD) {
      baseWeights = { ...this.config.SIZE_WEIGHTS_MID };
    } else {
      baseWeights = { ...this.config.SIZE_WEIGHTS_OPEN };
    }

    if (assistStrength <= 0) {
      return baseWeights;
    }
    const assistWeights = this.config.COMBO_ASSIST_CATEGORY_WEIGHTS ?? {
      small: 0.24,
      medium: 0.46,
      large: 0.3,
    };
    return this.blendWeights(baseWeights, assistWeights, assistStrength);
  }

  pickPieceFromCategory(category, excludedIds, options = {}) {
    const pool = this.byCategory[category] ?? [];
    if (!pool.length) {
      return weightedPiecePick(this.byCategory.small, this.random);
    }
    const uniquePool = pool.filter((piece) => !excludedIds.has(piece.id));
    let source = uniquePool.length ? uniquePool : pool;

    const assistStrength = Math.max(0, Math.min(1, Number(options.assistStrength ?? 0)));
    const preferredChanceBase = Number(this.config.COMBO_ASSIST_PREFERRED_PICK_CHANCE ?? 0.64);
    const preferredChance = Math.max(0, Math.min(1, preferredChanceBase * assistStrength));
    if (preferredChance > 0 && this.random() < preferredChance) {
      const preferredPool = source.filter((piece) => COMBO_ASSIST_PREFERRED_IDS.has(piece.id));
      if (preferredPool.length) {
        source = preferredPool;
      }
    }
    return weightedPiecePick(source, this.random);
  }

  ensureMinPlaceablePieces(board, selected, minPlaceable) {
    let guard = 0;
    while (countPlaceablePieces(board, selected) < minPlaceable && guard < 7) {
      guard += 1;
      const rescuePool = this.config.RESCUE_POOL_CATEGORIES.flatMap(
        (category) => this.byCategory[category] ?? [],
      ).filter((piece) => hasAnyPlacementForPiece(board, piece));

      if (!rescuePool.length) {
        break;
      }

      const slot = selected.findIndex((piece) => !hasAnyPlacementForPiece(board, piece));
      const replacementSlot = slot >= 0 ? slot : (selected.length - 1);
      selected[replacementSlot] = rescuePool[randomInt(rescuePool.length, this.random)];
    }
  }

  pieceCanCreateLineClear(board, piece) {
    const size = board.length;
    for (let row = 0; row < size; row += 1) {
      for (let col = 0; col < size; col += 1) {
        if (!canPlacePiece(board, piece, row, col)) {
          continue;
        }
        const boardCopy = cloneBoard(board);
        placePiece(boardCopy, piece, row, col, piece.tone);
        const lines = detectFullLines(boardCopy);
        if (lines.rows.length || lines.cols.length) {
          return true;
        }
      }
    }
    return false;
  }

  ensureClearFriendlyOption(board, selected) {
    if (selected.some((piece) => this.pieceCanCreateLineClear(board, piece))) {
      return;
    }
    const pool = this.catalog.filter((piece) => (
      CLEAR_FRIENDLY_IDS.has(piece.id) &&
      hasAnyPlacementForPiece(board, piece)
    ));
    if (!pool.length) {
      return;
    }
    const clearPool = pool.filter((piece) => this.pieceCanCreateLineClear(board, piece));
    const source = clearPool.length ? clearPool : pool;
    selected[selected.length - 1] = source[randomInt(source.length, this.random)];
  }

  ensurePreferredComboOption(board, selected) {
    const hasPreferredPlaceable = selected.some((piece) => (
      COMBO_ASSIST_PREFERRED_IDS.has(piece.id) &&
      hasAnyPlacementForPiece(board, piece)
    ));
    if (hasPreferredPlaceable) {
      return;
    }
    const pool = this.catalog.filter((piece) => (
      COMBO_ASSIST_PREFERRED_IDS.has(piece.id) &&
      hasAnyPlacementForPiece(board, piece)
    ));
    if (!pool.length) {
      return;
    }
    selected[selected.length - 1] = pool[randomInt(pool.length, this.random)];
  }

  ensureAtLeastOnePlaceablePiece(board, selected) {
    if (anyPieceFits(board, selected)) {
      return;
    }
    const rescuePool = this.catalog.filter((piece) => hasAnyPlacementForPiece(board, piece));
    if (!rescuePool.length) {
      return;
    }
    selected[selected.length - 1] = rescuePool[randomInt(rescuePool.length, this.random)];
  }

  evaluatePieceBestPlacement(board, piece, baseline = {}, assistStrength = 0) {
    const size = board.length;
    const maxRow = size - piece.height;
    const maxCol = size - piece.width;
    let bestScore = Number.NEGATIVE_INFINITY;
    let bestLineCount = 0;
    let placeable = false;

    for (let row = 0; row <= maxRow; row += 1) {
      for (let col = 0; col <= maxCol; col += 1) {
        if (!canPlacePiece(board, piece, row, col)) {
          continue;
        }
        placeable = true;
        const boardCopy = cloneBoard(board);
        placePiece(boardCopy, piece, row, col, piece.tone);
        const lines = detectFullLines(boardCopy);
        const lineCount = lines.rows.length + lines.cols.length;
        if (lineCount > 0) {
          clearLines(boardCopy, lines.rows, lines.cols);
        }

        const afterNear1 = countNearCompleteLines(boardCopy, 1);
        const afterNear2 = countNearCompleteLines(boardCopy, 2);
        const afterFill = boardFillRatio(boardCopy);

        const nearGain1 = Math.max(0, afterNear1 - baseline.near1);
        const nearGain2 = Math.max(0, afterNear2 - baseline.near2);
        const lineBoost = lineCount * 5.2;
        const chainChance = (afterNear1 * 0.58) + (afterNear2 * 0.26);
        const boardRelief = lineCount > 0
          ? ((lineCount * 1.7) + (Math.max(0, baseline.fill - afterFill) * 11))
          : 0;
        const deadZoneRisk =
          (Math.max(0, (afterFill - baseline.fill) - 0.055) * 8) +
          ((lineCount === 0 && (afterNear1 + afterNear2) < (baseline.near1 + baseline.near2)) ? 1.2 : 0);

        let score =
          lineBoost +
          (nearGain1 * 2.3) +
          (nearGain2 * 1.1) +
          (chainChance * 0.72) +
          boardRelief -
          deadZoneRisk;

        if (assistStrength > 0 && COMBO_ASSIST_PREFERRED_IDS.has(piece.id)) {
          score += 0.8 + (assistStrength * 0.9);
        }
        if (assistStrength > 0 && piece.cellCount >= 8) {
          score += (piece.cellCount >= 12 ? 1.45 : 0.85) * assistStrength;
        }

        if (score > bestScore) {
          bestScore = score;
          bestLineCount = lineCount;
        }
      }
    }

    return {
      score: placeable ? bestScore : -12,
      lineCount: bestLineCount,
      placeable,
      cellCount: Number(piece?.cellCount ?? 0),
      preferred: COMBO_ASSIST_PREFERRED_IDS.has(piece.id),
    };
  }

  evaluateSetScore(board, selected, context = {}, assistStrength = 0) {
    const baseline = {
      near1: countNearCompleteLines(board, 1),
      near2: countNearCompleteLines(board, 2),
      fill: boardFillRatio(board),
    };

    const breakdown = selected.map((piece) =>
      this.evaluatePieceBestPlacement(board, piece, baseline, assistStrength));
    const placeableCount = breakdown.filter((entry) => entry.placeable).length;
    if (placeableCount <= 0) {
      return Number.NEGATIVE_INFINITY;
    }

    const scores = breakdown.map((entry) => entry.score).sort((a, b) => b - a);
    const top = scores[0] ?? 0;
    const second = scores[1] ?? 0;
    const clearCount = breakdown.filter((entry) => entry.lineCount > 0).length;
    const preferredCount = breakdown.filter((entry) => entry.preferred).length;
    const heavyCount = breakdown.filter((entry) => entry.cellCount >= 8).length;
    const megaCount = breakdown.filter((entry) => entry.cellCount >= 12).length;

    let total =
      (top * 1.38) +
      ((top + second) * 0.46) +
      (placeableCount * 2.2) +
      (clearCount * 2.9);

    if (assistStrength > 0) {
      total += preferredCount * (0.7 + (assistStrength * 1.35));
      total += heavyCount * (0.45 + (assistStrength * 0.95));
      total += megaCount * (0.7 + (assistStrength * 1.5));
    }

    if ((context.noClearTurns ?? 0) >= Number(this.config.RECOVERY_TRIGGER_NO_CLEAR_TURNS ?? 2) && clearCount <= 0) {
      total -= 3.4;
    }
    return total;
  }

  generateCandidateSet(board, context = {}, fillRatio = 0, assistStrength = 0, largeStreakSeed = this.largeStreak) {
    const selected = [];
    const selectedIds = new Set();
    let largeCountThisSet = 0;
    let localLargeStreak = Math.max(0, Number(largeStreakSeed) || 0);

    for (let slot = 0; slot < 3; slot += 1) {
      const weights = this.getDynamicWeights(fillRatio, context, assistStrength);

      if (largeCountThisSet >= this.config.MAX_LARGE_PER_SET) {
        weights.large = 0;
      }
      if (localLargeStreak >= this.config.MAX_LARGE_STREAK_ACROSS_DRAWS) {
        weights.large = 0;
      }
      if (
        this.config.STARTER_LARGE_LOCK &&
        (context.generatedSetCount ?? 0) < this.config.STARTER_SET_COUNT
      ) {
        weights.large = 0;
      }

      const category = weightedPick(weights, this.random);
      const pickedPiece = this.pickPieceFromCategory(category, selectedIds, { assistStrength });
      const fallbackPiece =
        weightedPiecePick(this.catalog, this.random) ??
        weightedPiecePick(this.byCategory.small ?? [], this.random);
      const piece = pickedPiece ?? fallbackPiece;
      if (!piece) {
        continue;
      }
      selected.push(piece);
      selectedIds.add(piece.id);

      if (piece.category === "large") {
        largeCountThisSet += 1;
        localLargeStreak += 1;
      } else {
        localLargeStreak = 0;
      }
    }
    while (selected.length < 3) {
      const filler =
        weightedPiecePick(this.catalog, this.random) ??
        weightedPiecePick(this.byCategory.small ?? [], this.random);
      if (!filler) {
        break;
      }
      selected.push(filler);
    }

    this.ensureAtLeastOnePlaceablePiece(board, selected);
    const rescueFillThreshold = Number(this.config.COMBO_ASSIST_RESCUE_FILL_THRESHOLD ?? this.config.FAIRNESS_RESCUE_FILL_THRESHOLD);
    if (!anyPieceFits(board, selected) && fillRatio < rescueFillThreshold) {
      const rescuePool = this.config.RESCUE_POOL_CATEGORIES.flatMap(
        (category) => this.byCategory[category] ?? [],
      ).filter((piece) => hasAnyPlacementForPiece(board, piece));
      if (rescuePool.length) {
        selected[selected.length - 1] = rescuePool[randomInt(rescuePool.length, this.random)];
      }
    }

    const minPlaceable =
      fillRatio >= this.config.TIGHT_FILL_THRESHOLD
        ? this.config.MIN_PLACEABLE_PIECES_TIGHT
        : this.config.MIN_PLACEABLE_PIECES_OPEN;
    const assistMinPlaceable = Math.max(
      minPlaceable,
      Number(this.config.COMBO_ASSIST_MIN_PLACEABLE_PIECES ?? 2),
    );
    const targetMinPlaceable = assistStrength > 0.25 ? assistMinPlaceable : minPlaceable;
    this.ensureMinPlaceablePieces(board, selected, targetMinPlaceable);

    if (this.isScoreTargetContext(context) || assistStrength > 0.3) {
      this.ensureClearFriendlyOption(board, selected);
      this.ensureMinPlaceablePieces(board, selected, targetMinPlaceable);
    }
    if (assistStrength > 0.45) {
      this.ensurePreferredComboOption(board, selected);
      this.ensureMinPlaceablePieces(board, selected, targetMinPlaceable);
    }

    return {
      selected,
      largeStreakOut: localLargeStreak,
    };
  }

  nextSet(board, context = {}) {
    const fillRatio = boardFillRatio(board);
    const assistStrength = this.resolveComboAssistStrength(context, fillRatio);
    const smartEnabled = this.config.SMART_ASSIST_ENABLED !== false && this.isComboAssistMode(context);
    if (!smartEnabled) {
      const fallback = this.generateCandidateSet(board, context, fillRatio, assistStrength, this.largeStreak);
      this.largeStreak = fallback.largeStreakOut;
      return fallback.selected;
    }

    const candidateCount = Math.max(8, Math.floor(Number(this.config.SMART_SET_CANDIDATE_COUNT ?? 22)));
    const topPickCount = Math.max(1, Math.floor(Number(this.config.SMART_SET_TOP_PICK_COUNT ?? 4)));
    const candidates = [];

    for (let i = 0; i < candidateCount; i += 1) {
      const candidate = this.generateCandidateSet(board, context, fillRatio, assistStrength, this.largeStreak);
      const score = this.evaluateSetScore(board, candidate.selected, context, assistStrength);
      candidates.push({
        ...candidate,
        score,
      });
    }

    candidates.sort((a, b) => b.score - a.score);
    const shortlisted = candidates.slice(0, Math.max(1, Math.min(topPickCount, candidates.length)));
    const chosen = shortlisted[randomInt(shortlisted.length, this.random)] ?? candidates[0];
    this.largeStreak = Number(chosen?.largeStreakOut ?? this.largeStreak) || 0;
    return chosen?.selected ?? this.generateCandidateSet(board, context, fillRatio, assistStrength, this.largeStreak).selected;
  }
}
