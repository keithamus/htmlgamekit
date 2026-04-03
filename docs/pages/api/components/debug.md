---
title: "GameDebug"
permalink: /api/components/debug/
cemSkip: [attrs]
---

A visual condition-tree debugger that shows all elements with `when-*` attributes as nodes in a graph, colour-coded by pass/fail state. Updates live as signals change.

Place as a child of `<game-shell>`. Toggle with <kbd>F2</kbd> or by setting the `open` attribute. The debug panel appears as a fixed sidebar on the right side of the viewport.

### Attributes

<dl class="def">

<dt><span class="badge attr">open</span></dt>
<dd>
<code>boolean</code> -- When present, the debug panel is visible. Toggle programmatically or via <kbd>F2</kbd>.
</dd>

</dl>

### Features

- **Live State** -- Displays current signal values (scene, round, score, pass streak, stats) and collection contents.
- **Condition Nodes** -- Renders every element with `when-*` attributes as a node in an SVG graph, grouped by DOM depth.
- **Pass/Fail Colouring** -- Nodes are green when all their conditions pass, red when any condition fails. Updates reactively as signals change.
- **Edge Grouping** -- Nodes that share condition keys across depth levels are connected with dashed lines, labelled with the shared key.
- **Click to Inspect** -- Clicking a node scrolls the element into view, highlights it briefly, and logs condition details to the browser console.

### Keyboard Shortcut

| Key    | Action                        |
| ------ | ----------------------------- |
| `F2`   | Toggle the debug panel        |

### Signal Access

| Signal        | Usage                                                                                          |
| ------------- | ---------------------------------------------------------------------------------------------- |
| Shell signals | Reads `scene`, `round`, `score`, `stats`, `difficulty`, `passStreak`, `failStreak` for live state display |

### Usage

```html
<game-shell id="game" game-id="my-game">
  <!-- game content -->
  <game-debug></game-debug>
</game-shell>
```

Open it programmatically:

```js
document.querySelector("game-debug").open = true;
```

The debug panel is intended for development only. Remove or conditionally include `<game-debug>` in production builds.
