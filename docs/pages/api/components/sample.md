---
title: "GameSample"
permalink: /api/components/sample/
cemSkip: [attrs]
---

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
<code>string</code> -- The auto-trigger name that causes this sample to play. See the trigger table in <a href="{{ site.baseurl }}/api/components/audio/">GameAudio</a>. Multiple samples can share the same trigger -- all matching samples play simultaneously. Combined with <a href="{{ site.baseurl }}/api/conditions/"><code>when-*</code> condition attributes</a>, you can play different sounds depending on the player's score, trophies, difficulty, and more.

```html
<!-- Modest resolve for scores under 20 -->
<game-sample
  trigger="complete"
  when-max-score="19"
  type="marimba"
  notes="392:0,523:0.13"
  gain="0.35"
></game-sample>

<!-- Fanfare for perfect score -->
<game-sample
  trigger="complete"
  when-min-score="20"
  type="marimba"
  notes="262:0,330:0.10,392:0.20,523:0.32,659:0.48"
  gain="0.45"
></game-sample>
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

| Scale        | Intervals                                |
| ------------ | ---------------------------------------- |
| `pentatonic` | 0, 2, 4, 7, 9, 12, 14, 16, 19, 21        |
| `major`      | 0, 2, 4, 5, 7, 9, 11, 12, 14, 16         |
| `minor`      | 0, 2, 3, 5, 7, 8, 10, 12, 14, 15         |
| `chromatic`  | 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12 |

```html
<!-- Score-proportional pentatonic jingle on pass -->
<game-sample
  trigger="pass"
  scale="pentatonic"
  notes="5"
  scale-root="220"
  gain="0.3"
>
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
<game-sample trigger="pass" type="beep" notes="880:0" gain="0.2"> </game-sample>

<!-- Explicit celebration pattern -->
<game-sample
  trigger="complete"
  type="marimba"
  notes="523:0,659:0.12,784:0.24"
  vibrate="15,40,15,40,25"
>
</game-sample>

<!-- No vibration (e.g. ambient/subtle sounds) -->
<game-sample
  trigger="start"
  type="marimba"
  notes="523:0,659:0.08,784:0.16"
  gain="0.3"
  vibrate="off"
>
</game-sample>
```

Feature detection is built in — if `navigator.vibrate` is not available, the attribute is silently ignored. The parent `<game-audio>` element's `vibration` attribute acts as a global toggle.

</dd>

</dl>

### Methods

<dl class="def">

<dt><span class="badge method">.play(state?)</span></dt>
<dd>
Play this sample immediately. Creates an <code>AudioContext</code> (or reuses the shared one) and schedules the synthesised notes.

**Parameters:**

- `state` -- `object` _(optional)_ -- Game state snapshot, required when `scale` is set. The sample reads `state.roundScores`, `state.rounds`, and `state.scoreOrder` to compute the note count and pitch. When called by `<game-audio>` automatically, state is always passed. When calling manually, omit `state` only if this sample does not use the `scale` attribute.

```js
document.querySelector('game-sample[name="ding"]').play();
```

</dd>

</dl>

### Usage

```html
<!-- A three-note ascending chime -->
<game-sample
  name="chime"
  type="marimba"
  notes="523:0,659:0.1,784:0.2"
  gain="0.3"
>
</game-sample>

<!-- A short error buzz -->
<game-sample name="error" type="noise" gain="0.4" duration="0.03">
</game-sample>

<!-- A retro coin-collect beep -->
<game-sample
  name="coin"
  type="beep"
  notes="988:0,1319:0.06"
  gain="0.2"
  duration="0.05"
>
</game-sample>
```
