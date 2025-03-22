import { assert } from "@open-wc/testing";
import "../src/auto.js";
import { GameRoundPassEvent } from "../src/events.js";

const tick = () => new Promise((r) => setTimeout(r, 0));
const microtask = () => new Promise((r) => queueMicrotask(r));

describe("game-result-message", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    localStorage.clear();
    sessionStorage.clear();
    history.replaceState(null, "", location.pathname);
  });

  it("creates from document.createElement", () => {
    const el = document.createElement("game-result-message");
    assert.equal(el.nodeName, "GAME-RESULT-MESSAGE");
  });

  it("selects option based on when-* conditions matching game state", async () => {
    document.body.innerHTML = `
      <game-shell id="s" rounds="1" between-delay="0">
        <div when-some-scene="playing"><div id="trigger"></div></div>
        <div when-some-scene="result">
          <game-result-message>
            <option when-min-score="10">Great!</option>
            <option when-max-score="9">Default message</option>
          </game-result-message>
        </div>
      </game-shell>
    `;
    await tick();
    const shell = document.querySelector("#s");
    shell.start();
    await microtask();
    // Pass with score=10 -> total matches when-min-score="10"
    document.querySelector("#trigger").dispatchEvent(new GameRoundPassEvent(10, "OK"));
    await microtask();
    await new Promise((r) => setTimeout(r, 50));
    await microtask();
    const msg = document.querySelector("game-result-message");
    const output = msg.shadowRoot.querySelector("[part=output]");
    assert.equal(output.textContent, "Great!");
  });

  it("shows selected option text content", async () => {
    document.body.innerHTML = `
      <game-shell id="s" rounds="1" between-delay="0">
        <div when-some-scene="playing"><div id="trigger"></div></div>
        <div when-some-scene="result">
          <game-result-message>
            <option when-min-score="100">Amazing!</option>
            <option>Default message</option>
          </game-result-message>
        </div>
      </game-shell>
    `;
    await tick();
    const shell = document.querySelector("#s");
    shell.start();
    await microtask();
    // Pass with score=5, does not meet when-min-score="100"
    // Both "Default message" (no conditions = always matches) will be selected
    document.querySelector("#trigger").dispatchEvent(new GameRoundPassEvent(5, "OK"));
    await microtask();
    await new Promise((r) => setTimeout(r, 50));
    await microtask();
    const msg = document.querySelector("game-result-message");
    const output = msg.shadowRoot.querySelector("[part=output]");
    assert.equal(output.textContent, "Default message");
  });
});
