import GameComponent, { css } from "./component.js";

/**
 * Full-screen color flash overlay that briefly pulses green or red
 * when a round passes or fails. The flash appears for 300ms during
 * the "between" scene.
 *
 * @summary Pass/fail color flash overlay
 *
 * @cssprop [--game-flash-pass=rgba(50, 220, 120, 0.35)] - Flash color on a passed round
 * @cssprop [--game-flash-fail=rgba(230, 40, 40, 0.3)] - Flash color on a failed round
 *
 * @cssState pass - The flash is showing a pass (green) pulse
 * @cssState fail - The flash is showing a fail (red) pulse
 */
export default class GameFlash extends GameComponent {
  static styles = css`
    :host {
      position: fixed;
      inset: 0;
      z-index: 5;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.12s ease-out;
    }
    :host(:state(pass)) {
      background: var(--game-flash-pass, rgba(50, 220, 120, 0.35));
      opacity: 1;
    }
    :host(:state(fail)) {
      background: var(--game-flash-fail, rgba(230, 40, 40, 0.3));
      opacity: 1;
    }
  `;

  #states = this.attachInternals().states;
  #timer = 0;

  connectedCallback() {
    this.setAttribute("aria-hidden", "true");
    super.connectedCallback();
  }

  effectCallback({ scene, lastRoundPassed }) {
    if (scene.get() !== "between") return;
    clearTimeout(this.#timer);
    const which = lastRoundPassed.get() ? "pass" : "fail";
    this.#states.add(which);
    this.#timer = setTimeout(() => {
      this.#states.delete("pass");
      this.#states.delete("fail");
    }, 300);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    clearTimeout(this.#timer);
  }
}
