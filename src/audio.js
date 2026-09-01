import GameComponent, { initAttrs } from "./component.js";
import { matchesConditions } from "./conditions.js";
import { getAudioCtx, synthNoise, SYNTHS } from "./synth.js";

const SCALES = {
  pentatonic: [0, 2, 4, 7, 9, 12, 14, 16, 19, 21],
  major: [0, 2, 4, 5, 7, 9, 11, 12, 14, 16],
  minor: [0, 2, 3, 5, 7, 8, 10, 12, 14, 15],
  chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
};

const BUZZ_MS = 15;

function parseNotes(str) {
  if (!str) return [];
  return str.split(",").map((pair) => {
    const [freq, when] = pair.split(":").map(Number);
    return { freq, when: when || 0 };
  });
}

function vibrateFromNotes(notes, noteDuration) {
  if (!notes.length) return [BUZZ_MS];
  const sorted = [...notes].sort((a, b) => a.when - b.when);
  const pattern = [];
  let cursor = 0;
  for (const note of sorted) {
    const startMs = Math.round(note.when * 1000);
    const gap = startMs - cursor;
    if (gap > 0 && pattern.length > 0) pattern.push(gap);
    pattern.push(BUZZ_MS);
    cursor = startMs + BUZZ_MS;
  }
  return pattern.length === 1 ? pattern[0] : pattern;
}

function vibrateFromScale(noteCount, spacingMs) {
  if (noteCount <= 1) return BUZZ_MS;
  const pattern = [];
  for (let i = 0; i < noteCount; i++) {
    if (i > 0) pattern.push(spacingMs - BUZZ_MS);
    pattern.push(BUZZ_MS);
  }
  return pattern;
}

/**
 * Defines a single sound sample for use within a `<game-shell>`.
 * Supports synthesized tones (marimba, sine, etc.), noise bursts,
 * scale-based scoring sounds, and haptic vibration. Auto-triggers
 * based on `trigger` attribute and game state transitions.
 *
 * @summary Individual sound/vibration sample definition
 */
export class GameSample extends GameComponent {
  static attrs = {
    name: { type: "string" },
    trigger: { type: "string" },
    type: { type: "string?" },
    gain: { type: "number", default: 0.35 },
    duration: { type: "string?" },
    notes: { type: "string?" },
    "noise-decay": { type: "number?" },
    "noise-filter": { type: "string?" },
    "noise-frequency": { type: "number?" },
    vibrate: { type: "string", default: "auto" },
    scale: { type: "string?" },
    "scale-root": { type: "number", default: 220 },
    "scale-spacing": { type: "number", default: 0.1 },
    value: { type: "string?" },
  };

  static template = null;

  static define(tag = "game-sample", registry = customElements) {
    initAttrs(this);
    registry.define(tag, this);
  }

  #warnedTimeoutFallback = false;

  timeoutCallback() {
    if (this.trigger === "timeout") {
      this.triggerCallback("timeout", null);
      return;
    }
    if (this.trigger !== "fail") return;
    const shell = this.shell;
    if (shell?.querySelector('game-sample[trigger="timeout"]')) return;
    if (!this.#warnedTimeoutFallback) {
      this.#warnedTimeoutFallback = true;
      console.warn(
        "<game-sample trigger='fail'> firing on timeout is deprecated back-compat behaviour. " +
          "Add <game-sample trigger='timeout'> for timeout sounds. Will be removed in the next major version.",
      );
    }
    this.triggerCallback("fail", null);
  }

  triggerCallback(name, event) {
    if (name !== this.trigger) return;
    const shell = this.shell;
    if (shell?.muted.get()) return;
    if (!matchesConditions(this, shell)) return;

    const val = this.value;
    if (val !== null && event) {
      const eventVal = event.seconds ?? event.value ?? event.detail;
      if (String(eventVal) !== val) return;
    }

    this.play();
  }

  /**
   * Play this sample immediately.
   *
   * @param {object} [stateOverride] - Optional game state snapshot to override
   *   shell signals. If omitted, reads from shell signals (roundScores, rounds,
   *   scoreOrder) for scale-mode computation. Required only for advanced use.
   */
  play(stateOverride) {
    const shell = this.shell;
    if (shell?.muted.get()) return;

    if (this.scale !== null) {
      const state =
        stateOverride ||
        (shell
          ? {
              roundScores: shell.roundScores.get(),
              rounds: shell.rounds.get(),
              scoreOrder: shell.scoreOrder.get(),
            }
          : null);
      this.#playScale(state);
      return;
    }

    const type = this.type || "marimba";
    const gain = this.gain;
    const durStr = this.duration;
    const duration = durStr !== null ? Number(durStr) || undefined : undefined;
    const notes = parseNotes(this.notes);

    const vib = this.vibrate;
    if (vib !== "off") {
      if (vib === "auto" || vib === "") {
        this.#vibrate(
          type === "noise"
            ? Math.round((duration ?? 0.02) * 1000)
            : vibrateFromNotes(notes, duration),
        );
      } else {
        const parts = vib
          .split(",")
          .map(Number)
          .filter((n) => !Number.isNaN(n));
        this.#vibrate(parts.length === 1 ? parts[0] : parts);
      }
    }

    if (this.type === null && this.notes === null) return;

    const ctx = getAudioCtx();
    const synth = SYNTHS[type] || SYNTHS.marimba;

    if (type === "noise") {
      synthNoise(ctx, 0, gain, duration ?? 0.02, {
        decay: this.noiseDecay,
        filter: this.noiseFilter,
        frequency: this.noiseFrequency,
      });
      return;
    }
    for (const { freq, when } of notes) {
      synth(ctx, freq, when, gain, duration);
    }
  }

  #playScale(state) {
    const ctx = getAudioCtx();
    const scaleName = this.scale || "pentatonic";
    const pool = SCALES[scaleName] || SCALES.pentatonic;
    const type = this.type || "marimba";
    const synth = SYNTHS[type] || SYNTHS.marimba;
    const gain = this.gain || 0.3;
    const durStr = this.duration;
    const duration = durStr !== null ? Number(durStr) || undefined : undefined;
    const root = this.scaleRoot;
    const spacing = this.scaleSpacing;

    const maxNotes = Number(this.notes) || 5;

    const lastScore = state?.roundScores?.at(-1) ?? 0;
    const rounds = state?.rounds || 1;
    const scoreOrder = state?.scoreOrder || "desc";
    let proportion;
    if (scoreOrder === "asc") {
      proportion = lastScore > 0 ? Math.min(1, 1 / (lastScore / 500)) : 1;
    } else {
      proportion = Math.min(1, lastScore / Math.max(1, rounds));
    }

    const noteCount = Math.max(1, Math.round(proportion * maxNotes));
    const baseFreq = root * (1 + proportion * 0.5);

    const vib = this.vibrate;
    if (vib !== "off") {
      if (vib === "auto" || vib === "") {
        this.#vibrate(vibrateFromScale(noteCount, Math.round(spacing * 1000)));
      } else {
        const parts = vib
          .split(",")
          .map(Number)
          .filter((n) => !Number.isNaN(n));
        this.#vibrate(parts.length === 1 ? parts[0] : parts);
      }
    }

    if (type === "noise") {
      synthNoise(ctx, 0, gain, duration ?? 0.02, {
        decay: this.noiseDecay,
        filter: this.noiseFilter,
        frequency: this.noiseFrequency,
      });
      return;
    }

    for (let i = 0; i < noteCount && i < pool.length; i++) {
      const freq = baseFreq * Math.pow(2, pool[i] / 12);
      synth(ctx, freq, spacing * i, gain, duration);
    }
  }

  #vibrate(pattern) {
    const vibrationEnabled = this.shell?.vibration.get() ?? false;
    if (vibrationEnabled && navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  }
}

/**
 * @deprecated Since v1.x. Use `<game-sample>` elements as direct children of
 * `<game-shell>` instead. This element is now a pass-through for back-compat
 * and will be removed in the next major version.
 *
 * Audio controller that manages sound playback and haptic feedback.
 * Contains `<game-sample>` children. Now primarily a back-compat shim that
 * mirrors attributes to/from shell signals.
 *
 * @summary Deprecated audio container (use game-sample directly)
 */
export default class GameAudio extends GameComponent {
  static attrs = {
    muted: { type: "boolean" },
    vibration: { type: "boolean" },
    volume: { type: "number", default: 1 },
  };

  connectedCallback() {
    super.connectedCallback();
    for (const name of ["muted", "volume", "vibration"]) {
      if (this.hasAttribute(name)) this.#syncAttribute(name);
    }
    console.warn(
      "<game-audio> is deprecated; place <game-sample> elements directly under <game-shell>. Will be removed in next major version.",
    );
  }

  attributeChanged(name) {
    if (this.isConnected) this.#syncAttribute(name);
  }

  /**
   * Manually play a named sample by its `name` attribute.
   * Back-compat wrapper.
   *
   * @param {string} name
   * @param {object} [state] - Ignored; samples read from shell signals.
   */
  play(name, state) {
    const sample = this.querySelector(`game-sample[name="${name}"]`);
    if (sample) sample.play(state);
  }

  #syncAttribute(name) {
    const signal = this.shell?.[name];
    if (signal) signal.set(this[name]);
  }
}
