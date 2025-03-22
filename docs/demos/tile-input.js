import "./demo-init.js";
import { GameRoundPassEvent, GameRoundFailEvent } from "../../src/index.js";

const WORDS = ["HELLO", "WORLD", "PIZZA", "BRAIN", "CLOUD"];
const shell = document.querySelector("game-shell");
const tiles = document.querySelector("game-tile-input");
const hint = document.getElementById("hint");
let target = "";

shell.addEventListener("game-lifecycle", (e) => {
  if (e.action === "playing") {
    target = WORDS[Math.floor(Math.random() * WORDS.length)];
    hint.textContent = `Hint: starts with ${target[0]}`;
  }
});

tiles.addEventListener("game-tile-submit", (e) => {
  const guess = e.value.toUpperCase();
  const states = [];
  for (let i = 0; i < 5; i++) {
    if (guess[i] === target[i]) states.push("good");
    else if (target.includes(guess[i])) states.push("close");
    else states.push("wrong");
  }
  tiles.showResult(guess.split(""), states);

  if (guess === target) {
    tiles.dispatchEvent(new GameRoundPassEvent(1, "Correct!"));
  } else {
    tiles.dispatchEvent(new GameRoundFailEvent("Try again", true));
    setTimeout(() => { tiles.clear(); tiles.focus(); }, 800);
  }
});
