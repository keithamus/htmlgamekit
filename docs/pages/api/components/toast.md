---
layout: doc
title: "GameToast"
permalink: /api/components/toast/
---

Trigger-based feedback messages that fire on [triggers]({{ site.baseurl }}/api/triggers/). Uses the same trigger system as `<game-sample>` -- state triggers (`pass`, `fail`, `start`, `round`, `complete`, `timeout`, `tier-up`) and DOM triggers (`input`, `click`, etc.).

{% include "demo-embed.html", demo: "toast", title: "Toast demo", height: "350px" %}

Toasts come in two modes: **ephemeral** (default) and **persistent**. Ephemeral toasts are short-lived messages that drift upward and fade out -- multiple can fire and stack simultaneously. Persistent toasts stay visible until the state changes, making them ideal for contextual commentary during gameplay.

### Attributes

<dl class="def">

<dt><span class="badge attr">trigger</span></dt>
<dd>
<code>string</code> -- The trigger condition. See the <a href="{{ site.baseurl }}/api/triggers/">Triggers reference</a> for all available values.
</dd>

<dt><span class="badge attr">persist</span></dt>
<dd>
<code>boolean</code> -- When present, the toast stays visible instead of fading out. The text is replaced each time the trigger fires. Automatically hides when the game leaves the relevant state (e.g. a <code>pass</code> persist toast hides when leaving <code>between</code>).
</dd>

<dt><span class="badge attr">position</span></dt>
<dd>
<code>"center" | "bottom" | "top" | "inline"</code> -- Positioning mode. Defaults to <code>"center"</code> (fixed, centered on screen). <code>"bottom"</code> and <code>"top"</code> anchor to the edges with a pill-shaped background (ideal for commentary captions). <code>"inline"</code> uses static positioning for embedding in layouts.
</dd>

<dt><span class="badge attr">use-feedback</span></dt>
<dd>
<code>boolean</code> -- When present, shows the <code>lastFeedback</code> signal value directly instead of selecting from options or text content. Useful for displaying the feedback string passed to <code>GameRoundPassEvent</code>.
</dd>

<dt><span class="badge attr">set-feedback</span></dt>
<dd>
<code>boolean</code> -- When present, writes the displayed text back to the shell's <code>lastFeedback</code> signal when the toast fires. Allows downstream components (other toasts, <code>&lt;game-between&gt;</code>, etc.) to observe the same message.
</dd>

<dt><span class="badge attr">duration</span></dt>
<dd>
<code>string?</code> -- Override the CSS animation duration for ephemeral toasts (e.g. <code>"800ms"</code>, <code>"2s"</code>). When absent, the <code>--game-toast-duration</code> CSS custom property (default <code>1s</code>) controls the duration. Has no effect on persistent toasts.
</dd>

<dt><span class="badge attr">value</span></dt>
<dd>
<code>string?</code> -- When set, the toast only fires when the triggering event's value matches this string. Used for fine-grained control, for example firing only on a specific countdown second from a timer tick.
</dd>

</dl>

### Text Resolution

When a toast fires, the message text is resolved in priority order:

1. **`lastFeedback` signal** -- If the `use-feedback` attribute is present and the game code provided explicit feedback text (e.g. `new GameRoundPassEvent(342, "342ms")`), that text is used.
2. **`<option>` children** -- A random `<option>` is picked from the pool, filtered by any `when-*` [conditions]({{ site.baseurl }}/api/conditions/).
3. **Static text content** -- The element's own text content.

### Declarative Messages with `<option>`

Use `<option>` children to define a custom message pool. A random option is picked each time the toast fires:

```html
<game-toast when-some-scene="playing between paused" trigger="pass">
  <option>Brilliant!</option>
  <option>Superb!</option>
  <option>Flawless!</option>
  <option>Crushed it!</option>
</game-toast>

<game-toast when-some-scene="playing between paused" trigger="fail">
  <option>Not quite</option>
  <option>So close!</option>
  <option>Almost had it</option>
  <option>Keep trying</option>
</game-toast>
```

Options can have [condition attributes]({{ site.baseurl }}/api/conditions/) for filtering:

```html
<game-toast when-some-scene="playing between paused" trigger="pass">
  <option>Nice!</option>
  <option>Good one!</option>
  <option when-some-trophy="streak-3">Hat trick master!</option>
  <option when-min-score="15">You're on fire!</option>
  <option when-min-pass-streak="3">On a roll!</option>
</game-toast>
```

Options that don't match are filtered out before random selection. Base options (no `when-*` attributes) are always eligible.

### Methods

<dl class="def">

<dt><span class="badge method">.show(text, opts?)</span></dt>
<dd>
Show a toast message programmatically, independent of triggers.

**Parameters:**
- `text` -- `string` -- The message to display.
- `opts` -- `object` *(optional)*:
  - `color` -- `string` -- CSS colour override.
  - `duration` -- `number` -- Duration in milliseconds (default: 1000).

```js
const toast = document.querySelector("game-toast");
toast.show("PERFECT!", { color: "#24C78B", duration: 1200 });
toast.show("+1 LIFE", { color: "#FFD700" });
```
</dd>

<dt><span class="badge method">.hide()</span></dt>
<dd>
Hide a persistent toast (fades out). No-op on ephemeral toasts.
</dd>

</dl>

### Signal Access

| Signal | Usage |
|---|---|
| Shell signals | Reads `scene`, `lastRoundPassed`, `lastFeedback`, `difficulty`, `score`, and `trophies` signals for trigger detection and condition filtering |

### CSS Custom Properties

{% cem_cssprops "game-toast" %}

### Usage

The simplest feedback setup -- uses the `lastFeedback` signal:

```html
<game-toast when-some-scene="playing between paused" trigger="pass" use-feedback></game-toast>
<game-toast when-some-scene="playing between paused" trigger="fail" use-feedback></game-toast>
```

Custom word pools:

```html
<game-toast when-some-scene="playing between paused" trigger="pass">
  <option>Nailed it!</option>
  <option>Perfect!</option>
  <option>Incredible!</option>
</game-toast>

<game-toast when-some-scene="playing between paused" trigger="fail">
  <option>Missed!</option>
  <option>Not quite!</option>
  <option>Try again!</option>
</game-toast>
```

Fixed text for non-feedback triggers:

```html
<game-toast when-some-scene="playing between paused" trigger="tier-up">Level Up!</game-toast>
<game-toast when-some-scene="playing between paused" trigger="complete">Game Over!</game-toast>
<game-toast when-some-scene="playing between paused" trigger="start">Go!</game-toast>
```

Score-filtered toasts (using [conditions]({{ site.baseurl }}/api/conditions/)):

```html
<game-toast when-some-scene="playing between paused" trigger="complete" when-min-score="20">Perfect score!</game-toast>
<game-toast when-some-scene="playing between paused" trigger="complete" when-max-score="5">Better luck next time</game-toast>
```

Streak-aware commentary (persistent, positioned at bottom):

```html
<game-toast when-some-scene="playing between paused" trigger="round" persist position="bottom">
  <option when-min-pass-streak="3">On fire!</option>
  <option when-min-pass-streak="3">Can't be stopped!</option>
  <option when-min-fail-streak="3">Keep trying!</option>
  <option when-min-fail-streak="3">You'll get there</option>
  <option>Nice work!</option>
  <option>Keep going!</option>
</game-toast>
```

Per-trigger styling:

```css
game-toast[trigger="pass"] {
  --game-toast-color: #00e5b0;
}
game-toast[trigger="tier-up"] {
  --game-toast-color: #fbbf24;
  --game-toast-size: 36px;
}
```
