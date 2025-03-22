import { assert } from "@open-wc/testing";
import "../src/auto.js";
import { GameRoundPassEvent } from "../src/events.js";

const tick = () => new Promise((r) => setTimeout(r, 0));
const microtask = () => new Promise((r) => queueMicrotask(r));

describe("game-between", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    localStorage.clear();
    sessionStorage.clear();
    history.replaceState(null, "", location.pathname);
  });

  it("populates [data-between=feedback] with lastFeedback", async () => {
    document.body.innerHTML = `
      <game-shell id="g" rounds="3" between-delay="manual">
        <div when-some-scene="playing"><div id="trigger"></div></div>
        <div when-some-scene="between"><game-between>
          <span data-between="feedback"></span>
          <span data-between="score"></span>
          <span data-between="round"></span>
        </game-between></div>
      </game-shell>
    `;
    await tick();
    const shell = document.querySelector("#g");
    shell.start();
    await microtask();
    document
      .querySelector("#trigger")
      .dispatchEvent(new GameRoundPassEvent(10, "Great job!"));
    await microtask();
    const feedback = document.querySelector("[data-between=feedback]");
    assert.equal(feedback.textContent, "Great job!");
  });

  it("populates [data-between=score] with current score", async () => {
    document.body.innerHTML = `
      <game-shell id="g" rounds="3" between-delay="manual">
        <div when-some-scene="playing"><div id="trigger"></div></div>
        <div when-some-scene="between"><game-between>
          <span data-between="feedback"></span>
          <span data-between="score"></span>
          <span data-between="round"></span>
        </game-between></div>
      </game-shell>
    `;
    await tick();
    const shell = document.querySelector("#g");
    shell.start();
    await microtask();
    document
      .querySelector("#trigger")
      .dispatchEvent(new GameRoundPassEvent(10, "Nice"));
    await microtask();
    const scoreEl = document.querySelector("[data-between=score]");
    assert.equal(scoreEl.textContent, "10");
  });

  it("populates [data-between=round] with '1 / 3' format", async () => {
    document.body.innerHTML = `
      <game-shell id="g" rounds="3" between-delay="manual">
        <div when-some-scene="playing"><div id="trigger"></div></div>
        <div when-some-scene="between"><game-between>
          <span data-between="feedback"></span>
          <span data-between="score"></span>
          <span data-between="round"></span>
        </game-between></div>
      </game-shell>
    `;
    await tick();
    const shell = document.querySelector("#g");
    shell.start();
    await microtask();
    document
      .querySelector("#trigger")
      .dispatchEvent(new GameRoundPassEvent(10, "OK"));
    await microtask();
    const roundEl = document.querySelector("[data-between=round]");
    assert.equal(roundEl.textContent, "1 / 3");
  });
});
