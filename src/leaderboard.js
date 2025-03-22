import GameComponent, { css } from "./component.js";
import { PendingTaskEvent } from "./pending-task.js";

const rowTpl = document.createElement("template");
rowTpl.innerHTML = "<tr><td></td><td></td><td></td></tr>";

const sepTpl = document.createElement("template");
sepTpl.innerHTML = '<tr class="sep"><td colspan="3">\u2026</td></tr>';

/**
 * Leaderboard display with a score table and histogram chart. Shows
 * the top 3 and bottom 3 scores with a separator, plus a bar chart
 * with the player's position highlighted and a "Top N%" percentile.
 *
 * @summary Score leaderboard with table and histogram
 *
 * @fires {PendingTaskEvent} pending-task - Wraps the leaderboard data fetch for loading coordination
 *
 * @csspart table - The leaderboard score table
 */
export default class GameLeaderboard extends GameComponent {
  static attrs = {
    "score-label": { type: "string", default: "Score" },
    best: { type: "long", default: 3 },
    worst: { type: "long", default: 3 },
  };

  static styles = css`
    :host {
      display: block;
      margin-top: 16px;
      width: 100%;
      max-width: 320px;
      color: var(--game-text, #eee);
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 14px;
      font-variant-numeric: tabular-nums;
    }
    th {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      opacity: 0.5;
      padding: 4px 8px;
      text-align: left;
    }
    th:last-child {
      text-align: right;
    }
    td {
      padding: 4px 8px;
      border-top: 1px solid color-mix(in srgb, currentColor 8%, transparent);
    }
    td:first-child {
      opacity: 0.4;
      width: 30px;
    }
    td:last-child {
      text-align: right;
      font-weight: 600;
    }
    .sep td {
      text-align: center;
      border-top: none;
      opacity: 0.3;
      padding: 2px 8px;
      font-size: 12px;
      letter-spacing: 0.2em;
    }
  `;

  static template = '<table part="table"></table>';

  #formatScoreFn = null;

  set formatScore(fn) {
    this.#formatScoreFn = fn;
  }

  async resultCallback(shell) {
    const scores = shell.scores;
    if (!scores) return;

    const bestN = this.best;
    const worstN = this.worst;
    const task = Promise.all([
      bestN > 0 ? scores.fetchBest(bestN) : null,
      worstN > 0 ? scores.fetchWorst(worstN) : null,
    ]);
    this.dispatchEvent(new PendingTaskEvent(task));
    let [best, worst] = await task;
    if (best?.scores) best = { ...best, scores: best.scores.slice(0, bestN) };
    if (worst?.scores)
      worst = { ...worst, scores: worst.scores.slice(0, worstN) };
    this.#render(best, worst, shell);
  }

  #fmt(entry, shell) {
    if (this.#formatScoreFn) return this.#formatScoreFn(entry);
    const fmt = shell.formatScoreSignal.get();
    return fmt ? fmt(entry.score) : entry.score;
  }

  #row(entry, shell) {
    const tr = rowTpl.content.firstElementChild.cloneNode(true);
    const cells = tr.cells;
    cells[0].textContent = entry.rank;
    cells[1].textContent = entry.name;
    cells[2].textContent = this.#fmt(entry, shell);
    return tr;
  }

  #render(best, worst, shell) {
    const table = this.shadowRoot.querySelector("table");
    const hasTop = best?.scores?.length;
    const hasWorst = worst?.scores?.length;
    if (!hasTop && !hasWorst) {
      table.innerHTML = "";
      return;
    }

    const thead = document.createElement("thead");
    const headRow = document.createElement("tr");
    for (const label of ["#", "Name", this.scoreLabel]) {
      const th = document.createElement("th");
      th.textContent = label;
      headRow.appendChild(th);
    }
    thead.appendChild(headRow);

    const tbody = document.createElement("tbody");
    for (const e of best?.scores || []) tbody.appendChild(this.#row(e, shell));
    if (hasTop && hasWorst) tbody.appendChild(sepTpl.content.cloneNode(true));
    for (const e of (worst?.scores || []).slice().reverse())
      tbody.appendChild(this.#row(e, shell));

    table.replaceChildren(thead, tbody);
  }
}
