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
  constructor(reason, retry = false) {
    super("game-round-fail", OPTS);
    this.reason = reason;
    this.retry = retry;
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
