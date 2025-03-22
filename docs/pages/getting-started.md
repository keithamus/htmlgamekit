---
layout: doc
title: Getting Started
permalink: /getting-started/
---

## Installation

### Option 1: npm

```bash
npm install htmlgamekit
```

### Option 2: Direct import

Copy the `src/` directory into your project and import directly.

### Option 3: CDN

```html
<script type="module" src="https://esm.sh/htmlgamekit/auto"></script>
```

## Two Entry Points

HTMLGameKit provides two module entry points:

**`htmlgamekit/auto`** -- Import this to register all elements automatically.
No JavaScript authoring needed. Ideal for fully declarative games like quizzes:

```html
<script type="module" src="htmlgamekit/src/auto.js"></script>
```

**`htmlgamekit`** -- The main entry point with named exports. Use this when
you need to import classes for custom game elements, use custom registries, or
want fine-grained control:

```js
import { defineAll, GameComponent, css, GameRoundPassEvent } from "htmlgamekit";
```

With this entry point, call `defineAll()` to register the framework elements,
or register individual elements with `GameShell.define("game-shell")` etc.

## Your First Game

Every HTMLGameKit game follows the same structure:

1. An HTML page with `<game-shell>` wrapping everything
2. Sections with `when-some-scene` to control when they're visible
3. A `<div when-some-scene="playing between paused">` containing your game mechanic
4. A `<script>` that registers the elements (either via `auto.js` or
   `defineAll()` plus your custom element definitions)

### Step 1: The HTML

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>My First Game</title>
    <link rel="stylesheet" href="path/to/htmlgamekit/src/game-base.css" />
  </head>
  <body>
    <game-shell id="game" game-id="my-game" rounds="5" score-order="asc">
      <div when-some-scene="intro" data-overlay>
        <h1>My Game</h1>
        <p>Click the target. 5 rounds.</p>
        <button commandfor="game" command="--start">Play</button>
      </div>

      <div when-some-scene="playing between paused" data-hud>
        <game-round-counter></game-round-counter>
      </div>

      <game-toast
        when-some-scene="playing between paused"
        trigger="pass"
      ></game-toast>
      <game-toast
        when-some-scene="playing between paused"
        trigger="fail"
      ></game-toast>

      <div when-some-scene="playing between paused">
        <my-game></my-game>
      </div>

      <div when-some-scene="result" data-overlay>
        <h1>Done!</h1>
        <game-result-stat label="Score"></game-result-stat>
        <button commandfor="game" command="--restart">Play Again</button>
      </div>
    </game-shell>

    <script type="module" src="my-game.js"></script>
  </body>
</html>
```

### Step 2: The JavaScript

```js
// my-game.js
import { defineAll, GameComponent, css, GameRoundPassEvent } from "htmlgamekit";

class MyGame extends GameComponent {
  static styles = css`
    :host {
      display: block;
      position: absolute;
      inset: 0;
    }
    .target {
      position: absolute;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: white;
      cursor: pointer;
    }
  `;

  static template = '<div class="target"></div>';

  #target;
  #active = false;
  #round = 0;

  connectedCallback() {
    this.#target = this.shadowRoot.querySelector(".target");

    // Handle clicks
    this.#target.addEventListener("click", () => {
      if (!this.#active) return;
      this.#active = false;
      // Fire a pass event -- the shell handles scoring
      this.dispatchEvent(new GameRoundPassEvent(1, "Nice!"));
    });

    super.connectedCallback();
  }

  // React to game state changes via signals
  effectCallback({ scene, round }) {
    const s = scene.get();
    const r = round.get();
    if (s === "playing" && r !== this.#round) {
      this.#round = r;
      this.#active = true;
      this.#place();
    } else if (s !== "playing") {
      this.#active = false;
    }
  }

  #place() {
    const x = 60 + Math.random() * (innerWidth - 120);
    const y = 80 + Math.random() * (innerHeight - 160);
    this.#target.style.left = x + "px";
    this.#target.style.top = y + "px";
  }
}

// Register all framework elements + your game element
defineAll();
MyGame.define("my-game");
```

That's it. Open the HTML file in a browser and you have a working game with
intro screen, round tracking, feedback, and a result screen.

## Key Concepts

### The Game Shell

`<game-shell>` is the brain of every game. It manages a state machine with
these scenes:

```
init -> demo -> ready -> playing -> between -> playing -> ... -> result
```

All child components observe the shell's signals and react automatically.
You never need to manually show/hide overlays or update the HUD -- the
shell's shadow root uses manual slot assignment to show only the children
whose `when-some-scene` matches the current scene.

### Signals

The shell exposes all game state as `Signal.State` instances from the TC39
Signals proposal. Components observe signals by implementing `effectCallback`,
which automatically re-runs when any read signal changes:

```js
effectCallback({ scene, score }) {
  this.#updateDisplay(scene.get(), score.get());
}
```

### Events

Your game mechanic communicates with the shell by dispatching events that
bubble up the DOM:

- `GameRoundPassEvent(score, feedback)` -- the player succeeded
- `GameRoundFailEvent(reason, retry)` -- the player failed (set `retry: true`
  for non-counting failures)
- `GameStatUpdateEvent(key, value)` -- update a stat in the HUD

The shell catches these, updates signals, and all observing components react.
The timer fires `GameTimerExpiredEvent` when it hits zero, which the shell
treats as a round failure.

### GameComponent

Extend `GameComponent` (instead of raw `HTMLElement`) to get:

- Automatic Shadow DOM with `adoptedStyleSheets`
- `this.shell` for accessing the shell's signal properties
- `effectCallback({ scene, round, ... })` for reactive signal observation
- `this.signal` -- an AbortSignal tied to the element's lifecycle
- `static define(tag, registry)` for clean registration

### Directors

Directors control difficulty progression. Add `progression` attributes to the
shell to use one:

```html
<!-- Linear interpolation over 20 rounds -->
<game-shell
  id="game"
  rounds="20"
  progression="fixed"
  progression-params='{"speed":{"start":1,"end":10}}'
  progression-rounds="20"
>
</game-shell>

<!-- Adaptive staircase for perceptual thresholds -->
<game-shell
  id="game"
  progression="staircase"
  progression-levels="[100, 80, 60, 40, 20, 10, 5, 2, 1]"
  progression-tries-per-level="2"
  progression-reversals-to-stop="8"
>
</game-shell>

<!-- Tier-based promote/demote -->
<game-shell
  id="game"
  progression="tier"
  progression-tiers="Easy,Hard"
  progression-promote-after="3"
>
</game-shell>
```

Your game reads `s.difficulty.get()` to get the current parameters.

## Theming

Override CSS custom properties to theme your game:

```css
:root {
  --game-bg: #1a1a2e;
  --game-text: #eee;
  --game-accent: #e94560;
  --game-overlay-bg: rgba(26, 26, 46, 0.9);
  --game-btn-bg: #e94560;
  --game-btn-text: #fff;
  --game-result-gradient-from: #e94560;
  --game-result-gradient-to: #0f3460;
}
```

## Next Steps

- [Architecture deep-dive]({{ site.baseurl }}/architecture/) -- understand
  signals, context protocol, and director pattern in detail
- [GameShell API]({{ site.baseurl }}/api/game-shell/) -- full reference for the
  shell element
- [Events reference]({{ site.baseurl }}/api/events/) -- all custom events and
  when to use them
- [Click Counter tutorial]({{ site.baseurl }}/tutorials/click-counter/) --
  build the simplest possible game step by step
- [Capital Quiz tutorial]({{ site.baseurl }}/tutorials/capital-quiz/) -- build
  a complete quiz with TierProgression
