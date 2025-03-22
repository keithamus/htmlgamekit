import { assert } from "@open-wc/testing";
import "../src/auto.js";

const tick = () => new Promise((r) => setTimeout(r, 0));
const microtask = () => new Promise((r) => queueMicrotask(r));

describe("game-score-form", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    localStorage.clear();
    sessionStorage.clear();
    history.replaceState(null, "", location.pathname);
  });

  it("creates from document.createElement", () => {
    const el = document.createElement("game-score-form");
    assert.instanceOf(el, HTMLElement);
    assert.equal(el.localName, "game-score-form");
  });

  it("has shadow DOM", () => {
    const el = document.createElement("game-score-form");
    assert.isNotNull(el.shadowRoot);
  });

  it("shadow DOM has form, input, button, .submitted elements", () => {
    const el = document.createElement("game-score-form");
    const shadow = el.shadowRoot;
    assert.isNotNull(shadow.querySelector("form"), "should have form");
    assert.isNotNull(shadow.querySelector("input"), "should have input");
    assert.isNotNull(shadow.querySelector("button"), "should have button");
    assert.isNotNull(shadow.querySelector(".submitted"), "should have .submitted");
  });

  it("submit button starts disabled", () => {
    const el = document.createElement("game-score-form");
    const btn = el.shadowRoot.querySelector("button");
    assert.isTrue(btn.disabled);
  });

  it("input has placeholder Name", () => {
    const el = document.createElement("game-score-form");
    const input = el.shadowRoot.querySelector("input");
    assert.equal(input.placeholder, "Name");
  });
});
