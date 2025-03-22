---
title: "GamePreference"
permalink: /api/components/preference/
cemSkip: [attrs]
---

Defines a single preference. Place inside [`<game-preferences>`]({{ site.baseurl }}/api/components/preferences/).

### Attributes

<dl class="def">

<dt><span class="badge attr">type</span></dt>
<dd>
<code>"toggle" | "range"</code> -- The input type.

- `toggle` -- A switch (on/off). Value is `boolean`.
- `range` -- A slider. Value is `number`.
</dd>

<dt><span class="badge attr">key</span></dt>
<dd>
<code>string</code> -- The preference key, used for persistence and <code>.get(key)</code>.
</dd>

<dt><span class="badge attr">label</span></dt>
<dd>
<code>string</code> -- Display label shown next to the input.
</dd>

<dt><span class="badge attr">default</span></dt>
<dd>
<code>string</code> -- Default value. For toggles: <code>"true"</code> or <code>"false"</code>. For ranges: a number string.
</dd>

<dt><span class="badge attr">min</span></dt>
<dd>
<code>number</code> -- Minimum value for range inputs. Default: <code>0</code>.
</dd>

<dt><span class="badge attr">max</span></dt>
<dd>
<code>number</code> -- Maximum value for range inputs. Default: <code>100</code>.
</dd>

</dl>

### Touch Isolation

Range slider inputs have `touchstart`, `touchmove`, and `touchend` event propagation stopped, so dragging a volume slider on mobile does not trigger game input underneath.

### CSS Custom Properties

The panel uses the same `--game-btn-bg`, `--game-btn-text`, `--game-text`, and `--game-accent` custom properties as the rest of the framework.
