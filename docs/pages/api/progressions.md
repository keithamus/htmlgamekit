---
layout: doc
title: "Round Progressions"
permalink: /api/progressions/
---

# Round Progressions

Progressions control **round progression and difficulty**. They decide how many rounds to play, what parameters each round uses, and when the game ends. The shell delegates to the progression at key moments — initialization, after each round, and at the end to compute thresholds.

## Progression Interface

Any object that implements the following methods can be used as a progression:

```ts
interface RoundProgression {
  /** Called when the game starts. Return the initial difficulty state. */
  init(rounds: number): DifficultyState;

  /** Called after each round. Return { difficulty, done }. */
  afterRound(state: GameState): { difficulty: DifficultyState; done: boolean };

  /** Optional. Called at the end to compute a summary threshold/score. */
  computeThreshold?(): any;
}
```

The object returned from `init` and `afterRound` is merged into the shell's `difficulty` signal, readable in components via `effectCallback({ difficulty })`.

---

## Declarative Usage

Progressions can be configured declaratively as attributes on `<game-shell>`. The `progression` attribute selects the progression class (`"fixed"`, `"staircase"`, or `"tier"`), and all other `progression-*` attributes are passed as constructor options (with kebab-case converted to camelCase).

```html
<game-shell game-id="demo" rounds="10"
            progression="fixed"
            progression-rounds="10"
            progression-params='{"size":{"start":40,"end":10}}'>
  …
</game-shell>
```

---

## FixedProgression

Runs a fixed number of rounds with parameters that interpolate linearly from start to end values.

<dl class="def">

<dt><span class="badge method">constructor(options)</span></dt>
<dd>

**Options:**

- `rounds` — `number` — Total rounds to play.
- `params` — `object` — Key-value pairs where each value is a `{ start, end }` object. The progression linearly interpolates between these across the rounds. Static values (not objects with `start`/`end`) are passed through unchanged.

```js
import { FixedProgression } from "htmlgamekit";

const progression = new FixedProgression({
  rounds: 10,
  params: {
    size: { start: 40, end: 10 },      // shrinks from 40 → 10
    speed: { start: 1000, end: 300 },   // speeds up from 1000ms → 300ms
  },
});
```
</dd>

</dl>

### HTML Usage

All `progression-*` attributes are passed as camelCase constructor options. There is no special `start-`/`end-` prefix parsing — to pass `params` declaratively, use a JSON value:

```html
<game-shell game-id="demo" rounds="10"
            progression="fixed"
            progression-rounds="10"
            progression-params='{"size":{"start":40,"end":10},"speed":{"start":1000,"end":300}}'>
</game-shell>
```

### `state.difficulty` Shape

```js
{
  round: 3,       // 0-based interpolated position (not the shell's 1-based round number)
  rounds: 10,
  size: 28,       // interpolated value for this round
  speed: 720,     // interpolated value for this round
}
```

Note: `difficulty.round` is the 0-based interpolation position computed by `FixedProgression`. It is **not** the same as `shell.round.get()` (which is 1-based and counts actual completed rounds). Use `shell.round.get()` to know which round the player is on.

All interpolated parameter values are available as top-level keys on the difficulty object.

---

## StaircaseProgression

An adaptive psychophysical staircase that adjusts difficulty based on player performance. Used for measuring perceptual thresholds (e.g. minimum detectable size, shortest reaction time).

<dl class="def">

<dt><span class="badge method">constructor(options)</span></dt>
<dd>

**Options (pick one level source):**

- `levels` -- `number[]` -- An explicit array of stimulus values (e.g. delta-E thresholds). The staircase walks up and down this array.
- `levelsStart`, `levelsEnd`, `levelsSteps` -- Generate levels automatically. `levelsScale` controls spacing: `"log"` (default) for logarithmic, `"linear"` for even steps.

**Other options:**

- `triesPerLevel` -- `number` *(default 2)* -- Trials at each level before a decision is made.
- `reversalsToStop` -- `number` *(default 8)* -- Number of direction reversals before the staircase terminates.
- `maxTrials` -- `number` *(default 40)* -- Hard cap on total trials.
- `correctToAdvance` -- `number` *(default 2)* -- Correct answers at a level needed to advance to a harder level.
- `maxFloorVisits` -- `number` *(default 3)* -- Times the easiest level can be visited before stopping.

```js
import { StaircaseProgression } from "htmlgamekit";

// Explicit levels:
const progression = new StaircaseProgression({
  levels: [0.2, 0.1, 0.05, 0.02, 0.01, 0.005],
  triesPerLevel: 2,
  reversalsToStop: 8,
});

// Or computed log-spaced levels:
const progression2 = new StaircaseProgression({
  levelsStart: 0.2,
  levelsEnd: 0.0003,
  levelsSteps: 20,
  levelsScale: "log",  // default
  reversalsToStop: 8,
});
```
</dd>

</dl>

### Static Methods

<dl class="def">

<dt><span class="badge method">static computeLevels(start, end, steps, scale?)</span></dt>
<dd>
Generate an array of level values. <code>scale</code> is <code>"log"</code> (default) or <code>"linear"</code>.

```js
const levels = StaircaseProgression.computeLevels(0.2, 0.0003, 20, "log");
// [0.2, 0.145, 0.105, ..., 0.000414, 0.0003]
```
</dd>

</dl>

### How It Works

1. The player starts at the **easiest** level (index 0).
2. After `triesPerLevel` trials, if the player got `correctToAdvance` or more correct, the level **increases** (harder). Otherwise it **decreases** (easier).
3. Each time the direction of level change reverses (going up then down or down then up), a **reversal** is recorded at the new level value.
4. The staircase ends when `reversalsToStop` reversals occur, `maxTrials` is reached, or `maxFloorVisits` is hit.

### HTML Usage

```html
<!-- Log-spaced levels computed from attributes -->
<game-shell game-id="demo"
            progression="staircase"
            progression-levels-start="0.2"
            progression-levels-end="0.0003"
            progression-levels-steps="20"
            progression-levels-scale="log"
            progression-tries-per-level="2"
            progression-reversals-to-stop="8"
            progression-max-trials="40"
            progression-correct-to-advance="2"
            progression-max-floor-visits="3">
</game-shell>
```

### `state.difficulty` Shape

```js
{
  level: 0.05,          // current stimulus value from the levels array
  levelIndex: 5,        // current level index (0-based)
  totalLevels: 21,      // total number of levels
  trial: 12,            // number of trials completed so far
  maxTrials: 40,        // hard cap on total trials
  reversals: 3,         // number of reversals so far
  reversalsNeeded: 8,   // reversals required to terminate
  threshold: 0.042,     // current estimated threshold
}
```

### Additional Properties

<dl class="def">

<dt><span class="badge method">.computeThreshold()</span></dt>
<dd>
Returns the average of the level <em>values</em> (stimulus values from the levels array) at the last up-to-6 reversals (requires at least 4). If fewer than 4 reversals have occurred, returns the current level value. Called automatically by the shell at game end and included in the final state.
</dd>

<dt><span class="badge prop">.reversals</span></dt>
<dd>
<code>number[]</code> — Array of level <em>values</em> (stimulus values from the levels array) where reversals occurred.
</dd>

<dt><span class="badge prop">.levelIndex</span></dt>
<dd>
<code>number</code> — The current level index (0-based).
</dd>

</dl>

---

## TierProgression

A tier-based progression system where players get promoted to harder tiers after consecutive correct answers, and demoted on failure.

<dl class="def">

<dt><span class="badge method">constructor(options)</span></dt>
<dd>

**Options:**

- `tiers` — `string | object[]` — Either a comma-separated string of tier names (e.g. `"Easy,Medium,Hard"`) or an array of objects with at least a `name` property (e.g. `[{ name: "Easy", speed: 1 }, { name: "Hard", speed: 2 }]`). When objects are used, their additional properties are passed through into the `difficulty.tier` object.
- `promoteAfter` — `number` — Consecutive correct answers needed to promote (default `2`).
- `demoteAfter` — `number` — Incorrect answers that cause a demotion (default `1`).
- `points` — `number[]` — Points awarded per tier. Defaults to `[1, 2, 3, ...]` (tier index + 1).

```js
import { TierProgression } from "htmlgamekit";

const progression = new TierProgression({
  tiers: "Easy,Medium,Hard,Expert",
  promoteAfter: 3,
});
```
</dd>

</dl>

### How It Works

1. The player starts at **tier 0** (easiest).
2. After `promoteAfter` consecutive correct answers, the player is **promoted** to the next tier.
3. Any incorrect answer **demotes** the player one tier (minimum tier 0) and resets the streak.
4. Points per tier default to the tier index + 1 (tier 0 = 1 pt, tier 1 = 2 pts, etc.).
5. The game runs for a fixed number of rounds (set on the shell).

### HTML Usage

```html
<game-shell game-id="demo" rounds="15"
            progression="tier"
            progression-tiers="Easy,Medium,Hard"
            progression-promote-after="2">
</game-shell>
```

### `state.difficulty` Shape

```js
{
  tierIndex: 2,            // current tier (0-based)
  tierName: "Hard",        // tier name string
  tier: { name: "Hard" },  // the full tier object
  peakTier: 2,             // highest tier reached
  points: 3,               // point value for current tier
  consecutiveCorrect: 0,   // current streak
}
```

### Additional Properties

<dl class="def">

<dt><span class="badge prop">.tierIndex</span></dt>
<dd>
<code>number</code> — The current tier index (0-based).
</dd>

<dt><span class="badge prop">.peakTier</span></dt>
<dd>
<code>number</code> — The highest tier the player has reached during this game.
</dd>

</dl>

---

## Custom Progressions

You can implement any progression logic by providing an object with `init` and `afterRound` methods.

```js
const myProgression = {
  init(rounds) {
    return { level: 1, maxLevel: 20 };
  },

  afterRound(state) {
    const passed = state.lastRoundPassed;
    const prev = state.difficulty;
    const level = passed
      ? Math.min(prev.level + 1, prev.maxLevel)
      : Math.max(prev.level - 1, 1);
    return {
      difficulty: { ...prev, level },
      done: state.round >= state.rounds,
    };
  },

  computeThreshold() {
    return state.difficulty.level;
  },
};

// Set it on the shell
const shell = document.querySelector("game-shell");
shell.progressionSet = myProgression;
```

Or assign it programmatically before the game starts:

```js
shell.progressionSet = myProgression;
shell.start();
```
