---
title: "GameAudio"
permalink: /api/components/audio/
demo: audio
demoHeight: 350px
demoTitle: Audio demo
cemSkip: [attrs]
---

> **Deprecated:** `<game-audio>` is a compatibility shim. Place `<game-sample>` elements directly inside `<game-shell>` instead. `<game-audio>` will be removed in the next major version.

New code does not need this element. Each `<game-sample>` observes shell triggers itself:

```html
<game-shell>
	<game-sample trigger="pass" type="marimba" notes="523:0,659:0.08"></game-sample>
	<game-sample trigger="fail" type="noise" duration="0.04"></game-sample>
</game-shell>
```

### Compatibility Attributes

Explicit legacy attributes are forwarded to the corresponding shell signals.

| Attribute   | Shell signal | Default when omitted |
| ----------- | ------------ | -------------------- |
| `muted`     | `muted`      | Shell value unchanged |
| `volume`    | `volume`     | Shell value unchanged |
| `vibration` | `vibration`  | Shell value unchanged |

Omitted attributes do not overwrite values established by `<game-preference>`.

### Instance Methods

<dl class="def">

<dt><span class="badge method">.play(name, state?)</span></dt>
<dd>
Compatibility wrapper that finds a child <code>&lt;game-sample name="..."&gt;</code> and calls its <code>.play(state)</code> method.

```js
document.querySelector("game-audio").play("bonus");
```

</dd>

</dl>
