function level(def) {
  const targets = { blue: 0, yellow: 0, red: 0, crown: 0 };
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
      targetScore: 5000,
      timeLimitSec: 180,
    },
  }),
  level({
    id: 12,
    title: "Time Rush II",
    markers: [],
    objective: {
      kind: "score_target",
      targetScore: 5300,
      timeLimitSec: 178,
    },
  }),
  level({
    id: 13,
    title: "Tempo Surge",
    markers: [],
    objective: {
      kind: "score_target",
      targetScore: 5600,
      timeLimitSec: 176,
    },
  }),
  level({
    id: 14,
    title: "Crystal Pace",
    markers: [],
    objective: {
      kind: "score_target",
      targetScore: 5900,
      timeLimitSec: 174,
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
      targetScore: 6200,
      timeLimitSec: 176,
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
      targetScore: 6500,
      timeLimitSec: 176,
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
      targetScore: 6800,
      timeLimitSec: 174,
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
      targetScore: 7100,
      timeLimitSec: 172,
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
      targetScore: 7400,
      timeLimitSec: 174,
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
      targetScore: 7600,
      timeLimitSec: 176,
      iconTargets: {
        star: 5,
        ruby: 2,
      },
    },
  }),
  level({
    id: 21,
    title: "Crystal Gate",
    markers: [
      { row: 0, col: 1, type: "yellow", iconType: "star" },
      { row: 1, col: 6, type: "yellow", iconType: "star" },
      { row: 3, col: 2, type: "yellow", iconType: "star" },
      { row: 5, col: 5, type: "yellow", iconType: "star" },
      { row: 7, col: 3, type: "yellow", iconType: "star" },
      { row: 2, col: 4, type: "red", iconType: "ruby" },
      { row: 6, col: 0, type: "red", iconType: "ruby" },
    ],
    objective: {
      kind: "score_target",
      targetScore: 7800,
      timeLimitSec: 176,
      iconTargets: { star: 5, ruby: 2 },
    },
  }),
  level({
    id: 22,
    title: "Deep Shine",
    markers: [
      { row: 0, col: 5, type: "yellow", iconType: "star" },
      { row: 2, col: 1, type: "yellow", iconType: "star" },
      { row: 3, col: 6, type: "yellow", iconType: "star" },
      { row: 5, col: 2, type: "yellow", iconType: "star" },
      { row: 7, col: 6, type: "yellow", iconType: "star" },
      { row: 1, col: 3, type: "red", iconType: "ruby" },
      { row: 6, col: 4, type: "red", iconType: "ruby" },
    ],
    objective: {
      kind: "score_target",
      targetScore: 8000,
      timeLimitSec: 174,
      iconTargets: { star: 5, ruby: 2 },
    },
  }),
  level({
    id: 23,
    title: "Ruby Vein",
    markers: [
      { row: 0, col: 2, type: "yellow", iconType: "star" },
      { row: 2, col: 6, type: "yellow", iconType: "star" },
      { row: 5, col: 1, type: "yellow", iconType: "star" },
      { row: 7, col: 4, type: "yellow", iconType: "star" },
      { row: 1, col: 5, type: "red", iconType: "ruby" },
      { row: 3, col: 3, type: "red", iconType: "ruby" },
      { row: 6, col: 6, type: "red", iconType: "ruby" },
    ],
    objective: {
      kind: "score_target",
      targetScore: 8200,
      timeLimitSec: 176,
      iconTargets: { star: 4, ruby: 3 },
    },
  }),
  level({
    id: 24,
    title: "Split Crystals",
    markers: [
      { row: 0, col: 0, type: "yellow", iconType: "star" },
      { row: 1, col: 5, type: "yellow", iconType: "star" },
      { row: 3, col: 1, type: "yellow", iconType: "star" },
      { row: 4, col: 6, type: "yellow", iconType: "star" },
      { row: 6, col: 2, type: "yellow", iconType: "star" },
      { row: 7, col: 7, type: "yellow", iconType: "star" },
      { row: 2, col: 4, type: "red", iconType: "ruby" },
      { row: 5, col: 3, type: "red", iconType: "ruby" },
    ],
    objective: {
      kind: "score_target",
      targetScore: 8400,
      timeLimitSec: 176,
      iconTargets: { star: 6, ruby: 2 },
    },
  }),
  level({
    id: 25,
    title: "Calm Cavern",
    markers: [
      { row: 0, col: 3, type: "yellow", iconType: "star" },
      { row: 2, col: 1, type: "yellow", iconType: "star" },
      { row: 3, col: 6, type: "yellow", iconType: "star" },
      { row: 5, col: 2, type: "yellow", iconType: "star" },
      { row: 7, col: 5, type: "yellow", iconType: "star" },
      { row: 4, col: 4, type: "red", iconType: "ruby" },
    ],
    objective: {
      kind: "score_target",
      targetScore: 8000,
      timeLimitSec: 184,
      iconTargets: { star: 5, ruby: 1 },
    },
  }),
  level({
    id: 26,
    title: "Crystal Maze",
    markers: [
      { row: 0, col: 1, type: "yellow", iconType: "star" },
      { row: 1, col: 6, type: "yellow", iconType: "star" },
      { row: 2, col: 3, type: "yellow", iconType: "star" },
      { row: 4, col: 0, type: "yellow", iconType: "star" },
      { row: 5, col: 5, type: "yellow", iconType: "star" },
      { row: 7, col: 2, type: "yellow", iconType: "star" },
      { row: 3, col: 7, type: "red", iconType: "ruby" },
      { row: 6, col: 4, type: "red", iconType: "ruby" },
    ],
    objective: {
      kind: "score_target",
      targetScore: 8600,
      timeLimitSec: 176,
      iconTargets: { star: 6, ruby: 2 },
    },
  }),
  level({
    id: 27,
    title: "Red Echo",
    markers: [
      { row: 0, col: 6, type: "yellow", iconType: "star" },
      { row: 2, col: 2, type: "yellow", iconType: "star" },
      { row: 3, col: 5, type: "yellow", iconType: "star" },
      { row: 5, col: 0, type: "yellow", iconType: "star" },
      { row: 7, col: 4, type: "yellow", iconType: "star" },
      { row: 1, col: 3, type: "red", iconType: "ruby" },
      { row: 4, col: 7, type: "red", iconType: "ruby" },
      { row: 6, col: 1, type: "red", iconType: "ruby" },
    ],
    objective: {
      kind: "score_target",
      targetScore: 8800,
      timeLimitSec: 178,
      iconTargets: { star: 5, ruby: 3 },
    },
  }),
  level({
    id: 28,
    title: "Narrow Glow",
    markers: [
      { row: 0, col: 2, type: "yellow", iconType: "star" },
      { row: 1, col: 7, type: "yellow", iconType: "star" },
      { row: 3, col: 0, type: "yellow", iconType: "star" },
      { row: 4, col: 5, type: "yellow", iconType: "star" },
      { row: 6, col: 3, type: "yellow", iconType: "star" },
      { row: 7, col: 6, type: "yellow", iconType: "star" },
      { row: 2, col: 4, type: "red", iconType: "ruby" },
      { row: 5, col: 1, type: "red", iconType: "ruby" },
    ],
    objective: {
      kind: "score_target",
      targetScore: 9000,
      timeLimitSec: 174,
      iconTargets: { star: 6, ruby: 2 },
    },
  }),
  level({
    id: 29,
    title: "Silent Cave",
    markers: [
      { row: 1, col: 1, type: "yellow", iconType: "star" },
      { row: 2, col: 6, type: "yellow", iconType: "star" },
      { row: 5, col: 2, type: "yellow", iconType: "star" },
      { row: 6, col: 5, type: "yellow", iconType: "star" },
      { row: 3, col: 4, type: "red", iconType: "ruby" },
      { row: 7, col: 0, type: "red", iconType: "ruby" },
    ],
    objective: {
      kind: "score_target",
      targetScore: 8500,
      timeLimitSec: 184,
      iconTargets: { star: 4, ruby: 2 },
    },
  }),
  level({
    id: 30,
    title: "Crystal Core",
    markers: [
      { row: 0, col: 0, type: "yellow", iconType: "star" },
      { row: 0, col: 7, type: "yellow", iconType: "star" },
      { row: 2, col: 2, type: "yellow", iconType: "star" },
      { row: 3, col: 5, type: "yellow", iconType: "star" },
      { row: 6, col: 1, type: "yellow", iconType: "star" },
      { row: 7, col: 6, type: "yellow", iconType: "star" },
      { row: 1, col: 4, type: "red", iconType: "ruby" },
      { row: 5, col: 3, type: "red", iconType: "ruby" },
    ],
    objective: {
      kind: "score_target",
      targetScore: 9300,
      timeLimitSec: 176,
      iconTargets: { star: 6, ruby: 2 },
    },
  }),
  level({
    id: 31,
    title: "Sky Entrance",
    markers: [
      { row: 0, col: 1, type: "yellow", iconType: "star" },
      { row: 2, col: 6, type: "yellow", iconType: "star" },
      { row: 5, col: 2, type: "yellow", iconType: "star" },
      { row: 7, col: 5, type: "yellow", iconType: "star" },
      { row: 1, col: 4, type: "red", iconType: "ruby" },
      { row: 6, col: 0, type: "red", iconType: "ruby" },
      { row: 3, col: 3, type: "blue", iconType: "diamond" },
    ],
    objective: { kind: "score_target", targetScore: 9400, timeLimitSec: 178, iconTargets: { star: 4, ruby: 2, diamond: 1 } },
  }),
  level({
    id: 32,
    title: "Cloud Path",
    markers: [
      { row: 0, col: 5, type: "yellow", iconType: "star" },
      { row: 2, col: 1, type: "yellow", iconType: "star" },
      { row: 5, col: 6, type: "yellow", iconType: "star" },
      { row: 7, col: 2, type: "yellow", iconType: "star" },
      { row: 1, col: 3, type: "red", iconType: "ruby" },
      { row: 6, col: 4, type: "red", iconType: "ruby" },
      { row: 3, col: 7, type: "blue", iconType: "diamond" },
      { row: 4, col: 0, type: "blue", iconType: "diamond" },
    ],
    objective: { kind: "score_target", targetScore: 9600, timeLimitSec: 180, iconTargets: { star: 4, ruby: 2, diamond: 2 } },
  }),
  level({
    id: 33,
    title: "Royal Draft",
    markers: [
      { row: 0, col: 2, type: "yellow", iconType: "star" },
      { row: 3, col: 6, type: "yellow", iconType: "star" },
      { row: 5, col: 1, type: "yellow", iconType: "star" },
      { row: 7, col: 4, type: "yellow", iconType: "star" },
      { row: 1, col: 6, type: "red", iconType: "ruby" },
      { row: 4, col: 3, type: "red", iconType: "ruby" },
      { row: 6, col: 7, type: "red", iconType: "ruby" },
      { row: 2, col: 0, type: "blue", iconType: "diamond" },
    ],
    objective: { kind: "score_target", targetScore: 9800, timeLimitSec: 178, iconTargets: { star: 4, ruby: 3, diamond: 1 } },
  }),
  level({
    id: 34,
    title: "Open Balcony",
    markers: [
      { row: 0, col: 3, type: "yellow", iconType: "star" },
      { row: 2, col: 6, type: "yellow", iconType: "star" },
      { row: 5, col: 1, type: "yellow", iconType: "star" },
      { row: 7, col: 5, type: "yellow", iconType: "star" },
      { row: 4, col: 4, type: "red", iconType: "ruby" },
      { row: 3, col: 0, type: "blue", iconType: "diamond" },
    ],
    objective: { kind: "score_target", targetScore: 9300, timeLimitSec: 188, iconTargets: { star: 4, ruby: 1, diamond: 1 } },
  }),
  level({
    id: 35,
    title: "Wind Columns",
    markers: [
      { row: 0, col: 1, type: "yellow", iconType: "star" },
      { row: 1, col: 6, type: "yellow", iconType: "star" },
      { row: 3, col: 2, type: "yellow", iconType: "star" },
      { row: 5, col: 5, type: "yellow", iconType: "star" },
      { row: 7, col: 3, type: "yellow", iconType: "star" },
      { row: 4, col: 7, type: "red", iconType: "ruby" },
      { row: 2, col: 4, type: "blue", iconType: "diamond" },
      { row: 6, col: 0, type: "blue", iconType: "diamond" },
    ],
    objective: { kind: "score_target", targetScore: 10000, timeLimitSec: 180, iconTargets: { star: 5, ruby: 1, diamond: 2 } },
  }),
  level({
    id: 36,
    title: "Crown Air",
    markers: [
      { row: 0, col: 6, type: "yellow", iconType: "star" },
      { row: 2, col: 2, type: "yellow", iconType: "star" },
      { row: 3, col: 5, type: "yellow", iconType: "star" },
      { row: 5, col: 0, type: "yellow", iconType: "star" },
      { row: 7, col: 4, type: "yellow", iconType: "star" },
      { row: 1, col: 3, type: "red", iconType: "ruby" },
      { row: 6, col: 1, type: "red", iconType: "ruby" },
      { row: 4, col: 7, type: "blue", iconType: "diamond" },
    ],
    objective: { kind: "score_target", targetScore: 10200, timeLimitSec: 178, iconTargets: { star: 5, ruby: 2, diamond: 1 } },
  }),
  level({
    id: 37,
    title: "Ruby Clouds",
    markers: [
      { row: 0, col: 0, type: "yellow", iconType: "star" },
      { row: 2, col: 5, type: "yellow", iconType: "star" },
      { row: 5, col: 2, type: "yellow", iconType: "star" },
      { row: 7, col: 7, type: "yellow", iconType: "star" },
      { row: 1, col: 6, type: "red", iconType: "ruby" },
      { row: 3, col: 3, type: "red", iconType: "ruby" },
      { row: 6, col: 0, type: "red", iconType: "ruby" },
      { row: 4, col: 5, type: "blue", iconType: "diamond" },
    ],
    objective: { kind: "score_target", targetScore: 10400, timeLimitSec: 180, iconTargets: { star: 4, ruby: 3, diamond: 1 } },
  }),
  level({
    id: 38,
    title: "High Citadel",
    markers: [
      { row: 0, col: 2, type: "yellow", iconType: "star" },
      { row: 1, col: 7, type: "yellow", iconType: "star" },
      { row: 3, col: 0, type: "yellow", iconType: "star" },
      { row: 5, col: 5, type: "yellow", iconType: "star" },
      { row: 7, col: 3, type: "yellow", iconType: "star" },
      { row: 6, col: 6, type: "red", iconType: "ruby" },
      { row: 2, col: 4, type: "blue", iconType: "diamond" },
      { row: 4, col: 1, type: "blue", iconType: "diamond" },
    ],
    objective: { kind: "score_target", targetScore: 10600, timeLimitSec: 178, iconTargets: { star: 5, ruby: 1, diamond: 2 } },
  }),
  level({
    id: 39,
    title: "Quiet Tower",
    markers: [
      { row: 1, col: 1, type: "yellow", iconType: "star" },
      { row: 2, col: 6, type: "yellow", iconType: "star" },
      { row: 5, col: 2, type: "yellow", iconType: "star" },
      { row: 6, col: 5, type: "yellow", iconType: "star" },
      { row: 3, col: 4, type: "red", iconType: "ruby" },
      { row: 7, col: 0, type: "blue", iconType: "diamond" },
    ],
    objective: { kind: "score_target", targetScore: 9900, timeLimitSec: 188, iconTargets: { star: 4, ruby: 1, diamond: 1 } },
  }),
  level({
    id: 40,
    title: "Royal Sky Throne",
    markers: [
      { row: 0, col: 0, type: "yellow", iconType: "star" },
      { row: 0, col: 7, type: "yellow", iconType: "star" },
      { row: 3, col: 2, type: "yellow", iconType: "star" },
      { row: 5, col: 5, type: "yellow", iconType: "star" },
      { row: 7, col: 3, type: "yellow", iconType: "star" },
      { row: 2, col: 6, type: "red", iconType: "ruby" },
      { row: 6, col: 1, type: "red", iconType: "ruby" },
      { row: 4, col: 4, type: "blue", iconType: "diamond" },
    ],
    objective: { kind: "score_target", targetScore: 10800, timeLimitSec: 180, iconTargets: { star: 5, ruby: 2, diamond: 1 } },
  }),
  level({
    id: 41, title: "Golden Gate",
    markers: [
      { row: 0, col: 1, type: "yellow", iconType: "star" }, { row: 2, col: 6, type: "yellow", iconType: "star" },
      { row: 5, col: 2, type: "yellow", iconType: "star" }, { row: 7, col: 5, type: "yellow", iconType: "star" },
      { row: 1, col: 4, type: "red", iconType: "ruby" }, { row: 6, col: 0, type: "blue", iconType: "diamond" },
      { row: 3, col: 3, type: "crown", iconType: "crown" },
    ],
    objective: { kind: "score_target", targetScore: 10800, timeLimitSec: 182, iconTargets: { star: 4, ruby: 1, diamond: 1, crown: 1 } },
  }),
  level({
    id: 42, title: "Gold Road",
    markers: [
      { row: 0, col: 5, type: "yellow", iconType: "star" }, { row: 2, col: 1, type: "yellow", iconType: "star" },
      { row: 5, col: 6, type: "yellow", iconType: "star" }, { row: 7, col: 2, type: "yellow", iconType: "star" },
      { row: 1, col: 3, type: "red", iconType: "ruby" }, { row: 6, col: 4, type: "blue", iconType: "diamond" },
      { row: 3, col: 7, type: "crown", iconType: "crown" }, { row: 4, col: 0, type: "crown", iconType: "crown" },
    ],
    objective: { kind: "score_target", targetScore: 11000, timeLimitSec: 184, iconTargets: { star: 4, ruby: 1, diamond: 1, crown: 2 } },
  }),
  level({
    id: 43, title: "Ruby Crown",
    markers: [
      { row: 0, col: 2, type: "yellow", iconType: "star" }, { row: 3, col: 6, type: "yellow", iconType: "star" },
      { row: 5, col: 1, type: "yellow", iconType: "star" }, { row: 7, col: 4, type: "yellow", iconType: "star" },
      { row: 1, col: 6, type: "red", iconType: "ruby" }, { row: 6, col: 7, type: "red", iconType: "ruby" },
      { row: 2, col: 0, type: "blue", iconType: "diamond" }, { row: 4, col: 3, type: "crown", iconType: "crown" },
    ],
    objective: { kind: "score_target", targetScore: 11100, timeLimitSec: 182, iconTargets: { star: 4, ruby: 2, diamond: 1, crown: 1 } },
  }),
  level({
    id: 44, title: "Golden Rest",
    markers: [
      { row: 0, col: 3, type: "yellow", iconType: "star" }, { row: 2, col: 6, type: "yellow", iconType: "star" },
      { row: 5, col: 1, type: "yellow", iconType: "star" }, { row: 7, col: 5, type: "yellow", iconType: "star" },
      { row: 4, col: 4, type: "red", iconType: "ruby" }, { row: 3, col: 0, type: "crown", iconType: "crown" },
    ],
    objective: { kind: "score_target", targetScore: 10500, timeLimitSec: 192, iconTargets: { star: 4, ruby: 1, diamond: 0, crown: 1 } },
  }),
  level({
    id: 45, title: "Palace Lines",
    markers: [
      { row: 0, col: 1, type: "yellow", iconType: "star" }, { row: 2, col: 3, type: "yellow", iconType: "star" },
      { row: 5, col: 5, type: "yellow", iconType: "star" }, { row: 7, col: 2, type: "yellow", iconType: "star" },
      { row: 4, col: 7, type: "red", iconType: "ruby" }, { row: 6, col: 0, type: "blue", iconType: "diamond" },
      { row: 1, col: 6, type: "crown", iconType: "crown" }, { row: 3, col: 4, type: "crown", iconType: "crown" },
    ],
    objective: { kind: "score_target", targetScore: 11300, timeLimitSec: 184, iconTargets: { star: 4, ruby: 1, diamond: 1, crown: 2 } },
  }),
  level({
    id: 46, title: "Heavy Crown",
    markers: [
      { row: 0, col: 6, type: "yellow", iconType: "star" }, { row: 2, col: 2, type: "yellow", iconType: "star" },
      { row: 5, col: 0, type: "yellow", iconType: "star" }, { row: 7, col: 4, type: "yellow", iconType: "star" },
      { row: 1, col: 3, type: "red", iconType: "ruby" }, { row: 6, col: 1, type: "red", iconType: "ruby" },
      { row: 4, col: 7, type: "blue", iconType: "diamond" }, { row: 3, col: 5, type: "crown", iconType: "crown" },
    ],
    objective: { kind: "score_target", targetScore: 11400, timeLimitSec: 182, iconTargets: { star: 4, ruby: 2, diamond: 1, crown: 1 } },
  }),
  level({
    id: 47, title: "Royal Ruby Trial",
    markers: [
      { row: 0, col: 0, type: "yellow", iconType: "star" }, { row: 5, col: 2, type: "yellow", iconType: "star" },
      { row: 7, col: 7, type: "yellow", iconType: "star" }, { row: 1, col: 6, type: "red", iconType: "ruby" },
      { row: 6, col: 0, type: "red", iconType: "ruby" }, { row: 4, col: 5, type: "blue", iconType: "diamond" },
      { row: 2, col: 3, type: "crown", iconType: "crown" }, { row: 3, col: 7, type: "crown", iconType: "crown" },
    ],
    objective: { kind: "score_target", targetScore: 11600, timeLimitSec: 184, iconTargets: { star: 3, ruby: 2, diamond: 1, crown: 2 } },
  }),
  level({
    id: 48, title: "Sunlit Hall",
    markers: [
      { row: 0, col: 2, type: "yellow", iconType: "star" }, { row: 3, col: 0, type: "yellow", iconType: "star" },
      { row: 5, col: 5, type: "yellow", iconType: "star" }, { row: 7, col: 3, type: "yellow", iconType: "star" },
      { row: 6, col: 6, type: "red", iconType: "ruby" }, { row: 2, col: 4, type: "blue", iconType: "diamond" },
      { row: 4, col: 1, type: "crown", iconType: "crown" },
    ],
    objective: { kind: "score_target", targetScore: 11000, timeLimitSec: 192, iconTargets: { star: 4, ruby: 1, diamond: 1, crown: 1 } },
  }),
  level({
    id: 49, title: "Final Treasury",
    markers: [
      { row: 0, col: 1, type: "yellow", iconType: "star" }, { row: 2, col: 6, type: "yellow", iconType: "star" },
      { row: 5, col: 2, type: "yellow", iconType: "star" }, { row: 7, col: 5, type: "yellow", iconType: "star" },
      { row: 1, col: 4, type: "red", iconType: "ruby" }, { row: 6, col: 0, type: "blue", iconType: "diamond" },
      { row: 3, col: 3, type: "crown", iconType: "crown" }, { row: 4, col: 7, type: "crown", iconType: "crown" },
    ],
    objective: { kind: "score_target", targetScore: 11800, timeLimitSec: 184, iconTargets: { star: 4, ruby: 1, diamond: 1, crown: 2 } },
  }),
  level({
    id: 50, title: "Golden Crown Finale",
    markers: [
      { row: 0, col: 0, type: "yellow", iconType: "star" }, { row: 3, col: 2, type: "yellow", iconType: "star" },
      { row: 7, col: 6, type: "yellow", iconType: "star" }, { row: 2, col: 6, type: "red", iconType: "ruby" },
      { row: 6, col: 1, type: "blue", iconType: "diamond" }, { row: 0, col: 7, type: "crown", iconType: "crown" },
      { row: 4, col: 4, type: "crown", iconType: "crown" }, { row: 7, col: 0, type: "crown", iconType: "crown" },
    ],
    objective: { kind: "score_target", targetScore: 12000, timeLimitSec: 186, iconTargets: { star: 3, ruby: 1, diamond: 1, crown: 3 } },
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
      diamond: Number(template.objective?.iconTargets?.diamond ?? 0),
      crown: Number(template.objective?.iconTargets?.crown ?? 0),
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
        diamond: Number(entry.objective?.iconTargets?.diamond ?? 0),
        crown: Number(entry.objective?.iconTargets?.crown ?? 0),
      },
    },
    targets: { ...entry.targets },
    markerCount: entry.markers.length,
  }));
}
