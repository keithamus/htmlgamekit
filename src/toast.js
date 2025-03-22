import GameComponent, { css } from "./component.js";
import { matchesConditions } from "./conditions.js";

function conditionKey(el) {
  return [...el.attributes]
    .filter((a) => a.name.startsWith("when-"))
    .map((a) => `${a.name}=${a.value}`)
    .sort()
    .join("|");
}

function pickUnique(options, used) {
  if (!options.length) return "";
  const key = conditionKey(options[0]);
  let set = used.get(key);
  if (!set || set.size >= options.length) {
    set = new Set();
    used.set(key, set);
  }
  const available = options.filter((o) => !set.has(o));
  const opt = available[Math.floor(Math.random() * available.length)];
  set.add(opt);
  return opt.textContent.trim();
}

const PERSIST_VISIBLE = {
  pass: ["between"],
  fail: ["between"],
  timeout: ["between"],
  round: ["playing", "between"],
  start: ["playing", "between"],
  "tier-up": ["playing", "between"],
  complete: ["result"],
};

/**
 * Animated toast notification that displays contextual messages during
 * gameplay. Options are selected by matching `when-*` conditions against
 * live shell signals — including `when-min-pass-streak`, `when-prob`, etc.
 * Options sharing identical `when-*` conditions are treated as a pool and
 * cycled without repetition until exhausted. Falls back through each
 * eligible option group in document order.
 *
 * @summary Trigger-activated toast notifications
 *
 * @csspart persist - The persistent message container
 *
 * @cssprop [--game-toast-size] - Font size of the toast text
 * @cssprop [--game-toast-color=var(--game-text, #eee)] - Text color of the toast
 * @cssprop [--game-toast-duration=1s] - Animation duration for non-persistent toasts
 * @cssprop [--game-toast-bg=rgba(0, 0, 0, 0.6)] - Background color for bottom/top/inline persistent toasts
 */
export default class GameToast extends GameComponent {
  static attrs = {
    "trigger":        { type: "string" },
    "persist":        { type: "boolean" },
    "duration":       { type: "string?" },
    "value":          { type: "string?" },
    "use-feedback":   { type: "boolean" },
    "set-feedback":   { type: "boolean" },
    "position":       { type: "enum", values: ["center", "bottom", "top", "inline"], default: "center" },
  };

  static styles = css`
    :host {
      position: fixed;
      z-index: 50;
      pointer-events: none;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
    }
    :host(:not([position])), :host([position="center"]) {
      top: 50%; left: 50%;
      transform: translate(-50%, -50%);
    }
    :host([position="bottom"]) {
      bottom: max(24px, env(safe-area-inset-bottom));
      left: 50%;
      transform: translateX(-50%);
    }
    :host([position="top"]) {
      top: max(80px, calc(env(safe-area-inset-top) + 56px));
      left: 50%;
      transform: translateX(-50%);
    }
    :host([position="inline"]) {
      position: static;
      z-index: auto;
      transform: none;
    }

    .toast {
      font-size: var(--game-toast-size, clamp(18px, 3vw, 28px));
      font-weight: 800;
      color: var(--game-toast-color, var(--game-text, #eee));
      text-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
      white-space: nowrap;
      opacity: 0;
      animation: toast-float var(--game-toast-duration, 1s) ease-out forwards;
      pointer-events: none;
    }

    .persist {
      animation: none;
      font-size: var(--game-toast-size, clamp(28px, 5vw, 64px));
      font-weight: 900;
      color: var(--game-toast-color, var(--game-text, #eee));
      text-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
      text-align: center;
      pointer-events: none;
      white-space: nowrap;
      opacity: 0;
      transition: opacity 0.3s ease;
    }

    :host([position="bottom"]) .persist,
    :host([position="top"]) .persist,
    :host([position="inline"]) .persist {
      font-size: var(--game-toast-size, clamp(13px, 1.8vw, 17px));
      font-weight: 600;
      color: var(--game-toast-color, rgba(255, 255, 255, 0.85));
      background: var(--game-toast-bg, rgba(0, 0, 0, 0.6));
      backdrop-filter: blur(6px);
      -webkit-backdrop-filter: blur(6px);
      padding: 8px 20px;
      border-radius: 8px;
      text-shadow: none;
    }

    .persist:empty {
      display: none;
    }

    .persist.show {
      opacity: 1;
    }

    .sr-only {
      position: absolute;
      width: 1px; height: 1px;
      padding: 0; margin: -1px;
      overflow: hidden;
      clip: rect(0,0,0,0);
      white-space: nowrap;
      border: 0;
    }

    @keyframes toast-float {
      0%   { opacity: 0; transform: translateY(0); }
      12%  { opacity: 1; }
      70%  { opacity: 1; }
      100% { opacity: 0; transform: translateY(-40px); }
    }
  `;

  static template = '<div class="persist" part="persist"></div><div class="sr-only" role="status" aria-live="polite"></div>';

  #used = new Map();

  effectCallback({ scene, round }) {
    const s = scene.get();
    round.get(); // subscribe to round changes to clear the used-pool on each new round

    if (s === "ready" || s === "init") {
      this.#used.clear();
      if (this.persist) this.hide();
    }

    if (this.persist) {
      const visibleStates = PERSIST_VISIBLE[this.trigger] || [];
      if (!visibleStates.includes(s)) this.hide();
    }
  }

  show(text, opts = {}) {
    const live = this.shadowRoot.querySelector("[role=status]");
    if (live) live.textContent = text;
    if (this.setFeedback) this.shell?.lastFeedback.set(text || null);

    if (this.persist) {
      const el = this.shadowRoot.querySelector(".persist");
      el.textContent = text;
      if (opts.color) el.style.color = opts.color;
      el.classList.add("show");
      return;
    }
    const el = document.createElement("div");
    el.className = "toast";
    el.textContent = text;
    if (opts.color) el.style.color = opts.color;
    const dur = this.duration;
    if (dur) el.style.setProperty("--game-toast-duration", `${dur}ms`);
    if (opts.duration) el.style.setProperty("--game-toast-duration", `${opts.duration}ms`);
    this.shadowRoot.appendChild(el);
    const ms = opts.duration || Number(dur)
      || parseFloat(getComputedStyle(el).animationDuration) * 1000 || 1000;
    setTimeout(() => el.remove(), ms + 50);
  }

  hide() {
    const el = this.shadowRoot.querySelector(".persist");
    if (el) el.classList.remove("show");
  }

  triggerCallback(triggerName, event) {
    if (this.trigger !== triggerName) return;
    const shell = this.shell;
    if (!shell || !matchesConditions(this, shell)) return;

    if (event) {
      const val = this.value;
      if (val !== null) {
        const eventVal = event.seconds ?? event.value ?? event.detail;
        if (String(eventVal) !== val) return;
      }
    }

    const feedback = shell.lastFeedback.get();
    if (this.useFeedback && feedback) { this.show(feedback); return; }

    const groups = new Map();
    for (const opt of this.querySelectorAll("option")) {
      const key = conditionKey(opt);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(opt);
    }

    for (const [, opts] of groups) {
      if (!matchesConditions(opts[0], shell)) continue;
      const text = pickUnique(opts, this.#used);
      if (text) { this.show(text); return; }
    }

    const text = this.textContent.trim();
    if (text) this.show(text);
  }
}
