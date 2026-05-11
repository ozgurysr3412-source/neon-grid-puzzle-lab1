function dateKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function yesterdayKey(date = new Date()) {
  const clone = new Date(date.getTime());
  clone.setDate(clone.getDate() - 1);
  return dateKey(clone);
}

function currentWeekKey(date = new Date()) {
  const clone = new Date(date.getTime());
  const day = clone.getDay() || 7;
  clone.setDate(clone.getDate() - day + 1);
  return dateKey(clone);
}

export class ProgressionManager {
  constructor(storageKey, config, random = Math.random) {
    this.storageKey = storageKey;
    this.config = config;
    this.random = random;
    this.state = this.load();
  }

  getSnapshot() {
    return {
      dailyStreak: this.state.dailyStreak,
      lastPlayedDate: this.state.lastPlayedDate,
      weeklyTop: [...this.state.weeklyTop],
      runsPlayed: this.state.runsPlayed,
      runsWonMission: this.state.runsWonMission,
      totalLinesCleared: this.state.totalLinesCleared,
      maxComboChain: this.state.maxComboChain,
      totalIconsCollected: this.state.totalIconsCollected,
      adventureCurrentLevel: this.state.adventureCurrentLevel,
      adventureCompleted: { ...this.state.adventureCompleted },
    };
  }

  getAdventureCurrentLevel(maxLevel = 10) {
    const safeMax = Math.max(1, Math.floor(Number(maxLevel) || 10));
    return Math.max(1, Math.min(safeMax, Number(this.state.adventureCurrentLevel) || 1));
  }

  completeAdventureLevel(level, maxLevel = 10) {
    const safeLevel = Math.max(1, Math.floor(Number(level) || 1));
    const safeMax = Math.max(1, Math.floor(Number(maxLevel) || 10));
    this.state.adventureCompleted[safeLevel] = true;
    const next = Math.min(safeMax, safeLevel + 1);
    this.state.adventureCurrentLevel = Math.max(this.state.adventureCurrentLevel, next);
    this.save();
  }

  nextMission() {
    const targets = this.config.MISSIONS.LINE_CLEAR_TARGETS;
    const target = targets[Math.floor(this.random() * targets.length)];
    return {
      type: "clear_lines",
      target,
      progress: 0,
      completed: false,
      reward: this.config.SCORING.MISSION_COMPLETE_BONUS,
      label: `Clear ${target} lines this run`,
    };
  }

  completeRun(runData) {
    const today = dateKey();
    const wasFirstRunToday = this.state.lastPlayedDate !== today;
    const wasYesterday = this.state.lastPlayedDate === yesterdayKey();

    if (wasFirstRunToday) {
      this.state.dailyStreak = wasYesterday ? this.state.dailyStreak + 1 : 1;
      this.state.lastPlayedDate = today;
    }

    this.state.runsPlayed += 1;
    if (runData.missionCompleted) {
      this.state.runsWonMission += 1;
    }
    this.state.totalLinesCleared += Math.max(0, Math.floor(Number(runData.linesCleared) || 0));
    this.state.maxComboChain = Math.max(
      this.state.maxComboChain,
      Math.max(0, Math.floor(Number(runData.maxComboChain) || 0)),
    );
    this.state.totalIconsCollected += Math.max(0, Math.floor(Number(runData.iconsCollected) || 0));

    const weekKey = currentWeekKey();
    if (this.state.weekKey !== weekKey) {
      this.state.weekKey = weekKey;
      this.state.weeklyTop = [];
    }

    this.state.weeklyTop.push({
      score: runData.score,
      mode: runData.mode,
      turns: runData.turns,
      at: new Date().toISOString(),
    });
    this.state.weeklyTop.sort((a, b) => b.score - a.score);
    this.state.weeklyTop = this.state.weeklyTop.slice(0, this.config.META.WEEKLY_TOP_LIMIT);
    this.save();
  }

  load() {
    const fallback = {
      dailyStreak: 0,
      lastPlayedDate: null,
      weekKey: currentWeekKey(),
      weeklyTop: [],
      runsPlayed: 0,
      runsWonMission: 0,
      totalLinesCleared: 0,
      maxComboChain: 0,
      totalIconsCollected: 0,
      adventureCurrentLevel: 1,
      adventureCompleted: {},
    };
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) {
        return fallback;
      }
      const parsed = JSON.parse(raw);
      const state = {
        ...fallback,
        ...parsed,
      };
      state.runsPlayed = Math.max(0, Math.floor(Number(state.runsPlayed) || 0));
      state.runsWonMission = Math.max(0, Math.floor(Number(state.runsWonMission) || 0));
      state.totalLinesCleared = Math.max(0, Math.floor(Number(state.totalLinesCleared) || 0));
      state.maxComboChain = Math.max(0, Math.floor(Number(state.maxComboChain) || 0));
      state.totalIconsCollected = Math.max(0, Math.floor(Number(state.totalIconsCollected) || 0));
      state.adventureCurrentLevel = Math.max(1, Math.floor(Number(state.adventureCurrentLevel) || 1));
      return state;
    } catch {
      return fallback;
    }
  }

  save() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.state));
    } catch {
      // Ignore storage write failures.
    }
  }
}
