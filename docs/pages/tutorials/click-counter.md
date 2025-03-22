---
layout: doc
title: "Tutorial: Click Counter"
permalink: /tutorials/click-counter/
---

In this tutorial you will build a simple click-target game from scratch. The
player clicks a circle that appears at a random position each round. Their
score is the total time across all ten rounds -- lower is better.

By the end you will understand the core HTMLGameKit loop: **shell manages
state, your component observes signals and dispatches events**.

<a href="{{ site.baseurl }}/examples/minimal/" class="tutorial-demo-link">Play the finished game</a>

## Step 1: The HTML Shell

Every HTMLGameKit game starts with a `<game-shell>` element that wraps
everything. It manages the state machine, catches events from your game, and
provides state to all child components via the Context Protocol.

Create an `index.html` file:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Click Counter</title>
    <link rel="stylesheet" href="path/to/htmlgamekit/src/game-base.css" />
  </head>
  <body>
    <game-shell
      id="game"
      game-id="click-counter"
      storage-key="click-counter"
      rounds="10"
      score-order="asc"
      between-delay="300"
    >
    </game-shell>

    <script type="module" src="click-game.js"></script>
  </body>
</html>
```

Three attributes configure the shell:

- **`rounds="10"`** -- the game lasts 10 rounds.
- **`score-order="asc"`** -- lower scores are better (total time).
- **`between-delay="300"`** -- 300ms pause between rounds for the feedback
  flash.

## Step 2: Intro and Result Overlays

The shell shows overlays automatically based on its state. Add an intro overlay
(shown before the game starts) and a result overlay (shown when the game ends):

```html
<game-shell
  id="game"
  game-id="click-counter"
  storage-key="click-counter"
  rounds="10"
  score-order="asc"
  between-delay="300"
>
  <div when-some-scene="intro" data-overlay>
    <h1>Click Counter</h1>
    <p>
      Click the target as fast as you can. 10 rounds. Your score is the total
      time across all rounds.
    </p>
    <button commandfor="game" command="--start">Start</button>
  </div>

  <!-- game area will go here -->

  <div when-some-scene="result" data-overlay>
    <h1>Done!</h1>
    <game-result-stat format="ms" label="Total time"></game-result-stat>
    <div
      style="display:flex; gap:12px;
      flex-wrap:wrap; justify-content:center;
      margin-top:24px"
    >
      <game-share></game-share>
      <button commandfor="game" command="--restart">Play again</button>
    </div>
  </div>
</game-shell>
```

- **`command="--start"`** tells the shell to transition from the intro
  screen into the playing state. The `commandfor="game"` attribute targets
  the shell by its `id`.
- **`<game-result-stat>`** displays the final score automatically.
- **`<game-share>`** gives the player a share button.
- **`command="--restart"`** resets the game back to the intro.

## Step 3: HUD and Feedback

Add a heads-up display and a feedback flash. These sit between the overlays
inside the shell:

```html
<div when-some-scene="playing between paused">
  <game-round-counter></game-round-counter>
  <game-stat key="time" format="ms">Time</game-stat>
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
  <click-target></click-target>
</div>
```

- **`when-some-scene="playing between paused"`** makes the HUD and game area
  visible only during those states. All state-driven visibility uses
  `when-some-scene`.
- **`<game-round-counter>`** shows "Round 3 / 10" automatically.
- **`<game-stat key="time">`** displays a stat that your code will update.
- **`<game-toast>`** shows trigger-based feedback messages. The `pass` and `fail` triggers show the round result, using the `lastFeedback` signal when available or picking from built-in word lists.
- **`<click-target>`** is the custom element you will build next.

## Step 4: The Game Component

Create `click-game.js`. You will extend `GameComponent`, which gives you
Shadow DOM, scoped styles, and reactive signal observation via `effectCallback`.

Start with the imports and class skeleton:

```js
import {
  defineAll,
  GameComponent,
  css,
  GameRoundPassEvent,
  GameStatUpdateEvent,
} from "htmlgamekit";

class ClickTarget extends GameComponent {
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
      background: var(--game-accent, #fff);
      cursor: pointer;
      transition: transform 0.1s ease;
    }
    .target:hover {
      transform: scale(1.1);
    }
    .target:active {
      transform: scale(0.95);
    }
  `;

  static template = `<div class="target"></div>`;
}
```

- **`static styles`** uses the `css` tagged template to create a
  `CSSStyleSheet` that is adopted into the Shadow DOM. Styles are fully
  encapsulated.
- **`static template`** is the Shadow DOM content. `GameComponent` creates the
  shadow root and injects this for you.
- The target uses `var(--game-accent)` so it picks up the game's theme colour.

## Step 5: Observing Signals

Add instance fields and `effectCallback`. The key pattern: observe
game signals to know when a new round starts, then react.

```js
class ClickTarget extends GameComponent {
  // ... styles and template from above

  #target;
  #round = 0;
  #startTime = 0;
  #active = false;

  connectedCallback() {
    this.#target = this.shadowRoot.querySelector(".target");
    super.connectedCallback();
  }

  effectCallback({ scene, round }) {
    const s = scene.get();
    const r = round.get();
    if (s === "playing" && r !== this.#round) {
      this.#round = r;
      this.#active = true;
      this.#place();
      this.#startTime = performance.now();
    } else if (s !== "playing") {
      this.#active = false;
    }
  }
}
```

`effectCallback` runs immediately when the component connects, then again on
every signal change. When a new round starts (`scene === "playing"` and the
round number changed), the target moves to a random position and the timer
starts.

## Step 6: Handling Clicks

When the player clicks the target, calculate how long it took and tell the
shell:

```js
// inside connectedCallback, before super.connectedCallback():

this.#target.addEventListener("click", () => {
  if (!this.#active) return;
  this.#active = false;
  const elapsed = Math.round(performance.now() - this.#startTime);
  this.dispatchEvent(new GameStatUpdateEvent("time", elapsed));
  this.dispatchEvent(new GameRoundPassEvent(elapsed, `${elapsed}ms`));
});
```

Two events do all the work:

- **`GameStatUpdateEvent("time", elapsed)`** updates the "Time" stat in the
  HUD.
- **`GameRoundPassEvent(elapsed, feedback)`** tells the shell the round passed
  with a score of `elapsed` and feedback text like `"234ms"`. The shell
  accumulates the score, flashes the feedback, and advances to the next round.

## Step 7: Random Placement

Add the private `#place()` method that positions the target randomly within
the viewport, accounting for the HUD height and some padding:

```js
  #place() {
    const pad = 60;
    const hud = 50;
    const x = pad + Math.random() * (window.innerWidth - pad * 2);
    const y = hud + pad + Math.random() * (window.innerHeight - hud - pad * 2);
    this.#target.style.left = `${x - 30}px`;
    this.#target.style.top = `${y - 30}px`;
  }
```

## Step 8: Register Elements

At the bottom of the file, register all the framework elements and your custom
element:

```js
defineAll();
ClickTarget.define("click-target");
```

`defineAll()` registers every built-in element (`<game-shell>`, `<game-timer>`,
etc.). `ClickTarget.define()` registers your `<click-target>` element.

## Full Code

Here is the complete `click-game.js`:

```js
import {
  defineAll,
  GameComponent,
  css,
  GameRoundPassEvent,
  GameStatUpdateEvent,
} from "htmlgamekit";

class ClickTarget extends GameComponent {
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
      background: var(--game-accent, #fff);
      cursor: pointer;
      transition: transform 0.1s ease;
    }
    .target:hover {
      transform: scale(1.1);
    }
    .target:active {
      transform: scale(0.95);
    }
  `;

  static template = `<div class="target"></div>`;

  #target;
  #round = 0;
  #startTime = 0;
  #active = false;

  connectedCallback() {
    this.#target = this.shadowRoot.querySelector(".target");
    this.#target.addEventListener("click", () => {
      if (!this.#active) return;
      this.#active = false;
      const elapsed = Math.round(performance.now() - this.#startTime);
      this.dispatchEvent(new GameStatUpdateEvent("time", elapsed));
      this.dispatchEvent(new GameRoundPassEvent(elapsed, `${elapsed}ms`));
    });
    super.connectedCallback();
  }

  effectCallback({ scene, round }) {
    const s = scene.get();
    const r = round.get();
    if (s === "playing" && r !== this.#round) {
      this.#round = r;
      this.#active = true;
      this.#place();
      this.#startTime = performance.now();
    } else if (s !== "playing") {
      this.#active = false;
    }
  }

  #place() {
    const pad = 60;
    const hud = 50;
    const x = pad + Math.random() * (window.innerWidth - pad * 2);
    const y = hud + pad + Math.random() * (window.innerHeight - hud - pad * 2);
    this.#target.style.left = `${x - 30}px`;
    this.#target.style.top = `${y - 30}px`;
  }
}

defineAll();
ClickTarget.define("click-target");
```

And the complete `index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Click Counter</title>
    <link rel="stylesheet" href="path/to/htmlgamekit/src/game-base.css" />
  </head>
  <body>
    <game-shell
      id="game"
      game-id="click-counter"
      storage-key="click-counter"
      rounds="10"
      score-order="asc"
      between-delay="300"
    >
      <div when-some-scene="intro" data-overlay>
        <h1>Click Counter</h1>
        <p>
          Click the target as fast as you can. 10 rounds. Your score is the
          total time across all rounds.
        </p>
        <button commandfor="game" command="--start">Start</button>
      </div>

      <div when-some-scene="playing between paused">
        <game-round-counter></game-round-counter>
        <game-stat key="time" format="ms">Time</game-stat>
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
        <click-target></click-target>
      </div>

      <div when-some-scene="result" data-overlay>
        <h1>Done!</h1>
        <game-result-stat format="ms" label="Total time"></game-result-stat>
        <div
          style="display:flex; gap:12px;
      flex-wrap:wrap; justify-content:center;
      margin-top:24px"
        >
          <game-share></game-share>
          <button commandfor="game" command="--restart">Play again</button>
        </div>
      </div>
    </game-shell>

    <script type="module" src="click-game.js"></script>
  </body>
</html>
```

## What You Learned

- **`<game-shell>`** manages the entire game lifecycle. You configure it with
  attributes and it handles state transitions, scoring, and round progression.
- **`GameComponent`** gives your custom element Shadow DOM, scoped styles, and
  `effectCallback` for reactive state observation.
- **`this.shell`** lets your component reach the shell's signals without any prop drilling or manual wiring.
- **`GameRoundPassEvent`** and **`GameStatUpdateEvent`** are how your game
  talks back to the shell -- events bubble up, state flows down.

## Next Steps

- [Reaction Time tutorial]({{ site.baseurl }}/tutorials/reaction-time/) --
  learn about the FixedProgression, retry failures, and variable delays
- [Capital Quiz tutorial]({{ site.baseurl }}/tutorials/capital-quiz/) --
  build a quiz with TierProgression and the built-in `<game-quiz>` component
- [Word Guess tutorial]({{ site.baseurl }}/tutorials/word-guess/) --
  build a Wordle-style game with `<game-tile-input>` and declarative audio
- [Scoring & Leaderboards tutorial]({{ site.baseurl }}/tutorials/scoring/) --
  add online scoring, leaderboards, and challenge mode
- [GameShell API]({{ site.baseurl }}/api/game-shell/) -- full reference
- [Events reference]({{ site.baseurl }}/api/events/) -- all custom events
