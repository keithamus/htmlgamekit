import { assert } from "@open-wc/testing";
import {
  GameRoundPassEvent,
  GameRoundFailEvent,
  GameTimerTickEvent,
  GameTimerExpiredEvent,
  GameTimerCountdownEvent,
  GameStatUpdateEvent,
  GameLifecycleEvent,
  GameStartRequestEvent,
  GameRestartRequestEvent,
  GameCompleteEvent,
  GamePauseRequestEvent,
  GameResumeRequestEvent,
  GameNextRoundEvent,
  GameTileInputEvent,
  GameTileSubmitEvent,
} from "../src/events.js";

function assertBubblesAndComposed(event) {
  assert.isTrue(event.bubbles, "event should bubble");
  assert.isTrue(event.composed, "event should be composed");
}

describe("events", () => {
  describe("GameRoundPassEvent", () => {
    it("has correct type, bubbles, composed, and properties", () => {
      const e = new GameRoundPassEvent(10, "Great!");
      assert.equal(e.type, "game-round-pass");
      assertBubblesAndComposed(e);
      assert.equal(e.score, 10);
      assert.equal(e.feedback, "Great!");
    });
  });

  describe("GameRoundFailEvent", () => {
    it("has correct type, bubbles, composed, and properties", () => {
      const e = new GameRoundFailEvent("wrong answer", true);
      assert.equal(e.type, "game-round-fail");
      assertBubblesAndComposed(e);
      assert.equal(e.reason, "wrong answer");
      assert.isTrue(e.retry);
    });

    it("defaults retry to false", () => {
      const e = new GameRoundFailEvent("oops");
      assert.isFalse(e.retry);
    });
  });

  describe("GameTimerTickEvent", () => {
    it("has correct type, bubbles, composed, and properties", () => {
      const e = new GameTimerTickEvent(5.5, 0.55);
      assert.equal(e.type, "game-timer-tick");
      assertBubblesAndComposed(e);
      assert.equal(e.remaining, 5.5);
      assert.equal(e.fraction, 0.55);
    });
  });

  describe("GameTimerExpiredEvent", () => {
    it("has correct type, bubbles, composed", () => {
      const e = new GameTimerExpiredEvent();
      assert.equal(e.type, "game-timer-expired");
      assertBubblesAndComposed(e);
    });
  });

  describe("GameTimerCountdownEvent", () => {
    it("has correct type, bubbles, composed, and properties", () => {
      const e = new GameTimerCountdownEvent(3);
      assert.equal(e.type, "game-timer-countdown");
      assertBubblesAndComposed(e);
      assert.equal(e.seconds, 3);
    });
  });

  describe("GameStatUpdateEvent", () => {
    it("has correct type, bubbles, composed, and properties", () => {
      const e = new GameStatUpdateEvent("streak", 5);
      assert.equal(e.type, "game-stat-update");
      assertBubblesAndComposed(e);
      assert.equal(e.key, "streak");
      assert.equal(e.value, 5);
    });
  });

  describe("GameLifecycleEvent", () => {
    it("has correct type, bubbles, composed, and properties", () => {
      const state = { scene: "playing", round: 2 };
      const e = new GameLifecycleEvent("start", state);
      assert.equal(e.type, "game-lifecycle");
      assertBubblesAndComposed(e);
      assert.equal(e.action, "start");
      assert.deepEqual(e.state, state);
      assert.equal(e.scene, "playing");
    });
  });

  describe("GameStartRequestEvent", () => {
    it("has correct type, bubbles, composed", () => {
      const e = new GameStartRequestEvent();
      assert.equal(e.type, "game-start-request");
      assertBubblesAndComposed(e);
    });
  });

  describe("GameRestartRequestEvent", () => {
    it("has correct type, bubbles, composed", () => {
      const e = new GameRestartRequestEvent();
      assert.equal(e.type, "game-restart-request");
      assertBubblesAndComposed(e);
    });
  });

  describe("GameCompleteEvent", () => {
    it("has correct type, bubbles, composed, and properties", () => {
      const e = new GameCompleteEvent(100);
      assert.equal(e.type, "game-complete");
      assertBubblesAndComposed(e);
      assert.equal(e.score, 100);
    });
  });

  describe("GamePauseRequestEvent", () => {
    it("has correct type, bubbles, composed", () => {
      const e = new GamePauseRequestEvent();
      assert.equal(e.type, "game-pause-request");
      assertBubblesAndComposed(e);
    });
  });

  describe("GameResumeRequestEvent", () => {
    it("has correct type, bubbles, composed", () => {
      const e = new GameResumeRequestEvent();
      assert.equal(e.type, "game-resume-request");
      assertBubblesAndComposed(e);
    });
  });

  describe("GameNextRoundEvent", () => {
    it("has correct type, bubbles, composed", () => {
      const e = new GameNextRoundEvent();
      assert.equal(e.type, "game-next-round");
      assertBubblesAndComposed(e);
    });
  });

  describe("GameTileInputEvent", () => {
    it("has correct type, bubbles, composed, and properties", () => {
      const e = new GameTileInputEvent("A", 3);
      assert.equal(e.type, "game-tile-input");
      assertBubblesAndComposed(e);
      assert.equal(e.value, "A");
      assert.equal(e.position, 3);
    });
  });

  describe("GameTileSubmitEvent", () => {
    it("has correct type, bubbles, composed, and properties", () => {
      const e = new GameTileSubmitEvent("HELLO");
      assert.equal(e.type, "game-tile-submit");
      assertBubblesAndComposed(e);
      assert.equal(e.value, "HELLO");
    });
  });
});
