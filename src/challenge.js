import GameComponent, { css } from "./component.js";

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

const TAUNTS = [
  "Time to shame them.",
  "Prove them wrong.",
  "That's the bar. Clear it.",
  "Surely you can beat that.",
  "Show them what impressive looks like.",
  "They had the audacity to share it. Destroy their confidence.",
  "No mercy.",
  "Beat it or live in their shadow forever.",
  "They're watching. Probably.",
  "Lower is better. No pressure.",
  "That's the bar. Limbo under it.",
  "They set the pace. You set the standard.",
  "An insulting score. You can do better.",
];

/**
 * Challenge mode display. Shows the opponent's score with a random
 * taunt when a challenge result is decoded from the URL. Reads the
 * `challenge` signal from the shell and changes the start button
 * text to "Challenge accepted".
 *
 * @summary Challenge mode opponent score display
 *
 * @cssprop [--game-result-gradient-from=#6ee7b7] - Start color of the score gradient
 * @cssprop [--game-result-gradient-to=#3b82f6] - End color of the score gradient
 *
 * @csspart label - The "Their score" heading
 * @csspart score - The opponent's formatted score
 * @csspart taunt - The randomly selected taunt text
 */
export default class GameChallenge extends GameComponent {
  static styles = css`
    :host { display: none; margin-bottom: 12px; text-align: center; }
    :host(:state(active)) { display: block; }
    .label {
      font-size: clamp(14px, 2vw, 18px); opacity: 0.6; font-weight: 400;
      text-transform: uppercase; letter-spacing: 0.08em;
    }
    .score {
      font-size: clamp(48px, 8vw, 96px); font-weight: 900;
      letter-spacing: -0.03em; margin: 4px 0 8px;
      background: linear-gradient(135deg,
        var(--game-result-gradient-from, #6ee7b7),
        var(--game-result-gradient-to, #3b82f6));
      -webkit-background-clip: text; -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .taunt { font-size: clamp(14px, 2vw, 20px); font-weight: 600; }
  `;

  static template =
    `<div class="label" part="label">Their score</div>` +
    `<div class="score" part="score"></div>` +
    `<p class="taunt" part="taunt"></p>`;

  #formatScoreFn = null;
  #states = this.attachInternals().states;

  set formatScore(fn) { this.#formatScoreFn = fn; }

  #scoreEl = null;
  #tauntEl = null;

  connectedCallback() {
    this.#scoreEl = this.shadowRoot.querySelector(".score");
    this.#tauntEl = this.shadowRoot.querySelector(".taunt");
    super.connectedCallback();
  }

  effectCallback({ challenge, formatScoreSignal }) {
    const ch = challenge.get();
    if (!ch) return;
    this.#states.add("active");
    const fmt = formatScoreSignal.get();
    const score = this.#formatScoreFn ? this.#formatScoreFn(ch)
      : fmt ? fmt(ch.score ?? ch)
      : ch.score ?? ch;
    this.#scoreEl.textContent = score;
    this.#tauntEl.textContent = pick(TAUNTS);
    const startBtn = this.closest("[data-overlay]")
      ?.querySelector('button[command="--start"]');
    if (startBtn) startBtn.textContent = "Challenge accepted";
  }
}
