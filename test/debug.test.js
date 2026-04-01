import { assert } from "@open-wc/testing";
import "../src/auto.js";

const tick = () => new Promise((r) => setTimeout(r, 0));

describe("game-debug", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    localStorage.clear();
    sessionStorage.clear();
    history.replaceState(null, "", location.pathname);
  });

  it("defines as a custom element", () => {
    assert.isTrue(customElements.get("game-debug") !== undefined);
  });

  it("is hidden by default", async () => {
    document.body.innerHTML = `
      <game-shell game-id="debug-test" rounds="1">
        <game-debug></game-debug>
      </game-shell>
    `;
    await tick();

    const debug = document.querySelector("game-debug");
    assert.isFalse(debug.open);
    const panel = debug.shadowRoot.querySelector(".panel");
    assert.isNotNull(panel);
  });

  it("shows when open attribute is set", async () => {
    document.body.innerHTML = `
      <game-shell game-id="debug-open" rounds="1">
        <div when-some-scene="ready">Ready</div>
        <game-debug open></game-debug>
      </game-shell>
    `;
    await tick();

    const debug = document.querySelector("game-debug");
    assert.isTrue(debug.open);
  });

  it("discovers when-* conditioned elements", async () => {
    document.body.innerHTML = `
      <game-shell game-id="debug-discover" rounds="1">
        <div when-some-scene="ready" id="s1">Ready</div>
        <div when-some-scene="playing" id="s2">Playing</div>
        <div when-some-scene="result" id="s3">Result</div>
        <game-debug open></game-debug>
      </game-shell>
    `;
    await tick();

    const debug = document.querySelector("game-debug");
    const nodes = debug.shadowRoot.querySelectorAll(".node");
    assert.isAtLeast(nodes.length, 3);
  });

  it("shows live state in state panel", async () => {
    document.body.innerHTML = `
      <game-shell game-id="debug-state" rounds="1">
        <div when-some-scene="ready">Ready</div>
        <game-debug open></game-debug>
      </game-shell>
    `;
    await tick();

    const debug = document.querySelector("game-debug");
    const stateRows = debug.shadowRoot.querySelectorAll(".state-row");
    assert.isAbove(stateRows.length, 0);
  });

  it("marks passing conditions as passing", async () => {
    document.body.innerHTML = `
      <game-shell game-id="debug-pass" rounds="1">
        <div when-some-scene="ready" id="ready-el">Ready</div>
        <game-debug open></game-debug>
      </game-shell>
    `;
    await tick();

    const debug = document.querySelector("game-debug");
    // shell auto-transitions to "ready", so this should pass
    const passingNodes = debug.shadowRoot.querySelectorAll(".node.passing");
    assert.isAbove(passingNodes.length, 0);
  });

  it("marks failing conditions as failing", async () => {
    document.body.innerHTML = `
      <game-shell game-id="debug-fail" rounds="1">
        <div when-some-scene="result" id="result-el">Result</div>
        <game-debug open></game-debug>
      </game-shell>
    `;
    await tick();

    const debug = document.querySelector("game-debug");
    // result scene should be failing since shell starts at init
    const failingNodes = debug.shadowRoot.querySelectorAll(".node.failing");
    assert.isAbove(failingNodes.length, 0);
  });

  it("shows empty message when no conditions exist", async () => {
    document.body.innerHTML = `
      <game-shell game-id="debug-empty" rounds="1">
        <div>No conditions</div>
        <game-debug open></game-debug>
      </game-shell>
    `;
    await tick();

    const debug = document.querySelector("game-debug");
    const empty = debug.shadowRoot.querySelector(".empty");
    assert.isNotNull(empty);
  });

  it("responds to F2 keyboard shortcut", async () => {
    document.body.innerHTML = `
      <game-shell game-id="debug-kbd" rounds="1">
        <game-debug></game-debug>
      </game-shell>
    `;
    await tick();

    const debug = document.querySelector("game-debug");
    assert.isFalse(debug.open);

    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "F2", bubbles: true }),
    );
    assert.isTrue(debug.open);

    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "F2", bubbles: true }),
    );
    assert.isFalse(debug.open);
  });
});
