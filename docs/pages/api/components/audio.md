---
layout: doc
title: "GameAudio, GameSample & GameSequencer"
permalink: /api/components/audio/
---

Three components form the audio system: `<game-audio>` is the container that triggers sounds on state transitions, `<game-sample>` defines individual synthesised sound effects, and `<game-sequencer>` plays a tempo-ramping music loop during gameplay.

{% include "demo-embed.html", demo: "audio", title: "Audio demo", height: "350px" %}

---

## GameAudio

A declarative audio container that automatically plays synthesised sound effects in response to game state transitions. Place `<game-sample>` children inside it to define the sounds, then let the component handle triggering.

### Attributes

<dl class="def">

<dt><span class="badge attr">vibration</span></dt>
<dd>
<code>boolean</code> — Global vibration toggle for all child <code>&lt;game-sample&gt;</code> elements. Absent by default (haptic feedback disabled). Add the attribute to enable haptic feedback for all samples (subject to their individual <code>vibrate</code> setting).

```html
<!-- Vibration enabled -->
<game-audio vibration>

<!-- Vibration disabled (default) -->
<game-audio>
```

Auto-wired by `<game-preferences>` when the `vibration` key is toggled.
</dd>

<dt><span class="badge attr">muted</span></dt>
<dd>
<code>boolean</code> — When present, all sample playback is suppressed. Auto-wired by `<game-preferences>` when the `sound` key is toggled.
</dd>

<dt><span class="badge attr">volume</span></dt>
<dd>
<code>number</code> — Master volume multiplier applied to all child <code>&lt;game-sample&gt;</code> playback. Defaults to <code>1</code>. Auto-wired by `<game-preferences>` when the `volume` key is adjusted.
</dd>

</dl>

### Auto-Triggers

`<game-audio>` observes game signals and fires samples based on state transitions. Each trigger name matches the `trigger` attribute on a `<game-sample>` child:

| Trigger Name | Fires When |
|---|---|
| `start` | Game transitions to `playing` from `ready` or `result` |
| `round` | Every transition to `playing` (including between rounds) |
| `pass` | Round passed (enters `between` with `lastRoundPassed` true) |
| `fail` | Round failed (enters `between` with `lastRoundPassed` false, and no timeout trigger) |
| `timeout` | Round failed due to timeout (enters `between` with feedback containing "time" **and** a `<game-sample trigger="timeout">` exists) |
| `complete` | Game enters the `result` state |
| `tier-up` | The `difficulty.tierIndex` increased since the last state update |

#### DOM Event Triggers

In addition to state-transition triggers, samples can fire on DOM events during gameplay. These triggers are only active while the game is in the `playing` state -- they are automatically bound when play starts and unbound when it ends.

| Trigger Name | Fires When |
|---|---|
| `input` | A `game-tile-input` event bubbles up (from `<game-tile-input>` on each keystroke) |
| `keydown` | Any `keydown` event on the shell |
| `keyup` | Any `keyup` event on the shell |
| `click` | Any `click` event on the shell |
| `pointerdown` | Any `pointerdown` event on the shell |
| `pointerup` | Any `pointerup` event on the shell |

```html
<!-- Keypress click sound for tile input -->
<game-sample trigger="input" type="noise"
  gain="0.15" duration="0.025">
</game-sample>

<!-- Click feedback for mouse/touch games -->
<game-sample trigger="pointerdown" type="beep"
  notes="600:0" gain="0.1" duration="0.03">
</game-sample>
```

If no `<game-sample>` matches a trigger, nothing plays -- so you only need to define the sounds you care about.

### Instance Methods

<dl class="def">

<dt><span class="badge method">.play(name, state?)</span></dt>
<dd>
Manually play a named sample. Looks up a child <code>&lt;game-sample name="..."&gt;</code> and calls its <code>.play(state)</code> method. Pass <code>state</code> if the sample uses the <code>scale</code> attribute and you want score-proportional playback.

```js
const audio = document.querySelector("game-audio");
audio.play("bonus"); // plays <game-sample name="bonus">
```
</dd>

</dl>

### Signal Access

| Signal | Usage |
|---|---|
| Shell signals | Reads `scene`, `lastRoundPassed`, `lastFeedback`, and `difficulty` signals to detect triggers |

### Usage

```html
<game-audio>
  <game-sample trigger="start" type="marimba"
    notes="523:0,659:0.08,784:0.16" gain="0.3">
  </game-sample>
  <game-sample trigger="pass" type="beep"
    notes="880:0" gain="0.2" duration="0.06">
  </game-sample>
  <game-sample trigger="fail" type="noise"
    gain="0.3" duration="0.04">
  </game-sample>
  <game-sample trigger="timeout" type="beep"
    notes="220:0,180:0.1" gain="0.25">
  </game-sample>
  <game-sample trigger="complete" type="marimba"
    notes="523:0,659:0.12,784:0.24,1047:0.36"
    gain="0.35">
  </game-sample>
  <game-sample trigger="tier-up" type="marimba"
    notes="659:0,784:0.06,1047:0.12" gain="0.3">
  </game-sample>
</game-audio>
```

You can also trigger samples by name from your game logic:

```html
<game-audio>
  <game-sample name="bonus" type="marimba"
    notes="1047:0,1319:0.05" gain="0.25">
  </game-sample>
  <game-sample trigger="pass" type="beep"
    notes="880:0" gain="0.2">
  </game-sample>
</game-audio>
```

```js
// In your game component:
document.querySelector("game-audio").play("bonus");
```

---

## GameSample

Defines a single synthesised sound effect. Place inside `<game-audio>` for automatic triggering, or use standalone and call `.play()` directly.

`<game-sample>` extends `HTMLElement` directly (not `GameComponent`) — it has no shadow DOM and no state subscriptions.

### Attributes

<dl class="def">

<dt><span class="badge attr">name</span></dt>
<dd>
<code>string</code> — An identifier for manual playback via <code>GameAudio.play(name)</code>. Not required for trigger-based playback.
</dd>

<dt><span class="badge attr">trigger</span></dt>
<dd>
<code>string</code> -- The auto-trigger name that causes this sample to play. See the trigger table in <a href="#gameaudio">GameAudio</a> above. Multiple samples can share the same trigger -- all matching samples play simultaneously. Combined with <a href="{{ site.baseurl }}/api/conditions/"><code>when-*</code> condition attributes</a>, you can play different sounds depending on the player's score, trophies, difficulty, and more.

```html
<!-- Modest resolve for scores under 20 -->
<game-sample trigger="complete" when-max-score="19" type="marimba"
  notes="392:0,523:0.13" gain="0.35"></game-sample>

<!-- Fanfare for perfect score -->
<game-sample trigger="complete" when-min-score="20" type="marimba"
  notes="262:0,330:0.10,392:0.20,523:0.32,659:0.48" gain="0.45"></game-sample>
```
</dd>

<dt><span class="badge attr">type</span></dt>
<dd>
<code>"marimba" | "beep" | "noise"</code> — The synthesis engine to use. Defaults to <code>"marimba"</code>.

- **`marimba`** — Additive sine-wave partials (fundamental + 2nd + 4th harmonic) with an exponential decay envelope. Produces a warm, mallet-like tone.
- **`beep`** — Square wave with a short exponential decay. Produces a sharp, retro game-style tone.
- **`noise`** — Filtered white noise burst. Ignores the `notes` attribute. Useful for error sounds, percussive hits, or static effects.
</dd>

<dt><span class="badge attr">gain</span></dt>
<dd>
<code>number</code> — Volume level from <code>0</code> to <code>1</code>. Defaults to <code>0.35</code>.
</dd>

<dt><span class="badge attr">duration</span></dt>
<dd>
<code>number</code> — Note duration in seconds. Defaults depend on the synth type: <code>0.5</code> for marimba, <code>0.08</code> for beep, <code>0.02</code> for noise.
</dd>

<dt><span class="badge attr">notes</span></dt>
<dd>
<code>string</code> — When <code>scale</code> is not set, a comma-separated list of <code>freq:when</code> pairs defining the notes to play. Each pair specifies a frequency in hertz and a start time offset in seconds.

```
notes="523:0,659:0.08,784:0.16"
```

This plays three notes: 523 Hz at time 0, 659 Hz at 0.08s, and 784 Hz at 0.16s — producing an ascending arpeggio. Ignored for `type="noise"`.

When <code>scale</code> is set, <code>notes</code> is repurposed as the **maximum number of notes** to play in the adaptive arpeggio (default: <code>5</code>).
</dd>

<dt><span class="badge attr">scale</span></dt>
<dd>
<code>"pentatonic" | "major" | "minor" | "chromatic"</code> — When set, the sample generates a score-proportional arpeggio instead of playing fixed notes. The number of notes and base frequency scale with how well the player did on the last round.

Available scales (semitone offsets from root):

| Scale | Intervals |
|---|---|
| `pentatonic` | 0, 2, 4, 7, 9, 12, 14, 16, 19, 21 |
| `major` | 0, 2, 4, 5, 7, 9, 11, 12, 14, 16 |
| `minor` | 0, 2, 3, 5, 7, 8, 10, 12, 14, 15 |
| `chromatic` | 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12 |

```html
<!-- Score-proportional pentatonic jingle on pass -->
<game-sample trigger="pass" scale="pentatonic"
  notes="5" scale-root="220" gain="0.3">
</game-sample>
```

A low score plays 1 note at a low pitch. A high score plays up to 5 ascending notes at a higher pitch. The jingle adapts to reflect how well the round went.
</dd>

<dt><span class="badge attr">scale-root</span></dt>
<dd>
<code>number</code> — Root frequency in hertz for scale-based playback. Defaults to <code>220</code> (A3). The base frequency rises from this value toward an octave higher as the score proportion increases.
</dd>

<dt><span class="badge attr">scale-spacing</span></dt>
<dd>
<code>number</code> — Time in seconds between notes in a scale arpeggio. Defaults to <code>0.1</code>.
</dd>

<dt><span class="badge attr">vibrate</span></dt>
<dd>
<code>"auto" | "off" | pattern</code> — Controls haptic feedback via the Vibration API. Defaults to <code>"auto"</code>.

- **`auto`** (default, or attribute absent) — Derives a vibration pattern from the note timing. Each note onset becomes a 15ms buzz; the gaps between notes become pauses. For `type="noise"`, a single buzz matching the noise duration. For `scale` samples, the pattern matches the computed note count and spacing. This means every sample automatically vibrates in sync with its audio.
- **`off`** — No haptic feedback.
- **Explicit pattern** — A comma-separated list of milliseconds passed directly to `navigator.vibrate()`. Alternating vibrate/pause durations per the Web Vibration API.

```html
<!-- Default: vibration mirrors the note timing -->
<game-sample trigger="pass" type="beep" notes="880:0" gain="0.2">
</game-sample>

<!-- Explicit celebration pattern -->
<game-sample trigger="complete" type="marimba"
  notes="523:0,659:0.12,784:0.24"
  vibrate="15,40,15,40,25">
</game-sample>

<!-- No vibration (e.g. ambient/subtle sounds) -->
<game-sample trigger="start" type="marimba"
  notes="523:0,659:0.08,784:0.16" gain="0.3"
  vibrate="off">
</game-sample>
```

Feature detection is built in — if `navigator.vibrate` is not available, the attribute is silently ignored. The parent `<game-audio>` element's `vibration` attribute acts as a global toggle (see below).
</dd>

</dl>

### Methods

<dl class="def">

<dt><span class="badge method">.play(state?)</span></dt>
<dd>
Play this sample immediately. Creates an <code>AudioContext</code> (or reuses the shared one) and schedules the synthesised notes.

**Parameters:**
- `state` -- `object` *(optional)* -- Game state snapshot, required when `scale` is set. The sample reads `state.roundScores`, `state.rounds`, and `state.scoreOrder` to compute the note count and pitch. When called by `<game-audio>` automatically, state is always passed. When calling manually, omit `state` only if this sample does not use the `scale` attribute.

```js
document.querySelector('game-sample[name="ding"]').play();
```
</dd>

</dl>

### Usage

```html
<!-- A three-note ascending chime -->
<game-sample name="chime" type="marimba"
  notes="523:0,659:0.1,784:0.2" gain="0.3">
</game-sample>

<!-- A short error buzz -->
<game-sample name="error" type="noise"
  gain="0.4" duration="0.03">
</game-sample>

<!-- A retro coin-collect beep -->
<game-sample name="coin" type="beep"
  notes="988:0,1319:0.06" gain="0.2"
  duration="0.05">
</game-sample>
```

---

## GameSequencer

A musical sequencer that plays during gameplay. Automatically starts when the game enters the `playing` state and stops when it leaves. Supports two modes via the `mode` attribute:

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
Start the sequencer manually. Reads the <code>&lt;game-timer&gt;</code> duration from the nearest shell to calculate the BPM ramp duration. Normally called automatically when the game enters the <code>playing</code> state.
</dd>

<dt><span class="badge method">.stop()</span></dt>
<dd>
Stop the sequencer. Called automatically when the game leaves the <code>playing</code> state.
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

| Signal | Usage |
|---|---|
| Shell signals | Reads `scene` signal from the shell to auto-start during `playing` and auto-stop otherwise |

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
