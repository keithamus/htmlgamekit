---
layout: doc
title: "GamePreferences"
permalink: /api/components/preferences/
---

A declarative preferences panel for common game settings. Uses the native `popover` API for overlay behavior and `command`/`commandfor` to open -- zero JavaScript needed for the open/close flow.

---

## GamePreferences

The container element. Add the `popover` attribute so it works as a native popover, and give it an `id` so buttons can target it with `commandfor`.

### Methods

<dl class="def">

<dt><span class="badge method">.get(key)</span></dt>
<dd>
Get the current value of a preference by key.

```js
const prefs = document.querySelector("game-preferences");
const soundEnabled = prefs.get("sound"); // true or false
const volume = prefs.get("volume");       // 0-100
```
</dd>

</dl>

### Events Dispatched

<dl class="def">

<dt><span class="badge event">game-preference-change</span></dt>
<dd>
Dispatched whenever a preference value changes. Carries <code>.key</code> and <code>.value</code>. Bubbles to the shell.

```js
shell.addEventListener("game-preference-change", (e) => {
  if (e.key === "dark-mode") {
    document.body.classList.toggle("dark", e.value);
  }
});
```
</dd>

</dl>

### Auto-Wiring

The following preference keys are auto-wired to built-in components:

| Key | Auto-Wired To | Effect |
|---|---|---|
| `sound` | `<game-audio>` | Toggles the `muted` attribute |
| `volume` | `<game-audio>` | Sets the `volume` attribute (value / 100) |
| `vibration` | `<game-audio>` | Toggles the `vibration` attribute |

All other keys (e.g. `dark-mode`) dispatch `game-preference-change` events for your game code to handle.

### Persistence

Preferences are stored as a JSON object in `localStorage` under the key `{game-id}-preferences`, where `game-id` comes from the shell's `game-id` attribute. If `game-id` is absent, falls back to `storage-key`. Loaded on connection.

### Context Subscriptions

None -- preferences are independent of game state.

---

## GamePreference

Defines a single preference. Place inside `<game-preferences>`.

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

### Usage

```html
<game-shell id="game" game-id="my-game">
  <div when-some-scene="intro" data-overlay>
    <h1>My Game</h1>
    <button commandfor="prefs" command="show-popover">Settings</button>
    <button commandfor="game" command="--start">Play</button>
  </div>

  <game-preferences id="prefs" popover>
    <game-preference type="toggle" key="sound"
      label="Sound" default="true">
    </game-preference>
    <game-preference type="toggle" key="vibration"
      label="Vibration" default="true">
    </game-preference>
    <game-preference type="range" key="volume"
      label="Volume" min="0" max="100" default="80">
    </game-preference>
    <game-preference type="toggle" key="dark-mode"
      label="Dark Mode" default="false">
    </game-preference>
  </game-preferences>

  <!-- rest of game -->
</game-shell>
```

The settings button opens the preferences panel using the native `show-popover` command -- no JavaScript required. The "Done" button inside the panel closes it.

### Touch Isolation

Range slider inputs have `touchstart`, `touchmove`, and `touchend` event propagation stopped, so dragging a volume slider on mobile does not trigger game input underneath.

### CSS Custom Properties

The panel uses the same `--game-btn-bg`, `--game-btn-text`, `--game-text`, and `--game-accent` custom properties as the rest of the framework.
