---
title: "GameAudio"
permalink: /api/components/audio/
demo: audio
demoHeight: 350px
demoTitle: Audio demo
cemSkip: [attrs]
---

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
  <game-audio></game-audio
></game-audio>
```

Auto-wired by `<game-preferences>` when the `vibration` key is toggled.

</dd>

<dt><span class="badge attr">muted</span></dt>
<dd>
<code>boolean</code> — When present, all sample playback is suppressed. Auto-wired by `<game-preference key="sound">` (whether standalone or inside a `<game-preferences>` panel). Also synced to the shell's `muted` signal for use by `when-*` conditions and `<game-icon>`.
</dd>

<dt><span class="badge attr">volume</span></dt>
<dd>
<code>number</code> — Master volume multiplier applied to all child <code>&lt;game-sample&gt;</code> playback. Defaults to <code>1</code>. Auto-wired by `<game-preferences>` when the `volume` key is adjusted.
</dd>

</dl>

### Auto-Triggers

`<game-audio>` observes game signals and fires samples based on state transitions. Each trigger name matches the `trigger` attribute on a `<game-sample>` child:

| Trigger Name | Fires When |
| ------------ | ---------- |
{% for t in triggers.state %}| `{{ t.name }}` | {{ t.firesWhen }} |
{% endfor %}

#### DOM Event Triggers

In addition to state-transition triggers, samples can fire on DOM events during gameplay. These triggers are only active while the game is in the `playing` state -- they are automatically bound when play starts and unbound when it ends.

| Trigger Name | Fires When |
| ------------ | ---------- |
{% for t in triggers.dom %}| `{{ t.name }}` | {{ t.firesWhen }} |
{% endfor %}

```html
<!-- Keypress click sound for tile input -->
<game-sample trigger="input" type="noise" gain="0.15" duration="0.025">
</game-sample>

<!-- Click feedback for mouse/touch games -->
<game-sample
  trigger="pointerdown"
  type="beep"
  notes="600:0"
  gain="0.1"
  duration="0.03"
>
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

| Signal        | Usage                                                                                         |
| ------------- | --------------------------------------------------------------------------------------------- |
| Shell signals | Reads `scene`, `lastRoundPassed`, `lastFeedback`, and `difficulty` signals to detect triggers |

### Usage

```html
<game-audio>
  <game-sample
    trigger="start"
    type="marimba"
    notes="523:0,659:0.08,784:0.16"
    gain="0.3"
  >
  </game-sample>
  <game-sample
    trigger="pass"
    type="beep"
    notes="880:0"
    gain="0.2"
    duration="0.06"
  >
  </game-sample>
  <game-sample trigger="fail" type="noise" gain="0.3" duration="0.04">
  </game-sample>
  <game-sample trigger="timeout" type="beep" notes="220:0,180:0.1" gain="0.25">
  </game-sample>
  <game-sample
    trigger="complete"
    type="marimba"
    notes="523:0,659:0.12,784:0.24,1047:0.36"
    gain="0.35"
  >
  </game-sample>
  <game-sample
    trigger="tier-up"
    type="marimba"
    notes="659:0,784:0.06,1047:0.12"
    gain="0.3"
  >
  </game-sample>
</game-audio>
```

You can also trigger samples by name from your game logic:

```html
<game-audio>
  <game-sample name="bonus" type="marimba" notes="1047:0,1319:0.05" gain="0.25">
  </game-sample>
  <game-sample trigger="pass" type="beep" notes="880:0" gain="0.2">
  </game-sample>
</game-audio>
```

```js
// In your game component:
document.querySelector("game-audio").play("bonus");
```
