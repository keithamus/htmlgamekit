export default class StaircaseProgression {
  #levels;
  #triesPerLevel;
  #reversalsToStop;
  #maxTrials;
  #correctToAdvance;
  #maxFloorVisits;

  #levelIndex = 0;
  #reversals = [];
  #lastDirection = null;
  #triedAtLevel = 0;
  #correctAtLevel = 0;
  #floorVisits = 0;
  #totalTrials = 0;

  constructor({
    levels,
    levelsStart,
    levelsEnd,
    levelsSteps,
    levelsScale = "log",
    triesPerLevel = 2,
    reversalsToStop = 8,
    maxTrials = 40,
    correctToAdvance = 2,
    maxFloorVisits = 3,
  } = {}) {
    if (levels) {
      this.#levels = levels;
    } else if (
      levelsStart != null &&
      levelsEnd != null &&
      levelsSteps != null
    ) {
      this.#levels = StaircaseProgression.computeLevels(
        Number(levelsStart),
        Number(levelsEnd),
        Number(levelsSteps),
        levelsScale,
      );
    } else {
      this.#levels = [1];
    }
    this.#triesPerLevel = triesPerLevel;
    this.#reversalsToStop = reversalsToStop;
    this.#maxTrials = maxTrials;
    this.#correctToAdvance = correctToAdvance;
    this.#maxFloorVisits = maxFloorVisits;
  }

  static computeLevels(start, end, steps, scale = "log") {
    if (steps <= 0) return [start];
    const levels = [];
    if (scale === "log") {
      const safeStart = Math.max(Number.EPSILON, start);
      const safeEnd = Math.max(Number.EPSILON, end);
      const logStart = Math.log10(safeStart);
      const logEnd = Math.log10(safeEnd);
      for (let i = 0; i <= steps; i++) {
        const exp = logStart + (logEnd - logStart) * (i / steps);
        levels.push(Number(Math.pow(10, exp).toPrecision(3)));
      }
    } else {
      for (let i = 0; i <= steps; i++) {
        levels.push(start + (end - start) * (i / steps));
      }
    }
    return levels;
  }

  init() {
    this.#levelIndex = 0;
    this.#reversals = [];
    this.#lastDirection = null;
    this.#triedAtLevel = 0;
    this.#correctAtLevel = 0;
    this.#floorVisits = 0;
    this.#totalTrials = 0;
    return this.#snapshot();
  }

  afterRound(state) {
    const passed = state.lastRoundPassed;
    this.#totalTrials++;
    this.#triedAtLevel++;
    if (passed) this.#correctAtLevel++;

    if (this.#triedAtLevel >= this.#triesPerLevel) {
      const direction =
        this.#correctAtLevel >= this.#correctToAdvance ? "down" : "up";

      if (this.#lastDirection && direction !== this.#lastDirection) {
        this.#reversals.push(this.#levels[this.#levelIndex]);
      }
      this.#lastDirection = direction;

      if (direction === "down" && this.#levelIndex < this.#levels.length - 1) {
        this.#levelIndex++;
      } else if (direction === "up" && this.#levelIndex > 0) {
        this.#levelIndex--;
      }

      this.#triedAtLevel = 0;
      this.#correctAtLevel = 0;

      if (this.#levelIndex === 0) {
        this.#floorVisits++;
      } else {
        this.#floorVisits = 0;
      }
    }

    const done =
      this.#reversals.length >= this.#reversalsToStop ||
      this.#totalTrials >= this.#maxTrials ||
      this.#floorVisits >= this.#maxFloorVisits;

    return { difficulty: this.#snapshot(), done };
  }

  computeThreshold() {
    const MIN_REVERSALS = 4;
    const MAX_REVERSALS_USED = 6;
    if (this.#reversals.length >= MIN_REVERSALS) {
      const last = this.#reversals.slice(-MAX_REVERSALS_USED);
      return last.reduce((a, b) => a + b, 0) / last.length;
    }
    return this.#levels[this.#levelIndex];
  }

  get reversals() {
    return [...this.#reversals];
  }

  get levelIndex() {
    return this.#levelIndex;
  }

  #snapshot() {
    return {
      level: this.#levels[this.#levelIndex],
      levelIndex: this.#levelIndex,
      totalLevels: this.#levels.length,
      trial: this.#totalTrials,
      maxTrials: this.#maxTrials,
      reversals: this.#reversals.length,
      reversalsNeeded: this.#reversalsToStop,
      threshold: this.computeThreshold(),
    };
  }
}
