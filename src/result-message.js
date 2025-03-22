import GameComponent from "./component.js";
import { matchesConditions } from "./conditions.js";

/**
 * Selects and displays a random `<option>` child on the result scene.
 * Options are filtered by `when-*` conditions before random selection.
 * Sets the `:state(active)` state when a message is shown.
 *
 * @summary Conditional result screen message picker
 *
 * @cssState active - A matching option was found and its text is displayed
 */
export default class GameResultMessage extends GameComponent {
  static template = `<span part="output"></span>`;

  #output;
  #options = [];
  #states = this.attachInternals().states;

  connectedCallback() {
    this.#output = this.shadowRoot.querySelector("[part=output]");
    this.#options = [...this.querySelectorAll("option")];
    super.connectedCallback();
  }

  effectCallback({ scene }) {
    if (scene.get() !== "result") {
      this.#output.textContent = "";
      this.#states.delete("active");
      return;
    }
    const matching = this.#options.filter((o) =>
      matchesConditions(o, this.shell),
    );
    if (matching.length) {
      const pick = matching[Math.floor(Math.random() * matching.length)];
      this.#output.textContent = pick.textContent.trim();
      this.#states.add("active");
    } else {
      this.#output.textContent = "";
      this.#states.delete("active");
    }
  }
}
