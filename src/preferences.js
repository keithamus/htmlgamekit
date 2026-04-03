import GameComponent, { css, initAttrs } from "./component.js";

export class GamePreferenceChangeEvent extends Event {
  constructor(key, value) {
    super("game-preference-change", { bubbles: true, composed: true });
    this.key = key;
    this.value = value;
  }
}

function storageKey(pref) {
  const shell = pref.closest("game-shell");
  const gameId = shell?.gameIdAttr || shell?.storageKeyAttr || "";
  return `${gameId}-preferences`;
}

function loadStored(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveStored(key, obj) {
  try {
    localStorage.setItem(key, JSON.stringify(obj));
  } catch {}
}

function applyToAudio(pref, value) {
  const shell = pref.closest("game-shell");
  if (!shell) return;
  const audio = shell.querySelector("game-audio");
  const key = pref.key;
  if (key === "sound") {
    if (audio) audio.muted = !value;
    if (shell.muted) shell.muted.set(!value);
  }
  if (key === "volume" && audio) audio.volume = value / 100;
  if (key === "vibration" && audio) audio.vibration = !!value;
}

/**
 * Self-sufficient preference element. Owns its current value, persists
 * to localStorage, and applies hardwired audio keys automatically.
 * Works standalone anywhere inside a `<game-shell>`, or as a child of
 * `<game-preferences>` for a full settings panel.
 *
 * Boolean preferences have `default="true"` or `default="false"`.
 * Numeric preferences have a numeric `default` plus `min`/`max`.
 *
 * @summary Single user preference (standalone or inside preferences panel)
 *
 * @fires {GamePreferenceChangeEvent} game-preference-change
 */
export class GamePreference extends HTMLElement {
  static attrs = {
    key: { type: "string" },
    label: { type: "string?" },
    default: { type: "string" },
    min: { type: "string", default: "0" },
    max: { type: "string", default: "100" },
  };

  #value = undefined;
  #connected = false;

  static define(tag = "game-preference", registry = customElements) {
    initAttrs(this);
    registry.define(tag, this);
  }

  get boolean() {
    return this.default === "true" || this.default === "false";
  }

  get #defaultValue() {
    if (this.boolean) return this.default !== "false";
    const n = Number(this.default);
    return Number.isFinite(n) ? n : this.default;
  }

  get value() {
    return this.#value ?? this.#defaultValue;
  }

  connectedCallback() {
    this.#connected = true;
    this.#value = this.#defaultValue;
    const sKey = storageKey(this);
    const stored = loadStored(sKey);
    if (stored && this.key in stored) this.#value = stored[this.key];
    applyToAudio(this, this.#value);
  }

  disconnectedCallback() {
    this.#connected = false;
  }

  set(value) {
    this.#value = value;
    this.#persist();
    applyToAudio(this, value);
    this.dispatchEvent(new GamePreferenceChangeEvent(this.key, value));
  }

  toggle() {
    if (this.boolean) this.set(!this.value);
  }

  #persist() {
    const sKey = storageKey(this);
    const obj = loadStored(sKey) || {};
    obj[this.key] = this.#value;
    saveStored(sKey, obj);
  }
}

/**
 * User preferences panel with toggle switches and range sliders.
 * Reads `<game-preference>` children for configuration and renders
 * controls. Value ownership lives on each `<game-preference>` element;
 * this panel provides the UI chrome.
 *
 * @summary User preferences UI panel
 *
 * @fires {GamePreferenceChangeEvent} game-preference-change - Bubbles from child preferences
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

  get(key) {
    const pref = this.querySelector(`game-preference[key="${key}"]`);
    return pref?.value;
  }

  connectedCallback() {
    super.connectedCallback();
    this.#render();

    this.shadowRoot.querySelector(".done-btn").addEventListener(
      "click",
      () => {
        if (this.matches(":popover-open")) this.hidePopover();
      },
      { signal: this.signal },
    );
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

      if (pref.boolean) {
        const toggle = document.createElement("label");
        toggle.className = "toggle";
        const input = document.createElement("input");
        input.type = "checkbox";
        input.checked = !!pref.value;
        input.addEventListener(
          "change",
          () => pref.set(input.checked),
          { signal: this.signal },
        );
        pref.addEventListener(
          "game-preference-change",
          () => { input.checked = !!pref.value; },
          { signal: this.signal },
        );
        const track = document.createElement("span");
        track.className = "toggle-track";
        toggle.appendChild(input);
        toggle.appendChild(track);
        row.appendChild(toggle);
      } else {
        const range = document.createElement("div");
        range.className = "range";
        const input = document.createElement("input");
        input.type = "range";
        input.min = pref.min;
        input.max = pref.max;
        input.value = pref.value;
        for (const evt of ["touchstart", "touchmove", "touchend"]) {
          input.addEventListener(evt, (e) => e.stopPropagation(), {
            signal: this.signal,
          });
        }
        input.addEventListener(
          "input",
          () => pref.set(Number(input.value)),
          { signal: this.signal },
        );
        pref.addEventListener(
          "game-preference-change",
          () => { input.value = pref.value; },
          { signal: this.signal },
        );
        range.appendChild(input);
        row.appendChild(range);
      }

      list.appendChild(row);
    }
  }
}
