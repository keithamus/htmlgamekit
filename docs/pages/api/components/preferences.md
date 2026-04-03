---
title: "GamePreferences"
permalink: /api/components/preferences/
cemSkip: [events]
---

A UI panel that renders controls for [`<game-preference>`]({{ site.baseurl }}/api/components/preference/) children. Uses the native `popover` API for overlay behavior and `command`/`commandfor` to open -- zero JavaScript needed for the open/close flow. Add the `popover` attribute so it works as a native popover, and give it an `id` so buttons can target it with `commandfor`.

Value ownership lives on each `<game-preference>` element. The panel renders toggle switches for boolean preferences and range sliders for numeric preferences, and delegates all value changes to the child elements. When a preference is changed externally (e.g. via `--toggle-mute`), the panel's controls stay in sync.

### Methods

<dl class="def">

<dt><span class="badge method">.get(key)</span></dt>
<dd>
Get the current value of a preference by key. Delegates to the matching <code>&lt;game-preference&gt;</code> child's <code>.value</code>.

```js
const prefs = document.querySelector("game-preferences");
const soundEnabled = prefs.get("sound"); // true or false
const volume = prefs.get("volume"); // 0-100
```

</dd>

</dl>

### Events

<dl class="def">

<dt><span class="badge event">game-preference-change</span></dt>
<dd>
Bubbles from child <code>&lt;game-preference&gt;</code> elements whenever a value changes. Carries <code>.key</code> and <code>.value</code>. Bubbles to the shell.

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

Auto-wiring is handled by each [`<game-preference>`]({{ site.baseurl }}/api/components/preference/) element, not by the panel. The following keys are auto-wired:

| Key         | Auto-Wired To           | Effect                                    |
| ----------- | ----------------------- | ----------------------------------------- |
| `sound`     | `<game-audio>`, shell   | Toggles `muted` attribute and `shell.muted` signal |
| `volume`    | `<game-audio>`          | Sets the `volume` attribute (value / 100) |
| `vibration` | `<game-audio>`          | Toggles the `vibration` attribute         |

All other keys (e.g. `dark-mode`) dispatch `game-preference-change` events for your game code to handle.

### Persistence

Persistence is handled by each `<game-preference>` element. Values are stored as a JSON object in `localStorage` under the key `{game-id}-preferences`.

### Usage

```html
<game-shell id="game" game-id="my-game">
  <div when-some-scene="intro" data-overlay>
    <h1>My Game</h1>
    <button commandfor="prefs" command="show-popover">Settings</button>
    <button commandfor="game" command="--start">Play</button>
  </div>

  <game-preferences id="prefs" popover>
    <game-preference key="sound" label="Sound" default="true">
    </game-preference>
    <game-preference
      key="vibration"
      label="Vibration"
      default="true"
    >
    </game-preference>
    <game-preference
      key="volume"
      label="Volume"
      min="0"
      max="100"
      default="80"
    >
    </game-preference>
    <game-preference
      key="dark-mode"
      label="Dark Mode"
      default="false"
    >
    </game-preference>
  </game-preferences>

  <!-- rest of game -->
</game-shell>
```

The settings button opens the preferences panel using the native `show-popover` command -- no JavaScript required.

### Standalone Preferences

Individual `<game-preference>` elements can also be placed directly inside a `<game-shell>` without a `<game-preferences>` panel. See the [standalone usage]({{ site.baseurl }}/api/components/preference/#standalone-usage) for the mute toggle pattern.
