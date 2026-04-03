---
layout: doc
title: "Events"
permalink: /api/events/
---

All HTMLGameKit events **bubble** and are **composed** (they cross shadow DOM boundaries). This means you can dispatch them from any depth in the component tree and `<game-shell>` will catch them.

## Round Lifecycle

Game mechanics communicate with the shell by dispatching custom DOM events. The shell catches them, updates signals, and drives scene transitions:

```txt
1. Scene enters "playing"
   → Timer starts (if present)
   → Game mechanic sets up the round

2. Player interacts
   → GameRoundPassEvent(score, feedback)   success
   OR GameRoundFailEvent(reason, retry)    failure
   OR GameTimerExpiredEvent                time ran out

3. Shell catches the event, updates signals
   → scene → "between"
   → Director computes next difficulty
   → After betweenDelay, round increments, scene → "playing"

4. After all rounds (or GameCompleteEvent)
   → scene → "result"
```

## Event Overview

| Event                    | Fired by             | Caught by                 |
| ------------------------ | -------------------- | ------------------------- |
| `game-round-pass`        | Your game            | Shell                     |
| `game-round-fail`        | Your game            | Shell                     |
| `game-timer-tick`        | `<game-timer>`       | Your game (optional)      |
| `game-timer-expired`     | `<game-timer>`       | Shell                     |
| `game-timer-countdown`   | `<game-timer>`       | `<game-audio>` (optional) |
| `game-stat-update`       | Your game            | Shell                     |
| `game-lifecycle`         | Shell                | Your entry script         |
| `game-start-request`     | Intro button         | Shell                     |
| `game-restart-request`   | Result button        | Shell                     |
| `game-complete`          | Your game            | Shell                     |
| `game-pause-request`     | Any child            | Shell                     |
| `game-resume-request`    | Any child            | Shell                     |
| `game-next-round`        | Any child            | Shell                     |
| `game-practice-start`    | Any child            | Shell                     |
| `game-trophy-unlock`     | `<game-trophy>`      | Shell                     |
| `game-tile-input`        | `<game-tile-input>`  | `<game-audio>`            |
| `game-tile-submit`       | `<game-tile-input>`  | Your game                 |
| `pending-task`           | Any component        | Shell                     |
| `game-collection-add`    | Your game / `<game-passage>` | Shell              |
| `game-collection-remove` | Your game            | Shell                     |
| `game-preference-change` | `<game-preferences>` | Your entry script         |

---

## Import

```js
import {
  GameRoundPassEvent,
  GameRoundFailEvent,
  GameTimerTickEvent,
  GameTimerExpiredEvent,
  GameTimerCountdownEvent,
  GameStatUpdateEvent,
  GameLifecycleEvent,
  GameStartRequestEvent,
  GameRestartRequestEvent,
  GameCompleteEvent,
  GamePauseRequestEvent,
  GameResumeRequestEvent,
  GameNextRoundEvent,
  GamePracticeStartEvent,
  GameTileInputEvent,
  GameTileSubmitEvent,
  GameCollectionAddEvent,
  GameCollectionRemoveEvent,
  PendingTaskEvent,
} from "htmlgamekit";

// Trophy and preference events are exported alongside their components:
import { GameTrophyUnlockEvent } from "htmlgamekit"; // dispatched by <game-trophy>
import { GamePreferenceChangeEvent } from "htmlgamekit"; // dispatched by <game-preferences>
```

---

## GameRoundPassEvent

Signals that the player completed a round successfully.

<dl class="def">

<dt><span class="badge method">new GameRoundPassEvent(score, feedback?)</span></dt>
<dd>

**Event name:** `"game-round-pass"`

**Parameters:**

- `score` — `number` — The numeric score for this round.
- `feedback` — `string` _(optional)_ — A short feedback string to show the player (e.g. `"Nice!"`, `"342ms"`).

</dd>

<dt><span class="badge prop">.score</span></dt>
<dd><code>number</code> — The round score.</dd>

<dt><span class="badge prop">.feedback</span></dt>
<dd><code>string | undefined</code> — Optional feedback text.</dd>

</dl>

```js
// Player answered correctly in 342ms
this.dispatchEvent(new GameRoundPassEvent(342, "342ms"));
```

---

## GameRoundFailEvent

Signals that the player failed a round.

<dl class="def">

<dt><span class="badge method">new GameRoundFailEvent(reason?, retry?)</span></dt>
<dd>

**Event name:** `"game-round-fail"`

**Parameters:**

- `reason` — `string` _(optional)_ — A message explaining the failure (e.g. `"Too slow"`, `"Wrong answer"`).
- `retry` — `boolean` _(optional, default `false`)_ — If `true`, the round does **not** count against the player's total. The round number stays the same and the player tries again. If `false`, the round is consumed (counts as a failed attempt).

</dd>

<dt><span class="badge prop">.reason</span></dt>
<dd><code>string | undefined</code> — Failure reason.</dd>

<dt><span class="badge prop">.retry</span></dt>
<dd><code>boolean</code> — Whether this is a non-counting retry.</dd>

</dl>

```js
// Counting failure — round is consumed
this.dispatchEvent(new GameRoundFailEvent("Too slow"));

// Non-counting retry — player tries the same round again
this.dispatchEvent(new GameRoundFailEvent("False start!", true));
```

---

## GameTimerTickEvent

Fired by `<game-timer>` on each tick to report remaining time.

<dl class="def">

<dt><span class="badge method">new GameTimerTickEvent(remaining, fraction)</span></dt>
<dd>

**Event name:** `"game-timer-tick"`

**Parameters:**

- `remaining` — `number` — Seconds remaining.
- `fraction` — `number` — Value between `0` and `1` representing the proportion of time elapsed (0 = start, 1 = expired).

</dd>

<dt><span class="badge prop">.remaining</span></dt>
<dd><code>number</code> — Seconds left on the timer.</dd>

<dt><span class="badge prop">.fraction</span></dt>
<dd><code>number</code> — Fraction of total time elapsed (0–1).</dd>

</dl>

```js
shell.addEventListener("game-timer-tick", (e) => {
  if (e.remaining < 3) {
    urgencyIndicator.classList.add("warning");
  }
});
```

---

## GameTimerExpiredEvent

Fired when the round timer reaches zero.

<dl class="def">

<dt><span class="badge method">new GameTimerExpiredEvent()</span></dt>
<dd>

**Event name:** `"game-timer-expired"`

Takes no parameters. The shell catches this event and treats it as a round failure.

</dd>

</dl>

```js
// Typically fired internally by <game-timer>, but you can dispatch it manually:
this.dispatchEvent(new GameTimerExpiredEvent());
```

---

## GameStatUpdateEvent

Updates an arbitrary stat in the game state's `stats` map.

<dl class="def">

<dt><span class="badge method">new GameStatUpdateEvent(key, value)</span></dt>
<dd>

**Event name:** `"game-stat-update"`

**Parameters:**

- `key` — `string` — The stat key to update.
- `value` — `any` — The new value.

</dd>

<dt><span class="badge prop">.key</span></dt>
<dd><code>string</code> — Stat key.</dd>

<dt><span class="badge prop">.value</span></dt>
<dd><code>any</code> — Stat value.</dd>

</dl>

```js
// Track how many hints the player used
this.dispatchEvent(new GameStatUpdateEvent("hintsUsed", 3));
```

The shell merges this into the `stats` signal, so any component observing it will see the updated value.

---

## GameLifecycleEvent

Fired by `<game-shell>` on every scene transition and at the start of `.start()`. This is the primary event for reacting to game scene changes.

The special `"setup"` action fires synchronously at the start of `.start()` **before** stats are wiped and the scene changes to `"playing"`. Use this to initialise game state (set stats, collections, etc.) on game start/restart. Stats set during `"setup"` survive into the `"playing"` phase.

<dl class="def">

<dt><span class="badge method">new GameLifecycleEvent(action, state)</span></dt>
<dd>

**Event name:** `"game-lifecycle"`

**Parameters:**

- `action` — `string` — The new scene name (e.g. `"playing"`, `"between"`, `"result"`) or `"setup"`.
- `state` — `object` — A snapshot of the full game state after the transition.

</dd>

<dt><span class="badge prop">.action</span></dt>
<dd><code>string</code> — The triggering action. Scene names plus the special <code>"setup"</code> value.</dd>

<dt><span class="badge prop">.state</span></dt>
<dd><code>object</code> — Full state snapshot.</dd>

<dt><span class="badge prop">.scene</span></dt>
<dd><code>string</code> — Convenience alias for <code>e.state.scene</code>.</dd>

</dl>

```js
document.querySelector("game-shell").addEventListener("game-lifecycle", (e) => {
  if (e.action === "setup") {
    // Initialise game state before playing begins
    e.target.addToCollection("visited", "start");
  }
  if (e.action === "result") {
    console.log("Game over! Final score:", e.state.score);
  }
  if (e.state.scene === "playing") {
    console.log(`Round ${e.state.round} of ${e.state.rounds}`);
  }
});
```

---

## GameStartRequestEvent

Signals that the player wants to start a game. Dispatched by the intro overlay (`<div when-some-scene="intro" data-overlay>`) when the user clicks a start button. The shell catches this and calls `.start()`.

<dl class="def">

<dt><span class="badge method">new GameStartRequestEvent()</span></dt>
<dd>

**Event name:** `"game-start-request"`

Takes no parameters.

</dd>

</dl>

```js
// Typically dispatched by the intro overlay, but you can trigger it manually:
this.dispatchEvent(new GameStartRequestEvent());
```

---

## GameRestartRequestEvent

Signals that the player wants to restart the game. Dispatched by the result overlay (`<div when-some-scene="result" data-overlay>`) when the user clicks a restart button. The shell catches this, resets state, and starts a new game.

<dl class="def">

<dt><span class="badge method">new GameRestartRequestEvent()</span></dt>
<dd>

**Event name:** `"game-restart-request"`

Takes no parameters.

</dd>

</dl>

```js
// Typically dispatched by the result overlay, but you can trigger it manually:
this.dispatchEvent(new GameRestartRequestEvent());
```

---

## GameCompleteEvent

Signals that the game should end immediately, skipping any remaining rounds. The shell catches this, optionally sets the final score, and transitions to the `result` scene.

<dl class="def">

<dt><span class="badge method">new GameCompleteEvent(score?)</span></dt>
<dd>

**Event name:** `"game-complete"`

**Parameters:**

- `score` — `number` _(optional)_ — If provided, overrides the shell's accumulated score before entering the result scene.

</dd>

<dt><span class="badge prop">.score</span></dt>
<dd><code>number | undefined</code> — Optional final score override.</dd>

</dl>

```js
// End the game early with a specific score
this.dispatchEvent(new GameCompleteEvent(42));

// End the game early, keeping the accumulated score
this.dispatchEvent(new GameCompleteEvent());
```

---

## GamePauseRequestEvent

Requests that the shell pause the game. The shell catches this and transitions from `playing` to `paused`.

<dl class="def">

<dt><span class="badge method">new GamePauseRequestEvent()</span></dt>
<dd>

**Event name:** `"game-pause-request"`

Takes no parameters.

</dd>

</dl>

```js
this.dispatchEvent(new GamePauseRequestEvent());
```

---

## GameResumeRequestEvent

Requests that the shell resume a paused game. The shell catches this and transitions from `paused` back to `playing`.

<dl class="def">

<dt><span class="badge method">new GameResumeRequestEvent()</span></dt>
<dd>

**Event name:** `"game-resume-request"`

Takes no parameters.

</dd>

</dl>

```js
this.dispatchEvent(new GameResumeRequestEvent());
```

---

## GameNextRoundEvent

Requests that the shell skip the between-round delay and advance to the next round immediately. Only takes effect when the current scene is `between`.

<dl class="def">

<dt><span class="badge method">new GameNextRoundEvent()</span></dt>
<dd>

**Event name:** `"game-next-round"`

Takes no parameters.

</dd>

</dl>

```js
this.dispatchEvent(new GameNextRoundEvent());
```

---

## GamePracticeStartEvent

Signals that the player wants to enter practice mode. The shell catches this and sets `scene` to `"practice"`.

<dl class="def">

<dt><span class="badge method">new GamePracticeStartEvent()</span></dt>
<dd>

**Event name:** `"game-practice-start"`

Takes no parameters.

</dd>

</dl>

```js
// Dispatch from a "Practice" button handler:
this.dispatchEvent(new GamePracticeStartEvent());
```

---

## GameTileInputEvent

Dispatched by `<game-tile-input>` on every character change (type or delete). Used by `<game-audio>` with `trigger="input"` to play keystroke sounds.

<dl class="def">

<dt><span class="badge method">new GameTileInputEvent(value, position)</span></dt>
<dd>

**Event name:** `"game-tile-input"`

**Parameters:**

- `value` — `string` — The current input string.
- `position` — `number` — Index of the last changed character.

</dd>

<dt><span class="badge prop">.value</span></dt>
<dd><code>string</code> — The current input string.</dd>

<dt><span class="badge prop">.position</span></dt>
<dd><code>number</code> — Index of the last changed character.</dd>

</dl>

```js
tileInput.addEventListener("game-tile-input", (e) => {
  console.log(`Input: "${e.value}", position: ${e.position}`);
});
```

---

## GameTimerCountdownEvent

Fired by `<game-timer>` on each whole-second tick of the countdown. Used by `<game-audio>` with `trigger="countdown"` to play a ticking sound once per second.

<dl class="def">

<dt><span class="badge method">new GameTimerCountdownEvent(seconds)</span></dt>
<dd>

**Event name:** `"game-timer-countdown"`

**Parameters:**

- `seconds` — `number` — The whole number of seconds remaining.

</dd>

<dt><span class="badge prop">.seconds</span></dt>
<dd><code>number</code> — Whole seconds remaining.</dd>

</dl>

```js
shell.addEventListener("game-timer-countdown", (e) => {
  if (e.seconds <= 3) urgencyIndicator.classList.add("warning");
});
```

---

## GameTileSubmitEvent

Dispatched by `<game-tile-input>` when the player presses Enter with a complete word.

<dl class="def">

<dt><span class="badge method">new GameTileSubmitEvent(value)</span></dt>
<dd>

**Event name:** `"game-tile-submit"`

**Parameters:**

- `value` — `string` — The submitted word.

</dd>

<dt><span class="badge prop">.value</span></dt>
<dd><code>string</code> — The submitted word.</dd>

</dl>

```js
tileInput.addEventListener("game-tile-submit", (e) => {
  const guess = e.value.toLowerCase();
  // Validate and process the guess
});
```

---

## GameCollectionAddEvent

Signals that an item should be added to a named collection. The shell catches this and calls `addToCollection(collection, itemId)`. Dispatched by `<game-passage>` when it becomes active (to track visits) and can be dispatched by any game mechanic.

<dl class="def">

<dt><span class="badge method">new GameCollectionAddEvent(collection, itemId)</span></dt>
<dd>

**Event name:** `"game-collection-add"`

**Parameters:**

- `collection` -- `string` -- The collection name (e.g. `"inventory"`, `"visited"`).
- `itemId` -- `string` -- The item ID to add.

</dd>

<dt><span class="badge prop">.collection</span></dt>
<dd><code>string</code> -- The collection name.</dd>

<dt><span class="badge prop">.itemId</span></dt>
<dd><code>string</code> -- The item ID to add.</dd>

</dl>

```js
// Add "sword" to the "inventory" collection
this.dispatchEvent(new GameCollectionAddEvent("inventory", "sword"));
```

---

## GameCollectionRemoveEvent

Signals that an item should be removed from a named collection. The shell catches this and calls `removeFromCollection(collection, itemId)`.

<dl class="def">

<dt><span class="badge method">new GameCollectionRemoveEvent(collection, itemId)</span></dt>
<dd>

**Event name:** `"game-collection-remove"`

**Parameters:**

- `collection` -- `string` -- The collection name.
- `itemId` -- `string` -- The item ID to remove.

</dd>

<dt><span class="badge prop">.collection</span></dt>
<dd><code>string</code> -- The collection name.</dd>

<dt><span class="badge prop">.itemId</span></dt>
<dd><code>string</code> -- The item ID to remove.</dd>

</dl>

```js
// Remove "sword" from the "inventory" collection
this.dispatchEvent(new GameCollectionRemoveEvent("inventory", "sword"));
```

---

## GameTrophyUnlockEvent

Dispatched by `<game-trophy>` when a trophy is unlocked (either via `.unlock()` or auto-unlock conditions). Exported from `"htmlgamekit"` alongside `GameTrophy`.

<dl class="def">

<dt><span class="badge method">new GameTrophyUnlockEvent(id, name)</span></dt>
<dd>

**Event name:** `"game-trophy-unlock"`

**Parameters:**

- `id` -- `string` -- The trophy's `id` attribute.
- `name` -- `string` -- The trophy's `name` attribute.

</dd>

<dt><span class="badge prop">.trophyId</span></dt>
<dd><code>string</code> -- The trophy's id.</dd>

<dt><span class="badge prop">.trophyName</span></dt>
<dd><code>string</code> -- The trophy's display name.</dd>

</dl>

```js
shell.addEventListener("game-trophy-unlock", (e) => {
  console.log(`Unlocked: ${e.trophyName} (${e.trophyId})`);
});
```

---

## GamePreferenceChangeEvent

Dispatched by `<game-preferences>` when a preference value changes.

<dl class="def">

<dt><span class="badge method">new GamePreferenceChangeEvent(key, value)</span></dt>
<dd>

**Event name:** `"game-preference-change"`

**Parameters:**

- `key` -- `string` -- The preference key.
- `value` -- `any` -- The new value (boolean for toggles, number for ranges).

</dd>

<dt><span class="badge prop">.key</span></dt>
<dd><code>string</code> -- The preference key.</dd>

<dt><span class="badge prop">.value</span></dt>
<dd><code>any</code> -- The new value.</dd>

</dl>

```js
shell.addEventListener("game-preference-change", (e) => {
  if (e.key === "dark-mode") {
    document.body.classList.toggle("dark", e.value);
  }
});
```

---

## PendingTaskEvent

Signals that an asynchronous task is in progress. Used by components such as `<game-score-form>` and `<game-leaderboard>` to expose in-flight promises to any external loading coordinator (e.g. a loading indicator). The shell itself does not queue or await these tasks.

<dl class="def">

<dt><span class="badge method">new PendingTaskEvent(complete)</span></dt>
<dd>

**Event name:** `"pending-task"`

**Parameters:**

- `complete` — `Promise` — A promise that resolves when the task is done.

</dd>

<dt><span class="badge prop">.complete</span></dt>
<dd><code>Promise</code> — The pending promise.</dd>

</dl>

```js
// Delay the next round until a sound effect finishes
const audioPromise = playSound("correct.mp3");
this.dispatchEvent(new PendingTaskEvent(audioPromise));
this.dispatchEvent(new GameRoundPassEvent(100, "Correct!"));
```
