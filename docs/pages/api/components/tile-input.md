---
layout: doc
title: "GameTileInput"
permalink: /api/components/tile-input/
---

A Wordle-style tile input component. Renders a row of letter tiles with a blinking cursor, mirrors a hidden `<input>` element into the tiles, and dispatches events on input and submission. Supports marking tiles with visual states for guess feedback (good, close, wrong) and letter tracking (used, bad).

{% include "demo-embed.html", demo: "tile-input", title: "Tile input demo", height: "400px" %}

### Attributes

<dl class="def">

<dt><span class="badge attr">length</span></dt>
<dd>
<code>long</code> -- Number of tiles (word length). Defaults to <code>5</code>.
</dd>

<dt><span class="badge attr">disabled</span></dt>
<dd>
<code>boolean</code> -- When present, the input is disabled and tiles are dimmed. Automatically set based on game state: disabled when not in the <code>playing</code> state.
</dd>

<dt><span class="badge attr">value</span></dt>
<dd>
<code>string</code> -- Get or set the current input value. Setting the attribute updates the tile display.
</dd>

<dt><span class="badge attr">manual</span></dt>
<dd>
<code>boolean</code> -- When present, suppresses the automatic enable/disable/clear behavior driven by game state. By default the component auto-enables when the scene is <code>"playing"</code>, auto-disables otherwise, and auto-clears on each new round. Use <code>manual</code> for multi-row Wordle-style boards where you manage multiple <code>&lt;game-tile-input&gt;</code> rows yourself and want full control over state.

```html
<game-tile-input length="5" manual></game-tile-input>
```
</dd>

</dl>

### Properties

<dl class="def">

<dt><span class="badge prop">.value</span></dt>
<dd>
<code>string</code> -- The current text value. Only alphabetic characters are accepted; all others are stripped on input.
</dd>

<dt><span class="badge prop">.length</span></dt>
<dd>
<code>long</code> -- The tile count. Reflects the <code>length</code> attribute. Setting this property updates the attribute and re-renders the tiles.
</dd>

</dl>

### Methods

<dl class="def">

<dt><span class="badge method">.focus()</span></dt>
<dd>
Focus the hidden input so the player can type.
</dd>

<dt><span class="badge method">.clear()</span></dt>
<dd>
Clear the current value and reset all tiles to empty.
</dd>

<dt><span class="badge method">.mark(position, letter, state)</span></dt>
<dd>
Mark a specific letter at a specific position with a visual state. When the player types that letter at that position, the tile displays the marked class. Useful for tracking previously used letters.

**Parameters:**
- `position` -- `number` -- Tile index (0-based).
- `letter` -- `string` -- Single character.
- `state` -- `string` -- CSS class to apply: `"used"`, `"bad"`, `"good"`, `"close"`, or `"wrong"`.

```js
const input = document.querySelector("game-tile-input");

// Mark that "a" at position 2 was in a zero-scoring guess
input.mark(2, "a", "bad");

// Mark that "t" at position 0 was used before
input.mark(0, "t", "used");
```
</dd>

<dt><span class="badge method">.clearMarks()</span></dt>
<dd>
Remove all letter marks.
</dd>

<dt><span class="badge method">.setTile(index, letter, state?)</span></dt>
<dd>
Directly set a tile's display. Overrides the input value for that position. Useful for showing guess results.

**Parameters:**
- `index` -- `number` -- Tile index.
- `letter` -- `string` -- Character to display.
- `state` -- `string` *(optional)* -- CSS class: `"good"`, `"close"`, or `"wrong"`.

```js
input.setTile(0, "h", "good");
input.setTile(1, "e", "close");
input.setTile(2, "l", "wrong");
```
</dd>

<dt><span class="badge method">.showResult(letters, states)</span></dt>
<dd>
Show a full word result across all tiles at once.

**Parameters:**
- `letters` -- `string[]` -- Array of characters.
- `states` -- `string[]` -- Array of CSS class names.

```js
input.showResult(
  ["h", "e", "l", "l", "o"],
  ["good", "close", "wrong", "wrong", "good"],
);
```
</dd>

</dl>

### Events Dispatched

<dl class="def">

<dt><span class="badge event">game-tile-input</span></dt>
<dd>
Dispatched on every character change (type or delete). Carries <code>.value</code> (current string) and <code>.position</code> (index of the last changed character). Bubbles up through the DOM, so <code>&lt;game-audio&gt;</code> can use <code>trigger="input"</code> to play a click sound on each keystroke.
</dd>

<dt><span class="badge event">game-tile-submit</span></dt>
<dd>
Dispatched when the player presses Enter with a complete word (value length equals tile length). Carries <code>.value</code> (the submitted word).
</dd>

</dl>

### Tile States

Tiles can have the following CSS classes, set either automatically from input + marks or manually via `.setTile()` / `.showResult()`:

| Class | Visual | Purpose |
|---|---|---|
| `filled` | Highlighted border | Tile has a letter |
| `cursor` | Blinking teal | Current input position |
| `used` | Blue border/text | Letter was used before at this position |
| `bad` | Red border/text | Letter was in a zero-scoring guess at this position |
| `good` | Green background | Letter is correct (right position) |
| `close` | Orange background | Letter exists but in wrong position |
| `wrong` | Red background | Letter is not in the word |

### Signal Access

| Signal | Usage |
|---|---|
| Shell signals | Reads `scene` signal from the shell to auto-disable when not playing, auto-clears and focuses on new rounds |

### CSS Custom Properties

{% cem_cssprops "game-tile-input" %}

### Usage

Basic word input:

```html
<div when-some-scene="playing between paused">
  <game-tile-input length="6"></game-tile-input>
</div>
```

With click sounds on each keystroke:

```html
<game-audio>
  <game-sample trigger="input" type="noise"
    gain="0.15" duration="0.025">
  </game-sample>
</game-audio>

<div when-some-scene="playing between paused">
  <game-tile-input length="5"></game-tile-input>
</div>
```

Handling submissions:

```js
const input = document.querySelector("game-tile-input");

input.addEventListener("game-tile-submit", (e) => {
  const guess = e.value.toLowerCase();
  const result = checkGuess(guess, targetWord);

  // Show feedback on tiles
  input.showResult(
    guess.split(""),
    result.map(r => r.state), // ["good", "wrong", "close", ...]
  );

  // Mark letters for future input hints
  for (let i = 0; i < guess.length; i++) {
    if (result[i].state === "wrong") {
      input.mark(i, guess[i], "bad");
    } else {
      input.mark(i, guess[i], "used");
    }
  }
});
```
