export default class TierProgression {
  #tiers;
  #promoteAfter;
  #demoteAfter;
  #points;

  #tierIndex = 0;
  #peakTier = 0;
  #consecutiveCorrect = 0;

  constructor({
    tiers,
    promoteAfter = 2,
    demoteAfter = 1,
    points,
  } = {}) {
    this.tiers = tiers;
    this.#promoteAfter = promoteAfter;
    this.#demoteAfter = demoteAfter;
    this.#points = points || this.#tiers.map((_, i) => i + 1);
  }

  set tiers(value) {
    if (Array.isArray(value) && value.length) {
      this.#tiers = value.map((t) =>
        typeof t === "string" ? { name: t } : t,
      );
    } else if (typeof value === "string" && value.trim()) {
      this.#tiers = value.split(",").map((s) => ({ name: s.trim() }));
    } else if (!this.#tiers?.length) {
      this.#tiers = [{ name: "default" }];
    }
  }

  init() {
    this.#tierIndex = 0;
    this.#peakTier = 0;
    this.#consecutiveCorrect = 0;
    return this.#snapshot();
  }

  afterRound(state) {
    const passed = state.lastRoundPassed;

    if (!passed) {
      this.#consecutiveCorrect = 0;
      this.#tierIndex = Math.max(0, this.#tierIndex - 1);
    } else {
      this.#consecutiveCorrect++;
      if (
        this.#consecutiveCorrect >= this.#promoteAfter &&
        this.#tierIndex < this.#tiers.length - 1
      ) {
        this.#tierIndex++;
        this.#consecutiveCorrect = 0;
      }
    }

    if (this.#tierIndex > this.#peakTier) {
      this.#peakTier = this.#tierIndex;
    }

    return {
      difficulty: this.#snapshot(),
      done: state.round >= state.rounds,
    };
  }

  get tierIndex() {
    return this.#tierIndex;
  }

  get peakTier() {
    return this.#peakTier;
  }

  #snapshot() {
    const tier = this.#tiers[this.#tierIndex];
    return {
      tierIndex: this.#tierIndex,
      tierName: tier.name || `Tier ${this.#tierIndex}`,
      tier,
      peakTier: this.#peakTier,
      points: this.#points[this.#tierIndex],
      consecutiveCorrect: this.#consecutiveCorrect,
    };
  }
}
