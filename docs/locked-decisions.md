# Locked Decisions

## 2026-04-06

### Lock Profile: `baseline-approved-v1`

- `CORE PROTOTYPE`: Locked
  - File scope: all gameplay + UI currently approved by user
  - Rule: No visual/audio/gameplay behavior changes without explicit user request.

- `CLEAR VFX`: Locked
  - File scope: `src/ui/uiManager.js` (clear explosion pipeline)
  - Rule: Do not change clear explosion visuals/timing.

- `CLEAR SFX`: Locked
  - File scope: `src/feedback/audioHooks.js`, `assets/sounds/clear.wav`
  - Rule: Do not change clear sound file, routing, queueing, or volume behavior.

- `COMBO VFX TIERS`: Locked
  - File scope: `src/ui/uiManager.js`, `styles/main.css`
  - Rule: Keep 3-tier combo escalation and current timing/intensity balance unless user asks.

- `COMBO VOICE FLOW`: Locked
  - File scope: `src/feedback/audioHooks.js`
  - Rule: Keep callout sequence + queue behavior (no overlap/cut) unless user asks.

- `VOICE ASSETS`: Locked
  - File scope: `assets/sounds/combo-good-job.mp3`, `assets/sounds/combo-perfect.mp3`, `assets/sounds/combo-incredible.mp3`
  - Rule: Do not replace/rename these files without approval.

- `PREMIUM CALLOUT TYPOGRAPHY`: Locked
  - File scope: `styles/main.css`, `index.html`
  - Rule: Keep current Trajan Pro-first strong gold callout style unless user asks.

- `TOUCH/DRAG FEEL`: Locked
  - File scope: `src/input/dragDropController.js`, `src/config/tuning.js`
  - Rule: Do not alter approved drag placement feel.

### Lock Profile: `baseline-approved-v2`

- `GLOBAL LOCK`: Active
  - Rule: Do not change any approved gameplay/UI/audio behavior unless user explicitly requests.

- `DRAG VISIBILITY FIX`: Locked
  - File scope: `src/input/dragDropController.js`, `styles/main.css`
  - Rule: Keep dragged origin piece hidden during drag (`piece-card--dragging` + `visibility:hidden`).

- `TOUCH OFFSET FEEL`: Locked
  - File scope: `src/config/tuning.js`, `src/input/dragDropController.js`
  - Rule: Keep current finger-above-block control profile and smoothing.

- `PICKUP POLISH`: Locked
  - File scope: `src/feedback/audioHooks.js`, `src/input/dragDropController.js`, `styles/main.css`
  - Rule: Keep immediate pickup sound behavior and pickup pop response.

- `COMBO/CLEAR FLOW`: Locked
  - File scope: `src/main.js`, `src/ui/uiManager.js`
  - Rule: Keep unified combo model (base clear + combo accent), no fallback to overlapping legacy combo flow.

- `CALLOUT VISUAL/ TIMING`: Locked
  - File scope: `styles/main.css`, `src/feedback/audioHooks.js`
  - Rule: Keep centered pop callouts (no bottom-to-top travel) and current fast combo voice start.

- `SMART PRAISE`: Locked
  - File scope: `src/main.js`, `src/game/gameStateManager.js`, `src/game/boardLogic.js`, `src/feedback/audioHooks.js`
  - Rule: Keep strategic `GOOD JOB` trigger logic with cooldown protection.

- `DEBUG PANEL ACCESS`: Locked
  - File scope: `src/main.js`
  - Rule: Keep test panel accessible via `?fx=1` for validation runs.
