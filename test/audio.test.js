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

describe("game-audio", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    localStorage.clear();
    sessionStorage.clear();
    history.replaceState(null, "", location.pathname);
  });

  it("muted and vibration default to false; volume defaults to 1", () => {
    const el = document.createElement("game-audio");
    assert.isFalse(el.muted);
    assert.isFalse(el.vibration);
    assert.equal(el.volume, 1);
  });

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

      assert.isFalse(
        playCalled,
        "play should NOT be called when audio is muted",
      );
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
      sample.play = function () {
        playCalled = true;
      };

      shell.start();
      await flush();

      document
        .querySelector("#trigger")
        .dispatchEvent(new GameRoundPassEvent(1, "Nice!"));
      await flush();

      assert.isTrue(
        playCalled,
        "play should be called when audio is not muted",
      );
      sample.play = origPlay;
    });
  });

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
        s.play = function () {
          played.push(s.name);
        };
      }

      shell.start();
      await flush();

      document
        .querySelector("#trigger")
        .dispatchEvent(new GameRoundPassEvent(1, "Correct!"));
      await flush();

      assert.include(played, "pass-sound", "pass-sound should be played");
      assert.notInclude(
        played,
        "fail-sound",
        "fail-sound should NOT be played on pass",
      );
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
          <game-audio>
            <game-sample name="start-sound" trigger="start" type="marimba" notes="440:0"></game-sample>
          </game-audio>
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
  });

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

  describe("play() method", () => {
    it("plays the named sample", () => {
      const audio = document.createElement("game-audio");
      const sample = document.createElement("game-sample");
      sample.setAttribute("name", "click");
      sample.setAttribute("type", "marimba");
      sample.setAttribute("notes", "440:0");
      audio.appendChild(sample);

      let playState = null;
      sample.play = function (state) {
        playState = state;
      };

      audio.play("click");
      assert.isNotNull(playState, "sample.play should have been called");
    });

    it("does nothing when no sample matches the name", () => {
      const audio = document.createElement("game-audio");
      const sample = document.createElement("game-sample");
      sample.setAttribute("name", "click");
      audio.appendChild(sample);

      let playCalled = false;
      sample.play = function () {
        playCalled = true;
      };

      audio.play("nonexistent");
      assert.isFalse(playCalled);
    });

    it("passes state argument to sample.play", () => {
      const audio = document.createElement("game-audio");
      const sample = document.createElement("game-sample");
      sample.setAttribute("name", "ding");
      audio.appendChild(sample);

      let receivedState = null;
      sample.play = function (state) {
        receivedState = state;
      };

      const mockState = { score: 10, round: 2 };
      audio.play("ding", mockState);
      assert.deepEqual(receivedState, mockState);
    });
  });

  describe("scale mode trigger path", () => {
    it("passes shell state snapshot to scale-mode sample.play() from triggerCallback", async () => {
      document.body.innerHTML = `
        <game-shell rounds="3" between-delay="manual" score-order="desc">
          <game-audio>
            <game-sample name="scale-sound" trigger="pass"
              scale="pentatonic" notes="5"></game-sample>
          </game-audio>
          <div when-some-scene="playing"><div id="trigger"></div></div>
        </game-shell>
      `;
      await tick();
      const shell = document.querySelector("game-shell");
      const sample = document.querySelector("game-sample");

      let receivedState = undefined;
      const origPlay = sample.play.bind(sample);
      sample.play = function (state) {
        receivedState = state;
      };

      shell.start();
      await flush();

      document
        .querySelector("#trigger")
        .dispatchEvent(new GameRoundPassEvent(2, "Nice!"));
      await flush();

      assert.isNotNull(
        receivedState,
        "scale sample.play should receive a state object",
      );
      assert.property(
        receivedState,
        "roundScores",
        "state should include roundScores",
      );
      assert.property(receivedState, "rounds", "state should include rounds");
      assert.property(
        receivedState,
        "scoreOrder",
        "state should include scoreOrder",
      );
    });

    it("state passed to scale sample reflects current shell signal values", async () => {
      document.body.innerHTML = `
        <game-shell rounds="3" between-delay="manual" score-order="asc">
          <game-audio>
            <game-sample name="scale-s" trigger="pass" scale="major" notes="5"></game-sample>
          </game-audio>
          <div when-some-scene="playing"><div id="trigger"></div></div>
        </game-shell>
      `;
      await tick();
      const shell = document.querySelector("game-shell");
      const sample = document.querySelector("game-sample");

      let receivedState = null;
      sample.play = function (state) {
        receivedState = state;
      };

      shell.start();
      await flush();

      document
        .querySelector("#trigger")
        .dispatchEvent(new GameRoundPassEvent(10, "Good!"));
      await flush();

      assert.equal(receivedState.rounds, 3, "rounds should match shell.rounds");
      assert.equal(
        receivedState.scoreOrder,
        "asc",
        "scoreOrder should match shell.scoreOrder",
      );
      assert.isArray(
        receivedState.roundScores,
        "roundScores should be an array",
      );
    });
  });

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

describe("game-sample", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    localStorage.clear();
    sessionStorage.clear();
    history.replaceState(null, "", location.pathname);
  });

  it("type, duration, notes, scale, value default to null; gain to 0.35; vibrate to auto; scaleRoot to 220; scaleSpacing to 0.1", () => {
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
});
