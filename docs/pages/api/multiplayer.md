---
layout: doc
title: "Multiplayer"
permalink: /api/multiplayer/
---

HTMLGameKit ships two components for real-time multiplayer games:

- **`<game-lobby>`** — manages a WebSocket connection to a signalling server,
  handling matchmaking, room codes, and SDP/ICE relay.
- **`<game-peer-connection>`** — manages a WebRTC `RTCPeerConnection` with two
  `RTCDataChannel`s, wired to `<game-lobby>` for signalling.

The lobby handles everything before two peers are connected; the match handles
everything after.

By default this connects to `https://signalling.htmlgamekit.dev` - a free to use
server for handling WebRTC signalling and setup.

## How It Works

```
Browser A                 Signalling Server           Browser B
─────────                 ─────────────────           ─────────
game-lobby ──── WS ─────► room / queue ◄──── WS ──── game-lobby
game-peer-connection ◄─── SDP ────► relay         ────► SDP ──► game-peer-connection
game-peer-connection ◄─── ICE ────► relay         ────► ICE ──► game-peer-connection
game-peer-connection ◄──────────────── WebRTC DataChannel ──────────────► game-peer-connection
```

The signalling server relays SDP offers/answers and ICE candidates until
both peers establish a direct connection. After that, all game data flows
peer-to-peer over WebRTC DataChannels — the server is no longer in the path.

## Element Placement

Both elements go inside `<game-shell>`, typically before any visible
children. They have no visual output (`static template = null`):

```html
<game-shell id="game" game-id="my-game" rounds="1">
  <game-lobby id="lobby" reconnect auto-ready></game-lobby>
  <game-peer-connection id="match" auto-ready></game-peer-connection>

  <!-- visible content here -->
</game-shell>
```

`<game-peer-connection>` discovers `<game-lobby>` automatically via the
[lobby context]({{ site.baseurl }}/api/context/) pushed onto the shell.
The two elements do not need to be adjacent or in any particular order.

## Matchmaking Flows

### Matchmaking Queue

The simplest path: both players call `joinQueue()` and the server pairs
them when two are available.

```html
<button commandfor="lobby" command="--join-queue">Find a game</button>
```

```js
const lobby = document.querySelector("game-lobby");
lobby.joinQueue();
```

The server fires `game-lobby-match` when a match is found, then
`game-lobby-start` when signalling begins. `<game-peer-connection>` starts WebRTC
automatically when `startSignalling` fires.

### Private Room

One player creates a room; the other joins with the code.

```html
<!-- Host -->
<button commandfor="lobby" command="--create-room">Create room</button>
<!-- Both players, once the room shows two players -->
<button commandfor="lobby" command="--lobby-ready">Ready</button>
```

```js
// Host
lobby.createRoom();
// → game-lobby-room fires with { code, players }
// The room code is published as the "room-code" shell stat

// Guest
lobby.joinRoom("ABCD1234");
// → game-lobby-room fires on both sides

// Both players signal ready
lobby.ready();
// → the server starts signalling when all players are ready
```

`--join-queue`, `--create-room`, `--join-room`, `--leave-room`,
`--leave-queue`, `--lobby-ready`, `--lobby-unready` and `--set-preference`
cover the whole lobby API, so most lobby UIs need no JavaScript at all. See
the [`<game-lobby>` reference]({{ site.baseurl }}/api/components/lobby/).

Use `<game-signal key="room-code">` to display the room code in the UI.

## Lobby State

The lobby pushes its state into shell stats on every transition, so
`<game-signal>` and `when-*` conditions work without any custom code:

| Stat             | Values                                                                              |
| ---------------- | ----------------------------------------------------------------------------------- |
| `lobby-state`    | `connecting` / `connected` / `in-room` / `in-queue` / `signalling` / `disconnected` |
| `player-count`   | Number of players in the current room                                               |
| `room-code`      | Room code string when in a private room                                             |
| `queue-position` | Position in the matchmaking queue                                                   |
| `player-id`      | This player's ID as assigned by the server                                          |

```html
<div when-some-scene="intro" when-eq-lobby-state="in-queue" data-overlay>
  Finding a game...
</div>
```

Because `lobby-state` is a stat, `when-*` conditions can select which intro
overlay is visible. `when-no-lobby-state="in-room in-queue signalling"` reads
as "none of these", which covers the remaining states with one element. Do
not use the `hidden` attribute for this: `data-overlay` sets `display: flex`,
which overrides it.

`game-shell.start()` clears stats, but both elements republish theirs on the
`"setup"` lifecycle event, so lobby and match state stay readable during play.

The lobby also exposes CSS custom states (`:state(connecting)`,
`:state(in-room)`, etc.) for styling `game-lobby` itself directly.

## Match State

`<game-peer-connection>` similarly pushes stats and exposes CSS states:

| Stat         | Values                                                              |
| ------------ | ------------------------------------------------------------------- |
| `peer-state` | `idle` / `signalling` / `connecting` / `connected` / `disconnected` |
| `latency`    | Round-trip time in milliseconds (polled every 2 s)                  |
| `peer-id`    | Remote player's ID                                                  |

CSS states mirror `peer-state`, plus `:state(ready)` while this player has
signalled readiness and the peer has not.

## Starting the Game

With `auto-ready` on `<game-peer-connection>`, both peers signal readiness as
soon as the DataChannels open; the element then fires `game-start-request` and
the shell calls `.start()`. No JavaScript needed.

Without it, drive the handshake yourself — from a button:

```html
<button commandfor="match" command="--peer-ready">Start</button>
```

or call `match.ready()`, or skip the handshake entirely and call
`shell.start()` from `game-peer-connection-open`.

`shell.start()` transitions the scene from `intro` to `playing`,
making the game board visible and hiding the lobby UI.

## Rematches

`ready()` clears both readiness flags once it has fired
`game-start-request`, so the same handshake serves every subsequent game.
Point a result-overlay button at the match and both players must agree
before the next game starts:

```html
<button commandfor="match" command="--peer-ready">Play again</button>
```

While this player is ready and the peer is not, the element carries
`:state(ready)` — use it to swap the button for a "waiting for opponent"
message in CSS.

## Sending and Receiving Moves

`<game-peer-connection>` exposes two DataChannels — reliable (ordered, guaranteed
delivery) and unreliable (unordered, no retransmits) — via a single
`send()` method:

```js
const match = document.querySelector("game-peer-connection");

// Reliable (default): game state, moves, scores
match.send({ type: "move", cell: 4 });

// Unreliable: real-time position, animation hints
match.send({ x: 120, y: 340 }, { reliable: false });
```

Incoming messages fire `game-peer-connection-message` on the match element, bubbling
up through the shell:

```js
shell.addEventListener("game-peer-connection-message", (e) => {
  const { data, channel, peerId } = e;
  // data is already JSON-parsed if the sender sent an object
});
```

Messages arrive on the same element as all other game events, so you can
listen at the shell or at a parent game component.

## Role Assignment

Both players need to agree on a role (e.g. who goes first, who is X vs O)
without coordination. `<game-peer-connection>` itself uses this trick for deciding
who creates the WebRTC offer: sort player IDs lexicographically — the lower
ID is the offerer. Your game can apply the same logic:

```js
const myId = match.localPlayerId;
const peerId = e.peerId; // from game-peer-connection-open
const iFirst = myId < peerId;
```

Both peers reach the same conclusion independently.

## Result Reporting

After a match, report the outcome to the server (for rating/ranking):

```js
match.reportResult(peerId, "win"); // "win" | "loss" | "draw"
```

This calls through to `lobby.reportResult()` which sends a `report_result`
message to the signalling server. Confirmation and rating messages are
informational and are not surfaced as events; listen for `game-lobby-error`
if the report fails.

## Disconnection

`game-peer-connection-close` fires when either DataChannel closes:

```js
shell.addEventListener("game-peer-connection-close", (e) => {
  const { peerId, reason } = e;
  // reason: "closed" (reliable channel) | "unreliable-closed"
  // handle graceful or ungraceful disconnect
});
```

The match state transitions to `disconnected`. With `reconnect` on the
lobby, the WebSocket reconnects automatically but WebRTC does not —
the player needs to re-enter the queue or room to find a new peer.

## Signalling Server

The `url` attribute on `<game-lobby>` defaults to
`https://signalling.htmlgamekit.dev`, so omitting it connects to the
public server. That server is available for development and small-scale
games. For production use, deploy your own instance from
[github.com/anomalyco/signalling](https://github.com/anomalyco/signalling)
(Actix-Web, WebSocket, SQLite) and set `url` to point at it.

The shell's `game-id` attribute namespaces matchmaking — `<game-lobby>`
reads it automatically from the shell. Players are only matched with others
whose shell has the same `game-id`. Keep it unique to your game to avoid
cross-game matchmaking.

## See Also

- [`<game-lobby>` reference]({{ site.baseurl }}/api/components/lobby/) —
  full attribute, method, event, and CSS state API
- [`<game-peer-connection>` reference]({{ site.baseurl }}/api/components/peer-connection/) —
  DataChannel configuration, send API, getters
- [Noughts & Crosses tutorial]({{ site.baseurl }}/tutorials/noughts-and-crosses/) —
  end-to-end walkthrough building a two-player game
