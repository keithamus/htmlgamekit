import GameComponent, { css } from "./component.js";
import { PendingTaskEvent } from "./pending-task.js";

/**
 * Standalone histogram bar chart showing the distribution of player
 * scores. Highlights the current player's bucket and displays a "Top
 * N%" percentile. Loads data from the scores API on the result scene.
 *
 * @summary Score distribution histogram chart
 *
 * @fires {PendingTaskEvent} pending-task - Wraps the histogram data fetch for loading coordination
 *
 * @csspart label - The top row showing player count and percentile
 * @csspart bars - The bar chart container
 * @csspart axis - The bottom "Better / Worse" labels
 */
export default class GameScoreHistogram extends GameComponent {
  static attrs = {
    buckets: { type: "long", default: 80 },
  };

  static styles = css`
    :host {
      display: block;
      margin-top: 16px;
      width: 100%;
      max-width: 320px;
      color: var(--game-text, #eee);
    }
    .label {
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      opacity: 0.5;
      padding: 0 2px 6px;
    }
    .bars {
      display: flex;
      align-items: flex-end;
      gap: 2px;
      height: 80px;
    }
    .bar {
      flex: 1;
      background: color-mix(in srgb, currentColor 15%, transparent);
      border-radius: 2px 2px 0 0;
      height: var(--h);
      position: relative;
      transition: background 0.2s;
    }
    .bar.you {
      background: var(--game-accent, #3b82f6);
    }
    .you-label {
      position: absolute;
      top: -18px;
      left: 50%;
      transform: translateX(-50%);
      font-size: 10px;
      font-weight: 700;
      color: var(--game-accent, #3b82f6);
      white-space: nowrap;
      text-shadow: none;
    }
    .axis {
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      opacity: 0.35;
      padding: 4px 2px 0;
    }
  `;

  static template =
    '<div class="label" part="label"></div>' +
    '<div class="bars" part="bars"></div>' +
    '<div class="axis" part="axis"><span>Better</span><span>Worse</span></div>';

  async resultCallback(shell) {
    const scores = shell.scores;
    if (!scores) return;

    const task = scores.fetchHistogram(this.buckets);
    this.dispatchEvent(new PendingTaskEvent(task));
    const data = await task;
    this.#render(data, shell.score.get(), shell.scoreOrder.get());
  }

  #render(data, playerScore, scoreOrder = "desc") {
    const labelEl = this.shadowRoot.querySelector(".label");
    const barsEl = this.shadowRoot.querySelector(".bars");

    if (!data?.buckets?.length) {
      labelEl.innerHTML = "";
      barsEl.innerHTML = "";
      return;
    }

    const buckets = data.buckets;
    const maxCount = Math.max(...buckets.map((b) => b.count));
    if (!maxCount) {
      barsEl.innerHTML = "";
      return;
    }

    const playerBucket = buckets.findIndex(
      (b) => playerScore >= b.min && playerScore <= b.max,
    );

    barsEl.innerHTML = buckets
      .map((b, i) => {
        const pct = Math.max(2, (b.count / maxCount) * 100);
        const active = i === playerBucket;
        return (
          `<div class="bar${active ? " you" : ""}" ` +
          `style="--h:${pct}%" title="${b.count}">` +
          `${active ? '<span class="you-label">You</span>' : ""}</div>`
        );
      })
      .join("");

    const total = data.total;
    const worse =
      playerBucket < 0
        ? 0
        : scoreOrder === "asc"
          ? buckets.slice(playerBucket + 1).reduce((sum, b) => sum + b.count, 0)
          : buckets.slice(0, playerBucket).reduce((sum, b) => sum + b.count, 0);
    const pct = Math.max(1, Math.ceil(((worse + 1) / total) * 100));
    const pctLabel = playerBucket >= 0 ? `Top ${pct}%` : "";

    labelEl.innerHTML =
      `<span>${total} player${total === 1 ? "" : "s"}</span>` +
      `<span>${pctLabel}</span>`;
  }
}
