---
layout: doc
title: "Tutorial: Noughts & Crosses"
permalink: /tutorials/noughts-and-crosses/
---

In this tutorial you will build a two-player noughts and crosses (tic-tac-toe)
game using `<game-lobby>` for WebSocket-based matchmaking and `<game-peer-connection>`
for WebRTC peer-to-peer communication. Players can find opponents via the
matchmaking queue or share a private room code with a friend.

By the end you will understand how to **connect players via a signalling
server**, how to **exchange moves over a WebRTC DataChannel**, and how to
**drive the whole lobby UI from lobby state** without writing overlay
plumbing by hand.

<a href="{{ site.baseurl }}/examples/noughts-and-crosses/" class="tutorial-demo-link">Play the finished game</a>

## Step 1: The HTML Shell

Noughts and crosses is a single round: one game, one result. Set `rounds="1"`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Noughts &amp; Crosses</title>
    <link rel="stylesheet" href="path/to/htmlgamekit/src/game-base.css" />
  </head>
  <body>
    <game-shell
      id="game"
      game-id="noughts-and-crosses"
      rounds="1"
      between-delay="0"
    >
    </game-shell>

    <script type="module" src="noughts-and-crosses.js"></script>
  </body>
</html>
```

## Step 2: Adding the Multiplayer Elements

Add `<game-lobby>` and `<game-peer-connection>` as children of the shell. The lobby
connects to the signalling server; the match handles the WebRTC peer
connection.

```html
<game-shell
  id="game"
  game-id="noughts-and-crosses"
  rounds="1"
  between-delay="0"
>
  <game-lobby id="lobby" reconnect auto-ready></game-lobby>
  <game-peer-connection id="match" auto-ready></game-peer-connection>
</game-shell>
```

- **`reconnect`** — automatically reconnects if the WebSocket drops.
  `url` defaults to the public signalling server; omit it unless you're
  self-hosting. `<game-lobby>` reads `game-id` from the parent shell, so
  matchmaking is automatically scoped to your game.
- **`auto-ready` on the lobby** — accepts a queue match as soon as one is
  found, so queued players do not need a second confirmation step.
- **`auto-ready` on the match** — signals readiness the moment both
  DataChannels open. Once both peers are ready the match fires
  `game-start-request`, and the shell calls `.start()` for you. That is the
  whole "start the game" wiring: no JavaScript required.

The lobby pushes its state into shell stats (`lobby-state`, `player-count`,
`room-code`, `queue-position`, `player-id`), and the match adds `peer-state`,
`peer-id` and `latency`. Both republish their stats when the shell wipes
stats on `start()`, so they stay readable during play:

```html
<div class="hud">
  <span>ping <game-signal key="latency"></game-signal>ms</span>
</div>
```

## Step 3: Intro Overlays

The intro scene needs four states: the main lobby menu, a waiting-room view
(when in a private room), a queue view, and a "connecting" view while WebRTC
negotiates. `lobby-state` is a shell stat, so `when-*` conditions can select
between them directly — one overlay is slotted in at a time and no JavaScript
toggles anything:

```html
<!-- Main lobby menu: connected, but not in a room or queue -->
<div
  when-some-scene="intro"
  when-no-lobby-state="in-room in-queue signalling"
  data-overlay
>
  <hgroup>
    <h1>Noughts &amp; Crosses</h1>
    <p>Two players, one board.</p>
  </hgroup>
  <div class="lobby-controls">
    <button commandfor="lobby" command="--join-queue">Find a game</button>
    <button commandfor="lobby" command="--create-room">
      Create private room
    </button>
    <form id="form-join">
      <input
        id="input-code"
        type="text"
        maxlength="8"
        placeholder="Room code"
      />
      <button type="submit">Join room</button>
    </form>
  </div>
</div>

<!-- Waiting in a private room -->
<div when-some-scene="intro" when-eq-lobby-state="in-room" data-overlay>
  <h1>Waiting for opponent</h1>
  <p data-room-code><game-signal key="room-code"></game-signal></p>
  <p>Share this code with a friend.</p>
  <button commandfor="lobby" command="--lobby-ready">Ready</button>
  <button commandfor="lobby" command="--leave-room">Cancel</button>
</div>

<!-- In the matchmaking queue -->
<div when-some-scene="intro" when-eq-lobby-state="in-queue" data-overlay>
  <h1>Finding a game...</h1>
  <button commandfor="lobby" command="--leave-queue">Cancel</button>
</div>

<!-- Peers found each other, WebRTC is negotiating -->
<div when-some-scene="intro" when-eq-lobby-state="signalling" data-overlay>
  <h1>Connecting...</h1>
</div>
```

`when-no-lobby-state="in-room in-queue signalling"` reads as "the lobby state
is none of these", which covers `connecting`, `connected` and `disconnected`
with one element instead of three copies of the menu.

### `when-*` vs `data-overlay`

- **`when-*`** controls which elements the shell assigns to its slot. An
  element with no `when-*` attribute is always visible; otherwise every
  condition on it must hold.
- **`data-overlay`** is purely cosmetic — it positions the element as a
  full-screen layer with a backdrop. It has no effect on visibility logic,
  and because it sets `display: flex` it also **overrides the `hidden`
  attribute**. Select overlays with `when-*`, never with `hidden`.

## Step 4: Lobby Buttons

The buttons above use the native Invoker Commands API, so `<game-lobby>`
handles them itself. The full set is `--create-room`, `--join-room`,
`--leave-room`, `--join-queue`, `--leave-queue`, `--lobby-ready`,
`--lobby-unready` and `--set-preference`. `--join-room`, `--join-queue` and
`--set-preference` read the button's `value`.

Only the join-by-code form needs JavaScript, because the room code comes from
a text input rather than a button:

```js
const shell = document.querySelector("game-shell");
const lobby = document.querySelector("#lobby");

document.querySelector("#form-join").addEventListener("submit", (e) => {
  e.preventDefault();
  const code = document.querySelector("#input-code").value.trim().toUpperCase();
  if (code) lobby.joinRoom(code);
});
```

The same methods back both routes: `joinQueue()`, `leaveQueue()`,
`createRoom()`, `joinRoom(code)`, `leaveRoom()`, `ready()`, `unready()` and
`setPreference(pref)`. Lobby events (`game-lobby-room`, `game-lobby-queue`,
`game-lobby-error`, ...) bubble through the shell, so listen there when you
want to react in JavaScript — for example to show a server error:

```js
shell.addEventListener("game-lobby-error", (e) => {
  document.querySelector("[data-error]").textContent = e.message;
});
```

### Reacting to lobby and match state in CSS

Both elements expose their state as custom states, so purely visual reactions
need no JavaScript either. They sit before the overlays in the shell, so a
sibling selector reaches them:

```css
game-lobby:not(:state(connected)) ~ [data-overlay] button {
  opacity: 0.4;
  pointer-events: none;
}
```

## Step 5: The Game Board Component

Create `noughts-and-crosses.js`. The component manages the 3×3 grid and
communicates moves over the DataChannel:

```js
import {
  defineAll,
  GameComponent,
  GameRoundPassEvent,
  GameRoundFailEvent,
  GameStatUpdateEvent,
} from "htmlgamekit";

defineAll();

const WIN_LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

class NoughtsAndCrosses extends GameComponent {
  static template = null;

  static define(tag = "noughts-and-crosses", registry = customElements) {
    super.define(tag, registry);
  }

  #cells = Array(9).fill(null);
  #mySymbol = null;
  #myTurn = false;
  #done = false;

  get #match() {
    return this.shell?.querySelector("game-peer-connection");
  }
  get #buttons() {
    return this.querySelectorAll("ol button");
  }
  get #status() {
    return this.querySelector("[data-status]");
  }
}
```

`static template = null` skips shadow DOM — the component renders directly
into its light DOM. Private getters look DOM references up on demand instead
of caching them, so rebuilding the board never leaves a stale field behind.

## Step 6: connectedCallback and effectCallback

Call `super.connectedCallback()` first, then build the DOM and register
listeners. `<game-peer-connection>` is a **sibling**, so its events do not
reach the board by themselves — listen on the shell, which they bubble
through:

```js
connectedCallback() {
  super.connectedCallback();

  this.innerHTML = `<ol></ol><p data-status></p>`;
  this.#buildBoard();

  this.shell.addEventListener(
    "game-peer-connection-open",
    (e) => this.#onMatchOpen(e.peerId),
    { signal: this.signal },
  );
  this.shell.addEventListener(
    "game-peer-connection-close",
    (e) => this.#onMatchClose(e),
    { signal: this.signal },
  );
  this.shell.addEventListener(
    "game-peer-connection-message",
    (e) => this.#onMessage(e),
    { signal: this.signal },
  );
}

effectCallback({ scene }) {
  if (scene.get() !== "playing") return;
  this.#reset();
  if (this.#mySymbol) this.#beginGame();
}
```

`this.signal` ensures event listeners are removed when the element
disconnects.

`effectCallback` runs inside a reactive effect, so **every signal it reads
becomes a dependency**. Reading only `scene` keeps it to one dependency: the
symbols are captured in `#onMatchOpen` (an ordinary event listener) rather
than read from the connection here. Keep effect bodies to the signals you
actually want to react to.

## Step 7: Assigning Symbols

When `game-peer-connection-open` fires, both peers know each other's IDs. Sort them
lexicographically: the lower ID plays X and goes first. Both peers
independently reach the same conclusion — no coordination needed.

The connection opens before the first game starts and stays open across a
rematch, so the symbol is stored once and the per-game setup is separate:

```js
#onMatchOpen(peerId) {
  const myId = this.#match?.localPlayerId;
  if (!myId || !peerId) return;

  this.#mySymbol = myId < peerId ? "X" : "O";
  if (this.shell.scene.get() === "playing") this.#beginGame();
}

#beginGame() {
  this.#myTurn = this.#mySymbol === "X";
  this.#done = false;

  this.dispatchEvent(new GameStatUpdateEvent("symbol", this.#mySymbol));
  this.#setStatus(
    this.#myTurn ? `Your turn (${this.#mySymbol})` : "Opponent's turn",
  );
  this.#updateButtons();
}
```

`e.peerId` is the remote player's ID, set by `GamePeerConnectionOpenEvent`.
`match.localPlayerId` reads the ID assigned by the signalling server.
`#beginGame` runs on both entry orders — connection first, or scene first —
whichever happens last.

## Step 8: Sending and Receiving Moves

When the local player clicks a cell, send the cell index to the peer:

```js
#onCellClick(index) {
  if (!this.#myTurn || this.#done || this.#cells[index]) return;

  this.#placeSymbol(index, this.#mySymbol);
  this.#match?.send({ cell: index });
  if (this.#done) return;

  this.#myTurn = false;
  this.#updateButtons();
  this.#setStatus("Opponent's turn");
}
```

`match.send(data)` JSON-serialises the object and sends it over the
reliable DataChannel. When the opponent's move arrives:

```js
#onMessage(e) {
  const data = e.data;
  if (this.#done || !this.#mySymbol || typeof data?.cell !== "number") return;

  const opponentSymbol = this.#mySymbol === "X" ? "O" : "X";
  this.#placeSymbol(data.cell, opponentSymbol);
  if (this.#done) return;

  this.#myTurn = true;
  this.#updateButtons();
  this.#setStatus(`Your turn (${this.#mySymbol})`);
}
```

The `if (this.#done) return;` guards matter: a move can end the game, and
`#placeSymbol` has already set the closing status. Without the guard the
"turn" status would overwrite "You lose." or "Draw!".

`e.data` on `GamePeerConnectionMessageEvent` is the JSON-parsed payload. Both peers
update their local board with the same index, so the state stays in sync
without any reconciliation.

A closing DataChannel is not always the end of the game — the unreliable
channel can go on its own — so check the reason:

```js
#onMatchClose(e) {
  if (e.reason !== "closed" || this.#done) return;
  this.#done = true;
  this.#setStatus("Opponent disconnected.");
  this.#updateButtons();
}
```

## Step 9: Win Detection and Round Events

Check for a winner after every move. Dispatch `GameRoundPassEvent` or
`GameRoundFailEvent` — the shell handles the rest (transitioning to
result, showing the result overlay):

```js
#placeSymbol(index, symbol) {
  this.#cells[index] = symbol;
  this.#buttons[index].textContent = symbol;

  const winLine = this.#checkWin(symbol);
  if (winLine) {
    this.#done = true;
    const items = this.querySelectorAll("ol li");
    for (const i of winLine) items[i].dataset.winner = "";
    this.#updateButtons();

    const won = symbol === this.#mySymbol;
    this.#setStatus(won ? "You win!" : "You lose.");
    this.dispatchEvent(
      won
        ? new GameRoundPassEvent(1, "You win!")
        : new GameRoundFailEvent("You lose."),
    );
    return;
  }

  if (this.#cells.every(Boolean)) {
    this.#done = true;
    this.#updateButtons();
    this.#setStatus("Draw!");
    this.dispatchEvent(new GameRoundPassEvent(0, "Draw!"));
  }
}

#checkWin(symbol) {
  return (
    WIN_LINES.find((line) => line.every((i) => this.#cells[i] === symbol)) ??
    null
  );
}
```

A win passes with score `1`; a draw passes with score `0`; a loss fails,
which the shell also records as `0`. Score alone therefore cannot tell a draw
from a loss — `lastRoundPassed` can, so combine the two. Note that
`<game-result-message>` picks a matching `<option>` child; conditions go on
the options, not on the element:

```html
<game-result-message>
  <option when-eq-score="1">You win!</option>
  <option when-eq-score="0" when-some-last-round-passed>Draw.</option>
  <option when-no-last-round-passed>You lose.</option>
</game-result-message>
```

## Step 10: Offering a Rematch

Both players must agree to play again, which is exactly what the match's
readiness handshake does. Point a button at it with `--peer-ready`; when both
peers have pressed it, the match fires `game-start-request` again and the
shell restarts:

```html
<div when-some-scene="result" data-overlay>
  <h1>Game over</h1>
  <game-result-message>...</game-result-message>
  <button commandfor="match" command="--peer-ready" data-rematch>
    Play again
  </button>
  <p data-rematch-wait>Waiting for your opponent to accept...</p>
</div>
```

While the local player is ready and the peer is not, the match carries
`:state(ready)` — enough to swap the button for the waiting message in CSS:

```css
game-peer-connection:state(ready) ~ [data-overlay] [data-rematch],
game-peer-connection:not(:state(ready)) ~ [data-overlay] [data-rematch-wait] {
  display: none;
}
```

## Step 11: Register the Element

```js
NoughtsAndCrosses.define();
```

`defineAll()` registers all built-in components. `NoughtsAndCrosses.define()`
registers the game component itself.

## What You Learned

- **`<game-lobby>`** manages a WebSocket connection to a signalling server.
  It reads `game-id` from the parent shell automatically; no `game-id`
  attribute needed on the element itself. `joinQueue()`, `leaveQueue()`,
  `createRoom()`, `joinRoom(code)`, `leaveRoom()`, `ready()`, `unready()` and
  `setPreference()` are the public API, and each has a matching `command` so
  buttons can drive the lobby declaratively. Lobby state is pushed into shell
  stats (`lobby-state`, `room-code`, `player-count`) for use with
  `<game-signal>` and `when-*`.
- **Overlay selection belongs in `when-*`**, not in `hidden`: `data-overlay`
  sets `display: flex`, which beats the `hidden` attribute.
- **`<game-peer-connection>`** wraps a WebRTC `RTCPeerConnection` with two DataChannels.
  It wires itself to `<game-lobby>` automatically via the lobby context.
  `send(data)` sends JSON over the reliable channel; set
  `{ reliable: false }` for unreliable/low-latency messages.
- **`auto-ready`** on both elements removes the manual accept and
  `shell.start()` wiring; `ready()` / `--peer-ready` reuses the same
  handshake for rematches.
- **`game-peer-connection-open`** fires when both DataChannels are open, providing
  `e.peerId`. Use `match.localPlayerId` to get your own ID.
- **`game-peer-connection-message`** delivers incoming messages as `e.data`
  (JSON-parsed) with `e.channel` (`"reliable"` or `"unreliable"`).
- **Role assignment without coordination**: sorting player IDs
  lexicographically gives both peers the same answer for who goes first
  — the same trick `<game-peer-connection>` uses internally to choose offerer vs
  answerer.
- **`effectCallback` tracks every signal it reads.** Read only what you want
  to react to, and capture the rest in event listeners.
- **`static template = null`** skips shadow DOM. Useful when you want to
  control the light DOM directly and don't need style encapsulation.
- **`GameRoundPassEvent(score, feedback)`** and **`GameRoundFailEvent(reason)`**
  bubble up to the shell which transitions the scene and records the score.
  A fail records `0`, so pair `score` with `lastRoundPassed` when you need to
  tell a draw from a loss.

## Next Steps

- [Lobby reference]({{ site.baseurl }}/api/components/lobby/) --
  full API for `<game-lobby>`, including all events and attributes
- [Match reference]({{ site.baseurl }}/api/components/peer-connection/) --
  full API for `<game-peer-connection>`, including DataChannel configuration
- [Word Guess tutorial]({{ site.baseurl }}/tutorials/word-guess/) --
  single-player game with context and tile input
- [Scenes reference]({{ site.baseurl }}/api/scenes/) --
  `when-*`, `data-overlay`, and the shell scene lifecycle
