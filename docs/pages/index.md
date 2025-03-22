---
layout: base
permalink: /
---

<header class="hero">
  <h1>HTMLGameKit</h1>
  <p class="tagline">
    It's dangerous to go alone! Take this.
  </p>
</header>

## What is it?

HTMLGameKit is a set of custom elements that give you everything you need to
build simple browser-based games with nothing but HTML, CSS, and a pinch of
JavaScript. It provides a **state machine** to manage game flow, **difficulty
directors** to control progression, **audio systems** to handle music and
chimes, **UI components** for overlays, HUDs, timers, and feedback, a
**scoring system** with leaderboards and histograms, and a
**context protocol** so your game components can reactively subscribe to state
changes.

## Features

<div class="features">
  <div class="feature">
    <h3>State Machine</h3>
    <p><code>&lt;game-shell&gt;</code> manages the entire game lifecycle:
      init, demo, ready, playing, between rounds, and result. State is
      exposed as TC39 Signals, observable by any descendant component.</p>
  </div>
  <div class="feature">
    <h3>Difficulty Directors</h3>
    <p>Three pluggable strategies: <strong>Fixed</strong> (linear
      interpolation), <strong>Staircase</strong> (adaptive psychophysics),
      and <strong>Tier</strong> (promote/demote). Configured declaratively
      in HTML.</p>
  </div>
  <div class="feature">
    <h3>Context Protocol</h3>
    <p>Components subscribe to game state reactively using the
      <a href="https://github.com/webcomponents-cg/community-protocols/blob/main/proposals/context.md">Context Community Protocol</a>.
      No prop drilling. No global state.</p>
  </div>
  <div class="feature">
    <h3>UI Components</h3>
    <p>Overlays, HUD, round counter, timer, feedback flash, result
      display, share button, quiz engine, and more.
      All themeable via CSS custom properties.</p>
  </div>
  <div class="feature">
    <h3>Scoring & Leaderboards</h3>
    <p>Built-in scoring with leaderboards, histograms, and anti-cheat
      tokens. Defaults to a free hosted server. Pluggable -- point
      <code>score-url</code> at your own API.</p>
  </div>
  <div class="feature">
    <h3>Audio System</h3>
    <p>Declarative sound effects and a BPM-ramping sequencer. Three
      synth types, auto-triggered by game events. No audio files
      needed.</p>
  </div>
  <div class="feature">
    <h3>Zero Dependencies</h3>
    <p>No React. No build step. No npm install required. Pure ES modules
      and standard Web Components. Works in any modern browser.</p>
  </div>
  <div class="feature">
    <h3>Themeable</h3>
    <p>Every visual element respects <code>--game-*</code> CSS custom
      properties. Dark theme by default. Swap colours to match your game.</p>
  </div>
</div>

## Components

| Element                                                                             | Purpose                                                   |
| ----------------------------------------------------------------------------------- | --------------------------------------------------------- |
| [`<game-shell>`]({{ site.baseurl }}/api/game-shell/)                                | Root state machine, context provider, event hub           |
| [`[when-some-scene]`]({{ site.baseurl }}/api/scenes/)                                    | State-driven visibility for any element                   |
| [`[data-overlay]`]({{ site.baseurl }}/api/scenes/#overlays-with-data-overlay)       | Overlay styling (fixed position, backdrop)                |
| [`<game-round-counter>`]({{ site.baseurl }}/api/components/hud/)                    | Round progress display                                    |
| [`<game-stat>`]({{ site.baseurl }}/api/components/hud/)                             | Reactive stat display (time, score, etc.)                 |
| [`<game-timer>`]({{ site.baseurl }}/api/components/timer/)                          | Countdown progress bar                                    |
| [`<game-toast>`]({{ site.baseurl }}/api/components/toast/)                          | Trigger-based feedback messages (ephemeral or persistent) |
| [`<game-flash>`]({{ site.baseurl }}/api/components/flash/)                          | Full-screen pass/fail colour flash                        |
| [`<game-between when-some-scene="between">`]({{ site.baseurl }}/api/components/between/) | Rich between-rounds interstitial                          |
| [`<game-challenge>`]({{ site.baseurl }}/api/components/challenge/)                  | Challenge mode opponent score                             |
| [`<game-share>`]({{ site.baseurl }}/api/components/share/)                          | Share result button                                       |
| [`<game-score-form>`]({{ site.baseurl }}/api/components/score-form/)                | Name input + submit to leaderboard                        |
| [`<game-leaderboard>`]({{ site.baseurl }}/api/components/leaderboard/)              | Leaderboard table + histogram                             |
| [`<game-result-stat>`]({{ site.baseurl }}/api/components/result-stat/)              | Large result score display                                |
| [`<game-result-message>`]({{ site.baseurl }}/api/components/result-message/)        | Score-range conditional result messages                   |
| [`<game-quiz>`]({{ site.baseurl }}/api/components/quiz/)                            | Declarative quiz/trivia from `<fieldset>` markup          |
| [`<game-tile-input>`]({{ site.baseurl }}/api/components/tile-input/)                | Wordle-style tile input with letter tracking              |
| [`<game-icon>`]({{ site.baseurl }}/api/components/icon/)                            | SVG sprite icon from the global sprite sheet              |
| [`<game-trophy>`]({{ site.baseurl }}/api/components/trophy/)                        | Achievement with persistent unlock and optional grid      |
| [`<game-preferences>`]({{ site.baseurl }}/api/components/preferences/)              | Popover-based preferences panel                           |
| [`<game-preference>`]({{ site.baseurl }}/api/components/preferences/)               | Individual preference (toggle, range)                     |
| [`<game-audio>`]({{ site.baseurl }}/api/components/audio/)                          | Auto-triggering sound effect container                    |
| [`<game-sample>`]({{ site.baseurl }}/api/components/audio/)                         | Synthesised sound effect definition                       |
| [`<game-sequencer>`]({{ site.baseurl }}/api/components/audio/)                      | BPM-ramping music sequencer                               |
| [`progression` attribute]({{ site.baseurl }}/api/progressions/)                     | Declarative difficulty director config                    |
| [`<game-signal>`]({{ site.baseurl }}/api/components/output/)                        | Live value display (score, round, stat, etc.)             |

## Tutorials

<div class="tutorials">
  <a href="{{ site.baseurl }}/tutorials/click-counter/" class="tutorial-card">
    <h3>Click Counter</h3>
    <p>Build a click-target game from scratch. Learn the core loop: shell,
      state subscription, and round events.</p>
  </a>
  <a href="{{ site.baseurl }}/tutorials/reaction-time/" class="tutorial-card">
    <h3>Reaction Time</h3>
    <p>Build a reaction time game with FixedProgression for variable delays,
      retry failures, and post-game result logic.</p>
  </a>
  <a href="{{ site.baseurl }}/tutorials/capital-quiz/" class="tutorial-card">
    <h3>Capital Quiz</h3>
    <p>Build an adaptive quiz with TierProgression, countdown timer, and the
      built-in &lt;game-quiz&gt; component. Two lines of JS.</p>
  </a>
  <a href="{{ site.baseurl }}/tutorials/word-guess/" class="tutorial-card">
    <h3>Word Guess</h3>
    <p>Build a Wordle-style game with tile input, audio, and flash.
      Showcases &lt;game-tile-input&gt; and declarative sound.</p>
  </a>
  <a href="{{ site.baseurl }}/tutorials/scoring/" class="tutorial-card">
    <h3>Scoring & Leaderboards</h3>
    <p>Add online score submission, leaderboards with histograms, and
      challenge mode. One attribute to enable.</p>
  </a>
</div>
