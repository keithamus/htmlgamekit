---
layout: doc
title: Architecture
permalink: /architecture/
---

## Design Principles

**Declarative first.** Simple games can be built with zero custom JavaScript. HTML attributes express configuration; JavaScript is for the creative mechanics that make your game unique, not for boilerplate. When a game's entire behaviour can be read from the markup, it is easy to reason about, copy, and adapt.

**Events up, signals down.** Game mechanics announce outcomes by dispatching events that bubble to the shell (`GameRoundPassEvent`, `GameRoundFailEvent`). The shell updates `Signal.State` fields in response; components read state reactively. This directionality prevents cross-sibling coupling — a timer and a leaderboard share no direct reference, so either can be moved, removed, or replaced without breaking the other.

**TC39 Signals for state, not callbacks.** Effects re-run automatically when any signal they read changes, without explicit subscription management. Adding a dependency to an `effectCallback` requires no additional wiring — the reactive system discovers it at runtime. Signals are synchronous and composable, which avoids the ordering and timing problems that async state machines introduce in a frame loop.

**Attributes are configuration; the shell owns no children's attributes.** The shell uses `slotAssignment: "manual"` and reads `when-some-scene` from children to decide visibility. This keeps the markup declarative: a child declares where it should appear, and the shell enforces it. The alternative — the shell toggling `slot=` or `hidden` on children — would mean the author's markup is visibly modified at runtime, making DevTools inspection unreliable.

**No build step.** The target use case is a game page, not a Node build pipeline. ES modules and native custom elements work in every modern browser without transformation. The `src/` directory is the distribution.

## Overview

HTMLGameKit uses three core patterns:

1. **TC39 Signals** — each piece of game state is a `Signal.State`, independently observable.
2. **Context Protocol** — components that own non-shell data (e.g. `<game-word-source>`) share it with descendants via DOM context rather than props.
3. **DOM Events** — game mechanics communicate upward through bubbling events.

Data flows in one direction: events bubble up to the shell, the shell sets signal values, and effects in descendant components react.

```txt
              GameShell (Signal.State fields)
                     |                       |
                     | events bubble up      | signals via DOM traversal
                     ^                       v
               Game Mechanics         All Components
        (dispatch custom events)  (timer, leaderboard,
                                     toast, etc.)
```

For more detail on each pattern, see:

- [Scenes]({{ site.baseurl }}/api/scenes/) — game scene state machine and `when-some-scene` visibility
- [Signals]({{ site.baseurl }}/api/signals/) — TC39 Signals, the built-in signal table, and reactive effects
- [Events]({{ site.baseurl }}/api/events/) — how mechanics communicate with the shell, event types, and the round lifecycle
- [Context Protocol]({{ site.baseurl }}/api/context/) — DOM-based data sharing between ancestor and descendant components
