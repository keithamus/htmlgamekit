---
layout: doc
title: "GameScoreHistogram"
permalink: /api/components/histogram/
---

Displays a bar chart of the full score distribution from the score service,
with a "You" marker at the player's score and a "Top N%" label.

{% include "demo-embed.html", demo: "histogram", title: "Histogram demo", height: "450px" %}

### Attributes

<dl class="def">

<dt><span class="badge attr">buckets</span> <code>.buckets</code></dt>
<dd>
<code>long</code> -- Number of histogram buckets to request from the score
API. More buckets = finer resolution. Defaults to <code>80</code>.
</dd>

</dl>

### Usage

```html
<game-score-histogram></game-score-histogram>

<!-- Fewer buckets for a compact chart -->
<game-score-histogram buckets="20"></game-score-histogram>
```

### CSS Custom Properties

| Property | Default | Description |
|---|---|---|
| `--game-accent` | `#3b82f6` | Colour of the "You" bar and label |

### Parts

{% cem_cssparts "game-score-histogram" %}
