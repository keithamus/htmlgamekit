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

  it("creates from document.createElement", () => {
    const el = document.createElement("game-leaderboard");
    assert.instanceOf(el, HTMLElement);
    assert.equal(el.localName, "game-leaderboard");
  });

  it("reflects score-label attribute", () => {
    const el = document.createElement("game-leaderboard");
    assert.equal(el.scoreLabel, "Score");

    el.setAttribute("score-label", "Points");
    assert.equal(el.scoreLabel, "Points");
  });

  describe("IDL property reflection - prop→attr", () => {
    it("score-label: prop→attr", () => {
      const el = document.createElement("game-leaderboard");
      el.scoreLabel = "Points";
      assert.equal(el.getAttribute("score-label"), "Points");
    });
  });

  it("has shadow DOM", () => {
    const el = document.createElement("game-leaderboard");
    assert.isNotNull(el.shadowRoot);
  });

  it("shadow DOM has a table with part=table", () => {
    const el = document.createElement("game-leaderboard");
    const shadow = el.shadowRoot;
    const table = shadow.querySelector("table");
    assert.isNotNull(table, "should have a <table>");
    assert.equal(table.getAttribute("part"), "table");
  });

  it("formatScore setter accepts a custom format function", () => {
    const el = document.createElement("game-leaderboard");
    const fn = (entry) => `${entry.score}pts`;
    // Should not throw
    el.formatScore = fn;
  });
});
