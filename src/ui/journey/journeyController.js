import { t } from "../localization.js";

const JOURNEY_WORLD_COUNT = 10;
const JOURNEY_LEVELS_PER_WORLD = 10;
const JOURNEY_WORLD_ASSET_VERSION = "20260623b";
const JOURNEY_NODE_X = [50, 39, 58, 45, 62, 51, 37, 55, 45, 50];
const JOURNEY_NODE_Y = [87, 79.5, 72, 64.5, 57, 49.5, 42, 34.5, 27, 19.5];

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
      progress: document.getElementById("journey-progress"),
      progressValue: document.getElementById("journey-progress-value"),
      levelMap: document.getElementById("journey-level-map"),
    };

    this.callbacks = {
      onJourneyBack: null,
      onJourneyStart: null,
    };
    this.worldImageObserver = null;
    this.isBound = false;
    this.scheduleInitialWorldPreload();
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
    const preventJourneyZoom = (event) => {
      if (event.touches?.length > 1 || event.type.startsWith("gesture")) {
        event.preventDefault();
      }
    };
    this.elements.overlay?.addEventListener("touchmove", preventJourneyZoom, { passive: false });
    ["gesturestart", "gesturechange", "gestureend"].forEach((eventName) => {
      this.elements.overlay?.addEventListener(eventName, preventJourneyZoom, { passive: false });
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
    this.focusSelectedLevel({ behavior: "auto" });
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
    this.syncJourneySelection();
  }

  renderJourneyMap() {
    const root = this.elements.levelMap;
    if (!root) {
      return;
    }
    this.worldImageObserver?.disconnect();
    this.worldImageObserver = null;
    root.innerHTML = "";
    const currentWorld = Math.min(
      JOURNEY_WORLD_COUNT,
      Math.max(1, Math.ceil(this.panelState.currentLevel / JOURNEY_LEVELS_PER_WORLD)),
    );

    for (let world = JOURNEY_WORLD_COUNT; world >= 1; world -= 1) {
      const start = ((world - 1) * JOURNEY_LEVELS_PER_WORLD) + 1;
      if (start > this.panelState.totalLevels) {
        continue;
      }
      const end = Math.min(world * JOURNEY_LEVELS_PER_WORLD, this.panelState.totalLevels);
      const section = document.createElement("section");
      section.className = "journey-world";
      section.dataset.world = String(world);

      const background = document.createElement("img");
      background.className = "journey-world__background";
      const backgroundSource = this.getWorldImageSource(world);
      if (world === currentWorld) {
        background.src = backgroundSource;
        background.fetchPriority = "high";
      } else {
        background.dataset.src = backgroundSource;
      }
      background.alt = "";
      background.decoding = "async";
      section.appendChild(background);

      const path = document.createElement("div");
      path.className = "journey-world__path";
      section.appendChild(path);

      if (world === JOURNEY_WORLD_COUNT) {
        const finalReward = document.createElement("div");
        finalReward.className = "journey-final-reward";
        const finalCompleted = Boolean(this.panelState.completed?.[100]);
        finalReward.classList.toggle("journey-final-reward--ready", finalCompleted);

        const glow = document.createElement("img");
        glow.className = "journey-final-reward__glow";
        glow.src = "./assets/ui/journey/chest-glow-rays.webp";
        glow.alt = "";
        glow.decoding = "async";
        finalReward.appendChild(glow);

        const chest = document.createElement("img");
        chest.className = "journey-final-reward__chest";
        chest.src = "./assets/ui/journey/chest-gold.webp";
        chest.alt = "";
        chest.decoding = "async";
        finalReward.appendChild(chest);

        const note = document.createElement("p");
        note.className = "journey-final-reward__note";
        note.textContent = t(finalCompleted ? "journey_final_chest_ready" : "journey_final_chest_locked");
        finalReward.appendChild(note);
        section.appendChild(finalReward);
      }

      for (let level = start; level <= end; level += 1) {
        const slot = level - start;
        const node = document.createElement("button");
        node.type = "button";
        node.className = "journey-node";
        node.dataset.level = String(level);
        node.style.setProperty("--journey-node-x", `${JOURNEY_NODE_X[slot]}%`);
        node.style.setProperty("--journey-node-y", `${JOURNEY_NODE_Y[slot]}%`);

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
        if (level % JOURNEY_LEVELS_PER_WORLD === 0) {
          node.classList.add("journey-node--milestone");
        }
        if (level === this.panelState.selectedLevel) {
          node.classList.add("journey-node--selected");
        }
        node.disabled = !state.unlocked;
        section.appendChild(node);
      }
      root.appendChild(section);
    }
    this.observeWorldImages();
  }

  observeWorldImages() {
    const pendingImages = this.elements.levelMap?.querySelectorAll(".journey-world__background[data-src]");
    if (!pendingImages?.length) {
      return;
    }
    if (!("IntersectionObserver" in window)) {
      pendingImages.forEach((image) => {
        image.src = image.dataset.src;
        delete image.dataset.src;
      });
      return;
    }
    this.worldImageObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }
        const image = entry.target;
        if (image instanceof HTMLImageElement && image.dataset.src) {
          image.src = image.dataset.src;
          delete image.dataset.src;
        }
        observer.unobserve(image);
      });
    }, {
      root: this.elements.levelMap?.parentElement ?? null,
      rootMargin: "100% 0px",
      threshold: 0.01,
    });
    pendingImages.forEach((image) => this.worldImageObserver.observe(image));
  }

  getWorldImageSource(world) {
    const safeWorld = Math.min(JOURNEY_WORLD_COUNT, Math.max(1, Math.floor(Number(world) || 1)));
    return `./assets/ui/journey/worlds/world-${String(safeWorld).padStart(2, "0")}.webp?v=${JOURNEY_WORLD_ASSET_VERSION}`;
  }

  scheduleInitialWorldPreload() {
    const preload = () => {
      const image = new Image();
      image.decoding = "async";
      image.fetchPriority = "low";
      image.src = this.getWorldImageSource(1);
    };
    if (typeof window.requestIdleCallback === "function") {
      window.requestIdleCallback(preload, { timeout: 3000 });
    } else {
      window.setTimeout(preload, 1800);
    }
  }

  syncJourneySelection() {
    this.elements.levelMap?.querySelectorAll(".journey-node").forEach((node) => {
      const level = Number(node.dataset.level);
      node.classList.toggle("journey-node--selected", level === this.panelState.selectedLevel);
    });
    if (this.elements.startLabel) {
      this.elements.startLabel.textContent = t("level_label", { level: this.panelState.selectedLevel });
    }
    if (this.elements.progressValue) {
      this.elements.progressValue.textContent = `${this.panelState.currentLevel} / ${this.panelState.totalLevels}`;
    }
    if (this.elements.progress) {
      this.elements.progress.setAttribute(
        "aria-label",
        `${this.panelState.currentLevel} / ${this.panelState.totalLevels}`,
      );
    }
    if (this.elements.startBtn) {
      const selectedState = this.resolveJourneyLevelState(this.panelState.selectedLevel);
      this.elements.startBtn.disabled = !selectedState.unlocked;
    }
  }

  focusSelectedLevel({ behavior = "smooth" } = {}) {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const node = this.elements.levelMap?.querySelector(
          `.journey-node[data-level="${this.panelState.selectedLevel}"]`,
        );
        node?.scrollIntoView({ behavior, block: "center", inline: "nearest" });
      });
    });
  }

  renderJourneyPanel() {
    this.renderJourneyMap();
    this.syncJourneySelection();
  }
}
