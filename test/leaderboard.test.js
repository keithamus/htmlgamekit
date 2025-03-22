import { assert } from "@open-wc/testing";
import "../src/auto.js";

const tick = () => new Promise((r) => setTimeout(r, 0));
const microtask = () => new Promise((r) => queueMicrotask(r));

describe("game-leaderboard", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    localStorage.clear();
    sessionStorage.clear();
    history.replaceState(null, "", location.pathname);
  });

  it("scoreLabel defaults to Score", () => {
    assert.equal(
      document.createElement("game-leaderboard").scoreLabel,
      "Score",
    );
  });

  it("formatScore setter accepts a custom format function", () => {
    const el = document.createElement("game-leaderboard");
    const fn = (entry) => `${entry.score}pts`;
    el.formatScore = fn;
  });
});
