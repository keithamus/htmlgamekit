---
title: "GamePreference"
permalink: /api/components/preference/
cemSkip: [attrs]
---

A self-sufficient preference element. Owns its current value, persists to `localStorage`, and auto-wires hardwired audio keys. Works standalone anywhere inside a `<game-shell>`, or as a child of [`<game-preferences>`]({{ site.baseurl }}/api/components/preferences/) for a full settings panel.

Boolean preferences have `default="true"` or `default="false"`. Numeric preferences have a numeric `default` plus `min`/`max`. The type is inferred from the `default` attribute -- there is no `type` attribute.

### Attributes

<dl class="def">

<dt><span class="badge attr">key</span></dt>
<dd>
<code>string</code> -- The preference key, used for persistence, auto-wiring, and <code>.get(key)</code> on the parent panel.
</dd>

<dt><span class="badge attr">label</span></dt>
<dd>
<code>string</code> -- Display label shown next to the input when inside a <code>&lt;game-preferences&gt;</code> panel.
</dd>

<dt><span class="badge attr">default</span></dt>
<dd>
<code>string</code> -- Default value. <code>"true"</code> or <code>"false"</code> for boolean preferences, a numeric string for range preferences. Determines the value type and the initial value before any persisted value is loaded.
</dd>

<dt><span class="badge attr">min</span></dt>
<dd>
<code>string</code> -- Minimum value for numeric preferences. Default: <code>"0"</code>.
</dd>

<dt><span class="badge attr">max</span></dt>
<dd>
<code>string</code> -- Maximum value for numeric preferences. Default: <code>"100"</code>.
</dd>

</dl>

### Properties

<dl class="def">

<dt><span class="badge prop">.value</span></dt>
<dd>
<code>get</code> -- The current value. Returns <code>boolean</code> for boolean preferences, <code>number</code> for numeric, or <code>string</code> otherwise. Before connection, returns the parsed default.
</dd>

<dt><span class="badge prop">.boolean</span></dt>
<dd>
<code>get</code> -- <code>true</code> if the <code>default</code> attribute is <code>"true"</code> or <code>"false"</code>, indicating a boolean preference.
</dd>

</dl>

### Methods

<dl class="def">

<dt><span class="badge method">.set(value)</span></dt>
<dd>
Set the preference value. Persists to <code>localStorage</code>, applies auto-wiring (see below), and dispatches a <code>game-preference-change</code> event.

```js
const pref = document.querySelector('game-preference[key="sound"]');
pref.set(false); // mute
```

</dd>

<dt><span class="badge method">.toggle()</span></dt>
<dd>
For boolean preferences, flips the current value. Equivalent to <code>pref.set(!pref.value)</code>. No-op for non-boolean preferences.

```js
pref.toggle(); // true -> false, or false -> true
```

</dd>

</dl>

### Auto-Wiring

The following preference keys are auto-wired to built-in components when the value changes or when the element connects:

| Key         | Auto-Wired To           | Effect                                    |
| ----------- | ----------------------- | ----------------------------------------- |
| `sound`     | `<game-audio>`, shell   | Toggles `<game-audio>` `muted` attribute and sets `shell.muted` signal |
| `volume`    | `<game-audio>`          | Sets the `volume` attribute (value / 100) |
| `vibration` | `<game-audio>`          | Toggles the `vibration` attribute         |

### Persistence

Preferences are stored as a JSON object in `localStorage` under the key `{game-id}-preferences`, where `game-id` comes from the nearest shell's `game-id` attribute (falling back to `storage-key`). On connection, the stored value is loaded and applied.

### Events Dispatched

<dl class="def">

<dt><span class="badge event">game-preference-change</span></dt>
<dd>
Dispatched from the preference element whenever <code>.set()</code> or <code>.toggle()</code> is called. Carries <code>.key</code> and <code>.value</code>. Bubbles to the shell (<code>composed: true</code>).
</dd>

</dl>

### Standalone Usage

A `<game-preference>` can be placed directly inside a `<game-shell>` without a `<game-preferences>` parent. This is useful for a mute toggle that lives outside the settings panel:

```html
<game-shell id="game" game-id="my-game" sprite-sheet="/icons.svg">
  <game-preference key="sound" default="true"></game-preference>
  <button commandfor="game" command="--toggle-mute" aria-label="Toggle sound">
    <game-icon name="volume-2">
      <option when-some-muted value="volume-x"></option>
    </game-icon>
  </button>
  <!-- rest of game -->
</game-shell>
```

The shell's `--toggle-mute` command finds the `<game-preference key="sound">` and calls `.toggle()`.

### Inside a Preferences Panel

When placed inside `<game-preferences>`, the parent renders a toggle switch or range slider based on `.boolean` and delegates value changes to the child element. See [`<game-preferences>`]({{ site.baseurl }}/api/components/preferences/).

### CSS Custom Properties

When inside `<game-preferences>`, the panel uses `--game-btn-bg`, `--game-btn-text`, `--game-text`, and `--game-accent` for styling.
