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
  await settle();
  return shell;
}

describe("GameShell", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    localStorage.clear();
    sessionStorage.clear();
    history.replaceState(null, "", location.pathname);
  });

  describe("initialization", () => {
    it("scene signal starts as 'init' and transitions to 'ready' after init", async () => {
      document.body.innerHTML = '<game-shell rounds="3"></game-shell>';
      const shell = document.querySelector("game-shell");
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

  describe("start()", () => {
    it("sets scene to 'playing', round to 1, score to 0", async () => {
      const shell = await createShell();
      shell.start();
      assert.equal(shell.scene.get(), "playing");
      assert.equal(shell.round.get(), 1);
      assert.equal(shell.score.get(), 0);
    });

    it("clears localStorage for the storage key", async () => {
      const shell = await createShell(
        'rounds="3" game-id="test-game" between-delay="0"',
      );
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
      assert.equal(shell.scene.get(), "playing");
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

  describe("game completion", () => {
    it("when round >= rounds after a pass, scene goes to 'result'", async () => {
      const shell = await createShell('rounds="2" between-delay="0"');
      shell.start();
      await settle();

      shell.dispatchEvent(new GameRoundPassEvent(10));
      await settle();
      assert.equal(shell.round.get(), 2);
      shell.dispatchEvent(new GameRoundPassEvent(10));
      await settle();
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
      assert.equal(shell.scene.get(), "ready");
      shell.pause();
      assert.equal(shell.scene.get(), "ready");
    });

    it("resume() during non-paused state is a no-op", async () => {
      const shell = await createShell();
      shell.start();
      assert.equal(shell.scene.get(), "playing");
      shell.resume();
      assert.equal(shell.scene.get(), "playing");
    });
  });

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

  describe("commands (Invoker API)", () => {
    it("--start command calls start()", async () => {
      const shell = await createShell();
      assert.equal(shell.scene.get(), "ready");
      shell.dispatchEvent(new Event("command", { bubbles: true }));
      assert.equal(shell.scene.get(), "ready");

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

  describe("lifecycle events", () => {
    it("GameLifecycleEvent is dispatched on scene changes", async () => {
      const shell = await createShell();
      const events = [];
      shell.addEventListener("game-lifecycle", (e) => {
        events.push(e.action);
      });

      shell.start();
      await settle();

      assert.include(events, "playing");
    });
  });

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
      const shell = await createShell(
        'rounds="4" score-order="desc" between-delay="0"',
      );
      shell.start();
      await settle();

      shell.dispatchEvent(new GameRoundPassEvent(10));
      assert.equal(shell.score.get(), 1);
      await settle();

      shell.dispatchEvent(new GameRoundPassEvent(20));
      assert.equal(shell.score.get(), 2);
      await settle();

      shell.dispatchEvent(new GameRoundFailEvent("wrong", false));
      assert.equal(shell.score.get(), 2);
    });
  });

  describe("attribute defaults", () => {
    it("numeric and boolean defaults", () => {
      const el = document.createElement("game-shell");
      assert.equal(el.gameIdAttr, "");
      assert.equal(el.roundsAttr, 0);
      assert.equal(el.scoreOrderAttr, "asc");
      assert.equal(el.betweenDelayAttr, "500");
      assert.isFalse(el.sessionSave);
      assert.isFalse(el.demo);
    });

    it("nullable defaults are null", () => {
      const el = document.createElement("game-shell");
      assert.isNull(el.scoreUrl);
      assert.isNull(el.scenes);
      assert.isNull(el.storageKeyAttr);
      assert.isNull(el.spriteSheetAttr);
    });

    it("score-order rejects unknown values and falls back to asc", () => {
      const el = document.createElement("game-shell");
      el.setAttribute("score-order", "bogus");
      assert.equal(el.scoreOrderAttr, "asc");
    });
  });

  describe("command --stat", () => {
    it("sets a stat from button value", async () => {
      document.body.innerHTML = `
        <game-shell game-id="cmd-stat" rounds="1">
          <button id="btn" commandfor="cmd-stat-shell" command="--stat" value="room:reception">Go</button>
        </game-shell>
      `;
      const shell = document.querySelector("game-shell");
      shell.id = "cmd-stat-shell";
      await settle();

      shell.dispatchEvent(
        new CommandEvent("command", {
          command: "--stat",
          source: document.getElementById("btn"),
        }),
      );
      assert.equal(shell.stats.get().room, "reception");
    });

    it("preserves existing stats when setting a new one", async () => {
      const shell = await createShell('game-id="cmd-stat-merge" rounds="1"');
      shell.stats.set({ existing: "yes" });

      const btn = document.createElement("button");
      btn.value = "room:lobby";
      shell.dispatchEvent(
        new CommandEvent("command", { command: "--stat", source: btn }),
      );
      assert.equal(shell.stats.get().existing, "yes");
      assert.equal(shell.stats.get().room, "lobby");
    });
  });

  describe("command --collect / --uncollect", () => {
    it("--collect adds to a collection", async () => {
      const shell = await createShell('game-id="cmd-collect" rounds="1"');
      const btn = document.createElement("button");
      btn.value = "inventory:sword";
      shell.dispatchEvent(
        new CommandEvent("command", { command: "--collect", source: btn }),
      );
      assert.isTrue(shell.hasInCollection("inventory", "sword"));
    });

    it("--uncollect removes from a collection", async () => {
      const shell = await createShell('game-id="cmd-uncollect" rounds="1"');
      shell.addToCollection("inventory", "shield");
      assert.isTrue(shell.hasInCollection("inventory", "shield"));

      const btn = document.createElement("button");
      btn.value = "inventory:shield";
      shell.dispatchEvent(
        new CommandEvent("command", { command: "--uncollect", source: btn }),
      );
      assert.isFalse(shell.hasInCollection("inventory", "shield"));
    });
  });
});
