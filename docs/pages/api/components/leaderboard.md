---
title: "GameLeaderboard"
permalink: /api/components/leaderboard/
demo: leaderboard
demoHeight: 450px
demoTitle: Leaderboard demo
cemSkip: [attrs, events]
---

Displays a leaderboard table showing the best and worst scores. Fetches data from the score service when the game enters the `result` scene.

### Behavior

When the game enters the `result` state, the component automatically fetches leaderboard data by calling `scores.fetchBest(best)` and `scores.fetchWorst(worst)` in parallel. A `PendingTaskEvent` is dispatched to expose the in-flight promise to any external loading coordinator.

The leaderboard re-fetches each time a new result is reached (but not on repeated visits to the same result).

### Attributes

<dl class="def">

<dt><span class="badge attr">score-label</span></dt>
<dd>
<code>string</code> -- Column header for the score column. Defaults to <code>"Score"</code>.

```html
<game-leaderboard score-label="JND"></game-leaderboard>
```

</dd>

<dt><span class="badge attr">best</span></dt>
<dd>
<code>long</code> -- Number of top scores to show. Defaults to <code>3</code>. Set to <code>0</code> to omit the top section entirely.
</dd>

<dt><span class="badge attr">worst</span></dt>
<dd>
<code>long</code> -- Number of bottom scores to show. Defaults to <code>3</code>. Set to <code>0</code> to omit the bottom section entirely.
</dd>

</dl>

### Properties

<dl class="def">

<dt><span class="badge prop">.formatScore</span></dt>
<dd>
<code>set</code> <em>(function)</em> — Override for formatting leaderboard scores. Receives the full score entry object. If not set, the component uses the shell's <code>formatScoreSignal</code> (i.e. <code>shell.formatScore</code>) with <code>entry.score</code>, which is sufficient for most cases.

Only set this if you need fields beyond <code>entry.score</code>:

```js
const lb = document.querySelector("game-leaderboard");
lb.formatScore = (entry) => `${entry.score}ms`;
// Useful when combining fields:
lb.formatScore = (entry) => `${entry.score}ms (${entry.name})`;
```

</dd>

</dl>

### Events Dispatched

<dl class="def">

<dt><span class="badge event">pending-task</span></dt>
<dd>
Dispatched when the leaderboard data is being fetched. The promise is exposed so external loading coordinators can track completion.
</dd>

</dl>

### Histogram

The score histogram is provided by a separate [`<game-score-histogram>`]({{ site.baseurl }}/api/components/score-histogram/) component, not by `<game-leaderboard>` itself. Place both inside the result overlay if you want both.

### Signal Access

| Signal        | Usage                                                                                                                      |
| ------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Shell signals | Reads `scores`, `scene`, and `score` signals for fetching leaderboard data, triggering loading, and histogram highlighting |

### Usage

```html
<game-leaderboard></game-leaderboard>
```

See the [Scoring guide]({{ site.baseurl }}/scoring/) for how to configure the score service.
