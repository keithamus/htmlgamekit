import { assert } from "@open-wc/testing";
import "../src/auto.js";

const tick = () => new Promise((r) => setTimeout(r, 0));
const microtask = () => new Promise((r) => queueMicrotask(r));

describe("game-challenge", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    localStorage.clear();
    sessionStorage.clear();
    history.replaceState(null, "", location.pathname);
  });

  it("enters :state(active) when challenge signal is set", async () => {
    document.body.innerHTML = `
      <game-shell>
        <game-challenge></game-challenge>
      </game-shell>
    `;
    await tick();
    const shell = document.querySelector("game-shell");
    const challenge = document.querySelector("game-challenge");
    assert.isFalse(challenge.matches(":state(active)"));

    shell.challenge.set({ score: 42 });
    await tick();
    assert.isTrue(challenge.matches(":state(active)"));
  });

  it("displays formatted challenge score", async () => {
    document.body.innerHTML = `
      <game-shell>
        <game-challenge></game-challenge>
      </game-shell>
    `;
    await tick();
    const shell = document.querySelector("game-shell");
    const challenge = document.querySelector("game-challenge");

    shell.challenge.set({ score: 99 });
    await tick();
    const scoreEl = challenge.shadowRoot.querySelector(".score");
    assert.equal(scoreEl.textContent, "99");
  });

  it("shows a taunt message", async () => {
    document.body.innerHTML = `
      <game-shell>
        <game-challenge></game-challenge>
      </game-shell>
    `;
    await tick();
    const shell = document.querySelector("game-shell");
    const challenge = document.querySelector("game-challenge");

    shell.challenge.set({ score: 10 });
    await tick();
    const tauntEl = challenge.shadowRoot.querySelector(".taunt");
    assert.isNotEmpty(tauntEl.textContent, "should display a taunt");
  });
});
