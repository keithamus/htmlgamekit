---
title: "GamePassage"
permalink: /api/components/passage/
cemSkip: [attrs]
---

An addressable content block for narrative and dialog trees. Manages conditional visibility of its children via `when-*` attributes and tracks visits in the shell's collection system.

Place as a direct child of `<game-shell>`. Use `when-*` conditions on the passage itself so the shell controls when it's active. Children can use their own `when-*` conditions -- including `when-no-visited` / `when-some-visited` -- for first-visit vs revisit content.

When the passage becomes active (its `when-*` conditions pass), it adds its `id` to the shell's `visited` collection (configurable via the `collection` attribute) and re-evaluates child conditions.

### Attributes

<dl class="def">

<dt><span class="badge attr">id</span></dt>
<dd>
<code>string</code> -- Unique passage identifier. Used as the item ID when tracking visits in the collection. Required for visit tracking.
</dd>

<dt><span class="badge attr">collection</span></dt>
<dd>
<code>string</code> -- Name of the collection to track visits in. Defaults to <code>"visited"</code>. Change this if you want to track visits in a different collection.
</dd>

</dl>

### Events Dispatched

<dl class="def">

<dt><span class="badge event">game-collection-add</span></dt>
<dd>
Fired when the passage becomes active for the first time (or after being deactivated and reactivated). Bubbles up to the shell, which adds the passage's <code>id</code> to the named collection.
</dd>

</dl>

### First-Visit vs Revisit Content

Children of a passage can use `when-no-visited` and `when-some-visited` to differentiate between the first visit and subsequent visits. Child conditions are evaluated **before** the visit is tracked, so `when-no-visited` works correctly on the first activation:

```html
<game-passage id="cellar" when-eq-room="cellar">
  <p when-no-visited="cellar">
    You descend into a dark, musty cellar. Cobwebs brush your face.
  </p>
  <p when-some-visited="cellar">
    The cellar again. You know your way around now.
  </p>
  <button commandfor="game" command="--stat" value="room:hallway">
    Go back
  </button>
</game-passage>
```

### Signal Access

| Signal        | Usage                                                             |
| ------------- | ----------------------------------------------------------------- |
| Shell signals | Reads signals via `effectCallback` to evaluate `when-*` conditions |

### Usage

A simple two-room adventure using passages, stats, and collections:

```html
<game-shell id="game" game-id="adventure" save-stats>
  <game-passage id="hallway" when-eq-room="hallway">
    <p>You're in a long hallway.</p>
    <button commandfor="game" command="--stat" value="room:cellar">
      Go to cellar
    </button>
    <button
      commandfor="game"
      command="--collect"
      value="inventory:key"
      when-no-inventory="key"
    >
      Pick up key
    </button>
  </game-passage>

  <game-passage id="cellar" when-eq-room="cellar">
    <p when-no-visited="cellar">A dark cellar. Something glints in the corner.</p>
    <p when-some-visited="cellar">The cellar. Nothing new here.</p>
    <button commandfor="game" command="--stat" value="room:hallway">
      Go back
    </button>
  </game-passage>
</game-shell>
```
