import GameComponent, { css } from "./component.js";
import { GameTimerTickEvent, GameTimerExpiredEvent, GameTimerCountdownEvent } from "./events.js";

/**
 * A visual countdown bar that tracks elapsed time during a round.
 * Renders as a shrinking horizontal bar that changes color as time
 * runs out. Automatically starts/stops/pauses with the game scene.
 *
 * @summary Round timer with visual progress bar
 *
 * @fires {GameTimerTickEvent} game-timer-tick - Fires on every animation frame with remaining time and elapsed fraction
 * @fires {GameTimerExpiredEvent} game-timer-expired - Fires when the timer reaches zero
 * @fires {GameTimerCountdownEvent} game-timer-countdown - Fires each second during the final countdown phase
 *
 * @cssprop [--game-timer-bar=var(--game-accent, #fff)] - Color of the timer bar in the normal phase
 * @cssprop [--game-timer-warn=#f59e0b] - Color of the timer bar in the warn phase
 * @cssprop [--game-timer-danger=#ef4444] - Color of the timer bar in the danger phase
 *
 * @cssState ok - Timer is in the normal phase
 * @cssState warn - Timer has passed the warn-at threshold
 * @cssState danger - Timer has passed the danger-at threshold
 */
export default class GameTimer extends GameComponent {
  static attrs = {
    "duration":  { type: "number", default: 10 },
    "countdown": { type: "long", default: 0 },
    "warn-at":   { type: "number", default: 0.6 },
    "danger-at": { type: "number", default: 0.8 },
  };

  static styles = css`
    :host {
      display: block; position: fixed; top: 0; left: 0; right: 0;
      height: 3px; z-index: 11;
      --game-timer-bar: var(--game-accent, #fff);
      --game-timer-warn: #f59e0b;
      --game-timer-danger: #ef4444;
    }
    .bar {
      height: 100%;
      background: var(--game-timer-bar);
      transition: background 0.3s ease;
      will-change: width;
    }
    :host(:state(warn)) .bar { background: var(--game-timer-warn); }
    :host(:state(danger)) .bar { background: var(--game-timer-danger); }
    .sr-only {
      position: absolute;
      width: 1px; height: 1px;
      padding: 0; margin: -1px;
      overflow: hidden;
      clip: rect(0,0,0,0);
      white-space: nowrap;
      border: 0;
    }
  `;

  static template = '<div class="bar"></div><span class="sr-only" role="timer" aria-live="assertive"></span>';

  #bar;
  #states = this.attachInternals().states;
  #lastCountdownSec = -1;
  #elapsed = 0;
  #lastTickTime = 0;
  #raf = 0;
  #running = false;
  #prevScene = "init";

  connectedCallback() {
    this.#bar = this.shadowRoot.querySelector(".bar");
    super.connectedCallback();
  }

  effectCallback({ scene }) {
    const s = scene.get();
    const prev = this.#prevScene;
    this.#prevScene = s;

    if (s === "playing" && prev === "paused") {
      this.#resume();
    } else if (s === "playing" && !this.#running) {
      this.start();
    } else if (s === "paused" && this.#running) {
      this.#pause();
    } else if (s !== "playing" && s !== "paused" && this.#running) {
      this.stop();
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.stop();
  }

  start() {
    this.stop();
    this.#running = true;
    this.#elapsed = 0;
    this.#lastTickTime = performance.now();
    this.#lastCountdownSec = -1;
    this.#bar.style.width = "100%";
    this.#setPhase("ok");
    this.#tick();
  }

  stop() {
    this.#running = false;
    cancelAnimationFrame(this.#raf);
  }

  reset() {
    this.stop();
    this.#bar.style.width = "100%";
    this.#setPhase("ok");
  }

  #pause() {
    this.#elapsed += (performance.now() - this.#lastTickTime) / 1000;
    cancelAnimationFrame(this.#raf);
  }

  #resume() {
    this.#lastTickTime = performance.now();
    this.#tick();
  }

  #setPhase(phase) {
    for (const s of ["ok", "warn", "danger"]) {
      if (s === phase) this.#states.add(s);
      else this.#states.delete(s);
    }
  }

  #tick() {
    if (!this.#running) return;
    const now = performance.now();
    const dur = this.duration;
    const elapsed = this.#elapsed + (now - this.#lastTickTime) / 1000;
    const remaining = Math.max(0, dur - elapsed);
    const fraction = elapsed / dur;

    this.#bar.style.width = `${(1 - fraction) * 100}%`;
    if (fraction > this.dangerAt) this.#setPhase("danger");
    else if (fraction > this.warnAt) this.#setPhase("warn");

    this.dispatchEvent(new GameTimerTickEvent(remaining, fraction));

    if (this.countdown > 0) {
      const sec = Math.ceil(remaining);
      if (sec <= this.countdown && sec > 0 && sec !== this.#lastCountdownSec) {
        this.#lastCountdownSec = sec;
        this.dispatchEvent(new GameTimerCountdownEvent(sec));
        const live = this.shadowRoot.querySelector("[role=timer]");
        if (live) live.textContent = `${sec} second${sec !== 1 ? "s" : ""}`;
      }
    }

    if (remaining <= 0) {
      this.#running = false;
      this.dispatchEvent(new GameTimerExpiredEvent());
      return;
    }
    this.#raf = requestAnimationFrame(() => this.#tick());
  }
}
