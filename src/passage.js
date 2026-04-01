import GameComponent, { css, initAttrs } from "./component.js";
import { matchesConditions } from "./conditions.js";
import { GameCollectionAddEvent } from "./events.js";

/**
 * An addressable content block for narrative/dialog trees. Manages
 * conditional visibility of its children via `when-*` attributes and
 * tracks visits in the shell's `visited` collection.
 *
 * Place as a direct child of `<game-shell>` with a `when-eq-*`
 * condition so the shell controls when it's active. Children can
 * use `when-*` conditions (including `when-no-visited` /
 * `when-some-visited`) for first-visit vs revisit content.
 *
 * When the passage becomes active (visible via shell slot assignment),
 * it adds its `id` to the shell's `visited` collection and
 * re-evaluates child conditions.
 *
 * @summary Addressable content block with visit tracking
 *
 * @attr {string} id - Unique passage identifier (used for visit tracking)
 * @attr {string} [collection=visited] - Name of the collection to track visits in
 *
 * @fires {GameCollectionAddEvent} game-collection-add - Fires when the passage is visited for the first time
 */
export default class GamePassage extends GameComponent {
  static attrs = {
    collection: { type: "string", default: "visited" },
  };

  static styles = css`
    :host {
      display: contents;
    }
    :host([hidden]) {
      display: none !important;
    }
  `;

  static template = null;

  #active = false;

  static define(tag = "game-passage", registry = customElements) {
    super.define(tag, registry);
  }

  effectCallback() {
    const shell = this.shell;
    if (!shell) return;

    // Check if this passage's own when-* conditions pass
    const nowActive = matchesConditions(this, shell);
    const wasActive = this.#active;
    this.#active = nowActive;

    // Self-hide when conditions don't pass
    this.hidden = !nowActive;

    if (nowActive) {
      // Evaluate when-* conditions on children BEFORE tracking visit,
      // so when-no-visited works on first activation.
      for (const child of this.children) {
        child.hidden = !matchesConditions(child, shell);
      }
      // Track visit after child evaluation
      if (!wasActive) {
        const id = this.id;
        const col = this.collection || "visited";
        if (id) {
          this.dispatchEvent(new GameCollectionAddEvent(col, id));
        }
      }
    }
  }
}
