import { assert } from "@open-wc/testing";
import "../src/auto.js";
import GameLobby, { gameLobbyContext } from "../src/lobby.js";
import GamePeerConnection from "../src/peer-connection.js";
import { Signal } from "../src/signals.js";

if (!customElements.get("game-lobby")) GameLobby.define("game-lobby");
if (!customElements.get("game-peer-connection"))
  GamePeerConnection.define("game-peer-connection");

const tick = () => new Promise((r) => setTimeout(r, 0));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const SERVERS = [{ urls: "stun:stun.example:3478" }];

class MockDataChannel extends EventTarget {
  readyState = "connecting";
  constructor(label) {
    super();
    this.label = label;
  }
  send() {}
  close() {
    this.readyState = "closed";
    this.dispatchEvent(new Event("close"));
  }
  open() {
    this.readyState = "open";
    this.dispatchEvent(new Event("open"));
  }
}

class MockPc extends EventTarget {
  localDescription = null;
  remoteDescription = null;
  iceConnectionState = "new";
  connectionState = "new";
  channels = [];
  constructor(config) {
    super();
    this.config = config;
  }
  async createOffer() {
    return { type: "offer", sdp: "sdp" };
  }
  async createAnswer() {
    return { type: "answer", sdp: "sdp" };
  }
  async setLocalDescription(d) {
    this.localDescription = d;
  }
  async setRemoteDescription(d) {
    this.remoteDescription = d;
  }
  async addIceCandidate() {}
  createDataChannel(label) {
    const ch = new MockDataChannel(label);
    this.channels.push(ch);
    return ch;
  }
  async getStats() {
    return new Map();
  }
  close() {
    this.connectionState = "closed";
  }
}

/**
 * Lobby context whose ICE server reply is driven by `reply`, called with the
 * attempt number (1-based). Return an array to answer, or null to stay silent
 * so the element's per-attempt deadline expires.
 */
function makeLobby(reply) {
  const iceServerCallbacks = new Set();
  const registrations = [];
  const ctx = {
    attempts: 0,
    relaySdp: () => {},
    relayIce: () => {},
    reportResult: () => {},
    handoff: () => {},
    onSdp: () => {},
    offSdp: () => {},
    onIceCandidate: () => {},
    offIceCandidate: () => {},
    onIceServers: (cb) => {
      registrations.push("on");
      iceServerCallbacks.add(cb);
    },
    offIceServers: (cb) => iceServerCallbacks.delete(cb),
    startSignalling: new Signal.State(null),
    playerId: new Signal.State("player-a"),
    requestIceServers: () => {
      ctx.attempts++;
      registrations.push("request");
      const servers = reply(ctx.attempts);
      if (!servers) return;
      queueMicrotask(() => {
        for (const cb of [...iceServerCallbacks]) cb(servers);
      });
    },
    _registrations: registrations,
  };
  return ctx;
}

async function setup(ctx, attrs = {}) {
  document.body.innerHTML = `<game-shell rounds="1" between-delay="0"></game-shell>`;
  const shell = document.querySelector("game-shell");
  const { ContextProvider } = await import("../src/context.js");
  new ContextProvider(shell, gameLobbyContext, ctx);
  const match = document.createElement("game-peer-connection");
  for (const [k, v] of Object.entries(attrs)) match.setAttribute(k, v);
  shell.appendChild(match);
  await tick();
  shell.start();
  await tick();
  return { shell, match };
}

function signal(ctx) {
  ctx.startSignalling.set({
    players: [{ id: "player-a" }, { id: "player-b" }],
    code: "ROOM1",
  });
}

describe("GamePeerConnection ICE acquisition", () => {
  let Original;
  let lastPc;

  beforeEach(() => {
    Original = globalThis.RTCPeerConnection;
    lastPc = null;
    globalThis.RTCPeerConnection = class extends MockPc {
      constructor(...args) {
        super(...args);
        lastPc = this;
      }
    };
  });

  afterEach(() => {
    globalThis.RTCPeerConnection = Original;
    document.body.innerHTML = "";
    localStorage.clear();
    sessionStorage.clear();
    history.replaceState(null, "", location.pathname);
  });

  it("passes the returned ICE servers to the connection", async () => {
    const ctx = makeLobby(() => SERVERS);
    await setup(ctx, { "ice-timeout": "20" });
    signal(ctx);
    await wait(30);

    assert.deepEqual(lastPc.config.iceServers, SERVERS);
    assert.equal(ctx.attempts, 1);
  });

  it("registers its listener before asking, so a fast reply is not missed", async () => {
    const ctx = makeLobby(() => SERVERS);
    await setup(ctx, { "ice-timeout": "20" });
    signal(ctx);
    await wait(30);

    assert.equal(ctx._registrations[0], "on");
    assert.equal(ctx._registrations[1], "request");
  });

  it("retries when the lobby does not reply, and uses a later answer", async () => {
    const ctx = makeLobby((n) => (n < 3 ? null : SERVERS));
    await setup(ctx, { "ice-timeout": "20", "ice-attempts": "3" });
    signal(ctx);
    await wait(120);

    assert.equal(ctx.attempts, 3);
    assert.deepEqual(lastPc.config.iceServers, SERVERS);
  });

  it("stops after ice-attempts and proceeds with no servers", async () => {
    const ctx = makeLobby(() => null);
    const { match, shell } = await setup(ctx, {
      "ice-timeout": "10",
      "ice-attempts": "2",
    });
    const states = [];
    shell.addEventListener("game-peer-connection-ice", (e) =>
      states.push(e.state),
    );
    signal(ctx);
    await wait(120);

    assert.equal(ctx.attempts, 2);
    assert.deepEqual(lastPc.config.iceServers, []);
    assert.include(states, "no-servers");
    assert.equal(shell.stats.get()["ice-servers"], 0);
    assert.ok(match);
  });

  it("treats an empty reply as a failure worth retrying", async () => {
    const ctx = makeLobby((n) => (n === 1 ? [] : SERVERS));
    await setup(ctx, { "ice-timeout": "20", "ice-attempts": "3" });
    signal(ctx);
    await wait(60);

    assert.equal(ctx.attempts, 2);
    assert.deepEqual(lastPc.config.iceServers, SERVERS);
  });

  it("reports the server count as a stat", async () => {
    const ctx = makeLobby(() => SERVERS);
    const { shell } = await setup(ctx, { "ice-timeout": "20" });
    signal(ctx);
    await wait(30);

    assert.equal(shell.stats.get()["ice-servers"], 1);
  });
});

describe("GamePeerConnection handshake timeout", () => {
  let Original;
  let lastPc;

  beforeEach(() => {
    Original = globalThis.RTCPeerConnection;
    lastPc = null;
    globalThis.RTCPeerConnection = class extends MockPc {
      constructor(...args) {
        super(...args);
        lastPc = this;
      }
    };
  });

  afterEach(() => {
    globalThis.RTCPeerConnection = Original;
    document.body.innerHTML = "";
    localStorage.clear();
    sessionStorage.clear();
    history.replaceState(null, "", location.pathname);
  });

  it("abandons a handshake whose channels never open", async () => {
    const ctx = makeLobby(() => SERVERS);
    const { shell, match } = await setup(ctx, {
      "ice-timeout": "10",
      "connect-timeout": "60",
    });
    const closes = [];
    shell.addEventListener("game-peer-connection-close", (e) =>
      closes.push(e.reason),
    );
    signal(ctx);
    await wait(150);

    assert.deepEqual(closes, ["timeout"]);
    assert.ok(match.matches(":state(disconnected)"));
    assert.isFalse(match.connected);
  });

  it("does not fire once the channels are open", async () => {
    const ctx = makeLobby(() => SERVERS);
    const { shell } = await setup(ctx, {
      "ice-timeout": "10",
      "connect-timeout": "60",
    });
    const closes = [];
    const opens = [];
    shell.addEventListener("game-peer-connection-close", (e) =>
      closes.push(e.reason),
    );
    shell.addEventListener("game-peer-connection-open", () => opens.push(1));
    signal(ctx);
    await wait(30);

    for (const ch of lastPc.channels) ch.open();
    await wait(150);

    assert.deepEqual(opens, [1]);
    assert.deepEqual(closes, []);
  });

  it("waits for ever when connect-timeout is zero", async () => {
    const ctx = makeLobby(() => SERVERS);
    const { shell, match } = await setup(ctx, {
      "ice-timeout": "10",
      "connect-timeout": "0",
    });
    const closes = [];
    shell.addEventListener("game-peer-connection-close", (e) =>
      closes.push(e.reason),
    );
    signal(ctx);
    await wait(150);

    assert.deepEqual(closes, []);
    assert.ok(match.matches(":state(signalling)"));
  });
});
