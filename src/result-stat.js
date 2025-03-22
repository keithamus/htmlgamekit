import GameComponent, { css } from "./component.js";
import { formatValue } from "./format.js";

/**
 * Result screen score display with gradient text. Supports animated
 * count-up, custom formatting, and score-threshold CSS states for
 * conditional styling. Use `score-*` attributes to define named
 * thresholds (e.g. `score-gold="8"` adds `:state(gold)` when score >= 8).
 *
 * @summary Animated result score display
 *
 * @csspart label - The stat label text
 * @csspart value - The stat value (score) display
 *
 * @cssprop [--game-result-gradient-from=#6ee7b7] - Start color of the score gradient
 * @cssprop [--game-result-gradient-to=#3b82f6] - End color of the score gradient
 *
 * @cssState in-range - Score is within the min-score/max-score range
 * @cssState perfect - Score equals the total number of rounds (perfect game)
 */
export default class GameResultStat extends GameComponent {
  static attrs = {
    label: { type: "string" },
    format: { type: "string", default: "plain" },
    animate: { type: "string?" },
    "min-score": { type: "string?" },
    "max-score": { type: "string?" },
  };

  static styles = css`
    :host {
      display: block;
      text-align: center;
    }
    .label {
      font-size: clamp(14px, 2vw, 18px);
      opacity: 0.6;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      margin-bottom: 4px;
    }
    .value {
      font-size: clamp(48px, 8vw, 96px);
      font-weight: 900;
      letter-spacing: -0.03em;
      margin: 16px 0;
      background: linear-gradient(
        135deg,
        var(--game-result-gradient-from, #6ee7b7),
        var(--game-result-gradient-to, #3b82f6)
      );
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
  `;

  static template =
    `<div class="label" part="label"></div>` +
    `<div class="value" part="value"></div>`;

  #formatFn = null;
  #states = this.attachInternals().states;
  #thresholds = [];

  set formatScore(fn) {
    this.#formatFn = fn;
  }

  attributeChanged(name) {
    if (name === "label") {
      const el = this.shadowRoot?.querySelector(".label");
      if (el) el.textContent = this.label;
    }
  }

  #valueEl = null;

  connectedCallback() {
    this.#parseThresholds();
    this.shadowRoot.querySelector(".label").textContent = this.label;
    this.#valueEl = this.shadowRoot.querySelector(".value");
    super.connectedCallback();
  }

  effectCallback({ scene, score, formatScoreSignal }) {
    if (scene.get() !== "result") return;
    const s = score.get();
    const fmt = this.#formatFn || formatScoreSignal.get();

    this.#applyScoreStates(s);

    if (this.animate !== null) {
      this.#animateCountUp(s, this.#valueEl, fmt);
    } else if (fmt) {
      this.#valueEl.textContent = fmt(s);
    } else {
      this.#valueEl.textContent = formatValue(s, this.format);
    }
  }

  #parseThresholds() {
    this.#thresholds = [];
    for (const attr of this.attributes) {
      if (attr.name.startsWith("score-")) {
        const state = attr.name.slice(6);
        const value = Number(attr.value);
        if (!Number.isNaN(value)) {
          this.#thresholds.push({ state, value });
        }
      }
    }
    this.#thresholds.sort((a, b) => b.value - a.value);
  }

  #applyScoreStates(score) {
    for (const { state } of this.#thresholds) {
      this.#states.delete(state);
    }

    const min = this.minScore !== null ? Number(this.minScore) : -Infinity;
    const max = this.maxScore !== null ? Number(this.maxScore) : Infinity;
    if (score >= min && score <= max) this.#states.add("in-range");
    else this.#states.delete("in-range");

    for (const { state, value } of this.#thresholds) {
      if (score >= value) {
        this.#states.add(state);
        break;
      }
    }

    const rounds = this.shell?.roundsAttr || 0;
    this.#states.delete("perfect");
    if (rounds && score === rounds) {
      this.#states.add("perfect");
    }
  }

  #raf = 0;

  disconnectedCallback() {
    super.disconnectedCallback();
    cancelAnimationFrame(this.#raf);
  }

  #animateCountUp(target, el, fmt) {
    cancelAnimationFrame(this.#raf);
    const duration = Number(this.animate) || 800;
    const start = performance.now();
    const tick = () => {
      const elapsed = performance.now() - start;
      const progress = Math.min(1, elapsed / duration);
      const eased = 1 - (1 - progress) * (1 - progress);
      const current = Math.round(target * eased);
      el.textContent = fmt ? fmt(current) : String(current);
      if (progress < 1) this.#raf = requestAnimationFrame(tick);
    };
    this.#raf = requestAnimationFrame(tick);
  }
}
