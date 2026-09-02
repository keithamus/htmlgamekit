import GameComponent from "./component.js";
import { gameLobbyContext } from "./lobby.js";
import {
  GamePeerConnectionOpenEvent,
  GamePeerConnectionCloseEvent,
  GamePeerConnectionMessageEvent,
  GamePeerConnectionIceEvent,
  GameStatUpdateEvent,
  GameStartRequestEvent,
} from "./events.js";
import { effect } from "./signals.js";

const LATENCY_INTERVAL = 2000;

/**
 * Manages a WebRTC peer connection with two DataChannels (reliable + unreliable),
 * wired to a `<game-lobby>` sibling via the lobby context for SDP and ICE relay.
 *
 * Role (offerer vs answerer) is determined by lexicographic comparison of
 * player IDs: lower ID = offerer. Both peers agree without coordination.
 *
 * @summary WebRTC DataChannel peer connection component
 * @fires {GamePeerConnectionOpenEvent} game-peer-connection-open - Both DataChannels open and ready
 * @fires {GamePeerConnectionCloseEvent} game-peer-connection-close - DataChannel closed or the peer left the room
 * @fires {GamePeerConnectionMessageEvent} game-peer-connection-message - Message received from peer
 * @fires {GamePeerConnectionIceEvent} game-peer-connection-ice - ICE connection state changed
 * @cssState idle - No connection in progress
 * @cssState signalling - Exchanging SDP and ICE
 * @cssState connecting - ICE connecting
 * @cssState connected - Both DataChannels open
 * @cssState disconnected - Connection lost
 * @cssState ready - Local player signalled readiness, waiting for the peer
 * @attr {boolean} [auto-ready] - Automatically call ready() when both channels open; fires game-start-request once peer also ready
 */
export default class GamePeerConnection extends GameComponent {
  static template = null;

  static attrs = {
    "reliable-label": { type: "string", default: "reliable" },
    "unreliable-label": { type: "string", default: "unreliable" },
    "max-retransmits": { type: "long", default: 0 },
    "auto-ready": { type: "boolean" },
  };

  static define(tag = "game-peer-connection", registry = customElements) {
    super.define(tag, registry);
  }

  #states = null;
  #pc = null;
  #connAbort = null;
  #reliableChannel = null;
  #unreliableChannel = null;
  #lobby = null;
  #latencyTimer = null;
  #pendingCandidates = [];
  #watching = false;
  #peerId = null;
  #latency = null;
  #localReady = false;
  #remoteReady = false;
  #opened = false;
  #stats = new Map();

  /** Remote player ID, or null if not connected. */
  get peerId() {
    return this.#peerId;
  }

  /** True when both DataChannels are open. */
  get connected() {
    return (
      this.#reliableChannel?.readyState === "open" &&
      this.#unreliableChannel?.readyState === "open"
    );
  }

  /** Last measured round-trip latency in ms, or null if unavailable. */
  get latency() {
    return this.#latency;
  }

  /** Our own player ID as assigned by the lobby. */
  get localPlayerId() {
    return this.#lobby?.playerId.get() ?? null;
  }

  constructor() {
    super();
    this.#states = this.attachInternals().states;
  }

  connectedCallback() {
    super.connectedCallback();
    this.#setState("idle");
    this.addEventListener(
      "command",
      (e) => {
        if (e.command === "--peer-ready") this.ready();
      },
      { signal: this.signal },
    );
    this.subscribe(gameLobbyContext, (lobby) => {
      this.#lobby = lobby;
      if (!this.#watching) {
        this.#watching = true;
        this.#watchLobby();
      }
    });
    this.shell?.addEventListener(
      "game-lifecycle",
      (e) => {
        if (e.action === "setup") this.#republishStats();
        else if (e.action === "quit") this.close();
      },
      { signal: this.signal },
    );
    this.shell?.addEventListener(
      "game-lobby-player",
      (e) => {
        if (e.action === "left" && e.player.id === this.#peerId)
          this.#lost("left");
      },
      { signal: this.signal },
    );
  }

  disconnectedCallback() {
    this.#teardown();
    super.disconnectedCallback();
  }

  /**
   * Signal readiness to start. When both peers are ready, dispatches
   * `game-start-request` to the shell and clears both readiness flags, so a
   * later call starts a rematch. Equivalent to the `--peer-ready` command.
   *
   * Calling this before the DataChannels open is safe: readiness is sent to
   * the peer as soon as the connection opens.
   */
  ready() {
    if (this.#localReady) return;
    this.#localReady = true;
    this.#states.add("ready");
    this.send({ __ready: true });
    this.#checkBothReady();
  }

  /**
   * Send data to the peer over a DataChannel.
   * Data is JSON-serialised if not already a string.
   * @param {any} data
   * @param {{ reliable?: boolean }} [opts]
   */
  send(data, { reliable = true } = {}) {
    const channel = reliable ? this.#reliableChannel : this.#unreliableChannel;
    if (!channel || channel.readyState !== "open") return;
    const payload = typeof data === "string" ? data : JSON.stringify(data);
    channel.send(payload);
  }

  /**
   * Close the peer connection and reset to idle. Fires no
   * `game-peer-connection-close` event; the peer is told by its own
   * DataChannels closing.
   */
  close() {
    this.#teardown();
  }

  /**
   * Report match result via the lobby signalling channel.
   * @param {string} opponent
   * @param {"win"|"loss"|"draw"} outcome
   */
  reportResult(opponent, outcome) {
    this.#lobby?.reportResult(opponent, outcome);
  }

  #watchLobby() {
    const lobby = this.#lobby;
    if (!lobby) return;

    effect(
      () => {
        const payload = lobby.startSignalling.get();
        if (payload && !this.#connAbort) {
          this.#startWebRTC(payload, lobby);
        }
      },
      { signal: this.signal },
    );
  }

  async #startWebRTC(payload, lobby) {
    if (this.#connAbort) return;
    this.#setState("signalling");

    const myId = lobby.playerId.get();
    const peers = payload.players.filter((p) => p.id !== myId);
    const peerId = peers[0]?.id;
    if (!peerId) return;

    this.#peerId = peerId;
    this.#stat("peer-id", peerId);
    const abort = new AbortController();
    this.#connAbort = abort;
    const { signal } = abort;

    // Request ICE servers first
    lobby.requestIceServers();

    const iceServers = await new Promise((resolve) => {
      const onServers = (servers) => {
        lobby.offIceServers(onServers);
        resolve(servers);
      };
      lobby.onIceServers(onServers);
      // Fallback: proceed with no STUN after 3s
      setTimeout(() => {
        lobby.offIceServers(onServers);
        resolve([]);
      }, 3000);
    });

    if (signal.aborted) return;
    const pc = new RTCPeerConnection({ iceServers });
    this.#pc = pc;

    const isOfferer = myId < peerId;

    // Wire SDP/ICE callbacks from lobby
    const onSdp = async ({ from, sdp, type }) => {
      if (from !== peerId) return;
      try {
        await pc.setRemoteDescription({ type, sdp });
        // Flush pending candidates
        for (const c of this.#pendingCandidates) {
          await pc.addIceCandidate(c).catch(() => {});
        }
        this.#pendingCandidates = [];
        if (type === "offer") {
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          lobby.relaySdp(peerId, answer.sdp, "answer");
        }
      } catch {
        // ignore negotiation errors
      }
    };
    lobby.onSdp(onSdp);
    signal.addEventListener("abort", () => lobby.offSdp(onSdp), {
      once: true,
    });

    const onIce = async ({ from, candidate }) => {
      if (from !== peerId) return;
      let parsed;
      try {
        parsed =
          typeof candidate === "string" ? JSON.parse(candidate) : candidate;
      } catch {
        return;
      }
      if (pc.remoteDescription) {
        await pc
          .addIceCandidate(parsed)
          .catch((e) => console.warn("[pc] addIceCandidate failed", e));
      } else {
        this.#pendingCandidates.push(parsed);
      }
    };
    lobby.onIceCandidate(onIce);
    signal.addEventListener("abort", () => lobby.offIceCandidate(onIce), {
      once: true,
    });

    // ICE candidate gathering
    pc.addEventListener(
      "icecandidate",
      (e) => {
        if (e.candidate) {
          lobby.relayIce(peerId, JSON.stringify(e.candidate.toJSON()));
        }
      },
      { signal },
    );

    pc.addEventListener(
      "iceconnectionstatechange",
      () => {
        const state = pc.iceConnectionState;
        if (state === "connected" || state === "completed") {
          this.#setState("connected");
        } else if (state === "failed" || state === "closed") {
          this.#setState("disconnected");
          this.dispatchEvent(new GamePeerConnectionIceEvent(state));
        } else {
          this.dispatchEvent(new GamePeerConnectionIceEvent(state));
        }
      },
      { signal },
    );

    if (isOfferer) {
      // Offerer creates both DataChannels
      const reliable = pc.createDataChannel(this.reliableLabel, {
        ordered: true,
      });
      const unreliable = pc.createDataChannel(this.unreliableLabel, {
        ordered: false,
        maxRetransmits: this.maxRetransmits,
      });
      this.#setupChannel(reliable, "reliable", signal);
      this.#setupChannel(unreliable, "unreliable", signal);

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      lobby.relaySdp(peerId, offer.sdp, "offer");
    } else {
      // Answerer receives DataChannels via ondatachannel
      pc.addEventListener(
        "datachannel",
        (e) => {
          const ch = e.channel;
          const role =
            ch.label === this.unreliableLabel ? "unreliable" : "reliable";
          this.#setupChannel(ch, role, signal);
        },
        { signal },
      );
    }
  }

  #setupChannel(channel, role, signal) {
    if (role === "reliable") {
      this.#reliableChannel = channel;
    } else {
      this.#unreliableChannel = channel;
    }

    channel.addEventListener("open", () => this.#announceOpen(), { signal });
    if (channel.readyState === "open") this.#announceOpen();

    channel.addEventListener(
      "close",
      () => {
        if (role === "reliable") {
          this.#lost("closed");
          return;
        }
        this.#opened = false;
        this.#setState("disconnected");
        this.#stopLatencyPolling();
        this.dispatchEvent(
          new GamePeerConnectionCloseEvent(this.#peerId, "unreliable-closed"),
        );
      },
      { signal },
    );

    channel.addEventListener(
      "message",
      (e) => {
        let data = e.data;
        try {
          data = JSON.parse(data);
        } catch {
          /* raw string */
        }
        // Internal ready handshake — not exposed as a message event
        if (data && typeof data === "object" && data.__ready) {
          this.#remoteReady = true;
          this.#checkBothReady();
          return;
        }
        this.dispatchEvent(
          new GamePeerConnectionMessageEvent(this.#peerId, role, data),
        );
      },
      { signal },
    );
  }

  #announceOpen() {
    if (this.#opened || !this.connected) return;
    this.#opened = true;
    this.#setState("connected");
    this.dispatchEvent(new GamePeerConnectionOpenEvent(this.#peerId));
    this.#startLatencyPolling();
    if (this.autoReady) this.ready();
    else if (this.#localReady) this.send({ __ready: true });
  }

  #startLatencyPolling() {
    this.#stopLatencyPolling();
    const sample = async () => {
      if (!this.#pc || this.#pc.connectionState === "closed") return;
      try {
        const stats = await this.#pc.getStats();
        for (const report of stats.values()) {
          if (
            report.type === "candidate-pair" &&
            report.state === "succeeded"
          ) {
            const rtt = Math.round((report.currentRoundTripTime ?? 0) * 1000);
            this.#latency = rtt;
            this.#stat("latency", rtt);
            break;
          }
        }
      } catch {
        /* ignore */
      }
    };
    sample();
    this.#latencyTimer = setInterval(sample, LATENCY_INTERVAL);
  }

  #stopLatencyPolling() {
    clearInterval(this.#latencyTimer);
    this.#latencyTimer = null;
  }

  #lost(reason) {
    const peerId = this.#peerId;
    this.#teardown();
    this.#setState("disconnected");
    this.dispatchEvent(new GamePeerConnectionCloseEvent(peerId, reason));
  }

  #teardown() {
    this.#stopLatencyPolling();
    this.#connAbort?.abort();
    this.#connAbort = null;
    if (this.#reliableChannel) {
      this.#reliableChannel.close();
      this.#reliableChannel = null;
    }
    if (this.#unreliableChannel) {
      this.#unreliableChannel.close();
      this.#unreliableChannel = null;
    }
    if (this.#pc) {
      this.#pc.close();
      this.#pc = null;
    }
    this.#pendingCandidates = [];
    this.#peerId = null;
    this.#latency = null;
    this.#localReady = false;
    this.#remoteReady = false;
    this.#opened = false;
    this.#states.delete("ready");
    this.#setState("idle");
    this.#stat("peer-id", "");
    this.#stat("latency", null);
  }

  #setState(name) {
    for (const s of [
      "idle",
      "signalling",
      "connecting",
      "connected",
      "disconnected",
    ]) {
      this.#states.delete(s);
    }
    this.#states.add(name);
    this.#stat("peer-state", name);
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

  #checkBothReady() {
    if (!this.#localReady || !this.#remoteReady) return;
    this.#localReady = false;
    this.#remoteReady = false;
    this.#states.delete("ready");
    this.dispatchEvent(new GameStartRequestEvent());
  }
}
