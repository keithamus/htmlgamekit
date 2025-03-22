import GameComponent, { css, initAttrs } from "./component.js";
import { matchesConditions } from "./conditions.js";

export class GameTrophyUnlockEvent extends Event {
  constructor(id, name) {
    super("game-trophy-unlock", { bubbles: true, composed: true });
    this.trophyId = id;
    this.trophyName = name;
  }
}

/**
 * Displays a trophy with locked/unlocked visual state. Trophies start
 * locked (greyed out) and unlock automatically on the result scene when
 * their `when-*` conditions are satisfied. Unlocked state is persisted
 * to localStorage via the shell. Clicking shows a tooltip with the
 * description.
 *
 * @summary Achievement trophy with auto-unlock conditions
 *
 * @fires {GameTrophyUnlockEvent} game-trophy-unlock - Fires when the trophy is unlocked for the first time
 *
 * @cssprop [--game-trophy-color=#fbbf24] - Icon color when the trophy is unlocked
 *
 * @csspart icon - The icon container
 * @csspart name - The trophy name label
 * @csspart tooltip - The description tooltip
 *
 * @cssState unlocked - The trophy has been unlocked
 */
export default class GameTrophy extends GameComponent {
  static attrs = {
    "name":        { type: "string" },
    "icon":        { type: "string" },
    "description": { type: "string" },
  };

  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      padding: 10px 6px;
      border-radius: 10px;
      text-align: center;
      transition: background 0.2s ease;
      cursor: default;
      position: relative;
      opacity: 0.3;
      filter: grayscale(1);
    }
    :host(:state(unlocked)) {
      opacity: 1;
      filter: none;
      background: linear-gradient(135deg,
        rgba(254, 249, 195, 0.15),
        rgba(254, 243, 199, 0.08));
    }

    .icon {
      --game-icon-size: 36px;
      color: var(--game-text, #eee);
    }
    :host(:state(unlocked)) .icon {
      color: var(--game-trophy-color, #fbbf24);
    }

    .name {
      font-size: 11px;
      font-weight: 700;
      line-height: 1.2;
      color: var(--game-text, #eee);
    }

    .tooltip {
      display: none;
      position: absolute;
      bottom: calc(100% + 6px);
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.9);
      color: var(--game-text, #eee);
      padding: 6px 10px;
      border-radius: 6px;
      font-size: 12px;
      white-space: nowrap;
      pointer-events: none;
      z-index: 10;
    }
    :host(:hover) .tooltip,
    :host(:state(show-tip)) .tooltip {
      display: block;
    }
  `;

  static template =
    '<div class="icon" part="icon"></div>' +
    '<div class="name" part="name"></div>' +
    '<div class="tooltip" part="tooltip"></div>';

  #states = this.attachInternals().states;

  get trophyId() { return this.id; }

  connectedCallback() {
    const iconEl = this.shadowRoot.querySelector(".icon");
    const nameEl = this.shadowRoot.querySelector(".name");
    const tipEl = this.shadowRoot.querySelector(".tooltip");

    nameEl.textContent = this.name || "";
    tipEl.textContent = this.description || "";

    if (this.icon) {
      iconEl.innerHTML = `<game-icon name="${this.icon}"></game-icon>`;
    }

    const shell = this.shell;
    if (shell && this.id && shell.isTrophyUnlocked(this.id)) {
      this.#states.add("unlocked");
    }

    this.addEventListener("click", () => {
      this.#states.add("show-tip");
      setTimeout(() => this.#states.delete("show-tip"), 1800);
    }, { signal: this.signal });

    super.connectedCallback();
  }

  effectCallback({ scene }) {
    if (!this.#hasConditions()) return;
    if (scene.get() !== "result") return;
    if (this.#states.has("unlocked")) return;
    if (matchesConditions(this, this.shell)) this.unlock();
  }

  unlock() {
    if (this.#states.has("unlocked")) return;
    this.#states.add("unlocked");
    this.dispatchEvent(new GameTrophyUnlockEvent(this.id, this.name));
  }

  get unlocked() {
    return this.#states.has("unlocked");
  }

  #hasConditions() {
    for (const attr of this.attributes) {
      if (attr.name.startsWith("when-")) return true;
    }
    return false;
  }
}
