import "../../src/auto.js";
import {
  GameComponent,
  css,
  GameRoundPassEvent,
  GameStatUpdateEvent,
} from "../../src/index.js";

class ClickTarget extends GameComponent {
  static styles = css`
    :host {
      display: block;
      position: absolute;
      inset: 0;
    }
    .target {
      position: absolute;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: var(--game-accent, #fff);
      cursor: pointer;
      transition: transform 0.1s ease;
    }
    .target:hover { transform: scale(1.1); }
    .target:active { transform: scale(0.95); }
  `;

  static template = `<div class="target"></div>`;

  #target;
  #round = 0;
  #startTime = 0;
  #active = false;

  connectedCallback() {
    this.#target = this.shadowRoot.querySelector(".target");
    this.#target.addEventListener("click", () => {
      if (!this.#active) return;
      this.#active = false;
      const elapsed = Math.round(performance.now() - this.#startTime);
      this.dispatchEvent(new GameStatUpdateEvent("time", elapsed));
      this.dispatchEvent(new GameRoundPassEvent(elapsed, `${elapsed}ms`));
    });
    super.connectedCallback();
  }

  effectCallback({ scene, round }) {
    const s = scene.get();
    const r = round.get();
    if (s === "playing" && r !== this.#round) {
      this.#round = r;
      this.#active = true;
      this.#place();
      this.#startTime = performance.now();
    } else if (s !== "playing") {
      this.#active = false;
    }
  }

  #place() {
    const pad = 60;
    const hud = 50;
    const x = pad + Math.random() * (window.innerWidth - pad * 2);
    const y = hud + pad + Math.random() * (window.innerHeight - hud - pad * 2);
    this.#target.style.left = `${x - 30}px`;
    this.#target.style.top = `${y - 30}px`;
  }
}

ClickTarget.define("click-target");
