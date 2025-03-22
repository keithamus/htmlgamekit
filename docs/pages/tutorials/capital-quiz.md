---
layout: doc
title: "Tutorial: Capital Quiz"
permalink: /tutorials/capital-quiz/
---

In this tutorial you will build a multiple-choice geography quiz with adaptive
difficulty. The player names capital cities across four tiers -- Easy, Medium,
Hard, and Expert. Get two right in a row to level up; get one wrong and drop
back down.

This tutorial introduces **TierProgression**, **`<game-timer>`**, the built-in
**`<game-quiz>`** component, and **`<game-result-message>`** for
score-dependent result text.

<a href="{{ site.baseurl }}/examples/quiz/" class="tutorial-demo-link">Play the finished game</a>

## Step 1: HTML with TierProgression and Timer

Start with the shell. This game uses `score-order="desc"` because higher
scores are better (more correct answers), and `progression` attributes
for adaptive difficulty:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Capital Quiz</title>
    <link rel="stylesheet" href="path/to/htmlgamekit/src/game-base.css" />
  </head>
  <body>
    <game-shell
      id="game"
      game-id="capital-quiz"
      storage-key="capital-quiz"
      rounds="15"
      score-order="desc"
      between-delay="600"
      progression="tier"
      progression-tiers="Easy,Medium,Hard,Expert"
      progression-promote-after="2"
    >
    </game-shell>

    <script type="module" src="quiz-game.js"></script>
  </body>
</html>
```

The **TierProgression** manages a list of tiers. The player starts at the first
tier (Easy). After `promote-after` consecutive correct answers they move up.
Any wrong answer drops them back one tier. Your game reads the current tier
from the `difficulty` signal, destructured in `effectCallback` as `{ difficulty }`.

## Step 2: Overlays and HUD

Add the intro overlay, HUD, timer, and feedback. The HUD shows the current
tier and streak alongside the round counter:

```html
<div when-some-scene="intro" data-overlay>
  <h1>Capital Quiz</h1>
  <p>
    Name the capital city. Get two right in a row to level up. Get one wrong and
    you drop back down. 15 rounds.
  </p>
  <button commandfor="game" command="--start">Start</button>
</div>

<div when-some-scene="playing between paused">
  <game-round-counter></game-round-counter>
  <game-stat key="tier" format="plain">Tier</game-stat>
  <game-stat key="streak" format="plain">Streak</game-stat>
</div>

<game-timer when-some-scene="playing between paused" duration="10"></game-timer>
<game-toast
  when-some-scene="playing between paused"
  trigger="pass"
></game-toast>
<game-toast
  when-some-scene="playing between paused"
  trigger="fail"
></game-toast>
```

- **`<game-timer when-some-scene="playing between paused" duration="10">`** adds a 10-second countdown bar. When it
  expires it fires `GameTimerExpiredEvent`, which the shell treats as a round
  failure. You do not need to handle the timer yourself.
- **`<game-stat key="tier">`** and **`<game-stat key="streak">`** use
  `format="plain"` because these are text/number values, not milliseconds.

## Step 3: The `<game-quiz>` Component

HTMLGameKit includes a built-in `<game-quiz>` element that handles
multiple-choice quiz logic. You define questions as `<fieldset>` elements
inside it, each tagged with a `data-tier` attribute:

```html
<div when-some-scene="playing between paused">
  <game-quiz>
    <fieldset data-tier="0">
      <legend>What is the capital of France?</legend>
      <label>
        <input type="radio" name="q" value="Paris" data-correct /> Paris
      </label>
      <label> <input type="radio" name="q" value="Lyon" /> Lyon </label>
      <label>
        <input type="radio" name="q" value="Marseille" /> Marseille
      </label>
      <label> <input type="radio" name="q" value="Nice" /> Nice </label>
    </fieldset>

    <fieldset data-tier="0">
      <legend>What is the capital of Japan?</legend>
      <label>
        <input type="radio" name="q" value="Tokyo" data-correct /> Tokyo
      </label>
      <label> <input type="radio" name="q" value="Osaka" /> Osaka </label>
      <label> <input type="radio" name="q" value="Kyoto" /> Kyoto </label>
      <label>
        <input type="radio" name="q" value="Hiroshima" /> Hiroshima
      </label>
    </fieldset>

    <!-- more tier 0 questions ... -->

    <fieldset data-tier="1">
      <legend>What is the capital of Turkey?</legend>
      <label>
        <input type="radio" name="q" value="Ankara" data-correct /> Ankara
      </label>
      <label> <input type="radio" name="q" value="Istanbul" /> Istanbul </label>
      <label> <input type="radio" name="q" value="Izmir" /> Izmir </label>
      <label> <input type="radio" name="q" value="Antalya" /> Antalya </label>
    </fieldset>

    <!-- more tier 1, 2, 3 questions ... -->
  </game-quiz>
</div>
```

The `<game-quiz>` component handles everything internally:

- **Question selection** -- picks an unused question from the current tier's
  pool, falling back to adjacent tiers if the pool is exhausted.
- **Answer shuffling** -- randomises the order of answer labels each round.
- **Feedback** -- highlights the correct answer in green and the wrong answer
  in red.
- **Events** -- dispatches `GameRoundPassEvent(1, "Correct!")` or
  `GameRoundFailEvent("Wrong!")` automatically.
- **Stats** -- dispatches `GameStatUpdateEvent("tier", tierName)` and
  `GameStatUpdateEvent("streak", streak)` to keep the HUD up to date.

Each `<fieldset>` is a question. The `<legend>` is the question text. The
correct answer has `data-correct` on its `<input>`. The `data-tier` attribute
maps to the progression's tier index (0 = Easy, 1 = Medium, etc.).

## Step 4: Question Tiers

Organise your questions into pools that match your tier configuration. The
tier indices must align:

| `data-tier` | Director tier       | Difficulty                                               |
| ----------- | ------------------- | -------------------------------------------------------- |
| `0`         | `{"name":"Easy"}`   | Well-known capitals (Paris, Tokyo, Berlin)               |
| `1`         | `{"name":"Medium"}` | Commonly confused (Ankara not Istanbul, Bern not Zurich) |
| `2`         | `{"name":"Hard"}`   | Lesser-known (Yamoussoukro, Astana, Belmopan)            |
| `3`         | `{"name":"Expert"}` | Obscure (Funafuti, Naypyidaw, Moroni)                    |

Add enough questions per tier to fill the game. With 15 rounds and 4 tiers,
having 6-10 questions per tier is a good target.

## Step 5: Result Messages

Use the declarative `<game-result-message>` element for score-dependent result
text. Add multiple messages per score range -- the component picks one at
random, giving the player some variety on replays:

```html
<div when-some-scene="result" data-overlay>
  <h1>Results</h1>
  <game-result-stat label="Score"></game-result-stat>

  <game-result-message>
    <option when-max-score="7">
      Rough showing. Maybe start with a map of Europe and work outward.
    </option>
    <option when-max-score="7">Geography is not your strong suit. Yet.</option>
    <option when-min-score="8" when-max-score="10">
      Not bad. You know the big ones at least.
    </option>
    <option when-min-score="8" when-max-score="10">
      Decent. You won't get lost in Europe, probably.
    </option>
    <option when-min-score="11" when-max-score="13">
      Solid knowledge. You've been paying attention.
    </option>
    <option when-min-score="11" when-max-score="13">
      Impressive. Your pub quiz team is lucky to have you.
    </option>
    <option when-min-score="14">
      Geography expert. You clearly own a globe.
    </option>
    <option when-min-score="14">Flawless. Are you a diplomat?</option>
  </game-result-message>

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

With two messages per score range, the player sees some variety on replays.
If `when-min-score` is omitted the message matches from 0. If `when-max-score` is
omitted it matches up to infinity.

## Step 6: The JavaScript

Because `<game-quiz>` handles all the game logic, the JavaScript file is
minimal -- just register the framework elements:

```js
import { defineAll } from "htmlgamekit";
defineAll();
```

That is the entire file. The quiz component, timer, director, HUD stats,
feedback, and result messages all work declaratively from the HTML.

## Full Code

Here is the complete `index.html` (abbreviated to show the structure -- add
as many questions per tier as you like):

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Capital Quiz</title>
    <link rel="stylesheet" href="path/to/htmlgamekit/src/game-base.css" />
  </head>
  <body>
    <game-shell
      id="game"
      game-id="capital-quiz"
      storage-key="capital-quiz"
      rounds="15"
      score-order="desc"
      between-delay="600"
      progression="tier"
      progression-tiers="Easy,Medium,Hard,Expert"
      progression-promote-after="2"
    >
      <div when-some-scene="intro" data-overlay>
        <h1>Capital Quiz</h1>
        <p>
          Name the capital city. Get two right in a row to level up. Get one
          wrong and you drop back down. 15 rounds.
        </p>
        <button commandfor="game" command="--start">Start</button>
      </div>

      <div when-some-scene="playing between paused">
        <game-round-counter></game-round-counter>
        <game-stat key="tier" format="plain">Tier</game-stat>
        <game-stat key="streak" format="plain">Streak</game-stat>
      </div>

      <game-timer
        when-some-scene="playing between paused"
        duration="10"
      ></game-timer>
      <game-toast
        when-some-scene="playing between paused"
        trigger="pass"
      ></game-toast>
      <game-toast
        when-some-scene="playing between paused"
        trigger="fail"
      ></game-toast>

      <div when-some-scene="playing between paused">
        <game-quiz>
          <!-- Tier 0: Easy -->
          <fieldset data-tier="0">
            <legend>What is the capital of France?</legend>
            <label>
              <input type="radio" name="q" value="Paris" data-correct /> Paris
            </label>
            <label> <input type="radio" name="q" value="Lyon" /> Lyon </label>
            <label>
              <input type="radio" name="q" value="Marseille" /> Marseille
            </label>
            <label> <input type="radio" name="q" value="Nice" /> Nice </label>
          </fieldset>
          <!-- ... more Easy questions ... -->

          <!-- Tier 1: Medium -->
          <fieldset data-tier="1">
            <legend>What is the capital of Turkey?</legend>
            <label>
              <input type="radio" name="q" value="Ankara" data-correct /> Ankara
            </label>
            <label>
              <input type="radio" name="q" value="Istanbul" /> Istanbul
            </label>
            <label> <input type="radio" name="q" value="Izmir" /> Izmir </label>
            <label>
              <input type="radio" name="q" value="Antalya" /> Antalya
            </label>
          </fieldset>
          <!-- ... more Medium questions ... -->

          <!-- Tier 2: Hard -->
          <fieldset data-tier="2">
            <legend>What is the capital of Ivory Coast?</legend>
            <label>
              <input type="radio" name="q" value="Yamoussoukro" data-correct />
              Yamoussoukro
            </label>
            <label>
              <input type="radio" name="q" value="Abidjan" /> Abidjan
            </label>
            <label>
              <input type="radio" name="q" value="Bouake" /> Bouake
            </label>
            <label> <input type="radio" name="q" value="Daloa" /> Daloa </label>
          </fieldset>
          <!-- ... more Hard questions ... -->

          <!-- Tier 3: Expert -->
          <fieldset data-tier="3">
            <legend>What is the capital of Tuvalu?</legend>
            <label>
              <input type="radio" name="q" value="Funafuti" data-correct />
              Funafuti
            </label>
            <label>
              <input type="radio" name="q" value="Nanumea" /> Nanumea
            </label>
            <label> <input type="radio" name="q" value="Nui" /> Nui </label>
            <label>
              <input type="radio" name="q" value="Vaitupu" /> Vaitupu
            </label>
          </fieldset>
          <!-- ... more Expert questions ... -->
        </game-quiz>
      </div>

      <div when-some-scene="result" data-overlay>
        <h1>Results</h1>
        <game-result-stat label="Score"></game-result-stat>
        <game-result-message>
          <option when-max-score="7">
            Rough showing. Maybe start with a map of Europe and work outward.
          </option>
          <option when-max-score="7">
            Geography is not your strong suit. Yet.
          </option>
          <option when-min-score="8" when-max-score="10">
            Not bad. You know the big ones at least.
          </option>
          <option when-min-score="8" when-max-score="10">
            Decent. You won't get lost in Europe, probably.
          </option>
          <option when-min-score="11" when-max-score="13">
            Solid knowledge. You've been paying attention.
          </option>
          <option when-min-score="11" when-max-score="13">
            Impressive. Your pub quiz team is lucky to have you.
          </option>
          <option when-min-score="14">
            Geography expert. You clearly own a globe.
          </option>
          <option when-min-score="14">Flawless. Are you a diplomat?</option>
        </game-result-message>
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

    <script type="module" src="quiz-game.js"></script>
  </body>
</html>
```

And the complete `quiz-game.js`:

```js
import { defineAll } from "htmlgamekit";
defineAll();
```

## What You Learned

- **`progression="tier"`** manages adaptive difficulty with
  promote/demote logic. You define tiers and set `progression-promote-after` -- the
  director handles the rest.
- **`<game-timer>`** adds a countdown that auto-fails the round when it
  expires. No JavaScript required.
- **`<game-quiz>`** is a full quiz engine built into HTMLGameKit. You provide
  questions as HTML fieldsets and it handles selection, shuffling, feedback,
  and events.
- **`<game-result-message>`** gives declarative, score-dependent result text
  with built-in randomisation.
- A game can be **entirely declarative** -- the Capital Quiz needs only
  two lines of JavaScript.

## Next Steps

- [Word Guess tutorial]({{ site.baseurl }}/tutorials/word-guess/) --
  build a Wordle-style game with `<game-tile-input>` and declarative audio
- [Scoring & Leaderboards tutorial]({{ site.baseurl }}/tutorials/scoring/) --
  add online scoring, leaderboards, and challenge mode
- [Click Counter tutorial]({{ site.baseurl }}/tutorials/click-counter/) --
  if you haven't already, start with the basics
- [UI Components reference]({{ site.baseurl }}/api/components/) -- full
  details on `<game-quiz>`, `<game-timer>`, `<game-result-message>`, and all
  other built-in components
- [Directors reference]({{ site.baseurl }}/api/progressions/) -- TierProgression,
  FixedProgression, and StaircaseProgression in depth
