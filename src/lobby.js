import GameComponent from "./component.js";
import { createContext, ContextProvider } from "./context.js";
import {
  GameLobbyConnectedEvent,
  GameLobbyRoomEvent,
  GameLobbyMatchEvent,
  GameLobbyQueueEvent,
  GameLobbyPlayerEvent,
  GameLobbyStartEvent,
  GameLobbyErrorEvent,
  GameStatUpdateEvent,
} from "./events.js";
import { Signal } from "./signals.js";

export const gameLobbyContext = createContext("game-lobby");

const RECONNECT_DELAY = 2000;
const DEFAULT_URL = "https://signalling.htmlgamekit.dev";

/**
 * Manages a WebSocket connection to a signalling server, exposing lobby state
 * as shell stats and providing context for `<game-peer-connection>` to relay SDP/ICE.
 *
 * Buttons drive it declaratively with `commandfor` plus one of the commands
 * `--create-room`, `--join-room`, `--leave-room`, `--join-queue`,
 * `--leave-queue`, `--lobby-ready`, `--lobby-unready` or `--set-preference`.
 * `--join-room`, `--join-queue` and `--set-preference` read the button `value`.
 *
 * @summary WebSocket lobby signalling component
 * @fires {GameLobbyConnectedEvent} game-lobby-connected - Connected and assigned a player ID
 * @fires {GameLobbyRoomEvent} game-lobby-room - Room created or joined
 * @fires {GameLobbyMatchEvent} game-lobby-match - Match found in queue
 * @fires {GameLobbyQueueEvent} game-lobby-queue - Queue position updated
 * @fires {GameLobbyPlayerEvent} game-lobby-player - Player joined/left/readied in room
 * @fires {GameLobbyStartEvent} game-lobby-start - Signalling phase beginning
 * @fires {GameLobbyErrorEvent} game-lobby-error - Server error received
 * @cssState connecting - Connecting to server
 * @cssState connected - WebSocket open, no room or queue
 * @cssState in-room - In a room, waiting for ready
 * @cssState in-queue - In matchmaking queue
 * @cssState signalling - WebRTC signalling in progress
 * @cssState disconnected - WebSocket closed
 * @attr {boolean} [auto-ready] - Automatically call ready() when a queue match is found
 */
export default class GameLobby extends GameComponent {
  static template = null;

  static attrs = {
    url: { type: "string?" },
    reconnect: { type: "boolean" },
    "auto-ready": { type: "boolean" },
  };

  static define(tag = "game-lobby", registry = customElements) {
    super.define(tag, registry);
  }

  #ws = null;
  #wsAbort = null;
  #provider = null;
  #states = null;
  #reconnectTimer = null;
  #playerCount = 0;
  #stats = new Map();

  #sdpCallbacks = new Set();
  #iceCallbacks = new Set();
  #iceServerCallbacks = new Set();

  // Signals consumed by <game-peer-connection>
  startSignalling = new Signal.State(null);
  playerId = new Signal.State(null);

  constructor() {
    super();
    this.#states = this.attachInternals().states;
  }

  connectedCallback() {
    super.connectedCallback();

    this.#provider = new ContextProvider(this.shell, gameLobbyContext, {
      relaySdp: this.#relaySdp.bind(this),
      relayIce: this.#relayIce.bind(this),
      requestIceServers: this.#requestIceServers.bind(this),
      reportResult: this.#reportResult.bind(this),
      onSdp: (cb) => this.#sdpCallbacks.add(cb),
      offSdp: (cb) => this.#sdpCallbacks.delete(cb),
      onIceCandidate: (cb) => this.#iceCallbacks.add(cb),
      offIceCandidate: (cb) => this.#iceCallbacks.delete(cb),
      onIceServers: (cb) => this.#iceServerCallbacks.add(cb),
      offIceServers: (cb) => this.#iceServerCallbacks.delete(cb),
      startSignalling: this.startSignalling,
      playerId: this.playerId,
    });

    this.#connect();

    this.shell?.addEventListener(
      "game-lifecycle",
      (e) => {
        if (e.action === "setup") this.#republishStats();
        else if (e.action === "quit" && this.#inRoom()) this.leaveRoom();
      },
      { signal: this.signal },
    );

    this.addEventListener("command", (e) => this.#onCommand(e), {
      signal: this.signal,
    });
  }

  disconnectedCallback() {
    this.#disconnect();
    super.disconnectedCallback();
  }

  /**
   * Create a private room.
   */
  createRoom() {
    this.#send({ type: "CreateRoom" });
  }

  /**
   * Join a room by code.
   * @param {string} code
   */
  joinRoom(code) {
    this.#send({ type: "JoinRoom", code });
  }

  /**
   * Leave the matchmaking queue.
   */
  leaveQueue() {
    this.#send({ type: "LeaveQueue" });
    if (this.#states.has("in-queue")) this.#setState("connected");
  }

  /**
   * Leave the current private room. The signalling protocol has no leave
   * message, so this drops the WebSocket and reconnects with a new player
   * identity, which the server sees as the player leaving.
   */
  leaveRoom() {
    this.#disconnect();
    this.playerId.set(null);
    this.#playerCount = 0;
    this.startSignalling.set(null);
    this.#stat("room-code", null);
    this.#stat("player-count", 0);
    this.#connect();
  }

  /**
   * Enter the matchmaking queue with optional preference strings.
   * @param {string[]} [preferences]
   */
  joinQueue(preferences = []) {
    this.#send({ type: "JoinQueue", preferences });
  }

  /**
   * Set a preference string (e.g. chosen role, faction).
   * @param {string} preference
   */
  setPreference(preference) {
    this.#send({ type: "SetPreference", preference });
  }

  /**
   * Mark self as ready within a room.
   */
  ready() {
    this.#send({ type: "Ready" });
  }

  /**
   * Mark self as not ready within a room.
   */
  unready() {
    this.#send({ type: "Unready" });
  }

  /**
   * Report a match result.
   * @param {string} opponent
   * @param {"win"|"loss"|"draw"} outcome
   */
  reportResult(opponent, outcome) {
    this.#reportResult(opponent, outcome);
  }

  #onCommand(e) {
    const value = e.source?.value ?? "";
    if (e.command === "--create-room") this.createRoom();
    else if (e.command === "--join-room") this.joinRoom(value);
    else if (e.command === "--leave-room") this.leaveRoom();
    else if (e.command === "--join-queue")
      this.joinQueue(value ? value.trim().split(/\s+/) : []);
    else if (e.command === "--leave-queue") this.leaveQueue();
    else if (e.command === "--lobby-ready") this.ready();
    else if (e.command === "--lobby-unready") this.unready();
    else if (e.command === "--set-preference") this.setPreference(value);
  }

  #inRoom() {
    return this.#states.has("in-room") || this.#states.has("signalling");
  }

  #connect() {
    const url = (this.url ?? DEFAULT_URL).replace(/^http/, "ws");
    const gameId = this.shell?.gameId.get();
    if (!gameId) return;

    this.#disconnect();
    this.#setState("connecting");

    const wsUrl = new URL(`${url}/ws/${gameId}`);
    const pid = this.playerId.get() ?? this.getAttribute("player-id");
    if (pid) wsUrl.searchParams.set("player_id", pid);

    const abort = new AbortController();
    this.#wsAbort = abort;
    const ws = new WebSocket(wsUrl.toString());
    this.#ws = ws;

    ws.addEventListener("message", (e) => this.#onMessage(e), {
      signal: abort.signal,
    });
    ws.addEventListener("close", (e) => this.#onClose(e), {
      once: true,
      signal: abort.signal,
    });
  }

  #disconnect() {
    clearTimeout(this.#reconnectTimer);
    this.#reconnectTimer = null;
    this.#wsAbort?.abort();
    this.#wsAbort = null;
    if (this.#ws) {
      this.#ws.close();
      this.#ws = null;
    }
  }

  #onMessage(e) {
    let msg;
    try {
      msg = JSON.parse(e.data);
    } catch {
      return;
    }

    const type = msg.type;

    if (type === "connected") {
      this.playerId.set(msg.player_id);
      this.#setState("connected");
      this.#stat("player-id", msg.player_id);
      this.dispatchEvent(new GameLobbyConnectedEvent(msg.player_id));
    } else if (type === "room_created" || type === "room_joined") {
      this.#setState("in-room");
      this.#playerCount = msg.players?.length ?? 0;
      this.#stat("room-code", msg.code);
      this.#stat("player-count", this.#playerCount);
      this.dispatchEvent(new GameLobbyRoomEvent(msg.code, msg.players ?? []));
    } else if (type === "player_joined") {
      this.#playerCount += 1;
      this.#stat("player-count", this.#playerCount);
      const player = { id: msg.player_id, preference: msg.preference ?? null };
      this.dispatchEvent(new GameLobbyPlayerEvent("joined", player));
    } else if (type === "player_left") {
      this.#playerCount = Math.max(0, this.#playerCount - 1);
      this.#stat("player-count", this.#playerCount);
      this.dispatchEvent(
        new GameLobbyPlayerEvent("left", { id: msg.player_id }),
      );
    } else if (type === "player_ready") {
      this.dispatchEvent(
        new GameLobbyPlayerEvent("ready", { id: msg.player_id }),
      );
    } else if (type === "player_unready") {
      this.dispatchEvent(
        new GameLobbyPlayerEvent("unready", { id: msg.player_id }),
      );
    } else if (type === "preference_changed") {
      this.dispatchEvent(
        new GameLobbyPlayerEvent("preference", {
          id: msg.player_id,
          preference: msg.preference,
        }),
      );
    } else if (type === "queue_joined") {
      this.#setState("in-queue");
      this.#stat("queue-position", msg.position);
      this.dispatchEvent(new GameLobbyQueueEvent(msg.position));
    } else if (type === "match_found") {
      this.dispatchEvent(new GameLobbyMatchEvent(msg.players ?? []));
      if (this.autoReady) this.ready();
    } else if (type === "start_signalling") {
      this.#setState("signalling");
      const payload = { players: msg.players ?? [], code: msg.code ?? null };
      this.startSignalling.set(payload);
      this.dispatchEvent(
        new GameLobbyStartEvent(payload.players, payload.code),
      );
    } else if (type === "sdp_offer" || type === "sdp_answer") {
      const sdpType = type === "sdp_offer" ? "offer" : "answer";
      for (const cb of this.#sdpCallbacks)
        cb({ from: msg.from, sdp: msg.sdp, type: sdpType });
    } else if (type === "ice_candidate") {
      for (const cb of this.#iceCallbacks)
        cb({ from: msg.from, candidate: msg.candidate });
    } else if (type === "ice_servers") {
      for (const cb of this.#iceServerCallbacks) cb(msg.ice_servers ?? []);
    } else if (type === "error") {
      this.dispatchEvent(new GameLobbyErrorEvent(msg.code, msg.message));
    }
    // ResultConfirmed and RatingUpdated are informational; game can listen to events
  }

  #onClose(e) {
    this.#ws = null;
    this.#playerCount = 0;
    this.#setState("disconnected");
    this.startSignalling.set(null);

    if (this.reconnect && !this.signal.aborted) {
      this.#reconnectTimer = setTimeout(() => {
        if (!this.signal.aborted) this.#connect();
      }, RECONNECT_DELAY);
    }
  }

  #setState(name) {
    for (const s of [
      "connecting",
      "connected",
      "in-room",
      "in-queue",
      "signalling",
      "disconnected",
    ]) {
      this.#states.delete(s);
    }
    this.#states.add(name);
    this.#stat("lobby-state", name);
  }

  #stat(key, value) {
    this.#stats.set(key, value);
    this.dispatchEvent(new GameStatUpdateEvent(key, value));
  }

  #republishStats() {
    for (const [key, value] of this.#stats) {
      this.dispatchEvent(new GameStatUpdateEvent(key, value));
    }
  }

  #send(msg) {
    if (this.#ws?.readyState === WebSocket.OPEN) {
      const wire = {
        ...msg,
        type: msg.type.replace(
          /([A-Z])/g,
          (_, c, i) => (i ? "_" : "") + c.toLowerCase(),
        ),
      };
      this.#ws.send(JSON.stringify(wire));
    }
  }

  #relaySdp(target, sdp, type) {
    const msgType = type === "offer" ? "SdpOffer" : "SdpAnswer";
    this.#send({ type: msgType, target, sdp });
  }

  #relayIce(target, candidate) {
    this.#send({ type: "IceCandidate", target, candidate });
  }

  #requestIceServers() {
    this.#send({ type: "RequestIceServers" });
  }

  #reportResult(opponent, outcome) {
    this.#send({ type: "ReportResult", opponent, outcome });
  }
}
