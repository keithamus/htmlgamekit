import GameComponent, { css } from "./component.js";
import { GameTileInputEvent, GameTileSubmitEvent } from "./events.js";

/**
 * Wordle-style letter tile input. Renders a row of square tiles
 * backed by a hidden text input. Supports marking tiles with states
 * (good, close, wrong, used, bad) and displaying results.
 *
 * @summary Letter tile input grid (Wordle-style)
 *
 * @fires {GameTileInputEvent} game-tile-input - Fires on each character input with the current value and cursor position
 * @fires {GameTileSubmitEvent} game-tile-submit - Fires when Enter is pressed with a complete word
 *
 * @cssprop [--game-tile-gap=6px] - Gap between tiles
 * @cssprop [--game-tile-font=monospace] - Font family for tile text
 * @cssprop [--game-tile-size=40px] - Width and height of each tile
 * @cssprop [--game-tile-radius=6px] - Border radius of each tile
 * @cssprop [--game-tile-border=rgba(255, 255, 255, 0.3)] - Border color of empty tiles
 * @cssprop [--game-tile-bg=rgba(255, 255, 255, 0.05)] - Background color of empty tiles
 * @cssprop [--game-tile-text=var(--game-text, #eee)] - Text color of tiles
 * @cssprop [--game-tile-filled-border=rgba(255, 255, 255, 0.5)] - Border color of filled tiles
 * @cssprop [--game-tile-filled-bg=rgba(255, 255, 255, 0.1)] - Background color of filled tiles
 * @cssprop [--game-tile-cursor=#0b7285] - Color of the cursor tile
 * @cssprop [--game-tile-used=#4c6ef5] - Color for tiles marked as "used"
 * @cssprop [--game-tile-bad=#e03131] - Color for tiles marked as "bad"
 * @cssprop [--game-tile-good=#2b8a3e] - Color for tiles marked as "good" (correct position)
 * @cssprop [--game-tile-close=#e67700] - Color for tiles marked as "close" (wrong position)
 * @cssprop [--game-tile-wrong=#c92a2a] - Color for tiles marked as "wrong"
 *
 * When used as a standalone element directly inside `<game-shell>`, the
 * component automatically enables/disables itself based on the scene and
 * clears and focuses on each new round. Set the `manual` attribute to
 * suppress this behaviour when managing multiple rows yourself (e.g. a
 * Wordle-style board where you control which row is active).
 */
export default class GameTileInput extends GameComponent {
  static attrs = {
    length: { type: "long", default: 5 },
    disabled: { type: "boolean" },
    value: { type: "string" },
    manual: { type: "boolean" },
  };

  static styles = css`
    :host {
      display: inline-block;
      font-family: var(--game-tile-font, monospace);
      user-select: none;
      -webkit-user-select: none;
    }
    :host([disabled]) {
      pointer-events: none;
      opacity: 0.5;
    }

    .tiles {
      display: inline-flex;
      gap: var(--game-tile-gap, 6px);
    }

    .tile {
      display: flex;
      align-items: center;
      justify-content: center;
      width: var(--game-tile-size, 40px);
      aspect-ratio: 1;
      border-radius: var(--game-tile-radius, 6px);
      border: 2px solid var(--game-tile-border, rgba(255, 255, 255, 0.3));
      background: var(--game-tile-bg, rgba(255, 255, 255, 0.05));
      color: var(--game-tile-text, var(--game-text, #eee));
      font-size: calc(var(--game-tile-size, 40px) * 0.55);
      font-weight: 700;
      text-transform: uppercase;
      transition:
        background 0.1s ease,
        border-color 0.1s ease;
      box-shadow: inset 0 -2px 0 rgba(0, 0, 0, 0.2);
    }
    .tile.filled {
      border-color: var(--game-tile-filled-border, rgba(255, 255, 255, 0.5));
      background: var(--game-tile-filled-bg, rgba(255, 255, 255, 0.1));
    }
    .tile.cursor {
      border-color: var(--game-tile-cursor, #0b7285);
      background: var(--game-tile-cursor, #0b7285);
      animation: tile-blink 1s linear infinite;
    }
    .tile.used {
      border-color: var(--game-tile-used, #4c6ef5);
      color: var(--game-tile-used, #4c6ef5);
    }
    .tile.bad {
      border-color: var(--game-tile-bad, #e03131);
      color: var(--game-tile-bad, #e03131);
    }
    .tile.good {
      border-color: var(--game-tile-good, #2b8a3e);
      background: var(--game-tile-good, #2b8a3e);
      color: #fff;
    }
    .tile.close {
      border-color: var(--game-tile-close, #e67700);
      background: var(--game-tile-close, #e67700);
      color: #fff;
    }
    .tile.wrong {
      border-color: var(--game-tile-wrong, #c92a2a);
      background: var(--game-tile-wrong, #c92a2a);
      color: #fff;
    }

    @keyframes tile-blink {
      50% {
        background: var(--game-tile-border, rgba(255, 255, 255, 0.3));
      }
    }

    input {
      position: absolute;
      width: 1px;
      height: 1px;
      opacity: 0;
      pointer-events: none;
    }
  `;

  static template = `<input type="text" autocomplete="off" autocorrect="off"
    autocapitalize="off" spellcheck="false"><div class="tiles"></div>`;

  #input;
  #tilesEl;
  #tiles = [];
  #marks = new Map();

  get value() {
    return this.#input?.value || "";
  }
  set value(v) {
    if (this.#input) this.#input.value = v;
    this.#render();
  }

  connectedCallback() {
    this.#input = this.shadowRoot.querySelector("input");
    this.#tilesEl = this.shadowRoot.querySelector(".tiles");
    this.#buildTiles();

    this.#input.maxLength = Math.max(0, this.length);

    this.#input.addEventListener(
      "input",
      () => {
        this.#input.value = this.#input.value.replace(/[^a-zA-Z]/g, "");
        this.#render();
        this.dispatchEvent(
          new GameTileInputEvent(
            this.#input.value,
            this.#input.value.length - 1,
          ),
        );
      },
      { signal: this.signal },
    );

    this.#input.addEventListener(
      "keydown",
      (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          if (this.#input.value.length === this.length) {
            this.dispatchEvent(new GameTileSubmitEvent(this.#input.value));
          }
        }
      },
      { signal: this.signal },
    );

    this.addEventListener(
      "click",
      () => {
        if (!this.disabled) this.#input.focus();
      },
      { signal: this.signal },
    );

    super.connectedCallback();
  }

  effectCallback({ scene, round }) {
    if (this.manual) return;
    const playing = scene.get() === "playing";
    this.disabled = !playing;
    if (playing && round.get() > 0) {
      this.#input.value = "";
      this.#render();
      this.#input.focus();
    }
  }

  attributeChanged(name) {
    if (name === "length") this.#buildTiles();
    if (name === "disabled") {
      if (this.#input) this.#input.disabled = this.disabled;
    }
    if (name === "value" && this.#input) {
      this.#input.value = this.getAttribute("value") || "";
      this.#render();
    }
  }

  mark(position, letter, state) {
    this.#marks.set(`${position}:${letter.toLowerCase()}`, state);
  }

  clearMarks() {
    this.#marks.clear();
  }

  focus() {
    this.#input?.focus();
  }

  clear() {
    if (this.#input) this.#input.value = "";
    this.#render();
  }

  setTile(index, letter, state) {
    const tile = this.#tiles[index];
    if (!tile) return;
    tile.textContent = letter || "";
    tile.className = "tile";
    if (state) tile.classList.add(state);
    if (letter) tile.classList.add("filled");
  }

  showResult(letters, states) {
    for (let i = 0; i < this.length; i++) {
      this.setTile(i, letters[i] || "", states[i] || "");
    }
  }

  #buildTiles() {
    if (!this.#tilesEl) return;
    const len = Math.max(0, this.length);
    this.#tilesEl.innerHTML = "";
    this.#tiles = [];
    for (let i = 0; i < len; i++) {
      const tile = document.createElement("span");
      tile.className = "tile";
      this.#tilesEl.appendChild(tile);
      this.#tiles.push(tile);
    }
    if (this.#input) this.#input.maxLength = len;
    this.#render();
  }

  #render() {
    const val = this.#input?.value || "";
    const len = this.length;
    for (let i = 0; i < len; i++) {
      const tile = this.#tiles[i];
      if (!tile) continue;
      const ch = val[i] || "";
      tile.textContent = ch;
      tile.className = "tile";
      if (ch) {
        tile.classList.add("filled");
        const markKey = `${i}:${ch.toLowerCase()}`;
        const markState = this.#marks.get(markKey);
        if (markState) tile.classList.add(markState);
      } else if (i === val.length && !this.disabled) {
        tile.classList.add("cursor");
      }
    }
  }
}
