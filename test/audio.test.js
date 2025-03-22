import { assert } from "@open-wc/testing";
import "../src/auto.js";
import {
  GameRoundPassEvent,
  GameRoundFailEvent,
  GameTimerCountdownEvent,
} from "../src/events.js";

const tick = () => new Promise((r) => setTimeout(r, 0));
const microtask = () => new Promise((r) => queueMicrotask(r));

// Signal effects may cascade through multiple microtask cycles.
// flush() drains the full microtask queue by yielding to a macrotask.
const flush = tick;

describe("game-audio", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    localStorage.clear();
    sessionStorage.clear();
    history.replaceState(null, "", location.pathname);
  });

  // ── Basic creation & attribute reflection ───────────────────────────

  it("creates from document.createElement", () => {
    const el = document.createElement("game-audio");
    assert.instanceOf(el, HTMLElement);
    assert.equal(el.localName, "game-audio");
  });

  it("reflects muted, volume, vibration attributes", () => {
    const el = document.createElement("game-audio");

    assert.isFalse(el.muted);
    el.setAttribute("muted", "");
    assert.isTrue(el.muted);

    assert.equal(el.volume, 1);
    el.setAttribute("volume", "0.5");
    assert.equal(el.volume, 0.5);

    assert.isFalse(el.vibration);
    el.setAttribute("vibration", "");
    assert.isTrue(el.vibration);
  });

  // ── IDL property reflection — prop→attr ─────────────────────────────

  describe("IDL property reflection - prop→attr", () => {
    it("muted: prop→attr", () => {
      const el = document.createElement("game-audio");
      el.muted = true;
      assert.isTrue(el.hasAttribute("muted"));
      el.muted = false;
      assert.isFalse(el.hasAttribute("muted"));
    });

    it("volume: prop→attr", () => {
      const el = document.createElement("game-audio");
      el.volume = 0.5;
      assert.equal(el.getAttribute("volume"), "0.5");
    });

    it("vibration: prop→attr", () => {
      const el = document.createElement("game-audio");
      el.vibration = true;
      assert.isTrue(el.hasAttribute("vibration"));
      el.vibration = false;
      assert.isFalse(el.hasAttribute("vibration"));
    });
  });

  // ── Muting ─────────────────────────────────────────────────────────

  describe("muting", () => {
    it("triggerCallback does NOT call play on samples when muted", async () => {
      document.body.innerHTML = `
        <game-shell rounds="5" between-delay="manual">
          <game-audio muted>
            <game-sample name="ding" trigger="pass" type="marimba" notes="523:0"></game-sample>
          </game-audio>
          <div when-some-scene="playing"><div id="trigger"></div></div>
        </game-shell>
      `;
      await tick();
      const shell = document.querySelector("game-shell");
      const sample = document.querySelector("game-sample");

      // Spy on sample.play
      let playCalled = false;
      const origPlay = sample.play;
      sample.play = function () { playCalled = true; };

      shell.start();
      await flush();

      document.querySelector("#trigger").dispatchEvent(
        new GameRoundPassEvent(1, "Nice!"),
      );
      await flush();

      assert.isFalse(playCalled, "play should NOT be called when audio is muted");
      sample.play = origPlay;
    });

    it("triggerCallback DOES call play on samples when NOT muted", async () => {
      document.body.innerHTML = `
        <game-shell rounds="5" between-delay="manual">
          <game-audio>
            <game-sample name="ding" trigger="pass" type="marimba" notes="523:0"></game-sample>
          </game-audio>
          <div when-some-scene="playing"><div id="trigger"></div></div>
        </game-shell>
      `;
      await tick();
      const shell = document.querySelector("game-shell");
      const sample = document.querySelector("game-sample");

      let playCalled = false;
      const origPlay = sample.play;
      sample.play = function () { playCalled = true; };

      shell.start();
      await flush();

      document.querySelector("#trigger").dispatchEvent(
        new GameRoundPassEvent(1, "Nice!"),
      );
      await flush();

      assert.isTrue(playCalled, "play should be called when audio is not muted");
      sample.play = origPlay;
    });
  });

  // ── Trigger routing ────────────────────────────────────────────────

  describe("trigger routing", () => {
    it("routes pass trigger to samples with trigger='pass'", async () => {
      document.body.innerHTML = `
        <game-shell rounds="5" between-delay="manual">
          <game-audio>
            <game-sample name="pass-sound" trigger="pass" type="marimba" notes="523:0"></game-sample>
            <game-sample name="fail-sound" trigger="fail" type="marimba" notes="220:0"></game-sample>
          </game-audio>
          <div when-some-scene="playing"><div id="trigger"></div></div>
        </game-shell>
      `;
      await tick();
      const shell = document.querySelector("game-shell");

      const played = [];
      for (const s of document.querySelectorAll("game-sample")) {
        s.play = function () { played.push(s.name); };
      }

      shell.start();
      await flush();

      document.querySelector("#trigger").dispatchEvent(
        new GameRoundPassEvent(1, "Correct!"),
      );
      await flush();

      assert.include(played, "pass-sound", "pass-sound should be played");
      assert.notInclude(played, "fail-sound", "fail-sound should NOT be played on pass");
    });

    it("routes fail trigger to samples with trigger='fail'", async () => {
      document.body.innerHTML = `
        <game-shell rounds="5" between-delay="manual">
          <game-audio>
            <game-sample name="pass-sound" trigger="pass" type="marimba" notes="523:0"></game-sample>
            <game-sample name="fail-sound" trigger="fail" type="marimba" notes="220:0"></game-sample>
          </game-audio>
          <div when-some-scene="playing"><div id="trigger"></div></div>
        </game-shell>
      `;
      await tick();
      const shell = document.querySelector("game-shell");

      const played = [];
      for (const s of document.querySelectorAll("game-sample")) {
        s.play = function () { played.push(s.name); };
      }

      shell.start();
      await flush();

      document.querySelector("#trigger").dispatchEvent(
        new GameRoundFailEvent("Wrong!"),
      );
      await flush();

      assert.include(played, "fail-sound", "fail-sound should be played");
      assert.notInclude(played, "pass-sound", "pass-sound should NOT be played on fail");
    });

    it("routes start trigger to samples with trigger='start'", async () => {
      document.body.innerHTML = `
        <game-shell rounds="5" between-delay="manual">
          <game-audio>
            <game-sample name="start-sound" trigger="start" type="marimba" notes="440:0"></game-sample>
          </game-audio>
          <div when-some-scene="playing"><div id="trigger"></div></div>
        </game-shell>
      `;
      await tick();
      const shell = document.querySelector("game-shell");

      let playCalled = false;
      document.querySelector("game-sample").play = function () { playCalled = true; };

      shell.start();
      await flush();

      assert.isTrue(playCalled, "start-sound should be played on game start");
    });
  });

  // ── Condition filtering on samples ─────────────────────────────────

  describe("condition filtering on samples", () => {
    it("sample with when-min-score only plays when score >= threshold", async () => {
      document.body.innerHTML = `
        <game-shell rounds="5" between-delay="manual">
          <game-audio>
            <game-sample name="bonus" trigger="pass" type="marimba" notes="880:0"
              when-min-score="5"></game-sample>
          </game-audio>
          <div when-some-scene="playing"><div id="trigger"></div></div>
        </game-shell>
      `;
      await tick();
      const shell = document.querySelector("game-shell");
      const sample = document.querySelector('game-sample[name="bonus"]');

      let playCalled = false;
      sample.play = function () { playCalled = true; };

      shell.start();
      await flush();

      // Score is 0 at this point — pass with score 1 (total will be 1 < 5)
      document.querySelector("#trigger").dispatchEvent(
        new GameRoundPassEvent(1, "Ok"),
      );
      await flush();

      assert.isFalse(playCalled, "should NOT play when score < min-score");
    });
  });

  // ── Value filtering ────────────────────────────────────────────────

  describe("value filtering on samples", () => {
    it('sample with value="3" only plays when event data matches', async () => {
      document.body.innerHTML = `
        <game-shell rounds="5" between-delay="manual">
          <game-audio>
            <game-sample name="countdown-3" trigger="countdown" type="marimba"
              notes="440:0" value="3"></game-sample>
          </game-audio>
          <div when-some-scene="playing"><div id="trigger"></div></div>
        </game-shell>
      `;
      await tick();
      const shell = document.querySelector("game-shell");
      const sample = document.querySelector('game-sample[name="countdown-3"]');

      const playCalls = [];
      sample.play = function () { playCalls.push(1); };

      shell.start();
      await flush();

      // Dispatch countdown with seconds=5 — should NOT match
      shell.dispatchEvent(new GameTimerCountdownEvent(5));
      await flush();
      assert.equal(playCalls.length, 0, "should NOT play for seconds=5");

      // Dispatch countdown with seconds=3 — should match
      shell.dispatchEvent(new GameTimerCountdownEvent(3));
      await flush();
      assert.equal(playCalls.length, 1, "should play for seconds=3");
    });
  });

  // ── timeoutCallback() ─────────────────────────────────────────────

  describe("timeoutCallback()", () => {
    it("routes to triggerCallback('timeout') when a timeout sample exists", () => {
      const audio = document.createElement("game-audio");
      const sample = document.createElement("game-sample");
      sample.setAttribute("trigger", "timeout");
      audio.appendChild(sample);
      const calls = [];
      audio.triggerCallback = (name) => calls.push(name);
      audio.timeoutCallback(null);
      assert.deepEqual(calls, ["timeout"]);
    });

    it("routes to triggerCallback('fail') when no timeout sample exists", () => {
      const audio = document.createElement("game-audio");
      const sample = document.createElement("game-sample");
      sample.setAttribute("trigger", "pass");
      audio.appendChild(sample);
      const calls = [];
      audio.triggerCallback = (name) => calls.push(name);
      audio.timeoutCallback(null);
      assert.deepEqual(calls, ["fail"]);
    });

    it("routes to triggerCallback('fail') when audio has no children", () => {
      const audio = document.createElement("game-audio");
      const calls = [];
      audio.triggerCallback = (name) => calls.push(name);
      audio.timeoutCallback(null);
      assert.deepEqual(calls, ["fail"]);
    });
  });

  // ── play() method ──────────────────────────────────────────────────

  describe("play() method", () => {
    it("plays the named sample", () => {
      const audio = document.createElement("game-audio");
      const sample = document.createElement("game-sample");
      sample.setAttribute("name", "click");
      sample.setAttribute("type", "marimba");
      sample.setAttribute("notes", "440:0");
      audio.appendChild(sample);

      let playState = null;
      sample.play = function (state) { playState = state; };

      audio.play("click");
      assert.isNotNull(playState, "sample.play should have been called");
    });

    it("does nothing when no sample matches the name", () => {
      const audio = document.createElement("game-audio");
      const sample = document.createElement("game-sample");
      sample.setAttribute("name", "click");
      audio.appendChild(sample);

      let playCalled = false;
      sample.play = function () { playCalled = true; };

      audio.play("nonexistent");
      assert.isFalse(playCalled);
    });

    it("passes state argument to sample.play", () => {
      const audio = document.createElement("game-audio");
      const sample = document.createElement("game-sample");
      sample.setAttribute("name", "ding");
      audio.appendChild(sample);

      let receivedState = null;
      sample.play = function (state) { receivedState = state; };

      const mockState = { score: 10, round: 2 };
      audio.play("ding", mockState);
      assert.deepEqual(receivedState, mockState);
    });
  });

  // ── Multiple samples for the same trigger ──────────────────────────

  describe("multiple samples for the same trigger", () => {
    it("plays all matching samples", async () => {
      document.body.innerHTML = `
        <game-shell rounds="5" between-delay="manual">
          <game-audio>
            <game-sample name="ding1" trigger="pass" type="marimba" notes="523:0"></game-sample>
            <game-sample name="ding2" trigger="pass" type="marimba" notes="659:0"></game-sample>
          </game-audio>
          <div when-some-scene="playing"><div id="trigger"></div></div>
        </game-shell>
      `;
      await tick();
      const shell = document.querySelector("game-shell");

      const played = [];
      for (const s of document.querySelectorAll("game-sample")) {
        s.play = function () { played.push(s.name); };
      }

      shell.start();
      await flush();

      document.querySelector("#trigger").dispatchEvent(
        new GameRoundPassEvent(1, "Nice!"),
      );
      await flush();

      assert.include(played, "ding1");
      assert.include(played, "ding2");
      assert.equal(played.length, 2);
    });
  });
});

// ── game-sample ────────────────────────────────────────────────────────

describe("game-sample", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    localStorage.clear();
    sessionStorage.clear();
    history.replaceState(null, "", location.pathname);
  });

  it("creates from document.createElement", () => {
    const el = document.createElement("game-sample");
    assert.instanceOf(el, HTMLElement);
    assert.equal(el.localName, "game-sample");
  });

  it("reflects name, trigger, type, gain attributes", () => {
    const el = document.createElement("game-sample");

    el.setAttribute("name", "click");
    assert.equal(el.name, "click");

    el.setAttribute("trigger", "pass");
    assert.equal(el.trigger, "pass");

    assert.isNull(el.type);
    el.setAttribute("type", "marimba");
    assert.equal(el.type, "marimba");

    assert.equal(el.gain, 0.35);
    el.setAttribute("gain", "0.7");
    assert.equal(el.gain, 0.7);
  });

  it("reflects duration, notes, vibrate, value attributes", () => {
    const el = document.createElement("game-sample");

    assert.isNull(el.duration);
    el.setAttribute("duration", "0.5");
    assert.equal(el.duration, "0.5");

    assert.isNull(el.notes);
    el.setAttribute("notes", "523:0,659:0.08");
    assert.equal(el.notes, "523:0,659:0.08");

    assert.equal(el.vibrate, "auto");
    el.setAttribute("vibrate", "off");
    assert.equal(el.vibrate, "off");

    assert.isNull(el.value);
    el.setAttribute("value", "3");
    assert.equal(el.value, "3");
  });

  it("reflects scale, scale-root, scale-spacing attributes", () => {
    const el = document.createElement("game-sample");

    assert.isNull(el.scale);
    el.setAttribute("scale", "pentatonic");
    assert.equal(el.scale, "pentatonic");

    assert.equal(el.scaleRoot, 220);
    el.setAttribute("scale-root", "440");
    assert.equal(el.scaleRoot, 440);

    assert.equal(el.scaleSpacing, 0.1);
    el.setAttribute("scale-spacing", "0.2");
    assert.equal(el.scaleSpacing, 0.2);
  });

  // ── IDL property reflection — prop→attr ─────────────────────────────

  describe("IDL property reflection - prop→attr", () => {
    it("name: prop→attr", () => {
      const el = document.createElement("game-sample");
      el.name = "click";
      assert.equal(el.getAttribute("name"), "click");
    });

    it("trigger: prop→attr", () => {
      const el = document.createElement("game-sample");
      el.trigger = "pass";
      assert.equal(el.getAttribute("trigger"), "pass");
    });

    it("type: prop→attr (nullable)", () => {
      const el = document.createElement("game-sample");
      el.type = "marimba";
      assert.equal(el.getAttribute("type"), "marimba");
      el.type = null;
      assert.isFalse(el.hasAttribute("type"));
    });

    it("gain: prop→attr", () => {
      const el = document.createElement("game-sample");
      el.gain = 0.7;
      assert.equal(el.getAttribute("gain"), "0.7");
    });

    it("duration: prop→attr (nullable)", () => {
      const el = document.createElement("game-sample");
      el.duration = "0.5";
      assert.equal(el.getAttribute("duration"), "0.5");
      el.duration = null;
      assert.isFalse(el.hasAttribute("duration"));
    });

    it("notes: prop→attr (nullable)", () => {
      const el = document.createElement("game-sample");
      el.notes = "523:0,659:0.08";
      assert.equal(el.getAttribute("notes"), "523:0,659:0.08");
      el.notes = null;
      assert.isFalse(el.hasAttribute("notes"));
    });

    it("vibrate: prop→attr", () => {
      const el = document.createElement("game-sample");
      el.vibrate = "off";
      assert.equal(el.getAttribute("vibrate"), "off");
    });

    it("value: prop→attr (nullable)", () => {
      const el = document.createElement("game-sample");
      el.value = "3";
      assert.equal(el.getAttribute("value"), "3");
      el.value = null;
      assert.isFalse(el.hasAttribute("value"));
    });

    it("scale: prop→attr (nullable)", () => {
      const el = document.createElement("game-sample");
      el.scale = "pentatonic";
      assert.equal(el.getAttribute("scale"), "pentatonic");
      el.scale = null;
      assert.isFalse(el.hasAttribute("scale"));
    });

    it("scaleRoot: prop→attr", () => {
      const el = document.createElement("game-sample");
      el.scaleRoot = 440;
      assert.equal(el.getAttribute("scale-root"), "440");
    });

    it("scaleSpacing: prop→attr", () => {
      const el = document.createElement("game-sample");
      el.scaleSpacing = 0.2;
      assert.equal(el.getAttribute("scale-spacing"), "0.2");
    });
  });
});
