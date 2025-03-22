---
layout: doc
title: "Tutorial: Scoring & Leaderboards"
permalink: /tutorials/scoring/
---

In this tutorial you will add online scoring, a leaderboard, and score submission to a game. The scoring system is built into HTMLGameKit -- you just need a `score-url` attribute and two components.

This tutorial works with any existing HTMLGameKit game. We will use the [Click Counter]({{ site.baseurl }}/tutorials/click-counter/) as the base.

## Step 1: Enable the Score Service

Add the `score-url` attribute to your `<game-shell>`. The default score server at `scores.htmlgamekit.dev` is free to use:

```html
<game-shell
  id="game"
  game-id="click-counter"
  rounds="10"
  score-order="asc"
  between-delay="300"
  score-url="https://scores.htmlgamekit.dev"
></game-shell>
```

That single attribute enables the entire scoring pipeline. The shell will:

1. Fetch an anti-cheat token when the game starts.
2. Record check-in timestamps at each round.
3. Make the token available to `<game-score-form>` for submission.

The `game-id` attribute is used to namespace scores, so different games on the same server never collide.

## Step 2: Add the Score Form

Place a `<game-score-form>` in your result overlay. It provides a name input and submit button:

```html
<div when-some-scene="result" data-overlay>
  <h1>Done!</h1>
  <game-result-stat format="ms" label="Total time"></game-result-stat>

  <game-score-form></game-score-form>

  <button commandfor="game" command="--restart">Play again</button>
</div>
```

The form handles its own lifecycle automatically:

- **While connecting** -- the input and button are disabled, showing "Connecting...".
- **Once ready** -- the player types their name and clicks "Submit".
- **While submitting** -- the button shows "Submitting..." and is disabled.
- **On success** -- the form is replaced with "Submitted as ALICE".
- **On failure** -- the button shows "Retry".

No JavaScript needed.

## Step 3: Add the Leaderboard

Place a `<game-leaderboard>` in the result overlay to show top scores, and add `<game-score-histogram>` if you also want the distribution chart:

```html
<div when-some-scene="result" data-overlay>
  <h1>Done!</h1>
  <game-result-stat format="ms" label="Total time"></game-result-stat>

  <game-score-form></game-score-form>
  <game-leaderboard></game-leaderboard>
  <game-score-histogram></game-score-histogram>

  <button commandfor="game" command="--restart">Play again</button>
</div>
```

When the game enters the `result` state, the leaderboard automatically fetches:

- **Top 3 scores** -- shown in a table.
- **Bottom 3 scores** -- shown below the top scores with a separator.

The histogram is a separate `<game-score-histogram>` component that shows the full score distribution with a "You" marker at the player's score.

## Step 4: Custom Score Formatting

For a reaction time game, raw scores like `1523` are not very readable. Configure formatting on the shell and leaderboard:

```js
const shell = document.querySelector("game-shell");

// Format the score on result stat and share text
shell.formatScore = (score) => `${score}ms`;
```

Setting `shell.formatScore` also applies to the leaderboard and challenge
components automatically — they pass `entry.score` to it. Only set
`lb.formatScore` directly if you need the full entry object:

```js
// The leaderboard picks this up automatically from the shell
shell.formatScore = (score) => `${score}ms`;
```

You can also set `format="ms"` on `<game-result-stat>` for simpler cases:

```html
<game-result-stat format="ms" label="Total time"></game-result-stat>
```

`formatScore` is for display only. It does not change the raw score that is
stored, submitted to the server, or encoded into share URLs. The score signal
always holds the raw value from round events.

## Step 5: Score Order

The `score-order` attribute on `<game-shell>` tells the leaderboard which direction is "better":

```html
<!-- Lower is better (reaction time, golf) -->
<game-shell score-order="asc" ...>
  <!-- Higher is better (quiz score, points) -->
  <game-shell score-order="desc" ...></game-shell
></game-shell>
```

This affects leaderboard sorting and histogram labeling. The default is `"asc"` (lower is better).

## Step 6: Result Messages

Use `<game-result-message>` with `<option>` children to show score-dependent
feedback. Each `<option>` supports `when-*` condition attributes. One matching
option is picked at random:

```html
<game-result-message>
  <option when-max-score="2000">Blazing fast! You're a machine.</option>
  <option when-min-score="2001" when-max-score="4000">
    Solid clicks. Good rhythm.
  </option>
  <option when-min-score="4001">A bit slow, but you finished!</option>
</game-result-message>
```

This uses the same `<option>` + `when-*` pattern as `<game-toast>`. Multiple
options for the same range are fine -- one is chosen randomly, so you can
provide variety.

## Step 7: Sharing Results

The `<game-share>` component works alongside scoring. When `encodeResult` is set on the shell, shared URLs include the player's result, enabling challenge mode:

```js
import { GameShell } from "htmlgamekit";

const shell = document.querySelector("game-shell");

// Use the built-in helpers — they return URL-safe base64url strings.
// encodeUint16WithBitmask packs the total score + per-round pass/fail strip.
shell.encodeResult = GameShell.encodeUint16WithBitmask();
shell.decodeResult = GameShell.decodeUint16WithBitmask();
```

When another player opens the shared URL, the `<game-challenge>` component shows the challenger's score with a taunt message.

## Full Result Overlay

Here is a complete result overlay with all scoring components:

```html
<div when-some-scene="result" data-overlay>
  <h1>Results</h1>

  <game-result-stat format="ms" label="Total time" animate="800">
  </game-result-stat>

  <game-result-message>
    <option when-max-score="2000">Blazing fast! You're a machine.</option>
    <option when-min-score="2001" when-max-score="4000">
      Solid clicks. Good rhythm.
    </option>
    <option when-min-score="4001">A bit slow, but you finished!</option>
  </game-result-message>

  <game-score-form></game-score-form>
  <game-leaderboard></game-leaderboard>

  <div
    style="display:flex; gap:12px;
    flex-wrap:wrap; justify-content:center;
    margin-top:24px"
  >
    <game-share></game-share>
    <button commandfor="game" command="--restart">Play again</button>
  </div>
</div>
```

## Using a Custom Score Server

The default server at `scores.htmlgamekit.dev` works out of the box, but you can point to your own server:

```html
<game-shell score-url="https://api.example.com" ...></game-shell>
```

Your server must implement the same REST API. See the [Scoring guide]({{ site.baseurl }}/scoring/) for the full endpoint specification.

## Programmatic Score Service

For advanced use cases, create a score service directly:

```js
import { gameScores, noopScores } from "htmlgamekit";

// Create a service manually
const scores = gameScores("my-game", {
  baseUrl: "https://scores.htmlgamekit.dev",
});

// Or assign to the shell
const shell = document.querySelector("game-shell");
shell.scores = scores;
```

Use `noopScores` as a placeholder when testing without a server:

```js
import { noopScores } from "htmlgamekit";
shell.scores = noopScores;
```

## What You Learned

- **`score-url`** on `<game-shell>` enables the scoring pipeline with a single attribute.
- **`<game-score-form>`** handles the full submit lifecycle (connecting, submitting, confirmation) with no JavaScript.
- **`<game-leaderboard>`** fetches and displays a leaderboard table and histogram automatically.
- **`formatScore`** customizes how scores are displayed. It is for display only and does not change the raw score.
- **`score-order`** controls whether higher or lower scores are better.
- **`<game-result-message>`** uses `<option>` children with `when-*` conditions for score-dependent feedback.
- The default server at **`scores.htmlgamekit.dev`** is free to use. Custom servers just need to implement the same REST API.

## Next Steps

- [Scoring guide]({{ site.baseurl }}/scoring/) -- full reference for the score service API and custom server endpoints
- [Score Form reference]({{ site.baseurl }}/api/components/score-form/) -- all parts and states
- [Leaderboard reference]({{ site.baseurl }}/api/components/leaderboard/) -- histogram details and formatting
- [Word Guess tutorial]({{ site.baseurl }}/tutorials/word-guess/) -- build a Wordle-style game with `<game-tile-input>` and declarative audio
