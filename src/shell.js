import { Signal } from "signal-polyfill";
import { effect } from "./signals.js";
import { GameLifecycleEvent } from "./events.js";
import gameScores, { noopScores } from "./scores.js";
import FixedProgression from "./progressions/fixed.js";
import StaircaseProgression from "./progressions/staircase.js";
import TierProgression from "./progressions/tier.js";
import { initAttrs, camelCase } from "./component.js";
import { matchesConditions } from "./conditions.js";

function toBase64Url(buf) {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function fromBase64Url(str) {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function storagePut(storage, key, value) {
  try {
    storage.setItem(key, value);
  } catch {}
}

function storageGet(storage, key) {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function storageRemove(storage, key) {
  try {
    storage.removeItem(key);
  } catch {}
}

function storagePutJson(storage, key, value) {
  storagePut(storage, key, JSON.stringify(value));
}

function storageGetJson(storage, key) {
  const raw = storageGet(storage, key);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function cleanUrl() {
  const params = new URLSearchParams(location.search);
  const g = params.get("g");
  const clean = g ? `${location.pathname}?g=${g}` : location.pathname;
  if (location.search && location.search !== `?g=${g}`) {
    history.replaceState(null, "", clean);
  }
}

async function initGroup(scores, storageKey = "game-group") {
  const params = new URLSearchParams(location.search);

  const newGroupName = params.get("newgroup");
  if (newGroupName && scores.createGroup) {
    const group = await scores.createGroup(newGroupName);
    if (group?.id) {
      scores.setGroupId(group.id);
      storagePutJson(localStorage, storageKey, {
        id: group.id,
        name: newGroupName,
      });
      const p = new URLSearchParams(location.search);
      p.delete("newgroup");
      const clean = p.toString();
      history.replaceState(
        null,
        "",
        clean ? `${location.pathname}?${clean}` : location.pathname,
      );
      return { id: group.id, name: newGroupName };
    }
  }

  const groupId = params.get("g");
  if (groupId) {
    scores.setGroupId(groupId);
    const name = params.get("gn") || "";
    storagePutJson(localStorage, storageKey, { id: groupId, name });
    return { id: groupId, name };
  }

  const saved = storageGetJson(localStorage, storageKey);
  if (saved?.id) {
    scores.setGroupId(saved.id);
    return saved;
  }

  return null;
}

export function groupParam() {
  return new URLSearchParams(location.search).get("g") || "";
}

export function appendGroupParam(url) {
  const g = groupParam();
  if (!g) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}g=${g}`;
}

const BUILTIN_STATES = [
  "init",
  "demo",
  "ready",
  "practice",
  "playing",
  "between",
  "result",
  "paused",
];

function parseCustomStates(value) {
  if (!value) return [];
  return value
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * The root state machine and context provider for an HTMLGameKit game.
 * Manages game lifecycle (scenes), scoring, round progression, and
 * reactive state via TC39 Signals. All child components access shared
 * game state through this element.
 *
 * @summary Root game shell and state machine
 *
 * @slot - Default slot; children are shown/hidden via manual slot assignment based on their `when-*` condition attributes
 *
 * @fires {GameLifecycleEvent} game-lifecycle - Fires on every scene transition with the new scene name and a state snapshot
 *
 * @attr {string} game-id - Unique game identifier used for score storage and the scores API
 * @attr {number} [rounds=0] - Fixed number of rounds; 0 means progression-controlled
 * @attr {"asc"|"desc"} [score-order=asc] - Whether lower (asc) or higher (desc) scores are better
 * @attr {string} [between-delay=500] - Ms to wait between rounds, or "manual" to advance programmatically
 * @attr {string} [score-url] - Base URL of the scores API
 * @attr {string} [storage-key] - localStorage key for persisting results; defaults to game-id
 * @attr {boolean} [demo] - Start in demo/attract mode before the ready screen
 * @attr {string} [group] - Enables group/party play; value is the group key or omit for auto-key
 * @attr {string} [progression] - Progression algorithm: "staircase", "tier", or "fixed"
 * @attr {number} [score-scale=1] - Integer multiplier applied to the progression's computed threshold
 *   before storing as `score`. Use when the threshold is a small float (e.g. a JND of 0.02) and you
 *   want to store it as a compact integer (0.02 × 100000 = 2000). Display formatting via
 *   `shell.formatScore` should divide by the same scale.
 *
 * @cssState init - The game is in the initial loading state
 * @cssState demo - The game is showing a demo/attract mode
 * @cssState ready - The game is ready to start
 * @cssState practice - The game is in practice mode
 * @cssState playing - A round is actively being played
 * @cssState between - Between rounds, showing feedback
 * @cssState result - The game is complete, showing results
 * @cssState paused - The game is paused
 */
export default class GameShell extends HTMLElement {
  static attrs = {
    "game-id": { type: "string", prop: "gameIdAttr" },
    rounds: { type: "long", default: 0, prop: "roundsAttr" },
    "score-order": {
      type: "enum",
      values: ["asc", "desc"],
      default: "asc",
      prop: "scoreOrderAttr",
    },
    "between-delay": {
      type: "string",
      default: "500",
      prop: "betweenDelayAttr",
    },
    "score-url": { type: "string?" },
    scenes: { type: "string?" },
    "storage-key": { type: "string?", prop: "storageKeyAttr" },
    "sprite-sheet": { type: "string?", prop: "spriteSheetAttr" },
    "session-save": { type: "boolean" },
    demo: { type: "boolean" },
    group: { type: "string?" },
    progression: { type: "string?" },
    "score-scale": { type: "long", default: 1 },
  };

  scene = new Signal.State("init");
  round = new Signal.State(0);
  rounds = new Signal.State(0);
  score = new Signal.State(0);
  roundScores = new Signal.State([]);
  roundScore = new Signal.Computed(() => {
    const rs = this.roundScores.get();
    return rs.length ? rs.at(-1) : 0;
  });
  bestRoundScore = new Signal.Computed(() => {
    const rs = this.roundScores.get();
    return rs.length ? rs.reduce((a, b) => Math.max(a, b), -Infinity) : 0;
  });
  worstRoundScore = new Signal.Computed(() => {
    const rs = this.roundScores.get();
    return rs.length ? rs.reduce((a, b) => Math.min(a, b), Infinity) : 0;
  });
  scoreOrder = new Signal.State("asc");
  lastRoundPassed = new Signal.State(null);
  lastFeedback = new Signal.State(null);
  passStreak = new Signal.State(0);
  failStreak = new Signal.State(0);
  peakPassStreak = new Signal.State(0);
  peakFailStreak = new Signal.State(0);
  difficulty = new Signal.State({});
  stats = new Signal.State({});
  storageKey = new Signal.State("");
  gameId = new Signal.State("");
  betweenDelay = new Signal.State(500);
  encodedResult = new Signal.State(null);
  groupId = new Signal.State(null);
  groupName = new Signal.State(null);
  challenge = new Signal.State(null);
  formatScoreSignal = new Signal.State(null);
  spriteSheet = new Signal.State("");

  #shadow = this.attachShadow({ mode: "open", slotAssignment: "manual" });
  #slot = (() => {
    const s = document.createElement("slot");
    this.#shadow.appendChild(s);
    return s;
  })();

  #customStates = this.attachInternals().states;
  #allStates = new Set(BUILTIN_STATES);
  #scores = noopScores;
  #progression = null;
  #betweenTimer = null;
  #encodeResult = null;
  #decodeResult = null;

  #trophyUnlocked = new Set();
  #trophyStorageKey = "";
  #abort = null;
  #effectDisposers = [];

  static define(tag = "game-shell", registry = customElements) {
    initAttrs(this);
    registry.define(tag, this);
  }

  static gameScores = gameScores;
  static noopScores = noopScores;
  static toBase64Url = toBase64Url;
  static fromBase64Url = fromBase64Url;

  /**
   * Returns an `encodeResult` function that packs the shell score and
   * round pass/fail history into a compact binary URL token.
   *
   * Byte layout: `[score:uint16be] [correct:uint8] [total:uint8] [bitmask:ceil(total/8)bytes]`
   *
   * - `score` is stored as `Math.round(state.score)` — pair with `score-scale` so
   *   the shell stores the threshold pre-scaled.
   * - `correct` is the count of truthy `roundScores` entries.
   * - `total` is `roundScores.length`.
   * - `bitmask` encodes each round as a single bit (1 = pass, 0 = fail), MSB first.
   *
   * Use when `roundScores` are pass/fail (0 or non-zero) and `score` is already
   * a fixed-point integer via `score-scale` (e.g. jnd=0.02, scale=100000 → score=2000).
   *
   * Pair with `decodeUint16WithBitmask` using the same scale.
   *
   * @param {number} [scale=1] - Documented only; the shell stores the pre-scaled score.
   *   Pass the same value used for `score-scale` as a hint to readers.
   * @returns {function(object): string}
   */
  static encodeUint16WithBitmask(scale = 1) {
    return (state) => {
      const scoreInt = Math.round(state.score);
      const rounds = state.roundScores ?? [];
      const correct = rounds.filter(Boolean).length;
      const total = rounds.length;
      const stripBytes = Math.ceil(total / 8);
      const buf = new Uint8Array(4 + stripBytes);
      buf[0] = (scoreInt >> 8) & 0xff;
      buf[1] = scoreInt & 0xff;
      buf[2] = correct;
      buf[3] = total;
      for (let i = 0; i < total; i++) {
        if (rounds[i]) buf[4 + (i >> 3)] |= 1 << (7 - (i & 7));
      }
      return toBase64Url(buf);
    };
  }

  /**
   * Returns a `decodeResult` function matching `encodeUint16WithBitmask`.
   * The decoded object contains `{ score, strip }` where `strip` is a
   * boolean array of per-round pass/fail results.
   *
   * @param {number} [scale=1] - Pass the same value used for `score-scale`.
   * @returns {function(string): {score: number, strip: boolean[]} | null}
   */
  static decodeUint16WithBitmask(scale = 1) {
    return (str) => {
      try {
        const buf = fromBase64Url(str);
        if (buf.length < 4) return null;
        const score = (buf[0] << 8) | buf[1];
        const correct = buf[2];
        const total = buf[3];
        if (score < 0 || correct > total || total > 60) return null;
        if (buf.length < 4 + Math.ceil(total / 8)) return null;
        const strip = [];
        for (let i = 0; i < total; i++) {
          strip.push(!!((buf[4 + (i >> 3)] >> (7 - (i & 7))) & 1));
        }
        return { score, strip };
      } catch {
        return null;
      }
    };
  }

  /**
   * Returns an `encodeResult` function that packs the shell score and all
   * round scores into a compact binary URL token.
   *
   * Byte layout: `[score:uint16be] [round0:uint16be] ... [roundN:uint16be]`
   *
   * - `score` and each `roundScores[i]` are stored as `Math.round(value)`.
   * - Pair with `score-scale` so the shell stores values pre-scaled.
   * - `roundCount` pads or truncates `roundScores` to a fixed length, which
   *   is required for a stable URL format across games with a fixed round count.
   *
   * Use when `roundScores` are continuous values (e.g. per-round dE stored as
   * `Math.round(dE * 10000)`).
   *
   * Pair with `decodeUint16Array` using the same `roundCount`.
   *
   * @param {number} [scale=1] - Documented only; pass the same value as `score-scale`.
   * @param {number|null} [roundCount=null] - Fixed number of rounds to encode; null infers from `roundScores.length`.
   * @returns {function(object): string}
   */
  static encodeUint16Array(scale = 1, roundCount = null) {
    return (state) => {
      const scoreInt = Math.round(state.score);
      const rounds = state.roundScores ?? [];
      const n = roundCount ?? rounds.length;
      const buf = new Uint8Array(2 + n * 2);
      buf[0] = (scoreInt >> 8) & 0xff;
      buf[1] = scoreInt & 0xff;
      for (let i = 0; i < n; i++) {
        const v = Math.round(rounds[i] ?? 0);
        buf[2 + i * 2] = (v >> 8) & 0xff;
        buf[2 + i * 2 + 1] = v & 0xff;
      }
      return toBase64Url(buf);
    };
  }

  /**
   * Returns a `decodeResult` function matching `encodeUint16Array`.
   * The decoded object contains `{ score, roundScores }` where `roundScores`
   * is an array of scaled integer values.
   *
   * @param {number} [scale=1] - Pass the same value as `score-scale`.
   * @param {number} [roundCount] - Must match the value used when encoding.
   * @returns {function(string): {score: number, roundScores: number[]} | null}
   */
  static decodeUint16Array(scale = 1, roundCount) {
    return (str) => {
      try {
        const buf = fromBase64Url(str);
        if (buf.length < 2) return null;
        const n = roundCount ?? (buf.length - 2) / 2;
        if (!Number.isInteger(n)) return null;
        if (buf.length < 2 + n * 2) return null;
        const score = (buf[0] << 8) | buf[1];
        const roundScores = [];
        for (let i = 0; i < n; i++) {
          roundScores.push((buf[2 + i * 2] << 8) | buf[2 + i * 2 + 1]);
        }
        return { score, roundScores };
      } catch {
        return null;
      }
    };
  }

  attributeChanged(name) {
    if (!this.isConnected) return;
    if (name === "scenes") this.#refreshCustomStates();
    if (name === "rounds") this.rounds.set(this.roundsAttr);
    if (name === "score-order") this.scoreOrder.set(this.scoreOrderAttr);
    if (name === "between-delay")
      this.betweenDelay.set(this.#parseBetweenDelay());
    if (name === "game-id") {
      this.gameId.set(this.gameIdAttr);
      if (!this.storageKeyAttr) this.storageKey.set(this.gameIdAttr);
    }
    if (name === "storage-key") {
      this.storageKey.set(this.storageKeyAttr || this.gameIdAttr || "");
    }
    if (name === "sprite-sheet") {
      this.spriteSheet.set(this.spriteSheetAttr || "");
    }
  }

  #parseBetweenDelay() {
    const raw = this.betweenDelayAttr;
    if (raw === "manual") return 0;
    const n = Number(raw);
    return Number.isFinite(n) ? Math.max(0, n) : 500;
  }

  get scores() {
    return this.#scores;
  }

  set scores(s) {
    this.#scores = s || noopScores;
  }

  get progressionSet() {
    return this.#progression;
  }

  set progressionSet(p) {
    this.#progression = p;
  }

  set encodeResult(fn) {
    this.#encodeResult = fn;
  }

  set decodeResult(fn) {
    this.#decodeResult = fn;
  }

  set formatScore(fn) {
    this.formatScoreSignal.set(fn);
  }

  get gameUrl() {
    return location.origin + location.pathname;
  }

  get gameTitle() {
    return (
      this.querySelector(
        "[when-some-scene~=intro] h1, [when-eq-scene=init] h1, [when-some-scene~=init] h1",
      )?.textContent?.trim() || document.title
    );
  }

  isTrophyUnlocked(id) {
    return this.#trophyUnlocked.has(id);
  }

  get trophyCount() {
    return this.#trophyUnlocked.size;
  }

  connectedCallback() {
    this.storageKey.set(this.storageKeyAttr || this.gameIdAttr || "");
    this.gameId.set(this.gameIdAttr);
    this.rounds.set(this.roundsAttr);
    this.scoreOrder.set(this.scoreOrderAttr);
    this.betweenDelay.set(this.#parseBetweenDelay());

    this.#refreshCustomStates();

    this.spriteSheet.set(this.spriteSheetAttr || "");

    this.#trophyStorageKey = `${this.storageKey.get()}-trophies`;
    this.#loadTrophies();

    this.#abort = new AbortController();
    const { signal } = this.#abort;

    this.addEventListener(
      "game-trophy-unlock",
      (e) => {
        e.stopPropagation();
        if (e.trophyId && !this.#trophyUnlocked.has(e.trophyId)) {
          this.#trophyUnlocked.add(e.trophyId);
          this.#saveTrophies();
        }
      },
      { signal },
    );

    if (!this.#progression && this.progression) {
      this.#progression = this.#createProgression();
    }

    let prevScene = "init";
    this.#effect(() => {
      const scene = this.scene.get();
      if (scene === prevScene) return;
      prevScene = scene;
      Signal.subtle.untrack(() => {
        this.#syncCustomStates(scene);
        if (scene === "result") this.#onResult();
        this.dispatchEvent(
          new GameLifecycleEvent(scene, this.#stateSnapshot()),
        );
      });
    });

    this.#effect(() => {
      const visible = [];
      for (const child of this.children) {
        if (matchesConditions(child, this)) visible.push(child);
      }
      this.#slot.assign(...visible);
      requestAnimationFrame(() => {
        for (const child of visible) {
          const af =
            child.hasAttribute("when-some-scene") ||
            child.hasAttribute("when-eq-scene")
              ? child.querySelector("[autofocus]")
              : null;
          if (af) {
            af.focus();
            break;
          }
        }
      });
    });

    this.#effect(() => {
      if (!this.sessionSave) return;
      const scene = this.scene.get();
      const sk = this.storageKey.get();
      if (scene === "playing" || scene === "between") {
        storagePutJson(sessionStorage, `${sk}-session`, {
          scene,
          round: this.round.get(),
          score: this.score.get(),
          roundScores: this.roundScores.get(),
          stats: this.stats.get(),
          difficulty: this.difficulty.get(),
          lastRoundPassed: this.lastRoundPassed.get(),
          lastFeedback: this.lastFeedback.get(),
        });
      } else if (scene !== "init") {
        storageRemove(sessionStorage, `${sk}-session`);
      }
    });

    this.addEventListener(
      "game-round-pass",
      (e) => {
        e.stopPropagation();
        if (this.scene.get() !== "playing") return;
        this.#scores.recordCheckin();
        this.#roundPass(e.score, e.feedback);
      },
      { signal },
    );

    this.addEventListener(
      "game-round-fail",
      (e) => {
        e.stopPropagation();
        if (this.scene.get() !== "playing") return;
        if (!e.retry) this.#scores.recordCheckin();
        this.#roundFail(e.reason, e.retry);
      },
      { signal },
    );

    this.addEventListener(
      "game-timer-expired",
      (e) => {
        e.stopPropagation();
        if (this.scene.get() !== "playing") return;
        this.#roundFail("Time's up!", false);
      },
      { signal },
    );

    this.addEventListener(
      "game-stat-update",
      (e) => {
        e.stopPropagation();
        this.stats.set({ ...this.stats.get(), [e.key]: e.value });
      },
      { signal },
    );

    this.addEventListener(
      "game-start-request",
      (e) => {
        e.stopPropagation();
        this.start();
      },
      { signal },
    );

    this.addEventListener(
      "game-restart-request",
      (e) => {
        e.stopPropagation();
        this.start();
      },
      { signal },
    );

    this.addEventListener(
      "game-practice-start",
      (e) => {
        e.stopPropagation();
        this.scene.set("practice");
      },
      { signal },
    );

    this.addEventListener(
      "game-complete",
      (e) => {
        e.stopPropagation();
        if (e.score != null) this.score.set(e.score);
        this.scene.set("result");
      },
      { signal },
    );

    this.addEventListener(
      "game-pause-request",
      (e) => {
        e.stopPropagation();
        this.pause();
      },
      { signal },
    );

    this.addEventListener(
      "game-resume-request",
      (e) => {
        e.stopPropagation();
        this.resume();
      },
      { signal },
    );

    this.addEventListener(
      "game-next-round",
      (e) => {
        e.stopPropagation();
        if (this.scene.get() === "between") {
          clearTimeout(this.#betweenTimer);
          this.round.set(this.round.get() + 1);
          this.scene.set("playing");
        }
      },
      { signal },
    );

    this.addEventListener(
      "command",
      (e) => {
        if (e.command === "--start" || e.command === "--restart") {
          this.start();
        } else if (e.command === "--pause") {
          this.pause();
        } else if (e.command === "--resume") {
          this.resume();
        } else if (e.command === "--practice") {
          this.scene.set("practice");
        } else if (e.command === "--next-round") {
          if (this.scene.get() === "between") {
            clearTimeout(this.#betweenTimer);
            this.round.set(this.round.get() + 1);
            this.scene.set("playing");
          }
        }
      },
      { signal },
    );

    document.addEventListener(
      "visibilitychange",
      () => {
        if (document.hidden && this.scene.get() === "playing") {
          this.pause();
        } else if (!document.hidden && this.scene.get() === "paused") {
          this.resume();
        }
      },
      { signal },
    );

    queueMicrotask(() => this.#init());
  }

  disconnectedCallback() {
    this.#abort?.abort();
    this.#abort = null;
    for (const dispose of this.#effectDisposers) dispose();
    this.#effectDisposers = [];
  }

  #effect(fn) {
    this.#effectDisposers.push(effect(fn));
  }

  async #init() {
    const scoreUrl = this.scoreUrl;
    if (scoreUrl && this.#scores === noopScores) {
      this.#scores = gameScores(this.gameIdAttr, { baseUrl: scoreUrl });
    }

    if (this.getAttribute("group") !== null) {
      const key =
        this.getAttribute("group") || `${this.storageKey.get()}-group`;
      const g = await initGroup(this.#scores, key);
      if (g) {
        this.groupId.set(g.id);
        this.groupName.set(g.name);
      }
    }

    if (this.#decodeResult) {
      const params = new URLSearchParams(location.search);
      const blob = params.get("r");
      if (blob) {
        this.challenge.set(this.#decodeResult(blob));
      }
    }

    if (this.#restoreSession()) return;
    if (this.#restoreResult()) return;

    if (this.demo) {
      this.scene.set("demo");
    } else {
      this.scene.set("ready");
    }
  }

  #restoreSession() {
    if (!this.sessionSave) return false;
    const saved = storageGetJson(
      sessionStorage,
      `${this.storageKey.get()}-session`,
    );
    if (!saved?.scene) return false;
    this.scene.set(saved.scene);
    this.round.set(saved.round ?? 0);
    this.score.set(saved.score ?? 0);
    this.roundScores.set(saved.roundScores ?? []);
    this.stats.set(saved.stats ?? {});
    this.difficulty.set(saved.difficulty ?? {});
    this.lastRoundPassed.set(saved.lastRoundPassed ?? null);
    this.lastFeedback.set(saved.lastFeedback ?? null);
    this.#scores.fetchToken();
    return true;
  }

  #restoreResult() {
    const saved = storageGetJson(localStorage, this.storageKey.get());
    if (!saved || typeof saved.score === "undefined") return false;
    this.scene.set("result");
    this.score.set(saved.score);
    this.round.set(saved.round || this.rounds.get());
    this.roundScores.set(saved.roundScores || []);
    if (saved.encoded) this.encodedResult.set(saved.encoded);
    return true;
  }

  #stateSnapshot() {
    return {
      scene: this.scene.get(),
      round: this.round.get(),
      rounds: this.rounds.get(),
      score: this.score.get(),
      roundScores: this.roundScores.get(),
      scoreOrder: this.scoreOrder.get(),
      lastRoundPassed: this.lastRoundPassed.get(),
      lastFeedback: this.lastFeedback.get(),
      passStreak: this.passStreak.get(),
      failStreak: this.failStreak.get(),
      peakPassStreak: this.peakPassStreak.get(),
      peakFailStreak: this.peakFailStreak.get(),
      difficulty: this.difficulty.get(),
      stats: this.stats.get(),
    };
  }

  #roundPass(roundScore, feedback) {
    const scores = [...this.roundScores.get(), roundScore];
    this.roundScores.set(scores);
    const total =
      this.scoreOrder.get() === "asc"
        ? scores.reduce((a, b) => a + b, 0)
        : scores.filter(Boolean).length;
    this.score.set(total);
    this.lastRoundPassed.set(true);
    this.lastFeedback.set(feedback || null);
    const ps = this.passStreak.get() + 1;
    this.passStreak.set(ps);
    this.failStreak.set(0);
    if (ps > this.peakPassStreak.get()) this.peakPassStreak.set(ps);
    this.scene.set("between");
    this.#advanceOrComplete();
  }

  #roundFail(reason, retry) {
    if (retry) {
      this.lastRoundPassed.set(false);
      this.lastFeedback.set(reason || null);
      return;
    }
    this.roundScores.set([...this.roundScores.get(), 0]);
    this.lastRoundPassed.set(false);
    this.lastFeedback.set(reason || null);
    const fs = this.failStreak.get() + 1;
    this.failStreak.set(fs);
    this.passStreak.set(0);
    if (fs > this.peakFailStreak.get()) this.peakFailStreak.set(fs);
    this.scene.set("between");
    this.#advanceOrComplete();
  }

  #createProgression() {
    const CTORS = {
      fixed: FixedProgression,
      staircase: StaircaseProgression,
      tier: TierProgression,
    };
    const Ctor = CTORS[this.progression];
    if (!Ctor) return null;
    const config = {};
    const prefix = "progression-";
    for (const attr of this.attributes) {
      if (!attr.name.startsWith(prefix)) continue;
      const key = camelCase(attr.name.slice(prefix.length));
      try {
        config[key] = JSON.parse(attr.value);
      } catch {
        config[key] = attr.value;
      }
    }
    return new Ctor(config);
  }

  #loadTrophies() {
    const arr = storageGetJson(localStorage, this.#trophyStorageKey);
    if (Array.isArray(arr)) arr.forEach((id) => this.#trophyUnlocked.add(id));
  }

  #saveTrophies() {
    storagePutJson(localStorage, this.#trophyStorageKey, [
      ...this.#trophyUnlocked,
    ]);
  }

  #syncCustomStates(to) {
    for (const s of this.#allStates) {
      if (s === to) this.#customStates.add(s);
      else this.#customStates.delete(s);
    }
  }

  #refreshCustomStates() {
    const custom = parseCustomStates(this.scenes);
    this.#allStates = new Set([...BUILTIN_STATES, ...custom]);

    for (const s of [...this.#customStates]) {
      if (!this.#allStates.has(s)) this.#customStates.delete(s);
    }
    this.#syncCustomStates(this.scene.get());
  }

  #advanceOrComplete() {
    if (this.#progression) {
      const result = this.#progression.afterRound(this.#stateSnapshot());
      this.difficulty.set(result.difficulty);
      if (result.done) {
        clearTimeout(this.#betweenTimer);
        this.#betweenTimer = setTimeout(() => {
          if (this.#progression.computeThreshold) {
            this.score.set(
              Math.round(this.#progression.computeThreshold() * this.scoreScale),
            );
          }
          this.scene.set("result");
        }, this.betweenDelay.get());
        return;
      }
    } else if (this.rounds.get() && this.round.get() >= this.rounds.get()) {
      clearTimeout(this.#betweenTimer);
      this.#betweenTimer = setTimeout(() => {
        this.scene.set("result");
      }, this.betweenDelay.get());
      return;
    }

    if (this.betweenDelayAttr === "manual") return;

    clearTimeout(this.#betweenTimer);
    this.#betweenTimer = setTimeout(() => {
      this.round.set(this.round.get() + 1);
      this.scene.set("playing");
    }, this.betweenDelay.get());
  }

  #onResult() {
    const encoded = this.#encodeResult?.(this.#stateSnapshot());
    this.encodedResult.set(encoded || null);

    if (encoded) {
      const g = new URLSearchParams(location.search).get("g");
      const url = g
        ? `${location.pathname}?r=${encoded}&g=${g}`
        : `${location.pathname}?r=${encoded}`;
      history.pushState(null, "", url);
    }

    storagePutJson(localStorage, this.storageKey.get(), {
      score: this.score.get(),
      round: this.round.get(),
      roundScores: this.roundScores.get(),
      encoded,
    });
  }

  start() {
    clearTimeout(this.#betweenTimer);
    const sk = this.storageKey.get();
    storageRemove(localStorage, sk);
    storageRemove(sessionStorage, `${sk}-session`);
    cleanUrl();
    this.encodedResult.set(null);

    this.round.set(1);
    this.score.set(0);
    this.roundScores.set([]);
    this.lastRoundPassed.set(null);
    this.lastFeedback.set(null);
    this.passStreak.set(0);
    this.failStreak.set(0);
    this.peakPassStreak.set(0);
    this.peakFailStreak.set(0);
    this.stats.set({});

    if (this.#progression) {
      const diff = this.#progression.init(this.roundsAttr);
      this.difficulty.set(diff);
    }

    this.scene.set("playing");
    this.#scores.fetchToken();
  }

  pause() {
    if (this.scene.get() !== "playing") return;
    clearTimeout(this.#betweenTimer);
    this.scene.set("paused");
  }

  resume() {
    if (this.scene.get() !== "paused") return;
    this.scene.set("playing");
  }
}
