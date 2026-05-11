function level(def) {
  const targets = { blue: 0, yellow: 0, red: 0 };
  const markers = Array.isArray(def.markers) ? def.markers : [];
  markers.forEach((marker) => {
    targets[marker.type] += 1;
  });
  const objective = def.objective ?? { kind: "marker_collect" };
  return {
    ...def,
    markers,
    targets,
    objective,
  };
}

const LEVELS = [
  level({
    id: 1,
    title: "Spark Start",
    markers: [
      { row: 3, col: 3, type: "blue" },
    ],
  }),
  level({
    id: 2,
    title: "Twin Blue",
    markers: [
      { row: 1, col: 1, type: "blue" },
      { row: 6, col: 6, type: "blue" },
    ],
  }),
  level({
    id: 3,
    title: "First Mix",
    markers: [
      { row: 1, col: 6, type: "blue" },
      { row: 6, col: 1, type: "blue" },
      { row: 3, col: 3, type: "yellow" },
    ],
  }),
  level({
    id: 4,
    title: "Cross Gold",
    markers: [
      { row: 0, col: 2, type: "blue" },
      { row: 7, col: 5, type: "blue" },
      { row: 2, col: 0, type: "yellow" },
      { row: 5, col: 7, type: "yellow" },
    ],
  }),
  level({
    id: 5,
    title: "Red Debut",
    markers: [
      { row: 0, col: 0, type: "red" },
      { row: 0, col: 7, type: "blue" },
      { row: 7, col: 0, type: "yellow" },
      { row: 7, col: 7, type: "blue" },
      { row: 3, col: 3, type: "yellow" },
      { row: 4, col: 4, type: "blue" },
    ],
  }),
  level({
    id: 6,
    title: "Triple Rhythm",
    markers: [
      { row: 1, col: 1, type: "blue" },
      { row: 1, col: 6, type: "red" },
      { row: 6, col: 1, type: "yellow" },
      { row: 6, col: 6, type: "red" },
      { row: 3, col: 1, type: "yellow" },
      { row: 4, col: 6, type: "blue" },
    ],
  }),
  level({
    id: 7,
    title: "Edge Sweep",
    markers: [
      { row: 0, col: 1, type: "blue" },
      { row: 0, col: 6, type: "red" },
      { row: 7, col: 1, type: "yellow" },
      { row: 7, col: 6, type: "red" },
      { row: 2, col: 2, type: "blue" },
      { row: 2, col: 5, type: "yellow" },
      { row: 5, col: 2, type: "yellow" },
      { row: 5, col: 5, type: "blue" },
    ],
  }),
  level({
    id: 8,
    title: "Core Pulse",
    markers: [
      { row: 0, col: 3, type: "blue" },
      { row: 0, col: 4, type: "yellow" },
      { row: 7, col: 3, type: "red" },
      { row: 7, col: 4, type: "blue" },
      { row: 3, col: 0, type: "yellow" },
      { row: 4, col: 0, type: "red" },
      { row: 3, col: 7, type: "blue" },
      { row: 4, col: 7, type: "yellow" },
      { row: 3, col: 3, type: "red" },
    ],
  }),
  level({
    id: 9,
    title: "Crown Ring",
    markers: [
      { row: 1, col: 2, type: "blue" },
      { row: 1, col: 5, type: "yellow" },
      { row: 2, col: 1, type: "red" },
      { row: 2, col: 6, type: "blue" },
      { row: 5, col: 1, type: "yellow" },
      { row: 5, col: 6, type: "red" },
      { row: 6, col: 2, type: "blue" },
      { row: 6, col: 5, type: "yellow" },
      { row: 3, col: 3, type: "red" },
      { row: 4, col: 4, type: "blue" },
      { row: 3, col: 4, type: "yellow" },
    ],
  }),
  level({
    id: 10,
    title: "Chapter Crown",
    markers: [
      { row: 0, col: 0, type: "red" },
      { row: 0, col: 7, type: "blue" },
      { row: 7, col: 0, type: "yellow" },
      { row: 7, col: 7, type: "red" },
      { row: 1, col: 3, type: "blue" },
      { row: 1, col: 4, type: "yellow" },
      { row: 6, col: 3, type: "red" },
      { row: 6, col: 4, type: "blue" },
      { row: 3, col: 1, type: "yellow" },
      { row: 4, col: 1, type: "red" },
      { row: 3, col: 6, type: "blue" },
      { row: 4, col: 6, type: "yellow" },
    ],
  }),
  level({
    id: 11,
    title: "Time Rush I",
    markers: [],
    objective: {
      kind: "score_target",
      targetScore: 2100,
      timeLimitSec: 170,
    },
  }),
  level({
    id: 12,
    title: "Time Rush II",
    markers: [],
    objective: {
      kind: "score_target",
      targetScore: 2660,
      timeLimitSec: 166,
    },
  }),
  level({
    id: 13,
    title: "Tempo Surge",
    markers: [],
    objective: {
      kind: "score_target",
      targetScore: 3290,
      timeLimitSec: 162,
    },
  }),
  level({
    id: 14,
    title: "Crystal Pace",
    markers: [],
    objective: {
      kind: "score_target",
      targetScore: 3990,
      timeLimitSec: 158,
    },
  }),
  level({
    id: 15,
    title: "Star Rush",
    markers: [
      { row: 1, col: 2, type: "yellow", iconType: "star" },
      { row: 3, col: 5, type: "yellow", iconType: "star" },
      { row: 6, col: 3, type: "yellow", iconType: "star" },
    ],
    objective: {
      kind: "score_target",
      targetScore: 4760,
      timeLimitSec: 154,
      iconTargets: {
        star: 3,
      },
    },
  }),
  level({
    id: 16,
    title: "Ruby Draft",
    markers: [
      { row: 1, col: 1, type: "yellow", iconType: "star" },
      { row: 3, col: 4, type: "yellow", iconType: "star" },
      { row: 6, col: 2, type: "yellow", iconType: "star" },
      { row: 5, col: 6, type: "red", iconType: "ruby" },
    ],
    objective: {
      kind: "score_target",
      targetScore: 5460,
      timeLimitSec: 150,
      iconTargets: {
        star: 3,
        ruby: 1,
      },
    },
  }),
  level({
    id: 17,
    title: "Dual Counter",
    markers: [
      { row: 0, col: 3, type: "yellow", iconType: "star" },
      { row: 2, col: 6, type: "yellow", iconType: "star" },
      { row: 5, col: 1, type: "yellow", iconType: "star" },
      { row: 7, col: 4, type: "yellow", iconType: "star" },
      { row: 4, col: 5, type: "red", iconType: "ruby" },
    ],
    objective: {
      kind: "score_target",
      targetScore: 6230,
      timeLimitSec: 146,
      iconTargets: {
        star: 4,
        ruby: 1,
      },
    },
  }),
  level({
    id: 18,
    title: "Pressure Lane",
    markers: [
      { row: 1, col: 3, type: "yellow", iconType: "star" },
      { row: 2, col: 1, type: "yellow", iconType: "star" },
      { row: 4, col: 6, type: "yellow", iconType: "star" },
      { row: 6, col: 4, type: "yellow", iconType: "star" },
      { row: 3, col: 3, type: "red", iconType: "ruby" },
    ],
    objective: {
      kind: "score_target",
      targetScore: 7000,
      timeLimitSec: 142,
      iconTargets: {
        star: 4,
        ruby: 1,
      },
    },
  }),
  level({
    id: 19,
    title: "Crown Sprint",
    markers: [
      { row: 0, col: 2, type: "yellow", iconType: "star" },
      { row: 1, col: 6, type: "yellow", iconType: "star" },
      { row: 3, col: 4, type: "yellow", iconType: "star" },
      { row: 5, col: 2, type: "yellow", iconType: "star" },
      { row: 7, col: 5, type: "yellow", iconType: "star" },
      { row: 2, col: 3, type: "red", iconType: "ruby" },
      { row: 6, col: 1, type: "red", iconType: "ruby" },
    ],
    objective: {
      kind: "score_target",
      targetScore: 7700,
      timeLimitSec: 140,
      iconTargets: {
        star: 5,
        ruby: 2,
      },
    },
  }),
  level({
    id: 20,
    title: "Chapter II Gate",
    markers: [
      { row: 0, col: 1, type: "yellow", iconType: "star" },
      { row: 1, col: 5, type: "yellow", iconType: "star" },
      { row: 3, col: 2, type: "yellow", iconType: "star" },
      { row: 4, col: 6, type: "yellow", iconType: "star" },
      { row: 6, col: 3, type: "yellow", iconType: "star" },
      { row: 2, col: 4, type: "red", iconType: "ruby" },
      { row: 5, col: 1, type: "red", iconType: "ruby" },
    ],
    objective: {
      kind: "score_target",
      targetScore: 8400,
      timeLimitSec: 138,
      iconTargets: {
        star: 5,
        ruby: 2,
      },
    },
  }),
];

const TOTAL_LEVELS = LEVELS.length;

export function clampAdventureLevel(rawLevel) {
  const parsed = Math.floor(Number(rawLevel) || 1);
  return Math.max(1, Math.min(TOTAL_LEVELS, parsed));
}

export function getAdventureLevel(rawLevel) {
  const levelIndex = clampAdventureLevel(rawLevel) - 1;
  const template = LEVELS[levelIndex];
  const objective = {
    kind: template.objective?.kind ?? "marker_collect",
    targetScore: Number(template.objective?.targetScore ?? 0),
    timeLimitSec: Number(template.objective?.timeLimitSec ?? 0),
    iconTargets: {
      star: Number(template.objective?.iconTargets?.star ?? 0),
      ruby: Number(template.objective?.iconTargets?.ruby ?? 0),
    },
  };

  return {
    ...template,
    objective,
    markers: template.markers.map((marker, index) => ({
      id: `${template.id}-${index}`,
      ...marker,
      collected: false,
    })),
    remaining: { ...template.targets },
    completed: false,
  };
}

export function getAdventureLevelCount() {
  return TOTAL_LEVELS;
}

export function getAdventureRoadmap() {
  return LEVELS.map((entry) => ({
    id: entry.id,
    title: entry.title,
    objective: {
      kind: entry.objective?.kind ?? "marker_collect",
      targetScore: Number(entry.objective?.targetScore ?? 0),
      timeLimitSec: Number(entry.objective?.timeLimitSec ?? 0),
      iconTargets: {
        star: Number(entry.objective?.iconTargets?.star ?? 0),
        ruby: Number(entry.objective?.iconTargets?.ruby ?? 0),
      },
    },
    targets: { ...entry.targets },
    markerCount: entry.markers.length,
  }));
}
