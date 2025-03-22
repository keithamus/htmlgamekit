---
layout: doc
title: "Tutorial: Reaction Time"
permalink: /tutorials/reaction-time/
---

In this tutorial you will build a reaction time game. The screen turns red,
then after a random delay turns green. The player clicks as fast as they can.
Clicking too early resets the round without counting against them.

This tutorial builds on the [Click Counter]({{ site.baseurl }}/tutorials/click-counter/)
concepts and introduces **FixedProgression** for variable difficulty,
**GameRoundFailEvent** with retry, and post-game result logic.


<a href="{{ site.baseurl }}/examples/reaction-time/" class="tutorial-demo-link">Play the finished game</a>

## Step 1: HTML with a FixedProgression

Start with the HTML skeleton. This time we add `progression` attributes to the
shell to control difficulty -- specifically, the delay before the screen turns green:

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reaction Time</title>
  <link rel="stylesheet" href="path/to/htmlgamekit/src/game-base.css" />
</head>
<body>

  <game-shell id="game" game-id="reaction-time" rounds="5" score-order="asc"
              between-delay="800"
              progression="fixed"
              progression-params='{"delay":{"start":2000,"end":4000}}'
              progression-rounds="5">

    <div when-some-scene="intro" data-overlay>
      <h1>Reaction Time</h1>
      <p>Wait for the screen to turn green, then click as fast as you can.
        5 rounds. Don't jump the gun -- clicking too early resets the round.</p>
      <button commandfor="game" command="--start">Ready</button>
    </div>

    <div when-some-scene="playing between paused">
      <game-round-counter></game-round-counter>
      <game-stat key="best" format="ms">Best</game-stat>
    </div>

    <game-toast when-some-scene="playing between paused" trigger="pass"></game-toast>
    <game-toast when-some-scene="playing between paused" trigger="fail"></game-toast>

    <div when-some-scene="playing between paused">
      <reaction-game></reaction-game>
    </div>

    <div when-some-scene="result" data-overlay>
      <h1>Results</h1>
      <game-result-stat format="ms"
        label="Average reaction time">
      </game-result-stat>
      <p id="result-desc"></p>
      <div style="display:flex; gap:12px;
        flex-wrap:wrap; justify-content:center;
        margin-top:24px">
        <game-share></game-share>
        <button commandfor="game" command="--restart">Try again</button>
      </div>
    </div>

  </game-shell>

  <script type="module" src="reaction-game.js"></script>
</body>
</html>
```

The **FixedProgression** linearly interpolates named parameters over the course
of the game. Here `delay` goes from 2000ms to 4000ms, so earlier rounds have
shorter waits and later rounds make the player wait longer. Your game reads
this value from the `difficulty` signal, destructured in `effectCallback` as `{ difficulty }` and passed to `#startRound`.

The HUD tracks the player's **best** reaction time instead of a running total.

## Step 2: Component Skeleton with Colour States

Create `reaction-game.js`. The component fills the entire game area and uses
background colour to communicate state to the player:

```js
import {
  defineAll,
  GameComponent,
  css,
  GameRoundPassEvent,
  GameRoundFailEvent,
  GameStatUpdateEvent,
} from "htmlgamekit";

class ReactionGame extends GameComponent {
  static styles = css`
    :host {
      display: flex;
      align-items: center;
      justify-content: center;
      position: absolute;
      inset: 0;
      cursor: pointer;
      transition: background 0.15s ease;
    }
    .prompt {
      font-size: clamp(20px, 3vw, 32px);
      font-weight: 700;
      pointer-events: none;
      user-select: none;
    }
  `;

  static template = `<div class="prompt"></div>`;

  #prompt;
  #round = 0;
  #active = false;
  #ready = false;    // true once screen turns green
  #timer = 0;
  #goTime = 0;
  #best = Infinity;
  #lastDelay = 2000;
}
```

The component has two boolean flags: `#active` (the round is in progress) and
`#ready` (the screen has turned green and the player should click). This
distinction is how we detect early clicks.

## Step 3: Observing Signals

Wire up `connectedCallback` for one-time setup and `effectCallback` for
reactive signal observation. When a new round starts, call `#startRound()`:

```js
  connectedCallback() {
    this.#prompt = this.shadowRoot.querySelector(".prompt");
    super.connectedCallback();
  }

  effectCallback({ scene, round, difficulty }) {
    const s = scene.get();
    const r = round.get();
    if (s === "playing" && r !== this.#round) {
      this.#round = r;
      this.#startRound(difficulty.get());
    } else if (s !== "playing" && s !== "between") {
      this.#active = false;
      this.#ready = false;
      clearTimeout(this.#timer);
      this.style.background = "";
      this.#prompt.textContent = "";
    }
  }
```

Notice we also check for the `"between"` scene -- we do not want to reset the
UI during the brief pause between rounds, only when the game is fully
inactive (intro or result screen).

## Step 4: The Red/Green Round Logic

The `#startRound()` method sets the screen to red, then after a delay
(from the progression) switches to green:

```js
  #startRound(diff) {
    clearTimeout(this.#timer);
    this.#active = true;
    this.#ready = false;
    this.style.background = "#dc2626";
    this.#prompt.textContent = "Wait for green...";

    const delay = diff?.delay ?? 2000 + Math.random() * 2000;
    this.#lastDelay = delay;

    this.#timer = setTimeout(() => {
      if (!this.#active) return;
      this.#ready = true;
      this.#goTime = performance.now();
      this.style.background = "#16a34a";
      this.#prompt.textContent = "Click!";
    }, delay);
  }
```

The fallback `2000 + Math.random() * 2000` handles the edge case where no
director is configured. In practice the FixedProgression provides `delay` on
every round.

## Step 5: Handling Clicks -- Pass and Retry Fail

This is where the game gets interesting. A click can mean two things:

1. **Screen is green** (`#ready` is true) -- record the reaction time.
2. **Screen is still red** (`#ready` is false) -- too early! Retry.

```js
    // inside connectedCallback, before super.connectedCallback():

    this.addEventListener("click", () => {
      if (!this.#active) return;

      // Too early -- screen is still red
      if (!this.#ready) {
        clearTimeout(this.#timer);
        this.style.background = "#dc2626";
        this.#prompt.textContent = "Too early!";
        this.#active = false;
        this.dispatchEvent(new GameRoundFailEvent("Too early!", true));
        setTimeout(() => {
          if (this.#round) {
            this.#startRound({ difficulty: { delay: this.#lastDelay } });
          }
        }, 1000);
        return;
      }

      // Valid click -- screen is green
      this.#active = false;
      this.#ready = false;
      const elapsed = Math.round(performance.now() - this.#goTime);
      if (elapsed < this.#best) this.#best = elapsed;
      this.dispatchEvent(new GameStatUpdateEvent("best", this.#best));
      this.dispatchEvent(new GameRoundPassEvent(elapsed, `${elapsed}ms`));
      this.style.background = "";
      this.#prompt.textContent = `${elapsed}ms`;
    }, { signal: this.signal });
```

Key details:

- **`GameRoundFailEvent("Too early!", true)`** -- the second argument `true`
  means **retry**. The shell does not count this as a scored round and does
  not advance the round counter. After a 1-second delay, we restart the same
  round with a new wait.
- **`{ signal: this.signal }`** -- this ties the event listener to the
  element's lifecycle. When the element is removed from the DOM, the listener
  is automatically cleaned up.
- **`GameStatUpdateEvent("best", this.#best)`** updates the "Best" stat in
  the HUD whenever the player beats their previous best.

## Step 6: Cleanup

Add `disconnectedCallback` to clear any pending timeout:

```js
  disconnectedCallback() {
    super.disconnectedCallback();
    clearTimeout(this.#timer);
  }
```

## Step 7: Post-Game Result Descriptions

After registering elements, add a lifecycle listener on the shell to generate
a description based on the player's average reaction time:

```js
defineAll();
ReactionGame.define("reaction-game");

const shell = document.querySelector("game-shell");
const resultDesc = document.getElementById("result-desc");

shell.addEventListener("game-lifecycle", (e) => {
  if (e.action !== "result" || !resultDesc) return;
  const avg = e.state.score / e.state.round;
  if (avg < 200)
    resultDesc.textContent = "Lightning fast. Are you even human?";
  else if (avg < 250)
    resultDesc.textContent = "Very quick reflexes. Well above average.";
  else if (avg < 300)
    resultDesc.textContent = "Solid reaction time. Right around the human average.";
  else if (avg < 400)
    resultDesc.textContent = "Not bad. A bit above average, but nothing to worry about.";
  else
    resultDesc.textContent = "A bit slow. Maybe lay off the coffee. Or have more coffee.";
});
```

The `game-lifecycle` event fires on every scene transition. The `"result"`
action fires when the game ends, and `e.state` contains the final game state
including the total score and round count.

## Full Code

Here is the complete `reaction-game.js`:

```js
import {
  defineAll,
  GameComponent,
  css,
  GameRoundPassEvent,
  GameRoundFailEvent,
  GameStatUpdateEvent,
} from "htmlgamekit";

class ReactionGame extends GameComponent {
  static styles = css`
    :host {
      display: flex;
      align-items: center;
      justify-content: center;
      position: absolute;
      inset: 0;
      cursor: pointer;
      transition: background 0.15s ease;
    }
    .prompt {
      font-size: clamp(20px, 3vw, 32px);
      font-weight: 700;
      pointer-events: none;
      user-select: none;
    }
  `;

  static template = `<div class="prompt"></div>`;

  #prompt;
  #round = 0;
  #active = false;
  #ready = false;
  #timer = 0;
  #goTime = 0;
  #best = Infinity;
  #lastDelay = 2000;

  connectedCallback() {
    this.#prompt = this.shadowRoot.querySelector(".prompt");

    this.addEventListener("click", () => {
      if (!this.#active) return;

      if (!this.#ready) {
        clearTimeout(this.#timer);
        this.style.background = "#dc2626";
        this.#prompt.textContent = "Too early!";
        this.#active = false;
        this.dispatchEvent(new GameRoundFailEvent("Too early!", true));
        setTimeout(() => {
          if (this.#round)
            this.#startRound({ difficulty: { delay: this.#lastDelay } });
        }, 1000);
        return;
      }

      this.#active = false;
      this.#ready = false;
      const elapsed = Math.round(performance.now() - this.#goTime);
      if (elapsed < this.#best) this.#best = elapsed;
      this.dispatchEvent(new GameStatUpdateEvent("best", this.#best));
      this.dispatchEvent(new GameRoundPassEvent(elapsed, `${elapsed}ms`));
      this.style.background = "";
      this.#prompt.textContent = `${elapsed}ms`;
    }, { signal: this.signal });

    super.connectedCallback();
  }

  effectCallback({ scene, round, difficulty }) {
    const s = scene.get();
    const r = round.get();
    if (s === "playing" && r !== this.#round) {
      this.#round = r;
      this.#startRound(difficulty.get());
    } else if (s !== "playing" && s !== "between") {
      this.#active = false;
      this.#ready = false;
      clearTimeout(this.#timer);
      this.style.background = "";
      this.#prompt.textContent = "";
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    clearTimeout(this.#timer);
  }

  #startRound(diff) {
    clearTimeout(this.#timer);
    this.#active = true;
    this.#ready = false;
    this.style.background = "#dc2626";
    this.#prompt.textContent = "Wait for green...";

    const delay = diff?.delay ?? 2000 + Math.random() * 2000;
    this.#lastDelay = delay;

    this.#timer = setTimeout(() => {
      if (!this.#active) return;
      this.#ready = true;
      this.#goTime = performance.now();
      this.style.background = "#16a34a";
      this.#prompt.textContent = "Click!";
    }, delay);
  }
}

defineAll();
ReactionGame.define("reaction-game");

const shell = document.querySelector("game-shell");
const resultDesc = document.getElementById("result-desc");

shell.addEventListener("game-lifecycle", (e) => {
  if (e.action !== "result" || !resultDesc) return;
  const avg = e.state.score / e.state.round;
  if (avg < 200)
    resultDesc.textContent = "Lightning fast. Are you even human?";
  else if (avg < 250)
    resultDesc.textContent = "Very quick reflexes. Well above average.";
  else if (avg < 300)
    resultDesc.textContent = "Solid reaction time. Right around the human average.";
  else if (avg < 400)
    resultDesc.textContent = "Not bad. A bit above average, but nothing to worry about.";
  else
    resultDesc.textContent = "A bit slow. Maybe lay off the coffee. Or have more coffee.";
});
```

## What You Learned

- **`progression="fixed"`** linearly interpolates parameters over the
  course of the game. Your component reads them from the `difficulty` signal.
- **`GameRoundFailEvent(reason, retry)`** with `retry: true` lets you reset a
  round without counting it -- useful for invalid actions like early clicks.
- **`this.signal`** ties event listeners to the element's lifecycle for
  automatic cleanup.
- **`game-lifecycle`** events let you hook into state transitions from outside
  the component tree, useful for result-screen logic that lives in the page
  script.

## Next Steps

- [Capital Quiz tutorial]({{ site.baseurl }}/tutorials/capital-quiz/) --
  build a quiz with TierProgression, countdown timer, and the built-in
  `<game-quiz>` component
- [Word Guess tutorial]({{ site.baseurl }}/tutorials/word-guess/) --
  build a Wordle-style game with `<game-tile-input>` and declarative audio
- [Scoring & Leaderboards tutorial]({{ site.baseurl }}/tutorials/scoring/) --
  add online scoring, leaderboards, and challenge mode
- [Directors reference]({{ site.baseurl }}/api/progressions/) -- all three
  director types in detail
- [Events reference]({{ site.baseurl }}/api/events/) -- every event and its
  properties
