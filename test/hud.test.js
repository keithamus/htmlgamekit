import { assert } from "@open-wc/testing";
import "../src/auto.js";
import { GameStatUpdateEvent } from "../src/events.js";

const tick = () => new Promise((r) => setTimeout(r, 0));
const microtask = () => new Promise((r) => queueMicrotask(r));

describe("game-round-counter", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    localStorage.clear();
    sessionStorage.clear();
    history.replaceState(null, "", location.pathname);
  });

  it("shows 'Round 1/3' format when rounds signal is set", async () => {
    document.body.innerHTML = `
      <game-shell id="s" rounds="3">
        <div when-some-scene="playing">
          <game-round-counter></game-round-counter>
        </div>
      </game-shell>
    `;
    await tick();
    const shell = document.querySelector("#s");
    shell.start();
    await microtask();
    const counter = document.querySelector("game-round-counter");
    const val = counter.shadowRoot.querySelector(".val");
    assert.equal(val.textContent, "1/3");
  });

  it("progress bar updates with round/rounds fraction", async () => {
    document.body.innerHTML = `
      <game-shell id="s" rounds="4">
        <div when-some-scene="playing">
          <game-round-counter></game-round-counter>
        </div>
      </game-shell>
    `;
    await tick();
    const shell = document.querySelector("#s");
    shell.start();
    await microtask();
    const counter = document.querySelector("game-round-counter");
    const progress = counter.shadowRoot.querySelector("progress");
    assert.equal(progress.value, 1 / 4);
  });
});

describe("game-stat", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    localStorage.clear();
    sessionStorage.clear();
    history.replaceState(null, "", location.pathname);
  });

  it("displays stat value when stats signal contains the key", async () => {
    document.body.innerHTML = `
      <game-shell id="s" rounds="3">
        <div when-some-scene="playing">
          <game-stat key="streak">Streak</game-stat>
          <div id="trigger"></div>
        </div>
      </game-shell>
    `;
    await tick();
    const shell = document.querySelector("#s");
    shell.start();
    await microtask();
    document
      .querySelector("#trigger")
      .dispatchEvent(new GameStatUpdateEvent("streak", 5));
    await microtask();
    const stat = document.querySelector("game-stat");
    const val = stat.shadowRoot.querySelector(".val");
    assert.equal(val.textContent, "5");
  });

  it("formats value using the format attribute", async () => {
    document.body.innerHTML = `
      <game-shell id="s" rounds="3">
        <div when-some-scene="playing">
          <game-stat key="time" format="ms">Time</game-stat>
          <div id="trigger"></div>
        </div>
      </game-shell>
    `;
    await tick();
    const shell = document.querySelector("#s");
    shell.start();
    await microtask();
    document
      .querySelector("#trigger")
      .dispatchEvent(new GameStatUpdateEvent("time", 1234));
    await microtask();
    const stat = document.querySelector("game-stat");
    const val = stat.shadowRoot.querySelector(".val");
    assert.equal(val.textContent, "1234ms");
  });

  it("key defaults to empty string", () => {
    assert.equal(document.createElement("game-stat").key, "");
  });

  it("format defaults to plain", () => {
    assert.equal(document.createElement("game-stat").format, "plain");
  });
});
