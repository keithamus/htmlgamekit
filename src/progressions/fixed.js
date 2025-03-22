export default class FixedProgression {
  #rounds;
  #params;

  constructor({ rounds, params = {} } = {}) {
    this.#rounds = rounds;
    this.#params = params;
  }

  init(rounds) {
    const r = this.#rounds || rounds;
    return { ...this.#interpolate(0, r) };
  }

  afterRound(state) {
    const rounds = this.#rounds || state.rounds;
    const t = rounds > 1 ? state.round / (rounds - 1) : 0;
    return {
      difficulty: this.#interpolate(t, rounds),
      done: state.round >= rounds,
    };
  }

  #interpolate(t, rounds) {
    const clamped = Number.isFinite(t) ? Math.max(0, Math.min(1, t)) : 0;
    const out = { round: Math.round(clamped * Math.max(0, rounds - 1)), rounds };
    for (const [key, cfg] of Object.entries(this.#params)) {
      if (typeof cfg === "object" && "start" in cfg && "end" in cfg) {
        out[key] = cfg.start + (cfg.end - cfg.start) * clamped;
      } else {
        out[key] = cfg;
      }
    }
    return out;
  }
}
