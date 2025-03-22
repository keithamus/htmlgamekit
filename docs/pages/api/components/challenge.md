---
layout: doc
title: "GameChallenge"
permalink: /api/components/challenge/
---

Shows the opponent's score in challenge/group play. Hidden by default -- only becomes visible when the `challenge` signal has a value (i.e. the player arrived via a shared result link). Displays the opponent's score and a randomly selected taunt to motivate the player.

{% include "demo-embed.html", demo: "challenge", title: "Challenge demo", height: "400px" %}

### Behavior

When a challenge is active the component:

1. Adds the `:state(active)` CSS state via `ElementInternals` (switches from `display: none` to `display: block`).
2. Renders the opponent's score in a large gradient display.
3. Picks a random taunt message (e.g. "No mercy.", "Prove them wrong.").
4. Changes the start button text in the parent overlay to **"Challenge accepted"**.

### Properties

<dl class="def">

<dt><span class="badge prop">.formatScore</span></dt>
<dd>
<code>set</code> <em>(function)</em> — Override for formatting the opponent's score. Receives the full challenge object. If not set, the component uses the shell's <code>formatScoreSignal</code> (i.e. <code>shell.formatScore</code>) with <code>challenge.score</code>, which is sufficient for most cases.

Only set this if you need the full challenge object rather than just <code>challenge.score</code>:

```js
const challenge = document.querySelector("game-challenge");
challenge.formatScore = (c) => `${c.score}ms and ${c.rounds} rounds`;
```
</dd>

</dl>

### Shadow DOM Parts

{% cem_cssparts "game-challenge" %}

### Signal Access

| Signal | Usage |
|---|---|
| Shell signals | Reads the `challenge` and `formatScore` signals |

### Usage

```html
<div when-some-scene="intro" data-overlay>
  <game-challenge></game-challenge>
  <h1>Reaction Time</h1>
  <button commandfor="game" command="--start">Play</button>
</div>
```
