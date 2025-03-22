---
layout: doc
title: "UI Components"
permalink: /api/components/
---

# UI Components

HTMLGameKit ships a set of ready-to-use custom elements for common game UI
patterns. All components read signals from the shell automatically -- drop
them inside `<game-shell>` and they work.

For layout patterns that use plain elements rather than custom elements, see
[GameShell (Scene Visibility & Overlays)]({{ site.baseurl }}/api/game-shell/),
[Game Area]({{ site.baseurl }}/api/area/), and
[HUD]({{ site.baseurl }}/api/hud/).

## HUD & In-Game Display

| Element | Description |
|---|---|
| [`<game-round-counter>`]({{ site.baseurl }}/api/components/hud/) | Round progress display with bar |
| [`<game-stat>`]({{ site.baseurl }}/api/components/hud/) | Reactive stat display (time, score, streak, etc.) |
| [`<game-signal>`]({{ site.baseurl }}/api/components/output/) | Live value display (score, round, stat, difficulty, group) |
| [`<game-timer>`]({{ site.baseurl }}/api/components/timer/) | Countdown progress bar |
| [`<game-between>`]({{ site.baseurl }}/api/components/between/) | Rich between-rounds interstitial screen |

## Feedback & Effects

| Element | Description |
|---|---|
| [`<game-flash>`]({{ site.baseurl }}/api/components/flash/) | Full-screen pass/fail color flash |
| [`<game-toast>`]({{ site.baseurl }}/api/components/toast/) | Trigger-based feedback messages (ephemeral or persistent) |

## Results & Scoring

| Element | Description |
|---|---|
| [`<game-result-stat>`]({{ site.baseurl }}/api/components/result-stat/) | Large score display with animation and thresholds |
| [`<game-result-message>`]({{ site.baseurl }}/api/components/result-message/) | Score-range conditional result messages |
| [`<game-score-form>`]({{ site.baseurl }}/api/components/score-form/) | Name input + submit to leaderboard |
| [`<game-leaderboard>`]({{ site.baseurl }}/api/components/leaderboard/) | Best/worst scores table |
| [`<game-score-histogram>`]({{ site.baseurl }}/api/components/histogram/) | Score distribution bar chart |

## Social & Multiplayer

| Element | Description |
|---|---|
| [`<game-share>`]({{ site.baseurl }}/api/components/share/) | Share result button (Web Share / clipboard fallback) |
| [`<game-challenge>`]({{ site.baseurl }}/api/components/challenge/) | Challenge mode opponent score + taunts |
| [`<game-trophy>`]({{ site.baseurl }}/api/components/trophy/) | Self-rendering achievement with auto-unlock |

## Settings

| Element | Description |
|---|---|
| [`<game-preferences>`]({{ site.baseurl }}/api/components/preferences/) | Popover-based preferences panel |
| [`<game-preference>`]({{ site.baseurl }}/api/components/preferences/) | Individual preference definition (toggle, range) |

## Game Logic

| Element | Description |
|---|---|
| [`<game-quiz>`]({{ site.baseurl }}/api/components/quiz/) | Declarative quiz/trivia engine |
| [`<game-tile-input>`]({{ site.baseurl }}/api/components/tile-input/) | Wordle-style tile input with letter tracking |

## Primitives

| Element | Description |
|---|---|
| [`<game-icon>`]({{ site.baseurl }}/api/components/icon/) | SVG sprite icon from the global sprite sheet |

## Audio

| Element | Description |
|---|---|
| [`<game-audio>`]({{ site.baseurl }}/api/components/audio/) | Auto-triggering sound effect container |
| [`<game-sample>`]({{ site.baseurl }}/api/components/audio/) | Synthesised sound effect definition |
| [`<game-sequencer>`]({{ site.baseurl }}/api/components/audio/) | BPM-ramping music sequencer |

## CSS Custom Properties

All components respect these CSS custom properties for theming. Set them on `<game-shell>` or any ancestor. The defaults below match the values in `game-base.css`.

| Property | Default | Description |
|---|---|---|
| `--game-bg` | `#111` | Primary background color |
| `--game-text` | `#eee` | Primary text color |
| `--game-accent` | `#fff` | Accent color (timer bar, progress bar) |
| `--game-overlay-bg` | `rgba(0, 0, 0, 0.8)` | Overlay background |

| `--game-btn-bg` | `#fff` | Button background |
| `--game-btn-text` | `#111` | Button text color |
| `--game-btn-border` | `rgba(255, 255, 255, 0.5)` | Button border color |
| `--game-result-gradient-from` | `#6ee7b7` | Result stat gradient start |
| `--game-result-gradient-to` | `#3b82f6` | Result stat gradient end |
| `--game-toast-color` | `var(--game-text, #eee)` | Toast text color (set per-trigger by `game-base.css`: `#6ee7b7` for pass, `#f87171` for fail/timeout) |
| `--game-flash-pass` | `rgba(50, 220, 120, 0.35)` | Flash color on pass |
| `--game-flash-fail` | `rgba(230, 40, 40, 0.3)` | Flash color on fail |
| `--game-between-bg` | `#111` | Between-rounds background |
