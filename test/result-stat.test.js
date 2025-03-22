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
    document
      .querySelector("#trigger")
      .dispatchEvent(new GameRoundPassEvent(5, "OK"));
    await microtask();
    await new Promise((r) => setTimeout(r, 50));
    await microtask();
    document
      .querySelector("#trigger")
      .dispatchEvent(new GameRoundPassEvent(5, "OK"));
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
    document
      .querySelector("#trigger")
      .dispatchEvent(new GameRoundPassEvent(1, "OK"));
    await microtask();
    await new Promise((r) => setTimeout(r, 50));
    await microtask();
    document
      .querySelector("#trigger")
      .dispatchEvent(new GameRoundPassEvent(1, "OK"));
    await microtask();
    await new Promise((r) => setTimeout(r, 50));
    await microtask();
    const stat = document.querySelector("game-result-stat");
    assert.isTrue(
      stat.matches(":state(perfect)"),
      "should have :state(perfect) when score === rounds",
    );
  });

  it("label defaults to empty string and animate/minScore/maxScore default to null", () => {
    const el = document.createElement("game-result-stat");
    assert.equal(el.label, "");
    assert.equal(el.format, "plain");
    assert.isNull(el.animate);
    assert.isNull(el.minScore);
    assert.isNull(el.maxScore);
  });
});
