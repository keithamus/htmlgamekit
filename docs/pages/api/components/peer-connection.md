---
title: "GamePeerConnection"
permalink: /api/components/peer-connection/
---

Manages a WebRTC `RTCPeerConnection` with two `RTCDataChannel`s — one
reliable (ordered, guaranteed delivery) and one unreliable (unordered, no
retransmits). Wires automatically to a sibling `<game-lobby>` via the lobby
context for SDP and ICE relay.

Role determination (offerer vs answerer) is handled internally by sorting
player IDs lexicographically: the lower ID becomes the offerer. Both peers
reach the same conclusion independently.

### Attributes

{% cem_attrs "game-peer-connection" %}

<dl class="def">

<dt><span class="badge attr">reliable-label</span></dt>
<dd>
<code>string</code> — Label for the reliable DataChannel. Defaults to
<code>"reliable"</code>. Change only if you need a custom label for server-side
inspection or inter-app compatibility.
</dd>

<dt><span class="badge attr">unreliable-label</span></dt>
<dd>
<code>string</code> — Label for the unreliable DataChannel. Defaults to
<code>"unreliable"</code>.
</dd>

<dt><span class="badge attr">max-retransmits</span></dt>
<dd>
<code>number</code> — Maximum retransmit attempts for the unreliable channel.
Defaults to <code>0</code> (fire-and-forget). Increase to allow limited
retries while still avoiding head-of-line blocking.
</dd>

<dt><span class="badge attr">auto-ready</span></dt>
<dd>
<code>boolean</code> — When present, calls <code>.ready()</code> as soon as
both DataChannels open. Once the peer is ready too the element fires
<code>game-start-request</code>, which the shell answers by calling
<code>.start()</code> — so the game begins with no JavaScript at all. Omit it
when the players should confirm before the first game starts.
</dd>

<dt><span class="badge attr">heartbeat-interval</span></dt>
<dd>
<code>number</code> — Milliseconds between heartbeats sent to the peer over
the reliable channel, and how often <code>.latency</code> is sampled. Defaults
to <code>2000</code>.
</dd>

<dt><span class="badge attr">heartbeat-timeout</span></dt>
<dd>
<code>number</code> — Milliseconds of silence from the peer (no heartbeat and
no game message) before the connection is reported lost with reason
<code>"lost"</code>. Defaults to <code>10000</code>. Set to <code>0</code> to
wait for ever. A killed tab or a dropped network never closes its
DataChannels, and ICE can take half a minute to notice, so this is what tells
a turn-based game its opponent is gone.
</dd>

</dl>

### Instance Properties

<dl class="def">

<dt><span class="badge prop">.peerId</span></dt>
<dd>
<code>string | null</code> — Remote player's ID, or <code>null</code> if not
connected.
</dd>

<dt><span class="badge prop">.localPlayerId</span></dt>
<dd>
<code>string | null</code> — This player's ID as assigned by the signalling
server (reads from the sibling <code>&lt;game-lobby&gt;</code>).
</dd>

<dt><span class="badge prop">.connected</span></dt>
<dd>
<code>boolean</code> — <code>true</code> when both DataChannels are open.
</dd>

<dt><span class="badge prop">.latency</span></dt>
<dd>
<code>number | null</code> — Last measured round-trip time in milliseconds,
polled every <code>heartbeat-interval</code>. <code>null</code> if not
connected or stats unavailable.
</dd>

</dl>

### Instance Methods

<dl class="def">

<dt><span class="badge method">.send(data, options?)</span></dt>
<dd>
Send data to the peer. Objects are JSON-serialised automatically; strings
are sent as-is.

**Parameters:**

- `data` — `any` — Payload to send.
- `options.reliable` — `boolean` — Defaults to `true`. Set to `false` to
  send over the unreliable channel (lower latency, no delivery guarantee).

```js
// Reliable: game moves, state transitions
match.send({ type: "move", cell: 4 });

// Unreliable: real-time position updates
match.send({ x: 120, y: 340 }, { reliable: false });
```

Calls are no-ops if the relevant channel is not open.

</dd>

<dt><span class="badge method">.close()</span></dt>
<dd>
Close the peer connection and reset to idle. Fires no
<code>game-peer-connection-close</code> event; the peer finds out through its
own DataChannels closing. The match can reconnect if the lobby starts a new
signalling session. Called automatically when the shell quits
(<code>shell.quit()</code> / <code>--quit</code>).
</dd>

<dt><span class="badge method">.ready()</span></dt>
<dd>
Signal that this player is ready to start. Readiness is sent to the peer over
the reliable channel; calling it before the channels open is safe, the signal
is sent as soon as they do. When both peers are ready the element fires
<code>game-start-request</code> and clears both readiness flags, so calling
<code>.ready()</code> again offers a rematch. Equivalent to the
<code>--peer-ready</code> command:

```html
<button commandfor="match" command="--peer-ready">Play again</button>
```

</dd>

<dt><span class="badge method">.reportResult(opponent, outcome)</span></dt>
<dd>
Report a match outcome via the lobby signalling channel.

**Parameters:**

- `opponent` — `string` — The opponent's player ID (use `match.peerId`).
- `outcome` — `"win" | "loss" | "draw"`

```js
match.reportResult(match.peerId, "win");
```

</dd>

</dl>

### Events

<dl class="def">

<dt><span class="badge event">game-peer-connection-open</span></dt>
<dd>
Fires once per connection, when both DataChannels are open and the connection
is ready for game data. Use <code>auto-ready</code> to start the shell without
writing this listener.

| Property | Type     | Description        |
| -------- | -------- | ------------------ |
| `peerId` | `string` | Remote player's ID |

```js
shell.addEventListener("game-peer-connection-open", (e) => {
  console.log("Connected to", e.peerId);
  shell.start();
});
```

</dd>

<dt><span class="badge event">game-peer-connection-close</span></dt>
<dd>
Fires when the connection is lost: the reliable DataChannel closed, the
lobby reported that the peer left the room before the channels opened (the
signalling server notices a closed tab straight away, long before ICE times
out), the handshake never completed within <code>connect-timeout</code>, or
nothing arrived from the peer for <code>heartbeat-timeout</code>. Once the
channels are open the lobby is no longer consulted: the socket is handed
off, and the heartbeat is what notices a vanished peer. Either way the
element tears the connection down, moves to
<code>:state(disconnected)</code> and drops any pending readiness. The
unreliable channel closing on its own only fires the event.

| Property | Type     | Description                                                                                              |
| -------- | -------- | -------------------------------------------------------------------------------------------------------- |
| `peerId` | `string` | Remote player's ID                                                                                       |
| `reason` | `string` | `"closed"` (reliable channel), `"left"` (peer left the room), `"timeout"` (handshake never completed), `"lost"` (peer stopped answering heartbeats) or `"unreliable-closed"` |

</dd>

<dt><span class="badge event">game-peer-connection-message</span></dt>
<dd>
Fires when a message arrives from the peer.

| Property  | Type                         | Description                                           |
| --------- | ---------------------------- | ----------------------------------------------------- |
| `peerId`  | `string`                     | Sender's player ID                                    |
| `channel` | `"reliable" \| "unreliable"` | Which channel delivered the message                   |
| `data`    | `any`                        | JSON-parsed payload (or raw string if not valid JSON) |

```js
shell.addEventListener("game-peer-connection-message", (e) => {
  const { data, channel, peerId } = e;
  if (channel === "reliable" && data.type === "move") {
    applyMove(data.cell);
  }
});
```

</dd>

<dt><span class="badge event">game-peer-connection-ice</span></dt>
<dd>
Fires on ICE connection state changes, and once with the synthetic state
<code>"no-servers"</code> when the lobby never returned STUN/TURN
configuration. That case still attempts the connection, but it can only
succeed between peers that reach each other directly, so it is worth
surfacing in the UI.

| Property | Type     | Description                                       |
| -------- | -------- | ------------------------------------------------- |
| `state`  | `string` | ICE connection state string, or `"no-servers"`    |

</dd>

</dl>

All events bubble and compose.

### CSS States

| State                  | When active                       |
| ---------------------- | --------------------------------- |
| `:state(idle)`         | No connection attempt in progress |
| `:state(signalling)`   | Exchanging SDP and ICE candidates |
| `:state(connecting)`   | ICE negotiation in progress       |
| `:state(connected)`    | Both DataChannels open            |
| `:state(disconnected)` | Connection lost or peer left      |
| `:state(ready)`        | This player is ready, peer is not |

`:state(ready)` makes a rematch prompt purely declarative — the element sits
before the overlays in the shell, so a sibling selector reaches it:

```css
game-peer-connection:state(ready) ~ [data-overlay] [data-rematch],
game-peer-connection:not(:state(ready)) ~ [data-overlay] [data-rematch-wait] {
  display: none;
}
```

### Shell Stats

| Stat          | Type           | Description                           |
| ------------- | -------------- | ------------------------------------- |
| `peer-state`  | `string`       | Current state name                    |
| `latency`     | `number\|null` | Round-trip time in ms                 |
| `peer-id`     | `string`       | Remote player's ID                    |
| `ice-servers` | `number`       | How many ICE servers the lobby gave   |

`game-shell.start()` clears stats, so the element republishes these on the
`"setup"` lifecycle event. A latency readout keeps working across rounds and
rematches without any bookkeeping in your game.

### Usage

```html
<game-shell id="game" game-id="my-game" rounds="1">
  <game-lobby reconnect auto-ready></game-lobby>
  <game-peer-connection id="match" auto-ready></game-peer-connection>

  <div when-some-scene="playing">
    ping <game-signal key="latency"></game-signal>ms
  </div>
</game-shell>
```

```js
const shell = document.querySelector("game-shell");
const match = document.querySelector("#match");

// auto-ready starts the shell; capture the role when the connection opens
let amFirst = false;
shell.addEventListener("game-peer-connection-open", (e) => {
  // Deterministic role assignment — no coordination needed
  amFirst = match.localPlayerId < e.peerId;
});

// Handle incoming moves
shell.addEventListener("game-peer-connection-message", (e) => {
  if (typeof e.data.cell === "number") {
    applyOpponentMove(e.data.cell);
  }
});

// Send a move
function makeMove(cell) {
  match.send({ cell });
}

// Handle disconnect. The unreliable channel can close on its own, so only
// "closed" and "left" mean the game is over.
shell.addEventListener("game-peer-connection-close", (e) => {
  if (e.reason !== "unreliable-closed") returnToLobby();
});
```

See the [Multiplayer concept page]({{ site.baseurl }}/api/multiplayer/) and
the [Noughts & Crosses tutorial]({{ site.baseurl }}/tutorials/noughts-and-crosses/)
for complete integration examples.
