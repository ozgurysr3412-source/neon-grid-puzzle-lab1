# Neon Grid Forge (Prototype)

Original mobile-first block placement puzzle prototype (8x8) with fairness-aware piece generation, combo scoring, mission/streak meta loops, and modular architecture for fast iteration.

## Run

```bash
npm run serve
```

Open: [http://127.0.0.1:4173](http://127.0.0.1:4173)

## Validation Commands

```bash
npm run test:smoke
npm run analyze:cookiecats
```

## Folder Structure

```text
neon-grid-puzzle/
  index.html
  styles/
    main.css
  scripts/
    smoke-sim.mjs
    analyze-cookie-cats.mjs
  src/
    main.js
    config/
      tuning.js
    core/
      eventBus.js
      random.js
    game/
      boardLogic.js
      pieceCatalog.js
      pieceGenerator.js
      scoringSystem.js
      gameStateManager.js
    input/
      dragDropController.js
    ui/
      uiManager.js
    feedback/
      audioHooks.js
      haptics.js
    analytics/
      telemetry.js
    meta/
      progressionManager.js
  docs/
    ab-evidence-and-action-plan.md
    locked-decisions.md
```

## Tunable Variables

All knobs live in `src/config/tuning.js`.

### Core Setup
- `BOARD_SIZE`
- `PIECES_PER_SET`
- `STORAGE_KEY_BEST_SCORE`
- `STORAGE_KEY_PROGRESS`
- `STORAGE_KEY_TELEMETRY`

### Scoring + Economy
- `SCORING.BASE_PER_CELL`
- `SCORING.LINE_CLEAR_BONUS`
- `SCORING.MULTI_LINE_STEP_BONUS`
- `SCORING.COMBO_STEP`
- `SCORING.MAX_COMBO_MULTIPLIER`
- `SCORING.COMBO_CHAIN_BONUS`
- `SCORING.HIGH_PRESSURE_CLEAR_BONUS`
- `SCORING.MISSION_COMPLETE_BONUS`

### Piece Fairness + Difficulty
- `GENERATION.SIZE_WEIGHTS_OPEN`
- `GENERATION.SIZE_WEIGHTS_MID`
- `GENERATION.SIZE_WEIGHTS_TIGHT`
- `GENERATION.SIZE_WEIGHTS_RECOVERY`
- `GENERATION.MID_FILL_THRESHOLD`
- `GENERATION.TIGHT_FILL_THRESHOLD`
- `GENERATION.MAX_LARGE_PER_SET`
- `GENERATION.MAX_LARGE_STREAK_ACROSS_DRAWS`
- `GENERATION.FAIRNESS_RESCUE_FILL_THRESHOLD`
- `GENERATION.RESCUE_POOL_CATEGORIES`
- `GENERATION.STARTER_SET_COUNT`
- `GENERATION.STARTER_LARGE_LOCK`
- `GENERATION.MIN_PLACEABLE_PIECES_OPEN`
- `GENERATION.MIN_PLACEABLE_PIECES_TIGHT`
- `GENERATION.RECOVERY_TRIGGER_NO_CLEAR_TURNS`

### Input Feel
- `INPUT.BOARD_SNAP_TOLERANCE_PX`

### Missions + Meta
- `MISSIONS.ENABLED`
- `MISSIONS.LINE_CLEAR_TARGETS`
- `META.WEEKLY_TOP_LIMIT`

### Feedback
- `FX.CLEAR_FLASH_MS`
- `FX.SHAKE_MS`
- `FX.PARTICLES_PER_CLEARED_CELL`
- `FX.INVALID_DROP_SHAKE_MS`

## Short Balancing Note

- Early churnu düşürmek için `STARTER_SET_COUNT` artır, `STARTER_LARGE_LOCK` açık tut.
- “Haksız parça” hissi için `MIN_PLACEABLE_PIECES_OPEN` değerini 2 tut; gerektiğinde 3 deneyebilirsin.
- Skilled oyuncuyu ödüllendirmek için önce `LINE_CLEAR_BONUS`, sonra `COMBO_STEP` artır.
- Snowball fazla olursa `MAX_COMBO_MULTIPLIER` düşür.
- Çok sıkışık oyunlarda `SIZE_WEIGHTS_RECOVERY.small` ve `RECOVERY_TRIGGER_NO_CLEAR_TURNS` ile kurtarma frekansını ayarla.

## TODO (Future Features)

- Daily challenge varyasyonlarını genişlet (haftalık kural setleri).
- Online weekly leaderboard (server + anti-cheat snapshot).
- Unlockable skins/themes progression.
- Revive mechanic (tek kullanımlık, görev bazlı).
