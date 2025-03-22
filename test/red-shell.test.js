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

  // ── 1. Round events during wrong scene ─────────────────────────────

  it('handles game-round-pass during "between" scene', async () => {
    document.body.innerHTML =
      '<game-shell rounds="5" between-delay="manual"></game-shell>';
    const shell = document.querySelector("game-shell");
    await tick();
    shell.start();
    await microtask();

    // Pass round 1 -> scene becomes "between"
    shell.dispatchEvent(new GameRoundPassEvent(10, "OK"));
    await microtask();
    assert.equal(shell.scene.get(), "between");
    const scoreAfterFirst = shell.score.get();
    const roundScoresLen = shell.roundScores.get().length;

    // Dispatch another pass while still in "between"
    shell.dispatchEvent(new GameRoundPassEvent(5, "Phantom"));
    await microtask();
    // Scene guard on game-round-pass rejects events outside "playing"
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

  // ── 2. Round pass during result scene ──────────────────────────────

  it('handles game-round-pass during "result" scene', async () => {
    // Use more rounds so that "result" is reached via GameCompleteEvent,
    // leaving the round counter below the rounds threshold.
    document.body.innerHTML =
      '<game-shell rounds="5" between-delay="manual"></game-shell>';
    const shell = document.querySelector("game-shell");
    await tick();
    shell.start();
    await microtask();

    // Force into result via GameCompleteEvent
    shell.dispatchEvent(new GameCompleteEvent(50));
    await microtask();
    assert.equal(shell.scene.get(), "result");
    const scoreAtResult = shell.score.get();
    const roundScoresLen = shell.roundScores.get().length;

    // Dispatch a pass while in "result"
    shell.dispatchEvent(new GameRoundPassEvent(99, "Ghost"));
    await microtask();
    // Scene guard on game-round-pass rejects events outside "playing"
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

  // ── 3. Timer expired during non-playing scene ─────────────────────

  it('handles game-timer-expired during "between" scene', async () => {
    document.body.innerHTML =
      '<game-shell rounds="5" between-delay="manual"></game-shell>';
    const shell = document.querySelector("game-shell");
    await tick();
    shell.start();
    await microtask();

    // Pass round 1 -> between
    shell.dispatchEvent(new GameRoundPassEvent(10, "OK"));
    await microtask();
    assert.equal(shell.scene.get(), "between");
    const roundScoresLen = shell.roundScores.get().length;

    // Dispatch timer-expired while in "between"
    shell.dispatchEvent(new GameTimerExpiredEvent());
    await microtask();
    // Scene guard on game-timer-expired rejects events outside "playing"
    assert.equal(
      shell.roundScores.get().length,
      roundScoresLen,
      "timer-expired is ignored during between scene",
    );
  });

  it('handles game-timer-expired during "result" scene', async () => {
    // Use more rounds so that "result" is reached via GameCompleteEvent,
    // leaving the round counter below the rounds threshold.
    document.body.innerHTML =
      '<game-shell rounds="5" between-delay="manual"></game-shell>';
    const shell = document.querySelector("game-shell");
    await tick();
    shell.start();
    await microtask();

    // Force into result via GameCompleteEvent
    shell.dispatchEvent(new GameCompleteEvent(50));
    await microtask();
    assert.equal(shell.scene.get(), "result");
    const roundScoresLen = shell.roundScores.get().length;

    // Dispatch timer-expired while in "result"
    shell.dispatchEvent(new GameTimerExpiredEvent());
    await microtask();
    // Scene guard on game-timer-expired rejects events outside "playing"
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

  // ── 4. start() during between with pending timer ──────────────────

  it("start() during between with pending timer causes race", async () => {
    document.body.innerHTML =
      '<game-shell rounds="5" between-delay="50"></game-shell>';
    const shell = document.querySelector("game-shell");
    await tick();
    shell.start();
    await microtask();

    // Pass round 1 -> enters "between" with 50ms timer scheduled
    shell.dispatchEvent(new GameRoundPassEvent(10));
    await microtask();
    assert.equal(shell.scene.get(), "between");

    // start() now clears #betweenTimer, cancelling the stale 50ms timer
    shell.start();
    assert.equal(shell.round.get(), 1);
    assert.equal(shell.scene.get(), "playing");

    // Wait past when the old between timer would have fired (50ms)
    await new Promise((r) => setTimeout(r, 80));

    // The stale timer was cleared — round stays at 1
    assert.equal(
      shell.round.get(),
      1,
      "stale between timer was cleared by start(), round stays at 1",
    );
  });

  // ── 5. Double start() rapid fire ──────────────────────────────────

  it("double start() rapid fire produces consistent state", async () => {
    document.body.innerHTML =
      '<game-shell rounds="5" between-delay="0"></game-shell>';
    const shell = document.querySelector("game-shell");
    await tick();

    shell.start();
    shell.start();
    await microtask();

    // Both calls reset to round 1, score 0 — state should be consistent
    assert.equal(shell.scene.get(), "playing");
    assert.equal(shell.round.get(), 1);
    assert.equal(shell.score.get(), 0);
    assert.deepEqual(shell.roundScores.get(), []);
  });

  // ── 6. Pause during non-playing state ─────────────────────────────

  it("pause() during non-playing state is a no-op", async () => {
    document.body.innerHTML =
      '<game-shell rounds="5" between-delay="0"></game-shell>';
    const shell = document.querySelector("game-shell");
    await tick();

    // Scene is "ready" — pause should be guarded
    assert.equal(shell.scene.get(), "ready");
    shell.pause();
    assert.equal(shell.scene.get(), "ready", "pause during ready is a no-op");

    // Move to "between" and try pause
    shell.start();
    await microtask();
    shell.dispatchEvent(new GameRoundPassEvent(10));
    await microtask();
    // With between-delay=0 + settle, we may already be in "playing" again.
    // Force a manual between scenario:
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

  // ── 7. Resume during non-paused state ─────────────────────────────

  it("resume() during non-paused state is a no-op", async () => {
    document.body.innerHTML =
      '<game-shell rounds="5" between-delay="0"></game-shell>';
    const shell = document.querySelector("game-shell");
    await tick();

    // Scene is "ready"
    assert.equal(shell.scene.get(), "ready");
    shell.resume();
    assert.equal(shell.scene.get(), "ready", "resume during ready is a no-op");

    // Scene is "playing"
    shell.start();
    assert.equal(shell.scene.get(), "playing");
    shell.resume();
    assert.equal(
      shell.scene.get(),
      "playing",
      "resume during playing is a no-op",
    );
  });

  // ── 8. sessionStorage tampering: invalid scene ────────────────────

  it("survives tampered sessionStorage with invalid scene", async () => {
    // storageKey defaults to "" when no game-id is set, so session key is "-session".
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

    // The session-save effect now skips scene="init", so it no longer wipes
    // sessionStorage before #restoreSession runs.  The tampered session is
    // restored — including the invalid "hacked" scene value.
    const scene = shell.scene.get();
    assert.equal(
      scene,
      "hacked",
      "tampered session is restored — invalid scene value is loaded as-is",
    );
  });

  // ── 9. sessionStorage tampering: NaN values ───────────────────────

  it("survives tampered sessionStorage with NaN values", async () => {
    // storageKey defaults to "" when no game-id is set, so session key is "-session"
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

    // The session-save effect now skips scene="init", so the tampered session
    // is restored.  #restoreSession blindly sets whatever values were stored,
    // including nonsensical string values for round and score.
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

  // ── 10. Empty storage key collision ───────────────────────────────

  it("two shells with no game-id share the same localStorage key", async () => {
    document.body.innerHTML =
      '<game-shell rounds="1" between-delay="0"></game-shell>';
    const shell1 = document.querySelector("game-shell");
    await tick();
    shell1.start();
    await microtask();
    shell1.dispatchEvent(new GameRoundPassEvent(42));
    await microtask();
    // shell1 writes result to localStorage under key "" (empty string)
    assert.equal(shell1.scene.get(), "result");
    const stored = localStorage.getItem("");
    assert.isNotNull(stored, "result stored under empty-string key");

    // Remove shell1, create shell2 — also no game-id
    document.body.innerHTML = "";
    document.body.innerHTML =
      '<game-shell rounds="1" between-delay="0"></game-shell>';
    const shell2 = document.querySelector("game-shell");
    await tick();

    // BUG: shell2 picks up shell1's result from localStorage because both
    // use the empty-string storage key.  It restores into "result" scene
    // with shell1's score.
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

  // ── 11. Negative between-delay ────────────────────────────────────

  it("handles negative between-delay", async () => {
    document.body.innerHTML =
      '<game-shell rounds="5" between-delay="-1000"></game-shell>';
    const shell = document.querySelector("game-shell");
    await tick();

    // #parseBetweenDelay now clamps to Math.max(0, n), so negative values
    // are normalized to 0.
    assert.equal(
      shell.betweenDelay.get(),
      0,
      "negative between-delay is clamped to 0",
    );
  });

  // ── 12. rounds="NaN" / rounds="abc" ──────────────────────────────

  it('handles rounds="abc" (non-numeric)', async () => {
    document.body.innerHTML =
      '<game-shell rounds="abc" between-delay="0"></game-shell>';
    const shell = document.querySelector("game-shell");
    await tick();

    // The "long" type in initAttrs uses parseInt — "abc" becomes NaN,
    // which is then treated as 0 by the IDL reflection (long type floors).
    // So rounds signal is set to 0 (infinite rounds mode).
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

    // "NaN" parsed as long → 0
    assert.equal(
      shell.rounds.get(),
      0,
      'rounds="NaN" falls back to 0',
    );
  });

  // ── 13. score-order with invalid value ────────────────────────────

  it("score-order with invalid value falls back to asc", async () => {
    document.body.innerHTML =
      '<game-shell rounds="5" score-order="bogus" between-delay="0"></game-shell>';
    const shell = document.querySelector("game-shell");
    await tick();

    // enum type with invalid="asc" — bogus maps to "asc"
    assert.equal(
      shell.scoreOrder.get(),
      "asc",
      'invalid score-order falls back to "asc"',
    );
  });

  // ── 14. between-delay="manual" prevents auto-advance ──────────────

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

    // Wait well past any reasonable timer
    await new Promise((r) => setTimeout(r, 100));

    // Scene should still be "between" — no auto-advance
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

  // ── 15. game-next-round when not in between ───────────────────────

  it("game-next-round during non-between scene is a no-op", async () => {
    document.body.innerHTML =
      '<game-shell rounds="5" between-delay="manual"></game-shell>';
    const shell = document.querySelector("game-shell");
    await tick();
    shell.start();
    await microtask();
    assert.equal(shell.scene.get(), "playing");

    // Dispatch game-next-round while playing — should be guarded
    shell.dispatchEvent(new Event("game-next-round", { bubbles: true }));
    await microtask();
    assert.equal(
      shell.scene.get(),
      "playing",
      "game-next-round during playing is a no-op",
    );
    assert.equal(shell.round.get(), 1, "round unchanged");
  });

  // ── 16. Command event with unknown command ────────────────────────

  it("unknown command event does not throw", async () => {
    document.body.innerHTML =
      '<game-shell rounds="5" between-delay="0"></game-shell>';
    const shell = document.querySelector("game-shell");
    await tick();
    shell.start();
    await microtask();

    const sceneBefore = shell.scene.get();
    const roundBefore = shell.round.get();

    // Dispatch a command with an unrecognised value
    const evt = new Event("command");
    evt.command = "--unknown";
    shell.dispatchEvent(evt);
    await microtask();

    // Should be silently ignored — no error, no state change
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

  // ── 17. Rapid scene transitions ───────────────────────────────────

  it("rapid scene transitions dispatch lifecycle events for each", async () => {
    document.body.innerHTML =
      '<game-shell rounds="5" between-delay="manual"></game-shell>';
    const shell = document.querySelector("game-shell");
    await tick();

    const lifecycleScenes = [];
    shell.addEventListener("game-lifecycle", (e) => {
      lifecycleScenes.push(e.action);
    });

    // playing
    shell.start();
    await microtask();

    // playing -> between
    shell.dispatchEvent(new GameRoundPassEvent(10));
    await microtask();

    // between -> playing (via game-next-round)
    shell.dispatchEvent(new Event("game-next-round", { bubbles: true }));
    await microtask();

    // playing -> result (via game-complete)
    shell.dispatchEvent(new GameCompleteEvent(100));
    await microtask();

    // Verify lifecycle events were dispatched for each scene change
    assert.include(lifecycleScenes, "playing", "lifecycle for playing");
    assert.include(lifecycleScenes, "between", "lifecycle for between");
    assert.include(lifecycleScenes, "result", "lifecycle for result");

    // Count that "playing" appeared at least twice (start + next-round)
    const playingCount = lifecycleScenes.filter((s) => s === "playing").length;
    assert.isAtLeast(
      playingCount,
      2,
      "playing lifecycle dispatched at least twice",
    );
  });
});
