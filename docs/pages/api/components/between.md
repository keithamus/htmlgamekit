---
layout: doc
title: "GameBetween"
permalink: /api/components/between/
---

A full-screen overlay shown between rounds with data-driven content. Unlike `<game-toast>` which shows a single word, `<game-between when-some-scene="between">` gives you a complete interstitial screen with round details, scores, and custom stats -- useful for games that need more than a quick flash between rounds.

{% include "demo-embed.html", demo: "between", title: "Between-rounds demo", height: "400px" %}

### Behavior

When the game transitions to the `between` state, the component populates child elements using `data-between` attributes to inject round data. Visibility is controlled by the shell's slot assignment — add `when-some-scene="between"` to the element so the shell slots it in when the scene matches.

The component uses light DOM children, so all content is styled with normal CSS.

### Data Binding

Child elements are populated based on `data-between` attributes:

| Attribute | Value Injected |
|---|---|
| `data-between="feedback"` | The `lastFeedback` signal value (e.g. "Correct!", "342ms") |
| `data-between="round"` | Round string (e.g. "3 / 10" or just "3" if open-ended) |
| `data-between="score"` | Formatted cumulative score |
| `data-between="round-score"` | Formatted score for the last round only |
| `data-between="countdown"` | Countdown seconds until next round (updated each second) |

### Attributes

<dl class="def">

<dt><span class="badge attr">score-good</span></dt>
<dd>
<code>number?</code> -- Raw score threshold defining a "good" round result. Combined with <code>score-bad</code>, activates CSS custom states on the component. When <code>score-order</code> is <code>"asc"</code> (lower is better), a round score below this value sets <code>:state(good)</code>. Reversed for <code>"desc"</code>.
</dd>

<dt><span class="badge attr">score-bad</span></dt>
<dd>
<code>number?</code> -- Raw score threshold defining a "bad" round result. Combined with <code>score-good</code>, activates CSS custom states. When <code>score-order</code> is <code>"asc"</code>, a round score at or above this value sets <code>:state(bad)</code>.
</dd>

</dl>

### Custom States

| State | When Active |
|---|---|
| `:state(good)` | Last round score was in the "good" tier (requires both `score-good` and `score-bad` to be set) |
| `:state(ok)` | Last round score was in the middle tier |
| `:state(bad)` | Last round score was in the "bad" tier |

```css
game-between:state(good) { --between-color: #00e5b0; }
game-between:state(ok)   { --between-color: #aaa; }
game-between:state(bad)  { --between-color: #ff3b5c; }
```

### Signal Access

| Signal | Usage |
|---|---|
| Shell signals | Reads `scene`, `lastFeedback`, `round`, `rounds`, `score`, `roundScores`, and `formatScoreSignal` from the shell |

### CSS Custom Properties

{% cem_cssprops "game-between" %}

### Usage

```html
<game-between when-some-scene="between">
  <p data-between="feedback"></p>
  <p>Round <span data-between="round"></span></p>
  <p>Score: <span data-between="score"></span></p>
  <p>This round: <span data-between="round-score"></span></p>
  <p>Next round in <span data-between="countdown"></span></p>
</game-between>
```

For most games, `<game-toast>` is sufficient. Use `<game-between when-some-scene="between">` when you want a richer interstitial with multiple data points between rounds.
