---
title: "GameRoundCounter"
permalink: /api/components/round-counter/
cemSkip: [cssProperties]
---

Displays the current round number and a progress bar. Observes game signals and adapts its display based on the type of director in use. Place inside a [HUD container]({{ site.baseurl }}/api/hud/) or give it a `when-some-scene` attribute as a direct shell child.

### Display Modes

The counter adapts automatically depending on what round information is available in the game state:

- **Fixed rounds** (e.g. `FixedProgression` or `rounds` attribute on the shell) -- Renders as **"Round 3/10"** with a progress bar showing completion fraction.
- **Staircase / trial-based** (when the `difficulty` signal's `maxTrials` is set) -- Renders as **"Round 7"** with a progress bar based on `trial / maxTrials`.
- **Open-ended** (no total rounds and no max trials) -- Renders as **"Round 3"** with no progress bar.

### Signal Access

| Signal        | Usage                                             |
| ------------- | ------------------------------------------------- |
| Shell signals | Reads `round`, `rounds`, and `difficulty` signals |

### CSS Custom Properties

| Property        | Default | Description              |
| --------------- | ------- | ------------------------ |
| `--game-accent` | `#fff`  | Progress bar fill colour |

### Usage

```html
<game-round-counter></game-round-counter>
```
