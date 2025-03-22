---
layout: doc
title: "Signals"
permalink: /api/signals/
---

`<game-shell>` exposes all game state as individual `Signal.State` instances
from the [TC39 Signals proposal](https://github.com/tc39/proposal-signals)
(via `signal-polyfill`). Each signal can be read with `.get()` and written with
`.set()`. When a signal's value changes, any `effect()` that read it
automatically re-runs.

Game components access signals via `this.shell` and observe them by implementing `effectCallback`.
The shell is passed as the argument and you destructure only the signals you need:

```js
effectCallback({ scene, round }) {
  // Re-runs whenever scene or round changes
  if (scene.get() === "playing") {
    this.#setupRound(round.get());
  }
}
```

`effectCallback` is automatically called when the component connects and
re-called whenever any signal read inside it changes. It is automatically
cleaned up when the component disconnects.

## Built-in Signals

| Signal              | Type               | Description                                                             |
| ------------------- | ------------------ | ----------------------------------------------------------------------- |
| `scene`             | `string`           | Current game scene name                                                 |
| `round`             | `number`           | Current round number (1-indexed)                                        |
| `rounds`            | `number \| null`   | Total configured rounds                                                 |
| `score`             | `number`           | Accumulated score                                                       |
| `roundScores`       | `number[]`         | Per-round score array                                                   |
| `roundScore`        | `number`           | Score of the most recently completed round _(computed)_                 |
| `bestRoundScore`    | `number`           | Highest score across all completed rounds _(computed)_                  |
| `worstRoundScore`   | `number`           | Lowest score across all completed rounds _(computed)_                   |
| `scoreOrder`        | `"asc" \| "desc"`  | Whether lower (`asc`) or higher (`desc`) scores are better              |
| `lastRoundPassed`   | `boolean \| null`  | Result of the most recent round                                         |
| `lastFeedback`      | `string \| null`   | Feedback string from the most recent round event                        |
| `passStreak`        | `number`           | Current consecutive pass streak                                         |
| `failStreak`        | `number`           | Current consecutive fail streak                                         |
| `peakPassStreak`    | `number`           | Highest pass streak reached this game                                   |
| `peakFailStreak`    | `number`           | Highest fail streak reached this game                                   |
| `difficulty`        | `object \| null`   | Difficulty object from the active progression director                  |
| `stats`             | `object`           | Arbitrary `{ key: value }` stats map, updated via `GameStatUpdateEvent` |
| `storageKey`        | `string`           | localStorage persistence key                                            |
| `gameId`            | `string`           | Game identifier                                                         |
| `betweenDelay`      | `number`           | Milliseconds between rounds                                             |
| `encodedResult`     | `string \| null`   | Compact encoded result for sharing or challenges                        |
| `groupId`           | `string \| null`   | Group identifier, or null when not in group play                        |
| `groupName`         | `string \| null`   | Group display name, or null                                             |
| `challenge`         | `object \| null`   | Opponent's decoded result for challenge mode                            |
| `formatScoreSignal` | `function \| null` | Score formatting function, set via `shell.formatScore`                  |
| `spriteSheet`       | `string`           | URL of the SVG sprite sheet, mirrors the `sprite-sheet` attribute       |

## Effect Scheduling

Effects are batched via microtasks. When a signal value changes, the watcher
schedules a microtask to process all pending computed signals. This means
multiple signal writes in the same synchronous block coalesce into a single
effect run.

## Writing Signals

The shell writes signals in response to game events. You can also write them
directly in JS for advanced use cases:

```js
const shell = document.querySelector("game-shell");

// Directly update a stat signal
shell.stats.set({ ...shell.stats.get(), combo: 5 });

// Or use GameStatUpdateEvent (preferred — keeps logic in the component):
this.dispatchEvent(new GameStatUpdateEvent("combo", 5));
```

Prefer dispatching events from game components over directly writing shell
signals — it keeps mechanics decoupled from the shell.

## Relationship to Context

Game signals are **not** distributed via the Context Protocol. They are
properties directly on `<game-shell>`, accessed via the `this.shell` DOM
traversal. The Context Protocol is used for data that flows from a custom
parent to its descendants — for example, `<game-word-source>` distributes the
current word via `gameWordContext`.

See [Context Protocol]({{ site.baseurl }}/api/context/) for details.
