---
layout: doc
title: "Tutorial: Word Guess"
permalink: /tutorials/word-guess/
---

In this tutorial you will build a Wordle-style word-guessing game. It
showcases `<game-tile-input>` for keyboard-driven tile input, `<game-word-source>`
for fetching real words from the API, declarative `<game-audio>` for sound
effects, and `<game-flash>` for visual feedback.

By the end you will understand how to use **`<game-tile-input>`** with the
`GameTileSubmitEvent`, how to **fetch and validate words** with `<game-word-source>`,
how to **create child elements programmatically** inside a `GameComponent`, and
how to **score letters** with the tile `showResult()` API.

<a href="{{ site.baseurl }}/examples/word-guess/" class="tutorial-demo-link">Play the finished game</a>

## Step 1: The HTML Shell

The player gets 5 rounds, each with a different word of the day. Higher scores
are better (more rounds won), so set `score-order="desc"`. A longer
`between-delay` gives the player time to read the feedback:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Word Guess</title>
    <link rel="stylesheet" href="path/to/htmlgamekit/src/game-base.css" />
  </head>
  <body>
    <game-shell
      id="game"
      game-id="word-guess"
      storage-key="word-guess"
      rounds="5"
      score-order="desc"
      between-delay="1200"
    >
    </game-shell>

    <script type="module" src="word-game.js"></script>
  </body>
</html>
```

## Step 2: Words API

Add `<game-word-source>` inside the shell to fetch a real word from the API.
In `daily` mode, `game-id` is used as a seed so this game gets its own word
of the day distinct from every other game on the same API. With `validate`,
only real dictionary words are accepted as guesses:

```html
<game-shell
  id="game"
  game-id="word-guess"
  rounds="5"
  score-order="desc"
  between-delay="1200"
>
  <game-word-source
    words-url="https://words.htmlgamekit.dev"
    length="5"
    mode="daily"
    validate
  >
  </game-word-source>
</game-shell>
```

That's all the word-fetching configuration. `<game-word-source>` distributes
the current word to child components via [context]({{ site.baseurl }}/api/context/)
— your `<word-game>` component subscribes to it and never needs to know about
the API directly.

### Mode options

| `mode`      | Behaviour                                                  |
| ----------- | ---------------------------------------------------------- |
| `daily`     | Same word for everyone today. Repeats across all 5 rounds. |
| `random`    | Fresh random word on every Play.                           |
| `per-round` | New word each of the 5 rounds — much harder!               |

## Step 3: Overlays, HUD, and Game Area

```html
<game-shell
  id="game"
  game-id="word-guess"
  rounds="5"
  score-order="desc"
  between-delay="1200"
>
  <game-word-source
    words-url="https://words.htmlgamekit.dev"
    length="5"
    mode="daily"
    validate
  >
  </game-word-source>

  <div when-some-scene="intro" data-overlay>
    <h1>Word Guess</h1>
    <p>
      Guess the 5-letter word in 6 tries. Green = right spot. Yellow = wrong
      spot. 5 rounds — score is how many you get right.
    </p>
    <button commandfor="game" command="--start">Play</button>
  </div>

  <div when-some-scene="playing between paused">
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
  <game-flash when-some-scene="playing between paused"></game-flash>

  <div when-some-scene="playing between paused">
    <word-game></word-game>
  </div>

  <div when-some-scene="result" data-overlay>
    <h1>Results</h1>
    <game-result-stat label="Score"></game-result-stat>
    <game-result-message when-max-score="1"
      >Tough round. Words are hard.</game-result-message
    >
    <game-result-message when-min-score="2" when-max-score="3"
      >Not bad. You know your letters.</game-result-message
    >
    <game-result-message when-min-score="4"
      >Word wizard. Impressive vocabulary.</game-result-message
    >
    <div
      style="display:flex;gap:12px;flex-wrap:wrap;justify-content:center;margin-top:24px"
    >
      <game-share></game-share>
      <button commandfor="game" command="--restart">Play again</button>
    </div>
  </div>
</game-shell>
```

- **`<game-flash>`** flashes the screen green on pass and red on fail.
  No configuration needed.
- **`<game-toast>`** shows the feedback text bubbled from your events --
  "Got it in 3!" on pass, or "It was CRANE" on fail.

## Step 4: Declarative Audio

Add sound effects with zero JavaScript:

```html
<game-audio>
  <game-sample
    trigger="pass"
    type="marimba"
    scale="pentatonic"
    notes="5"
    gain="0.25"
    scale-root="440"
    scale-spacing="0.08"
  >
  </game-sample>
  <game-sample trigger="fail" type="noise" gain="0.3" duration="0.12">
  </game-sample>
</game-audio>
```

- **`trigger="pass"`** plays a pentatonic scale jingle when the player
  guesses correctly. The `scale` attribute triggers scale mode where
  `notes="5"` means up to 5 notes, and the pitch/count scales with
  performance.
- **`trigger="fail"`** plays a short noise burst on wrong answer.

## Step 5: The Game Component

Create `word-game.js`. The component subscribes to `gameWordContext` for the
current target word, then creates `<game-tile-input>` rows programmatically
and listens for `GameTileSubmitEvent`:

```js
import {
  defineAll,
  GameComponent,
  css,
  GameRoundPassEvent,
  GameRoundFailEvent,
  gameWordContext,
} from "htmlgamekit";

class WordGame extends GameComponent {
  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      position: absolute;
      inset: 0;
      gap: 8px;
      padding: 60px 20px 20px;
    }
    .board {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
  `;

  static template = `<div class="board"></div>`;
}
```

## Step 6: Subscribing to the Word and Creating Rows

Subscribe to `gameWordContext` for the target word. The context updates before
the scene effect fires for each new round, so `this.#target` is always ready:

```js
  #board;
  #target = "";
  #row = 0;
  #round = 0;
  #rows = [];
  #done = false;

  connectedCallback() {
    this.#board = this.shadowRoot.querySelector(".board");

    this.subscribe(gameWordContext, (word) => {
      if (word) this.#target = word;
    });

    this.addEventListener("game-tile-submit", (e) => {
      if (this.#done) return;
      this.#guess(e.value.toLowerCase());
    }, { signal: this.signal });

    super.connectedCallback();
  }

  effectCallback({ scene, round }) {
    const s = scene.get();
    const r = round.get();
    if (s === "playing" && r !== this.#round) {
      this.#round = r;
      this.#newBoard();
    } else if (s !== "playing" && s !== "between") {
      this.#done = true;
    }
  }

  #newBoard() {
    this.#row = 0;
    this.#done = false;
    this.#board.innerHTML = "";
    this.#rows = [];
    for (let i = 0; i < 6; i++) {
      const tile = document.createElement("game-tile-input");
      tile.setAttribute("length", "5");
      if (i > 0) tile.disabled = true;
      this.#board.appendChild(tile);
      this.#rows.push(tile);
    }
    this.#rows[0].focus();
  }
```

`<game-tile-input>` handles all the keyboard input, tile rendering, and
cursor display. You create it with `document.createElement`, set `length`,
and append. Each row after the first starts `disabled`; your code enables
them one at a time as guesses are processed. The component dispatches
`GameTileSubmitEvent` when the player presses Enter with a full word.
Since `<game-word-source validate>` intercepts submit events before they
reach this component, you never receive guesses for words not in the
dictionary — no need to validate them yourself.

## Step 7: Scoring a Guess

The classic Wordle algorithm: first pass for exact matches (green), second
pass for close matches (yellow):

```js
  #guess(word) {
    if (word.length !== 5 || !this.#target) return;
    const row = this.#rows[this.#row];
    if (!row) return;

    const target = this.#target.split("");
    const states = Array(5).fill("wrong");
    const remaining = [...target];

    // First pass: exact matches
    for (let i = 0; i < 5; i++) {
      if (word[i] === target[i]) {
        states[i] = "good";
        remaining[remaining.indexOf(word[i])] = null;
      }
    }
    // Second pass: close matches
    for (let i = 0; i < 5; i++) {
      if (states[i] !== "wrong") continue;
      const idx = remaining.indexOf(word[i]);
      if (idx !== -1) {
        states[i] = "close";
        remaining[idx] = null;
      }
    }

    row.showResult(word.split(""), states);
    row.disabled = true;
```

**`row.showResult(letters, states)`** colours each tile: `"good"` (green),
`"close"` (yellow), or `"wrong"` (red). These are built-in tile states
styled by `<game-tile-input>`'s shadow CSS.

## Step 8: Win, Lose, or Next Row

```js
    if (word === this.#target) {
      this.#done = true;
      this.dispatchEvent(
        new GameRoundPassEvent(6 - this.#row, `Got it in ${this.#row + 1}!`)
      );
      return;
    }

    this.#row++;
    if (this.#row >= 6) {
      this.#done = true;
      this.dispatchEvent(
        new GameRoundFailEvent(`It was ${this.#target.toUpperCase()}`)
      );
      return;
    }

    this.#rows[this.#row].disabled = false;
    this.#rows[this.#row].focus();
  }
```

- **Pass**: Score is `6 - row` (fewer guesses = higher score). The feedback
  text becomes the toast message.
- **Fail**: After 6 wrong guesses, the answer is revealed in the toast.
- **Continue**: Enable the next row and focus it.

## Step 9: Register Elements

```js
defineAll();
WordGame.define("word-game");
```

## What You Learned

- **`<game-word-source>`** fetches real words from the words API and distributes
  them to your game component via context. `mode="daily"` gives everyone the same
  word today; `mode="per-round"` gives a different word each round.
- **`validate`** on `<game-word-source>` silently drops guesses for words not in
  the dictionary — no dictionary code needed in your component.
- **`gameWordContext`** is subscribed in `connectedCallback` with `this.subscribe()`.
  The value updates before round effects fire, so your target word is always ready.
- **`<game-tile-input>`** provides a complete keyboard-driven tile input
  with cursor, focus management, and submit handling. Create rows
  dynamically with `document.createElement("game-tile-input")`.
- **`showResult(letters, states)`** colours tiles with built-in states:
  `"good"`, `"close"`, `"wrong"`.
- **`GameTileSubmitEvent`** fires when the player presses Enter with a
  complete word. Listen for `"game-tile-submit"` on a parent element.
- **`<game-audio>` and `<game-sample>`** add sound effects declaratively.
  `scale` mode creates procedural jingles that scale with performance.
- **`<game-flash>`** provides instant visual feedback with zero config.

## Next Steps

- [Word Source reference]({{ site.baseurl }}/api/components/word-source/) --
  full API for `<game-word-source>`, including themes and validation detail
- [Click Counter tutorial]({{ site.baseurl }}/tutorials/click-counter/) --
  the simplest round-based game
- [Reaction Time tutorial]({{ site.baseurl }}/tutorials/reaction-time/) --
  variable delays and retry failures
- [Tile Input reference]({{ site.baseurl }}/api/components/tile-input/) --
  full API for `<game-tile-input>`
- [Audio reference]({{ site.baseurl }}/api/components/audio/) --
  full reference for `<game-audio>` and `<game-sample>`
