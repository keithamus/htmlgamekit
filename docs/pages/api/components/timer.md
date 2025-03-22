---
title: "GameTimer"
permalink: /api/components/timer/
demo: timer
demoHeight: 350px
demoTitle: Timer demo
---

A visual countdown timer bar that renders as a thin progress bar at the top of the screen. Auto-starts when the game enters the `playing` scene and auto-stops when it leaves. The bar changes color as time runs out: accent color by default, yellow past 60%, red past 80%.

### Methods

<dl class="def">

<dt><span class="badge method">.start()</span></dt>
<dd>Start or restart the countdown from full duration. Resets the bar to 100% and begins ticking.</dd>

<dt><span class="badge method">.stop()</span></dt>
<dd>Stop the timer. Cancels the animation loop and freezes the bar at its current position.</dd>

<dt><span class="badge method">.reset()</span></dt>
<dd>Stop the timer and reset the bar to full duration without starting it.</dd>

</dl>

### Visibility

Visible during `playing` and `between` states. Hidden otherwise.

### Signal Access

| Signal        | Usage                                                                        |
| ------------- | ---------------------------------------------------------------------------- |
| Shell signals | Reads `scene` signal from the shell to auto-start/stop and toggle visibility |

### Usage

```html
<game-timer when-some-scene="playing between paused" duration="5"></game-timer>
```

Adjust the duration per-round from a progression or lifecycle listener:

```js
shell.addEventListener("game-lifecycle", (e) => {
  if (e.action === "playing") {
    const timer = document.querySelector("game-timer");
    timer.duration = e.state.difficulty?.speed / 1000 || 5;
  }
});
```
