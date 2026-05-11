const BADGE_ROOT = "./assets/ui/badges";

export const ACHIEVEMENT_DEFINITIONS = Object.freeze([
  {
    id: "first_finish",
    name: "First Finish",
    badgeSrc: `${BADGE_ROOT}/badge-01.png`,
    condition: "Finish your first run",
  },
  {
    id: "line_breaker_i",
    name: "Line Breaker I",
    badgeSrc: `${BADGE_ROOT}/badge-02.png`,
    condition: "Clear 50 total lines",
  },
  {
    id: "line_breaker_ii",
    name: "Line Breaker II",
    badgeSrc: `${BADGE_ROOT}/badge-03.png`,
    condition: "Clear 100 total lines",
  },
  {
    id: "combo_starter",
    name: "Combo Starter",
    badgeSrc: `${BADGE_ROOT}/badge-04.png`,
    condition: "Reach combo x3",
  },
  {
    id: "combo_master",
    name: "Combo Master",
    badgeSrc: `${BADGE_ROOT}/badge-05.png`,
    condition: "Reach combo x5",
  },
  {
    id: "score_5k",
    name: "Score 10K",
    badgeSrc: `${BADGE_ROOT}/badge-06.png?v=clean2`,
    condition: "Reach 10,000 best score",
  },
  {
    id: "score_10k",
    name: "Score 25K",
    badgeSrc: `${BADGE_ROOT}/badge-07.png?v=clean2`,
    condition: "Reach 25,000 best score",
  },
  {
    id: "score_15k",
    name: "Score 50K",
    badgeSrc: `${BADGE_ROOT}/badge-08.png?v=clean2`,
    condition: "Reach 50,000 best score",
  },
  {
    id: "journey_scout",
    name: "Journey Scout",
    badgeSrc: `${BADGE_ROOT}/badge-09.png`,
    condition: "Complete Journey level 20",
  },
  {
    id: "journey_vanguard",
    name: "Journey Vanguard",
    badgeSrc: `${BADGE_ROOT}/badge-10.png`,
    condition: "Complete Journey level 50",
  },
  {
    id: "relic_hunter",
    name: "Relic Hunter",
    badgeSrc: `${BADGE_ROOT}/badge-11.png`,
    condition: "Collect 50 star/ruby icons",
  },
  {
    id: "crown_keeper",
    name: "Crown Keeper",
    badgeSrc: `${BADGE_ROOT}/badge-12.png`,
    condition: "Unlock all other badges",
  },
]);

function toSafeNumber(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 0;
  }
  return parsed;
}

function isAdventureLevelCompleted(adventureProgress, level) {
  const completed = adventureProgress?.completed ?? {};
  if (completed[level] === true || completed[String(level)] === true) {
    return true;
  }
  return toSafeNumber(adventureProgress?.currentLevel) > level;
}

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function ratio(current, target) {
  if (!Number.isFinite(target) || target <= 0) {
    return 0;
  }
  return clamp01(current / target);
}

function formatCompactNumber(value) {
  const n = Math.max(0, Math.floor(Number(value) || 0));
  return n.toLocaleString("en-US");
}

function formatRemainingText(id, current, target) {
  const left = Math.max(0, Math.ceil((Number(target) || 0) - (Number(current) || 0)));
  if (left <= 0) {
    return "Completed";
  }
  switch (id) {
    case "first_finish":
      return `${left} run left`;
    case "line_breaker_i":
    case "line_breaker_ii":
      return `${left} lines left`;
    case "combo_starter":
    case "combo_master":
      return `x${left} combo left`;
    case "score_5k":
    case "score_10k":
    case "score_15k":
      return `${formatCompactNumber(left)} left`;
    case "journey_scout":
    case "journey_vanguard":
      return `${left} levels left`;
    case "relic_hunter":
      return `${left} relics left`;
    case "crown_keeper":
      return `${left} badges left`;
    default:
      return `${left} left`;
  }
}

export function evaluateAchievements(snapshot = {}) {
  const runStats = snapshot.runStats ?? {};
  const adventureProgress = snapshot.adventureProgress ?? {};
  const bestScore = toSafeNumber(snapshot.bestScore);

  const runsPlayed = toSafeNumber(runStats.runsPlayed);
  const totalLinesCleared = toSafeNumber(runStats.totalLinesCleared);
  const maxComboChain = toSafeNumber(runStats.maxComboChain);
  const totalIconsCollected = toSafeNumber(runStats.totalIconsCollected);
  const currentJourneyLevel = Math.max(1, Math.floor(toSafeNumber(adventureProgress.currentLevel) || 1));

  const baseStates = {
    first_finish: {
      current: runsPlayed,
      target: 1,
      unlocked: runsPlayed >= 1,
      progressText: `${Math.min(runsPlayed, 1)}/1 run`,
    },
    line_breaker_i: {
      current: totalLinesCleared,
      target: 50,
      unlocked: totalLinesCleared >= 50,
      progressText: `${Math.min(totalLinesCleared, 50)}/50 lines`,
    },
    line_breaker_ii: {
      current: totalLinesCleared,
      target: 100,
      unlocked: totalLinesCleared >= 100,
      progressText: `${Math.min(totalLinesCleared, 100)}/100 lines`,
    },
    combo_starter: {
      current: maxComboChain,
      target: 3,
      unlocked: maxComboChain >= 3,
      progressText: `x${Math.min(maxComboChain, 3)}/x3 combo`,
    },
    combo_master: {
      current: maxComboChain,
      target: 5,
      unlocked: maxComboChain >= 5,
      progressText: `x${Math.min(maxComboChain, 5)}/x5 combo`,
    },
    score_5k: {
      current: bestScore,
      target: 10000,
      unlocked: bestScore >= 10000,
      progressText: `${formatCompactNumber(Math.min(bestScore, 10000))}/10,000`,
    },
    score_10k: {
      current: bestScore,
      target: 25000,
      unlocked: bestScore >= 25000,
      progressText: `${formatCompactNumber(Math.min(bestScore, 25000))}/25,000`,
    },
    score_15k: {
      current: bestScore,
      target: 50000,
      unlocked: bestScore >= 50000,
      progressText: `${formatCompactNumber(Math.min(bestScore, 50000))}/50,000`,
    },
    journey_scout: {
      current: currentJourneyLevel,
      target: 20,
      unlocked: isAdventureLevelCompleted(adventureProgress, 20),
      progressText: `Level ${Math.min(currentJourneyLevel, 20)}/20`,
    },
    journey_vanguard: {
      current: currentJourneyLevel,
      target: 50,
      unlocked: isAdventureLevelCompleted(adventureProgress, 50),
      progressText: `Level ${Math.min(currentJourneyLevel, 50)}/50`,
    },
    relic_hunter: {
      current: totalIconsCollected,
      target: 50,
      unlocked: totalIconsCollected >= 50,
      progressText: `${Math.min(totalIconsCollected, 50)}/50 relics`,
    },
  };

  const unlockedBeforeCrownCount = Object.values(baseStates).reduce(
    (count, item) => count + (item.unlocked ? 1 : 0),
    0,
  );
  baseStates.crown_keeper = {
    current: unlockedBeforeCrownCount,
    target: Object.keys(baseStates).length,
    unlocked: unlockedBeforeCrownCount >= Object.keys(baseStates).length,
    progressText: `${unlockedBeforeCrownCount}/${Object.keys(baseStates).length} badges`,
  };

  const items = ACHIEVEMENT_DEFINITIONS.map((definition) => {
    const state = baseStates[definition.id] ?? {
      current: 0,
      target: 1,
      unlocked: false,
      progressText: "0/1",
    };
    return {
      ...definition,
      unlocked: Boolean(state.unlocked),
      progressRatio: ratio(state.current, state.target),
      progressText: state.progressText,
      remainingText: formatRemainingText(definition.id, state.current, state.target),
      currentValue: state.current,
      targetValue: state.target,
    };
  });

  const unlockedCount = items.reduce((count, item) => count + (item.unlocked ? 1 : 0), 0);
  const lockedItems = items
    .filter((item) => !item.unlocked)
    .sort((a, b) => b.progressRatio - a.progressRatio);
  const nearTargets = lockedItems.slice(0, 3).map((item) => ({
    id: item.id,
    name: item.name,
    progressText: item.progressText,
    remainingText: item.remainingText,
    condition: item.condition,
  }));

  return {
    items,
    unlockedCount,
    totalCount: items.length,
    nearTargets,
  };
}
