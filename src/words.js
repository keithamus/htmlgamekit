import GameComponent from "./component.js";
import { createContext, ContextProvider } from "./context.js";
import { PendingTaskEvent } from "./pending-task.js";
import { GameTileSubmitEvent } from "./events.js";

export const gameWordContext = createContext("game-word");

/**
 * Word source for word-guessing games. Fetches words from a compatible
 * words API (e.g. `words.htmlgamekit.dev`) and distributes the current
 * word to child components via context. Optionally validates submitted
 * guesses against the API's `/lookup` endpoint before they are processed.
 *
 * In `daily` mode the shell's `game-id` is automatically used as a seed
 * (`?day&seed=game-id`), so different games on the same API get different
 * words of the day.
 *
 * Only one `<game-word-source>` should exist per `<game-shell>`.
 *
 * The current word is available to JS via `.word`, and to child custom
 * elements via `subscribe(gameWordContext, cb)`.
 *
 * @summary Word fetch and distribution for word-guessing games
 *
 * @fires {PendingTaskEvent} pending-task - Wraps each word fetch for loading coordination
 */
export default class GameWordSource extends GameComponent {
  static template = null;

  static attrs = {
    "words-url":  { type: "string?" },
    "length":     { type: "long", default: 5 },
    "theme":      { type: "string?" },
    "mode":       { type: "enum", values: ["daily", "random", "per-round"], default: "daily" },
    "validate":   { type: "boolean" },
  };

  #provider = null;
  #word = "";
  #dailyWord = "";

  get word() { return this.#word; }

  #validated = new WeakSet();

  connectedCallback() {
    this.#provider = new ContextProvider(this, gameWordContext, "");
    if (this.validate) {
      const shell = this.shell;
      if (shell) {
        shell.addEventListener("game-tile-submit", (e) => {
          if (shell.scene.get() !== "playing") return;
          if (this.#validated.has(e)) return;
          e.stopImmediatePropagation();
          this.#validateGuess(e.value?.toLowerCase());
        }, { signal: this.signal });
      }
    }
    super.connectedCallback();
  }

  effectCallback({ scene, round, roundScores }) {
    if (scene.get() !== "playing") return;
    const scores = roundScores.get(); // always track for random-mode restart detection
    if (this.mode === "per-round") {
      round.get(); // subscribe so a new round triggers a new fetch
      this.#fetch();
    } else if (!this.#word || (this.mode === "random" && scores.length === 0)) {
      this.#word = "";
      this.#fetch();
    }
  }

  #buildUrl() {
    const base = this.wordsUrl;
    if (!base) return null;
    const params = new URLSearchParams();
    if (this.mode === "daily") {
      params.set("day", "");
      const gameId = this.shell?.gameIdAttr;
      if (gameId) params.set("seed", gameId);
    } else {
      params.set("random", "");
    }
    params.set("length", String(this.length));
    if (this.theme) params.set("theme", this.theme);
    return `${base}/?${params}`;
  }

  async #fetch() {
    if (this.mode === "daily" && this.#dailyWord) {
      this.#word = this.#dailyWord;
      this.#provider.setValue(this.#word);
      return;
    }

    const url = this.#buildUrl();
    if (!url) return;

    const task = fetch(url)
      .then((r) => r.ok ? r.json() : Promise.reject(r.status))
      .then((data) => {
        this.#word = data.word;
        if (this.mode === "daily") this.#dailyWord = data.word;
        this.#provider.setValue(this.#word);
      })
      .catch(() => {});

    this.dispatchEvent(new PendingTaskEvent(task));
    await task;
  }

  async #validateGuess(guess) {
    if (!guess || guess.length !== this.length) return;

    const base = this.wordsUrl;
    if (!base) return;

    let valid = false;
    try {
      const res = await fetch(`${base}/lookup/${encodeURIComponent(guess)}`);
      valid = res.ok;
    } catch {
      valid = true; // let guess through on network error
    }

    if (!valid) return;

    const shell = this.shell;
    if (!shell) return;
    const refire = new GameTileSubmitEvent(guess);
    this.#validated.add(refire);
    shell.dispatchEvent(refire);
  }
}
