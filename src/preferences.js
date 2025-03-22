import GameComponent, { css, initAttrs } from "./component.js";

export class GamePreferenceChangeEvent extends Event {
  constructor(key, value) {
    super("game-preference-change", { bubbles: true, composed: true });
    this.key = key;
    this.value = value;
  }
}

/**
 * Data element that declares a single user preference. Place inside
 * `<game-preferences>` to define toggles or range sliders. The parent
 * reads these elements to build the preferences UI.
 *
 * @summary Single preference declaration (data element)
 */
export class GamePreference extends HTMLElement {
  static attrs = {
    "key":     { type: "string" },
    "type":    { type: "enum", values: ["toggle", "range"], default: "toggle" },
    "label":   { type: "string?" },
    "default": { type: "string" },
    "min":     { type: "string", default: "0" },
    "max":     { type: "string", default: "100" },
  };

  static define(tag = "game-preference", registry = customElements) {
    initAttrs(this);
    registry.define(tag, this);
  }
}

/**
 * User preferences panel with toggle switches and range sliders.
 * Reads `<game-preference>` children for configuration, persists
 * values to localStorage, and auto-wires the "sound", "volume", and
 * "vibration" keys to the nearest `<game-audio>`.
 *
 * @summary User preferences UI panel
 *
 * @fires {GamePreferenceChangeEvent} game-preference-change - Fires when any preference value changes
 */
export default class GamePreferences extends GameComponent {
  static styles = css`
    :host {
      color: var(--game-text, #eee);
    }

    .prefs {
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding: 24px;
      min-width: 260px;
    }

    h2 {
      margin: 0 0 8px;
      font-size: 18px;
      font-weight: 700;
    }

    .pref-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }

    .pref-label {
      font-size: 15px;
      font-weight: 500;
    }

    /* Toggle switch */
    .toggle {
      position: relative;
      width: 44px;
      height: 24px;
      flex-shrink: 0;
    }
    .toggle input {
      opacity: 0;
      width: 0;
      height: 0;
    }
    .toggle-track {
      position: absolute;
      inset: 0;
      background: rgba(255, 255, 255, 0.15);
      border-radius: 12px;
      cursor: pointer;
      transition: background 0.2s ease;
    }
    .toggle-track::after {
      content: "";
      position: absolute;
      width: 18px;
      height: 18px;
      left: 3px;
      bottom: 3px;
      background: #fff;
      border-radius: 50%;
      transition: transform 0.2s ease;
    }
    .toggle input:checked + .toggle-track {
      background: var(--game-accent, #4c6ef5);
    }
    .toggle input:checked + .toggle-track::after {
      transform: translateX(20px);
    }

    /* Range slider */
    .range {
      flex-shrink: 0;
      width: 100px;
    }
    .range input {
      width: 100%;
      accent-color: var(--game-accent, #4c6ef5);
    }

    .done-btn {
      margin-top: 8px;
      padding: 10px 24px;
      font-size: 15px;
      font-weight: 600;
      border: none;
      border-radius: 6px;
      background: var(--game-btn-bg, #fff);
      color: var(--game-btn-text, #111);
      cursor: pointer;
      font-family: inherit;
    }
  `;

  static template = `<div class="prefs"><h2>Preferences</h2><div class="pref-list"></div><button class="done-btn" type="button">Done</button></div>`;

  #values = {};
  #storageKey = "";

  /** Get a preference value by key. */
  get(key) {
    return this.#values[key];
  }

  connectedCallback() {
    const shell = this.shell;
    const gameId = shell?.gameIdAttr
      || shell?.storageKeyAttr || "";
    this.#storageKey = `${gameId}-preferences`;

    this.#loadDefaults();
    this.#load();
    this.#render();
    this.#applyAll();

    this.shadowRoot.querySelector(".done-btn")
      .addEventListener("click", () => {
        if (this.matches(":popover-open")) this.hidePopover();
      }, { signal: this.signal });
  }

  #loadDefaults() {
    for (const pref of this.querySelectorAll("game-preference")) {
      const key = pref.key;
      if (!key) continue;
      if (pref.type === "toggle") {
        this.#values[key] = pref.default !== "false";
      } else if (pref.type === "range") {
        this.#values[key] = Number(pref.default) || 0;
      } else {
        this.#values[key] = pref.default;
      }
    }
  }

  #render() {
    const list = this.shadowRoot.querySelector(".pref-list");
    list.innerHTML = "";

    for (const pref of this.querySelectorAll("game-preference")) {
      const key = pref.key;
      if (!key) continue;

      const row = document.createElement("div");
      row.className = "pref-row";

      const label = document.createElement("span");
      label.className = "pref-label";
      label.textContent = pref.label ?? pref.key;
      row.appendChild(label);

      if (pref.type === "toggle") {
        const toggle = document.createElement("label");
        toggle.className = "toggle";
        const input = document.createElement("input");
        input.type = "checkbox";
        input.checked = !!this.#values[key];
        input.addEventListener("change", () => {
          this.#values[key] = input.checked;
          this.#save();
          this.#apply(key, input.checked);
        }, { signal: this.signal });
        const track = document.createElement("span");
        track.className = "toggle-track";
        toggle.appendChild(input);
        toggle.appendChild(track);
        row.appendChild(toggle);
      } else if (pref.type === "range") {
        const range = document.createElement("div");
        range.className = "range";
        const input = document.createElement("input");
        input.type = "range";
        input.min = pref.min;
        input.max = pref.max;
        input.value = this.#values[key];
        for (const evt of ["touchstart", "touchmove", "touchend"]) {
          input.addEventListener(evt, (e) => e.stopPropagation(), { signal: this.signal });
        }
        input.addEventListener("input", () => {
          this.#values[key] = Number(input.value);
          this.#save();
          this.#apply(key, Number(input.value));
        }, { signal: this.signal });
        range.appendChild(input);
        row.appendChild(range);
      }

      list.appendChild(row);
    }
  }

  #apply(key, value) {
    this.dispatchEvent(new GamePreferenceChangeEvent(key, value));

    const shell = this.shell;
    if (!shell) return;
    const audio = shell.querySelector("game-audio");

    if (key === "sound" && audio) {
      audio.muted = !value;
    }
    if (key === "volume" && audio) {
      audio.volume = value / 100;
    }
    if (key === "vibration" && audio) {
      audio.vibration = !!value;
    }
  }

  #applyAll() {
    for (const [key, value] of Object.entries(this.#values)) {
      this.#apply(key, value);
    }
  }

  #load() {
    try {
      const raw = localStorage.getItem(this.#storageKey);
      if (raw) {
        const obj = JSON.parse(raw);
        for (const [k, v] of Object.entries(obj)) {
          if (k in this.#values) this.#values[k] = v;
        }
      }
    } catch {}
  }

  #save() {
    try {
      localStorage.setItem(this.#storageKey, JSON.stringify(this.#values));
    } catch {}
  }
}
