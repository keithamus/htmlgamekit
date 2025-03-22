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

    const checkbox = prefs.shadowRoot.querySelector('input[type="checkbox"]');
    checkbox.checked = false;
    checkbox.dispatchEvent(new Event("change"));

    const stored = JSON.parse(localStorage.getItem("pref-test-preferences"));
    assert.isNotNull(stored);
    assert.equal(stored.sound, false);

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

  it("type defaults to toggle, label to null, default to empty string, min to 0, max to 100", () => {
    const el = document.createElement("game-preference");
    assert.equal(el.type, "toggle");
    assert.isNull(el.label);
    assert.equal(el.default, "");
    assert.equal(el.min, "0");
    assert.equal(el.max, "100");
  });
});
