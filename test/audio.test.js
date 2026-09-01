import { assert } from "@open-wc/testing";
import "../src/auto.js";
import {
  GameRoundPassEvent,
  GameRoundFailEvent,
  GameTimerCountdownEvent,
} from "../src/events.js";

const tick = () => new Promise((r) => setTimeout(r, 0));
const microtask = () => new Promise((r) => queueMicrotask(r));

const flush = tick;

describe("game-sample", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    localStorage.clear();
    sessionStorage.clear();
    history.replaceState(null, "", location.pathname);
  });

  it("attributes default to their specified defaults", () => {
    const el = document.createElement("game-sample");
    assert.isNull(el.type);
    assert.isNull(el.duration);
    assert.isNull(el.notes);
    assert.isNull(el.scale);
    assert.isNull(el.value);
    assert.equal(el.gain, 0.35);
    assert.equal(el.vibrate, "auto");
    assert.equal(el.scaleRoot, 220);
    assert.equal(el.scaleSpacing, 0.1);
  });

  it("reflects noise shaping attributes", () => {
    const el = document.createElement("game-sample");
    el.setAttribute("noise-decay", "0.12");
    el.setAttribute("noise-filter", "highpass");
    el.setAttribute("noise-frequency", "1400");

    assert.equal(el.noiseDecay, 0.12);
    assert.equal(el.noiseFilter, "highpass");
    assert.equal(el.noiseFrequency, 1400);
  });

  describe("self-triggered via trigger attribute", () => {
    it("fires triggerCallback when trigger='pass' and pass fires", async () => {
      document.body.innerHTML = `
			<game-shell rounds="5" between-delay="manual">
				<game-sample trigger="pass" type="marimba" notes="523:0" name="ding"></game-sample>
				<div when-some-scene="playing"><div id="trigger"></div></div>
			</game-shell>
		`;
      await tick();
      const shell = document.querySelector("game-shell");
      const sample = document.querySelector("game-sample");

      let playCalled = false;
      const origPlay = sample.play;
      sample.play = function () {
        playCalled = true;
      };

      shell.start();
      await flush();

      document
        .querySelector("#trigger")
        .dispatchEvent(new GameRoundPassEvent(1, "Nice!"));
      await flush();

      assert.isTrue(playCalled, "play should be called when pass fires");
      sample.play = origPlay;
    });

    it("does not fire when muted", async () => {
      document.body.innerHTML = `
			<game-shell rounds="5" between-delay="manual">
				<game-sample trigger="pass" type="marimba" notes="523:0"></game-sample>
				<div when-some-scene="playing"><div id="trigger"></div></div>
			</game-shell>
		`;
      await tick();
      const shell = document.querySelector("game-shell");
      const sample = document.querySelector("game-sample");

      let playCalled = false;
      sample.play = function () {
        playCalled = true;
      };

      shell.muted.set(true);
      await flush();

      shell.start();
      await flush();

      document
        .querySelector("#trigger")
        .dispatchEvent(new GameRoundPassEvent(1, "Nice!"));
      await flush();

      assert.isFalse(playCalled, "play should NOT be called when muted");
    });

    it("routes fail trigger to samples with trigger='fail'", async () => {
      document.body.innerHTML = `
	<game-shell rounds="5" between-delay="manual">
		<game-sample name="pass-sound" trigger="pass" type="marimba" notes="523:0"></game-sample>
		<game-sample name="fail-sound" trigger="fail" type="marimba" notes="220:0"></game-sample>
		<div when-some-scene="playing"><div id="trigger"></div></div>
	</game-shell>
      `;
      await tick();
      const shell = document.querySelector("game-shell");

      const played = [];
      for (const s of document.querySelectorAll("game-sample")) {
        s.play = function () {
          played.push(s.name);
        };
      }

      shell.start();
      await flush();

      document
        .querySelector("#trigger")
        .dispatchEvent(new GameRoundFailEvent("Wrong!"));
      await flush();

      assert.include(played, "fail-sound", "fail-sound should be played");
      assert.notInclude(
        played,
        "pass-sound",
        "pass-sound should NOT be played on fail",
      );
    });

    it("routes start trigger to samples with trigger='start'", async () => {
      document.body.innerHTML = `
	<game-shell rounds="5" between-delay="manual">
		<game-sample name="start-sound" trigger="start" type="marimba" notes="440:0"></game-sample>
		<div when-some-scene="playing"><div id="trigger"></div></div>
	</game-shell>
      `;
      await tick();
      const shell = document.querySelector("game-shell");

      let playCalled = false;
      document.querySelector("game-sample").play = function () {
        playCalled = true;
      };

      shell.start();
      await flush();

      assert.isTrue(playCalled, "start-sound should be played on game start");
    });

    it("trigger='fail' fires on timeout when no trigger='timeout' sample exists (back-compat)", async () => {
      document.body.innerHTML = `
			<game-shell rounds="5" between-delay="manual">
				<game-sample name="fail-sound" trigger="fail" type="marimba" notes="220:0"></game-sample>
				<div when-some-scene="playing"><div id="trigger"></div></div>
			</game-shell>
		`;
      await tick();
      const shell = document.querySelector("game-shell");

      let playCalled = false;
      document.querySelector("game-sample").play = function () {
        playCalled = true;
      };

      shell.start();
      await flush();

      document
        .querySelector("#trigger")
        .dispatchEvent(new GameRoundFailEvent("Out of time!"));
      await flush();

      assert.isTrue(
        playCalled,
        "fail-sound should fire on timeout when no timeout sample exists",
      );
    });

    it("trigger='fail' does NOT fire on timeout when trigger='timeout' sample exists", async () => {
      document.body.innerHTML = `
			<game-shell rounds="5" between-delay="manual">
				<game-sample name="fail-sound" trigger="fail" type="marimba" notes="220:0"></game-sample>
				<game-sample name="timeout-sound" trigger="timeout" type="marimba" notes="330:0"></game-sample>
				<div when-some-scene="playing"><div id="trigger"></div></div>
			</game-shell>
		`;
      await tick();
      const shell = document.querySelector("game-shell");

      const played = [];
      for (const s of document.querySelectorAll("game-sample")) {
        s.play = function () {
          played.push(s.name);
        };
      }

      shell.start();
      await flush();

      document
        .querySelector("#trigger")
        .dispatchEvent(new GameRoundFailEvent("Out of time!"));
      await flush();

      assert.include(played, "timeout-sound", "timeout-sound should fire");
      assert.notInclude(
        played,
        "fail-sound",
        "fail-sound should NOT fire on timeout when timeout sample exists",
      );
    });
  });

  describe("condition filtering", () => {
    it("sample with when-min-score only plays when score >= threshold", async () => {
      document.body.innerHTML = `
			<game-shell rounds="5" between-delay="manual">
				<game-sample name="bonus" trigger="pass" type="marimba" notes="880:0"
					when-min-score="5"></game-sample>
				<div when-some-scene="playing"><div id="trigger"></div></div>
			</game-shell>
		`;
      await tick();
      const shell = document.querySelector("game-shell");
      const sample = document.querySelector("game-sample");

      let playCalled = false;
      sample.play = function () {
        playCalled = true;
      };

      shell.start();
      await flush();

      document
        .querySelector("#trigger")
        .dispatchEvent(new GameRoundPassEvent(1, "Ok"));
      await flush();

      assert.isFalse(playCalled, "should NOT play when score < min-score");
    });
  });

  describe("value filtering", () => {
    it('sample with value="3" only plays when event data matches', async () => {
      document.body.innerHTML = `
			<game-shell rounds="5" between-delay="manual">
				<game-sample name="countdown-3" trigger="countdown" type="marimba"
					notes="440:0" value="3"></game-sample>
				<div when-some-scene="playing"><div id="trigger"></div></div>
			</game-shell>
		`;
      await tick();
      const shell = document.querySelector("game-shell");
      const sample = document.querySelector("game-sample");

      const playCalls = [];
      sample.play = function () {
        playCalls.push(1);
      };

      shell.start();
      await flush();

      shell.dispatchEvent(new GameTimerCountdownEvent(5));
      await flush();
      assert.equal(playCalls.length, 0, "should NOT play for seconds=5");

      shell.dispatchEvent(new GameTimerCountdownEvent(3));
      await flush();
      assert.equal(playCalls.length, 1, "should play for seconds=3");
    });
  });

  describe("scale-mode state reading", () => {
    it("reads shell state for scale-mode computation when no override", async () => {
      document.body.innerHTML = `
			<game-shell rounds="3" between-delay="manual" score-order="desc">
				<game-sample name="scale-s" trigger="pass" scale="major" notes="5"></game-sample>
				<div when-some-scene="playing"><div id="trigger"></div></div>
			</game-shell>
		`;
      await tick();
      const shell = document.querySelector("game-shell");
      const sample = document.querySelector("game-sample");

      shell.start();
      await flush();

      // Verify sample fires on pass (uses shell state internally)
      let playCalled = false;
      sample.play = function () {
        playCalled = true;
      };

      document
        .querySelector("#trigger")
        .dispatchEvent(new GameRoundPassEvent(10, "Good!"));
      await flush();

      assert.isTrue(playCalled, "scale-mode sample should fire on pass");
    });
  });

  describe("multiple samples same trigger", () => {
    it("fires all matching samples", async () => {
      document.body.innerHTML = `
			<game-shell rounds="5" between-delay="manual">
				<game-sample name="ding1" trigger="pass" type="marimba" notes="523:0"></game-sample>
				<game-sample name="ding2" trigger="pass" type="marimba" notes="659:0"></game-sample>
				<div when-some-scene="playing"><div id="trigger"></div></div>
			</game-shell>
		`;
      await tick();
      const shell = document.querySelector("game-shell");

      const played = [];
      for (const s of document.querySelectorAll("game-sample")) {
        s.play = function () {
          played.push(s.name);
        };
      }

      shell.start();
      await flush();

      document
        .querySelector("#trigger")
        .dispatchEvent(new GameRoundPassEvent(1, "Nice!"));
      await flush();

      assert.include(played, "ding1");
      assert.include(played, "ding2");
      assert.equal(played.length, 2);
    });
  });
});
