---
layout: doc
title: "GameTrophy"
permalink: /api/components/trophy/
---

A declarative achievement tile. Place `<game-trophy>` elements anywhere in the game layout -- typically grouped together on the result screen or in a persistent HUD area. Each trophy manages its own locked/unlocked visual state and integrates with the shell's trophy tracking.

Icons are rendered using [`<game-icon>`]({{ site.baseurl }}/api/components/icon/), which reads the sprite sheet URL from the shell's `spriteSheet` signal (set via the `sprite-sheet` attribute).

### Attributes

<dl class="def">

<dt><span class="badge attr">id</span></dt>
<dd>
<code>string</code> -- Unique trophy identifier. Used for persistence and for condition lookups via <code>when-some-trophy="id"</code>.
</dd>

<dt><span class="badge attr">name</span></dt>
<dd>
<code>string</code> -- Display name shown below the icon.
</dd>

<dt><span class="badge attr">icon</span></dt>
<dd>
<code>string</code> -- Icon name. Renders a <a href="{{ site.baseurl }}/api/components/icon/"><code>&lt;game-icon name="..."&gt;</code></a> element, which reads the sprite sheet URL from <code>shell.spriteSheet</code>.
</dd>

<dt><span class="badge attr">description</span></dt>
<dd>
<code>string</code> -- Tooltip text shown when the trophy is tapped.
</dd>

<dt><span class="badge attr">when-*</span></dt>
<dd>
Any <a href="{{ site.baseurl }}/api/conditions/">condition attribute</a> for auto-unlock. The trophy is automatically unlocked when all conditions pass on entering the <code>result</code> state.

```html
<game-trophy id="scorer" name="Scorer" icon="star"
  when-min-score="10" description="Score 10 or more">
</game-trophy>

<game-trophy id="hat-trick" name="Hat Trick" icon="fire"
  when-min-streak="3" description="Get 3 correct in a row">
</game-trophy>
<!-- Note: "streak" resolves via the stats map. It must be kept up to date
     via GameStatUpdateEvent("streak", n). <game-quiz> does this automatically.
     For custom games, dispatch the event yourself: -->
<!-- this.dispatchEvent(new GameStatUpdateEvent("streak", currentStreak)) -->

<game-trophy id="collector" name="Collector" icon="chest"
  when-min-trophy-count="5" description="Unlock 5 other trophies">
</game-trophy>
```
</dd>

</dl>

### Properties

<dl class="def">

<dt><span class="badge prop">.unlocked</span></dt>
<dd>
<code>boolean</code> -- <code>true</code> if the trophy has been unlocked.
</dd>

<dt><span class="badge prop">.trophyId</span></dt>
<dd>
<code>string</code> -- The element's <code>id</code> attribute.
</dd>

</dl>

### Methods

<dl class="def">

<dt><span class="badge method">.unlock()</span></dt>
<dd>
Unlock this trophy. Idempotent -- calling it on an already-unlocked trophy is a no-op. Registers the unlock with the shell (updating <code>shell.trophyCount</code> and <code>shell.isTrophyUnlocked()</code>), persists to localStorage, and dispatches a <code>game-trophy-unlock</code> event.
</dd>

</dl>

### Events Dispatched

<dl class="def">

<dt><span class="badge event">game-trophy-unlock</span></dt>
<dd>
Dispatched when the trophy is unlocked. Bubbles to the shell. Carries <code>.trophyId</code> and <code>.trophyName</code>.

```js
shell.addEventListener("game-trophy-unlock", (e) => {
  console.log(`Unlocked: ${e.trophyName} (${e.trophyId})`);
});
```
</dd>

</dl>

### Auto-Unlock

Trophies with [condition attributes]({{ site.baseurl }}/api/conditions/) are checked automatically when the game enters the `result` state. Any trophy whose conditions all pass is unlocked via `.unlock()`.

### Tooltip

Clicking or tapping a trophy shows its `description` in a tooltip for 1.8 seconds.

### Persistence

Unlocked trophy IDs are stored as a JSON array in `localStorage` under the key `{storage-key}-trophies`. On connect, if the shell has the trophy registered as already unlocked, the visual state is restored immediately.

### Signal Access

| Signal | Usage |
|---|---|
| `shell.scene` | Watches for `"result"` to trigger auto-unlock checks |
| `shell.score`, `shell.round`, `shell.stats`, `shell.difficulty`, etc. | Read by `matchesConditions()` for `when-*` auto-unlock conditions |

### CSS Custom Properties

| Property | Default | Description |
|---|---|---|
| `--game-trophy-color` | `#fbbf24` | Icon color for unlocked trophies |

### Usage

```html
<div when-some-scene="result" data-overlay>
  <game-result-stat label="Score"></game-result-stat>

  <div style="display: flex; gap: 8px; justify-content: center;">
    <game-trophy id="scorer" name="Scorer" icon="star"
      when-min-score="10" description="Score 10 or more">
    </game-trophy>

    <game-trophy id="hat-trick" name="Hat Trick" icon="fire"
      when-min-streak="3" description="Get 3 correct in a row">
    </game-trophy>

    <game-trophy id="speed-demon" name="Speed Demon" icon="bolt"
      description="Complete the game in under 10 seconds">
    </game-trophy>
  </div>

  <button commandfor="game" command="--restart">Play Again</button>
</div>
```

The `speed-demon` trophy has no auto-unlock condition, so it must be unlocked programmatically:

```js
shell.addEventListener("game-lifecycle", (e) => {
  if (e.action === "result") {
    const totalTime = e.state.roundScores.reduce((a, b) => a + b, 0);
    if (totalTime < 10000) {
      document.querySelector("game-trophy#speed-demon").unlock();
    }
  }
});
```
