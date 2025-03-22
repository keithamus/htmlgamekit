---
layout: doc
title: "Scenes"
permalink: /api/scenes/
---

A scene is a named state in the game's lifecycle. The current scene is held in
`shell.scene` as a TC39 Signal. Components react to it via `effectCallback`,
and HTML children declare which scenes they appear in using `when-some-scene`.

## Scene States

| Scene      | Meaning                                 | Typical content visible         |
| ---------- | --------------------------------------- | ------------------------------- |
| `init`     | Initial state before anything has run   | Intro overlay                   |
| `demo`     | Demo or tutorial animation playing      | Intro overlay + game area       |
| `ready`    | Waiting for the player to start         | Intro overlay                   |
| `playing`  | Active round in progress                | Game area, HUD, timer           |
| `between`  | Brief pause between rounds              | Game area, HUD, between overlay |
| `practice` | Free-play mode outside the scored game  | Game area                       |
| `paused`   | Game paused (auto-pauses on tab switch) | Game area, HUD                  |
| `result`   | Game complete, showing results          | Result overlay                  |

## Transitions

```txt
init ──► ready ──► playing ──► between ──► playing ──► ...
          │   │                                         │
          │   └── practice                              └──► result
          └── (demo attr) ──► demo ──► ready ──┘
```

- `init` → `ready` on page load (or `demo` if the `demo` attribute is set)
- `ready` → `playing` on game start
- `playing` → `between` on round pass, fail, or timeout
- `between` → `playing` after `between-delay` milliseconds
- After the final round: `between` → `result`
- `playing` → `paused` on tab hide; `paused` → `playing` on tab show
- `ready` → `practice` via `--practice` command or `game-practice-start` event
- `result` → `playing` on restart

## Controlling Visibility with `when-some-scene`

The shell uses [manual slot assignment](https://developer.mozilla.org/en-US/docs/Web/API/HTMLSlotElement/assign)
to control which children are visible. Each child element declares which scenes
it belongs to using the same [`when-*` condition system]({{ site.baseurl }}/api/conditions/)
used everywhere else in HTMLGameKit. The shell evaluates `when-*` attributes on
all direct children and slots those that match.

```html
<game-shell>
  <!-- visible during intro, demo, and ready scenes -->
  <div when-some-scene="intro" data-overlay>
    <h1>My Game</h1>
    <button commandfor="game" command="--start">Play</button>
  </div>

  <!-- visible during playing, between, and paused -->
  <div when-some-scene="playing between paused">
    <game-round-counter></game-round-counter>
    <my-game></my-game>
  </div>

  <!-- visible only during result -->
  <div when-some-scene="result" data-overlay>
    <game-result-stat label="Score"></game-result-stat>
  </div>
</game-shell>
```

`when-some-scene` takes a space-separated list of scene names. The value
`"intro"` is an alias that expands to `init demo ready`.

Children with **no `when-*` attributes** are always slotted in, regardless of
scene. This is useful for elements like `<game-audio>` that should always be
present.

Because the shell uses the full `when-*` system, any signal condition can
control visibility — not just scene:

```html
<!-- Only visible once the player has scored 10 or more -->
<div when-min-score="10">
  <p>You're on a roll!</p>
</div>

<!-- Only visible when on a 3+ pass streak -->
<game-toast when-min-pass-streak="3" trigger="pass">Hat trick!</game-toast>
```

## The `intro` Alias

`when-some-scene="intro"` is shorthand for `when-some-scene="init demo ready"`.
These are the three scenes that all show the intro overlay, so the alias covers
the common case cleanly.

```html
<div when-some-scene="intro" data-overlay>...</div>
<!-- equivalent to: -->
<div when-some-scene="init demo ready" data-overlay>...</div>
```

## Overlays with `data-overlay`

`data-overlay` is a CSS positioning hint. It does not affect slot assignment —
only `when-*` conditions control visibility. Adding `data-overlay` gives the
element `position: fixed; inset: 0` styling (from `game-base.css`), so it
covers the game area:

```html
<!-- Covers the entire viewport -->
<div when-some-scene="result" data-overlay>...</div>

<!-- Positioned in normal document flow, shown/hidden by scene -->
<div when-some-scene="playing between paused">...</div>
```

## Reacting to Scene Changes in Components

Components observe the `scene` signal via `effectCallback`:

```js
effectCallback({ scene }) {
  if (scene.get() === "playing") {
    this.#start();
  } else if (scene.get() === "result") {
    this.#showSummary();
  }
}
```

`effectCallback` re-runs automatically on every scene change and is cleaned up
when the component disconnects.

## Reacting to Scene Changes in Entry Scripts

Outside of components, listen for the `game-lifecycle` event on the shell.
It fires on every scene transition:

```js
document.querySelector("game-shell").addEventListener("game-lifecycle", (e) => {
  if (e.action === "playing") {
    console.log(`Round ${e.state.round} starting`);
  }
});
```

See [`GameLifecycleEvent`]({{ site.baseurl }}/api/events/#gamelifecycleevent) for the full event shape.

## Controlling Scenes Programmatically

The shell exposes methods to drive scene transitions directly:

```js
const shell = document.querySelector("game-shell");

shell.start(); // ready/result → playing (resets all state)
shell.pause(); // playing → paused
shell.resume(); // paused → playing
```

Or dispatch the corresponding request events from inside a component:

```html
<button commandfor="game" command="--start">Play</button>
<button commandfor="game" command="--restart">Play again</button>
<button commandfor="game" command="--pause">Pause</button>
```
