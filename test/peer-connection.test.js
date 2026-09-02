import { assert } from "@open-wc/testing";
import "../src/auto.js";
import GameLobby, { gameLobbyContext } from "../src/lobby.js";
import GamePeerConnection from "../src/peer-connection.js";
import {
  GamePeerConnectionOpenEvent,
  GamePeerConnectionCloseEvent,
  GamePeerConnectionMessageEvent,
  GameLobbyPlayerEvent,
} from "../src/events.js";
import { Signal } from "../src/signals.js";

if (!customElements.get("game-lobby")) GameLobby.define("game-lobby");
if (!customElements.get("game-peer-connection"))
  GamePeerConnection.define("game-peer-connection");

const tick = () => new Promise((r) => setTimeout(r, 0));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// --- Mock RTCPeerConnection ---

class MockDataChannel extends EventTarget {
  readyState = "connecting";
  sent = [];
  label = "";

  constructor(label) {
    super();
    this.label = label;
  }

  send(data) {
    this.sent.push(data);
  }

  close() {
    this.readyState = "closed";
    this.dispatchEvent(new Event("close"));
  }

  open() {
    this.readyState = "open";
    this.dispatchEvent(new Event("open"));
  }
}

class MockRTCPeerConnection extends EventTarget {
  localDescription = null;
  remoteDescription = null;
  iceConnectionState = "new";
  connectionState = "new";
  iceCandidates = [];
  channels = [];

  #localOffer = null;
  #localAnswer = null;

  async createOffer() {
    this.#localOffer = { type: "offer", sdp: "mock-offer-sdp" };
    return this.#localOffer;
  }

  async createAnswer() {
    this.#localAnswer = { type: "answer", sdp: "mock-answer-sdp" };
    return this.#localAnswer;
  }

  async setLocalDescription(desc) {
    this.localDescription = desc;
  }

  async setRemoteDescription(desc) {
    this.remoteDescription = desc;
  }

  async addIceCandidate(candidate) {
    this.iceCandidates.push(candidate);
  }

  createDataChannel(label, opts) {
    const ch = new MockDataChannel(label);
    this.channels.push(ch);
    return ch;
  }

  async getStats() {
    const m = new Map();
    m.set("pair1", {
      type: "candidate-pair",
      state: "succeeded",
      currentRoundTripTime: 0.05,
    });
    return m;
  }

  close() {
    this.connectionState = "closed";
  }

  // Test helper: simulate receiving a data channel (answerer side)
  receiveDataChannel(channel) {
    this.dispatchEvent(Object.assign(new Event("datachannel"), { channel }));
  }

  // Test helper: simulate ICE state change
  setIceState(state) {
    this.iceConnectionState = state;
    this.dispatchEvent(new Event("iceconnectionstatechange"));
  }
}

let OriginalRTCPeerConnection;
let lastPc;

function makeLobbyContext(overrides = {}) {
  const sdpCallbacks = new Set();
  const iceCallbacks = new Set();
  const iceServerCallbacks = new Set();
  const startSignalling = new Signal.State(null);
  const playerId = new Signal.State("player-a");

  return {
    relaySdp: overrides.relaySdp ?? (() => {}),
    relayIce: overrides.relayIce ?? (() => {}),
    requestIceServers:
      overrides.requestIceServers ??
      (() => {
        // Auto-respond with empty servers
        queueMicrotask(() => {
          for (const cb of iceServerCallbacks) cb([]);
        });
      }),
    reportResult: overrides.reportResult ?? (() => {}),
    onSdp: (cb) => sdpCallbacks.add(cb),
    offSdp: (cb) => sdpCallbacks.delete(cb),
    onIceCandidate: (cb) => iceCallbacks.add(cb),
    offIceCandidate: (cb) => iceCallbacks.delete(cb),
    onIceServers: (cb) => iceServerCallbacks.add(cb),
    offIceServers: (cb) => iceServerCallbacks.delete(cb),
    startSignalling,
    playerId,
    // Test helpers
    _sdpCallbacks: sdpCallbacks,
    _iceCallbacks: iceCallbacks,
    _iceServerCallbacks: iceServerCallbacks,
  };
}

async function setup(lobbyCtx) {
  // Create shell first, then inject context provider, then append match.
  // This ensures the ContextProvider is in place before game-peer-connection's
  // connectedCallback fires and dispatches context-request.
  document.body.innerHTML = `<game-shell rounds="3" between-delay="0"></game-shell>`;
  const shell = document.querySelector("game-shell");
  const { ContextProvider } = await import("../src/context.js");
  new ContextProvider(shell, gameLobbyContext, lobbyCtx);
  const match = document.createElement("game-peer-connection");
  shell.appendChild(match);
  await tick();
  return { shell, match };
}

describe("GamePeerConnection", () => {
  beforeEach(() => {
    OriginalRTCPeerConnection = globalThis.RTCPeerConnection;
    globalThis.RTCPeerConnection = class extends MockRTCPeerConnection {
      constructor(...args) {
        super(...args);
        lastPc = this;
      }
    };
  });

  afterEach(() => {
    globalThis.RTCPeerConnection = OriginalRTCPeerConnection;
    document.body.innerHTML = "";
    localStorage.clear();
    sessionStorage.clear();
    history.replaceState(null, "", location.pathname);
    lastPc = null;
  });

  it("starts in :state(idle)", async () => {
    const ctx = makeLobbyContext();
    const { match } = await setup(ctx);
    // Not in playing scene yet, effectCallback hasn't started WebRTC
    assert.ok(match.matches(":state(idle)"));
  });

  it("starts WebRTC signalling when startSignalling fires during playing scene", async () => {
    const ctx = makeLobbyContext();
    const { shell } = await setup(ctx);
    ctx.playerId.set("player-a");
    shell.start();
    await tick();
    ctx.startSignalling.set({
      players: [{ id: "player-a" }, { id: "player-b" }],
      code: "ROOM1",
    });
    await tick();
    await tick(); // iceServers promise
    await tick();
    assert.ok(lastPc, "RTCPeerConnection was created");
  });

  it("offerer creates two DataChannels (reliable + unreliable)", async () => {
    const ctx = makeLobbyContext();
    const { shell } = await setup(ctx);
    ctx.playerId.set("player-a"); // offerer
    shell.start();
    await tick();
    ctx.startSignalling.set({
      players: [{ id: "player-a" }, { id: "player-b" }],
      code: null,
    });
    await tick();
    await tick();
    await tick();
    assert.equal(lastPc.channels.length, 2, "two DataChannels created");
    const labels = lastPc.channels.map((c) => c.label);
    assert.ok(labels.includes("reliable"), "reliable channel created");
    assert.ok(labels.includes("unreliable"), "unreliable channel created");
  });

  it("offerer (lower ID) creates offer and sends via relaySdp", async () => {
    const relayed = [];
    const ctx = makeLobbyContext({
      relaySdp: (t, s, type) => relayed.push({ t, s, type }),
    });
    const { shell } = await setup(ctx);
    ctx.playerId.set("player-a"); // "player-a" < "player-b" -> offerer
    shell.start();
    await tick();
    ctx.startSignalling.set({
      players: [{ id: "player-a" }, { id: "player-b" }],
      code: null,
    });
    await tick();
    await tick(); // iceServers resolved
    await tick();
    assert.ok(relayed.length > 0, "relaySdp was called");
    assert.equal(relayed[0].type, "offer");
    assert.equal(relayed[0].t, "player-b");
    assert.equal(relayed[0].s, "mock-offer-sdp");
  });

  it("answerer (higher ID) does not create offer", async () => {
    const relayed = [];
    const ctx = makeLobbyContext({
      relaySdp: (t, s, type) => relayed.push({ t, s, type }),
    });
    const { shell } = await setup(ctx);
    ctx.playerId.set("player-z"); // "player-z" > "player-a" -> answerer
    shell.start();
    await tick();
    ctx.startSignalling.set({
      players: [{ id: "player-a" }, { id: "player-z" }],
      code: null,
    });
    await tick();
    await tick();
    await tick();
    const offers = relayed.filter((r) => r.type === "offer");
    assert.equal(offers.length, 0, "answerer must not send offer");
  });

  it("answerer sends answer when SdpOffer received", async () => {
    const relayed = [];
    const ctx = makeLobbyContext({
      relaySdp: (t, s, type) => relayed.push({ t, s, type }),
    });
    const { shell } = await setup(ctx);
    ctx.playerId.set("player-z"); // answerer
    shell.start();
    await tick();
    ctx.startSignalling.set({
      players: [{ id: "player-a" }, { id: "player-z" }],
      code: null,
    });
    await tick();
    await tick();
    await tick();
    // Simulate incoming offer from player-a
    for (const cb of ctx._sdpCallbacks) {
      await cb({ from: "player-a", sdp: "mock-offer-sdp", type: "offer" });
    }
    await tick();
    const answers = relayed.filter((r) => r.type === "answer");
    assert.ok(answers.length > 0, "answerer should send answer");
    assert.equal(answers[0].t, "player-a");
  });

  it("fires GamePeerConnectionOpenEvent when both DataChannels open (offerer)", async () => {
    const ctx = makeLobbyContext();
    const { shell, match } = await setup(ctx);
    ctx.playerId.set("player-a");
    shell.start();
    await tick();
    ctx.startSignalling.set({
      players: [{ id: "player-a" }, { id: "player-b" }],
      code: null,
    });
    await tick();
    await tick();
    await tick();
    assert.ok(lastPc, "RTCPeerConnection created");
    assert.equal(lastPc.channels.length, 2, "two DataChannels created");

    let event;
    match.addEventListener("game-peer-connection-open", (e) => (event = e), {
      once: true,
    });
    // Open first channel — event should NOT fire yet
    lastPc.channels[0].open();
    assert.ok(!event, "open should not fire with only one channel open");
    // Open second channel — event should fire now
    lastPc.channels[1].open();
    assert.ok(
      event instanceof GamePeerConnectionOpenEvent,
      "GamePeerConnectionOpenEvent fired",
    );
    assert.equal(event.peerId, "player-b");
  });

  it("sets :state(connected) only when both DataChannels open", async () => {
    const ctx = makeLobbyContext();
    const { shell, match } = await setup(ctx);
    ctx.playerId.set("player-a");
    shell.start();
    await tick();
    ctx.startSignalling.set({
      players: [{ id: "player-a" }, { id: "player-b" }],
      code: null,
    });
    await tick();
    await tick();
    await tick();
    lastPc.channels[0].open();
    assert.ok(
      !match.matches(":state(connected)"),
      "not connected with one channel",
    );
    lastPc.channels[1].open();
    assert.ok(match.matches(":state(connected)"), "connected when both open");
  });

  it("fires GamePeerConnectionCloseEvent when reliable DataChannel closes", async () => {
    const ctx = makeLobbyContext();
    const { shell, match } = await setup(ctx);
    ctx.playerId.set("player-a");
    shell.start();
    await tick();
    ctx.startSignalling.set({
      players: [{ id: "player-a" }, { id: "player-b" }],
      code: null,
    });
    await tick();
    await tick();
    await tick();
    lastPc.channels[0].open();
    lastPc.channels[1].open();

    let event;
    match.addEventListener("game-peer-connection-close", (e) => (event = e), {
      once: true,
    });
    lastPc.channels[0].close();
    assert.ok(event instanceof GamePeerConnectionCloseEvent);
    assert.equal(event.peerId, "player-b");
  });

  it("fires GamePeerConnectionMessageEvent on reliable channel message", async () => {
    const ctx = makeLobbyContext();
    const { shell, match } = await setup(ctx);
    ctx.playerId.set("player-a");
    shell.start();
    await tick();
    ctx.startSignalling.set({
      players: [{ id: "player-a" }, { id: "player-b" }],
      code: null,
    });
    await tick();
    await tick();
    await tick();
    const reliableCh = lastPc.channels.find((c) => c.label === "reliable");
    const unreliableCh = lastPc.channels.find((c) => c.label === "unreliable");
    reliableCh.open();
    unreliableCh.open();

    let received;
    match.addEventListener(
      "game-peer-connection-message",
      (e) => (received = e),
      { once: true },
    );
    reliableCh.dispatchEvent(
      new MessageEvent("message", { data: JSON.stringify({ hello: "world" }) }),
    );
    assert.ok(received instanceof GamePeerConnectionMessageEvent);
    assert.deepEqual(received.data, { hello: "world" });
    assert.equal(received.channel, "reliable");
    assert.equal(received.peerId, "player-b");
  });

  it("fires GamePeerConnectionMessageEvent on unreliable channel message", async () => {
    const ctx = makeLobbyContext();
    const { shell, match } = await setup(ctx);
    ctx.playerId.set("player-a");
    shell.start();
    await tick();
    ctx.startSignalling.set({
      players: [{ id: "player-a" }, { id: "player-b" }],
      code: null,
    });
    await tick();
    await tick();
    await tick();
    const reliableCh = lastPc.channels.find((c) => c.label === "reliable");
    const unreliableCh = lastPc.channels.find((c) => c.label === "unreliable");
    reliableCh.open();
    unreliableCh.open();

    let received;
    match.addEventListener(
      "game-peer-connection-message",
      (e) => (received = e),
      { once: true },
    );
    unreliableCh.dispatchEvent(
      new MessageEvent("message", { data: JSON.stringify({ pos: [1, 2] }) }),
    );
    assert.ok(received instanceof GamePeerConnectionMessageEvent);
    assert.equal(received.channel, "unreliable");
  });

  it("send() sends on reliable channel by default", async () => {
    const ctx = makeLobbyContext();
    const { shell, match } = await setup(ctx);
    ctx.playerId.set("player-a");
    shell.start();
    await tick();
    ctx.startSignalling.set({
      players: [{ id: "player-a" }, { id: "player-b" }],
      code: null,
    });
    await tick();
    await tick();
    await tick();
    const reliableCh = lastPc.channels.find((c) => c.label === "reliable");
    const unreliableCh = lastPc.channels.find((c) => c.label === "unreliable");
    reliableCh.open();
    unreliableCh.open();
    match.send({ action: "move", x: 5 });
    assert.equal(reliableCh.sent.length, 1);
    assert.equal(unreliableCh.sent.length, 0);
    assert.deepEqual(JSON.parse(reliableCh.sent[0]), { action: "move", x: 5 });
  });

  it("send({ reliable: false }) sends on unreliable channel", async () => {
    const ctx = makeLobbyContext();
    const { shell, match } = await setup(ctx);
    ctx.playerId.set("player-a");
    shell.start();
    await tick();
    ctx.startSignalling.set({
      players: [{ id: "player-a" }, { id: "player-b" }],
      code: null,
    });
    await tick();
    await tick();
    await tick();
    const reliableCh = lastPc.channels.find((c) => c.label === "reliable");
    const unreliableCh = lastPc.channels.find((c) => c.label === "unreliable");
    reliableCh.open();
    unreliableCh.open();
    match.send({ pos: [1, 2] }, { reliable: false });
    assert.equal(unreliableCh.sent.length, 1);
    assert.equal(reliableCh.sent.length, 0);
    assert.deepEqual(JSON.parse(unreliableCh.sent[0]), { pos: [1, 2] });
  });

  it("sets match-state stat to connected when both DataChannels open", async () => {
    const ctx = makeLobbyContext();
    const { shell, match } = await setup(ctx);
    ctx.playerId.set("player-a");
    shell.start();
    await tick();
    ctx.startSignalling.set({
      players: [{ id: "player-a" }, { id: "player-b" }],
      code: null,
    });
    await tick();
    await tick();
    await tick();
    const stats = [];
    match.addEventListener("game-stat-update", (e) => stats.push(e));
    lastPc.channels[0].open();
    lastPc.channels[1].open();
    const matchState = stats.filter((e) => e.key === "peer-state").at(-1);
    assert.equal(matchState?.value, "connected");
  });

  it("buffers ICE candidates received before remote description is set", async () => {
    const ctx = makeLobbyContext();
    const { shell } = await setup(ctx);
    ctx.playerId.set("player-z"); // answerer
    shell.start();
    await tick();
    ctx.startSignalling.set({
      players: [{ id: "player-a" }, { id: "player-z" }],
      code: null,
    });
    await tick();
    await tick();
    await tick();
    // Send ICE before SDP offer
    for (const cb of ctx._iceCallbacks) {
      cb({ from: "player-a", candidate: { candidate: "mock-ice" } });
    }
    assert.equal(
      lastPc.iceCandidates.length,
      0,
      "candidate not applied yet (no remote desc)",
    );
    // Now send SDP offer (triggers flush of buffered candidates)
    for (const cb of ctx._sdpCallbacks) {
      await cb({ from: "player-a", sdp: "mock-offer-sdp", type: "offer" });
    }
    await tick();
    assert.equal(
      lastPc.iceCandidates.length,
      1,
      "buffered candidate flushed after remote desc",
    );
  });

  it("requests ICE servers on WebRTC start", async () => {
    let requested = false;
    const ctx = makeLobbyContext({
      requestIceServers: () => {
        requested = true;
      },
    });
    const { shell } = await setup(ctx);
    ctx.playerId.set("player-a");
    shell.start();
    await tick();
    ctx.startSignalling.set({
      players: [{ id: "player-a" }, { id: "player-b" }],
      code: null,
    });
    await tick();
    await tick();
    assert.ok(requested, "requestIceServers should be called");
  });

  it("tears down on close()", async () => {
    const ctx = makeLobbyContext();
    const { shell, match } = await setup(ctx);
    ctx.playerId.set("player-a");
    shell.start();
    await tick();
    ctx.startSignalling.set({
      players: [{ id: "player-a" }, { id: "player-b" }],
      code: null,
    });
    await tick();
    await tick();
    await tick();
    lastPc.channels[0].open();
    lastPc.channels[1].open();
    match.close();
    assert.ok(match.matches(":state(idle)"));
  });

  it("drops the connection with reason 'left' when the peer leaves the room", async () => {
    const ctx = makeLobbyContext();
    const { shell, match } = await setup(ctx);
    ctx.playerId.set("player-a");
    shell.start();
    await tick();
    ctx.startSignalling.set({
      players: [{ id: "player-a" }, { id: "player-b" }],
      code: null,
    });
    await tick();
    await tick();
    await tick();
    lastPc.channels[0].open();
    lastPc.channels[1].open();
    match.ready();

    const events = [];
    match.addEventListener("game-peer-connection-close", (e) => events.push(e));
    shell.dispatchEvent(new GameLobbyPlayerEvent("left", { id: "player-c" }));
    assert.equal(events.length, 0, "ignores other players");
    shell.dispatchEvent(new GameLobbyPlayerEvent("left", { id: "player-b" }));
    assert.equal(events.length, 1);
    assert.equal(events[0].peerId, "player-b");
    assert.equal(events[0].reason, "left");
    assert.ok(match.matches(":state(disconnected)"));
    assert.notOk(match.matches(":state(ready)"));
    assert.equal(match.peerId, null);
    assert.equal(lastPc.connectionState, "closed");
    await tick();
    assert.equal(events.length, 1, "closing our own channels fires nothing");
  });

  it("closes when the shell quits", async () => {
    const ctx = makeLobbyContext();
    const { shell, match } = await setup(ctx);
    ctx.playerId.set("player-a");
    shell.start();
    await tick();
    ctx.startSignalling.set({
      players: [{ id: "player-a" }, { id: "player-b" }],
      code: null,
    });
    await tick();
    await tick();
    await tick();
    lastPc.channels[0].open();
    lastPc.channels[1].open();

    const events = [];
    match.addEventListener("game-peer-connection-close", (e) => events.push(e));
    shell.quit();
    await tick();
    assert.equal(shell.scene.get(), "ready");
    assert.ok(match.matches(":state(idle)"));
    assert.equal(lastPc.connectionState, "closed");
    assert.equal(events.length, 0);
  });

  it("peerId getter returns remote player ID after signalling", async () => {
    const ctx = makeLobbyContext();
    const { shell, match } = await setup(ctx);
    ctx.playerId.set("player-a");
    assert.equal(match.peerId, null, "null before signalling");
    shell.start();
    await tick();
    ctx.startSignalling.set({
      players: [{ id: "player-a" }, { id: "player-b" }],
      code: null,
    });
    await tick();
    await tick();
    await tick();
    assert.equal(match.peerId, "player-b");
  });

  it("connected getter is false until both channels open", async () => {
    const ctx = makeLobbyContext();
    const { shell, match } = await setup(ctx);
    ctx.playerId.set("player-a");
    shell.start();
    await tick();
    ctx.startSignalling.set({
      players: [{ id: "player-a" }, { id: "player-b" }],
      code: null,
    });
    await tick();
    await tick();
    await tick();
    assert.ok(!match.connected, "false before any channel opens");
    lastPc.channels[0].open();
    assert.ok(!match.connected, "false with one channel open");
    lastPc.channels[1].open();
    assert.ok(match.connected, "true when both open");
  });

  it("localPlayerId getter returns player ID from lobby context", async () => {
    const ctx = makeLobbyContext();
    const { match } = await setup(ctx);
    ctx.playerId.set("player-x");
    await tick();
    assert.equal(match.localPlayerId, "player-x");
  });

  it("close() resets #watching so reconnection is possible", async () => {
    const ctx = makeLobbyContext();
    const { shell, match } = await setup(ctx);
    ctx.playerId.set("player-a");
    shell.start();
    await tick();
    ctx.startSignalling.set({
      players: [{ id: "player-a" }, { id: "player-b" }],
      code: null,
    });
    await tick();
    await tick();
    await tick();
    lastPc.channels[0].open();
    lastPc.channels[1].open();

    // Close and reset signalling signal
    match.close();
    ctx.startSignalling.set(null);
    assert.ok(match.matches(":state(idle)"));

    // Fire startSignalling again — should create a new RTCPeerConnection
    const firstPc = lastPc;
    ctx.startSignalling.set({
      players: [{ id: "player-a" }, { id: "player-b" }],
      code: null,
    });
    await tick();
    await tick();
    await tick();
    assert.notEqual(
      lastPc,
      firstPc,
      "new RTCPeerConnection created after close+reconnect",
    );
  });

  it("emits latency stat as null on teardown", async () => {
    const ctx = makeLobbyContext();
    const { shell, match } = await setup(ctx);
    ctx.playerId.set("player-a");
    shell.start();
    await tick();
    ctx.startSignalling.set({
      players: [{ id: "player-a" }, { id: "player-b" }],
      code: null,
    });
    await tick();
    await tick();
    await tick();
    lastPc.channels[0].open();
    lastPc.channels[1].open();

    const stats = [];
    match.addEventListener("game-stat-update", (e) => stats.push(e));
    match.close();
    const latencyStat = stats.filter((e) => e.key === "latency").at(-1);
    assert.equal(latencyStat?.value, null);
    assert.equal(match.latency, null);
  });

  it("announces open for a channel that is already open when handed over", async () => {
    const ctx = makeLobbyContext();
    const { shell, match } = await setup(ctx);
    ctx.playerId.set("player-z"); // answerer: channels arrive via ondatachannel
    shell.start();
    await tick();
    ctx.startSignalling.set({
      players: [{ id: "player-a" }, { id: "player-z" }],
      code: null,
    });
    await tick();
    await tick();
    await tick();

    let opened = null;
    match.addEventListener(
      "game-peer-connection-open",
      (e) => (opened = e.peerId),
    );

    // Both channels are already open by the time the answerer sees them.
    const reliable = new MockDataChannel("reliable");
    const unreliable = new MockDataChannel("unreliable");
    reliable.readyState = "open";
    unreliable.readyState = "open";
    lastPc.receiveDataChannel(reliable);
    lastPc.receiveDataChannel(unreliable);

    assert.equal(opened, "player-a");
    assert.ok(match.matches(":state(connected)"));
  });

  it("fires game-peer-connection-open once when both channels open", async () => {
    const ctx = makeLobbyContext();
    const { shell, match } = await setup(ctx);
    ctx.playerId.set("player-a");
    shell.start();
    await tick();
    ctx.startSignalling.set({
      players: [{ id: "player-a" }, { id: "player-b" }],
      code: null,
    });
    await tick();
    await tick();
    await tick();

    let count = 0;
    match.addEventListener("game-peer-connection-open", () => count++);
    lastPc.channels[0].open();
    lastPc.channels[1].open();
    assert.equal(count, 1);
  });

  it("ready() sets :state(ready) until both peers are ready", async () => {
    const ctx = makeLobbyContext();
    const { shell, match } = await setup(ctx);
    ctx.playerId.set("player-a");
    shell.start();
    await tick();
    ctx.startSignalling.set({
      players: [{ id: "player-a" }, { id: "player-b" }],
      code: null,
    });
    await tick();
    await tick();
    await tick();
    const [reliable, unreliable] = lastPc.channels;
    reliable.open();
    unreliable.open();

    match.ready();
    assert.ok(match.matches(":state(ready)"));
    assert.deepEqual(JSON.parse(reliable.sent.at(-1)), { __ready: true });

    reliable.dispatchEvent(
      new MessageEvent("message", { data: JSON.stringify({ __ready: true }) }),
    );
    assert.notOk(match.matches(":state(ready)"));
  });

  it("ready() can be called again for a rematch", async () => {
    const ctx = makeLobbyContext();
    const { shell, match } = await setup(ctx);
    ctx.playerId.set("player-a");
    shell.start();
    await tick();
    ctx.startSignalling.set({
      players: [{ id: "player-a" }, { id: "player-b" }],
      code: null,
    });
    await tick();
    await tick();
    await tick();
    const [reliable, unreliable] = lastPc.channels;
    reliable.open();
    unreliable.open();

    let starts = 0;
    match.addEventListener("game-start-request", () => starts++);
    const peerReady = () =>
      reliable.dispatchEvent(
        new MessageEvent("message", {
          data: JSON.stringify({ __ready: true }),
        }),
      );

    match.ready();
    peerReady();
    assert.equal(starts, 1);

    match.ready();
    peerReady();
    assert.equal(starts, 2, "second handshake starts a rematch");
  });

  it("sends readiness set before the channels opened", async () => {
    const ctx = makeLobbyContext();
    const { shell, match } = await setup(ctx);
    ctx.playerId.set("player-a");
    shell.start();
    await tick();
    ctx.startSignalling.set({
      players: [{ id: "player-a" }, { id: "player-b" }],
      code: null,
    });
    await tick();
    await tick();
    await tick();
    const [reliable, unreliable] = lastPc.channels;

    match.ready();
    assert.equal(reliable.sent.length, 0, "nothing sent while closed");

    reliable.open();
    unreliable.open();
    assert.deepEqual(JSON.parse(reliable.sent.at(-1)), { __ready: true });
  });

  it("republishes its stats when the shell wipes them on start", async () => {
    const ctx = makeLobbyContext();
    const { shell, match } = await setup(ctx);
    ctx.playerId.set("player-a");
    shell.start();
    await tick();
    ctx.startSignalling.set({
      players: [{ id: "player-a" }, { id: "player-b" }],
      code: null,
    });
    await tick();
    await tick();
    await tick();
    lastPc.channels[0].open();
    lastPc.channels[1].open();
    assert.equal(shell.stats.get()["peer-id"], "player-b");

    shell.start();
    await tick();
    assert.equal(
      shell.stats.get()["peer-id"],
      "player-b",
      "peer-id survives the stats wipe",
    );
    assert.equal(shell.stats.get()["peer-state"], "connected");
  });
});
