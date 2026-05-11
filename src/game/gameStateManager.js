import { EventBus } from "../core/eventBus.js";
import { hashStringToSeed, mulberry32 } from "../core/random.js";
import {
  anyPieceFits,
  boardFillRatio,
  canPlacePiece,
  clearLines,
  cloneBoard,
  countNearCompleteLines,
  collectClearedCells,
  createBoard,
  detectFullLines,
  findFirstPlacementForPiece,
  getPieceCellsAt,
  placePiece,
} from "./boardLogic.js";
import { PIECE_CATALOG } from "./pieceCatalog.js";
import { PieceGenerator } from "./pieceGenerator.js";
import { ScoringSystem } from "./scoringSystem.js";
import { clampAdventureLevel, getAdventureLevel, getAdventureLevelCount } from "../meta/adventureMode.js";

const ADVENTURE_MARKER_CELL_TONE = Object.freeze({
  blue: 101,
  yellow: 102,
  red: 103,
});

function rotatePieceClockwise(piece) {
  const oldWidth = Math.max(1, Math.floor(Number(piece?.width) || 1));
  const oldHeight = Math.max(1, Math.floor(Number(piece?.height) || 1));
  const rotatedCells = (Array.isArray(piece?.cells) ? piece.cells : [])
    .map((cell) => ({
      x: (oldHeight - 1) - Math.max(0, Math.floor(Number(cell?.y) || 0)),
      y: Math.max(0, Math.floor(Number(cell?.x) || 0)),
    }))
    .sort((a, b) => (a.y - b.y) || (a.x - b.x));

  return {
    ...piece,
    width: oldHeight,
    height: oldWidth,
    cells: rotatedCells,
  };
}

function todayKeyLocal() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export class GameStateManager {
  constructor(tuning, options = {}) {
    this.tuning = tuning;
    this.progression = options.progression ?? null;
    this.telemetry = options.telemetry ?? null;
    this.events = new EventBus();
    this.scoring = new ScoringSystem(tuning.SCORING);
    this.generator = new PieceGenerator(tuning.GENERATION, PIECE_CATALOG);
    this.instanceIdCounter = 1;
    this.bestScore = this.loadBestScore();
    this.resetToMenu();
  }

  on(eventName, handler) {
    return this.events.on(eventName, handler);
  }

  resetToMenu() {
    this.status = "menu";
    this.mode = "classic";
    this.board = createBoard(this.tuning.BOARD_SIZE);
    this.pieces = Array(this.tuning.PIECES_PER_SET).fill(null);
    this.score = 0;
    this.turn = 0;
    this.noClearTurns = 0;
    this.generatedSetCount = 0;
    this.linesClearedTotal = 0;
    this.runMaxComboChain = 0;
    this.runIconsCollected = 0;
    this.scoring.reset();
    this.mission = this.progression?.nextMission?.() ?? null;
    this.adventure = null;
    this.adventureTimerLastSecond = -1;
    this.runStartedAtMs = 0;
    this.ended = false;
    this.runBestPopupShown = false;
  }

  goToMenu() {
    this.resetToMenu();
    this.emitState();
  }

  startGame(options = {}) {
    this.status = "playing";
    this.mode = options.mode ?? "classic";
    this.board = createBoard(this.tuning.BOARD_SIZE);
    this.score = 0;
    this.turn = 0;
    this.noClearTurns = 0;
    this.generatedSetCount = 0;
    this.linesClearedTotal = 0;
    this.runMaxComboChain = 0;
    this.runIconsCollected = 0;
    this.scoring.reset();
    this.ended = false;
    this.runBestPopupShown = false;
    this.runStartedAtMs = performance.now();
    this.adventure = null;
    this.adventureTimerLastSecond = -1;
    if (this.mode === "adventure") {
      const maxLevel = getAdventureLevelCount();
      const preferredLevel = options.level ?? this.progression?.getAdventureCurrentLevel?.(maxLevel) ?? 1;
      const level = clampAdventureLevel(preferredLevel);
      this.adventure = getAdventureLevel(level);
      this.initializeAdventureObjectiveState();
      this.seedAdventureMarkersOnBoard();
      this.mission = null;
    } else {
      this.mission = this.progression?.nextMission?.() ?? null;
    }

    if (this.mode === "daily") {
      const seed = hashStringToSeed(`daily:${todayKeyLocal()}`);
      this.generator.setRandom(mulberry32(seed));
    } else {
      this.generator.setRandom(Math.random);
    }

    this.pieces = this.buildPieceInstances(this.nextPieceSet());
    this.validateState();
    this.checkGameOver();
    this.emitState();
  }

  togglePause() {
    if (this.status === "playing") {
      this.status = "paused";
    } else if (this.status === "paused") {
      this.status = "playing";
    }
    this.emitState();
  }

  resume() {
    if (this.status === "paused") {
      this.status = "playing";
      this.emitState();
    }
  }

  continueFromGameOverWithSingleDots() {
    if (this.status !== "over") {
      return false;
    }

    const dotTemplate = PIECE_CATALOG.find((piece) => piece?.id === "dot");
    if (!dotTemplate) {
      return false;
    }

    const nextPieces = Array.from({ length: this.tuning.PIECES_PER_SET }, () => ({
      ...dotTemplate,
      cells: dotTemplate.cells.map((cell) => ({ ...cell })),
    }));

    this.status = "playing";
    this.ended = false;
    this.pieces = this.buildPieceInstances(nextPieces);
    this.validateState();
    this.checkGameOver();
    this.emitState();
    return this.status === "playing";
  }

  isInteractive() {
    return this.status === "playing";
  }

  getPiece(slotIndex) {
    return this.pieces[slotIndex] ?? null;
  }

  rotatePieceInSlot(slotIndex) {
    if (!this.isInteractive()) {
      return { success: false, reason: "not_interactive" };
    }
    if (!Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex >= this.pieces.length) {
      return { success: false, reason: "invalid_slot" };
    }
    const piece = this.getPiece(slotIndex);
    if (!piece) {
      return { success: false, reason: "empty_slot" };
    }

    const rotated = rotatePieceClockwise(piece);
    this.pieces[slotIndex] = rotated;
    this.validateState();
    this.events.emit("pieceRotated", {
      slotIndex,
      pieceId: rotated.id,
      instanceId: rotated.instanceId,
    });
    this.emitState();
    return {
      success: true,
      slotIndex,
      piece: { ...rotated },
    };
  }

  getHintForSlot(slotIndex) {
    const piece = this.getPiece(slotIndex);
    if (!piece) {
      return null;
    }
    return findFirstPlacementForPiece(this.board, piece);
  }

  getSnapshot() {
    const progressionSnapshot = this.progression?.getSnapshot?.() ?? {
      dailyStreak: 0,
      weeklyTop: [],
      runsPlayed: 0,
      runsWonMission: 0,
    };
    const adventureTimerRemainingMs = this.getAdventureTimerRemainingMs();
    return {
      status: this.status,
      mode: this.mode,
      board: cloneBoard(this.board),
      pieces: this.pieces.map((piece) => (piece ? { ...piece } : null)),
      score: this.score,
      bestScore: this.bestScore,
      comboChain: this.scoring.comboChain,
      turn: this.turn,
      fillRatio: boardFillRatio(this.board),
      linesClearedTotal: this.linesClearedTotal,
      mission: this.mission ? { ...this.mission } : null,
      adventure: this.adventure
        ? {
          level: this.adventure.id,
          title: this.adventure.title,
          objective: this.adventure.objective
            ? {
              kind: this.adventure.objective.kind,
              targetScore: Number(this.adventure.objective.targetScore ?? 0),
              timeLimitSec: Number(this.adventure.objective.timeLimitSec ?? 0),
              iconTargets: {
                star: Number(this.adventure.objective.iconTargets?.star ?? 0),
                ruby: Number(this.adventure.objective.iconTargets?.ruby ?? 0),
              },
              iconRemaining: {
                star: Number(this.adventure.objective.iconRemaining?.star ?? 0),
                ruby: Number(this.adventure.objective.iconRemaining?.ruby ?? 0),
              },
              iconCollected: {
                star: Number(this.adventure.objective.iconCollected?.star ?? 0),
                ruby: Number(this.adventure.objective.iconCollected?.ruby ?? 0),
              },
            }
            : null,
          timerRemainingMs: adventureTimerRemainingMs,
          targets: { ...this.adventure.targets },
          remaining: { ...this.adventure.remaining },
          markers: this.adventure.markers.map((marker) => ({ ...marker })),
          completed: this.adventure.completed,
        }
        : null,
      dailyStreak: progressionSnapshot.dailyStreak,
      weeklyTop: progressionSnapshot.weeklyTop,
      runStats: {
        runsPlayed: progressionSnapshot.runsPlayed,
        runsWonMission: progressionSnapshot.runsWonMission,
        totalLinesCleared: progressionSnapshot.totalLinesCleared ?? 0,
        maxComboChain: progressionSnapshot.maxComboChain ?? 0,
        totalIconsCollected: progressionSnapshot.totalIconsCollected ?? 0,
      },
      adventureProgress: {
        currentLevel: progressionSnapshot.adventureCurrentLevel ?? 1,
        completed: progressionSnapshot.adventureCompleted ?? {},
      },
      telemetry: this.telemetry?.snapshot?.() ?? null,
    };
  }

  getPlacementPreview(slotIndex, anchorRow, anchorCol) {
    const piece = this.getPiece(slotIndex);
    if (!piece) {
      return { valid: false, cells: [] };
    }
    const rawCells = getPieceCellsAt(piece, anchorRow, anchorCol);
    const insideCells = rawCells.filter(
      ({ row, col }) =>
        row >= 0 &&
        row < this.tuning.BOARD_SIZE &&
        col >= 0 &&
        col < this.tuning.BOARD_SIZE,
    );
    return {
      valid: canPlacePiece(this.board, piece, anchorRow, anchorCol),
      cells: insideCells,
    };
  }

  placePiece(slotIndex, anchorRow, anchorCol) {
    if (!this.isInteractive()) {
      return false;
    }
    const piece = this.getPiece(slotIndex);
    if (!piece || !canPlacePiece(this.board, piece, anchorRow, anchorCol)) {
      return false;
    }

    const fillRatioBefore = boardFillRatio(this.board);
    const placedCells = placePiece(this.board, piece, anchorRow, anchorCol, piece.tone);
    const fullLines = detectFullLines(this.board);
    const lineCount = fullLines.rows.length + fullLines.cols.length;
    const clearedCells = collectClearedCells(
      this.tuning.BOARD_SIZE,
      fullLines.rows,
      fullLines.cols,
    );
    const clearedCellsDetailed = clearedCells.map(({ row, col }) => ({
      row,
      col,
      tone: this.toRenderableTone(this.board[row][col] || piece.tone),
    }));
    const clearedRowsDetailed = fullLines.rows.map((row) => ({
      index: row,
      tone: this.getDominantToneForRow(row),
    }));
    const clearedColsDetailed = fullLines.cols.map((col) => ({
      index: col,
      tone: this.getDominantToneForCol(col),
    }));

    if (lineCount > 0) {
      clearLines(this.board, fullLines.rows, fullLines.cols);
      this.linesClearedTotal += lineCount;
      this.noClearTurns = 0;
    } else {
      this.noClearTurns += 1;
    }

    let missionBonus = 0;
    let adventureCollection = null;
    if (this.mission && !this.mission.completed) {
      this.mission.progress = Math.min(this.mission.target, this.mission.progress + lineCount);
      if (this.mission.progress >= this.mission.target) {
        this.mission.completed = true;
        missionBonus = this.mission.reward;
        this.events.emit("missionComplete", {
          mission: { ...this.mission },
          bonus: missionBonus,
        });
      }
    }
    if (this.adventure && lineCount > 0) {
      adventureCollection = this.collectAdventureMarkers(clearedCells);
    }

    const scoringResult = this.scoring.applyPlacement(placedCells.length, lineCount, {
      boardFillRatioBefore: fillRatioBefore,
      flatBonus: missionBonus,
    });

    this.score += scoringResult.delta;
    this.runMaxComboChain = Math.max(this.runMaxComboChain, Math.floor(Number(scoringResult.comboChain) || 0));
    this.turn += 1;
    this.pieces[slotIndex] = null;
    const adventureObjectiveUpdate = this.updateAdventureObjectiveProgress({
      lineCount,
      comboChain: scoringResult.comboChain,
      adventureCollection,
    });
    const previousBest = this.bestScore;
    this.updateBestScore();
    if (!this.runBestPopupShown && this.bestScore > previousBest) {
      this.runBestPopupShown = true;
      this.events.emit("newBestScore", {
        score: this.score,
        bestScore: this.bestScore,
        mode: this.mode,
        turn: this.turn,
      });
    }
    this.validateState();

    this.telemetry?.recordPlacement?.(lineCount);

    this.events.emit("placed", {
      slotIndex,
      pieceId: piece.id,
      placedCells,
      clearedCells,
      clearedCellsDetailed,
      clearedRows: fullLines.rows,
      clearedCols: fullLines.cols,
      scoreDelta: scoringResult.delta,
      missionBonus,
      score: this.score,
      comboChain: scoringResult.comboChain,
      comboMultiplier: scoringResult.comboMultiplier,
      hadClear: scoringResult.hadClear,
      mode: this.mode,
      turn: this.turn,
      boardFillRatioAfter: boardFillRatio(this.board),
      nearCompleteLines1: countNearCompleteLines(this.board, 1),
      nearCompleteLines2: countNearCompleteLines(this.board, 2),
      adventureCollection,
    });

    if (lineCount > 0) {
      this.events.emit("cleared", {
        clearedCells,
        clearedCellsDetailed,
        clearedRows: clearedRowsDetailed,
        clearedCols: clearedColsDetailed,
        comboChain: scoringResult.comboChain,
        comboMultiplier: scoringResult.comboMultiplier,
        lineCount,
        collectedObjectiveCells: adventureCollection?.collectedMarkers ?? [],
      });
    }

    if (adventureCollection) {
      this.events.emit("adventureCollected", adventureCollection);
    }
    if (adventureObjectiveUpdate) {
      this.events.emit("adventureObjectiveUpdated", adventureObjectiveUpdate);
    }

    if (this.pieces.every((pieceInSlot) => pieceInSlot === null)) {
      this.pieces = this.buildPieceInstances(this.nextPieceSet());
    }

    if (this.adventure?.completed) {
      this.completeAdventureRun();
      return true;
    }

    if (this.status === "over") {
      this.emitState();
      return true;
    }

    this.checkGameOver();
    this.emitState();
    return true;
  }

  previewTntAt(targetRow, targetCol, options = {}) {
    const areaSize = Math.max(1, Math.floor(Number(options.size) || 4));
    const impact = this.computeTntImpact(targetRow, targetCol, areaSize);
    return {
      success: impact.affectedCells.length > 0,
      areaSize: impact.areaSize,
      areaStart: impact.areaStart,
      areaCells: impact.areaCells,
      affectedCells: impact.affectedCells,
      affectedCellsDetailed: impact.affectedCellsDetailed,
    };
  }

  previewHammerAt(targetRow, targetCol) {
    const size = this.tuning.BOARD_SIZE;
    const row = Math.max(0, Math.min(size - 1, Math.floor(Number(targetRow) || 0)));
    const col = Math.max(0, Math.min(size - 1, Math.floor(Number(targetCol) || 0)));
    const tone = Number(this.board[row]?.[col] ?? 0);
    return {
      success: tone > 0,
      target: { row, col },
      affectedCells: tone > 0 ? [{ row, col }] : [],
      affectedCellsDetailed: tone > 0
        ? [{ row, col, tone: this.toRenderableTone(tone) }]
        : [],
    };
  }

  useHammerAt(targetRow, targetCol) {
    if (!this.isInteractive()) {
      return { success: false, consumed: false, reason: "not_interactive" };
    }

    const preview = this.previewHammerAt(targetRow, targetCol);
    if (!preview.success) {
      return {
        success: false,
        consumed: false,
        reason: "no_targets",
        target: preview.target,
      };
    }

    const { row, col } = preview.target;
    this.board[row][col] = 0;

    const scorePerCell = Math.max(1, Math.floor(Number(this.tuning?.SCORING?.BASE_PER_CELL ?? 12)));
    const scoreDelta = scorePerCell;
    this.score += scoreDelta;
    const previousBest = this.bestScore;
    this.updateBestScore();
    if (!this.runBestPopupShown && this.bestScore > previousBest) {
      this.runBestPopupShown = true;
      this.events.emit("newBestScore", {
        score: this.score,
        bestScore: this.bestScore,
        mode: this.mode,
        turn: this.turn,
      });
    }

    let adventureCollection = null;
    if (this.adventure) {
      adventureCollection = this.collectAdventureMarkers([{ row, col }]);
    }
    const adventureObjectiveUpdate = this.updateAdventureObjectiveProgress({
      lineCount: 0,
      comboChain: this.scoring.comboChain,
      adventureCollection,
    });

    this.events.emit("hammerHit", {
      target: { row, col },
      affectedCells: preview.affectedCells,
      affectedCellsDetailed: preview.affectedCellsDetailed,
      affectedCount: 1,
      scoreDelta,
      score: this.score,
    });

    if (adventureCollection) {
      this.events.emit("adventureCollected", adventureCollection);
    }
    if (adventureObjectiveUpdate) {
      this.events.emit("adventureObjectiveUpdated", adventureObjectiveUpdate);
    }

    if (this.adventure?.completed) {
      this.completeAdventureRun();
      return {
        success: true,
        consumed: true,
        target: { row, col },
        affectedCells: preview.affectedCells,
        affectedCellsDetailed: preview.affectedCellsDetailed,
        affectedCount: 1,
        scoreDelta,
        score: this.score,
      };
    }

    this.emitState();
    return {
      success: true,
      consumed: true,
      target: { row, col },
      affectedCells: preview.affectedCells,
      affectedCellsDetailed: preview.affectedCellsDetailed,
      affectedCount: 1,
      scoreDelta,
      score: this.score,
    };
  }

  useTntAt(targetRow, targetCol, options = {}) {
    if (!this.isInteractive()) {
      return { success: false, consumed: false, reason: "not_interactive" };
    }

    const areaSize = Math.max(1, Math.floor(Number(options.size) || 4));
    const impact = this.computeTntImpact(targetRow, targetCol, areaSize);
    if (!impact.affectedCells.length) {
      return {
        success: false,
        consumed: false,
        reason: "no_targets",
        areaSize: impact.areaSize,
        areaStart: impact.areaStart,
        areaCells: impact.areaCells,
      };
    }

    impact.affectedCells.forEach(({ row, col }) => {
      this.board[row][col] = 0;
    });

    const scorePerCell = Math.max(1, Math.floor(Number(this.tuning?.SCORING?.BASE_PER_CELL ?? 12)));
    const scoreDelta = impact.affectedCells.length * scorePerCell;
    this.score += scoreDelta;
    const previousBest = this.bestScore;
    this.updateBestScore();
    if (!this.runBestPopupShown && this.bestScore > previousBest) {
      this.runBestPopupShown = true;
      this.events.emit("newBestScore", {
        score: this.score,
        bestScore: this.bestScore,
        mode: this.mode,
        turn: this.turn,
      });
    }

    let adventureCollection = null;
    if (this.adventure) {
      adventureCollection = this.collectAdventureMarkers(impact.affectedCells);
    }
    const adventureObjectiveUpdate = this.updateAdventureObjectiveProgress({
      lineCount: 0,
      comboChain: this.scoring.comboChain,
      adventureCollection,
    });

    this.events.emit("tntExploded", {
      target: {
        row: Math.floor(Number(targetRow) || 0),
        col: Math.floor(Number(targetCol) || 0),
      },
      areaSize: impact.areaSize,
      areaStart: impact.areaStart,
      areaCells: impact.areaCells,
      affectedCells: impact.affectedCells,
      affectedCellsDetailed: impact.affectedCellsDetailed,
      affectedCount: impact.affectedCells.length,
      scoreDelta,
      score: this.score,
    });

    if (adventureCollection) {
      this.events.emit("adventureCollected", adventureCollection);
    }
    if (adventureObjectiveUpdate) {
      this.events.emit("adventureObjectiveUpdated", adventureObjectiveUpdate);
    }

    if (this.adventure?.completed) {
      this.completeAdventureRun();
      return {
        success: true,
        consumed: true,
        areaSize: impact.areaSize,
        areaStart: impact.areaStart,
        affectedCells: impact.affectedCells,
        affectedCellsDetailed: impact.affectedCellsDetailed,
        affectedCount: impact.affectedCells.length,
        scoreDelta,
        score: this.score,
      };
    }

    this.emitState();
    return {
      success: true,
      consumed: true,
      areaSize: impact.areaSize,
      areaStart: impact.areaStart,
      affectedCells: impact.affectedCells,
      affectedCellsDetailed: impact.affectedCellsDetailed,
      affectedCount: impact.affectedCells.length,
      scoreDelta,
      score: this.score,
    };
  }

  updateAdventureTimer(now = performance.now()) {
    if (this.status !== "playing" || this.mode !== "adventure" || !this.adventure) {
      return false;
    }
    const objectiveKind = this.adventure.objective?.kind ?? "marker_collect";
    if (objectiveKind !== "score_target") {
      return false;
    }

    const remainingMs = this.getAdventureTimerRemainingMs(now);
    const wholeSecond = Math.max(0, Math.ceil(remainingMs / 1000));
    if (wholeSecond !== this.adventureTimerLastSecond) {
      this.adventureTimerLastSecond = wholeSecond;
      this.emitState();
    }

    if (remainingMs > 0) {
      return false;
    }

    const targetScore = Number(this.adventure.objective?.targetScore ?? 0);
    if (this.score >= targetScore) {
      this.adventure.completed = true;
      this.completeAdventureRun();
      return true;
    }

    this.triggerGameOver({
      reason: "adventure_timeout",
      adventureLevel: this.adventure.id,
    });
    return true;
  }

  checkGameOver() {
    if (this.status !== "playing") {
      return false;
    }
    const activePieces = this.pieces.filter(Boolean);
    if (!activePieces.length) {
      return false;
    }
    if (!anyPieceFits(this.board, activePieces)) {
      this.status = "over";
      this.endRun();
      this.events.emit("gameOver", {
        score: this.score,
        bestScore: this.bestScore,
        turn: this.turn,
        linesClearedTotal: this.linesClearedTotal,
        missionCompleted: Boolean(this.mission?.completed),
      });
      return true;
    }
    return false;
  }

  emitState() {
    this.events.emit("state", this.getSnapshot());
  }

  nextPieceSet() {
    const elapsedMs = this.runStartedAtMs > 0
      ? Math.max(0, performance.now() - this.runStartedAtMs)
      : 0;
    const set = this.generator.nextSet(this.board, {
      noClearTurns: this.noClearTurns,
      generatedSetCount: this.generatedSetCount,
      mode: this.mode,
      adventureLevel: this.adventure?.id ?? null,
      adventureObjectiveKind: this.adventure?.objective?.kind ?? null,
      runElapsedMs: elapsedMs,
      comboChain: this.scoring.comboChain,
      turn: this.turn,
    });
    this.generatedSetCount += 1;
    return set;
  }

  buildPieceInstances(pieceDefs) {
    const instances = pieceDefs.map((pieceDef) => ({
      ...pieceDef,
      tone: this.resolvePieceTone(pieceDef.tone),
      instanceId: this.instanceIdCounter++,
    }));
    this.ensureRubyPresenceInSet(instances);
    return instances;
  }

  resolvePieceTone(baseTone) {
    return Number(baseTone) || 1;
  }

  shouldUseRubyToneInAdventure() {
    if (this.mode === "adventure" && this.adventure) {
      return Number(this.adventure.id) >= 11;
    }
    if (this.mode !== "classic") {
      return false;
    }
    const unlockedLevel = Number(this.progression?.getAdventureCurrentLevel?.(getAdventureLevelCount()) ?? 1);
    return unlockedLevel >= 11;
  }

  ensureRubyPresenceInSet(instances) {
    if (!this.shouldUseRubyToneInAdventure() || !Array.isArray(instances) || !instances.length) {
      return;
    }
    const redIndices = instances
      .map((piece, index) => ({ tone: Number(piece?.tone), index }))
      .filter(({ tone }) => tone === 6)
      .map(({ index }) => index);

    if (!redIndices.length) {
      const forcedIndex = Math.abs((this.generatedSetCount + this.turn) % instances.length);
      instances[forcedIndex].tone = 6;
      redIndices.push(forcedIndex);
    }

    const shouldBoostRuby = ((this.generatedSetCount + this.turn) % 2) === 0;
    if (shouldBoostRuby && redIndices.length < 2) {
      const extraIndex = instances.findIndex((piece, index) =>
        index !== redIndices[0] && Number(piece?.tone) !== 6,
      );
      if (extraIndex >= 0) {
        instances[extraIndex].tone = 6;
      }
    }
  }

  validateState() {
    if (!Array.isArray(this.board) || this.board.length !== this.tuning.BOARD_SIZE) {
      throw new Error("Board state corrupted: invalid board size.");
    }
    if (!Array.isArray(this.pieces) || this.pieces.length !== this.tuning.PIECES_PER_SET) {
      throw new Error("Piece state corrupted: invalid piece slots.");
    }
  }

  endRun() {
    if (this.ended) {
      return;
    }
    this.ended = true;
    this.progression?.completeRun?.({
      score: this.score,
      turns: this.turn,
      linesCleared: this.linesClearedTotal,
      maxComboChain: this.runMaxComboChain,
      iconsCollected: this.runIconsCollected,
      missionCompleted: Boolean(this.mission?.completed),
      mode: this.mode,
    });
    this.telemetry?.recordRunEnd?.(this.score, this.turn, true);
  }

  updateBestScore() {
    if (this.score <= this.bestScore) {
      return;
    }
    this.bestScore = this.score;
    try {
      localStorage.setItem(this.tuning.STORAGE_KEY_BEST_SCORE, String(this.bestScore));
    } catch {
      // Ignore storage errors in restricted contexts.
    }
  }

  loadBestScore() {
    try {
      const raw = localStorage.getItem(this.tuning.STORAGE_KEY_BEST_SCORE);
      const parsed = Number(raw);
      return Number.isFinite(parsed) ? parsed : 0;
    } catch {
      return 0;
    }
  }

  getDominantToneForRow(row) {
    return this.getDominantTone(this.board[row]);
  }

  getDominantToneForCol(col) {
    const tones = [];
    for (let row = 0; row < this.tuning.BOARD_SIZE; row += 1) {
      tones.push(this.board[row][col]);
    }
    return this.getDominantTone(tones);
  }

  getDominantTone(values) {
    const counts = new Map();
    values.forEach((value) => {
      if (!value) {
        return;
      }
      const mappedTone = this.toRenderableTone(value);
      counts.set(mappedTone, (counts.get(mappedTone) ?? 0) + 1);
    });
    let dominantTone = 1;
    let maxCount = -1;
    counts.forEach((count, tone) => {
      if (count > maxCount) {
        maxCount = count;
        dominantTone = tone;
      }
    });
    return dominantTone;
  }

  computeTntImpact(targetRow, targetCol, areaSize = 4) {
    const size = this.tuning.BOARD_SIZE;
    const clampedAreaSize = Math.min(size, Math.max(1, Math.floor(Number(areaSize) || 4)));
    const safeRow = Math.max(0, Math.min(size - 1, Math.floor(Number(targetRow) || 0)));
    const safeCol = Math.max(0, Math.min(size - 1, Math.floor(Number(targetCol) || 0)));
    const offset = Math.floor((clampedAreaSize - 1) / 2);
    const rowStart = Math.max(0, Math.min(size - clampedAreaSize, safeRow - offset));
    const colStart = Math.max(0, Math.min(size - clampedAreaSize, safeCol - offset));

    const areaCells = [];
    const affectedCells = [];
    const affectedCellsDetailed = [];
    for (let row = rowStart; row < rowStart + clampedAreaSize; row += 1) {
      for (let col = colStart; col < colStart + clampedAreaSize; col += 1) {
        areaCells.push({ row, col });
        const tone = Number(this.board[row]?.[col] ?? 0);
        if (tone === 0) {
          continue;
        }
        affectedCells.push({ row, col });
        affectedCellsDetailed.push({
          row,
          col,
          tone: this.toRenderableTone(tone),
        });
      }
    }

    return {
      areaSize: clampedAreaSize,
      areaStart: { row: rowStart, col: colStart },
      areaCells,
      affectedCells,
      affectedCellsDetailed,
    };
  }

  toRenderableTone(value) {
    if (value === ADVENTURE_MARKER_CELL_TONE.blue) {
      return 4;
    }
    if (value === ADVENTURE_MARKER_CELL_TONE.yellow) {
      return 2;
    }
    if (value === ADVENTURE_MARKER_CELL_TONE.red) {
      return 1;
    }
    return Number(value) || 1;
  }

  seedAdventureMarkersOnBoard() {
    if (!this.adventure?.markers?.length) {
      return;
    }
    this.adventure.markers.forEach((marker) => {
      const tone = ADVENTURE_MARKER_CELL_TONE[marker.type];
      if (!tone) {
        return;
      }
      this.board[marker.row][marker.col] = tone;
    });
  }

  collectAdventureMarkers(clearedCells) {
    if (!this.adventure || !Array.isArray(clearedCells) || !clearedCells.length) {
      return null;
    }
    if (!Array.isArray(this.adventure.markers) || !this.adventure.markers.length) {
      return null;
    }
    const clearedSet = new Set(clearedCells.map((cell) => `${cell.row}:${cell.col}`));
    const collectedMarkers = [];
    const objectiveKind = this.adventure.objective?.kind ?? "marker_collect";
    const scoreObjective = this.adventure.objective ?? {};
    const iconRemaining = {
      star: Math.max(0, Number(scoreObjective.iconRemaining?.star ?? 0)),
      ruby: Math.max(0, Number(scoreObjective.iconRemaining?.ruby ?? 0)),
    };
    const iconCollected = {
      star: Math.max(0, Number(scoreObjective.iconCollected?.star ?? 0)),
      ruby: Math.max(0, Number(scoreObjective.iconCollected?.ruby ?? 0)),
    };

    this.adventure.markers.forEach((marker) => {
      if (marker.collected) {
        return;
      }
      if (!clearedSet.has(`${marker.row}:${marker.col}`)) {
        return;
      }
      marker.collected = true;
      if (objectiveKind === "marker_collect") {
        this.adventure.remaining[marker.type] = Math.max(0, (this.adventure.remaining[marker.type] ?? 0) - 1);
      } else if (objectiveKind === "score_target") {
        const iconType =
          marker.iconType
          ?? (marker.type === "yellow" ? "star" : (marker.type === "red" ? "ruby" : null));
        if (iconType === "star" || iconType === "ruby") {
          if (iconRemaining[iconType] > 0) {
            iconRemaining[iconType] -= 1;
          }
          iconCollected[iconType] += 1;
        }
      }
      collectedMarkers.push({
        row: marker.row,
        col: marker.col,
        type: marker.type,
        iconType: marker.iconType ?? null,
      });
    });

    if (!collectedMarkers.length) {
      return null;
    }

    const iconsCollectedThisMove = collectedMarkers.reduce((count, marker) => {
      const iconType =
        marker.iconType
        ?? (marker.type === "yellow" ? "star" : (marker.type === "red" ? "ruby" : null));
      return count + ((iconType === "star" || iconType === "ruby") ? 1 : 0);
    }, 0);
    if (iconsCollectedThisMove > 0) {
      this.runIconsCollected += iconsCollectedThisMove;
    }

    if (objectiveKind === "score_target") {
      this.adventure.objective.iconRemaining = iconRemaining;
      this.adventure.objective.iconCollected = iconCollected;
      this.adventure.completed = this.isAdventureObjectiveComplete();
    } else {
      this.adventure.completed = Object.values(this.adventure.remaining).every((count) => count <= 0);
    }
    const payload = {
      level: this.adventure.id,
      collectedMarkers,
      remaining: { ...this.adventure.remaining },
      iconRemaining: { ...iconRemaining },
      iconCollected: { ...iconCollected },
      iconsCollectedThisMove,
      completed: this.adventure.completed,
    };
    return payload;
  }

  initializeAdventureObjectiveState(now = performance.now()) {
    if (!this.adventure?.objective) {
      return;
    }
    if (this.adventure.objective.kind !== "score_target") {
      return;
    }
    const limitSec = Math.max(1, Math.floor(Number(this.adventure.objective.timeLimitSec) || 0));
    const iconTargets = {
      star: Math.max(0, Math.floor(Number(this.adventure.objective.iconTargets?.star) || 0)),
      ruby: Math.max(0, Math.floor(Number(this.adventure.objective.iconTargets?.ruby) || 0)),
    };
    this.adventure.objective.timeLimitSec = limitSec;
    this.adventure.objective.deadlineAtMs = now + (limitSec * 1000);
    this.adventure.objective.iconTargets = iconTargets;
    this.adventure.objective.iconRemaining = { ...iconTargets };
    this.adventure.objective.iconCollected = { star: 0, ruby: 0 };
    this.adventureTimerLastSecond = Math.max(0, limitSec);
  }

  updateAdventureObjectiveProgress({ lineCount = 0, comboChain = 1, adventureCollection = null } = {}) {
    if (!this.adventure?.objective || this.adventure.objective.kind !== "score_target") {
      return null;
    }
    void lineCount;
    void comboChain;
    void adventureCollection;
    const iconRemaining = this.adventure.objective.iconRemaining ?? { star: 0, ruby: 0 };
    const iconCollected = this.adventure.objective.iconCollected ?? { star: 0, ruby: 0 };
    const beforeCompleted = Boolean(this.adventure.completed);
    const nextCompleted = this.isAdventureObjectiveComplete();
    this.adventure.completed = nextCompleted;
    if (beforeCompleted === nextCompleted) {
      return null;
    }
    return {
      level: this.adventure.id,
      iconRemaining: { ...iconRemaining },
      iconCollected: { ...iconCollected },
      completed: nextCompleted,
    };
  }

  isAdventureObjectiveComplete(now = performance.now()) {
    if (!this.adventure?.objective) {
      return false;
    }
    const objective = this.adventure.objective;
    if (objective.kind === "score_target") {
      const targetScore = Math.max(1, Math.floor(Number(objective.targetScore) || 0));
      if (this.score < targetScore) {
        return false;
      }
      const remainingMs = this.getAdventureTimerRemainingMs(now);
      return remainingMs > 0;
    }
    return Object.values(this.adventure.remaining ?? {}).every((count) => Number(count) <= 0);
  }

  getAdventureTimerRemainingMs(now = performance.now()) {
    if (!this.adventure?.objective || this.adventure.objective.kind !== "score_target") {
      return 0;
    }
    const deadline = Number(this.adventure.objective.deadlineAtMs ?? 0);
    if (!Number.isFinite(deadline) || deadline <= 0) {
      return 0;
    }
    return Math.max(0, Math.round(deadline - now));
  }

  completeAdventureRun() {
    if (!this.adventure) {
      return;
    }
    this.status = "levelComplete";
    this.endRun();
    this.progression?.completeAdventureLevel?.(this.adventure.id, getAdventureLevelCount());
    this.events.emit("adventureLevelComplete", {
      level: this.adventure.id,
      title: this.adventure.title,
      score: this.score,
    });
    this.emitState();
  }

  triggerGameOver(extra = {}) {
    this.status = "over";
    this.endRun();
    this.events.emit("gameOver", {
      score: this.score,
      bestScore: this.bestScore,
      turn: this.turn,
      linesClearedTotal: this.linesClearedTotal,
      missionCompleted: Boolean(this.mission?.completed),
      ...extra,
    });
    this.emitState();
  }
}
