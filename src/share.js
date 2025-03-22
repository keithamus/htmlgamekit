import GameComponent, { css } from "./component.js";

/**
 * Share/copy-to-clipboard button for game results. Extracts the plain
 * text content of its light DOM children (collapsing blank lines) to
 * build the share message. Use `<game-signal>` elements inside to
 * inject live values. Falls back through Web Share API, Clipboard API,
 * execCommand, and finally a visible textarea.
 *
 * @summary Share/copy result button
 *
 * @slot - Free-form share message content; `<game-signal>` elements are resolved to their text values
 *
 * @cssprop [--game-share-copied=#6ee7b7] - Color of the button when the result has been copied
 *
 * @csspart button - The share button
 * @csspart fallback - The readonly textarea shown as a last-resort copy fallback
 */
export default class GameShare extends GameComponent {
  static styles = css`
    :host {
      display: inline-flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
    }
    button {
      padding: 14px 40px;
      font-size: 18px;
      font-weight: 700;
      border: 2px solid color-mix(in srgb, currentColor 50%, transparent);
      border-radius: 8px;
      background: transparent;
      color: var(--game-text, #fff);
      cursor: pointer;
      transition:
        transform 0.15s ease,
        border-color 0.15s ease;
      font-family: inherit;
    }
    button:hover {
      border-color: currentColor;
      transform: scale(1.04);
    }
    button.copied {
      border-color: var(--game-share-copied, #6ee7b7);
      color: var(--game-share-copied, #6ee7b7);
    }
    textarea {
      display: none;
      width: 100%;
      max-width: 500px;
      padding: 10px 14px;
      font-size: 14px;
      font-family: inherit;
      color: var(--game-text, #eee);
      background: color-mix(in srgb, currentColor 10%, transparent);
      border: 1px solid color-mix(in srgb, currentColor 25%, transparent);
      border-radius: 6px;
      text-align: center;
      user-select: all;
      -webkit-user-select: all;
      resize: none;
      field-sizing: content;
    }
    textarea:focus {
      outline: none;
      border-color: color-mix(in srgb, currentColor 50%, transparent);
    }
  `;

  static template =
    `<button part="button">Share result</button>` +
    `<textarea part="fallback" readonly></textarea>`;

  connectedCallback() {
    const btn = this.shadowRoot.querySelector("button");
    const fallback = this.shadowRoot.querySelector("textarea");

    btn.addEventListener(
      "click",
      async () => {
        const text = this.#buildText();
        if (navigator.share) {
          try {
            await navigator.share({ text });
            return;
          } catch (e) {
            if (e.name === "AbortError") return;
          }
        }
        try {
          if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(text);
            showCopied(btn);
            return;
          }
        } catch {}
        try {
          const ta = document.createElement("textarea");
          ta.value = text;
          ta.style.cssText = "position:fixed;opacity:0";
          document.body.appendChild(ta);
          ta.select();
          const ok = document.execCommand("copy");
          ta.remove();
          if (ok) {
            showCopied(btn);
            return;
          }
        } catch {}
        fallback.value = text;
        fallback.style.display = "";
        fallback.focus();
        fallback.select();
      },
      { signal: this.signal },
    );

    super.connectedCallback();
  }

  #buildText() {
    return this.textContent
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length)
      .join("\n");
  }
}

function showCopied(btn) {
  btn.textContent = "Copied!";
  btn.classList.add("copied");
  setTimeout(() => {
    btn.textContent = "Share result";
    btn.classList.remove("copied");
  }, 2000);
}
