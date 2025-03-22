import GameComponent, { css } from "./component.js";
import { formatValue } from "./format.js";

/**
 * Displays the current round number and a progress bar. Automatically
 * adapts to fixed-round games (showing "N/M") or open-ended games
 * (showing just the round number).
 *
 * @summary Round counter with progress bar
 */
export class GameRoundCounter extends GameComponent {
  static styles = css`
    :host { display: inline-flex; align-items: center; gap: 8px; }
    .val { font-weight: 700; font-variant-numeric: tabular-nums; }
    progress {
      width: clamp(80px, 15vw, 160px); height: 6px; appearance: none; border: none;
      background: rgba(255,255,255,0.15); border-radius: 3px; overflow: hidden;
    }
    progress::-webkit-progress-bar {
      background: rgba(255,255,255,0.15); border-radius: 3px;
    }
    progress::-webkit-progress-value {
      background: var(--game-accent, #fff); border-radius: 3px;
      transition: width 0.3s ease;
    }
    progress::-moz-progress-bar {
      background: var(--game-accent, #fff); border-radius: 3px;
    }
  `;

  static template =
    `<span>Round <span class="val"></span></span>` +
    `<progress value="0" max="1"></progress>`;

  #val = null;
  #bar = null;

  connectedCallback() {
    this.#val = this.shadowRoot.querySelector(".val");
    this.#bar = this.shadowRoot.querySelector("progress");
    super.connectedCallback();
  }

  effectCallback({ round, rounds, difficulty }) {
    const r = round.get();
    const total = rounds.get();
    const diff = difficulty.get();

    if (total) {
      this.#val.textContent = `${r}/${total}`;
      this.#bar.value = r / total;
      this.#bar.style.display = "";
    } else if (diff?.maxTrials) {
      const trial = (diff.trial ?? 0) + 1;
      this.#val.textContent = `${trial}`;
      this.#bar.value = trial / diff.maxTrials;
      this.#bar.style.display = "";
    } else {
      this.#val.textContent = `${r}`;
      this.#bar.style.display = "none";
    }
  }
}

/**
 * Displays a single game statistic from the shell's stats signal.
 * The label is provided via the default slot; the value is rendered
 * from `stats[key]` with optional formatting.
 *
 * @summary Single stat display (e.g. streak, tier)
 *
 * @slot - Label text for the stat
 */
export class GameStat extends GameComponent {
  static attrs = {
    "key":    { type: "string" },
    "format": { type: "string", default: "plain" },
  };

  static styles = css`
    :host { display: inline-flex; align-items: center; gap: 4px; }
    .val { font-weight: 700; font-variant-numeric: tabular-nums; }
  `;

  static template = `<span class="label"><slot></slot></span> <span class="val"></span>`;

  #valEl = null;

  connectedCallback() {
    this.#valEl = this.shadowRoot.querySelector(".val");
    super.connectedCallback();
  }

  effectCallback({ stats }) {
    const raw = stats.get()[this.key];
    if (raw == null) return;
    this.#valEl.textContent = formatValue(raw, this.format);
  }
}
