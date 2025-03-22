import { assert } from "@open-wc/testing";
import {
  detectStateTriggers,
  STATE_TRIGGERS,
  DOM_TRIGGERS,
} from "../src/triggers.js";

describe("triggers", () => {
  describe("detectStateTriggers", () => {
    const noTimeout = () => false;
    const hasTimeout = () => true;

    it('"start" fires when scene goes to "playing" from "ready"', () => {
      const { triggers } = detectStateTriggers(
        { scene: "playing" },
        "ready",
        -1,
        noTimeout,
      );
      assert.include(triggers, "start");
      assert.include(triggers, "round");
    });

    it('"start" fires when scene goes to "playing" from "result"', () => {
      const { triggers } = detectStateTriggers(
        { scene: "playing" },
        "result",
        -1,
        noTimeout,
      );
      assert.include(triggers, "start");
      assert.include(triggers, "round");
    });

    it('"start" does NOT fire when scene goes to "playing" from "between"', () => {
      const { triggers } = detectStateTriggers(
        { scene: "playing" },
        "between",
        -1,
        noTimeout,
      );
      assert.notInclude(triggers, "start");
      assert.include(triggers, "round");
    });

    it('"round" fires on every transition to "playing"', () => {
      for (const prev of ["ready", "result", "between"]) {
        const { triggers } = detectStateTriggers(
          { scene: "playing" },
          prev,
          -1,
          noTimeout,
        );
        assert.include(triggers, "round", `should fire "round" from "${prev}"`);
      }
    });

    it('"pass" fires when scene goes to "between" with lastRoundPassed true', () => {
      const { triggers } = detectStateTriggers(
        { scene: "between", lastRoundPassed: true },
        "playing",
        -1,
        noTimeout,
      );
      assert.include(triggers, "pass");
      assert.notInclude(triggers, "fail");
    });

    it('"fail" fires when scene goes to "between" with lastRoundPassed false', () => {
      const { triggers } = detectStateTriggers(
        { scene: "between", lastRoundPassed: false },
        "playing",
        -1,
        noTimeout,
      );
      assert.include(triggers, "fail");
      assert.notInclude(triggers, "pass");
    });

    it('"timeout" fires when feedback contains "time" and hasTimeoutChild returns true', () => {
      const { triggers } = detectStateTriggers(
        {
          scene: "between",
          lastRoundPassed: false,
          lastFeedback: "Out of time!",
        },
        "playing",
        -1,
        hasTimeout,
      );
      assert.include(triggers, "timeout");
      assert.notInclude(triggers, "fail");
    });

    it('"timeout" falls back to "fail" when hasTimeoutChild returns false', () => {
      const { triggers } = detectStateTriggers(
        {
          scene: "between",
          lastRoundPassed: false,
          lastFeedback: "Out of time!",
        },
        "playing",
        -1,
        noTimeout,
      );
      assert.include(triggers, "fail");
      assert.notInclude(triggers, "timeout");
    });

    it('"complete" fires when scene goes to "result"', () => {
      const { triggers } = detectStateTriggers(
        { scene: "result" },
        "playing",
        -1,
        noTimeout,
      );
      assert.include(triggers, "complete");
    });

    it('"tier-up" fires when tierIndex increases', () => {
      const { triggers, tierIndex } = detectStateTriggers(
        { scene: "playing", difficulty: { tierIndex: 2 } },
        "playing",
        1,
        noTimeout,
      );
      assert.include(triggers, "tier-up");
      assert.equal(tierIndex, 2);
    });

    it("no triggers fire when scene does not change", () => {
      const { triggers } = detectStateTriggers(
        { scene: "playing" },
        "playing",
        -1,
        noTimeout,
      );
      assert.isEmpty(triggers);
    });

    it("returns previous tierIndex when difficulty is absent", () => {
      const { tierIndex } = detectStateTriggers(
        { scene: "playing" },
        "ready",
        5,
        noTimeout,
      );
      assert.equal(tierIndex, 5);
    });
  });

  describe("exports", () => {
    it("STATE_TRIGGERS contains expected trigger names", () => {
      assert.deepEqual(STATE_TRIGGERS, [
        "start",
        "round",
        "pass",
        "fail",
        "timeout",
        "complete",
        "tier-up",
      ]);
    });

    it("DOM_TRIGGERS maps trigger names to event types", () => {
      assert.equal(DOM_TRIGGERS.input, "game-tile-input");
      assert.equal(DOM_TRIGGERS.countdown, "game-timer-countdown");
      assert.equal(DOM_TRIGGERS.keydown, "keydown");
      assert.equal(DOM_TRIGGERS.keyup, "keyup");
      assert.equal(DOM_TRIGGERS.click, "click");
      assert.equal(DOM_TRIGGERS.pointerdown, "pointerdown");
      assert.equal(DOM_TRIGGERS.pointerup, "pointerup");
    });
  });
});
