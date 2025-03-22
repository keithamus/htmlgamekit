import "./demo-init.js";

const shell = document.querySelector("game-shell");
shell.encodeResult = (state) => String(state.score);
shell.decodeResult = (str) => ({ score: Number(str) });
