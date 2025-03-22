---
layout: doc
title: "GameShare"
permalink: /api/components/share/
---

A share button that lets the player share their result. Uses a progressive fallback chain to maximize compatibility across browsers and devices.

{% include "demo-embed.html", demo: "share", title: "Share demo", height: "400px" %}

### Share Fallback Chain

When the user clicks the share button, the component attempts each strategy in order:

1. **Web Share API** (`navigator.share`) — Native OS share sheet. Used on mobile browsers and supporting desktops.
2. **Clipboard API** (`navigator.clipboard.writeText`) — Copies the text silently and shows a "Copied!" confirmation.
3. **Legacy execCommand** (`document.execCommand("copy")`) — Fallback for older browsers.
4. **Manual copy textarea** — If all else fails, reveals a read-only `<textarea>` pre-filled with the share text so the user can copy manually.

### Share Text

The share text is taken from the **light DOM content** of the element (via `textContent`). Empty lines are stripped. Use `<game-signal>` children to inject live values such as score or a shareable URL:

```html
<game-share>
  I scored <game-signal key="score" format="ms"></game-signal> on Reaction Time!
  Can you beat it? <game-signal key="url"></game-signal>
</game-share>
```

There are no `text` or `hashtag` attributes. All share text comes from the slot.

### Shadow DOM Parts

{% cem_cssparts "game-share" %}

### Usage

```html
<div when-some-scene="result" data-overlay>
  <game-result-stat label="Score" format="ms"></game-result-stat>
  <game-share>
    I scored <game-signal key="score" format="ms"></game-signal>!
    <game-signal key="url"></game-signal>
  </game-share>
  <button commandfor="game" command="--restart">Play Again</button>
</div>
```
