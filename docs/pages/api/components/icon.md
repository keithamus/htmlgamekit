---
title: "GameIcon"
permalink: /api/components/icon/
demo: icon
demoHeight: 500px
demoTitle: Icon demo
cemSkip: [attrs]
---

A composable primitive for rendering named SVG icons from a global sprite sheet. Reads the `spriteSheet` signal from the nearest `<game-shell>` to resolve the sprite sheet URL, then renders `<svg><use href="{spriteSheet}#{name}">`. Supports `<option>` children with `when-*` conditions for conditional icon selection.

Place `<game-icon>` anywhere inside `<game-shell>` — buttons, HUDs, overlays, trophy grids, or any custom component.

### Attributes

<dl class="def">

<dt><span class="badge attr">name</span></dt>
<dd>
<code>string</code> -- The icon name. Used as the fragment identifier in the SVG <code>&lt;use&gt;</code> reference. Must match a <code>&lt;symbol id="..."&gt;</code> in the sprite sheet.
</dd>

</dl>

### Signal Access

| Signal              | Usage                                                               |
| ------------------- | ------------------------------------------------------------------- |
| `shell.spriteSheet` | Reads the sprite sheet URL set on `<game-shell sprite-sheet="...">` |

### Setting the Sprite Sheet

Set the `sprite-sheet` attribute on `<game-shell>`. All `<game-icon>` elements inside the shell read this via the `spriteSheet` signal:

```html
<game-shell
  id="game"
  game-id="my-game"
  sprite-sheet="/assets/sprites.svg"
></game-shell>
```

The sprite sheet is a standard SVG file with `<symbol>` elements:

```xml
<svg xmlns="http://www.w3.org/2000/svg">
  <symbol id="play" viewBox="0 0 24 24">
    <path d="M8 5v14l11-7z"/>
  </symbol>
  <symbol id="heart" viewBox="0 0 24 24">
    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5..."/>
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

Sized and coloured via CSS:

```css
game-icon {
  --game-icon-size: 24px;
  color: var(--game-accent);
}
```
