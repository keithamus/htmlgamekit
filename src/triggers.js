/**
 * Shared trigger system for game components.
 *
 * Triggers are named conditions that fire in response to game state
 * transitions or DOM events. Used by <game-audio>, <game-toast>,
 * and any component that needs to react to game lifecycle moments.
 *
 * STATE TRIGGERS — fire on game state transitions:
 *   start     — game transitions to "playing" from "ready" or "result"
 *   round     — every transition to "playing" (including between rounds)
 *   pass      — round passed (enters "between" with lastRoundPassed true)
 *   fail      — round failed (enters "between" with lastRoundPassed false)
 *   timeout   — round failed due to timeout (feedback contains "time")
 *   complete  — game enters the "result" state
 *   tier-up   — difficulty.tierIndex increased since last update
 *
 * DOM TRIGGERS — fire on DOM events during "playing" state only:
 *   input       — game-tile-input event
 *   countdown   — game-timer-countdown event (whole-second ticks)
 *   keydown     — keydown event
 *   keyup       — keyup event
 *   click       — click event
 *   pointerdown — pointerdown event
 *   pointerup   — pointerup event
 */

export const STATE_TRIGGERS = [
  "start", "round", "pass", "fail", "timeout", "complete", "tier-up",
];

export const DOM_TRIGGERS = {
  input: "game-tile-input",
  countdown: "game-timer-countdown",
  keydown: "keydown",
  keyup: "keyup",
  click: "click",
  pointerdown: "pointerdown",
  pointerup: "pointerup",
};

/**
 * Detect which state triggers should fire given a state transition.
 *
 * @param {object} state - Current game state
 * @param {string} prevStateName - Previous state.scene value
 * @param {number} prevTierIndex - Previous difficulty.tierIndex (-1 if unknown)
 * @param {function} hasTimeoutChild - Returns true if a timeout-specific child exists
 * @returns {{ triggers: string[], tierIndex: number }}
 */
export function detectStateTriggers(state, prevStateName, prevTierIndex, hasTimeoutChild) {
  const triggers = [];
  const cur = state.scene;

  if (cur !== prevStateName) {
    if (cur === "playing") {
      if (prevStateName === "ready" || prevStateName === "result") {
        triggers.push("start");
      }
      triggers.push("round");
    }
    if (cur === "between") {
      if (state.lastRoundPassed) {
        triggers.push("pass");
      } else {
        const isTimeout = state.lastFeedback?.toLowerCase().includes("time")
          && hasTimeoutChild();
        triggers.push(isTimeout ? "timeout" : "fail");
      }
    }
    if (cur === "result") {
      triggers.push("complete");
    }
  }

  const tierIndex = state.difficulty?.tierIndex;
  if (tierIndex != null && prevTierIndex >= 0 && tierIndex > prevTierIndex) {
    triggers.push("tier-up");
  }

  return { triggers, tierIndex: tierIndex ?? prevTierIndex };
}
