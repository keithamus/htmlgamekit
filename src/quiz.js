import GameComponent, { css } from "./component.js";
import {
  GameRoundPassEvent,
  GameRoundFailEvent,
  GameStatUpdateEvent,
} from "./events.js";

function shuffle(nodes) {
  const arr = Array.from(nodes);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * A multiple-choice quiz engine. Reads `<fieldset>` children as question
 * pools (optionally tiered via `data-tier`), randomizes answer order each
 * round, and dispatches pass/fail events based on the selected answer.
 *
 * @summary Multiple-choice quiz game component
 *
 * @fires {GameRoundPassEvent} game-round-pass - Fires when the player selects the correct answer
 * @fires {GameRoundFailEvent} game-round-fail - Fires when the player selects a wrong answer
 * @fires {GameStatUpdateEvent} game-stat-update - Fires to update the "tier" and "streak" stats
 */
export default class GameQuiz extends GameComponent {
  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      position: absolute;
      inset: 0;
      padding: 60px 20px 20px;
    }
  `;

  #tiers = new Map();
  #used = new Map();
  #round = 0;
  #active = false;
  #streak = 0;
  #currentFieldset = null;

  connectedCallback() {
    this.#indexQuestions();
    this.addEventListener("change", (e) => {
      const input = e.target;
      if (!this.#active || input.type !== "radio") return;
      this.#active = false;
      this.#handleAnswer(input);
    }, { signal: this.signal });
    super.connectedCallback();
  }

  effectCallback({ scene, round, difficulty }) {
    const s = scene.get();
    const r = round.get();
    const diff = difficulty.get();
    if (s === "playing" && r !== this.#round) {
      this.#round = r;
      this.#active = true;
      this.#setupRound(diff);
    } else if (s !== "playing" && s !== "between") {
      this.#active = false;
    }
  }

  #indexQuestions() {
    this.#tiers.clear();
    for (const fs of this.querySelectorAll("fieldset")) {
      const tier = parseInt(fs.dataset.tier, 10) || 0;
      let pool = this.#tiers.get(tier);
      if (!pool) {
        pool = [];
        this.#tiers.set(tier, pool);
      }
      pool.push(fs);
      fs.hidden = true;
    }
  }

  #setupRound(diff) {
    if (this.#currentFieldset) {
      this.#currentFieldset.hidden = true;
    }

    const tierIndex = diff?.tierIndex ?? 0;
    const tierName = diff?.tierName;
    if (tierName) {
      this.dispatchEvent(new GameStatUpdateEvent("tier", tierName));
    }

    const fs = this.#pickQuestion(tierIndex);
    if (!fs) return;
    this.#currentFieldset = fs;

    for (const input of fs.querySelectorAll("input[type=radio]")) {
      input.checked = false;
      input.disabled = false;
    }

    for (const label of fs.querySelectorAll("label")) {
      label.classList.remove("correct", "wrong");
    }

    const labels = shuffle(fs.querySelectorAll("label"));
    for (const label of labels) {
      fs.appendChild(label);
    }

    fs.hidden = false;
  }

  #pickQuestion(tierIndex) {
    let pool = null;
    for (let t = tierIndex; t >= 0; t--) {
      pool = this.#tiers.get(t);
      if (pool?.length) break;
    }
    if (!pool?.length) {
      for (const [, p] of this.#tiers) {
        if (p.length) { pool = p; break; }
      }
    }
    if (!pool?.length) return null;

    let used = this.#used.get(pool);
    if (!used || used.size >= pool.length) {
      used = new Set();
      this.#used.set(pool, used);
    }
    const available = pool.filter((_, i) => !used.has(i));
    const idx = Math.floor(Math.random() * available.length);
    const picked = available[idx];
    used.add(pool.indexOf(picked));
    return picked;
  }

  #handleAnswer(input) {
    const fs = input.closest("fieldset");
    if (!fs) return;

    const correct = input.hasAttribute("data-correct");
    const correctInput = fs.querySelector("input[data-correct]");

    for (const inp of fs.querySelectorAll("input[type=radio]")) {
      inp.disabled = true;
    }

    if (correctInput) {
      correctInput.closest("label")?.classList.add("correct");
    }
    if (!correct) {
      input.closest("label")?.classList.add("wrong");
    }

    if (correct) {
      this.#streak++;
      this.dispatchEvent(new GameStatUpdateEvent("streak", this.#streak));
      this.dispatchEvent(new GameRoundPassEvent(1, "Correct!"));
    } else {
      this.#streak = 0;
      this.dispatchEvent(new GameStatUpdateEvent("streak", this.#streak));
      this.dispatchEvent(new GameRoundFailEvent("Wrong!"));
    }
  }
}
