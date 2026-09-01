import {
  defineAll,
  GameComponent,
  GameRoundPassEvent,
  GameRoundFailEvent,
  GameStatUpdateEvent,
} from "../../src/index.js";

defineAll();

// Win patterns: indices into the 9-cell board
const WIN_LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8], // rows
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8], // cols
  [0, 4, 8],
  [2, 4, 6], // diagonals
];

/**
 * Noughts and crosses board component.
 * Reads the match element from the shell, listens for game-peer-connection-open,
 * game-peer-connection-close, and game-peer-connection-message to drive game state.
 *
 * @summary 3x3 noughts-and-crosses board
 * @fires {GameRoundPassEvent} game-round-pass - Fires with 1 for a win, 0 for a draw
 * @fires {GameRoundFailEvent} game-round-fail - Fires when the opponent completes a line
 * @fires {GameStatUpdateEvent} game-stat-update - Fires to update the "symbol" stat
 */
class NoughtsAndCrosses extends GameComponent {
  static template = null;

  static define(tag = "noughts-and-crosses", registry = customElements) {
    super.define(tag, registry);
  }

  #cells = Array(9).fill(null); // null | "X" | "O"
  #mySymbol = null; // "X" or "O" (set when the match opens)
  #myTurn = false;
  #done = false;

  get #match() {
    return this.shell?.querySelector("game-peer-connection");
  }
  get #buttons() {
    return this.querySelectorAll("ol button");
  }
  get #status() {
    return this.querySelector("[data-status]");
  }

  connectedCallback() {
    super.connectedCallback();

    this.innerHTML = `
      <ol></ol>
      <p data-status></p>
    `;
    this.#buildBoard();

    // Listen on the shell: these events bubble up from the sibling
    // <game-peer-connection> element.
    this.shell.addEventListener(
      "game-peer-connection-open",
      (e) => this.#onMatchOpen(e.peerId),
      { signal: this.signal },
    );
    this.shell.addEventListener(
      "game-peer-connection-close",
      (e) => this.#onMatchClose(e),
      { signal: this.signal },
    );
    this.shell.addEventListener(
      "game-peer-connection-message",
      (e) => this.#onMessage(e),
      { signal: this.signal },
    );
  }

  // Reads only the scene signal: the symbols come from the connection, which is
  // already open by the time the first game starts and stays open across a
  // rematch, so they are captured in #onMatchOpen instead.
  effectCallback({ scene }) {
    if (scene.get() !== "playing") return;
    this.#reset();
    if (this.#mySymbol) this.#beginGame();
  }

  #buildBoard() {
    const ol = this.querySelector("ol");
    ol.innerHTML = "";
    for (let i = 0; i < 9; i++) {
      const li = document.createElement("li");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.disabled = true;
      btn.dataset.cell = i;
      btn.addEventListener("click", () => this.#onCellClick(i), {
        signal: this.signal,
      });
      li.appendChild(btn);
      ol.appendChild(li);
    }
  }

  #reset() {
    this.#cells = Array(9).fill(null);
    this.#myTurn = false;
    this.#done = false;
    this.#buildBoard();
    this.#setStatus("Waiting for connection...");
  }

  #onMatchOpen(peerId) {
    const myId = this.#match?.localPlayerId;
    if (!myId || !peerId) return;

    // Lower ID plays X and goes first
    this.#mySymbol = myId < peerId ? "X" : "O";
    if (this.shell.scene.get() === "playing") this.#beginGame();
  }

  #beginGame() {
    this.#myTurn = this.#mySymbol === "X";
    this.#done = false;

    this.dispatchEvent(new GameStatUpdateEvent("symbol", this.#mySymbol));
    this.#setStatus(
      this.#myTurn ? `Your turn (${this.#mySymbol})` : "Opponent's turn",
    );
    this.#updateButtons();
  }

  #onMatchClose(e) {
    // The unreliable channel closing on its own does not end the game.
    if (e.reason !== "closed" || this.#done) return;
    this.#done = true;
    this.#setStatus("Opponent disconnected.");
    this.#updateButtons();
  }

  #onMessage(e) {
    const data = e.data;
    if (this.#done || !this.#mySymbol || typeof data?.cell !== "number") return;

    const opponentSymbol = this.#mySymbol === "X" ? "O" : "X";
    this.#placeSymbol(data.cell, opponentSymbol);
    if (this.#done) return;

    this.#myTurn = true;
    this.#updateButtons();
    this.#setStatus(`Your turn (${this.#mySymbol})`);
  }

  #onCellClick(index) {
    if (!this.#myTurn || this.#done || this.#cells[index]) return;

    this.#placeSymbol(index, this.#mySymbol);
    this.#match?.send({ cell: index });
    if (this.#done) return;

    this.#myTurn = false;
    this.#updateButtons();
    this.#setStatus("Opponent's turn");
  }

  #placeSymbol(index, symbol) {
    this.#cells[index] = symbol;
    const btn = this.#buttons[index];
    btn.textContent = symbol;

    const winLine = this.#checkWin(symbol);
    if (winLine) {
      this.#done = true;
      const items = this.querySelectorAll("ol li");
      for (const i of winLine) items[i].dataset.winner = "";
      this.#updateButtons();

      const won = symbol === this.#mySymbol;
      this.#setStatus(won ? "You win!" : "You lose.");
      this.dispatchEvent(
        won
          ? new GameRoundPassEvent(1, "You win!")
          : new GameRoundFailEvent("You lose."),
      );
      return;
    }

    if (this.#cells.every(Boolean)) {
      this.#done = true;
      this.#updateButtons();
      this.#setStatus("Draw!");
      // A draw is a pass worth 0, which the result overlay tells apart from a
      // loss using lastRoundPassed.
      this.dispatchEvent(new GameRoundPassEvent(0, "Draw!"));
    }
  }

  #checkWin(symbol) {
    return (
      WIN_LINES.find((line) => line.every((i) => this.#cells[i] === symbol)) ??
      null
    );
  }

  #updateButtons() {
    this.#buttons.forEach((btn, i) => {
      btn.disabled = !this.#myTurn || this.#done || !!this.#cells[i];
    });
  }

  #setStatus(text) {
    this.#status.textContent = text;
  }
}

NoughtsAndCrosses.define();

// --- Lobby UI wiring ---
//
// Overlay visibility, the queue and room buttons, readiness and starting the
// game are all declarative (see index.html). Only the join-by-code form and
// server error reporting need JavaScript.

const shell = document.querySelector("game-shell");
const lobby = document.querySelector("#lobby");
const error = document.querySelector("[data-error]");

document.querySelector("#form-join").addEventListener("submit", (e) => {
  e.preventDefault();
  const code = document.querySelector("#input-code").value.trim().toUpperCase();
  if (code) lobby.joinRoom(code);
});

shell.addEventListener("game-lobby-error", (e) => {
  error.textContent = e.message || "Something went wrong.";
});

shell.addEventListener("game-lobby-room", () => {
  error.textContent = "";
});

document.querySelector("#btn-lobby").addEventListener("click", () => {
  location.reload();
});
