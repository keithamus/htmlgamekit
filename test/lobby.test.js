import { assert } from "@open-wc/testing";
import "../src/auto.js";
import GameLobby, { gameLobbyContext } from "../src/lobby.js";
import { subscribe } from "../src/context.js";
import {
  GameLobbyConnectedEvent,
  GameLobbyRoomEvent,
  GameLobbyMatchEvent,
  GameLobbyQueueEvent,
  GameLobbyPlayerEvent,
  GameLobbyStartEvent,
  GameLobbyErrorEvent,
  GameStatUpdateEvent,
} from "../src/events.js";

if (!customElements.get("game-lobby")) GameLobby.define("game-lobby");

const tick = () => new Promise((r) => setTimeout(r, 0));

// --- MockWebSocket ---

class MockWebSocket extends EventTarget {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.CONNECTING;
  sent = [];
  url = "";

  constructor(url) {
    super();
    this.url = String(url);
    // Open asynchronously (mirrors real WS behaviour)
    queueMicrotask(() => {
      this.readyState = MockWebSocket.OPEN;
      this.dispatchEvent(new Event("open"));
    });
  }

  send(data) {
    this.sent.push(JSON.parse(data));
  }

  close() {
    this.readyState = MockWebSocket.CLOSED;
    this.dispatchEvent(new CloseEvent("close", { code: 1000 }));
  }

  /** Simulate a message arriving from the server */
  serverSend(msg) {
    this.dispatchEvent(
      new MessageEvent("message", { data: JSON.stringify(msg) }),
    );
  }
}

let OriginalWebSocket;
let lastWs;

function setup(attrs = "") {
  lastWs = null;
  document.body.innerHTML = `
    <game-shell game-id="mygame" rounds="3" between-delay="0">
      <game-lobby url="ws://test" ${attrs}></game-lobby>
    </game-shell>
  `;
}

describe("GameLobby", () => {
  beforeEach(() => {
    OriginalWebSocket = globalThis.WebSocket;
    globalThis.WebSocket = class extends MockWebSocket {
      constructor(url) {
        super(url);
        lastWs = this;
      }
    };
    // Copy static constants
    globalThis.WebSocket.CONNECTING = MockWebSocket.CONNECTING;
    globalThis.WebSocket.OPEN = MockWebSocket.OPEN;
    globalThis.WebSocket.CLOSING = MockWebSocket.CLOSING;
    globalThis.WebSocket.CLOSED = MockWebSocket.CLOSED;
  });

  afterEach(() => {
    globalThis.WebSocket = OriginalWebSocket;
    document.body.innerHTML = "";
    localStorage.clear();
    sessionStorage.clear();
    history.replaceState(null, "", location.pathname);
  });

  it("opens a WebSocket to the correct URL on connect", async () => {
    setup();
    await tick();
    assert.ok(lastWs, "WebSocket was created");
    assert.include(lastWs.url, "ws://test/ws/mygame");
  });

  it("appends player_id query param when player-id attr is set", async () => {
    setup('player-id="alice"');
    await tick();
    assert.include(lastWs.url, "player_id=alice");
  });

  it("sets :state(connecting) immediately on connect", async () => {
    setup();
    await tick();
    const lobby = document.querySelector("game-lobby");
    assert.ok(
      lobby.matches(":state(connecting)"),
      "should be :state(connecting)",
    );
  });

  it("transitions to :state(connected) on Connected message", async () => {
    setup();
    await tick(); // connect
    await tick(); // WS open (queueMicrotask)
    lastWs.serverSend({ type: "connected", player_id: "p1" });
    const lobby = document.querySelector("game-lobby");
    assert.ok(lobby.matches(":state(connected)"));
  });

  it("fires GameLobbyConnectedEvent on Connected message", async () => {
    setup();
    await tick();
    await tick();
    const lobby = document.querySelector("game-lobby");
    let event;
    lobby.addEventListener("game-lobby-connected", (e) => (event = e), {
      once: true,
    });
    lastWs.serverSend({ type: "connected", player_id: "p1" });
    assert.ok(event instanceof GameLobbyConnectedEvent);
    assert.equal(event.playerId, "p1");
  });

  it("sets player-id stat on Connected message", async () => {
    setup();
    await tick();
    await tick();
    const lobby = document.querySelector("game-lobby");
    const stats = [];
    lobby.addEventListener("game-stat-update", (e) => stats.push(e));
    lastWs.serverSend({ type: "connected", player_id: "p1" });
    const playerIdStat = stats.find((e) => e.key === "player-id");
    assert.ok(playerIdStat, "player-id stat dispatched");
    assert.equal(playerIdStat.value, "p1");
  });

  it("sets lobby-state stat to connected", async () => {
    setup();
    await tick();
    await tick();
    const lobby = document.querySelector("game-lobby");
    const stats = [];
    lobby.addEventListener("game-stat-update", (e) => stats.push(e));
    lastWs.serverSend({ type: "connected", player_id: "p1" });
    const statEvt = stats.find((e) => e.key === "lobby-state");
    assert.equal(statEvt?.value, "connected");
  });

  it("fires GameLobbyRoomEvent on RoomCreated", async () => {
    setup();
    await tick();
    await tick();
    const lobby = document.querySelector("game-lobby");
    let event;
    lobby.addEventListener("game-lobby-room", (e) => (event = e), {
      once: true,
    });
    lastWs.serverSend({ type: "connected", player_id: "p1" });
    lastWs.serverSend({
      type: "room_created",
      code: "ABCD",
      players: [{ id: "p1" }],
    });
    assert.ok(event instanceof GameLobbyRoomEvent);
    assert.equal(event.code, "ABCD");
    assert.deepEqual(event.players, [{ id: "p1" }]);
  });

  it("transitions to :state(in-room) on RoomCreated", async () => {
    setup();
    await tick();
    await tick();
    const lobby = document.querySelector("game-lobby");
    lastWs.serverSend({ type: "connected", player_id: "p1" });
    lastWs.serverSend({ type: "room_created", code: "ABCD", players: [] });
    assert.ok(lobby.matches(":state(in-room)"));
  });

  it("fires GameLobbyQueueEvent on QueueJoined", async () => {
    setup();
    await tick();
    await tick();
    const lobby = document.querySelector("game-lobby");
    let event;
    lobby.addEventListener("game-lobby-queue", (e) => (event = e), {
      once: true,
    });
    lastWs.serverSend({ type: "queue_joined", position: 3 });
    assert.ok(event instanceof GameLobbyQueueEvent);
    assert.equal(event.position, 3);
  });

  it("transitions to :state(in-queue) on QueueJoined", async () => {
    setup();
    await tick();
    await tick();
    const lobby = document.querySelector("game-lobby");
    lastWs.serverSend({ type: "queue_joined", position: 1 });
    assert.ok(lobby.matches(":state(in-queue)"));
  });

  it("fires GameLobbyMatchEvent on MatchFound", async () => {
    setup();
    await tick();
    await tick();
    const lobby = document.querySelector("game-lobby");
    let event;
    lobby.addEventListener("game-lobby-match", (e) => (event = e), {
      once: true,
    });
    lastWs.serverSend({
      type: "match_found",
      players: [{ id: "p1" }, { id: "p2" }],
    });
    assert.ok(event instanceof GameLobbyMatchEvent);
    assert.deepEqual(event.players, [{ id: "p1" }, { id: "p2" }]);
  });

  it("fires GameLobbyStartEvent and sets startSignalling signal on StartSignalling", async () => {
    setup();
    await tick();
    await tick();
    const lobby = document.querySelector("game-lobby");
    let event;
    lobby.addEventListener("game-lobby-start", (e) => (event = e), {
      once: true,
    });
    lastWs.serverSend({
      type: "start_signalling",
      players: [{ id: "p1" }, { id: "p2" }],
      code: "ROOM1",
    });
    assert.ok(event instanceof GameLobbyStartEvent);
    assert.deepEqual(event.players, [{ id: "p1" }, { id: "p2" }]);
    assert.equal(event.code, "ROOM1");
    assert.deepEqual(lobby.startSignalling.get(), {
      players: [{ id: "p1" }, { id: "p2" }],
      code: "ROOM1",
    });
  });

  it("transitions to :state(signalling) on StartSignalling", async () => {
    setup();
    await tick();
    await tick();
    const lobby = document.querySelector("game-lobby");
    lastWs.serverSend({ type: "start_signalling", players: [], code: null });
    assert.ok(lobby.matches(":state(signalling)"));
  });

  it("fires GameLobbyPlayerEvent on PlayerJoined", async () => {
    setup();
    await tick();
    await tick();
    const lobby = document.querySelector("game-lobby");
    let event;
    lobby.addEventListener("game-lobby-player", (e) => (event = e), {
      once: true,
    });
    lastWs.serverSend({ type: "player_joined", player_id: "p2" });
    assert.ok(event instanceof GameLobbyPlayerEvent);
    assert.equal(event.action, "joined");
    assert.deepEqual(event.player, { id: "p2", preference: null });
  });

  it("fires GameLobbyErrorEvent on Error message", async () => {
    setup();
    await tick();
    await tick();
    const lobby = document.querySelector("game-lobby");
    let event;
    lobby.addEventListener("game-lobby-error", (e) => (event = e), {
      once: true,
    });
    lastWs.serverSend({
      type: "error",
      code: "room_not_found",
      message: "Room does not exist",
    });
    assert.ok(event instanceof GameLobbyErrorEvent);
    assert.equal(event.code, "room_not_found");
    assert.equal(event.message, "Room does not exist");
  });

  it("transitions to :state(disconnected) on WebSocket close", async () => {
    setup();
    await tick();
    await tick();
    const lobby = document.querySelector("game-lobby");
    lastWs.close();
    assert.ok(lobby.matches(":state(disconnected)"));
  });

  it("resets startSignalling to null on disconnect", async () => {
    setup();
    await tick();
    await tick();
    const lobby = document.querySelector("game-lobby");
    lastWs.serverSend({ type: "start_signalling", players: [], code: null });
    assert.ok(lobby.startSignalling.get() !== null);
    lastWs.close();
    assert.isNull(lobby.startSignalling.get());
  });

  it("sends CreateRoom message when createRoom() is called", async () => {
    setup();
    await tick();
    await tick();
    const lobby = document.querySelector("game-lobby");
    lobby.createRoom();
    assert.deepEqual(lastWs.sent.at(-1), { type: "create_room" });
  });

  it("sends JoinRoom message with code when joinRoom() is called", async () => {
    setup();
    await tick();
    await tick();
    const lobby = document.querySelector("game-lobby");
    lobby.joinRoom("XYZW");
    assert.deepEqual(lastWs.sent.at(-1), { type: "join_room", code: "XYZW" });
  });

  it("sends JoinQueue message when joinQueue() is called", async () => {
    setup();
    await tick();
    await tick();
    const lobby = document.querySelector("game-lobby");
    lobby.joinQueue();
    assert.deepEqual(lastWs.sent.at(-1), {
      type: "join_queue",
      preferences: [],
    });
  });

  it("sends LeaveQueue message when leaveQueue() is called", async () => {
    setup();
    await tick();
    await tick();
    const lobby = document.querySelector("game-lobby");
    lobby.leaveQueue();
    assert.deepEqual(lastWs.sent.at(-1), { type: "leave_queue" });
  });

  it("sends Ready message when ready() is called", async () => {
    setup();
    await tick();
    await tick();
    const lobby = document.querySelector("game-lobby");
    lobby.ready();
    assert.deepEqual(lastWs.sent.at(-1), { type: "ready" });
  });

  it("sends Unready message when unready() is called", async () => {
    setup();
    await tick();
    await tick();
    const lobby = document.querySelector("game-lobby");
    lobby.unready();
    assert.deepEqual(lastWs.sent.at(-1), { type: "unready" });
  });

  it("sends SetPreference message when setPreference() is called", async () => {
    setup();
    await tick();
    await tick();
    const lobby = document.querySelector("game-lobby");
    lobby.setPreference("red");
    assert.deepEqual(lastWs.sent.at(-1), {
      type: "set_preference",
      preference: "red",
    });
  });

  it("forwards incoming SdpOffer server message to registered sdp callbacks", async () => {
    setup();
    await tick();
    await tick();
    const shell = document.querySelector("game-shell");
    let ctx;
    subscribe(shell, gameLobbyContext, (c) => {
      ctx = c;
    });
    await tick();
    assert.ok(ctx, "context received");
    const received = [];
    ctx.onSdp((msg) => received.push(msg));
    lastWs.serverSend({ type: "sdp_offer", from: "peer-x", sdp: "offer-sdp" });
    assert.equal(received.length, 1);
    assert.deepEqual(received[0], {
      from: "peer-x",
      sdp: "offer-sdp",
      type: "offer",
    });
  });

  it("relays SdpOffer to WebSocket when relaySdp is called via context", async () => {
    setup();
    await tick();
    await tick();
    const shell = document.querySelector("game-shell");
    let ctx;
    subscribe(shell, gameLobbyContext, (c) => {
      ctx = c;
    });
    await tick();
    assert.ok(ctx, "context received");
    ctx.relaySdp("peer-y", "my-offer-sdp", "offer");
    assert.deepEqual(lastWs.sent.at(-1), {
      type: "sdp_offer",
      target: "peer-y",
      sdp: "my-offer-sdp",
    });
  });

  it("relays IceCandidate to WebSocket when relayIce is called via context", async () => {
    setup();
    await tick();
    await tick();
    const shell = document.querySelector("game-shell");
    let ctx;
    subscribe(shell, gameLobbyContext, (c) => {
      ctx = c;
    });
    await tick();
    ctx.relayIce("peer-z", { candidate: "ice-cand" });
    assert.deepEqual(lastWs.sent.at(-1), {
      type: "ice_candidate",
      target: "peer-z",
      candidate: { candidate: "ice-cand" },
    });
  });

  it("forwards incoming IceCandidate server message to registered ice callbacks", async () => {
    setup();
    await tick();
    await tick();
    const shell = document.querySelector("game-shell");
    let ctx;
    subscribe(shell, gameLobbyContext, (c) => {
      ctx = c;
    });
    await tick();
    const received = [];
    ctx.onIceCandidate((msg) => received.push(msg));
    lastWs.serverSend({
      type: "ice_candidate",
      from: "peer-a",
      candidate: { candidate: "cand1" },
    });
    assert.equal(received.length, 1);
    assert.deepEqual(received[0], {
      from: "peer-a",
      candidate: { candidate: "cand1" },
    });
  });

  it("startSignalling signal fires before playing scene (Blocker 4)", async () => {
    setup();
    await tick();
    await tick();
    const lobby = document.querySelector("game-lobby");
    // Signal not yet set
    assert.equal(lobby.startSignalling.get(), null);
    // Server fires StartSignalling before game starts
    lastWs.serverSend({
      type: "start_signalling",
      players: [{ id: "p1" }, { id: "p2" }],
      code: "ROOM1",
    });
    assert.deepEqual(lobby.startSignalling.get(), {
      players: [{ id: "p1" }, { id: "p2" }],
      code: "ROOM1",
    });
    // Shell has not started playing
    assert.notEqual(lobby.shell.scene.get(), "playing");
  });

  it("fires GameLobbyRoomEvent on RoomJoined", async () => {
    setup();
    await tick();
    await tick();
    const lobby = document.querySelector("game-lobby");
    let event;
    lobby.addEventListener("game-lobby-room", (e) => (event = e), {
      once: true,
    });
    lastWs.serverSend({
      type: "room_joined",
      code: "XY12",
      players: [{ id: "p1" }, { id: "p2" }],
    });
    assert.ok(event instanceof GameLobbyRoomEvent);
    assert.equal(event.code, "XY12");
    assert.deepEqual(event.players, [{ id: "p1" }, { id: "p2" }]);
    assert.ok(lobby.matches(":state(in-room)"));
  });

  it("updates player-count stat on RoomJoined", async () => {
    setup();
    await tick();
    await tick();
    const shell = document.querySelector("game-shell");
    lastWs.serverSend({
      type: "room_joined",
      code: "XY12",
      players: [{ id: "p1" }, { id: "p2" }],
    });
    await tick();
    assert.equal(shell.stats.get()["player-count"], 2);
  });

  describe("reconnect attribute", () => {
    it("does not reconnect by default", async function () {
      this.timeout(5000);
      setup();
      await tick();
      await tick();
      const firstWs = lastWs;
      firstWs.close();
      await new Promise((r) => setTimeout(r, 2500));
      assert.equal(
        firstWs,
        lastWs,
        "no new WebSocket created without reconnect",
      );
    });

    it("reconnects after disconnect when reconnect attribute is set", async function () {
      this.timeout(5000);
      setup("reconnect");
      await tick();
      await tick();
      const firstWs = lastWs;
      firstWs.close();
      await new Promise((r) => setTimeout(r, 2500));
      assert.notEqual(
        firstWs,
        lastWs,
        "a new WebSocket should have been created",
      );
    });
  });

  describe("leaveQueue", () => {
    it("returns to :state(connected) so the menu comes back", async () => {
      setup();
      await tick();
      await tick();
      const lobby = document.querySelector("game-lobby");
      lastWs.serverSend({ type: "queue_joined", position: 1 });
      assert.ok(lobby.matches(":state(in-queue)"));
      lobby.leaveQueue();
      assert.deepEqual(lastWs.sent.at(-1), { type: "leave_queue" });
      assert.ok(lobby.matches(":state(connected)"));
    });
  });

  describe("leaveRoom", () => {
    it("reconnects with a fresh player identity and clears the room", async () => {
      setup();
      await tick();
      await tick();
      const lobby = document.querySelector("game-lobby");
      const shell = document.querySelector("game-shell");
      lastWs.serverSend({ type: "connected", player_id: "p1" });
      lastWs.serverSend({
        type: "room_created",
        code: "ABCD",
        players: [{ id: "p1" }],
      });
      await tick();
      assert.equal(shell.stats.get()["room-code"], "ABCD");

      const firstWs = lastWs;
      lobby.leaveRoom();
      await tick();
      assert.notEqual(lastWs, firstWs, "a new WebSocket was opened");
      assert.isNull(lobby.playerId.get());
      assert.notOk(
        lastWs.url.includes("player_id"),
        "reconnects without the old player_id",
      );
      assert.isNull(shell.stats.get()["room-code"]);
    });

    it("does not leave the closed socket wired up", async () => {
      setup("reconnect");
      await tick();
      await tick();
      const lobby = document.querySelector("game-lobby");
      const firstWs = lastWs;
      lobby.leaveRoom();
      await tick();
      const replacement = lastWs;
      // The intentionally closed socket must not drive state or reconnects.
      firstWs.close();
      await tick();
      assert.equal(lastWs, replacement, "no extra reconnect was scheduled");
      assert.notOk(lobby.matches(":state(disconnected)"));
    });

    it("leaves the room when the shell quits", async () => {
      setup();
      await tick();
      await tick();
      const shell = document.querySelector("game-shell");
      lastWs.serverSend({ type: "connected", player_id: "p1" });
      lastWs.serverSend({
        type: "start_signalling",
        players: [{ id: "p1" }, { id: "p2" }],
        code: "ABCD",
      });
      const firstWs = lastWs;
      shell.quit();
      await tick();
      assert.notEqual(lastWs, firstWs, "a new WebSocket was opened");
      assert.equal(shell.scene.get(), "ready");
    });

    it("keeps the socket when the shell quits outside a room", async () => {
      setup();
      await tick();
      await tick();
      const shell = document.querySelector("game-shell");
      lastWs.serverSend({ type: "connected", player_id: "p1" });
      const firstWs = lastWs;
      shell.quit();
      await tick();
      assert.equal(lastWs, firstWs);
    });
  });

  describe("commands", () => {
    const command = (name, value) => {
      const lobby = document.querySelector("game-lobby");
      const e = new Event("command", { bubbles: true });
      e.command = name;
      e.source = { value };
      lobby.dispatchEvent(e);
    };

    it("--create-room creates a room", async () => {
      setup();
      await tick();
      await tick();
      command("--create-room");
      assert.deepEqual(lastWs.sent.at(-1), { type: "create_room" });
    });

    it("--join-room joins the room named by the button value", async () => {
      setup();
      await tick();
      await tick();
      command("--join-room", "WXYZ");
      assert.deepEqual(lastWs.sent.at(-1), { type: "join_room", code: "WXYZ" });
    });

    it("--join-queue splits the button value into preferences", async () => {
      setup();
      await tick();
      await tick();
      command("--join-queue", "red ranked");
      assert.deepEqual(lastWs.sent.at(-1), {
        type: "join_queue",
        preferences: ["red", "ranked"],
      });
    });

    it("--join-queue with no value sends an empty preference list", async () => {
      setup();
      await tick();
      await tick();
      command("--join-queue");
      assert.deepEqual(lastWs.sent.at(-1), {
        type: "join_queue",
        preferences: [],
      });
    });

    it("--leave-queue leaves the queue", async () => {
      setup();
      await tick();
      await tick();
      command("--leave-queue");
      assert.deepEqual(lastWs.sent.at(-1), { type: "leave_queue" });
    });

    it("--lobby-ready and --lobby-unready toggle readiness", async () => {
      setup();
      await tick();
      await tick();
      command("--lobby-ready");
      assert.deepEqual(lastWs.sent.at(-1), { type: "ready" });
      command("--lobby-unready");
      assert.deepEqual(lastWs.sent.at(-1), { type: "unready" });
    });

    it("--set-preference sends the button value", async () => {
      setup();
      await tick();
      await tick();
      command("--set-preference", "healer");
      assert.deepEqual(lastWs.sent.at(-1), {
        type: "set_preference",
        preference: "healer",
      });
    });
  });

  it("republishes its stats when the shell wipes them on start", async () => {
    setup();
    await tick();
    await tick();
    const shell = document.querySelector("game-shell");
    lastWs.serverSend({ type: "connected", player_id: "p1" });
    lastWs.serverSend({
      type: "room_created",
      code: "ABCD",
      players: [{ id: "p1" }],
    });
    await tick();
    assert.equal(shell.stats.get()["room-code"], "ABCD");

    shell.start();
    await tick();
    assert.equal(shell.stats.get()["room-code"], "ABCD");
    assert.equal(shell.stats.get()["lobby-state"], "in-room");
    assert.equal(shell.stats.get()["player-id"], "p1");
  });
});
