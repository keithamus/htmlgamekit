import "../../src/auto.js";
import {
  GameComponent,
  css,
  GameRoundPassEvent,
  GameRoundFailEvent,
  GameStatUpdateEvent,
} from "../../src/index.js";

class ReactionGame extends GameComponent {
  static styles = css`
    :host {
      display: flex;
      align-items: center;
      justify-content: center;
      position: absolute;
      inset: 0;
      cursor: pointer;
      transition: background 0.15s ease;
    }
    .prompt {
      font-size: clamp(20px, 3vw, 32px);
      font-weight: 700;
      pointer-events: none;
      user-select: none;
    }
  `;

  static template = `<div class="prompt"></div>`;

  #prompt;
  #round = 0;
  #active = false;
  #ready = false;
  #timer = 0;
  #goTime = 0;
  #best = Infinity;
  #lastDelay = 2000;

  connectedCallback() {
    this.#prompt = this.shadowRoot.querySelector(".prompt");
    this.addEventListener(
      "click",
      () => {
        if (!this.#active) return;

        if (!this.#ready) {
          clearTimeout(this.#timer);
          this.style.background = "#dc2626";
          this.#prompt.textContent = "Too early!";
          this.#active = false;
          this.dispatchEvent(new GameRoundFailEvent("Too early!", true));
          setTimeout(() => {
            if (this.#round) this.#startRound({ delay: this.#lastDelay });
          }, 1000);
          return;
        }

        this.#active = false;
        this.#ready = false;
        const elapsed = Math.round(performance.now() - this.#goTime);
        if (elapsed < this.#best) this.#best = elapsed;
        this.dispatchEvent(new GameStatUpdateEvent("best", this.#best));
        this.dispatchEvent(new GameRoundPassEvent(elapsed, `${elapsed}ms`));
        this.style.background = "";
        this.#prompt.textContent = `${elapsed}ms`;
      },
      { signal: this.signal },
    );
    super.connectedCallback();
  }

  effectCallback({ scene, round, difficulty }) {
    const s = scene.get();
    const r = round.get();
    const diff = difficulty.get();
    if (s === "playing" && r !== this.#round) {
      this.#round = r;
      this.#startRound(diff);
    } else if (s !== "playing" && s !== "between") {
      this.#active = false;
      this.#ready = false;
      clearTimeout(this.#timer);
      this.style.background = "";
      this.#prompt.textContent = "";
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    clearTimeout(this.#timer);
  }

  #startRound(diff) {
    clearTimeout(this.#timer);
    this.#active = true;
    this.#ready = false;
    this.style.background = "#dc2626";
    this.#prompt.textContent = "Wait for green...";

    const delay = diff?.delay ?? 2000 + Math.random() * 2000;
    this.#lastDelay = delay;

    this.#timer = setTimeout(() => {
      if (!this.#active) return;
      this.#ready = true;
      this.#goTime = performance.now();
      this.style.background = "#16a34a";
      this.#prompt.textContent = "Click!";
    }, delay);
  }
}

ReactionGame.define("reaction-game");
