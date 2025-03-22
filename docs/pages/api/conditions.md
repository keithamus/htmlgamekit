---
layout: doc
title: "Conditions"
permalink: /api/conditions/
---

# Conditions

Conditions are `when-*` attributes that control whether a declarative element activates. They provide a unified way to filter elements based on game state -- scores, rounds, stats, trophies, difficulty, and more.

Conditions work on elements consumed by the trigger system and the result/icon systems: `<game-sample>`, `<game-toast>`, `<game-trophy>`, `<game-result-message>`, `<game-icon>`, and `<option>` children within toasts and result messages. All conditions on an element must pass (AND logic) for it to activate.

## Syntax

Every condition follows the form **`when-{comparator}-{key}="value"`**:

| Comparator | Attribute form | Matches when |
|---|---|---|
| `min` | `when-min-{key}="N"` | `resolve(key) >= N` (numeric) |
| `max` | `when-max-{key}="N"` | `resolve(key) <= N` (numeric) |
| `eq` | `when-eq-{key}="value"` | `String(resolve(key)) === value` |
| `some` | `when-some-{key}` | `resolve(key)` is truthy (no value) |
| `some` | `when-some-{key}="a b"` | `resolve(key)` is in the set `{a, b}` |
| `no` | `when-no-{key}` | `resolve(key)` is falsy (no value) |
| `no` | `when-no-{key}="a b"` | `resolve(key)` is NOT in the set `{a, b}` |
| `all` | `when-all-{key}="a b"` | all values in the set match `resolve(key)` |
| `prob` | `when-prob="0.4"` | fires stochastically with probability 0.4 |

Trophy checks use the key `trophy` with the trophy `id` as the attribute value, so hyphens in IDs are preserved:

| Attribute | Matches when |
|---|---|
| `when-some-trophy="id"` | Any of the listed trophies are unlocked |
| `when-no-trophy="id"` | None of the listed trophies are unlocked |
| `when-all-trophy="id1 id2"` | All of the listed trophies are unlocked |

After the operator is stripped, the remaining kebab-case key is camelCased. So `when-min-pass-streak` resolves the key `passStreak`, and `when-eq-scene` resolves `scene`. Difficulty and stats object keys are also matched after camelCasing.

## Key Resolution

The `resolve(key)` function looks up values in this order:

| Key | Resolves to |
|---|---|
| `score` | Current accumulated score |
| `round` | Current round number (1-indexed) |
| `rounds` | Total rounds configured |
| `scene` | Current scene name |
| `roundScore` | Score from the most recent round |
| `bestRoundScore` | Highest individual round score |
| `worstRoundScore` | Lowest individual round score |
| `trophyCount` | Number of unlocked trophies |
| `passStreak` | Current consecutive pass streak |
| `failStreak` | Current consecutive fail streak |
| `peakPassStreak` | Highest pass streak reached this game |
| `peakFailStreak` | Highest fail streak reached this game |
| _(any other key)_ | Looks up `difficulty` object first, then `stats` object (keys matched after camelCasing) |

## Examples

### Conditional Samples

Play a different sound based on trophy state:

```html
<game-audio>
  <game-sample trigger="pass" type="marimba"
    notes="523:0,659:0.08,784:0.16" gain="0.3"
    when-some-trophy="hat-trick">
  </game-sample>

  <game-sample trigger="pass" type="beep"
    notes="880:0" gain="0.2"
    when-no-trophy="hat-trick">
  </game-sample>
</game-audio>
```

### Conditional Toasts

Show different messages based on score:

```html
<game-toast when-some-scene="playing between paused" trigger="complete" when-min-score="20">Flawless!</game-toast>
<game-toast when-some-scene="playing between paused" trigger="complete" when-max-score="5">Keep practicing</game-toast>
```

### Conditional Options

Filter `<option>` pools based on trophy state and score:

```html
<game-toast when-some-scene="playing between paused" trigger="pass">
  <option>Nice!</option>
  <option>Good one!</option>
  <option when-some-trophy="hat-trick">Hat trick master!</option>
  <option when-some-trophy="perfect">Perfectionist strikes again!</option>
  <option when-min-score="15">You're on fire!</option>
</game-toast>
```

Options that don't match are filtered out before random selection. Base options (no `when-*` attributes) are always eligible.

### Conditional Result Messages

```html
<game-result-message>
  <option when-min-score="20">Flawless victory!</option>
  <option when-max-score="5">Better luck next time</option>
  <option when-some-trophy="speed-demon">Speed demon strikes again!</option>
</game-result-message>
```

### Conditional Trophy Unlocks

```html
<game-trophy id="scorer" name="Scorer" icon="star"
  when-min-score="10"
  description="Score 10 or more">
</game-trophy>

<game-trophy id="hat-trick" name="Hat Trick" icon="fire"
  when-min-streak="3"
  description="Get 3 correct in a row">
</game-trophy>
<!-- "streak" resolves via the stats map. Keep it up to date with:
     this.dispatchEvent(new GameStatUpdateEvent("streak", n))
     <game-quiz> dispatches this automatically. -->

<game-trophy id="collector" name="Collector" icon="chest"
  when-min-trophy-count="5"
  description="Unlock 5 other trophies">
</game-trophy>
```

### Combining Conditions

Multiple conditions on one element use AND logic -- all must pass:

```html
<!-- Only shows when score >= 15 AND the "hat-trick" trophy is unlocked -->
<game-toast when-some-scene="playing between paused" trigger="complete"
  when-min-score="15" when-some-trophy="hat-trick">
  Elite performance!
</game-toast>
```

## Programmatic Usage

```js
import { matchesConditions } from "htmlgamekit";

const el = document.querySelector("game-trophy");
const shell = document.querySelector("game-shell");

if (matchesConditions(el, shell)) {
  // All when-* conditions on the element pass
}
```

The `matchesConditions(el, shell)` function:
- `el` -- any Element with `when-*` attributes
- `shell` -- the `<game-shell>` element (signals read directly from it)
- Returns `boolean` -- true if all conditions pass (or no conditions are set)

When called inside an `effect()`, only the signals actually read by the active `when-*` attributes become reactive dependencies. An element with only `when-min-score` will only re-evaluate when `score` changes.

## Relationship to Triggers

[Triggers]({{ site.baseurl }}/api/triggers/) determine **when** something fires (lifecycle moment or DOM event). Conditions determine **whether** it fires given the current game state. They compose naturally:

```html
<!-- Trigger: fires on "pass" lifecycle moment -->
<!-- Condition: only if score >= 10 AND "hat-trick" trophy is unlocked -->
<game-sample trigger="pass"
  when-min-score="10" when-some-trophy="hat-trick"
  type="marimba" notes="523:0,659:0.08,784:0.16" gain="0.3">
</game-sample>
```

The trigger fires first (detecting the state transition), then conditions are checked. If conditions don't pass, the element is skipped.
