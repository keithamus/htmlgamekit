const OPTS = { bubbles: true, composed: true };

export class GameRequestEvent extends Event {
  constructor(name) {
    super(name, OPTS);
  }
}

export class GameRoundPassEvent extends Event {
  constructor(score, feedback) {
    super("game-round-pass", OPTS);
    this.score = score;
    this.feedback = feedback;
  }
}

export class GameRoundFailEvent extends Event {
  constructor(reason, retry = false, timedOut = false) {
    super("game-round-fail", OPTS);
    this.reason = reason;
    this.retry = retry;
    this.timedOut = timedOut;
  }
}

export class GameTimerTickEvent extends Event {
  constructor(remaining, fraction) {
    super("game-timer-tick", OPTS);
    this.remaining = remaining;
    this.fraction = fraction;
  }
}

export class GameTimerExpiredEvent extends GameRequestEvent {
  constructor() {
    super("game-timer-expired");
  }
}

export class GameTimerCountdownEvent extends Event {
  constructor(seconds) {
    super("game-timer-countdown", OPTS);
    this.seconds = seconds;
  }
}

export class GameStatUpdateEvent extends Event {
  constructor(key, value) {
    super("game-stat-update", OPTS);
    this.key = key;
    this.value = value;
  }
}

export class GameLifecycleEvent extends Event {
  constructor(action, state) {
    super("game-lifecycle", OPTS);
    this.action = action;
    this.state = state;
    this.scene = state?.scene;
  }
}

export class GameStartRequestEvent extends GameRequestEvent {
  constructor() {
    super("game-start-request");
  }
}

export class GameRestartRequestEvent extends GameRequestEvent {
  constructor() {
    super("game-restart-request");
  }
}

export class GameCompleteEvent extends Event {
  constructor(score) {
    super("game-complete", OPTS);
    this.score = score;
  }
}

export class GamePauseRequestEvent extends GameRequestEvent {
  constructor() {
    super("game-pause-request");
  }
}

export class GameResumeRequestEvent extends GameRequestEvent {
  constructor() {
    super("game-resume-request");
  }
}

export class GameNextRoundEvent extends GameRequestEvent {
  constructor() {
    super("game-next-round");
  }
}

export class GamePracticeStartEvent extends GameRequestEvent {
  constructor() {
    super("game-practice-start");
  }
}

export class GameTileInputEvent extends Event {
  constructor(value, position) {
    super("game-tile-input", OPTS);
    this.value = value;
    this.position = position;
  }
}

export class GameTileSubmitEvent extends Event {
  constructor(value) {
    super("game-tile-submit", OPTS);
    this.value = value;
  }
}

export class GameCollectionAddEvent extends Event {
  constructor(collection, itemId) {
    super("game-collection-add", OPTS);
    this.collection = collection;
    this.itemId = itemId;
  }
}

export class GameCollectionRemoveEvent extends Event {
  constructor(collection, itemId) {
    super("game-collection-remove", OPTS);
    this.collection = collection;
    this.itemId = itemId;
  }
}

export class GameLobbyConnectedEvent extends Event {
  constructor(playerId) {
    super("game-lobby-connected", OPTS);
    this.playerId = playerId;
  }
}

export class GameLobbyRoomEvent extends Event {
  constructor(code, players) {
    super("game-lobby-room", OPTS);
    this.code = code;
    this.players = players;
  }
}

export class GameLobbyMatchEvent extends Event {
  constructor(players) {
    super("game-lobby-match", OPTS);
    this.players = players;
  }
}

export class GameLobbyQueueEvent extends Event {
  constructor(position) {
    super("game-lobby-queue", OPTS);
    this.position = position;
  }
}

export class GameLobbyPlayerEvent extends Event {
  constructor(action, player) {
    super("game-lobby-player", OPTS);
    this.action = action;
    this.player = player;
  }
}

export class GameLobbyStartEvent extends Event {
  constructor(players, code) {
    super("game-lobby-start", OPTS);
    this.players = players;
    this.code = code;
  }
}

export class GameLobbyErrorEvent extends Event {
  constructor(code, message) {
    super("game-lobby-error", OPTS);
    this.code = code;
    this.message = message;
  }
}

export class GamePeerConnectionOpenEvent extends Event {
  constructor(peerId) {
    super("game-peer-connection-open", OPTS);
    this.peerId = peerId;
  }
}

export class GamePeerConnectionCloseEvent extends Event {
  constructor(peerId, reason = "closed") {
    super("game-peer-connection-close", OPTS);
    this.peerId = peerId;
    this.reason = reason;
  }
}

export class GamePeerConnectionMessageEvent extends Event {
  constructor(peerId, channel, data) {
    super("game-peer-connection-message", OPTS);
    this.peerId = peerId;
    this.channel = channel;
    this.data = data;
  }
}

export class GamePeerConnectionIceEvent extends Event {
  constructor(state) {
    super("game-peer-connection-ice", OPTS);
    this.state = state;
  }
}
