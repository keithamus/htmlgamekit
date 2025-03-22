---
layout: doc
title: "GameTimer"
permalink: /api/components/timer/
---

A visual countdown timer bar that renders as a thin progress bar at the top of the screen. Auto-starts when the game enters the `playing` scene and auto-stops when it leaves. The bar changes color as time runs out: accent color by default, yellow past 60%, red past 80%.

{% include "demo-embed.html", demo: "timer", title: "Timer demo", height: "350px" %}

### Attributes

All attributes reflect as IDL properties of the same name.

{% cem_attrs "game-timer" %}

### Methods

<dl class="def">

<dt><span class="badge method">.start()</span></dt>
<dd>Start or restart the countdown from full duration. Resets the bar to 100% and begins ticking.</dd>

<dt><span class="badge method">.stop()</span></dt>
<dd>Stop the timer. Cancels the animation loop and freezes the bar at its current position.</dd>

<dt><span class="badge method">.reset()</span></dt>
<dd>Stop the timer and reset the bar to full duration without starting it.</dd>

</dl>

### Events Dispatched

{% cem_events "game-timer" %}

### Visibility

Visible during `playing` and `between` states. Hidden otherwise.

### Signal Access

| Signal | Usage |
|---|---|
| Shell signals | Reads `scene` signal from the shell to auto-start/stop and toggle visibility |

### Custom States

The timer exposes its current phase via `CustomStateSet`, enabling external
styling:

{% cem_cssstates "game-timer" %}

### CSS Custom Properties

{% cem_cssprops "game-timer" %}

Override from the outside using the custom states:

```css
/* Change the bar to a blue->orange->red scheme */
game-timer { --game-timer-bar: #3b82f6; }
game-timer:state(warn) { --game-timer-warn: #f97316; }
game-timer:state(danger) { --game-timer-danger: #dc2626; }
```

### Usage

```html
<game-timer when-some-scene="playing between paused" duration="5"></game-timer>
```

Adjust the duration per-round from a progression or lifecycle listener:

```js
shell.addEventListener("game-lifecycle", (e) => {
  if (e.action === "start" || e.action === "next") {
    const timer = document.querySelector("game-timer");
    timer.duration = e.state.difficulty?.speed / 1000 || 5;
  }
});
```
