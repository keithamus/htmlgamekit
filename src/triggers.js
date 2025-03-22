export const STATE_TRIGGERS = [
  "start",
  "round",
  "pass",
  "fail",
  "timeout",
  "complete",
  "tier-up",
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
export function detectStateTriggers(
  state,
  prevStateName,
  prevTierIndex,
  hasTimeoutChild,
) {
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
        const isTimeout =
          state.lastFeedback?.toLowerCase().includes("time") &&
          hasTimeoutChild();
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
