import { assert } from "@open-wc/testing";
import "../src/auto.js";
import { GameRoundPassEvent } from "../src/events.js";

const tick = () => new Promise((r) => setTimeout(r, 0));
const microtask = () => new Promise((r) => queueMicrotask(r));

describe("game-result-stat", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    localStorage.clear();
    sessionStorage.clear();
    history.replaceState(null, "", location.pathname);
  });

  it("creates from document.createElement", () => {
    const el = document.createElement("game-result-stat");
    assert.equal(el.nodeName, "GAME-RESULT-STAT");
  });

  it("reflects label attribute", () => {
    const el = document.createElement("game-result-stat");
    el.setAttribute("label", "Score");
    assert.equal(el.label, "Score");
  });

  it("shadow DOM has .label and .value elements", () => {
    const el = document.createElement("game-result-stat");
    assert.exists(el.shadowRoot.querySelector(".label"));
    assert.exists(el.shadowRoot.querySelector(".value"));
  });

  it("displays score when scene is 'result'", async () => {
    document.body.innerHTML = `
      <game-shell id="s" rounds="2" between-delay="0">
        <div when-some-scene="playing"><div id="trigger"></div></div>
        <div when-some-scene="result">
          <game-result-stat label="Score"></game-result-stat>
        </div>
      </game-shell>
    `;
    await tick();
    const shell = document.querySelector("#s");
    shell.start();
    await microtask();
    // Pass round 1
    document.querySelector("#trigger").dispatchEvent(new GameRoundPassEvent(5, "OK"));
    await microtask();
    // Advance to round 2 (between-delay=0 auto-advances)
    await new Promise((r) => setTimeout(r, 50));
    await microtask();
    // Pass round 2 -> scene becomes result since round >= rounds
    document.querySelector("#trigger").dispatchEvent(new GameRoundPassEvent(5, "OK"));
    await microtask();
    await new Promise((r) => setTimeout(r, 50));
    await microtask();
    const stat = document.querySelector("game-result-stat");
    const valueEl = stat.shadowRoot.querySelector(".value");
    assert.equal(valueEl.textContent, "10");
  });

  it("applies :state(perfect) when score === rounds", async () => {
    document.body.innerHTML = `
      <game-shell id="s" rounds="2" between-delay="0">
        <div when-some-scene="playing"><div id="trigger"></div></div>
        <div when-some-scene="result">
          <game-result-stat label="Score"></game-result-stat>
        </div>
      </game-shell>
    `;
    await tick();
    const shell = document.querySelector("#s");
    shell.start();
    await microtask();
    // Pass round 1 with score=1
    document.querySelector("#trigger").dispatchEvent(new GameRoundPassEvent(1, "OK"));
    await microtask();
    await new Promise((r) => setTimeout(r, 50));
    await microtask();
    // Pass round 2 with score=1 -> total=2 which equals rounds=2
    document.querySelector("#trigger").dispatchEvent(new GameRoundPassEvent(1, "OK"));
    await microtask();
    await new Promise((r) => setTimeout(r, 50));
    await microtask();
    const stat = document.querySelector("game-result-stat");
    assert.isTrue(stat.matches(":state(perfect)"), "should have :state(perfect) when score === rounds");
  });

  // ── IDL property reflection ──────────────────────────────────────────

  describe("IDL property reflection", () => {
    it("label: default, attr→prop, prop→attr", () => {
      const el = document.createElement("game-result-stat");
      // default
      assert.equal(el.label, "");
      // attr→prop
      el.setAttribute("label", "Score");
      assert.equal(el.label, "Score");
      // prop→attr
      el.label = "Time";
      assert.equal(el.getAttribute("label"), "Time");
    });

    it("format: default, attr→prop, prop→attr", () => {
      const el = document.createElement("game-result-stat");
      // default
      assert.equal(el.format, "plain");
      // attr→prop
      el.setAttribute("format", "ms");
      assert.equal(el.format, "ms");
      // prop→attr
      el.format = "percent";
      assert.equal(el.getAttribute("format"), "percent");
    });

    it("animate: default is null, attr→prop, prop→attr removes on null", () => {
      const el = document.createElement("game-result-stat");
      // default
      assert.isNull(el.animate);
      // attr→prop
      el.setAttribute("animate", "count-up");
      assert.equal(el.animate, "count-up");
      // prop→attr (set string)
      el.animate = "fade-in";
      assert.equal(el.getAttribute("animate"), "fade-in");
      // prop→attr (set null removes attribute)
      el.animate = null;
      assert.isFalse(el.hasAttribute("animate"));
    });

    it("min-score: default is null, attr→prop, prop→attr", () => {
      const el = document.createElement("game-result-stat");
      // default
      assert.isNull(el.minScore);
      // attr→prop
      el.setAttribute("min-score", "10");
      assert.equal(el.minScore, "10");
      // prop→attr (set string)
      el.minScore = "20";
      assert.equal(el.getAttribute("min-score"), "20");
      // prop→attr (set null removes attribute)
      el.minScore = null;
      assert.isFalse(el.hasAttribute("min-score"));
    });

    it("max-score: default is null, attr→prop, prop→attr", () => {
      const el = document.createElement("game-result-stat");
      // default
      assert.isNull(el.maxScore);
      // attr→prop
      el.setAttribute("max-score", "100");
      assert.equal(el.maxScore, "100");
      // prop→attr (set string)
      el.maxScore = "200";
      assert.equal(el.getAttribute("max-score"), "200");
      // prop→attr (set null removes attribute)
      el.maxScore = null;
      assert.isFalse(el.hasAttribute("max-score"));
    });
  });
});
