---
title: "GameLobby"
permalink: /api/components/lobby/
---

Manages a WebSocket connection to a signalling server. Handles matchmaking
queue, private rooms, player ready states, and relays SDP/ICE messages to
`<game-peer-connection>` for WebRTC establishment.

Pushes lobby state into shell stats on every transition, making it
available to `<game-signal>` and `when-*` conditions throughout the shell
tree.

### Attributes

{% cem_attrs "game-lobby" %}

<dl class="def">

<dt><span class="badge attr">url</span></dt>
<dd>
<code>string</code> — WebSocket URL of the signalling server (without
the <code>/ws/{game-id}</code> path, which is appended automatically).
Defaults to <code>https://signalling.htmlgamekit.dev</code>. Override
to point at your own server. No connection is made until the parent
shell has a <code>game-id</code>.
</dd>

<dt><span class="badge attr">reconnect</span></dt>
<dd>
<code>boolean</code> — When present, automatically reconnects after 2
seconds if the WebSocket closes unexpectedly. Omit for single-attempt
connections.
</dd>

<dt><span class="badge attr">auto-ready</span></dt>
<dd>
<code>boolean</code> — When present, calls <code>.ready()</code>
automatically as soon as a queue match is found, so queued players skip a
manual accept step. Has no effect on the private room flow, where readiness
is the player's decision.
</dd>

</dl>

### Instance Methods

<dl class="def">

<dt><span class="badge method">.joinQueue(preferences?)</span></dt>
<dd>
Enter the matchmaking queue. The server pairs players in the same queue
(same shell <code>game-id</code>). Fires <code>game-lobby-queue</code> when
confirmed; <code>game-lobby-start</code> when a match is found and
signalling begins.

**Parameters:**

- `preferences` — `string[]` — Optional preference strings (e.g.
  `["role:healer"]`) sent to the server for match filtering.

```js
lobby.joinQueue();
lobby.joinQueue(["difficulty:hard"]);
```

</dd>

<dt><span class="badge method">.leaveQueue()</span></dt>
<dd>
Leave the matchmaking queue before a match is found. The element returns to
<code>:state(connected)</code> immediately rather than waiting for the
server, so a queue overlay selected with
<code>when-eq-lobby-state="in-queue"</code> closes at once.
</dd>

<dt><span class="badge method">.leaveRoom()</span></dt>
<dd>
Leave the current private room. The signalling protocol has no leave
message, so this closes the WebSocket and reconnects with a fresh player
identity — the server sees the player leave, and the room code and player
count stats are cleared. Called automatically when the shell quits
(<code>shell.quit()</code> / <code>--quit</code>) while in a room or during
signalling, so the other player receives <code>game-lobby-player</code> with
action <code>"left"</code>. After a handoff the room no longer exists, so
quitting reconnects with the same identity instead.
</dd>

<dt><span class="badge method">.handoff()</span></dt>
<dd>
Release the signalling socket once the peer connection is up. Sends
<code>handoff</code> so the server drops this player from the room without
telling the others, then closes the WebSocket and moves to
<code>:state(handed-off)</code>. No reconnect is scheduled: the next
<code>createRoom()</code>, <code>joinRoom()</code>, <code>joinQueue()</code>,
<code>reportResult()</code> or shell quit reconnects with the same player
ID and carries on. Called by <code>&lt;game-peer-connection&gt;</code> once
both peers have finished ICE gathering; ignored unless the lobby is in
<code>signalling</code>.
</dd>

<dt><span class="badge method">.createRoom()</span></dt>
<dd>
Create a private room. Fires <code>game-lobby-room</code> with the room
code on success. Share the code (via <code>&lt;game-signal key="room-code"&gt;</code>)
with another player so they can join.
</dd>

<dt><span class="badge method">.joinRoom(code)</span></dt>
<dd>
Join a private room by code. Fires <code>game-lobby-room</code> on both
the host and the joiner.

**Parameters:**

- `code` — `string` — Room code (case-insensitive; the server normalises it).

```js
lobby.joinRoom("ABCD1234");
```

</dd>

<dt><span class="badge method">.ready()</span></dt>
<dd>
Signal that this player is ready to start. The server sends
<code>StartSignalling</code> when all players in the room have readied up,
which causes <code>game-lobby-start</code> to fire and `<game-peer-connection>` to
begin WebRTC establishment.
</dd>

<dt><span class="badge method">.unready()</span></dt>
<dd>
Withdraw the ready signal.
</dd>

<dt><span class="badge method">.setPreference(preference)</span></dt>
<dd>
Update this player's preference string. Other players in the room receive
<code>game-lobby-player</code> with action <code>"preference"</code>.

**Parameters:**

- `preference` — `string`

</dd>

<dt><span class="badge method">.reportResult(opponent, outcome)</span></dt>
<dd>
Report a match outcome to the server for rating/ranking. Reconnects with
the same player ID first if the socket was handed off, and sends the match
token issued at <code>start_signalling</code>. Does nothing before a match
has started signalling.

**Parameters:**

- `opponent` — `string` — The opponent's player ID.
- `outcome` — `"win" | "loss" | "draw"`

```js
lobby.reportResult(match.peerId, "win");
```

</dd>

</dl>

### Events

<dl class="def">

<dt><span class="badge event">game-lobby-connected</span></dt>
<dd>
Fires when the WebSocket opens and the server assigns a player ID.

| Property   | Type     | Description        |
| ---------- | -------- | ------------------ |
| `playerId` | `string` | Assigned player ID |

</dd>

<dt><span class="badge event">game-lobby-room</span></dt>
<dd>
Fires when a room is created (<code>createRoom</code>) or joined
(<code>joinRoom</code>).

| Property  | Type                                              | Description     |
| --------- | ------------------------------------------------- | --------------- |
| `code`    | `string`                                          | Room code       |
| `players` | `Array<{ id: string, preference: string\|null }>` | Current players |

</dd>

<dt><span class="badge event">game-lobby-player</span></dt>
<dd>
Fires when a player joins, leaves, readies, unreadies, or changes preference
in the current room.

| Property | Type                                                         | Description   |
| -------- | ------------------------------------------------------------ | ------------- |
| `action` | `"joined" \| "left" \| "ready" \| "unready" \| "preference"` | What happened |
| `player` | `{ id: string, preference?: string\|null }`                  | The player    |

</dd>

<dt><span class="badge event">game-lobby-queue</span></dt>
<dd>
Fires when the server confirms queue entry.

| Property   | Type     | Description           |
| ---------- | -------- | --------------------- |
| `position` | `number` | Position in the queue |

</dd>

<dt><span class="badge event">game-lobby-match</span></dt>
<dd>
Fires when a match is found (queue flow only), before signalling begins.

| Property  | Type                                              | Description     |
| --------- | ------------------------------------------------- | --------------- |
| `players` | `Array<{ id: string, preference: string\|null }>` | Matched players |

</dd>

<dt><span class="badge event">game-lobby-start</span></dt>
<dd>
Fires when signalling begins (both queue and room flows). `<game-peer-connection>`
starts WebRTC establishment automatically when this fires.

| Property  | Type                                              | Description                    |
| --------- | ------------------------------------------------- | ------------------------------ |
| `players` | `Array<{ id: string, preference: string\|null }>` | Players in the match           |
| `code`    | `string\|null`                                    | Room code if in a private room |

</dd>

<dt><span class="badge event">game-lobby-error</span></dt>
<dd>
Fires when the server sends an error.

| Property  | Type     | Description            |
| --------- | -------- | ---------------------- |
| `code`    | `string` | Error code             |
| `message` | `string` | Human-readable message |

</dd>

</dl>

All events bubble and compose, so you can listen at `game-shell` level.

### Commands

Buttons drive the lobby declaratively with the native Invoker Commands API —
`commandfor` names the lobby element, `command` names the action:

| Command            | Effect                           |
| ------------------ | -------------------------------- |
| `--create-room`    | `.createRoom()`                  |
| `--join-room`      | `.joinRoom(value)`               |
| `--leave-room`     | `.leaveRoom()`                   |
| `--join-queue`     | `.joinQueue(value.split(/\s+/))` |
| `--leave-queue`    | `.leaveQueue()`                  |
| `--lobby-ready`    | `.ready()`                       |
| `--lobby-unready`  | `.unready()`                     |
| `--set-preference` | `.setPreference(value)`          |

`--join-room`, `--join-queue` and `--set-preference` read the button's
`value` attribute; the others ignore it.

```html
<button commandfor="lobby" command="--create-room">Create private room</button>
<button commandfor="lobby" command="--join-queue" value="ranked">
  Find a ranked game
</button>
```

### CSS States

| State                  | When active                          |
| ---------------------- | ------------------------------------ |
| `:state(connecting)`   | WebSocket connect in progress        |
| `:state(connected)`    | WebSocket open, not in room or queue |
| `:state(in-room)`      | In a private room                    |
| `:state(in-queue)`     | In the matchmaking queue             |
| `:state(signalling)`   | WebRTC signalling in progress        |
| `:state(disconnected)` | WebSocket closed                     |

```css
game-lobby:state(connecting)::after {
  content: "Connecting...";
}
game-lobby:state(connected)::after {
  content: "Connected";
}
```

### Shell Stats

The lobby writes to shell stats on every state change, making them
available to `<game-signal>` and `when-*` conditions without any custom code:

| Stat             | Type     | Description                      |
| ---------------- | -------- | -------------------------------- |
| `lobby-state`    | `string` | Current state name               |
| `player-count`   | `number` | Players in the current room      |
| `room-code`      | `string` | Room code when in a room         |
| `queue-position` | `number` | Queue position when waiting      |
| `player-id`      | `string` | This player's server-assigned ID |

```html
<p>Room: <game-signal key="room-code"></game-signal></p>
<div when-eq-lobby-state="in-queue" data-overlay>Finding a game...</div>
```

`game-shell.start()` clears stats, so the lobby republishes all of the above
on the `"setup"` lifecycle event. Lobby state therefore stays readable during
`playing` without any bookkeeping in your game.

### Signal Access

| Signal             | Usage                                                                                  |
| ------------------ | -------------------------------------------------------------------------------------- |
| `.playerId`        | `Signal.State<string\|null>` — current player ID, consumed by `<game-peer-connection>` |
| `.startSignalling` | `Signal.State<{ players, code }\|null>` — consumed by `<game-peer-connection>`         |

These are public `Signal.State` instances on the element instance. They are
the primary interface between `<game-lobby>` and `<game-peer-connection>` — you do
not need to access them directly.

### Usage

```html
<game-shell id="game" game-id="my-game" rounds="1">
  <game-lobby id="lobby" reconnect auto-ready></game-lobby>
  <game-peer-connection auto-ready></game-peer-connection>

  <div
    when-some-scene="intro"
    when-no-lobby-state="in-room in-queue signalling"
    data-overlay
  >
    <button commandfor="lobby" command="--join-queue">Find a game</button>
    <button commandfor="lobby" command="--create-room">
      Create private room
    </button>
  </div>

  <div when-some-scene="intro" when-eq-lobby-state="in-room" data-overlay>
    <p>Room: <game-signal key="room-code"></game-signal></p>
    <button commandfor="lobby" command="--lobby-ready">Ready</button>
    <button commandfor="lobby" command="--leave-room">Cancel</button>
  </div>
</game-shell>
```

With `auto-ready` on `<game-peer-connection>` the shell starts by itself once
both peers are connected, so this whole flow needs no JavaScript.

See the [Multiplayer concept page]({{ site.baseurl }}/api/multiplayer/) and
the [Noughts & Crosses tutorial]({{ site.baseurl }}/tutorials/noughts-and-crosses/)
for complete integration examples.
