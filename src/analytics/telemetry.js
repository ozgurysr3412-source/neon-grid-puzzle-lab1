export class TelemetryStore {
  constructor(storageKey) {
    this.storageKey = storageKey;
    this.data = this.load();
  }

  load() {
    const fallback = {
      totalRuns: 0,
      totalPlacements: 0,
      totalLines: 0,
      totalGameOvers: 0,
      averageScore: 0,
      averageTurns: 0,
    };
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) {
        return fallback;
      }
      return { ...fallback, ...JSON.parse(raw) };
    } catch {
      return fallback;
    }
  }

  snapshot() {
    return { ...this.data };
  }

  recordPlacement(linesCleared) {
    this.data.totalPlacements += 1;
    this.data.totalLines += linesCleared;
    this.save();
  }

  recordRunEnd(score, turns, gameOver = true) {
    const previousRuns = this.data.totalRuns;
    this.data.totalRuns += 1;
    if (gameOver) {
      this.data.totalGameOvers += 1;
    }

    this.data.averageScore =
      ((this.data.averageScore * previousRuns) + score) / this.data.totalRuns;
    this.data.averageTurns =
      ((this.data.averageTurns * previousRuns) + turns) / this.data.totalRuns;
    this.save();
  }

  save() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.data));
    } catch {
      // Ignore storage write failures.
    }
  }
}
