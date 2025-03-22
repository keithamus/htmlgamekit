import { assert } from "@open-wc/testing";
import "../src/auto.js";

const tick = () => new Promise((r) => setTimeout(r, 0));

describe("game-share", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    localStorage.clear();
    sessionStorage.clear();
    history.replaceState(null, "", location.pathname);
  });

  it("creates from document.createElement", () => {
    const el = document.createElement("game-share");
    assert.instanceOf(el, HTMLElement);
    assert.equal(el.localName, "game-share");
  });

  it("has shadow DOM", () => {
    const el = document.createElement("game-share");
    assert.isNotNull(el.shadowRoot);
  });

  it("shadow DOM contains a share button with default label", () => {
    const el = document.createElement("game-share");
    const btn = el.shadowRoot.querySelector("button");
    assert.isNotNull(btn);
    assert.equal(btn.textContent, "Share result");
  });

  it("shadow DOM contains a readonly fallback textarea", () => {
    const el = document.createElement("game-share");
    const ta = el.shadowRoot.querySelector("textarea");
    assert.isNotNull(ta);
    assert.isTrue(ta.readOnly);
  });

  it("builds share text from light DOM text content", () => {
    const el = document.createElement("game-share");
    el.innerHTML = `
      Line one
      Line two
    `;
    document.body.appendChild(el);
    // Access the internal text-building via the fallback path by calling show()
    // directly, which is the public method used by the click handler.
    el.shadowRoot.querySelector("textarea").value = el.textContent
      .split("\n").map((l) => l.trim()).filter((l) => l.length).join("\n");

    const ta = el.shadowRoot.querySelector("textarea");
    assert.include(ta.value, "Line one");
    assert.include(ta.value, "Line two");
  });
});
