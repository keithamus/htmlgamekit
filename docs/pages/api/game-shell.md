---
layout: doc
title: "GameShell"
permalink: /api/game-shell/
---

# GameShell

The central orchestrator for every HTMLGameKit game. `<game-shell>` manages state transitions, round tracking, scoring, director integration, and group play. All game state is exposed as TC39 `Signal.State` properties directly on the shell element. Descendant components access them via `this.shell`.

## Import

```js
import { GameShell } from "htmlgamekit";
```

## Usage

```html
<game-shell
  game-id="reaction-time"
  storage-key="reaction-v1"
  rounds="10"
  score-order="asc"
  between-delay="800"
  demo
>
  <div when-some-scene="intro" data-overlay>...</div>
  <div when-some-scene="playing between paused">...</div>
  <div when-some-scene="result" data-overlay>...</div>
</game-shell>
```

---

## Static Methods

<dl class="def">

<dt><span class="badge method">static gameScores(gameId, options?)</span></dt>
<dd>
Factory that creates a score service instance. See the <a href="{{ site.baseurl }}/scoring/">Scoring guide</a> for full details.

```js
const scores = GameShell.gameScores("my-game", {
  baseUrl: "https://scores.htmlgamekit.dev",
});
```

</dd>

<dt><span class="badge prop">static noopScores</span></dt>
<dd>
A no-op score service stub. Every method is a no-op that returns <code>null</code> or <code>false</code>. Used internally as the default when no <code>score-url</code> is configured.
</dd>

<dt><span class="badge method">static toBase64Url(buf)</span></dt>
<dd>
Encodes a <code>Uint8Array</code> or <code>ArrayBuffer</code> into a URL-safe Base64 string (no padding, <code>+/</code> replaced with <code>-_</code>). Useful for encoding game results into shareable URLs via <code>encodeResult</code>.

```js
const encoded = GameShell.toBase64Url(new Uint8Array([1, 2, 3]));
```

</dd>

<dt><span class="badge method">static fromBase64Url(str)</span></dt>
<dd>
Decodes a URL-safe Base64 string back into a <code>Uint8Array</code>. The inverse of <code>toBase64Url</code>. Useful for decoding challenge results in <code>decodeResult</code>.

```js
const bytes = GameShell.fromBase64Url(encoded);
```

</dd>

<dt><span class="badge method">static encodeUint16WithBitmask(scale?)</span></dt>
<dd>
Returns an <code>encodeResult</code> function. Packs the shell score and round pass/fail history into a compact binary URL token.

Byte layout: <code>[score:uint16be] [correct:uint8] [total:uint8] [bitmask:⌈total/8⌉bytes]</code>

Use when <code>roundScores</code> are pass/fail (0 or non-zero) and <code>score</code> is a fixed-point integer via <code>score-scale</code>. Pair with <code>decodeUint16WithBitmask</code> using the same scale.

```js
shell.encodeResult = GameShell.encodeUint16WithBitmask(100000);
shell.decodeResult = GameShell.decodeUint16WithBitmask(100000);
// Decoded: { score: number, strip: boolean[] }
```

</dd>

<dt><span class="badge method">static decodeUint16WithBitmask(scale?)</span></dt>
<dd>
Returns a <code>decodeResult</code> function matching <code>encodeUint16WithBitmask</code>. The decoded object contains <code>{ score, strip }</code> where <code>strip</code> is a boolean array of per-round pass/fail results. Returns <code>null</code> on invalid input.
</dd>

<dt><span class="badge method">static encodeUint16Array(scale?, roundCount?)</span></dt>
<dd>
Returns an <code>encodeResult</code> function. Packs the shell score and all round scores into a compact binary URL token.

Byte layout: <code>[score:uint16be] [round0:uint16be] ... [roundN:uint16be]</code>

Use when <code>roundScores</code> are continuous values (e.g. per-round reaction times stored as integers). Pair with <code>score-scale</code> so values are pre-scaled. Pass <code>roundCount</code> to lock the encoded length for games with a fixed round count.

```js
shell.encodeResult = GameShell.encodeUint16Array(1, 10);
shell.decodeResult = GameShell.decodeUint16Array(1, 10);
// Decoded: { score: number, roundScores: number[] }
```

</dd>

<dt><span class="badge method">static decodeUint16Array(scale?, roundCount?)</span></dt>
<dd>
Returns a <code>decodeResult</code> function matching <code>encodeUint16Array</code>. The decoded object contains <code>{ score, roundScores }</code>. Returns <code>null</code> on invalid input.
</dd>

</dl>

---

## Attributes

All attributes reflect as IDL properties (e.g. `game-id` reflects as `.gameIdAttr`, `score-order` as `.scoreOrderAttr`). Setting the property writes the attribute and vice versa. All attributes are reactive -- changing them via `setAttribute()` or the IDL property triggers the component to update.

<dl class="def">

<dt><span class="badge attr">game-id</span> <code>.gameIdAttr</code></dt>
<dd>
<code>string</code> -- Unique identifier for the game. Used as the key when talking to the score service and when persisting data to <code>localStorage</code>.
</dd>

<dt><span class="badge attr">sprite-sheet</span> <code>.spriteSheetAttr</code></dt>
<dd>
<code>string?</code> -- URL to an SVG sprite sheet. Mirrors to the <code>spriteSheet</code> signal, which is read by all descendant <code>&lt;game-icon&gt;</code> elements. See the <a href="{{ site.baseurl }}/api/components/icon/">Icon component</a> for details.

```html
<game-shell
  id="game"
  game-id="my-game"
  sprite-sheet="/assets/sprites.svg"
></game-shell>
```

</dd>

<dt><span class="badge attr">storage-key</span> <code>.storageKeyAttr</code></dt>
<dd>
<code>string?</code> -- Optional override for the <code>localStorage</code> key. Defaults to <code>game-id</code> if omitted. Useful when you want multiple games to share a storage namespace, or when you version your storage schema.
</dd>

<dt><span class="badge attr">rounds</span> <code>.roundsAttr</code></dt>
<dd>
<code>long</code> -- Total number of rounds in the game. The shell uses this to know when to transition from <code>playing</code> to <code>result</code>. If a progression is attached, the progression's round count takes precedence. Defaults to <code>0</code>.
</dd>

<dt><span class="badge attr">score-order</span> <code>.scoreOrderAttr</code></dt>
<dd>
<code>"asc" | "desc"</code> -- Enumerated. Sort direction for scores. Use <code>"asc"</code> when lower is better (e.g. reaction time in ms) and <code>"desc"</code> when higher is better (e.g. points). Missing and invalid values default to <code>"asc"</code>.
</dd>

<dt><span class="badge attr">between-delay</span> <code>.betweenDelayAttr</code></dt>
<dd>
<code>string</code> -- Milliseconds to stay in the <code>between</code> state between rounds, or <code>"manual"</code> to disable auto-advance (the player must dispatch a <code>game-next-round</code> event or click a <code>command="--next-round"</code> button). Defaults to <code>"500"</code>.
</dd>

<dt><span class="badge attr">demo</span> <code>.demo</code></dt>
<dd>
<code>boolean</code> -- When present, the shell enters the <code>demo</code> scene on connection instead of <code>ready</code>. Useful for showing an animated preview on the intro screen.
</dd>

<dt><span class="badge attr">score-url</span> <code>.scoreUrl</code></dt>
<dd>
<code>string?</code> -- Base URL for the score service API. When set and no scores service has been assigned programmatically, the shell automatically creates one via <code>GameShell.gameScores(gameId, { baseUrl: scoreUrl })</code>. This is the declarative alternative to setting <code>.scores</code> in JavaScript.

```html
<game-shell
  game-id="reaction-time"
  score-url="https://scores.example.com"
></game-shell>
```

</dd>

<dt><span class="badge attr">scenes</span> <code>.scenes</code></dt>
<dd>
<code>string?</code> -- Optional custom scene names recognised by the slot assignment logic, in addition to built-ins. Accepts a space- or comma-separated list.

Built-in scenes are: <code>init</code>, <code>demo</code>, <code>ready</code>, <code>practice</code>, <code>playing</code>, <code>between</code>, <code>result</code>, <code>paused</code>.

```html
<game-shell scenes="practice tutorial,review"></game-shell>
```

This lets children use <code>when-some-scene="tutorial"</code> and be slotted when your game sets <code>shell.scene.set("tutorial")</code>.

</dd>

<dt><span class="badge attr">group</span> <code>.group</code></dt>
<dd>
<code>string?</code> -- When set, the shell calls <code>initGroup()</code> during initialisation to join or create a multiplayer group. The group identifier and name are exposed via the <code>groupId</code> and <code>groupName</code> signals.
</dd>

<dt><span class="badge attr">score-scale</span> <code>.scoreScale</code></dt>
<dd>
<code>long</code> -- Integer multiplier applied to the progression's computed threshold before storing as <code>score</code>. Use when the threshold is a small float (e.g. a JND of <code>0.02</code>) and you want to store it as a compact integer (<code>0.02 × 100000 = 2000</code>). Pair with <code>shell.formatScore</code> that divides by the same scale for display. Defaults to <code>1</code>.

```html
<game-shell
  game-id="jnd-test"
  progression="staircase"
  score-scale="100000"
></game-shell>
```

</dd>

<dt><span class="badge attr">session-save</span> <code>.sessionSave</code></dt>
<dd>
<code>boolean</code> -- When present, the shell serializes game state to <code>sessionStorage</code> after every signal change during active play (<code>playing</code> and <code>between</code> states). On page load, if a session exists, the shell restores to the saved state instead of going to <code>init</code>.

The session is cleared automatically on game completion (<code>result</code>) or explicit restart. This is useful for mobile devices where the browser may kill a tab mid-game.

```html
<game-shell id="game" game-id="my-game" session-save></game-shell>
```

</dd>

</dl>

### Commands

The shell supports the <a href="https://developer.mozilla.org/en-US/docs/Web/API/Invoker_Commands_API">Invoker Commands API</a> for declarative button actions. Use <code>commandfor</code> and <code>command</code> on buttons to invoke shell methods without JavaScript:

```html
<game-shell id="game" game-id="my-game">
  <div when-some-scene="intro" data-overlay>
    <button commandfor="game" command="--start">Play</button>
  </div>
  <div when-some-scene="result" data-overlay>
    <button commandfor="game" command="--restart">Play Again</button>
  </div>
</game-shell>
```

| Command        | Action                                            |
| -------------- | ------------------------------------------------- |
| `--start`      | Calls `shell.start()` -- starts a new game        |
| `--restart`    | Calls `shell.start()` -- restarts (same as start) |
| `--practice`   | Sets `scene` signal to `"practice"`               |
| `--pause`      | Calls `shell.pause()`                             |
| `--resume`     | Calls `shell.resume()`                            |
| `--next-round` | Advances immediately when in `between`            |

Custom commands use the `--` prefix per the Invoker Commands spec. The shell requires an `id` attribute so buttons can reference it via `commandfor`.

---

## Signals

The shell exposes all game state as public `Signal.State` properties directly on the element. Descendant components access them via `this.shell`.

| Signal              | Type                      | Description                                    |
| ------------------- | ------------------------- | ---------------------------------------------- | -------------------------------------------------- |
| `scene`             | `Signal.State<string>`    | Current game scene                             |
| `round`             | `Signal.State<number>`    | Current round (1-indexed)                      |
| `rounds`            | `Signal.State<number>`    | Total rounds configured                        |
| `score`             | `Signal.State<number>`    | Accumulated score                              |
| `roundScores`       | `Signal.State<number[]>`  | Per-round scores                               |
| `roundScore`        | `Signal.Computed<number>` | Score from the most recent round               |
| `bestRoundScore`    | `Signal.Computed<number>` | Highest individual round score                 |
| `worstRoundScore`   | `Signal.Computed<number>` | Lowest individual round score                  |
| `scoreOrder`        | `Signal.State<string>`    | `"asc"` or `"desc"`                            |
| `lastRoundPassed`   | `Signal.State<boolean     | null>`                                         | Did last round pass?                               |
| `lastFeedback`      | `Signal.State<string      | null>`                                         | Feedback from last round                           |
| `passStreak`        | `Signal.State<number>`    | Current consecutive pass streak                |
| `failStreak`        | `Signal.State<number>`    | Current consecutive fail streak                |
| `peakPassStreak`    | `Signal.State<number>`    | Highest pass streak reached this game          |
| `peakFailStreak`    | `Signal.State<number>`    | Highest fail streak reached this game          |
| `difficulty`        | `Signal.State<object>`    | Current difficulty from director               |
| `stats`             | `Signal.State<object>`    | Arbitrary stats map                            |
| `storageKey`        | `Signal.State<string>`    | localStorage key                               |
| `gameId`            | `Signal.State<string>`    | Game identifier                                |
| `betweenDelay`      | `Signal.State<number>`    | Ms between rounds                              |
| `encodedResult`     | `Signal.State<string      | null>`                                         | Encoded result for sharing                         |
| `groupId`           | `Signal.State<string      | null>`                                         | Group identifier                                   |
| `groupName`         | `Signal.State<string      | null>`                                         | Group display name                                 |
| `challenge`         | `Signal.State<object      | null>`                                         | Challenge data                                     |
| `formatScoreSignal` | `Signal.State<function    | null>`                                         | Score formatting function (set via `.formatScore`) |
| `spriteSheet`       | `Signal.State<string>`    | Sprite sheet URL from `sprite-sheet` attribute |

Components access these via `effectCallback`:

```js
effectCallback({ scene, score }) {
  // re-runs whenever scene or score changes
}
```

---

## Properties

<dl class="def">

<dt><span class="badge prop">.scores</span></dt>
<dd>
<code>get | set</code> -- Get or set the scores service instance. Typically created by <code>gameScores()</code>.

```js
shell.scores = gameScores("reaction-time", { baseUrl: "/api" });
```

</dd>

<dt><span class="badge prop">.progressionSet</span></dt>
<dd>
<code>get | set</code> -- Get or set the progression object that controls round difficulty and progression. Accepts any object implementing the <a href="/api/progressions/">Director interface</a>. Note: this is distinct from the <code>progression</code> IDL property, which reflects the <code>progression</code> string attribute (e.g. <code>"fixed"</code>, <code>"staircase"</code>).

```js
shell.progressionSet = new StaircaseProgression({ levels: 8 });
```

</dd>

<dt><span class="badge prop">.encodeResult</span></dt>
<dd>
<code>set</code> <em>(function)</em> -- Assign a function <code>(state) => string</code> to encode the final game result into a compact string for sharing or storage. The <code>state</code> argument is a plain snapshot object.

```js
shell.encodeResult = (state) =>
  GameShell.toBase64Url(new Uint8Array(state.scores));
```

</dd>

<dt><span class="badge prop">.decodeResult</span></dt>
<dd>
<code>set</code> <em>(function)</em> -- Assign a function <code>(encoded) => object</code> to decode a previously encoded result string back into a result object.

```js
shell.decodeResult = (str) => ({ scores: GameShell.fromBase64Url(str) });
```

</dd>

<dt><span class="badge prop">.formatScore</span></dt>
<dd>
<code>set</code> <em>(function)</em> -- Assign a function <code>(score) => string</code> to format raw numeric scores for display throughout the UI. This sets the <code>formatScoreSignal</code> signal internally, so all components that read it will react.

```js
shell.formatScore = (ms) => `${ms}ms`;
```

</dd>

<dt><span class="badge prop">.gameUrl</span></dt>
<dd>
<code>get</code> <em>(string)</em> -- The current page URL without query string (<code>location.origin + location.pathname</code>). Used by <code>&lt;game-share&gt;</code> to build shareable links.
</dd>

<dt><span class="badge prop">.gameTitle</span></dt>
<dd>
<code>get</code> <em>(string)</em> -- The game title, resolved from the first <code>&lt;h1&gt;</code> inside an intro overlay (<code>[when-some-scene~=intro]</code> or <code>[when-some-scene~=init]</code>), falling back to <code>document.title</code>. Used by <code>&lt;game-share&gt;</code>.
</dd>

<dt><span class="badge prop">.trophyCount</span></dt>
<dd>
<code>get</code> <em>(number)</em> -- The number of trophies unlocked this session. Equivalent to reading <code>trophyCount</code> from the <code>when-*</code> condition system or <code>&lt;game-signal key="trophyCount"&gt;</code>.
</dd>

<dt><span class="badge method">.isTrophyUnlocked(id)</span></dt>
<dd>
Returns <code>true</code> if the trophy with the given <code>id</code> has been unlocked. Used internally by the condition system for <code>when-some-trophy</code> / <code>when-no-trophy</code>.

```js
if (shell.isTrophyUnlocked("hat-trick")) {
  /* ... */
}
```

</dd>

</dl>

---

## Methods

<dl class="def">

<dt><span class="badge method">.start()</span></dt>
<dd>
Begins the game. Resets round counters and scores, initializes the progression (if any), sets <code>scene</code> to <code>"playing"</code>, and fires a <code>game-lifecycle</code> event.

```js
shell.start();
```

</dd>

<dt><span class="badge method">.pause()</span></dt>
<dd>
Pauses the game if currently playing. Sets <code>scene</code> to <code>"paused"</code>.
</dd>

<dt><span class="badge method">.resume()</span></dt>
<dd>
Resumes a paused game. Sets <code>scene</code> back to <code>"playing"</code>.
</dd>

<dt><span class="badge method">static define(tag?, registry?)</span></dt>
<dd>
Registers the custom element. Call without arguments to register as <code>&lt;game-shell&gt;</code>, or pass a custom tag name and/or a <code>CustomElementRegistry</code>.

```js
GameShell.define(); // <game-shell>
GameShell.define("my-shell"); // <my-shell>
GameShell.define("my-shell", registry); // scoped registry
```

</dd>

</dl>

---

## Events Caught

The shell listens for the following events bubbling up from descendant components:

| Event                  | Trigger                                   | Effect                                                                                              |
| ---------------------- | ----------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `game-round-pass`      | A round was completed successfully        | Records the score, advances the round counter, transitions to `between` then next round or `result` |
| `game-round-fail`      | A round was failed                        | If `retry` is false, consumes a round. Optionally records a penalty.                                |
| `game-timer-expired`   | The round timer ran out                   | Equivalent to a fail with no retry -- ends the current round                                        |
| `game-stat-update`     | A child wants to update a stat            | Merges `{ key: value }` into the `stats` signal                                                     |
| `game-start-request`   | User clicked a start button               | Calls `.start()`                                                                                    |
| `game-restart-request` | User clicked a restart button             | Resets state and calls `.start()`                                                                   |
| `game-practice-start`  | User entered practice mode                | Sets `scene` signal to `"practice"`                                                                 |
| `game-complete`        | Game mechanics signal completion directly | Sets `scene` to `"result"`, optionally records a final score                                        |
| `game-pause-request`   | A child requests a pause                  | Calls `.pause()`                                                                                    |
| `game-resume-request`  | A child requests a resume                 | Calls `.resume()`                                                                                   |
| `game-next-round`      | A child requests immediate round advance  | Advances to the next round immediately when in `between`                                            |
| `game-trophy-unlock`   | A `<game-trophy>` was unlocked            | Records the trophy id in the shell's internal set and persists to localStorage                      |

---

## Events Fired

<dl class="def">

<dt><span class="badge event">game-lifecycle</span></dt>
<dd>
Fired on every scene transition. The event is a <code>GameLifecycleEvent</code> with <code>.action</code> (the new scene name), <code>.state</code> (a plain snapshot object), and <code>.scene</code> (the current scene name).

```js
shell.addEventListener("game-lifecycle", (e) => {
  console.log(e.action, e.state.scene);
});
```

</dd>

</dl>

---

## CSS Custom States

The shell mirrors the current scene as a [CSS custom state](https://developer.mozilla.org/en-US/docs/Web/API/CustomStateSet) via `ElementInternals`. This lets you style the shell (or elements below it) based on the active scene using the `:state()` pseudo-class:

| State              | Active when         |
| ------------------ | ------------------- |
| `:state(init)`     | Scene is `init`     |
| `:state(demo)`     | Scene is `demo`     |
| `:state(ready)`    | Scene is `ready`    |
| `:state(practice)` | Scene is `practice` |
| `:state(playing)`  | Scene is `playing`  |
| `:state(between)`  | Scene is `between`  |
| `:state(paused)`   | Scene is `paused`   |
| `:state(result)`   | Scene is `result`   |

Custom scenes added via the `scenes` attribute also get corresponding custom states.

```css
game-shell:state(playing) {
  --game-bg: #1a1a2e;
}

game-shell:state(result) {
  --game-bg: #0f3460;
}
```

---

## Context Provided

The shell does not use the [Context Protocol](/api/context/) for any of its own data. All game state — including the sprite sheet URL — is exposed as `Signal.State` properties directly on the element, accessible via `this.shell`.

The Context Protocol is still available for custom components that need to distribute their own data to descendants. See the [Context Protocol reference](/api/context/) for when to use it.

---

## Scene Visibility (Slot Assignment)

The shell creates a shadow root with `slotAssignment: "manual"` containing a
single `<slot>`. When the `scene` signal changes, the shell assigns matching
children to the slot. Unassigned children are not rendered.

Children declare which scenes they belong to via `when-some-scene`:

| Value                      | Visible during          |
| -------------------------- | ----------------------- |
| `"intro"`                  | `init`, `demo`, `ready` |
| `"playing"`                | `playing`               |
| `"playing between paused"` | Any of those three      |
| `"result"`                 | `result`                |
| _(no `when-some-scene`)_   | Always visible          |

```html
<game-shell id="game" ...>
  <div when-some-scene="intro" data-overlay>
    <h1>Welcome!</h1>
    <button commandfor="game" command="--start" autofocus>Play</button>
  </div>

  <div when-some-scene="playing between paused" data-hud>
    <game-round-counter></game-round-counter>
  </div>

  <game-timer
    when-some-scene="playing between paused"
    duration="10"
  ></game-timer>
  <game-toast when-some-scene="playing between paused" trigger="pass"
    >Nice!</game-toast
  >

  <div when-some-scene="playing between demo practice paused">
    <my-game></my-game>
  </div>

  <div when-some-scene="result" data-overlay>
    <game-result-stat label="Score"></game-result-stat>
    <button commandfor="game" command="--restart" autofocus>Again</button>
  </div>

  <!-- No when-* attrs: always slotted -->
  <game-audio>...</game-audio>
</game-shell>
```

When a `when-some-scene` element with `[autofocus]` becomes visible, the shell
focuses that element automatically.

### Why `when-some-scene` instead of `slot`?

The shell uses manual slot assignment internally, so `slot` would be a natural
fit. But `slot` is a single token in the platform spec -- it names one
`<slot>` element. `when-some-scene` is a space-separated list
(`"playing between paused"`), which `slot` doesn't support. Overloading `slot`
with multi-value semantics would conflict with its platform meaning and
confuse anyone who knows how shadow DOM slotting works.

---

## The `data-overlay` Attribute

A boolean attribute that opts a `<div>` into fixed-position overlay styling
(centred layout, backdrop blur, safe-area padding). It does **not** control
visibility -- that is handled by `when-some-scene`.

The styling comes from `game-base.css`:

| Property            | Default              | Description                 |
| ------------------- | -------------------- | --------------------------- |
| `--game-overlay-bg` | `rgba(0, 0, 0, 0.8)` | Overlay background          |
| `--game-text`       | `#eee`               | Text colour inside overlays |

Content inside `[data-overlay]` gets default typographic styling from
`game-base.css`: headings, paragraphs, buttons, links. Games can override
these freely.
