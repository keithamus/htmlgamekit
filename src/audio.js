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
 * Defines a single sound sample for use within a `<game-audio>` parent.
 * Supports synthesized tones (marimba, sine, etc.), noise bursts,
 * scale-based scoring sounds, and haptic vibration. Trigger-matched
 * by the parent audio element.
 *
 * @summary Individual sound/vibration sample definition
 */
export class GameSample extends HTMLElement {
  static attrs = {
    name: { type: "string" },
    trigger: { type: "string" },
    type: { type: "string?" },
    gain: { type: "number", default: 0.35 },
    duration: { type: "string?" },
    notes: { type: "string?" },
    vibrate: { type: "string", default: "auto" },
    scale: { type: "string?" },
    "scale-root": { type: "number", default: 220 },
    "scale-spacing": { type: "number", default: 0.1 },
    value: { type: "string?" },
  };

  static define(tag = "game-sample", registry = customElements) {
    initAttrs(this);
    registry.define(tag, this);
  }

  #vibrate(pattern) {
    const audio = this.closest("game-audio");
    const vibrationEnabled = !audio || audio.vibration;
    if (vibrationEnabled && navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  }

  /**
   * Play this sample immediately.
   *
   * @param {object} [state] - Game state snapshot. Required when `scale` is
   *   set — reads `state.roundScores`, `state.rounds`, and `state.scoreOrder`
   *   to compute note count and pitch proportionally to the last round's score.
   *   Omit (or pass null) for fixed-note samples.
   */
  play(state) {
    if (this.scale !== null) {
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
      synthNoise(ctx, 0, gain, duration ?? 0.02);
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
      synthNoise(ctx, 0, gain, duration ?? 0.02);
      return;
    }

    for (let i = 0; i < noteCount && i < pool.length; i++) {
      const freq = baseFreq * Math.pow(2, pool[i] / 12);
      synth(ctx, freq, spacing * i, gain, duration);
    }
  }
}

/**
 * Audio controller that manages sound playback and haptic feedback.
 * Contains `<game-sample>` children and plays them in response to
 * game triggers (pass, fail, timeout, countdown, etc.). Respects
 * mute state and volume level.
 *
 * @summary Audio/vibration controller for game sounds
 */
export default class GameAudio extends GameComponent {
  static attrs = {
    muted: { type: "boolean" },
    vibration: { type: "boolean" },
    volume: { type: "number", default: 1 },
  };

  /**
   * Manually play a named sample by its `name` attribute.
   *
   * @param {string} name
   * @param {object} [state] - Passed to `GameSample.play()`. Required for
   *   scale-mode samples; see `GameSample.play()` for details.
   */
  play(name, state) {
    const sample = this.querySelector(`game-sample[name="${name}"]`);
    if (sample) this.#playSample(sample, state);
  }

  timeoutCallback(event) {
    if (this.querySelector('game-sample[trigger="timeout"]')) {
      this.triggerCallback("timeout", event);
    } else {
      this.triggerCallback("fail", event);
    }
  }

  triggerCallback(triggerName, event) {
    if (this.muted) return;
    const shell = this.shell;
    const state = shell
      ? {
          roundScores: shell.roundScores.get(),
          rounds: shell.rounds.get(),
          scoreOrder: shell.scoreOrder.get(),
        }
      : null;
    for (const el of this.querySelectorAll(
      `game-sample[trigger="${triggerName}"]`,
    )) {
      if (!matchesConditions(el, shell)) continue;
      const val = el.value;
      if (val !== null && event) {
        const eventVal = event.seconds ?? event.value ?? event.detail;
        if (String(eventVal) !== val) continue;
      }
      this.#playSample(el, state);
    }
  }

  #playSample(el, state) {
    const vol = this.volume;
    if (vol !== 1) {
      const origGain = el.gain;
      el.gain = origGain * vol;
      el.play(state);
      el.gain = origGain;
    } else {
      el.play(state);
    }
  }
}
