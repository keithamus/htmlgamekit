import { assert } from "@open-wc/testing";
import "../src/auto.js";

const tick = () => new Promise((r) => setTimeout(r, 0));
const microtask = () => new Promise((r) => queueMicrotask(r));

describe("game-icon", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    localStorage.clear();
    sessionStorage.clear();
    history.replaceState(null, "", location.pathname);
  });

  it("creates from document.createElement", () => {
    const el = document.createElement("game-icon");
    assert.instanceOf(el, HTMLElement);
    assert.equal(el.localName, "game-icon");
  });

  it("reflects name attribute", () => {
    const el = document.createElement("game-icon");
    assert.equal(el.name, "");

    el.setAttribute("name", "star");
    assert.equal(el.name, "star");
  });

  describe("IDL property reflection - prop→attr", () => {
    it("name: prop→attr", () => {
      const el = document.createElement("game-icon");
      el.name = "star";
      assert.equal(el.getAttribute("name"), "star");
    });
  });

  it("has shadow DOM", () => {
    const el = document.createElement("game-icon");
    assert.isNotNull(el.shadowRoot);
  });

  it("renders SVG when sprite-sheet context is provided", async () => {
    document.body.innerHTML = `
      <game-shell sprite-sheet="sheet.svg">
        <game-icon name="star"></game-icon>
      </game-shell>
    `;
    await tick();
    const icon = document.querySelector("game-icon");
    const svg = icon.shadowRoot.querySelector("svg");
    assert.isNotNull(svg, "should render an SVG element");
    const use = svg.querySelector("use");
    assert.isNotNull(use, "should have a use element");
    assert.equal(use.getAttribute("href"), "sheet.svg#star");
  });

  it("is empty when no sprite-sheet is set", async () => {
    document.body.innerHTML = `
      <game-shell>
        <game-icon name="star"></game-icon>
      </game-shell>
    `;
    await tick();
    const icon = document.querySelector("game-icon");
    const svg = icon.shadowRoot.querySelector("svg");
    assert.isNull(svg, "should not render SVG without sprite-sheet");
  });

  it("updates on name change", async () => {
    document.body.innerHTML = `
      <game-shell sprite-sheet="sheet.svg">
        <game-icon name="star"></game-icon>
      </game-shell>
    `;
    await tick();
    const icon = document.querySelector("game-icon");
    icon.setAttribute("name", "heart");
    await microtask();
    const use = icon.shadowRoot.querySelector("use");
    assert.isNotNull(use);
    assert.equal(use.getAttribute("href"), "sheet.svg#heart");
  });

  it("updates on sprite-sheet change", async () => {
    document.body.innerHTML = `
      <game-shell sprite-sheet="sheet.svg">
        <game-icon name="star"></game-icon>
      </game-shell>
    `;
    await tick();
    const shell = document.querySelector("game-shell");
    shell.setAttribute("sprite-sheet", "other.svg");
    await tick();
    const icon = document.querySelector("game-icon");
    const use = icon.shadowRoot.querySelector("use");
    assert.isNotNull(use);
    assert.equal(use.getAttribute("href"), "other.svg#star");
  });
});
