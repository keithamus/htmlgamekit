import { assert } from "@open-wc/testing";
import "../src/auto.js";
import {
  GameRoundPassEvent,
  GameRoundFailEvent,
  GameTimerExpiredEvent,
  GameStatUpdateEvent,
  GameCompleteEvent,
  GameNextRoundEvent,
  GameLifecycleEvent,
} from "../src/events.js";

const settle = () => new Promise((r) => setTimeout(r, 0));

async function createShell(attrs = 'rounds="3" between-delay="0"') {
  document.body.innerHTML = `<game-shell ${attrs}></game-shell>`;
  const shell = document.querySelector("game-shell");
  await settle(); // let #init() (queueMicrotask) run
  return shell;
}

describe("GameShell", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    localStorage.clear();
    sessionStorage.clear();
    history.replaceState(null, "", location.pathname);
  });

  // ── Initialization ──────────────────────────────────────────────────

  describe("initialization", () => {
    it("creates from document.createElement", () => {
      const el = document.createElement("game-shell");
      assert.equal(el.tagName.toLowerCase(), "game-shell");
    });

    it("scene signal starts as 'init' and transitions to 'ready' after init", async () => {
      document.body.innerHTML = '<game-shell rounds="3"></game-shell>';
      const shell = document.querySelector("game-shell");
      // Before microtask runs, scene is "init"
      assert.equal(shell.scene.get(), "init");
      await settle();
      assert.equal(shell.scene.get(), "ready");
    });

    it("rounds signal reflects the rounds attribute", async () => {
      const shell = await createShell('rounds="5" between-delay="0"');
      assert.equal(shell.rounds.get(), 5);
    });

    it("all signals have correct initial values", async () => {
      const shell = await createShell();
      assert.equal(shell.score.get(), 0);
      assert.equal(shell.round.get(), 0);
      assert.isNull(shell.lastRoundPassed.get());
      assert.isNull(shell.lastFeedback.get());
      assert.deepEqual(shell.roundScores.get(), []);
      assert.deepEqual(shell.stats.get(), {});
      assert.equal(shell.scoreOrder.get(), "asc");
    });

    it("transitions to 'demo' when demo attribute is present", async () => {
      const shell = await createShell('rounds="3" demo between-delay="0"');
      assert.equal(shell.scene.get(), "demo");
    });
  });

  // ── start() ─────────────────────────────────────────────────────────

  describe("start()", () => {
    it("sets scene to 'playing', round to 1, score to 0", async () => {
      const shell = await createShell();
      shell.start();
      assert.equal(shell.scene.get(), "playing");
      assert.equal(shell.round.get(), 1);
      assert.equal(shell.score.get(), 0);
    });

    it("clears localStorage for the storage key", async () => {
      const shell = await createShell('rounds="3" game-id="test-game" between-delay="0"');
      localStorage.setItem("test-game", JSON.stringify({ score: 99 }));
      shell.start();
      assert.isNull(localStorage.getItem("test-game"));
    });

    it("resets roundScores, lastRoundPassed, lastFeedback, and stats", async () => {
      const shell = await createShell();
      shell.start();
      assert.deepEqual(shell.roundScores.get(), []);
      assert.isNull(shell.lastRoundPassed.get());
      assert.isNull(shell.lastFeedback.get());
      assert.deepEqual(shell.stats.get(), {});
    });
  });

  // ── Round lifecycle ─────────────────────────────────────────────────

  describe("round lifecycle", () => {
    it("GameRoundPassEvent sets lastRoundPassed to true, increments score, adds to roundScores, sets scene to 'between'", async () => {
      const shell = await createShell();
      shell.start();
      await settle();

      shell.dispatchEvent(new GameRoundPassEvent(10, "Nice!"));
      assert.isTrue(shell.lastRoundPassed.get());
      assert.equal(shell.score.get(), 10);
      assert.deepEqual(shell.roundScores.get(), [10]);
      assert.equal(shell.lastFeedback.get(), "Nice!");
      assert.equal(shell.scene.get(), "between");
    });

    it("after between-delay=0, scene transitions to 'playing' and round increments", async () => {
      const shell = await createShell();
      shell.start();
      await settle();

      shell.dispatchEvent(new GameRoundPassEvent(5));
      // between-delay is 0, so the timer fires on next macrotask
      await settle();
      assert.equal(shell.scene.get(), "playing");
      assert.equal(shell.round.get(), 2);
    });

    it("GameRoundFailEvent with retry=false sets lastRoundPassed to false, adds 0 to roundScores, scene to 'between'", async () => {
      const shell = await createShell();
      shell.start();
      await settle();

      shell.dispatchEvent(new GameRoundFailEvent("Wrong", false));
      assert.isFalse(shell.lastRoundPassed.get());
      assert.deepEqual(shell.roundScores.get(), [0]);
      assert.equal(shell.lastFeedback.get(), "Wrong");
      assert.equal(shell.scene.get(), "between");
    });

    it("GameRoundFailEvent with retry=true does NOT change scene, just sets lastRoundPassed to false", async () => {
      const shell = await createShell();
      shell.start();
      await settle();

      shell.dispatchEvent(new GameRoundFailEvent("Try again", true));
      assert.isFalse(shell.lastRoundPassed.get());
      assert.equal(shell.lastFeedback.get(), "Try again");
      // Scene stays "playing" (no transition to between)
      assert.equal(shell.scene.get(), "playing");
      // roundScores should NOT have been updated
      assert.deepEqual(shell.roundScores.get(), []);
    });

    it("GameTimerExpiredEvent triggers a fail ('Time's up!')", async () => {
      const shell = await createShell();
      shell.start();
      await settle();

      shell.dispatchEvent(new GameTimerExpiredEvent());
      assert.isFalse(shell.lastRoundPassed.get());
      assert.equal(shell.lastFeedback.get(), "Time's up!");
      assert.equal(shell.scene.get(), "between");
    });
  });

  // ── Game completion ─────────────────────────────────────────────────

  describe("game completion", () => {
    it("when round >= rounds after a pass, scene goes to 'result'", async () => {
      const shell = await createShell('rounds="2" between-delay="0"');
      shell.start();
      await settle();

      // Round 1: pass
      shell.dispatchEvent(new GameRoundPassEvent(10));
      await settle();
      // Round 2: pass (should complete since round will equal rounds)
      assert.equal(shell.round.get(), 2);
      shell.dispatchEvent(new GameRoundPassEvent(10));
      assert.equal(shell.scene.get(), "result");
      assert.equal(shell.score.get(), 20);
    });

    it("GameCompleteEvent sets scene to 'result' with the event's score", async () => {
      const shell = await createShell();
      shell.start();
      await settle();

      shell.dispatchEvent(new GameCompleteEvent(999));
      assert.equal(shell.scene.get(), "result");
      assert.equal(shell.score.get(), 999);
    });
  });

  // ── Pause / Resume ──────────────────────────────────────────────────

  describe("pause / resume", () => {
    it("pause() during 'playing' sets scene to 'paused'", async () => {
      const shell = await createShell();
      shell.start();
      assert.equal(shell.scene.get(), "playing");
      shell.pause();
      assert.equal(shell.scene.get(), "paused");
    });

    it("resume() during 'paused' sets scene to 'playing'", async () => {
      const shell = await createShell();
      shell.start();
      shell.pause();
      assert.equal(shell.scene.get(), "paused");
      shell.resume();
      assert.equal(shell.scene.get(), "playing");
    });

    it("pause() during non-playing state is a no-op", async () => {
      const shell = await createShell();
      // scene is "ready" after init
      assert.equal(shell.scene.get(), "ready");
      shell.pause();
      assert.equal(shell.scene.get(), "ready");
    });

    it("resume() during non-paused state is a no-op", async () => {
      const shell = await createShell();
      shell.start();
      assert.equal(shell.scene.get(), "playing");
      shell.resume(); // already playing, not paused
      assert.equal(shell.scene.get(), "playing");
    });
  });

  // ── Stat updates ────────────────────────────────────────────────────

  describe("stat updates", () => {
    it("GameStatUpdateEvent updates the stats signal", async () => {
      const shell = await createShell();
      shell.start();
      await settle();

      shell.dispatchEvent(new GameStatUpdateEvent("streak", 5));
      assert.deepEqual(shell.stats.get(), { streak: 5 });

      shell.dispatchEvent(new GameStatUpdateEvent("combo", 3));
      assert.deepEqual(shell.stats.get(), { streak: 5, combo: 3 });
    });
  });

  // ── Commands (Invoker API) ──────────────────────────────────────────

  describe("commands (Invoker API)", () => {
    it("--start command calls start()", async () => {
      const shell = await createShell();
      assert.equal(shell.scene.get(), "ready");
      shell.dispatchEvent(new Event("command", { bubbles: true }));
      // command event without a matching command is ignored
      assert.equal(shell.scene.get(), "ready");

      // Now dispatch a proper command event
      const evt = new Event("command");
      evt.command = "--start";
      shell.dispatchEvent(evt);
      assert.equal(shell.scene.get(), "playing");
      assert.equal(shell.round.get(), 1);
    });

    it("--pause command calls pause()", async () => {
      const shell = await createShell();
      shell.start();
      const evt = new Event("command");
      evt.command = "--pause";
      shell.dispatchEvent(evt);
      assert.equal(shell.scene.get(), "paused");
    });

    it("--resume command calls resume()", async () => {
      const shell = await createShell();
      shell.start();
      shell.pause();
      const evt = new Event("command");
      evt.command = "--resume";
      shell.dispatchEvent(evt);
      assert.equal(shell.scene.get(), "playing");
    });

    it("--next-round during 'between' advances to next round", async () => {
      const shell = await createShell('rounds="5" between-delay="9999"');
      shell.start();
      await settle();

      shell.dispatchEvent(new GameRoundPassEvent(10));
      assert.equal(shell.scene.get(), "between");

      const evt = new Event("command");
      evt.command = "--next-round";
      shell.dispatchEvent(evt);
      assert.equal(shell.scene.get(), "playing");
      assert.equal(shell.round.get(), 2);
    });
  });

  // ── Lifecycle events ────────────────────────────────────────────────

  describe("lifecycle events", () => {
    it("GameLifecycleEvent is dispatched on scene changes", async () => {
      const shell = await createShell();
      const events = [];
      shell.addEventListener("game-lifecycle", (e) => {
        events.push(e.action);
      });

      shell.start();
      await settle(); // let effects flush

      assert.include(events, "playing");
    });
  });

  // ── score-order ─────────────────────────────────────────────────────

  describe("score-order", () => {
    it('score-order="asc" (default) sums round scores', async () => {
      const shell = await createShell('rounds="3" between-delay="0"');
      shell.start();
      await settle();

      shell.dispatchEvent(new GameRoundPassEvent(10));
      assert.equal(shell.score.get(), 10);
      await settle();

      shell.dispatchEvent(new GameRoundPassEvent(20));
      assert.equal(shell.score.get(), 30);
    });

    it('score-order="desc" counts the number of truthy round scores (passes)', async () => {
      const shell = await createShell('rounds="4" score-order="desc" between-delay="0"');
      shell.start();
      await settle();

      shell.dispatchEvent(new GameRoundPassEvent(10));
      assert.equal(shell.score.get(), 1);
      await settle();

      shell.dispatchEvent(new GameRoundPassEvent(20));
      assert.equal(shell.score.get(), 2);
      await settle();

      // A fail adds 0 to roundScores — falsy, so not counted
      shell.dispatchEvent(new GameRoundFailEvent("wrong", false));
      assert.equal(shell.score.get(), 2); // still 2
    });
  });

  // ── IDL property reflection ──────────────────────────────────────────

  describe("IDL property reflection", () => {
    it("game-id: default, attr→prop, prop→attr", () => {
      const el = document.createElement("game-shell");
      // default
      assert.equal(el.gameIdAttr, "");
      // attr→prop
      el.setAttribute("game-id", "my-game");
      assert.equal(el.gameIdAttr, "my-game");
      // prop→attr
      el.gameIdAttr = "other";
      assert.equal(el.getAttribute("game-id"), "other");
    });

    it("rounds: default, attr→prop, prop→attr", () => {
      const el = document.createElement("game-shell");
      // default
      assert.equal(el.roundsAttr, 0);
      // attr→prop
      el.setAttribute("rounds", "7");
      assert.equal(el.roundsAttr, 7);
      // prop→attr
      el.roundsAttr = 12;
      assert.equal(el.getAttribute("rounds"), "12");
    });

    it("score-order: default, attr→prop, prop→attr, invalid returns asc", () => {
      const el = document.createElement("game-shell");
      // default (missing → asc)
      assert.equal(el.scoreOrderAttr, "asc");
      // attr→prop
      el.setAttribute("score-order", "desc");
      assert.equal(el.scoreOrderAttr, "desc");
      // prop→attr
      el.scoreOrderAttr = "asc";
      assert.equal(el.getAttribute("score-order"), "asc");
      // invalid value → asc
      el.setAttribute("score-order", "bogus");
      assert.equal(el.scoreOrderAttr, "asc");
    });

    it("between-delay: default, attr→prop, prop→attr", () => {
      const el = document.createElement("game-shell");
      // default
      assert.equal(el.betweenDelayAttr, "500");
      // attr→prop
      el.setAttribute("between-delay", "1000");
      assert.equal(el.betweenDelayAttr, "1000");
      // prop→attr
      el.betweenDelayAttr = "250";
      assert.equal(el.getAttribute("between-delay"), "250");
    });

    it("score-url: default is null, attr→prop, prop→attr", () => {
      const el = document.createElement("game-shell");
      // default
      assert.isNull(el.scoreUrl);
      // attr→prop
      el.setAttribute("score-url", "https://example.com");
      assert.equal(el.scoreUrl, "https://example.com");
      // prop→attr (set string)
      el.scoreUrl = "https://other.com";
      assert.equal(el.getAttribute("score-url"), "https://other.com");
      // prop→attr (set null removes attribute)
      el.scoreUrl = null;
      assert.isFalse(el.hasAttribute("score-url"));
    });

    it("scenes: default is null, attr→prop, prop→attr", () => {
      const el = document.createElement("game-shell");
      // default
      assert.isNull(el.scenes);
      // attr→prop
      el.setAttribute("scenes", "intro playing result");
      assert.equal(el.scenes, "intro playing result");
      // prop→attr (set string)
      el.scenes = "playing result";
      assert.equal(el.getAttribute("scenes"), "playing result");
      // prop→attr (set null removes attribute)
      el.scenes = null;
      assert.isFalse(el.hasAttribute("scenes"));
    });

    it("storage-key: default is null, attr→prop, prop→attr", () => {
      const el = document.createElement("game-shell");
      // default
      assert.isNull(el.storageKeyAttr);
      // attr→prop
      el.setAttribute("storage-key", "my-key");
      assert.equal(el.storageKeyAttr, "my-key");
      // prop→attr (set string)
      el.storageKeyAttr = "other-key";
      assert.equal(el.getAttribute("storage-key"), "other-key");
      // prop→attr (set null removes attribute)
      el.storageKeyAttr = null;
      assert.isFalse(el.hasAttribute("storage-key"));
    });

    it("sprite-sheet: default is null, attr→prop, prop→attr", () => {
      const el = document.createElement("game-shell");
      // default
      assert.isNull(el.spriteSheetAttr);
      // attr→prop
      el.setAttribute("sprite-sheet", "sprites.png");
      assert.equal(el.spriteSheetAttr, "sprites.png");
      // prop→attr (set string)
      el.spriteSheetAttr = "other.png";
      assert.equal(el.getAttribute("sprite-sheet"), "other.png");
      // prop→attr (set null removes attribute)
      el.spriteSheetAttr = null;
      assert.isFalse(el.hasAttribute("sprite-sheet"));
    });

    it("session-save: default is false, attr→prop, prop→attr", () => {
      const el = document.createElement("game-shell");
      // default
      assert.isFalse(el.sessionSave);
      // attr→prop
      el.setAttribute("session-save", "");
      assert.isTrue(el.sessionSave);
      // prop→attr (set false removes attribute)
      el.sessionSave = false;
      assert.isFalse(el.hasAttribute("session-save"));
      // prop→attr (set true adds attribute)
      el.sessionSave = true;
      assert.isTrue(el.hasAttribute("session-save"));
    });

    it("demo: default is false, attr→prop, prop→attr", () => {
      const el = document.createElement("game-shell");
      // default
      assert.isFalse(el.demo);
      // attr→prop
      el.setAttribute("demo", "");
      assert.isTrue(el.demo);
      // prop→attr (set false removes attribute)
      el.demo = false;
      assert.isFalse(el.hasAttribute("demo"));
      // prop→attr (set true adds attribute)
      el.demo = true;
      assert.isTrue(el.hasAttribute("demo"));
    });
  });
});
