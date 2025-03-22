---
layout: doc
title: "GameRoundCounter & GameStat"
permalink: /api/components/hud/
---

Two components for in-game display: a round progress indicator and a live stat
readout. Place these inside a [HUD container]({{ site.baseurl }}/api/hud/) or
give each its own `when-some-scene` attribute as a direct shell child.

---

## GameRoundCounter

Displays the current round number and a progress bar. Observes game signals
and adapts its display based on the type of director in use.

### Display Modes

The counter adapts automatically depending on what round information is
available in the game state:

- **Fixed rounds** (e.g. `FixedProgression` or `rounds` attribute on the shell)
  -- Renders as **"Round 3/10"** with a progress bar showing completion
  fraction.
- **Staircase / trial-based** (when the `difficulty` signal's `maxTrials` is
  set) -- Renders as **"Round 7"** with a progress bar based on
  `trial / maxTrials`.
- **Open-ended** (no total rounds and no max trials) -- Renders as
  **"Round 3"** with no progress bar.

### Signal Access

| Signal | Usage |
|---|---|
| Shell signals | Reads `round`, `rounds`, and `difficulty` signals |

### CSS Custom Properties

| Property | Default | Description |
|---|---|---|
| `--game-accent` | `#fff` | Progress bar fill colour |

### Usage

```html
<game-round-counter></game-round-counter>
```

---

## GameStat

Displays a single stat from the game state's `stats` map. Observes game
signals and re-renders whenever the stat value changes.

### Attributes

All attributes reflect as IDL properties of the same name.

<dl class="def">

<dt><span class="badge attr">key</span> <code>.key</code></dt>
<dd>
<code>string</code> -- The key in the <code>stats</code> signal to display.
Must match the key used in <code>GameStatUpdateEvent</code> dispatches.
</dd>

<dt><span class="badge attr">format</span> <code>.format</code></dt>
<dd>
<code>string</code> -- How to format the value. Defaults to
<code>"plain"</code>:

- `"ms"` -- Round to integer and append "ms" suffix (e.g. `342ms`)
- `"Ndp"` -- Fixed-point decimal with N decimal places (e.g. `"2dp"`
  formats `0.1` as `"0.10"`)
- `"plain"` -- Display the raw value as a string (default)
</dd>

</dl>

The stat only renders once the key exists in the `stats` signal. It updates
live as new `GameStatUpdateEvent` events are dispatched.

### Signal Access

| Signal | Usage |
|---|---|
| Shell signals | Reads `stats` signal |

### Usage

```html
<game-stat key="streak">Streak</game-stat>
<game-stat key="avgTime" format="ms">Avg</game-stat>
```

The label text is provided as slotted content (light DOM children), not via an
attribute.

Stats are set from your game logic via events:

```js
this.dispatchEvent(new GameStatUpdateEvent("streak", 5));
this.dispatchEvent(new GameStatUpdateEvent("avgTime", 342));
```
