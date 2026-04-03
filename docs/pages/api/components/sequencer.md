---
title: "GameSequencer"
permalink: /api/components/sequencer/
cemSkip: [attrs]
---

A musical sequencer that plays during gameplay. Automatically starts when the game enters the `playing` or `between` state and stops when it leaves both. This means the sequencer continues playing through round transitions, providing uninterrupted audio across the play loop. Supports two modes via the `mode` attribute:

- **`sequence`** (default) — Loops a note pattern at a BPM that ramps from `start-bpm` to `end-bpm` over the timer duration, creating a sense of mounting urgency.
- **`hum`** — Plays a rising sine oscillator that glides from `root` to `end-freq`, with an initial silent period controlled by `silent-fraction`.

### Attributes

<dl class="def">

<dt><span class="badge attr">notes</span></dt>
<dd>
<code>string</code> — A comma-separated list of semitone offsets from the root frequency. Use <code>null</code> or empty entries for rests. The pattern loops continuously.

```
notes="0,4,7,12,7,4"
```

This defines a major arpeggio pattern: root, major third, fifth, octave, fifth, major third.

</dd>

<dt><span class="badge attr">root</span></dt>
<dd>
<code>number</code> — Root frequency in hertz. Defaults to <code>261.63</code> (middle C). All semitone offsets in <code>notes</code> are calculated relative to this frequency.
</dd>

<dt><span class="badge attr">start-bpm</span></dt>
<dd>
<code>number</code> — Starting tempo in beats per minute. Defaults to <code>72</code>.
</dd>

<dt><span class="badge attr">end-bpm</span></dt>
<dd>
<code>number</code> — Target tempo in beats per minute. Defaults to <code>160</code>. The sequencer ramps from <code>start-bpm</code> to <code>end-bpm</code> over the timer duration using an ease-in curve — the tempo increases slowly at first, then accelerates rapidly in the final third.
</dd>

<dt><span class="badge attr">gain</span></dt>
<dd>
<code>number</code> — Volume level from <code>0</code> to <code>1</code>. Defaults to <code>0.07</code>. Keep this low so the sequencer sits in the background.
</dd>

<dt><span class="badge attr">type</span></dt>
<dd>
<code>string</code> — Synth type for the notes. Defaults to <code>"marimba"</code>. Uses the same additive sine partial engine as <code>GameSample</code>.
</dd>

<dt><span class="badge attr">mode</span></dt>
<dd>
<code>"sequence" | "hum"</code> — Playback mode. Defaults to <code>"sequence"</code>. In <code>"hum"</code> mode the <code>notes</code>, <code>start-bpm</code>, <code>end-bpm</code>, and <code>type</code> attributes are ignored; a continuous oscillator rises from <code>root</code> to <code>end-freq</code> instead.
</dd>

<dt><span class="badge attr">end-freq</span></dt>
<dd>
<code>number</code> — Target frequency in hertz for <code>hum</code> mode. The oscillator glides from <code>root</code> to this value over the timer duration. Defaults to <code>220</code>. Has no effect in <code>sequence</code> mode.
</dd>

<dt><span class="badge attr">silent-fraction</span></dt>
<dd>
<code>number</code> — Fraction of the total timer duration that stays silent at the start of <code>hum</code> mode (0–1). Defaults to <code>0.25</code> (first 25% is silent). Has no effect in <code>sequence</code> mode.
</dd>

</dl>

### Methods

<dl class="def">

<dt><span class="badge method">.start()</span></dt>
<dd>
Start the sequencer manually. Reads the <code>&lt;game-timer&gt;</code> duration from the nearest shell to calculate the BPM ramp duration. Normally called automatically when the game enters the <code>playing</code> or <code>between</code> state.
</dd>

<dt><span class="badge method">.stop()</span></dt>
<dd>
Stop the sequencer. Called automatically when the game leaves both the <code>playing</code> and <code>between</code> states (e.g. entering <code>result</code> or <code>paused</code>).
</dd>

</dl>

### Timer Integration

The sequencer reads the `duration` attribute from the first `<game-timer>` inside the same `<game-shell>` to determine how long the BPM ramp lasts. If no timer is found, it defaults to 10 seconds.

### BPM Ramp Curve

The tempo does not increase linearly. An ease-in curve is applied:

- **First 60%** of the timer — gentle acceleration (tempo reaches roughly 40% of the way from start to end BPM).
- **Final 40%** of the timer — rapid acceleration to the target BPM.

This means the player feels comfortable at first, with tension building sharply as time runs out.

### Signal Access

| Signal        | Usage                                                                                      |
| ------------- | ------------------------------------------------------------------------------------------ |
| Shell signals | Reads `scene` signal from the shell to auto-start during `playing` and `between`, and auto-stop otherwise |

### Usage

```html
<game-sequencer
  notes="0,4,7,12,7,4"
  root="261.63"
  start-bpm="72"
  end-bpm="160"
  gain="0.07"
></game-sequencer>
```

A minor-key tension pattern:

```html
<game-sequencer
  notes="0,3,7,null,12,7,3,null"
  root="220"
  start-bpm="80"
  end-bpm="180"
  gain="0.06"
></game-sequencer>
```
