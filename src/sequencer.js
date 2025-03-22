import GameComponent from "./component.js";
import { getAudioCtx, synthMarimba, noteFreq } from "./synth.js";

/**
 * Musical sequencer that plays accelerating note patterns or rising
 * tones during gameplay. Supports two modes: "sequence" (BPM-ramping
 * note loop synced to a timer) and "hum" (rising sine oscillator).
 * Automatically starts when the scene enters "playing" and stops on
 * pause or scene change.
 *
 * @summary Background music sequencer (sequence or hum mode)
 */
export default class GameSequencer extends GameComponent {
  static template = null;

  static attrs = {
    "notes":           { type: "string" },
    "root":            { type: "number", default: 261.63 },
    "start-bpm":       { type: "number", default: 72 },
    "end-bpm":         { type: "number", default: 160 },
    "gain":            { type: "number", default: 0.07 },
    "type":            { type: "string", default: "marimba" },
    "mode":            { type: "enum", values: ["sequence", "hum"], default: "sequence" },
    "end-freq":        { type: "number", default: 220 },
    "silent-fraction": { type: "number", default: 0.25 },
  };

  #scheduler = null;
  #step = 0;
  #nextTime = 0;
  #startTime = 0;
  #totalMs = 0;
  #humOsc = null;
  #humGain = null;

  effectCallback({ scene }) {
    if (scene.get() === "playing") {
      if (!this.#scheduler && !this.#humOsc) this.start();
    } else {
      this.stop();
    }
  }

  get #parsedNotes() {
    return this.notes.split(",").map((s) => {
      const n = s.trim();
      return n === "null" || n === "" ? null : Number(n);
    });
  }

  start() {
    this.stop();
    if (this.mode === "hum") {
      this.#startHum();
    } else {
      this.#startSequence();
    }
  }

  #startSequence() {
    const ctx = getAudioCtx();
    // Read duration from the first <game-timer> in the same shell.
    // Falls back to 10s if no timer is present.
    const timer = this.shell?.querySelector("game-timer");
    const duration = timer ? timer.duration : 10;
    this.#totalMs = duration * 1000;
    this.#step = 0;
    this.#startTime = ctx.currentTime;
    this.#nextTime = ctx.currentTime + 0.1;
    this.#scheduleNote();
  }

  #startHum() {
    const ctx = getAudioCtx();
    const timer = this.shell?.querySelector("game-timer");
    const dur = timer ? timer.duration : 10; // same fallback as #startSequence
    const startFreq = this.root;
    const endFreq = this.endFreq;
    const gain = this.gain;
    const silentFrac = this.silentFraction;
    const t = ctx.currentTime;

    this.#humOsc = ctx.createOscillator();
    this.#humGain = ctx.createGain();
    this.#humOsc.connect(this.#humGain);
    this.#humGain.connect(ctx.destination);
    this.#humOsc.type = "sine";
    this.#humOsc.frequency.setValueAtTime(startFreq, t);
    this.#humOsc.frequency.linearRampToValueAtTime(endFreq, t + dur);
    this.#humGain.gain.setValueAtTime(0.0001, t);
    this.#humGain.gain.linearRampToValueAtTime(0.0001, t + dur * silentFrac);
    this.#humGain.gain.linearRampToValueAtTime(gain, t + dur);
    this.#humOsc.start(t);
    this.#humOsc.stop(t + dur + 0.05);
    this.#humOsc.onended = () => {
      this.#humOsc = null;
      this.#humGain = null;
    };
  }

  stop() {
    if (this.#scheduler !== null) {
      clearTimeout(this.#scheduler);
      this.#scheduler = null;
    }
    if (this.#humOsc) {
      try {
        const ctx = getAudioCtx();
        this.#humGain.gain.cancelScheduledValues(0);
        this.#humGain.gain.setValueAtTime(
          this.#humGain.gain.value, ctx.currentTime);
        this.#humGain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.05);
        this.#humOsc.stop(ctx.currentTime + 0.05);
      } catch {}
      this.#humOsc = null;
      this.#humGain = null;
    }
  }

  #scheduleNote() {
    const ctx = getAudioCtx();
    const notes = this.#parsedNotes;
    const root = this.root;
    const startBpm = this.startBpm;
    const endBpm = this.endBpm;
    const gain = this.gain;

    const elapsed = ctx.currentTime - this.#startTime;
    const frac = Math.min(1, elapsed / (this.#totalMs / 1000));
    // Piecewise linear ease: gentle for the first 60% of the timer,
    // then accelerates sharply in the final 40%.
    const easedFrac =
      frac < 0.6 ? (frac * 0.4) / 0.6 : 0.4 + (frac - 0.6) * 1.5;
    const bpm = startBpm + (endBpm - startBpm) * Math.min(1, easedFrac);
    const stepDur = 60 / bpm / 2;

    const semitone = notes[this.#step % notes.length];
    if (semitone !== null && semitone !== undefined) {
      const freq = noteFreq(root, semitone);
      synthMarimba(ctx, freq, this.#nextTime - ctx.currentTime, gain, stepDur * 1.6);
    }

    this.#step++;
    this.#nextTime += stepDur;

    const scheduleAhead = 0.08;
    const delay = Math.max(
      0,
      (this.#nextTime - ctx.currentTime - scheduleAhead) * 1000,
    );
    this.#scheduler = setTimeout(() => this.#scheduleNote(), delay);
  }

  disconnectedCallback() {
    this.stop();
    super.disconnectedCallback();
  }
}
