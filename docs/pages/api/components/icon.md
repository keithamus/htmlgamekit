---
layout: doc
title: "GameIcon"
permalink: /api/components/icon/
---

A composable primitive for rendering named SVG icons from a global sprite sheet. Reads the `spriteSheet` signal from the nearest `<game-shell>` to resolve the sprite sheet URL, then renders `<svg><use href="{spriteSheet}#{name}">`. Supports `<option>` children with `when-*` conditions for conditional icon selection.

{% include "demo-embed.html", demo: "icon", title: "Icon demo", height: "500px" %}

Place `<game-icon>` anywhere inside `<game-shell>` -- buttons, HUDs, overlays, trophy grids, or any custom component.

### Attributes

<dl class="def">

<dt><span class="badge attr">name</span></dt>
<dd>
<code>string</code> -- The icon name. Used as the fragment identifier in the SVG <code>&lt;use&gt;</code> reference. Must match a <code>&lt;symbol id="..."&gt;</code> in the sprite sheet.
</dd>

</dl>

### Signal Access

| Signal | Usage |
|---|---|
| `shell.spriteSheet` | Reads the sprite sheet URL set on `<game-shell sprite-sheet="...">` |

### CSS Custom Properties

{% cem_cssprops "game-icon" %}

The icon inherits `color` from its parent and applies it as `fill`, so it responds to `color` changes naturally.

### Setting the Sprite Sheet

Set the `sprite-sheet` attribute on `<game-shell>`. All `<game-icon>` elements inside the shell read this via the `spriteSheet` signal:

```html
<game-shell id="game" game-id="my-game" sprite-sheet="/assets/sprites.svg">
```

The sprite sheet is a standard SVG file with `<symbol>` elements:

```xml
<svg xmlns="http://www.w3.org/2000/svg">
  <symbol id="play" viewBox="0 0 24 24">
    <path d="M8 5v14l11-7z"/>
  </symbol>
  <symbol id="heart" viewBox="0 0 24 24">
    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5
             2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09
             C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5
             c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
  </symbol>
  <symbol id="trophy" viewBox="0 0 24 24">
    <path d="M..."/>
  </symbol>
</svg>
```

### Usage

In buttons:

```html
<button commandfor="game" command="--start">
  <game-icon name="play"></game-icon> Play
</button>
```

In the HUD:

```html
<div when-some-scene="playing between paused">
  <span style="pointer-events:auto">
    <game-icon name="heart"></game-icon> x3
  </span>
  <game-round-counter></game-round-counter>
</div>
```

In trophies (used internally by `<game-trophy>`, but you can also use directly):

```html
<game-icon name="trophy" style="--game-icon-size: 48px; color: gold;"></game-icon>
```

Sized and coloured via CSS:

```css
game-icon {
  --game-icon-size: 24px;
  color: var(--game-accent);
}
```
