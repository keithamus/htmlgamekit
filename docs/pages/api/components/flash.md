---
title: "GameFlash"
permalink: /api/components/flash/
demo: flash
demoHeight: 350px
demoTitle: Flash demo
---

A full-screen pass/fail flash overlay. Observes game signals and briefly flashes green or red when a round completes. Uses `ElementInternals` custom states for styling, so per-game CSS can restyle the flash without modifying the component.

### Signal Access

| Signal        | Usage                                                          |
| ------------- | -------------------------------------------------------------- |
| Shell signals | Reads `scene` and `lastRoundPassed` signals to trigger flashes |

### Usage

```html
<game-flash when-some-scene="playing between paused"></game-flash>
```

Override colors for a light theme:

```css
game-flash {
  --game-flash-pass: rgba(0, 200, 100, 0.25);
  --game-flash-fail: rgba(255, 0, 0, 0.2);
}
```
