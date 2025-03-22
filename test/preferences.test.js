import { assert } from "@open-wc/testing";
import "../src/auto.js";

const tick = () => new Promise((r) => setTimeout(r, 0));
const microtask = () => new Promise((r) => queueMicrotask(r));

/**
 * Build game-shell > game-preferences > game-preference children using
 * createElement so that every custom element is upgraded before it connects.
 * (innerHTML can cause parent connectedCallback to fire before children
 * are upgraded, which means attribute reflections aren't available yet.)
 */
function createShellWithPrefs() {
  const shell = document.createElement("game-shell");
  shell.setAttribute("game-id", "pref-test");

  const prefs = document.createElement("game-preferences");

  const pref1 = document.createElement("game-preference");
  pref1.setAttribute("key", "sound");
  pref1.setAttribute("type", "toggle");
  pref1.setAttribute("label", "Sound");
  pref1.setAttribute("default", "true");

  const pref2 = document.createElement("game-preference");
  pref2.setAttribute("key", "volume");
  pref2.setAttribute("type", "range");
  pref2.setAttribute("label", "Volume");
  pref2.setAttribute("default", "80");
  pref2.setAttribute("min", "0");
  pref2.setAttribute("max", "100");

  prefs.appendChild(pref1);
  prefs.appendChild(pref2);
  shell.appendChild(prefs);
  document.body.appendChild(shell);

  return { shell, prefs };
}

describe("game-preferences", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    localStorage.clear();
    sessionStorage.clear();
    history.replaceState(null, "", location.pathname);
  });

  it("creates from document.createElement", () => {
    const el = document.createElement("game-preferences");
    assert.instanceOf(el, HTMLElement);
    assert.equal(el.localName, "game-preferences");
  });

  it("renders controls from preference children", async () => {
    const { prefs } = createShellWithPrefs();
    await tick();
    const shadow = prefs.shadowRoot;
    const inputs = shadow.querySelectorAll("input");
    assert.isAbove(inputs.length, 0, "should render input controls");
    const checkbox = shadow.querySelector('input[type="checkbox"]');
    assert.isNotNull(checkbox, "should have a checkbox for toggle pref");
    const range = shadow.querySelector('input[type="range"]');
    assert.isNotNull(range, "should have a range for range pref");
  });

  it("toggle default=true starts checked", async () => {
    const { prefs } = createShellWithPrefs();
    await tick();
    const checkbox = prefs.shadowRoot.querySelector('input[type="checkbox"]');
    assert.isTrue(checkbox.checked);
  });

  it("range default=80 starts at 80", async () => {
    const { prefs } = createShellWithPrefs();
    await tick();
    const range = prefs.shadowRoot.querySelector('input[type="range"]');
    assert.equal(Number(range.value), 80);
  });

  it("get() returns preference value", async () => {
    const { prefs } = createShellWithPrefs();
    await tick();
    assert.equal(prefs.get("sound"), true);
    assert.equal(prefs.get("volume"), 80);
  });

  it("toggle change dispatches game-preference-change", async () => {
    const { prefs } = createShellWithPrefs();
    await tick();
    const checkbox = prefs.shadowRoot.querySelector('input[type="checkbox"]');

    let eventFired = false;
    let eventKey, eventValue;
    prefs.addEventListener("game-preference-change", (e) => {
      eventFired = true;
      eventKey = e.key;
      eventValue = e.value;
    });

    checkbox.checked = false;
    checkbox.dispatchEvent(new Event("change"));
    assert.isTrue(eventFired, "event should fire");
    assert.equal(eventKey, "sound");
    assert.equal(eventValue, false);
  });

  it("range change dispatches game-preference-change", async () => {
    const { prefs } = createShellWithPrefs();
    await tick();
    const range = prefs.shadowRoot.querySelector('input[type="range"]');

    let eventFired = false;
    let eventKey, eventValue;
    prefs.addEventListener("game-preference-change", (e) => {
      eventFired = true;
      eventKey = e.key;
      eventValue = e.value;
    });

    range.value = "50";
    range.dispatchEvent(new Event("input"));
    assert.isTrue(eventFired, "event should fire");
    assert.equal(eventKey, "volume");
    assert.equal(eventValue, 50);
  });

  it("persists to localStorage and restores on reconnect", async () => {
    const { prefs } = createShellWithPrefs();
    await tick();

    // Change the toggle
    const checkbox = prefs.shadowRoot.querySelector('input[type="checkbox"]');
    checkbox.checked = false;
    checkbox.dispatchEvent(new Event("change"));

    // Verify saved to localStorage
    const stored = JSON.parse(localStorage.getItem("pref-test-preferences"));
    assert.isNotNull(stored);
    assert.equal(stored.sound, false);

    // Re-create to simulate reconnect
    document.body.innerHTML = "";
    await tick();

    const { prefs: prefs2 } = createShellWithPrefs();
    await tick();
    assert.equal(prefs2.get("sound"), false, "should restore saved value");
  });
});

describe("game-preference", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    localStorage.clear();
    sessionStorage.clear();
    history.replaceState(null, "", location.pathname);
  });

  it("creates from document.createElement", () => {
    const el = document.createElement("game-preference");
    assert.instanceOf(el, HTMLElement);
    assert.equal(el.localName, "game-preference");
  });

  it("reflects key, type, label, default attributes", () => {
    const el = document.createElement("game-preference");

    el.setAttribute("key", "sound");
    assert.equal(el.key, "sound");

    // type defaults to "toggle" (enum with missing: "toggle")
    assert.equal(el.type, "toggle");
    el.setAttribute("type", "range");
    assert.equal(el.type, "range");

    // label is nullable string
    assert.isNull(el.label);
    el.setAttribute("label", "Sound Effects");
    assert.equal(el.label, "Sound Effects");

    // default is a string, defaults to ""
    assert.equal(el.default, "");
    el.setAttribute("default", "true");
    assert.equal(el.default, "true");
  });

  // ── Missing attr→prop + defaults for min, max ─────────────────────

  it("reflects min and max attributes", () => {
    const el = document.createElement("game-preference");

    assert.equal(el.min, "0");
    el.setAttribute("min", "10");
    assert.equal(el.min, "10");

    assert.equal(el.max, "100");
    el.setAttribute("max", "200");
    assert.equal(el.max, "200");
  });

  // ── IDL property reflection — prop→attr ─────────────────────────────

  describe("IDL property reflection - prop→attr", () => {
    it("key: prop→attr", () => {
      const el = document.createElement("game-preference");
      el.key = "sound";
      assert.equal(el.getAttribute("key"), "sound");
    });

    it("type: prop→attr", () => {
      const el = document.createElement("game-preference");
      el.type = "range";
      assert.equal(el.getAttribute("type"), "range");
    });

    it("label: prop→attr (nullable)", () => {
      const el = document.createElement("game-preference");
      el.label = "Sound Effects";
      assert.equal(el.getAttribute("label"), "Sound Effects");
      el.label = null;
      assert.isFalse(el.hasAttribute("label"));
    });

    it("default: prop→attr", () => {
      const el = document.createElement("game-preference");
      el.default = "true";
      assert.equal(el.getAttribute("default"), "true");
    });

    it("min: prop→attr", () => {
      const el = document.createElement("game-preference");
      el.min = "10";
      assert.equal(el.getAttribute("min"), "10");
    });

    it("max: prop→attr", () => {
      const el = document.createElement("game-preference");
      el.max = "200";
      assert.equal(el.getAttribute("max"), "200");
    });
  });
});
