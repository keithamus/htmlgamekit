// Exposes the trigger system as 11ty global data so trigger tables in
// audio.md (and any other page) can be generated rather than hand-written.
//
// Trigger NAMES are parsed directly from src/triggers.js — they are
// authoritative. Descriptions live here alongside the docs; add one
// whenever a new trigger is introduced in source.

const fs = require("fs");
const path = require("path");

const STATE_DESCRIPTIONS = {
  start: "Game transitions to `playing` from `ready` or `result`",
  round: "Every transition to `playing` (including between rounds)",
  pass: "Round passed (enters `between` with `lastRoundPassed` true)",
  fail: "Round failed (enters `between` with `lastRoundPassed` false, and no timeout trigger)",
  timeout:
    'Round failed due to timeout (enters `between` with feedback containing "time" **and** a `<game-sample trigger="timeout">` exists)',
  complete: "Game enters the `result` state",
  "tier-up": "The `difficulty.tierIndex` increased since the last state update",
};

const DOM_DESCRIPTIONS = {
  input:
    "A `game-tile-input` event bubbles up (from `<game-tile-input>` on each keystroke)",
  countdown:
    'A whole-second tick from `<game-timer>` (`game-timer-countdown` event); combine with `value="3"` etc. to target specific seconds',
  keydown: "Any `keydown` event on the shell",
  keyup: "Any `keyup` event on the shell",
  click: "Any `click` event on the shell",
  pointerdown: "Any `pointerdown` event on the shell",
  pointerup: "Any `pointerup` event on the shell",
};

module.exports = () => {
  const src = fs.readFileSync(
    path.resolve(__dirname, "../../src/triggers.js"),
    "utf-8",
  );

  const stateMatch = src.match(
    /export const STATE_TRIGGERS\s*=\s*\[([\s\S]*?)\]/,
  );
  const domMatch = src.match(/export const DOM_TRIGGERS\s*=\s*\{([\s\S]*?)\}/);

  const stateNames = stateMatch
    ? [...stateMatch[1].matchAll(/"([\w-]+)"/g)].map((m) => m[1])
    : [];
  const domNames = domMatch
    ? [...domMatch[1].matchAll(/([\w-]+):/g)].map((m) => m[1])
    : [];

  return {
    state: stateNames.map((name) => ({
      name,
      firesWhen: STATE_DESCRIPTIONS[name] ?? "",
    })),
    dom: domNames.map((name) => ({
      name,
      firesWhen: DOM_DESCRIPTIONS[name] ?? "",
    })),
  };
};
