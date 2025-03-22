---
layout: doc
title: "HUD"
permalink: /api/hud/
---

The HUD (heads-up display) is a plain `<div>` with `when-some-scene` and
optionally `data-hud` for styling hooks. It is not a custom element. Position,
layout, and appearance are entirely up to the game author.

The shell's slot assignment controls visibility: the div is slotted when the
current scene matches one of the tokens in `when-some-scene`. Typically
`"playing between paused"`.

### Usage

```html
<div when-some-scene="playing between paused" data-hud>
  <game-round-counter></game-round-counter>
  <game-stat key="streak">Streak</game-stat>
</div>
```

The `data-hud` attribute is optional and purely a styling hook for your CSS.
HTMLGameKit does not style it -- you provide your own positioning, background,
and layout.

### Typical Styles

```css
[data-hud] {
  display: flex;
  position: fixed;
  top: 0; left: 0; right: 0;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(6px);
  z-index: 10;
  pointer-events: none;
  font-size: 14px;
}
```

### Components

The HUD typically contains
[`<game-round-counter>`]({{ site.baseurl }}/api/components/hud/) and
[`<game-stat>`]({{ site.baseurl }}/api/components/hud/) components, which are
real custom elements with signal-driven rendering. See their docs for details.
