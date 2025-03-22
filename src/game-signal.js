import GameComponent from "./component.js";
import { formatValue } from "./format.js";
import { camelCase } from "./component.js";
import { resolve as resolveCondition } from "./conditions.js";

function resolve(key, shell) {
  if (key === "url") {
    const encoded = shell.encodedResult.get();
    const base = shell.gameUrl;
    const url = encoded ? `${base}?r=${encoded}` : base || location.href;
    const gParam = new URLSearchParams(location.search).get("g");
    return gParam && !url.includes("g=")
      ? `${url}${url.includes("?") ? "&" : "?"}g=${gParam}`
      : url;
  }
  return resolveCondition(key, shell);
}

/**
 * Inline text binding that renders a live shell signal value as a text
 * node. Has no shadow DOM — renders directly as text content. Supports
 * all shell signals plus `url`, `groupid`, `groupname`, difficulty props,
 * and custom stats. The `round` key renders "N/M" when a fixed round
 * count is set; `score` respects `formatScoreSignal`.
 *
 * @summary Live signal value text binding
 */
export default class GameSignal extends GameComponent {
  static template = null;

  static attrs = {
    key: { type: "string" },
    format: { type: "string?" },
  };

  effectCallback({ round, rounds, score, formatScoreSignal }) {
    const key = camelCase(this.key || "");
    if (!key) {
      this.textContent = "";
      return;
    }

    if (key === "round") {
      const r = round.get();
      const total = rounds.get();
      this.textContent = total ? `${r}/${total}` : String(r);
      return;
    }

    if (key === "score") {
      const s = score.get();
      const fmt = formatScoreSignal.get();
      if (fmt) {
        this.textContent = fmt(s);
        return;
      }
    }

    const val = resolve(key, this.shell);
    if (val == null) {
      this.textContent = "";
      return;
    }
    this.textContent = this.format
      ? formatValue(val, this.format)
      : String(val);
  }
}
