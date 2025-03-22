---
layout: doc
title: "GameScoreForm"
permalink: /api/components/score-form/
---

A name input with a submit button for recording scores to the leaderboard. Integrates with the scores service from the shell and handles the full lifecycle of connecting, submitting, and confirming.

{% include "demo-embed.html", demo: "score-form", title: "Score form demo", height: "400px" %}

### Form States

The form progresses through several states automatically:

1. **Connecting** — While the scores service is fetching a session token, the input and button are disabled and the button reads "Connecting...".
2. **Ready** — Once a token is available, the input and button are enabled and the button reads "Submit".
3. **Submitting** — After the user submits, the button is disabled and reads "Submitting...". A `PendingTaskEvent` is dispatched so the shell waits for the network request.
4. **Submitted** — On success, the form is hidden and replaced with a confirmation message (e.g. "Submitted as ALICE"). The leaderboard is also refreshed.
5. **Retry** — On failure, the button re-enables with "Retry" text.

The form resets to the **Ready** state each time the game enters the `result` scene, allowing resubmission on replay.

### Events Dispatched

<dl class="def">

<dt><span class="badge event">pending-task</span></dt>
<dd>
Dispatched when the score is being submitted. The shell waits for this promise to resolve before allowing further state transitions.
</dd>

</dl>

### Shadow DOM Parts

{% cem_cssparts "game-score-form" %}

### Signal Access

| Signal | Usage |
|---|---|
| Shell signals | Reads `scores`, `scene`, and `score` signals for token status, score submission, form reset, and submission value |

### Usage

```html
<div when-some-scene="result" data-overlay>
  <game-result-stat label="Score"></game-result-stat>
  <game-score-form></game-score-form>
  <game-leaderboard></game-leaderboard>
  <button commandfor="game" command="--restart">Play Again</button>
</div>
```

See the [Scoring guide]({{ site.baseurl }}/scoring/) for how to configure the score service.
