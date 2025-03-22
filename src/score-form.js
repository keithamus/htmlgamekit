import GameComponent, { css } from "./component.js";
import { PendingTaskEvent } from "./pending-task.js";

/**
 * Score submission form for the leaderboard. Displays a name input
 * and submit button on the result screen. Waits for the scores API
 * token before enabling submission, and dispatches a PendingTaskEvent
 * to coordinate with loading indicators.
 *
 * @summary Leaderboard score submission form
 *
 * @fires {PendingTaskEvent} pending-task - Wraps the score submission promise for loading coordination
 *
 * @csspart form - The form element
 * @csspart label - The "Submit your score" label
 * @csspart input - The name text input
 * @csspart button - The submit button
 * @csspart submitted - The confirmation message shown after successful submission
 */
export default class GameScoreForm extends GameComponent {
  static styles = css`
    :host {
      display: block;
      margin-top: 16px;
    }
    label {
      display: block;
      font-size: 14px;
      opacity: 0.6;
      margin-bottom: 6px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }
    .row {
      display: flex;
      gap: 8px;
      justify-content: center;
      align-items: stretch;
    }
    input {
      width: 140px;
      padding: 8px 12px;
      font-size: 16px;
      font-family: inherit;
      font-weight: 700;
      text-transform: uppercase;
      text-align: center;
      letter-spacing: 0.1em;
      color: var(--game-text, #eee);
      background: color-mix(in srgb, currentColor 10%, transparent);
      border: 1px solid color-mix(in srgb, currentColor 25%, transparent);
      border-radius: 6px;
    }
    input:focus {
      outline: none;
      border-color: color-mix(in srgb, currentColor 50%, transparent);
    }
    button {
      padding: 8px 20px;
      font-size: 16px;
      font-weight: 700;
      border: 1px solid color-mix(in srgb, currentColor 25%, transparent);
      border-radius: 6px;
      background: color-mix(in srgb, currentColor 10%, transparent);
      color: var(--game-text, #fff);
      cursor: pointer;
      font-family: inherit;
      transition: border-color 0.15s ease;
    }
    button:hover:not(:disabled) {
      border-color: currentColor;
    }
    button:disabled {
      opacity: 0.5;
      cursor: default;
    }
    .submitted {
      font-size: 14px;
      opacity: 0.6;
      margin-top: 8px;
    }
  `;

  static template =
    `<form part="form">` +
    `<label part="label">Submit your score</label>` +
    `<div class="row">` +
    `<input part="input" type="text" maxlength="10" placeholder="Name" autocomplete="off">` +
    `<button part="button" type="submit" disabled>Submit</button>` +
    `</div>` +
    `</form>` +
    `<div class="submitted" part="submitted" hidden></div>`;

  #submitted = false;
  #form;
  #nameInput;
  #submitBtn;
  #msgEl;

  connectedCallback() {
    this.#form = this.shadowRoot.querySelector("form");
    this.#nameInput = this.shadowRoot.querySelector("input");
    this.#submitBtn = this.shadowRoot.querySelector("button");
    this.#msgEl = this.shadowRoot.querySelector(".submitted");

    this.#form.addEventListener(
      "submit",
      async (e) => {
        e.preventDefault();
        const scores = this.shell?.scores;
        const name = this.#nameInput.value.trim();
        if (!name || !scores?.token || this.#submitted) return;

        this.#submitBtn.disabled = true;
        this.#submitBtn.textContent = "Submitting...";

        const task = scores.submitScore(name, this.shell.score.get());
        this.dispatchEvent(new PendingTaskEvent(task));

        const ok = await task;
        if (ok) {
          this.#submitted = true;
          this.#form.hidden = true;
          this.#msgEl.textContent = `Submitted as ${name.toUpperCase()}`;
          this.#msgEl.hidden = false;
        } else {
          this.#submitBtn.disabled = false;
          this.#submitBtn.textContent = "Retry";
        }
      },
      { signal: this.signal },
    );

    super.connectedCallback();
  }

  resultCallback(shell) {
    this.#submitted = false;
    this.#msgEl.hidden = true;
    this.#form.hidden = false;
    this.#updateForm(shell);
  }

  #updateForm(shell) {
    if (this.#submitted) return;
    const scores = shell.scores;
    if (!scores?.token) {
      this.#nameInput.disabled = true;
      this.#submitBtn.disabled = true;
      this.#submitBtn.textContent = "Connecting...";
      scores?.fetchToken?.().then(() => {
        if (scores.token) this.#updateForm(shell);
      });
    } else {
      this.#nameInput.disabled = false;
      this.#submitBtn.disabled = false;
      this.#submitBtn.textContent = "Submit";
    }
  }
}
