---
title: "GameResultMessage"
permalink: /api/components/result-message/
demo: result-stat
demoHeight: 400px
demoTitle: Result message demo (combined with result-stat)
---

Displays a conditional message on the result screen. Each element independently evaluates its own `<option>` children and picks a matching message to display.

### How It Works

Use `when-*` [condition attributes]({{ site.baseurl }}/api/conditions/) on each `<option>`:

```html
<game-result-message>
  <option when-max-score="5">Keep practicing</option>
  <option when-min-score="6" when-max-score="15">Not bad!</option>
  <option when-min-score="16">Perfect!</option>
  <option when-some-trophy="speed-demon">Speed demon!</option>
</game-result-message>
```

The most common conditions are `when-min-score` and `when-max-score`, but any condition works — stats, trophies, difficulty, rounds, etc.

### Behavior

Each `<game-result-message>` element independently evaluates its own conditions when the game enters the `result` state:

1. The element checks its `<option>` children's `when-*` conditions against the current game state.
2. From the matching options, one is chosen at random and displayed.
3. If no options match, the element hides itself (removes the `:state(active)` internal state).

Multiple `<game-result-message>` elements operate independently — each picks from its own `<option>` pool. You can provide multiple options for the same conditions, and the player gets a different message each time for variety.

### Signal Access

| Signal        | Usage                                                                                                                                                           |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Shell signals | Reads `scene`, `score`, `round`, `roundScores`, `stats`, `difficulty` signals from the shell for condition evaluation; reads `trophies()` for trophy conditions |

### Usage

```html
<div when-some-scene="result" data-overlay>
  <game-result-stat label="Score"></game-result-stat>

  <game-result-message>
    <option when-max-score="5">Rough showing. Maybe start with a map.</option>
    <option when-max-score="5">Geography is not your strong suit. Yet.</option>
    <option when-min-score="6" when-max-score="10">
      Not bad. You know the big ones at least.
    </option>
    <option when-min-score="11">
      Geography expert. You clearly own a globe.
    </option>
  </game-result-message>

  <button commandfor="game" command="--restart">Play again</button>
</div>
```
