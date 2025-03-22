import { assert } from "@open-wc/testing";
import "../src/auto.js";
import { GameRoundPassEvent, GameRoundFailEvent } from "../src/events.js";

const tick = () => new Promise((r) => setTimeout(r, 0));
const microtask = () => new Promise((r) => queueMicrotask(r));

describe("game-flash", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    localStorage.clear();
    sessionStorage.clear();
    history.replaceState(null, "", location.pathname);
  });

  it("creates from document.createElement", () => {
    const el = document.createElement("game-flash");
    assert.equal(el.nodeName, "GAME-FLASH");
  });

  it("has shadow DOM with styles", () => {
    const el = document.createElement("game-flash");
    assert.exists(el.shadowRoot);
    assert.isAbove(el.shadowRoot.adoptedStyleSheets.length, 0);
  });

  it("sets :state(pass) when lastRoundPassed is true and scene is between", async () => {
    document.body.innerHTML = `
      <game-shell id="s" rounds="3">
        <game-flash></game-flash>
        <div when-some-scene="playing"><div id="trigger"></div></div>
      </game-shell>
    `;
    await tick();
    const shell = document.querySelector("#s");
    const flash = document.querySelector("game-flash");
    shell.start();
    await microtask();
    // Dispatch a pass event from inside the shell
    document.querySelector("#trigger").dispatchEvent(new GameRoundPassEvent(1, "Nice!"));
    await microtask();
    const internals = flash.shadowRoot.host;
    assert.isTrue(internals.matches(":state(pass)"), "flash should have :state(pass)");
  });

  it("sets :state(fail) when lastRoundPassed is false and scene is between", async () => {
    document.body.innerHTML = `
      <game-shell id="s" rounds="3">
        <game-flash></game-flash>
        <div when-some-scene="playing"><div id="trigger"></div></div>
      </game-shell>
    `;
    await tick();
    const shell = document.querySelector("#s");
    const flash = document.querySelector("game-flash");
    shell.start();
    await microtask();
    // Dispatch a fail event from inside the shell
    document.querySelector("#trigger").dispatchEvent(new GameRoundFailEvent("Wrong"));
    await microtask();
    assert.isTrue(flash.matches(":state(fail)"), "flash should have :state(fail)");
  });

  it("clears states after timeout (300ms)", async () => {
    document.body.innerHTML = `
      <game-shell id="s" rounds="3">
        <game-flash></game-flash>
        <div when-some-scene="playing"><div id="trigger"></div></div>
      </game-shell>
    `;
    await tick();
    const shell = document.querySelector("#s");
    const flash = document.querySelector("game-flash");
    shell.start();
    await microtask();
    document.querySelector("#trigger").dispatchEvent(new GameRoundPassEvent(1, "Nice!"));
    await microtask();
    assert.isTrue(flash.matches(":state(pass)"), "should initially have :state(pass)");
    // Wait for the 300ms timeout to clear
    await new Promise((r) => setTimeout(r, 350));
    assert.isFalse(flash.matches(":state(pass)"), "should clear :state(pass) after 300ms");
    assert.isFalse(flash.matches(":state(fail)"), "should clear :state(fail) after 300ms");
  });
});
