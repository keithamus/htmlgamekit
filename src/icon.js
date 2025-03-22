import GameComponent, { css } from "./component.js";
import { matchesConditions } from "./conditions.js";

/**
 * SVG sprite icon renderer. Renders a `<use>` element pointing at the
 * sprite sheet provided by the nearest `<game-shell sprite-sheet>`. When
 * `<option>` children are present, the displayed icon is selected
 * conditionally via `when-*` attributes, falling back to the `name` attribute.
 *
 * @summary Conditional SVG sprite icon
 *
 * @cssprop [--game-icon-size=1em] - Width and height of the icon
 */
export default class GameIcon extends GameComponent {
  static attrs = {
    "name": { type: "string" },
  };

  static styles = css`
    :host {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: var(--game-icon-size, 1em);
      height: var(--game-icon-size, 1em);
      vertical-align: middle;
    }
    svg {
      width: 100%;
      height: 100%;
      fill: currentColor;
    }
  `;

  static template = "";

  #options = [];

  connectedCallback() {
    this.#options = [...this.querySelectorAll("option")];
    super.connectedCallback();
  }

  effectCallback({ spriteSheet }) {
    const sheet = spriteSheet.get();
    if (this.#options.length) {
      const matching = this.#options.filter((o) => matchesConditions(o, this.shell));
      const name = matching.length
        ? (matching[Math.floor(Math.random() * matching.length)].value
            || matching[0].textContent.trim())
        : this.name;
      this.#render(name, sheet);
    } else {
      this.#render(this.name, sheet);
    }
  }

  attributeChanged() {
    if (!this.#options.length) {
      this.#render(this.name, this.shell?.spriteSheet.get() || "");
    }
  }

  #render(name, sheet) {
    this.shadowRoot.innerHTML = name && sheet
      ? `<svg aria-hidden="true"><use href="${sheet}#${name}"></use></svg>`
      : "";
  }
}
