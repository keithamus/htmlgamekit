---
title: "GameResultStat"
permalink: /api/components/result-stat/
demo: result-stat
demoHeight: 400px
demoTitle: Result stat demo
cemSkip: [attrs, cssStates]
---

A large score display for the results screen. Observes game signals and renders the score when the game enters the `result` scene. Supports count-up animation and exposes custom states based on score thresholds, enabling per-game visual styling without modifying the component.

### Attributes

<dl class="def">

<dt><span class="badge attr">label</span></dt>
<dd>
<code>string</code> -- Label shown above the score (e.g. <code>"Your Score"</code>, <code>"Threshold"</code>).
</dd>

<dt><span class="badge attr">format</span></dt>
<dd>
<code>"ms" | "Ndp" | "plain"</code> -- How to format the score. Same options as <code>&lt;game-stat&gt;</code>:

- `"ms"` -- Round to integer and append "ms" (e.g. `342ms`)
- `"Ndp"` -- Fixed-point with N decimal places (e.g. `"2dp"`)
- `"plain"` -- Raw value as string (default)
</dd>

<dt><span class="badge attr">animate</span></dt>
<dd>
<code>number</code> -- Duration in milliseconds for a count-up animation from 0 to the final score. If present (even without a value), defaults to <code>800</code>ms. The animation uses an ease-out curve.

```html
<game-result-stat animate="1000"></game-result-stat>
```

</dd>

<dt><span class="badge attr">min-score</span></dt>
<dd>
<code>number?</code> -- Lower bound for the <code>:state(in-range)</code> custom state. When set, the state activates only if <code>score >= min-score</code>. Can be used together with <code>max-score</code> to define a score band.
</dd>

<dt><span class="badge attr">max-score</span></dt>
<dd>
<code>number?</code> -- Upper bound for the <code>:state(in-range)</code> custom state. When set, the state activates only if <code>score <= max-score</code>. Can be used together with <code>min-score</code> to define a score band.

```html
<!-- Activates :state(in-range) for scores 10–15 -->
<game-result-stat min-score="10" max-score="15"></game-result-stat>
```

</dd>

<dt><span class="badge attr">score-*</span></dt>
<dd>
Score threshold attributes. Any attribute starting with <code>score-</code> defines a custom state threshold. The attribute name minus the <code>score-</code> prefix becomes the state name, and the value is the minimum score to activate it. The highest matching threshold wins.

```html
<!-- Activates :state(low) at 0+, :state(mid) at 10+,
     :state(high) at 15+, :state(perfect) at 20 -->
<game-result-stat
  score-low="0"
  score-mid="10"
  score-high="15"
  score-perfect="20"
></game-result-stat>
```

</dd>

</dl>

### Custom States

| State              | When Active                                                                               |
| ------------------ | ----------------------------------------------------------------------------------------- |
| `:state(perfect)`  | Raw score equals the shell's `rounds` attribute (the integer `long` value, not formatted) |
| `:state(in-range)` | Raw score falls within the `min-score` / `max-score` range (if either attribute is set)   |
| `:state(*)`        | Any `score-*` threshold state — highest matching threshold wins                           |

These states enable per-game CSS styling:

```css
game-result-stat:state(perfect) {
  color: gold;
}
game-result-stat:state(high)::part(value) {
  color: #00e5b0;
}
game-result-stat:state(low)::part(value) {
  color: #ff3b5c;
}
```

### Properties

<dl class="def">

<dt><span class="badge prop">.formatScore</span></dt>
<dd>
<code>set</code> <em>(function)</em> -- Assign a custom <code>(score) => string</code> function. When set, this overrides the <code>format</code> attribute entirely. Also used during count-up animation to format intermediate values.

```js
const stat = document.querySelector("game-result-stat");
stat.formatScore = (score) => `${score}/20`;
```

</dd>

</dl>

### Signal Access

| Signal        | Usage                                                                                                      |
| ------------- | ---------------------------------------------------------------------------------------------------------- |
| Shell signals | Reads `scene`, `score`, and `formatScore` signals to render during the result scene and format the display |

### Usage

```html
<div when-some-scene="result" data-overlay>
  <game-result-stat
    label="Your Score"
    animate="800"
    score-low="0"
    score-mid="10"
    score-high="15"
  >
  </game-result-stat>
  <button commandfor="game" command="--restart">Play Again</button>
</div>
```
