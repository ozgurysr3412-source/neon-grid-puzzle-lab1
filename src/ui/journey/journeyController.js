const JOURNEY_ROW_RANGES = [
  [92, 100],
  [81, 91],
  [70, 80],
  [59, 69],
  [48, 58],
  [37, 47],
  [34, 36],
  [28, 33],
  [21, 27],
  [12, 20],
  [1, 11],
];

export class JourneyController {
  constructor({ toggleOverlay } = {}) {
    this.toggleOverlay = typeof toggleOverlay === "function"
      ? toggleOverlay
      : () => {};

    this.panelState = {
      visible: false,
      totalLevels: 100,
      playableMaxLevel: 10,
      currentLevel: 1,
      selectedLevel: 1,
      completed: {},
    };

    this.elements = {
      overlay: document.getElementById("journey-overlay"),
      backBtn: document.getElementById("journey-back-btn"),
      startBtn: document.getElementById("journey-start-btn"),
      startLabel: document.getElementById("journey-start-label"),
      levelMap: document.getElementById("journey-level-map"),
    };

    this.callbacks = {
      onJourneyBack: null,
      onJourneyStart: null,
    };
    this.isBound = false;
  }

  bindControls({ onJourneyBack, onJourneyStart } = {}) {
    this.callbacks.onJourneyBack = typeof onJourneyBack === "function" ? onJourneyBack : null;
    this.callbacks.onJourneyStart = typeof onJourneyStart === "function" ? onJourneyStart : null;
    if (this.isBound) {
      return;
    }

    this.elements.backBtn?.addEventListener("click", () => {
      this.callbacks.onJourneyBack?.();
    });
    this.elements.startBtn?.addEventListener("click", () => {
      this.callbacks.onJourneyStart?.({ level: this.panelState.selectedLevel });
    });
    this.elements.levelMap?.addEventListener("click", (event) => {
      const target = event.target instanceof HTMLElement
        ? event.target.closest(".journey-node")
        : null;
      if (!(target instanceof HTMLButtonElement) || target.disabled) {
        return;
      }
      const level = Number(target.dataset.level);
      if (!Number.isFinite(level)) {
        return;
      }
      this.selectJourneyLevel(level);
    });

    this.isBound = true;
  }

  open({
    totalLevels = 100,
    playableMaxLevel = 10,
    currentLevel = 1,
    completed = {},
  } = {}) {
    const safeLevel = Math.max(1, Math.floor(Number(currentLevel) || 1));
    this.panelState.visible = true;
    this.panelState.totalLevels = Math.max(1, Math.floor(Number(totalLevels) || 100));
    this.panelState.playableMaxLevel = Math.max(1, Math.floor(Number(playableMaxLevel) || 10));
    this.panelState.currentLevel = safeLevel;
    this.panelState.selectedLevel = Math.min(safeLevel, this.panelState.playableMaxLevel);
    this.panelState.completed = { ...(completed ?? {}) };
    this.renderJourneyPanel();
    this.toggleOverlay(this.elements.overlay, true);
  }

  close() {
    this.panelState.visible = false;
    this.toggleOverlay(this.elements.overlay, false);
  }

  resolveJourneyLevelState(level) {
    const safeLevel = Math.max(1, Math.floor(Number(level) || 1));
    const completed = Boolean(this.panelState.completed?.[safeLevel]);
    const inPlayableCatalog = safeLevel <= this.panelState.playableMaxLevel;
    const unlocked = safeLevel <= this.panelState.currentLevel && inPlayableCatalog;
    const isCurrent = safeLevel === this.panelState.currentLevel;
    return {
      completed,
      inPlayableCatalog,
      unlocked,
      isCurrent,
      locked: !unlocked,
    };
  }

  selectJourneyLevel(level) {
    const safeLevel = Math.max(1, Math.floor(Number(level) || 1));
    const state = this.resolveJourneyLevelState(safeLevel);
    if (!state.unlocked) {
      return;
    }
    this.panelState.selectedLevel = safeLevel;
    this.renderJourneyPanel();
  }

  renderJourneyMap() {
    const root = this.elements.levelMap;
    if (!root) {
      return;
    }
    root.innerHTML = "";

    JOURNEY_ROW_RANGES.forEach(([start, end]) => {
      if (start > this.panelState.totalLevels) {
        return;
      }
      const row = document.createElement("div");
      row.className = "journey-row";
      const safeEnd = Math.min(end, this.panelState.totalLevels);
      for (let level = start; level <= safeEnd; level += 1) {
        const node = document.createElement("button");
        node.type = "button";
        node.className = "journey-node level-block";
        node.dataset.level = String(level);

        const label = document.createElement("span");
        label.className = "journey-node__label";
        label.textContent = String(level);
        node.appendChild(label);

        const state = this.resolveJourneyLevelState(level);
        if (state.isCurrent) {
          node.classList.add("active");
        } else if (state.completed) {
          node.classList.add("completed");
        } else {
          node.classList.add("locked");
        }
        if (level === this.panelState.selectedLevel) {
          node.classList.add("journey-node--selected");
        }
        node.disabled = !state.unlocked;
        row.appendChild(node);
      }
      root.appendChild(row);
    });
  }

  renderJourneyPanel() {
    this.renderJourneyMap();
    if (this.elements.startLabel) {
      this.elements.startLabel.textContent = `Level ${this.panelState.selectedLevel}`;
    }
    if (this.elements.startBtn) {
      const selectedState = this.resolveJourneyLevelState(this.panelState.selectedLevel);
      this.elements.startBtn.disabled = !selectedState.unlocked;
    }
  }
}
