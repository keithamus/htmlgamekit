import "./demo-init.js";
import {
  GameRoundPassEvent,
  GameRoundFailEvent,
  gameWordContext,
} from "../../src/index.js";

const shell = document.querySelector("game-shell");
const src = document.querySelector("game-word-source");
const rowsEl = document.querySelector(".rows");

let target = "";
let row = 0;
let rows = [];
let round = 0;
let done = false;

src.subscribe(gameWordContext, (word) => {
  target = word;
});

shell.addEventListener("game-lifecycle", (e) => {
  if (e.action !== "playing") return;
  const currentRound = shell.round.get();
  if (currentRound === round) return;
  round = currentRound;
  row = 0;
  done = false;
  rowsEl.innerHTML = "";
  rows = [];
  for (let i = 0; i < 6; i++) {
    const tile = document.createElement("game-tile-input");
    tile.setAttribute("length", "5");
    tile.setAttribute("manual", "");
    if (i > 0) tile.disabled = true;
    rowsEl.appendChild(tile);
    rows.push(tile);
  }
  rows[0].focus();
});

shell.addEventListener("game-tile-submit", (e) => {
  if (done || !target) return;
  const guess = e.value.toLowerCase();
  if (guess.length !== 5) return;

  const targetChars = target.split("");
  const states = Array(5).fill("wrong");
  const remaining = [...targetChars];

  for (let i = 0; i < 5; i++) {
    if (guess[i] === targetChars[i]) {
      states[i] = "good";
      remaining[remaining.indexOf(guess[i])] = null;
    }
  }
  for (let i = 0; i < 5; i++) {
    if (states[i] !== "wrong") continue;
    const idx = remaining.indexOf(guess[i]);
    if (idx !== -1) {
      states[i] = "close";
      remaining[idx] = null;
    }
  }

  rows[row].showResult(guess.split(""), states);
  rows[row].disabled = true;

  if (guess === target) {
    done = true;
    shell.dispatchEvent(
      new GameRoundPassEvent(6 - row, `Got it in ${row + 1}!`),
    );
    return;
  }

  row++;
  if (row >= 6) {
    done = true;
    shell.dispatchEvent(
      new GameRoundFailEvent(`It was ${target.toUpperCase()}`),
    );
    return;
  }

  rows[row].disabled = false;
  rows[row].focus();
});
