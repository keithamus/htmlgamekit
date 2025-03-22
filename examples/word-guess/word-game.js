import "../../src/auto.js";
import {
  GameComponent,
  css,
  GameRoundPassEvent,
  GameRoundFailEvent,
  gameWordContext,
} from "../../src/index.js";

class WordGame extends GameComponent {
  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      position: absolute;
      inset: 0;
      gap: 8px;
      padding: 60px 20px 20px;
    }
    .board { display: flex; flex-direction: column; gap: 6px; }
  `;

  static template = `<div class="board"></div>`;

  #board;
  #target = "";
  #row = 0;
  #round = 0;
  #rows = [];
  #done = false;

  connectedCallback() {
    this.#board = this.shadowRoot.querySelector(".board");
    this.subscribe(gameWordContext, (word) => {
      if (word) this.#target = word;
    });
    this.addEventListener("game-tile-submit", (e) => {
      if (this.#done) return;
      this.#guess(e.value.toLowerCase());
    }, { signal: this.signal });
    super.connectedCallback();
  }

  effectCallback({ scene, round }) {
    const s = scene.get();
    const r = round.get();
    if (s === "playing" && r !== this.#round) {
      this.#round = r;
      this.#newBoard();
    } else if (s !== "playing" && s !== "between") {
      this.#done = true;
    }
  }

  #newBoard() {
    this.#row = 0;
    this.#done = false;
    this.#board.innerHTML = "";
    this.#rows = [];
    for (let i = 0; i < 6; i++) {
      const tile = document.createElement("game-tile-input");
      tile.setAttribute("length", "5");
      if (i > 0) tile.disabled = true;
      this.#board.appendChild(tile);
      this.#rows.push(tile);
    }
    this.#rows[0].focus();
  }

  #guess(word) {
    if (word.length !== 5 || !this.#target) return;
    const row = this.#rows[this.#row];
    if (!row) return;

    const target = this.#target.split("");
    const states = Array(5).fill("wrong");
    const remaining = [...target];

    for (let i = 0; i < 5; i++) {
      if (word[i] === target[i]) {
        states[i] = "good";
        remaining[remaining.indexOf(word[i])] = null;
      }
    }
    for (let i = 0; i < 5; i++) {
      if (states[i] !== "wrong") continue;
      const idx = remaining.indexOf(word[i]);
      if (idx !== -1) {
        states[i] = "close";
        remaining[idx] = null;
      }
    }

    row.showResult(word.split(""), states);
    row.disabled = true;

    if (word === this.#target) {
      this.#done = true;
      this.dispatchEvent(new GameRoundPassEvent(6 - this.#row, `Got it in ${this.#row + 1}!`));
      return;
    }

    this.#row++;
    if (this.#row >= 6) {
      this.#done = true;
      this.dispatchEvent(new GameRoundFailEvent(`It was ${this.#target.toUpperCase()}`));
      return;
    }

    this.#rows[this.#row].disabled = false;
    this.#rows[this.#row].focus();
  }
}

WordGame.define("word-game");
