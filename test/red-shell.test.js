import { assert } from "@open-wc/testing";
import "../src/auto.js";
import {
  GameRoundPassEvent,
  GameRoundFailEvent,
  GameTimerExpiredEvent,
  GameCompleteEvent,
  GameLifecycleEvent,
} from "../src/events.js";

const tick = () => new Promise((r) => setTimeout(r, 0));
const microtask = () => new Promise((r) => queueMicrotask(r));

describe("game-shell red-team", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    localStorage.clear();
    sessionStorage.clear();
    history.replaceState(null, "", location.pathname);
  });

  it('handles game-round-pass during "between" scene', async () => {
    document.body.innerHTML =
      '<game-shell rounds="5" between-delay="manual"></game-shell>';
    const shell = document.querySelector("game-shell");
    await tick();
    shell.start();
    await microtask();

    shell.dispatchEvent(new GameRoundPassEvent(10, "OK"));
    await microtask();
    assert.equal(shell.scene.get(), "between");
    const scoreAfterFirst = shell.score.get();
    const roundScoresLen = shell.roundScores.get().length;

    shell.dispatchEvent(new GameRoundPassEvent(5, "Phantom"));
    await microtask();
    assert.equal(
      shell.roundScores.get().length,
      roundScoresLen,
      "phantom round-pass is ignored during between scene",
    );
    assert.equal(
      shell.score.get(),
      scoreAfterFirst,
      "score unchanged from phantom round-pass",
    );
  });

  it('handles game-round-pass during "result" scene', async () => {
    document.body.innerHTML =
      '<game-shell rounds="5" between-delay="manual"></game-shell>';
    const shell = document.querySelector("game-shell");
    await tick();
    shell.start();
    await microtask();

    shell.dispatchEvent(new GameCompleteEvent(50));
    await microtask();
    assert.equal(shell.scene.get(), "result");
    const scoreAtResult = shell.score.get();
    const roundScoresLen = shell.roundScores.get().length;

    shell.dispatchEvent(new GameRoundPassEvent(99, "Ghost"));
    await microtask();
    assert.equal(
      shell.roundScores.get().length,
      roundScoresLen,
      "phantom round-pass is ignored during result scene",
    );
    assert.equal(
      shell.scene.get(),
      "result",
      "scene stays at result after phantom pass",
    );
  });

  it('handles game-timer-expired during "between" scene', async () => {
    document.body.innerHTML =
      '<game-shell rounds="5" between-delay="manual"></game-shell>';
    const shell = document.querySelector("game-shell");
    await tick();
    shell.start();
    await microtask();

    shell.dispatchEvent(new GameRoundPassEvent(10, "OK"));
    await microtask();
    assert.equal(shell.scene.get(), "between");
    const roundScoresLen = shell.roundScores.get().length;

    shell.dispatchEvent(new GameTimerExpiredEvent());
    await microtask();
    assert.equal(
      shell.roundScores.get().length,
      roundScoresLen,
      "timer-expired is ignored during between scene",
    );
  });

  it('handles game-timer-expired during "result" scene', async () => {
    document.body.innerHTML =
      '<game-shell rounds="5" between-delay="manual"></game-shell>';
    const shell = document.querySelector("game-shell");
    await tick();
    shell.start();
    await microtask();

    shell.dispatchEvent(new GameCompleteEvent(50));
    await microtask();
    assert.equal(shell.scene.get(), "result");
    const roundScoresLen = shell.roundScores.get().length;

    shell.dispatchEvent(new GameTimerExpiredEvent());
    await microtask();
    assert.equal(
      shell.roundScores.get().length,
      roundScoresLen,
      "timer-expired is ignored during result scene",
    );
    assert.equal(
      shell.scene.get(),
      "result",
      "scene stays at result after timer-expired",
    );
  });

  it("start() during between with pending timer causes race", async () => {
    document.body.innerHTML =
      '<game-shell rounds="5" between-delay="50"></game-shell>';
    const shell = document.querySelector("game-shell");
    await tick();
    shell.start();
    await microtask();

    shell.dispatchEvent(new GameRoundPassEvent(10));
    await microtask();
    assert.equal(shell.scene.get(), "between");

    shell.start();
    assert.equal(shell.round.get(), 1);
    assert.equal(shell.scene.get(), "playing");

    await new Promise((r) => setTimeout(r, 80));

    assert.equal(
      shell.round.get(),
      1,
      "stale between timer was cleared by start(), round stays at 1",
    );
  });

  it("double start() rapid fire produces consistent state", async () => {
    document.body.innerHTML =
      '<game-shell rounds="5" between-delay="0"></game-shell>';
    const shell = document.querySelector("game-shell");
    await tick();

    shell.start();
    shell.start();
    await microtask();

    assert.equal(shell.scene.get(), "playing");
    assert.equal(shell.round.get(), 1);
    assert.equal(shell.score.get(), 0);
    assert.deepEqual(shell.roundScores.get(), []);
  });

  it("pause() during non-playing state is a no-op", async () => {
    document.body.innerHTML =
      '<game-shell rounds="5" between-delay="0"></game-shell>';
    const shell = document.querySelector("game-shell");
    await tick();

    assert.equal(shell.scene.get(), "ready");
    shell.pause();
    assert.equal(shell.scene.get(), "ready", "pause during ready is a no-op");

    shell.start();
    await microtask();
    shell.dispatchEvent(new GameRoundPassEvent(10));
    await microtask();
    document.body.innerHTML = "";
    document.body.innerHTML =
      '<game-shell rounds="5" between-delay="manual"></game-shell>';
    const shell2 = document.querySelector("game-shell");
    await tick();
    shell2.start();
    await microtask();
    shell2.dispatchEvent(new GameRoundPassEvent(10));
    await microtask();
    assert.equal(shell2.scene.get(), "between");
    shell2.pause();
    assert.equal(
      shell2.scene.get(),
      "between",
      "pause during between is a no-op",
    );
  });

  it("resume() during non-paused state is a no-op", async () => {
    document.body.innerHTML =
      '<game-shell rounds="5" between-delay="0"></game-shell>';
    const shell = document.querySelector("game-shell");
    await tick();

    assert.equal(shell.scene.get(), "ready");
    shell.resume();
    assert.equal(shell.scene.get(), "ready", "resume during ready is a no-op");

    shell.start();
    assert.equal(shell.scene.get(), "playing");
    shell.resume();
    assert.equal(
      shell.scene.get(),
      "playing",
      "resume during playing is a no-op",
    );
  });

  it("survives tampered sessionStorage with invalid scene", async () => {
    sessionStorage.setItem(
      "-session",
      JSON.stringify({
        scene: "hacked",
        round: 1,
        score: 999,
      }),
    );
    assert.isNotNull(
      sessionStorage.getItem("-session"),
      "precondition: key is set",
    );
    document.body.innerHTML = "<game-shell session-save></game-shell>";
    const shell = document.querySelector("game-shell");
    assert.isTrue(shell.sessionSave, "precondition: session-save attr is true");
    await tick();

    const scene = shell.scene.get();
    assert.equal(
      scene,
      "hacked",
      "tampered session is restored — invalid scene value is loaded as-is",
    );
  });

  it("survives tampered sessionStorage with NaN values", async () => {
    sessionStorage.setItem(
      "-session",
      JSON.stringify({
        scene: "playing",
        round: "abc",
        score: "xyz",
      }),
    );
    document.body.innerHTML = "<game-shell session-save></game-shell>";
    const shell = document.querySelector("game-shell");
    await tick();

    assert.equal(
      shell.scene.get(),
      "playing",
      "tampered session is restored — scene is 'playing'",
    );
    assert.equal(
      shell.round.get(),
      "abc",
      "tampered session is restored — round is the string 'abc'",
    );
    assert.equal(
      shell.score.get(),
      "xyz",
      "tampered session is restored — score is the string 'xyz'",
    );
  });

  it("two shells with no game-id share the same localStorage key", async () => {
    document.body.innerHTML =
      '<game-shell rounds="1" between-delay="0"></game-shell>';
    const shell1 = document.querySelector("game-shell");
    await tick();
    shell1.start();
    await microtask();
    shell1.dispatchEvent(new GameRoundPassEvent(42));
    await tick();
    assert.equal(shell1.scene.get(), "result");
    const stored = localStorage.getItem("");
    assert.isNotNull(stored, "result stored under empty-string key");

    document.body.innerHTML = "";
    document.body.innerHTML =
      '<game-shell rounds="1" between-delay="0"></game-shell>';
    const shell2 = document.querySelector("game-shell");
    await tick();

    assert.equal(
      shell2.scene.get(),
      "result",
      "BUG: second shell restores first shell's result from shared empty key",
    );
    assert.equal(
      shell2.score.get(),
      42,
      "BUG: second shell inherited first shell's score",
    );
  });

  it("handles negative between-delay", async () => {
    document.body.innerHTML =
      '<game-shell rounds="5" between-delay="-1000"></game-shell>';
    const shell = document.querySelector("game-shell");
    await tick();

    assert.equal(
      shell.betweenDelay.get(),
      0,
      "negative between-delay is clamped to 0",
    );
  });

  it('handles rounds="abc" (non-numeric)', async () => {
    document.body.innerHTML =
      '<game-shell rounds="abc" between-delay="0"></game-shell>';
    const shell = document.querySelector("game-shell");
    await tick();

    assert.equal(
      shell.rounds.get(),
      0,
      "invalid rounds attribute falls back to 0",
    );
  });

  it('handles rounds="NaN"', async () => {
    document.body.innerHTML =
      '<game-shell rounds="NaN" between-delay="0"></game-shell>';
    const shell = document.querySelector("game-shell");
    await tick();

    assert.equal(shell.rounds.get(), 0, 'rounds="NaN" falls back to 0');
  });

  it("score-order with invalid value falls back to asc", async () => {
    document.body.innerHTML =
      '<game-shell rounds="5" score-order="bogus" between-delay="0"></game-shell>';
    const shell = document.querySelector("game-shell");
    await tick();

    assert.equal(
      shell.scoreOrder.get(),
      "asc",
      'invalid score-order falls back to "asc"',
    );
  });

  it('between-delay="manual" prevents auto-advance', async () => {
    document.body.innerHTML =
      '<game-shell rounds="5" between-delay="manual"></game-shell>';
    const shell = document.querySelector("game-shell");
    await tick();
    shell.start();
    await microtask();

    shell.dispatchEvent(new GameRoundPassEvent(10));
    await microtask();
    assert.equal(shell.scene.get(), "between");
    assert.equal(shell.round.get(), 1);

    await new Promise((r) => setTimeout(r, 100));

    assert.equal(
      shell.scene.get(),
      "between",
      "manual mode: scene stays between",
    );
    assert.equal(
      shell.round.get(),
      1,
      "manual mode: round did not auto-advance",
    );
  });

  it("game-next-round during non-between scene is a no-op", async () => {
    document.body.innerHTML =
      '<game-shell rounds="5" between-delay="manual"></game-shell>';
    const shell = document.querySelector("game-shell");
    await tick();
    shell.start();
    await microtask();
    assert.equal(shell.scene.get(), "playing");

    shell.dispatchEvent(new Event("game-next-round", { bubbles: true }));
    await microtask();
    assert.equal(
      shell.scene.get(),
      "playing",
      "game-next-round during playing is a no-op",
    );
    assert.equal(shell.round.get(), 1, "round unchanged");
  });

  it("unknown command event does not throw", async () => {
    document.body.innerHTML =
      '<game-shell rounds="5" between-delay="0"></game-shell>';
    const shell = document.querySelector("game-shell");
    await tick();
    shell.start();
    await microtask();

    const sceneBefore = shell.scene.get();
    const roundBefore = shell.round.get();

    const evt = new Event("command");
    evt.command = "--unknown";
    shell.dispatchEvent(evt);
    await microtask();

    assert.equal(
      shell.scene.get(),
      sceneBefore,
      "scene unchanged after unknown command",
    );
    assert.equal(
      shell.round.get(),
      roundBefore,
      "round unchanged after unknown command",
    );
  });

  it("rapid scene transitions dispatch lifecycle events for each", async () => {
    document.body.innerHTML =
      '<game-shell rounds="5" between-delay="manual"></game-shell>';
    const shell = document.querySelector("game-shell");
    await tick();

    const lifecycleScenes = [];
    shell.addEventListener("game-lifecycle", (e) => {
      lifecycleScenes.push(e.action);
    });

    shell.start();
    await microtask();

    shell.dispatchEvent(new GameRoundPassEvent(10));
    await microtask();

    shell.dispatchEvent(new Event("game-next-round", { bubbles: true }));
    await microtask();

    shell.dispatchEvent(new GameCompleteEvent(100));
    await microtask();

    assert.include(lifecycleScenes, "playing", "lifecycle for playing");
    assert.include(lifecycleScenes, "between", "lifecycle for between");
    assert.include(lifecycleScenes, "result", "lifecycle for result");

    const playingCount = lifecycleScenes.filter((s) => s === "playing").length;
    assert.isAtLeast(
      playingCount,
      2,
      "playing lifecycle dispatched at least twice",
    );
  });
});
