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

**`htmlgamekit/auto`** -- Registers all elements automatically. No JavaScript
authoring needed. The right choice when your game is fully declarative (quizzes,
choice games) because you avoid importing classes you'll never reference:

```html
<script type="module" src="htmlgamekit/auto"></script>
```

**`htmlgamekit`** -- Named exports for when you need to extend `GameComponent`,
use a custom element registry, or import only specific pieces:

```js
import { defineAll, GameComponent, css, GameRoundPassEvent } from "htmlgamekit";
```

Call `defineAll()` to register the framework elements alongside your own, or
register individual elements with `GameShell.define("game-shell")` etc.

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

`<game-shell>` is the single point of coordination. It owns the scene state
machine, all game signals, and the round lifecycle:

```
init -> demo -> ready -> playing -> between -> playing -> ... -> result
```

Child elements declare when they should be visible with `when-some-scene`; the
shell assigns them to its slot accordingly. No JavaScript is needed to toggle
overlays — the declarative condition is enough because the shell manages
visibility as a direct consequence of scene changes, not as a separate concern.

### Signals

The shell exposes game state as `Signal.State` instances from the TC39 Signals
proposal. Components observe signals by implementing `effectCallback`, which
re-runs automatically when any signal it reads changes — no explicit
subscription management required:

```js
effectCallback({ scene, score }) {
  this.#updateDisplay(scene.get(), score.get());
}
```

### Events

Your game mechanic communicates with the shell by dispatching events upward.
This keeps mechanics independent of the shell's internals: a mechanic that
dispatches `GameRoundPassEvent` works without knowing anything about scoring,
streaks, or round counting — those are the shell's concern.

- `GameRoundPassEvent(score, feedback)` -- the player succeeded
- `GameRoundFailEvent(reason, retry)` -- the player failed (`retry: true` means
  the round does not count; use it for early-click or invalid-input penalties)
- `GameStatUpdateEvent(key, value)` -- update a stat in the HUD

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

## Why This Structure

**Why two entry points?** `htmlgamekit/auto` is the zero-friction path — one import and every element is defined. The cost is loading all elements even if you only use a few. `htmlgamekit` is for games that want fine-grained control: a custom element registry, code splitting, or importing individual classes for extension. Neither forces a framework build pipeline on you.

**Why `<game-shell>` as a mandatory wrapper?** The shell is the contract point where events arrive and signals leave. It lets components use `this.shell` to locate state without knowing anything about the document structure around them. Removing the shell from the design would require each component to either receive props explicitly (verbose) or query the DOM globally (fragile). The parent-walk approach (`this.closest("game-shell")`) keeps the coupling local and testable.

**Why attributes for game configuration?** HTML attributes survive serialisation, DevTools inspection, and declarative frameworks without extra integration. An attribute like `rounds="10"` is visible in the markup, overridable at parse time, and reactive to runtime changes via `attributeChangedCallback`. Equivalent JavaScript config objects would require script execution before the element can render correctly.

## Next Steps

- [Architecture deep-dive]({{ site.baseurl }}/architecture/) -- understand
  signals, context protocol, and director pattern in detail
- [GameShell API]({{ site.baseurl }}/api/game-shell/) -- full reference for the
  shell element
- [Events reference]({{ site.baseurl }}/api/events/) -- all custom events and
  when to use them
- [Click Counter tutorial]({{ site.baseurl }}/tutorials/click-counter/) --
  build the simplest possible game step by step
- [Capital Quiz tutorial]({{ site.baseurl }}/tutorials/capital-quiz/) --
  build a complete quiz with TierProgression
