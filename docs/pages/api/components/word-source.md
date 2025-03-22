---
title: "GameWordSource"
permalink: /api/components/word-source/
demo: word-source
demoHeight: 480px
demoTitle: Word source demo
cemSkip: [attrs, events]
---

A logic-only component (no shadow DOM) that fetches words from a compatible words API and distributes the current word to child components via the [context protocol]({{ site.baseurl }}/api/context/). Optionally validates submitted guesses against the API's `/lookup` endpoint before they reach game logic.

Place a single `<game-word-source>` inside `<game-shell>`. In `daily` mode the shell's `game-id` is automatically used as a seed (`?day&seed=game-id`), so different games hosted on the same API receive different words of the day.

### Attributes

<dl class="def">

<dt><span class="badge attr">words-url</span></dt>
<dd>
<code>string?</code> — Base URL of the words API, e.g. <code>https://words.htmlgamekit.dev</code>. No fetch is made when this attribute is absent.
</dd>

<dt><span class="badge attr">length</span></dt>
<dd>
<code>long</code> — Word length to request. Defaults to <code>5</code>.
</dd>

<dt><span class="badge attr">theme</span></dt>
<dd>
<code>string?</code> — Theme filter passed to the API. Supported values depend on the API; for <code>words.htmlgamekit.dev</code> these are <code>general</code>, <code>animal</code>, <code>plant</code>, <code>food</code>, <code>colour</code>, <code>place</code>, <code>body</code>, and <code>nonsense</code>. Combine multiple themes with <code>+</code>:

```html
<game-word-source
  words-url="https://words.htmlgamekit.dev"
  theme="animal+food"
  length="5"
  mode="daily"
>
</game-word-source>
```

When absent the API uses its own default pool (all real-word themes).

</dd>

<dt><span class="badge attr">mode</span></dt>
<dd>
<code>"daily" | "random" | "per-round"</code> — Word selection strategy. Defaults to <code>"daily"</code>.

| Mode        | Behaviour                                                                                                                    |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `daily`     | Fetches once using `?day&seed=game-id`. Same word for all players on a given day. Reused across all rounds within a session. |
| `random`    | Fetches once per game start using `?random`. A new word every time Play is pressed.                                          |
| `per-round` | Fetches a new random word at the start of every round. Each of the 5 rounds has a different word.                            |

</dd>

<dt><span class="badge attr">validate</span></dt>
<dd>
<code>boolean</code> — When present, every <code>game-tile-submit</code> event is intercepted and the guessed word is checked against the API's <code>/lookup/{word}</code> endpoint before the event is allowed to reach game logic. Words not found in the dictionary are silently dropped — the tile stays active and the player can try again.

On network error the guess is let through, so a slow connection never blocks the player.

```html
<game-word-source words-url="https://words.htmlgamekit.dev" validate>
</game-word-source>
```

</dd>

</dl>

### Properties

<dl class="def">

<dt><span class="badge prop">.word</span></dt>
<dd>
<code>string</code> — The currently active word. Empty string when no word has been fetched yet.

```js
const src = document.querySelector("game-word-source");
console.log(src.word); // "crane"
```

</dd>

</dl>

### Context

The current word is distributed via `gameWordContext` using the [WICG Context Protocol]({{ site.baseurl }}/api/context/). Any component inside the same shell can subscribe:

```js
import { gameWordContext } from "htmlgamekit/words";

class WordGame extends GameComponent {
  connectedCallback() {
    this.subscribe(gameWordContext, (word) => {
      this.#target = word;
    });
    // ...
  }
}
```

The context value starts as `""` and updates each time a fetch completes or the daily cache is replayed.

### Events Dispatched

<dl class="def">

<dt><span class="badge event">pending-task</span></dt>
<dd>
Fired on the element when a fetch begins. The event's <code>.complete</code> property is a Promise that resolves when the fetch settles. Compatible with any loading-indicator component that listens for <code>pending-task</code> events.
</dd>

</dl>

### Signal Access

| Signal              | Usage                                                                                                                       |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `shell.scene`       | Triggers fetch when scene enters `"playing"`                                                                                |
| `shell.round`       | (per-round mode only) Triggers a fresh fetch on each new round                                                              |
| `shell.roundScores` | Detects game restart in random mode — `start()` resets `roundScores` to a new empty array even when scene stays `"playing"` |
| `shell.gameIdAttr`  | Read in daily mode to use as the API seed                                                                                   |

### Validation Detail

When `validate` is set, the component intercepts `game-tile-submit` events at capture time on the shell using `stopImmediatePropagation`. It then calls the `/lookup/{word}` endpoint. If the word is found (`200 OK`) a new `game-tile-submit` event is dispatched on the shell so game logic sees it normally. If not found (`404`) the event is discarded. On any network error the guess is forwarded unconditionally.

### Usage

Word of the day, 5-letter general vocabulary:

```html
<game-shell
  game-id="my-wordle"
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
  <!-- ... -->
</game-shell>
```

Random animal word each round, no validation:

```html
<game-word-source
  words-url="https://words.htmlgamekit.dev"
  length="5"
  theme="animal"
  mode="per-round"
>
</game-word-source>
```

Accessing the word in a game component:

```js
import { GameComponent, gameWordContext } from "htmlgamekit";

class WordGame extends GameComponent {
  #target = "";

  connectedCallback() {
    this.subscribe(gameWordContext, (word) => {
      this.#target = word;
    });
    super.connectedCallback();
  }

  effectCallback({ scene, round }) {
    if (scene.get() === "playing" && round.get() !== this.#round) {
      this.#round = round.get();
      this.#newBoard(); // #target is already set via context
    }
  }
}
```

The context callback fires before the effect that starts a new round, so `this.#target` is always set by the time `#newBoard()` runs.
