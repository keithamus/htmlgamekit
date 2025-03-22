---
layout: doc
title: "Scoring"
permalink: /scoring/
---

HTMLGameKit includes a complete scoring system with leaderboards, histograms,
anti-cheat tokens, and group play. Scoring is optional -- games work fine
without it -- but adding a `score-url` attribute to your shell enables the full
pipeline.

## Quick Start

```html
<game-shell
  id="game"
  game-id="my-game"
  rounds="10"
  score-url="https://scores.htmlgamekit.dev"
>
  <!-- Result overlay with scoring UI -->
  <div when-some-scene="result" data-overlay>
    <game-result-stat label="Score"></game-result-stat>
    <game-score-form></game-score-form>
    <game-leaderboard></game-leaderboard>
    <button commandfor="game" command="--restart">Play Again</button>
  </div>

  <!-- ... rest of game ... -->
</game-shell>
```

That is all you need. The shell creates the score service automatically from
`score-url`, and the `<game-score-form>` and `<game-leaderboard>` components
use it via the context protocol.

## Default Score Server

The default score server is hosted at **`https://scores.htmlgamekit.dev`**. It
is free to use for any HTMLGameKit game. Scores are namespaced by `game-id`, so
different games never collide.

Set `score-url` on your shell to enable it:

```html
<game-shell
  game-id="reaction-time"
  score-url="https://scores.htmlgamekit.dev"
></game-shell>
```

The server provides:

- **Token-based sessions** -- anti-cheat tokens are issued per game attempt and
  validated on submission.
- **Round check-ins** -- the shell records timestamps at each round start, which
  the server validates against the token lifetime.
- **Leaderboards** -- top and bottom scores, filterable by group.
- **Histograms** -- score distribution data (80 buckets) for visualization.
- **Group play** -- group-scoped leaderboards and score submission.

## How It Works

The scoring flow is managed automatically by `<game-shell>`:

1. **Game start** -- the shell calls `scores.fetchToken()` to get a session
   token. This happens in the background; the game starts immediately.
2. **Each round** -- the shell calls `scores.recordCheckin()` to log the round
   start time relative to the token.
3. **Game end** -- the token and check-in data are available for submission.
   `<game-score-form>` submits the player's name and score.
4. **Result screen** -- `<game-leaderboard>` fetches the top/bottom scores and
   `<game-score-histogram>` fetches histogram data for display.

## Using a Custom Score Server

The scoring system is pluggable. Set `score-url` to your own server's base URL:

```html
<game-shell game-id="my-game" score-url="https://api.example.com"></game-shell>
```

Your server must implement these endpoints:

### Endpoints

All endpoints are scoped to a game or group ID (`{id}` below is either the
`game-id` or an active group ID).

| Method | Path                                | Purpose                                                                                             |
| ------ | ----------------------------------- | --------------------------------------------------------------------------------------------------- |
| `POST` | `/g/{id}/token`                     | Issue a session token. Returns `{ "token": "..." }`.                                                |
| `POST` | `/g/{id}`                           | Submit a score. Body: `token`, `name`, `score`, optional `checkins` (JSON array of second offsets). |
| `GET`  | `/g/{id}.json`                      | Fetch top scores. Returns an array of `{ name, score }` objects.                                    |
| `GET`  | `/g/{id}/worst.json`                | Fetch bottom scores. Returns an array of `{ name, score }` objects.                                 |
| `GET`  | `/g/{id}/histogram.json?buckets=80` | Fetch score distribution. Returns an array of `{ min, max, count }` bucket objects.                 |
| `POST` | `/g`                                | Create a group. Body: `{ "name": "..." }`. Returns `{ "id": "..." }`.                               |

### Token Flow

1. Client sends `POST /g/{id}/token` and receives `{ "token": "abc123" }`.
2. During gameplay, the client records check-in timestamps (seconds since token
   was issued).
3. On submission, the client sends the token, player name, score, and check-in
   array.
4. The server validates the token and check-in timing to detect obvious cheating
   (e.g. a game completed in 0 seconds).

## Programmatic Usage

If you need more control, use the `GameShell.gameScores()` factory directly:

```js
import { GameShell } from "htmlgamekit";

const scores = GameShell.gameScores("my-game", {
  baseUrl: "https://scores.htmlgamekit.dev",
  formatScore: (entry) => `${entry.score}ms`,
  scoreLabel: "Time",
});

// Fetch a token
await scores.fetchToken();

// Record round check-ins
scores.recordCheckin();

// Submit a score
await scores.submitScore("Alice", 342);

// Fetch leaderboard data
const best = await scores.fetchBest();
const worst = await scores.fetchWorst();
const histogram = await scores.fetchHistogram();
```

### Factory Options

| Option        | Type       | Description                                                                 |
| ------------- | ---------- | --------------------------------------------------------------------------- |
| `baseUrl`     | `string`   | Score server base URL. Required -- if empty, returns `noopScores`.          |
| `formatScore` | `function` | `(entry) => string` -- format a score entry for display in the leaderboard. |
| `scoreLabel`  | `string`   | Column header for the score column (default: `"Score"`).                    |

### Returned Methods

| Method                        | Description                                                                   |
| ----------------------------- | ----------------------------------------------------------------------------- |
| `fetchToken({ attempts })`    | Fetch a session token. Retries with exponential backoff (default 5 attempts). |
| `recordCheckin()`             | Record a round start timestamp.                                               |
| `submitScore(name, score)`    | Submit score with token and check-in data. Returns `true` on success.         |
| `fetchBest()`                 | Fetch top scores array.                                                       |
| `fetchWorst()`                | Fetch bottom scores array.                                                    |
| `fetchHistogram()`            | Fetch score distribution (80 buckets).                                        |
| `setGroupId(groupId)`         | Switch to group-scoped leaderboard.                                           |
| `createGroup(name, settings)` | Create a new group on the server.                                             |

### Properties

| Property    | Description                       |
| ----------- | --------------------------------- |
| `.token`    | Current session token, or `null`. |
| `.activeId` | The active game or group ID.      |

## Disabling Scoring

If you do not set `score-url`, scoring is disabled and the shell uses
`noopScores` -- a stub where every method is a no-op. The `<game-score-form>`
and `<game-leaderboard>` components gracefully handle this (the form stays in
"Connecting..." state and the leaderboard remains empty).

You can also import and use the stub directly:

```js
import { GameShell } from "htmlgamekit";

// GameShell.noopScores.fetchToken()    → undefined
// GameShell.noopScores.submitScore()   → false
// GameShell.noopScores.fetchBest()     → null
// GameShell.noopScores.token           → null
```

## Score Order

The `score-order` attribute on `<game-shell>` controls whether higher or lower
scores are better:

| Value             | Meaning          | Example               |
| ----------------- | ---------------- | --------------------- |
| `"asc"` (default) | Lower is better  | Reaction time (234ms) |
| `"desc"`          | Higher is better | Quiz score (15/20)    |

This affects how the leaderboard sorts entries and which end of the histogram is
labeled "best".

## Group Play

Add the `group` attribute to `<game-shell>` to enable group play. Groups scope
the leaderboard so players in the same group compete against each other:

```html
<game-shell game-id="my-game" score-url="https://scores.htmlgamekit.dev" group>
  <!-- ... -->
</game-shell>
```

The `group` attribute value is the localStorage key used to persist group membership. If omitted, the shell defaults to `{storage-key}-group`.

Groups are created and joined via URL parameters:

- **`?newgroup=Team+Alpha`** -- creates a new group and redirects.
- **`?g=groupId&gn=Team+Alpha`** -- joins an existing group.

The `groupId` and `groupName` signals on the shell are set automatically when a group is joined.

## Formatting Scores

Several components accept a `formatScore` function for customizing how scores
are displayed:

```js
const shell = document.querySelector("game-shell");

// Used by <game-result-stat>, <game-share>, and passed via context
shell.formatScore = (score) => `${score}ms`;
```

`shell.formatScore` works for `<game-leaderboard>` and `<game-challenge>` too —
both components pass `entry.score` (or `challenge.score`) to it automatically.
The per-component `.formatScore` setter exists only if you need access to the
full entry object, for example to combine fields:

```js
// Most cases — just set it on the shell:
shell.formatScore = (score) => `${score}ms`;

// Only needed if you want the full entry object:
const lb = document.querySelector("game-leaderboard");
lb.formatScore = (entry) => `${entry.score}ms (${entry.name})`;
lb.scoreLabel = "Time";
```

## Score Format vs Raw Value

`formatScore` is for **display only**. It does not change the raw score stored
in localStorage, submitted to the score server, or encoded into share URLs.
The score signal always holds the raw numeric value from round events (or from
`computeThreshold` for staircase directors).

If your game needs the score in a different numeric form (e.g. multiplied to
avoid floating point), do the conversion in your `GameRoundPassEvent` score
argument or by wrapping the progression's `computeThreshold` -- not in a
post-processing step.
