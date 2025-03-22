---
layout: doc
title: "Game Area"
permalink: /api/area/
---

The game area is a plain `<div>` with a `when-some-scene` attribute listing the scenes it should be visible during. It serves as the main gameplay container. Visibility is controlled by the shell's manual slot assignment -- the shell assigns children to its shadow root's `<slot>` when their `when-some-scene` matches the current scene. No custom element registration is needed.

### Visibility

The game area is slotted (visible) when the shell's current scene matches any token in its `when-some-scene` attribute. A typical game area uses `when-some-scene="playing between paused"` to be visible during active play, between rounds, and when paused.

To include `demo` in the scene list (e.g. `when-some-scene="playing between paused demo"`), your game content is visible during the demo scene when the `demo` attribute is set on `<game-shell>`. This is useful for showing an animated preview behind the intro overlay.

### Usage

```html
<div when-some-scene="playing between paused">
  <!-- Your game content here -->
  <canvas id="game-canvas"></canvas>
</div>
```

Children without a `when-some-scene` attribute are always slotted and therefore always visible.
