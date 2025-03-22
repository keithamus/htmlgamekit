---
title: "GameStat"
permalink: /api/components/stat/
cemSkip: [attrs]
---

Displays a single stat from the game state's `stats` map. Observes game signals and re-renders whenever the stat value changes. Place inside a [HUD container]({{ site.baseurl }}/api/hud/) or give it a `when-some-scene` attribute as a direct shell child.

### Attributes

All attributes reflect as IDL properties of the same name.

<dl class="def">

<dt><span class="badge attr">key</span> <code>.key</code></dt>
<dd>
<code>string</code> -- The key in the <code>stats</code> signal to display.
Must match the key used in <code>GameStatUpdateEvent</code> dispatches.
</dd>

<dt><span class="badge attr">format</span> <code>.format</code></dt>
<dd>
<code>string</code> -- How to format the value. Defaults to
<code>"plain"</code>:

- `"ms"` -- Round to integer and append "ms" suffix (e.g. `342ms`)
- `"Ndp"` -- Fixed-point decimal with N decimal places (e.g. `"2dp"` formats `0.1` as `"0.10"`)
- `"plain"` -- Display the raw value as a string (default)
</dd>

</dl>

The stat only renders once the key exists in the `stats` signal. It updates live as new `GameStatUpdateEvent` events are dispatched.

### Signal Access

| Signal        | Usage                |
| ------------- | -------------------- |
| Shell signals | Reads `stats` signal |

### Usage

```html
<game-stat key="streak">Streak</game-stat>
<game-stat key="avgTime" format="ms">Avg</game-stat>
```

The label text is provided as slotted content (light DOM children), not via an attribute.

Stats are set from your game logic via events:

```js
this.dispatchEvent(new GameStatUpdateEvent("streak", 5));
this.dispatchEvent(new GameStatUpdateEvent("avgTime", 342));
```
