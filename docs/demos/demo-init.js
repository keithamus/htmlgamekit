import {
  defineAll,
  GameComponent,
  css,
  GameRoundPassEvent,
  GameRoundFailEvent,
  GameStatUpdateEvent,
} from "../../src/index.js";

defineAll();

// A minimal click-target game mechanic for demos
class DemoTarget extends GameComponent {
  static styles = css`
    :host {
      display: block;
      position: absolute;
      inset: 0;
    }
    .target {
      position: absolute;
      width: 50px;
      height: 50px;
      border-radius: 50%;
      background: var(--game-accent, #fff);
      cursor: pointer;
      transition: transform 0.1s ease;
    }
    .target:hover {
      transform: scale(1.1);
    }
  `;
  static template = '<div class="target"></div>';

  #target;
  #round = 0;
  #active = false;

  connectedCallback() {
    this.#target = this.shadowRoot.querySelector(".target");
    this.#target.addEventListener(
      "click",
      () => {
        if (!this.#active) return;
        this.#active = false;
        this.dispatchEvent(new GameRoundPassEvent(1, "Nice!"));
      },
      { signal: this.signal },
    );
    super.connectedCallback();
  }

  effectCallback({ scene, round }) {
    const s = scene.get();
    const r = round.get();
    if (s === "playing" && r !== this.#round) {
      this.#round = r;
      this.#active = true;
      this.#place();
    } else if (s !== "playing") {
      this.#active = false;
    }
  }

  #place() {
    const w = this.offsetWidth || 300;
    const h = this.offsetHeight || 200;
    this.#target.style.left = 25 + Math.random() * (w - 75) + "px";
    this.#target.style.top = 25 + Math.random() * (h - 75) + "px";
  }
}
DemoTarget.define("demo-target");

export {
  GameComponent,
  css,
  GameRoundPassEvent,
  GameRoundFailEvent,
  GameStatUpdateEvent,
};
