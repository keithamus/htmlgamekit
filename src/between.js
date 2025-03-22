import GameComponent, { css } from "./component.js";

/**
 * Between-rounds overlay that displays feedback, scores, and round
 * progress. Populates descendant elements via `data-between` attribute
 * values: "feedback", "round", "score", "round-score", "countdown".
 *
 * The last round score is also reflected as a CSS custom state based on
 * its value relative to the shell's `score-order`:
 * - For `asc` (lower-is-better): `:state(good)` when in the best tercile,
 *   `:state(bad)` in the worst, `:state(ok)` in between.
 * - For `desc` (higher-is-better): reversed.
 * The thresholds are derived from the progression's score range or, when
 * unavailable, from `score-good` and `score-bad` attributes (raw score units).
 *
 * @summary Between-rounds feedback overlay
 *
 * @attr {number} [score-good] - Raw score threshold below which (asc) the round is "good"
 * @attr {number} [score-bad] - Raw score threshold above which (asc) the round is "bad"
 *
 * @cssState good - The last round score was in the "good" tier
 * @cssState ok - The last round score was in the "ok" tier
 * @cssState bad - The last round score was in the "bad" tier
 *
 * @cssprop [--game-between-bg=#111] - Background color of the overlay
 */
export default class GameBetween extends GameComponent {
  static attrs = {
    "score-good": { type: "number?" },
    "score-bad": { type: "number?" },
  };
  static styles = css`
    :host {
      position: fixed;
      inset: 0;
      z-index: 30;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      background: var(--game-between-bg, #111);
      text-align: center;
      padding: 40px;
      color: var(--game-text, #eee);
    }
  `;

  #states = this.attachInternals().states;
  #countdownInterval = 0;

  effectCallback({ scene }) {
    if (scene.get() === "between") {
      this.#populate(this.shell);
      this.#startCountdown();
    } else {
      this.#stopCountdown();
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.#stopCountdown();
  }

  #startCountdown() {
    this.#stopCountdown();
    const els = this.querySelectorAll("[data-between=countdown]");
    if (!els.length) return;
    const shell = this.shell;
    const rawDelay = shell?.betweenDelayAttr;
    const delay = rawDelay === "manual" ? 0 : Number(rawDelay) || 0;
    if (!delay) return;
    let remaining = Math.ceil(delay / 1000);
    for (const el of els) el.textContent = remaining;
    this.#countdownInterval = setInterval(() => {
      remaining--;
      if (remaining <= 0) {
        this.#stopCountdown();
        for (const el of els) el.textContent = "";
        return;
      }
      for (const el of els) el.textContent = remaining;
    }, 1000);
  }

  #stopCountdown() {
    clearInterval(this.#countdownInterval);
    this.#countdownInterval = 0;
  }

  #populate(s) {
    const fmt = s.formatScoreSignal.get();
    const score = s.score.get();
    const round = s.round.get();
    const rounds = s.rounds.get();
    const lastFeedback = s.lastFeedback.get();
    const roundScoresArr = s.roundScores.get();

    for (const el of this.querySelectorAll("[data-between=feedback]")) {
      el.textContent = lastFeedback || "";
    }

    for (const el of this.querySelectorAll("[data-between=round]")) {
      el.textContent = rounds ? `${round} / ${rounds}` : String(round);
    }

    for (const el of this.querySelectorAll("[data-between=score]")) {
      el.textContent = fmt ? fmt(score) : String(score);
    }

    const lastScore = roundScoresArr?.at(-1) ?? null;
    for (const el of this.querySelectorAll("[data-between=round-score]")) {
      el.textContent =
        lastScore != null ? (fmt ? fmt(lastScore) : String(lastScore)) : "";
    }

    this.#states.delete("good");
    this.#states.delete("ok");
    this.#states.delete("bad");
    if (lastScore != null) {
      const good = this.scoreGood;
      const bad = this.scoreBad;
      if (good != null && bad != null) {
        const asc = s.scoreOrder.get() !== "desc";
        let tier;
        if (asc) {
          tier = lastScore < good ? "good" : lastScore >= bad ? "bad" : "ok";
        } else {
          tier = lastScore > good ? "good" : lastScore <= bad ? "bad" : "ok";
        }
        this.#states.add(tier);
      }
    }
  }
}
