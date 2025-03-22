---
layout: doc
title: Architecture
permalink: /architecture/
---

## Design Principles

HTMLGameKit follows a small set of principles that inform every design decision:

**Declarative first.** If behaviour can be expressed as an HTML attribute, it
should be. JavaScript configuration exists as an escape hatch. The goal: simple
games can be built with zero custom JavaScript. The JavaScript you write should
be your canvas for creative mechanics, but the boilerplate every game needs
starts with some simple HTML.

**Events are announcements, signals are state.** Game mechanics dispatch events
that bubble up to the shell (`GameRoundPassEvent`, `GameRoundFailEvent`, etc.).
The shell updates its `Signal.State` fields in response. Components read state
reactively through TC39 Signals exposed as properties on the shell element.
Events are for announcing things; signals are for reading and observing state.

**Attributes are configuration.** Attributes are never sprouted or modified at
runtime, leaving you to define them. However, all elements observe attribute
changes, allowing modification at runtime by your mechanics.

**HTML that feels like HTML.** All components respond to attribute changes, and
are robust to missing or invalid values. Attributes are all reflected using the
same kind of semantics within HTML. Components respond to children
changing, and components are only created when they add
_unique semantic behaviour_. There will never be a `<game-button>` to replace
`<button>`. You can rely on the HTML you know, and the intuition you have.

**No build step.** Pure ES modules, standard Web Components, no transpilation.
The `src/` directory is the distribution.

## Overview

HTMLGameKit is built on three core patterns that work together:

1. **TC39 Signals** -- each piece of game state is a `Signal.State`,
   independently observable.
2. **Context Protocol** -- custom components can provide data to descendants
   when the data source is not the shell (e.g. `<game-word-source>`).
3. **DOM Events** -- game mechanics communicate upward through bubbling events.

Data flows in one direction: events bubble up from game mechanics to the shell,
the shell sets signal values, and effects in descendant components react to
the changes.

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
