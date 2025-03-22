---
layout: doc
title: "Triggers"
permalink: /api/triggers/
---

# Triggers

Triggers are named conditions that fire in response to game state transitions or DOM events. They are the shared mechanism used by [`<game-audio>`]({{ site.baseurl }}/api/components/audio/) (to play sounds), [`<game-toast>`]({{ site.baseurl }}/api/components/toast/) (to show messages), and any component that needs to react to game lifecycle moments.

A trigger is set via the `trigger` attribute on a child element:

```html
<game-audio>
  <game-sample
    trigger="pass"
    type="beep"
    notes="880:0"
    gain="0.2"
  ></game-sample>
  <game-sample trigger="fail" type="noise" gain="0.3"></game-sample>
</game-audio>

<game-toast when-some-scene="playing between paused" trigger="pass"
  >Nice!</game-toast
>
<game-toast when-some-scene="playing between paused" trigger="tier-up"
  >Level Up!</game-toast
>
```

The trigger system is defined in `src/triggers.js` and exported as `STATE_TRIGGERS` and `DOM_TRIGGERS` for programmatic use.

## State Triggers

State triggers fire on game state transitions. They are detected by comparing the previous scene to the current scene after each signal change.

| Trigger    | Fires When                                                                                     |
| ---------- | ---------------------------------------------------------------------------------------------- |
| `start`    | Game transitions to `playing` from `ready` or `result`                                         |
| `round`    | Every transition to `playing` (including between rounds)                                       |
| `pass`     | Round passed (enters `between` with `lastRoundPassed` true)                                    |
| `fail`     | Round failed (enters `between` with `lastRoundPassed` false)                                   |
| `timeout`  | Round failed due to timeout (feedback contains "time" **and** a timeout-specific child exists) |
| `complete` | Game enters the `result` state                                                                 |
| `tier-up`  | `difficulty.tierIndex` increased since the last state update                                   |

### Timeout Fallback

The `timeout` trigger only fires if the component defines `timeoutCallback` or has `trigger="timeout"`. Otherwise, timeouts fall through to `fail`. This means you only need to handle timeout distinctly when you want behaviour different from a regular failure.

### Tier-Up Detection

The `tier-up` trigger compares the current `state.difficulty.tierIndex` to the previous value. It fires whenever the index increases (promotion). It does **not** fire on demotion.

## DOM Event Triggers

DOM triggers fire on native DOM events during the `playing` state only. They are automatically bound when the game enters `playing` and unbound when it leaves, so they never fire during intro screens, result screens, or between rounds.

| Trigger       | DOM Event              | Use Case                        |
| ------------- | ---------------------- | ------------------------------- |
| `input`       | `game-tile-input`      | Keystroke clicks for tile input |
| `countdown`   | `game-timer-countdown` | Whole-second countdown ticks    |
| `keydown`     | `keydown`              | Key press feedback              |
| `keyup`       | `keyup`                | Key release feedback            |
| `click`       | `click`                | Mouse click feedback            |
| `pointerdown` | `pointerdown`          | Touch/pointer press feedback    |
| `pointerup`   | `pointerup`            | Touch/pointer release feedback  |

DOM event listeners are attached to the nearest `<game-shell>` ancestor.

## Condition Filtering

Triggered elements can have [`when-*` condition attributes]({{ site.baseurl }}/api/conditions/) to restrict when they fire:

```html
<!-- Only plays when score is 10 or higher -->
<game-sample
  trigger="pass"
  type="marimba"
  notes="1047:0,1319:0.05"
  when-min-score="10"
  gain="0.3"
>
</game-sample>

<!-- Only shows when score is below 5 -->
<game-toast
  when-some-scene="playing between paused"
  trigger="complete"
  when-max-score="5"
  >Better luck next time</game-toast
>
```

## Components That Use Triggers

| Component                                                  | Trigger Attribute On                                                  | Behavior                     |
| ---------------------------------------------------------- | --------------------------------------------------------------------- | ---------------------------- |
| [`<game-audio>`]({{ site.baseurl }}/api/components/audio/) | `<game-sample trigger="...">`                                         | Plays the matching sample(s) |
| [`<game-toast>`]({{ site.baseurl }}/api/components/toast/) | `<game-toast when-some-scene="playing between paused" trigger="...">` | Shows the toast message      |

## Programmatic Access

The trigger constants are exported for advanced use:

```js
import { STATE_TRIGGERS, DOM_TRIGGERS } from "htmlgamekit";

console.log(STATE_TRIGGERS);
// ["start", "round", "pass", "fail", "timeout", "complete", "tier-up"]

console.log(DOM_TRIGGERS);
// { input: "game-tile-input", countdown: "game-timer-countdown", keydown: "keydown", ... }
```

## Building Custom Triggered Components

Implement `triggerCallback(name, event)` on any `GameComponent`. The trigger system initialises automatically when the method is present:

```js
class MyComponent extends GameComponent {
  triggerCallback(name, event) {
    if (name === "pass") this.#celebrate();
    if (name === "click") this.#handleClick(event);
  }
}
```

To distinguish timeouts from failures, also implement `timeoutCallback`:

```js
class MyComponent extends GameComponent {
  triggerCallback(name, event) {
    if (name === "pass") this.#celebrate();
    if (name === "fail") this.#showFailure();
  }

  timeoutCallback(event) {
    this.#showTimeoutMessage();
  }
}
```

For advanced cases that need access to the raw trigger detection logic, `detectStateTriggers` is available:

```js
import { GameComponent, matchesConditions } from "htmlgamekit";
import { detectStateTriggers } from "htmlgamekit/triggers";

class MyComponent extends GameComponent {
  #prevScene = "init";
  #prevTierIndex = -1;

  effectCallback({ scene, lastRoundPassed, lastFeedback, difficulty }) {
    const state = {
      scene: scene.get(),
      lastRoundPassed: lastRoundPassed.get(),
      lastFeedback: lastFeedback.get(),
      difficulty: difficulty.get(),
    };
    const { triggers, tierIndex } = detectStateTriggers(
      state,
      this.#prevScene,
      this.#prevTierIndex,
      () => false,
    );
    this.#prevScene = state.scene;
    this.#prevTierIndex = tierIndex;

    for (const t of triggers) {
      if (matchesConditions(this, this.shell)) {
        this.doSomething(t, state);
      }
    }
  }
}
```
